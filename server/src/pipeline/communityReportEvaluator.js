const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');
const { getDBStatus } = require('../config/db');
const { REPORT_STATUS, SIGNAL_SEVERITY, EVIDENCE_SOURCES, EVIDENCE_SOURCE_TYPES, VERIFICATION_STATUS } = require('../../../shared/constants');

/**
 * Pipeline Stage 4: Community Report & Intelligence Evaluator
 * Evaluates reports, evidence, independent reporters, and community confidence.
 * Ignores REJECTED reports.
 */
async function evaluateCommunityReports(domain) {
  const dbStatus = getDBStatus();
  const signals = [];
  let reports = [];
  let evidenceList = [];

  if (!dbStatus.isConnected) {
    return {
      source: 'COMMUNITY_REPORTS',
      reportsCount: 0,
      independentReporterCount: 0,
      verifiedReportCount: 0,
      actionedReportCount: 0,
      evidenceCount: 0,
      communityConfidence: 0,
      signals: [],
      reports: [],
      evidence: []
    };
  }

  try {
    const cleanDomain = (domain || '').trim().toLowerCase().replace(/^www\./, '');
    const escapedDomain = cleanDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    reports = await UserReport.find({
      $or: [
        { domain: cleanDomain },
        { domain: `www.${cleanDomain}` },
        { domain: new RegExp(`^${escapedDomain}$`, 'i') },
        { domain: new RegExp(`^www\\.${escapedDomain}$`, 'i') }
      ]
    }).sort({ createdAt: -1 });

    if (reports.length > 0) {
      const reportIds = reports.map(r => r._id);
      evidenceList = await Evidence.find({ reportId: { $in: reportIds } });

      const pendingReports = reports.filter(r => r.status === REPORT_STATUS.PENDING);
      const verifiedReports = reports.filter(r => r.status === REPORT_STATUS.VERIFIED);
      const actionedReports = reports.filter(r => r.status === REPORT_STATUS.ACTIONED);
      const rejectedReports = reports.filter(r => r.status === REPORT_STATUS.REJECTED);

      // Track unique independent reporters (by reporterHash or reportedBy)
      const validReports = reports.filter(r => r.status !== REPORT_STATUS.REJECTED);
      const reporterHashes = new Set(validReports.map(r => r.reporterHash || String(r.reportedBy || r._id)));
      const independentReporterCount = reporterHashes.size;

      const defaultEvidenceRef = (evidenceList.length > 0
        ? evidenceList.map(e => e.content).join('; ')
        : validReports.map(r => r.description).filter(Boolean).join('; ')) || null;

      // Calculate Community Confidence (0.0 to 1.0)
      let confidenceScore = 0;
      if (actionedReports.length > 0) {
        confidenceScore = 0.90;
      } else if (verifiedReports.length > 0) {
        confidenceScore = 0.70 + Math.min(0.20, (independentReporterCount - 1) * 0.05);
      } else if (pendingReports.length > 0) {
        confidenceScore = Math.min(0.50, 0.20 + (independentReporterCount * 0.10));
      }

      // 1. REJECTED reports contribute 0 weight
      if (rejectedReports.length > 0) {
        signals.push({
          type: 'REJECTED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.INFO,
          weight: 0,
          description: `${rejectedReports.length} user report(s) previously investigated and REJECTED`,
          evidenceRef: null,
          reliability: 0.90
        });
      }

      // 2. PENDING reports (unverified) contribute controlled weight
      if (pendingReports.length > 0) {
        const isMultipleIndependent = independentReporterCount >= 3;
        const severity = isMultipleIndependent ? SIGNAL_SEVERITY.MEDIUM : SIGNAL_SEVERITY.LOW;
        const weight = isMultipleIndependent ? 45 : 20;

        signals.push({
          type: 'PENDING_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity,
          weight,
          description: `${pendingReports.length} pending report(s) from ${independentReporterCount} independent user(s) flagging potential ${pendingReports.map(r => r.category).join(', ')}`,
          evidenceRef: defaultEvidenceRef,
          reliability: 0.50
        });
      }

      // 3. VERIFIED reports contribute moderate/high weight (weight 70, HIGH severity)
      if (verifiedReports.length > 0) {
        signals.push({
          type: 'VERIFIED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.HIGH,
          weight: 70,
          description: `${verifiedReports.length} community report(s) verified by security analyst`,
          evidenceRef: defaultEvidenceRef,
          reliability: 0.85
        });
      }

      // 4. ACTIONED reports contribute high threat risk weight (weight 85, HIGH severity)
      if (actionedReports.length > 0) {
        signals.push({
          type: 'ACTIONED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.HIGH,
          weight: 85,
          description: `${actionedReports.length} community report(s) confirmed and ACTIONED by security moderator`,
          evidenceRef: defaultEvidenceRef,
          reliability: 0.95
        });
      }
    }
  } catch (err) {
    console.warn(`[CommunityReportEvaluator] Error evaluating community reports: ${err.message}`);
  }

  const validReports = reports.filter(r => r.status !== REPORT_STATUS.REJECTED);
  const reporterHashes = new Set(validReports.map(r => r.reporterHash || String(r.reportedBy || r._id)));
  const verifiedReports = reports.filter(r => r.status === REPORT_STATUS.VERIFIED);
  const actionedReports = reports.filter(r => r.status === REPORT_STATUS.ACTIONED);

  // Format public unified evidence array from valid community reports and attached evidence items
  const unifiedEvidence = [];
  for (const report of validReports) {
    const reportEv = evidenceList.filter(e => String(e.reportId) === String(report._id));

    let vStatus = VERIFICATION_STATUS.UNVERIFIED;
    if (report.status === REPORT_STATUS.ACTIONED) vStatus = VERIFICATION_STATUS.VERIFIED;
    else if (report.status === REPORT_STATUS.VERIFIED) vStatus = VERIFICATION_STATUS.SUPPORTED;

    if (reportEv.length > 0) {
      for (const e of reportEv) {
        unifiedEvidence.push({
          source: EVIDENCE_SOURCES.COMMUNITY_REPORT,
          sourceType: EVIDENCE_SOURCE_TYPES.USER_REPORT,
          title: e.title || `Community Report: ${report.category}`,
          url: e.referenceUrl || null,
          excerpt: e.content,
          relevance: 'HIGH',
          verificationStatus: vStatus,
          retrievedAt: e.createdAt ? e.createdAt.toISOString() : (report.createdAt ? report.createdAt.toISOString() : new Date().toISOString())
        });
      }
    } else {
      // Primary report evidence item when no explicit URL evidence item was attached
      unifiedEvidence.push({
        source: EVIDENCE_SOURCES.COMMUNITY_REPORT,
        sourceType: EVIDENCE_SOURCE_TYPES.USER_REPORT,
        title: `Community Report: ${report.category}`,
        url: null,
        excerpt: report.description || `Community safety report submitted flagging ${report.category}`,
        relevance: 'HIGH',
        verificationStatus: vStatus,
        retrievedAt: report.createdAt ? report.createdAt.toISOString() : new Date().toISOString()
      });
    }
  }

  const publicReports = validReports.map(r => ({
    category: r.category,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt
  }));

  return {
    source: 'COMMUNITY_REPORTS',
    reportsCount: validReports.length,
    independentReporterCount: reporterHashes.size,
    verifiedReportCount: verifiedReports.length,
    actionedReportCount: actionedReports.length,
    evidenceCount: unifiedEvidence.length,
    communityConfidence: (actionedReports.length > 0 ? 0.90 : (verifiedReports.length > 0 ? 0.70 : 0.30)),
    signals,
    reports: publicReports,
    evidence: unifiedEvidence
  };
}

module.exports = {
  evaluateCommunityReports
};
