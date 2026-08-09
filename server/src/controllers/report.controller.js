const { submitReport } = require('../services/report.service');
const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');

/**
 * POST /api/v1/reports
 * Public endpoint for users to submit a safety report with evidence.
 */
async function handleReportSubmission(req, res, next) {
  try {
    const { domain, category, description, evidenceList } = req.body;
    const reporterId = req.user ? req.user._id : null;
    const reporterIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    if (!domain || !description) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Domain and description are required.'
      });
    }

    const result = await submitReport({
      domain,
      category,
      description,
      reporterId,
      reporterIp,
      evidenceList
    });

    if (result.isDuplicate) {
      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: 'You have already submitted a report for this domain.',
        report: {
          id: result.report._id,
          domain: result.report.domain,
          category: result.report.category,
          status: result.report.status,
          createdAt: result.report.createdAt
        }
      });
    }

    res.status(201).json({
      success: true,
      isDuplicate: false,
      message: 'Report submitted successfully and entered PENDING review queue.',
      report: {
        id: result.report._id,
        domain: result.report.domain,
        category: result.report.category,
        status: result.report.status,
        createdAt: result.report.createdAt
      },
      evidenceCount: result.evidence ? result.evidence.length : 0
    });
  } catch (error) {
    if (error.message === 'INVALID_DOMAIN') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DOMAIN',
        message: 'Provided domain name is invalid.'
      });
    }
    next(error);
  }
}

/**
 * GET /api/v1/reports/my-reports
 * Returns public reports submitted by the current session/ip.
 */
async function getMyReports(req, res, next) {
  try {
    const reporterIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const reporterId = req.user ? req.user._id : null;
    const crypto = require('crypto');
    const seed = reporterId ? String(reporterId) : String(reporterIp);
    const reporterHash = 'rep_' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12);

    const reports = await UserReport.find({ reporterHash }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports: reports.map(r => ({
        id: r._id,
        domain: r.domain,
        category: r.category,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleReportSubmission,
  getMyReports
};
