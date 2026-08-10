const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');
const Website = require('../models/Website');
const ThreatInfo = require('../models/ThreatInfo');
const { REPORT_STATUS, THREAT_LEVELS, VERIFICATION_STATUS } = require('../../../shared/constants');
const { sanitizeText } = require('../services/report.service');
const logger = require('../utilities/logger');

/**
 * GET /api/v1/moderation/reports
 * Lists community reports with pagination and status filter.
 */
async function listReports(req, res, next) {
  try {
    const statusFilter = req.query.status ? req.query.status.toUpperCase() : null;
    const query = statusFilter ? { status: statusFilter } : {};

    // Bounded Pagination Parameters (max limit = 50)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const total = await UserReport.countDocuments(query);
    const reports = await UserReport.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      reports: formattedReports,
      requestId: req.id || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/moderation/reports/:id/verify
 * Marks a pending report as VERIFIED with authenticated moderator audit.
 */
async function verifyReport(req, res, next) {
  try {
    const { id } = req.params;
    const notes = sanitizeText(req.body.notes || 'Verified by moderator');

    const report = await UserReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND', requestId: req.id || null });
    }

    report.status = REPORT_STATUS.VERIFIED;
    report.moderationMetadata = {
      moderatedBy: req.user ? req.user.email : 'system_moderator',
      moderatedAt: new Date(),
      moderationNotes: notes
    };
    await report.save();

    await Evidence.updateMany(
      { reportId: report._id },
      { verificationStatus: VERIFICATION_STATUS.VERIFIED, isVerified: true }
    );

    logger.security(`Report #${id} VERIFIED by moderator ${req.user.email}`, {
      reportId: id,
      domain: report.domain,
      moderator: req.user.email
    }, req.id);

    res.status(200).json({
      success: true,
      message: `Report ${id} verified successfully.`,
      report,
      requestId: req.id || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/moderation/reports/:id/action
 * Marks report as ACTIONED, promotes domain to HIGH_CONFIDENCE_THREAT.
 */
async function actionReport(req, res, next) {
  try {
    const { id } = req.params;
    const notes = sanitizeText(req.body.notes || 'Confirmed cyber threat actioned by moderator');

    const report = await UserReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND', requestId: req.id || null });
    }

    report.status = REPORT_STATUS.ACTIONED;
    report.confidenceContribution = 0.90;
    report.moderationMetadata = {
      moderatedBy: req.user ? req.user.email : 'system_moderator',
      moderatedAt: new Date(),
      moderationNotes: notes
    };
    await report.save();

    await Evidence.updateMany(
      { reportId: report._id },
      { verificationStatus: VERIFICATION_STATUS.VERIFIED, isVerified: true }
    );

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

    await ThreatInfo.create({
      websiteId: website._id,
      category: report.category,
      confidenceScore: 90,
      summary: `Promoted to HIGH_CONFIDENCE_THREAT based on actioned community report #${report._id}: ${notes}`
    });

    logger.security(`Report #${id} ACTIONED by moderator ${req.user.email}. Domain ${report.domain} PROMOTED to HIGH_CONFIDENCE_THREAT`, {
      reportId: id,
      domain: report.domain,
      moderator: req.user.email
    }, req.id);

    res.status(200).json({
      success: true,
      message: `Report ${id} actioned and domain ${report.domain} promoted to HIGH_CONFIDENCE_THREAT.`,
      report,
      websiteStatus: website.currentStatus,
      requestId: req.id || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/moderation/reports/:id/reject
 * Marks report as REJECTED.
 */
async function rejectReport(req, res, next) {
  try {
    const { id } = req.params;
    const notes = sanitizeText(req.body.notes || 'Report rejected by moderator');

    const report = await UserReport.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'REPORT_NOT_FOUND', requestId: req.id || null });
    }

    report.status = REPORT_STATUS.REJECTED;
    report.confidenceContribution = 0;
    report.moderationMetadata = {
      moderatedBy: req.user ? req.user.email : 'system_moderator',
      moderatedAt: new Date(),
      moderationNotes: notes
    };
    await report.save();

    await Evidence.updateMany(
      { reportId: report._id },
      { verificationStatus: VERIFICATION_STATUS.UNVERIFIED, isVerified: false }
    );

    logger.security(`Report #${id} REJECTED by moderator ${req.user.email}`, {
      reportId: id,
      domain: report.domain,
      moderator: req.user.email
    }, req.id);

    res.status(200).json({
      success: true,
      message: `Report ${id} rejected.`,
      report,
      requestId: req.id || null
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listReports,
  verifyReport,
  actionReport,
  rejectReport
};
