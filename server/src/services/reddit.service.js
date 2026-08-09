const env = require('../config/env');
const logger = require('../utilities/logger');

const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDDIT_OAUTH_API_URL = 'https://oauth.reddit.com/search.json';
const USER_AGENT = 'CyberSafetyPlatform/1.0 (by /u/cybersafetybot)';
const REQUEST_TIMEOUT_MS = 5000;

let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Reddit Service — Communicates with official Reddit OAuth2 API.
 * Official Docs: https://www.reddit.com/dev/api/
 * 
 * NOTE: If credentials are missing, this service returns an unconfigured fallback state.
 * NO WEB SCRAPING IS EVER ATTEMPTED.
 */
async function searchReddit(query, customFetch = null) {
  const clientId = env.redditClientId;
  const clientSecret = env.redditClientSecret;

  if (!clientId || !clientSecret || clientId.trim() === '' || clientSecret.trim() === '') {
    return {
      success: false,
      reason: 'UNCONFIGURED_CREDENTIALS',
      results: []
    };
  }

  const fetchImpl = customFetch || globalThis.fetch;
  if (!fetchImpl) {
    logger.warn('[RedditService] Global fetch implementation unavailable.');
    return { success: false, reason: 'FETCH_UNAVAILABLE', results: [] };
  }

  // Obtain or reuse client credentials access token
  let token = cachedAccessToken;
  if (!token || Date.now() >= tokenExpiresAt) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
      const bodyParams = new URLSearchParams({ grant_type: 'client_credentials' });

      const tokenRes = await fetchImpl(REDDIT_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT
        },
        body: bodyParams.toString()
      });

      if (!tokenRes.ok) {
        logger.warn(`[RedditService] OAuth token HTTP Error ${tokenRes.status}`);
        return { success: false, reason: `AUTH_FAILURE_${tokenRes.status}`, results: [] };
      }

      const tokenData = await tokenRes.json();
      if (!tokenData || !tokenData.access_token) {
        return { success: false, reason: 'TOKEN_RESPONSE_INVALID', results: [] };
      }

      token = tokenData.access_token;
      cachedAccessToken = token;
      tokenExpiresAt = Date.now() + ((tokenData.expires_in || 3600) - 60) * 1000;
    } catch (err) {
      logger.warn('[RedditService] Token request failed:', err.message);
      return { success: false, reason: 'AUTH_NETWORK_FAILURE', results: [] };
    }
  }

  // Search Reddit API for posts mentioning the query
  const endpoint = new URL(REDDIT_OAUTH_API_URL);
  endpoint.searchParams.append('q', query.trim());
  endpoint.searchParams.append('type', 'link');
  endpoint.searchParams.append('sort', 'relevance');
  endpoint.searchParams.append('limit', '3');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(endpoint.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': USER_AGENT
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[RedditService] HTTP Error ${response.status} from Reddit Search API`);
      return { success: false, reason: `HTTP_ERROR_${response.status}`, results: [] };
    }

    const data = await response.json();

    if (!data || !data.data || !Array.isArray(data.data.children)) {
      return { success: true, results: [] };
    }

    const results = data.data.children.map(child => {
      const p = child.data || {};
      const selftextSnippet = p.selftext ? p.selftext.slice(0, 200) : '';

      return {
        title: p.title || 'Reddit Post',
        subreddit: p.subreddit ? `r/${p.subreddit}` : 'r/discussion',
        url: p.permalink ? `https://www.reddit.com${p.permalink}` : (p.url || 'https://www.reddit.com'),
        snippet: selftextSnippet || p.title,
        createdAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
      };
    });

    return {
      success: true,
      results
    };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      logger.warn('[RedditService] Search request timed out after 5000ms');
      return { success: false, reason: 'TIMEOUT', results: [] };
    }

    logger.warn('[RedditService] Search failed:', err.message);
    return { success: false, reason: 'NETWORK_FAILURE', results: [] };
  }
}

function clearTokenCache() {
  cachedAccessToken = null;
  tokenExpiresAt = 0;
}

module.exports = {
  searchReddit,
  clearTokenCache
};
