const Website = require('../models/Website');
const ThreatInfo = require('../models/ThreatInfo');
const { getDBStatus } = require('../config/db');
const { SIGNAL_SEVERITY } = require('../../../shared/constants');

/**
 * Pipeline Stage 2: Local Reputation Evaluator
 * Checks internal database for official recorded website threat status.
 */
async function evaluateReputation(domain) {
  const dbStatus = getDBStatus();
  const signals = [];
  let websiteRecord = null;

  if (!dbStatus.isConnected) {
    return {
      source: 'LOCAL_REPUTATION_DATABASE',
      found: false,
      signals: [],
      note: 'Database disconnected; local reputation lookup skipped.'
    };
  }

  try {
    websiteRecord = await Website.findOne({ domain });
    if (websiteRecord) {
      const threatDetails = await ThreatInfo.find({ websiteId: websiteRecord._id });

      let severity = SIGNAL_SEVERITY.INFO;
      if (websiteRecord.currentStatus === 'HIGH_CONFIDENCE_THREAT') {
        severity = SIGNAL_SEVERITY.CRITICAL;
      } else if (websiteRecord.currentStatus === 'SUSPICIOUS') {
        severity = SIGNAL_SEVERITY.HIGH;
      } else if (websiteRecord.currentStatus === 'SAFE') {
        severity = SIGNAL_SEVERITY.INFO;
      }

      signals.push({
        type: 'LOCAL_RECORD',
        source: 'DATABASE_WEBSITE_RECORD',
        severity,
        weight: severity === SIGNAL_SEVERITY.CRITICAL ? 90 : severity === SIGNAL_SEVERITY.HIGH ? 60 : 0,
        description: `Official database record specifies status: ${websiteRecord.currentStatus}`,
        evidenceRef: threatDetails.map(t => t.summary || t.category).join('; ') || null,
        reliability: 0.95
      });
    }
  } catch (err) {
    console.warn(`[ReputationEvaluator] Error querying website record: ${err.message}`);
  }

  return {
    source: 'LOCAL_REPUTATION_DATABASE',
    found: websiteRecord !== null,
    websiteRecord,
    signals
  };
}

module.exports = {
  evaluateReputation
};
