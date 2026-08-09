const Website = require('../models/Website');
const ThreatInfo = require('../models/ThreatInfo');
const { THREAT_LEVELS } = require('../../../shared/constants');
const { getDBStatus } = require('../config/db');

/**
 * Threat Assessment Service (Architecture Foundation)
 * 
 * IMPORTANT: Full automated threat analysis and Wikipedia/Reddit evidence collection
 * are intentionally NOT implemented in this initial phase.
 */
async function checkDomainThreat(domain) {
  const dbStatus = getDBStatus();

  // If MongoDB is connected, attempt database lookup
  if (dbStatus.isConnected) {
    try {
      const siteRecord = await Website.findOne({ domain });
      if (siteRecord) {
        const threatDetails = await ThreatInfo.find({ websiteId: siteRecord._id });
        return {
          domain,
          status: siteRecord.currentStatus,
          lastAnalyzedAt: siteRecord.lastAnalyzedAt,
          threatDetails,
          source: 'DATABASE_RECORD'
        };
      }
    } catch (err) {
      console.warn(`[ThreatService] DB query failed, falling back to UNKNOWN status: ${err.message}`);
    }
  }

  // Fallback for unindexed domains or when DB is offline
  return {
    domain,
    status: THREAT_LEVELS.UNKNOWN,
    lastAnalyzedAt: null,
    threatDetails: [],
    source: 'FOUNDATIONAL_STUB',
    note: 'Detection engine and evidence gathering are planned for future phases.'
  };
}

module.exports = {
  checkDomainThreat
};
