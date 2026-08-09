const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');
const Website = require('../models/Website');
const ThreatInfo = require('../models/ThreatInfo');
const { REPORT_STATUS, THREAT_LEVELS, VERIFICATION_STATUS } = require('../../../shared/constants');
const { sanitizeText } = require('../services/report.service');

/**
 * Middleware: Verify moderator or admin authorization.
 */
function requireModeratorRole(req, res, next) {
  const role = req.headers['x-user-role'] || (req.user && req.user.role);
  if (!role || (role !== 'MODERATOR' && role !== 'ADMIN')) {
    return res.status(403).json({
      success: false,
      error: 'MODERATOR_AUTHORIZATION_REQUIRED',
      message: 'Access denied. Moderator authorization required.'
    });
  }
  next();
}

/**
 * GET /api/v1/moderation/reports
 * Lists all pending, verified, actioned, or rejected community reports.
 */
async function listReports(req, res, next) {
  try {
    const statusFilter = req.query.status ? req.query.status.toUpperCase() : null;
    const query = statusFilter ? { status: statusFilter } : {};

    const reports = await UserReport.find(query).sort({ createdAt: -1 });
    const reportIds = reports.map(r => r._id);
    const evidenceList = await Evidence.find({ reportId: { $in: reportIds } });

    const formattedReports = reports.map(r => {
      const reportEvidence = evidenceList.filter(e => String(e.reportId) === String(r._id));
      return {
        id: r._id,
        domain: r.domain,
        category: r.category,
        description: r.description,
        status: r.status,
        reporterHash: r.reporterHash,
        confidenceContribution: r.confidenceContribution,
        moderationMetadata: r.moderationMetadata,
        evidence: reportEvidence.map(e => ({
          id: e._id,
          type: e.type,
          title: e.title,
          content: e.content,
          referenceUrl: e.referenceUrl,
          verificationStatus: e.verificationStatus,
          isVerified: e.isVerified
        })),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedReports.length,
      reports: formattedReports
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/moderation/reports/:id/verify
 * Marks a pending report as VERIFIED.
 */
async function verifyReport(req, res, next) {
  try {
    const { id } = req.params;
    const notes = sanitizeText(req.body.notes || 'Verified by moderator');

    const report = await UserReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND' });
    }

    report.status = REPORT_STATUS.VERIFIED;
    report.moderationMetadata = {
      moderatedBy: req.headers['x-user-id'] || 'moderator_admin',
      moderatedAt: new Date(),
      moderationNotes: notes
    };
    await report.save();

    await Evidence.updateMany(
      { reportId: report._id },
      { verificationStatus: VERIFICATION_STATUS.VERIFIED, isVerified: true }
    );

    res.status(200).json({
      success: true,
      message: `Report ${id} verified successfully.`,
      report
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/moderation/reports/:id/action
 * Marks report as ACTIONED and promotes the domain to HIGH_CONFIDENCE_THREAT.
 */
async function actionReport(req, res, next) {
  try {
    const { id } = req.params;
    const notes = sanitizeText(req.body.notes || 'Confirmed cyber threat actioned by moderator');

    const report = await UserReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND' });
    }

    report.status = REPORT_STATUS.ACTIONED;
    report.confidenceContribution = 0.90;
    report.moderationMetadata = {
      moderatedBy: req.headers['x-user-id'] || 'moderator_admin',
      moderatedAt: new Date(),
      moderationNotes: notes
    };
    await report.save();

    // Update Evidence records
    await Evidence.updateMany(
      { reportId: report._id },
      { verificationStatus: VERIFICATION_STATUS.VERIFIED, isVerified: true }
    );

    // Promote Website status to HIGH_CONFIDENCE_THREAT
    let website = await Website.findOne({ domain: report.domain });
    if (!website) {
      website = await Website.create({
        domain: report.domain,
        currentStatus: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT,
        lastAnalyzedAt: new Date()
      });
    } else {
      website.currentStatus = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
      website.lastAnalyzedAt = new Date();
      await website.save();
    }

    // Attach or update ThreatInfo record
    await ThreatInfo.create({
      websiteId: website._id,
      category: report.category,
      confidenceScore: 90,
      summary: `Promoted to HIGH_CONFIDENCE_THREAT based on actioned community report #${report._id}: ${notes}`
    });

    res.status(200).json({
      success: true,
      message: `Report ${id} actioned and domain ${report.domain} promoted to HIGH_CONFIDENCE_THREAT.`,
      report,
      websiteStatus: website.currentStatus
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/moderation/reports/:id/reject
 * Marks report as REJECTED (assigned 0 weight).
 */
async function rejectReport(req, res, next) {
  try {
    const { id } = req.params;
    const notes = sanitizeText(req.body.notes || 'Report rejected by moderator');

    const report = await UserReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND' });
    }

    report.status = REPORT_STATUS.REJECTED;
    report.confidenceContribution = 0;
    report.moderationMetadata = {
      moderatedBy: req.headers['x-user-id'] || 'moderator_admin',
      moderatedAt: new Date(),
      moderationNotes: notes
    };
    await report.save();

    await Evidence.updateMany(
      { reportId: report._id },
      { verificationStatus: VERIFICATION_STATUS.UNVERIFIED, isVerified: false }
    );

    res.status(200).json({
      success: true,
      message: `Report ${id} rejected.`,
      report
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireModeratorRole,
  listReports,
  verifyReport,
  actionReport,
  rejectReport
};
