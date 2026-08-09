const threatService = require('../services/threat.service');
const Website = require('../models/Website');
const { getDBStatus } = require('../config/db');

/**
 * Endpoint controller to check domain threat status.
 * Query param or body: `domain` or `url`
 */
async function checkThreat(req, res, next) {
  try {
    const domain = req.normalizedDomain;
    const result = await threatService.checkDomainThreat(domain);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint for extension to sync pre-recorded high-confidence threat domains.
 * GET /api/v1/threats/high-confidence
 */
async function getHighConfidenceThreats(req, res, next) {
  try {
    const dbStatus = getDBStatus();
    let domains = [];

    if (dbStatus.isConnected) {
      const records = await Website.find({ currentStatus: 'HIGH_CONFIDENCE_THREAT' });
      domains = records.map(r => ({
        domain: r.domain,
        classification: r.currentStatus,
        riskLevel: 'HIGH',
        confidence: 0.90,
        reasons: ['Pre-recorded high-confidence threat in database']
      }));
    }

    res.status(200).json({
      success: true,
      count: domains.length,
      domains
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkThreat,
  getHighConfidenceThreats
};
