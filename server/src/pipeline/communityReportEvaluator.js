const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');
const { getDBStatus } = require('../config/db');
const { REPORT_STATUS, SIGNAL_SEVERITY } = require('../../../shared/constants');

/**
 * Pipeline Stage 3: Community Report Evaluator
 * Analyzes existing user reports and attached evidence for the target domain.
 * Ignores REJECTED reports. Evaluates PENDING, REVIEWED, and ACTIONED report weights.
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
      signals: [],
      reports: [],
      evidence: []
    };
  }

  try {
    // Search existing reports for the normalized domain
    reports = await UserReport.find({ domain }).sort({ createdAt: -1 });

    if (reports.length > 0) {
      const reportIds = reports.map(r => r._id);
      evidenceList = await Evidence.find({ reportId: { $in: reportIds } });

      const pendingReports = reports.filter(r => r.status === REPORT_STATUS.PENDING);
      const actionedReports = reports.filter(r => r.status === REPORT_STATUS.ACTIONED);
      const reviewedReports = reports.filter(r => r.status === REPORT_STATUS.REVIEWED);
      const rejectedReports = reports.filter(r => r.status === REPORT_STATUS.REJECTED);

      // REJECTED reports are filtered out and assigned 0 weight
      if (rejectedReports.length > 0) {
        signals.push({
          type: 'REJECTED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.INFO,
          weight: 0,
          description: `${rejectedReports.length} user report(s) were previously investigated and REJECTED as invalid`,
          evidenceRef: null,
          reliability: 0.90
        });
      }

      // Single or multiple PENDING reports contribute controlled warning weights
      if (pendingReports.length > 0) {
        const isMultiple = pendingReports.length >= 3;
        const severity = isMultiple ? SIGNAL_SEVERITY.MEDIUM : SIGNAL_SEVERITY.LOW;
        const weight = isMultiple ? 45 : 20;

        signals.push({
          type: 'PENDING_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity,
          weight,
          description: `${pendingReports.length} pending user report(s) submitted flagging potential ${pendingReports.map(r => r.category).join(', ')}`,
          evidenceRef: evidenceList.map(e => e.content).join('; ') || null,
          reliability: 0.60
        });
      }

      // REVIEWED reports contribute moderate weight
      if (reviewedReports.length > 0) {
        signals.push({
          type: 'REVIEWED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.MEDIUM,
          weight: 55,
          description: `${reviewedReports.length} community report(s) confirmed under analyst review`,
          evidenceRef: null,
          reliability: 0.80
        });
      }

      // ACTIONED reports contribute high threat risk weight
      if (actionedReports.length > 0) {
        signals.push({
          type: 'ACTIONED_COMMUNITY_REPORTS',
          source: 'USER_REPORT_DATABASE',
          severity: SIGNAL_SEVERITY.HIGH,
          weight: 80,
          description: `${actionedReports.length} community report(s) verified and ACTIONED by security team`,
          evidenceRef: evidenceList.map(e => e.content).join('; ') || null,
          reliability: 0.95
        });
      }
    }
  } catch (err) {
    console.warn(`[CommunityReportEvaluator] Error querying community reports: ${err.message}`);
  }

  // Format public report view (stripping internal IDs/secrets)
  const publicReports = reports
    .filter(r => r.status !== REPORT_STATUS.REJECTED)
    .map(r => ({
      category: r.category,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt
    }));

  const publicEvidence = evidenceList.map(e => ({
    type: e.type,
    content: e.content,
    isVerified: e.isVerified
  }));

  return {
    source: 'COMMUNITY_REPORTS',
    reportsCount: publicReports.length,
    signals,
    reports: publicReports,
    evidence: publicEvidence
  };
}

module.exports = {
  evaluateCommunityReports
};
