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
    reports = await UserReport.find({ domain }).sort({ createdAt: -1 });

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
          evidenceRef: evidenceList.map(e => e.content).join('; ') || null,
          reliability: 0.50
        });
      }

      // 3. VERIFIED reports contribute moderate/high weight
      if (verifiedReports.length > 0) {
        signals.push({
          type: 'VERIFIED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.HIGH,
          weight: 70,
          description: `${verifiedReports.length} community report(s) verified by security analyst`,
          evidenceRef: evidenceList.map(e => e.content).join('; ') || null,
          reliability: 0.85
        });
      }

      // 4. ACTIONED reports contribute high threat risk weight
      if (actionedReports.length > 0) {
        signals.push({
          type: 'ACTIONED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.HIGH,
          weight: 85,
          description: `${actionedReports.length} community report(s) confirmed and ACTIONED by security moderator`,
          evidenceRef: evidenceList.map(e => e.content).join('; ') || null,
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

  // Format public unified evidence array from valid community evidence
  const unifiedEvidence = evidenceList
    .filter(e => e.reportId)
    .map(e => {
      const parentReport = reports.find(r => String(r._id) === String(e.reportId));
      const isActioned = parentReport && parentReport.status === REPORT_STATUS.ACTIONED;
      const isVerified = parentReport && parentReport.status === REPORT_STATUS.VERIFIED;

      let vStatus = VERIFICATION_STATUS.UNVERIFIED;
      if (isActioned) vStatus = VERIFICATION_STATUS.VERIFIED;
      else if (isVerified) vStatus = VERIFICATION_STATUS.SUPPORTED;

      return {
        source: EVIDENCE_SOURCES.COMMUNITY_REPORT,
        sourceType: EVIDENCE_SOURCE_TYPES.USER_REPORT,
        title: e.title || (parentReport ? `Community Report: ${parentReport.category}` : 'Community Evidence'),
        url: e.referenceUrl || null,
        excerpt: e.content,
        relevance: 'HIGH',
        verificationStatus: vStatus,
        retrievedAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString()
      };
    });

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
    evidenceCount: evidenceList.length,
    communityConfidence: (actionedReports.length > 0 ? 0.90 : (verifiedReports.length > 0 ? 0.70 : 0.30)),
    signals,
    reports: publicReports,
    evidence: unifiedEvidence
  };
}

module.exports = {
  evaluateCommunityReports
};
