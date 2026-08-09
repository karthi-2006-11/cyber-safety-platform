const logger = require('../utilities/logger');

const WIKIMEDIA_API_URL = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'CyberSafetyBot/1.0 (https://cybersafetyplatform.example; contact@cybersafetyplatform.example)';
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Wikipedia Service — Queries Wikimedia Search API for domain context.
 * Official Docs: https://www.mediawiki.org/wiki/Wikimedia_APIs/Get_started
 */
async function searchWikipedia(query, customFetch = null) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return { success: false, reason: 'INVALID_QUERY', results: [] };
  }

  const fetchImpl = customFetch || globalThis.fetch;
  if (!fetchImpl) {
    logger.warn('[WikipediaService] Global fetch implementation unavailable.');
    return { success: false, reason: 'FETCH_UNAVAILABLE', results: [] };
  }

  const endpoint = new URL(WIKIMEDIA_API_URL);
  endpoint.searchParams.append('action', 'query');
  endpoint.searchParams.append('list', 'search');
  endpoint.searchParams.append('srsearch', query.trim());
  endpoint.searchParams.append('utf8', '1');
  endpoint.searchParams.append('format', 'json');
  endpoint.searchParams.append('srlimit', '3'); // Limit to top 3 relevant entries

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(endpoint.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[WikipediaService] HTTP Error ${response.status} from MediaWiki API`);
      return { success: false, reason: `HTTP_ERROR_${response.status}`, results: [] };
    }

    const data = await response.json();

    if (!data || !data.query || !Array.isArray(data.query.search)) {
      return { success: true, results: [] };
    }

    const results = data.query.search.map(item => {
      // Strip HTML tags from MediaWiki snippet string
      const cleanSnippet = item.snippet ? item.snippet.replace(/<[^>]*>?/gm, '') : '';
      const encodedTitle = encodeURIComponent(item.title.replace(/ /g, '_'));

      return {
        title: item.title,
        url: `https://en.wikipedia.org/wiki/${encodedTitle}`,
        snippet: cleanSnippet,
        pageid: item.pageid,
        retrievedAt: new Date().toISOString()
      };
    });

    return {
      success: true,
      results
    };

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      logger.warn('[WikipediaService] Request timed out after 5000ms');
      return { success: false, reason: 'TIMEOUT', results: [] };
    }

    logger.warn('[WikipediaService] Search failed:', err.message);
    return { success: false, reason: 'NETWORK_FAILURE', results: [] };
  }
}

module.exports = {
  searchWikipedia
};
