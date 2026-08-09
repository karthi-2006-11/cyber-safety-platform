const env = require('../config/env');
const logger = require('../utilities/logger');

const WEB_RISK_API_URL = 'https://webrisk.googleapis.com/v1/uris:search';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Service for communicating with Google Web Risk Lookup API.
 * Official API Docs: https://docs.cloud.google.com/web-risk/docs/lookup-api
 * 
 * Target Threat Types: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE
 */
async function searchUri(rawUrl, customFetch = null) {
  const apiKey = env.googleWebRiskApiKey;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      success: false,
      reason: 'MISSING_API_KEY',
      threatTypes: [],
      expireTime: null
    };
  }

  // Ensure full URL scheme for API query parameter
  let queryUrl = rawUrl.trim();
  if (!queryUrl.startsWith('http://') && !queryUrl.startsWith('https://')) {
    queryUrl = 'http://' + queryUrl;
  }

  const fetchImpl = customFetch || globalThis.fetch;
  if (!fetchImpl) {
    logger.warn('[WebRiskService] Global fetch implementation unavailable.');
    return { success: false, reason: 'FETCH_UNAVAILABLE', threatTypes: [] };
  }

  const endpoint = new URL(WEB_RISK_API_URL);
  endpoint.searchParams.append('uri', queryUrl);
  endpoint.searchParams.append('threatTypes', 'MALWARE');
  endpoint.searchParams.append('threatTypes', 'SOCIAL_ENGINEERING');
  endpoint.searchParams.append('threatTypes', 'UNWANTED_SOFTWARE');
  endpoint.searchParams.append('key', apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(endpoint.toString(), {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[WebRiskService] HTTP Error ${response.status} from Google Web Risk API`);
      return {
        success: false,
        reason: `HTTP_ERROR_${response.status}`,
        threatTypes: []
      };
    }

    const data = await response.json();

    // If matching threat found: data.threat contains threatTypes and expireTime
    if (data && data.threat && Array.isArray(data.threat.threatTypes) && data.threat.threatTypes.length > 0) {
      return {
        success: true,
        matchFound: true,
        threatTypes: data.threat.threatTypes,
        expireTime: data.threat.expireTime || null
      };
    }

    // No threat match found
    return {
      success: true,
      matchFound: false,
      threatTypes: [],
      expireTime: null
    };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      logger.warn('[WebRiskService] Request timed out after 5000ms');
      return { success: false, reason: 'TIMEOUT', threatTypes: [] };
    }

    // Log safely without exposing API keys
    logger.warn('[WebRiskService] Request failed:', err.message);
    return { success: false, reason: 'NETWORK_FAILURE', threatTypes: [] };
  }
}

module.exports = {
  searchUri
};
