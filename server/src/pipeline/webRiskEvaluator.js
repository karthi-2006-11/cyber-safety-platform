const { searchUri } = require('../services/webRisk.service');
const cache = require('../utilities/cache');
const { SIGNAL_SEVERITY } = require('../../../shared/constants');

/**
 * Pipeline Stage 3: External Threat Intelligence Evaluator (Google Web Risk)
 * Checks server cache first, queries Web Risk Lookup API if uncached, and normalizes signals.
 */
async function evaluateWebRisk(domain, customFetch = null) {
  const cacheKey = `webrisk_${domain}`;
  const signals = [];

  // 1. Check Server Cache
  const cachedResult = cache.get(cacheKey);
  let apiResult = cachedResult;

  if (!apiResult) {
    apiResult = await searchUri(domain, customFetch);

    // Cache successful lookup results
    if (apiResult.success) {
      cache.set(cacheKey, apiResult, 1800); // 30-minute TTL
    }
  }

  if (!apiResult.success) {
    signals.push({
      type: 'EXTERNAL_THREAT_INTEL_UNAVAILABLE',
      source: 'GOOGLE_WEB_RISK',
      severity: SIGNAL_SEVERITY.INFO,
      weight: 0,
      description: `Google Web Risk lookup unavailable (${apiResult.reason || 'UNCONFIGURED'}); skipping external check.`,
      evidenceRef: null,
      reliability: 0.50
    });

    return {
      source: 'GOOGLE_WEB_RISK',
      checked: false,
      reason: apiResult.reason,
      signals
    };
  }

  if (apiResult.matchFound && apiResult.threatTypes.length > 0) {
    for (const threatType of apiResult.threatTypes) {
      const severity = (threatType === 'MALWARE' || threatType === 'SOCIAL_ENGINEERING')
        ? SIGNAL_SEVERITY.CRITICAL
        : SIGNAL_SEVERITY.HIGH;

      const weight = (severity === SIGNAL_SEVERITY.CRITICAL) ? 90 : 75;

      signals.push({
        type: 'EXTERNAL_THREAT_INTEL_MATCH',
        source: 'GOOGLE_WEB_RISK',
        severity,
        weight,
        threatType,
        description: `Google Web Risk identified this URL as ${threatType}`,
        evidenceRef: `Google Web Risk API Threat Match: ${threatType}`,
        reliability: 0.95
      });
    }
  } else {
    signals.push({
      type: 'EXTERNAL_THREAT_INTEL_CLEAN',
      source: 'GOOGLE_WEB_RISK',
      severity: SIGNAL_SEVERITY.INFO,
      weight: 0,
      description: 'Google Web Risk returned no threat matches for this domain.',
      evidenceRef: null,
      reliability: 0.85
    });
  }

  return {
    source: 'GOOGLE_WEB_RISK',
    checked: true,
    matchFound: apiResult.matchFound || false,
    threatTypes: apiResult.threatTypes || [],
    signals
  };
}

module.exports = {
  evaluateWebRisk
};
