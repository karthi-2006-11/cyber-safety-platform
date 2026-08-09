const { searchWikipedia } = require('../services/wikipedia.service');
const { calculateRelevance } = require('../utilities/relevance');
const cache = require('../utilities/cache');
const {
  EVIDENCE_SOURCES,
  EVIDENCE_SOURCE_TYPES,
  VERIFICATION_STATUS,
  RELEVANCE_LEVELS
} = require('../../../shared/constants');

/**
 * Pipeline Stage 5a: Wikipedia Evidence Evaluator
 * Searches Wikipedia, filters relevance, caches results, and constructs unified evidence items.
 */
async function evaluateWikipedia(domain, customFetch = null) {
  const cacheKey = `wikipedia_${domain}`;
  const evidenceItems = [];

  const cached = cache.get(cacheKey);
  let apiResult = cached;

  if (!apiResult) {
    apiResult = await searchWikipedia(domain, customFetch);
    if (apiResult.success) {
      cache.set(cacheKey, apiResult, 1800); // 30-min TTL
    }
  }

  if (!apiResult.success || !Array.isArray(apiResult.results)) {
    return {
      source: EVIDENCE_SOURCES.WIKIPEDIA,
      checked: false,
      reason: apiResult.reason || 'SEARCH_FAILED',
      evidence: []
    };
  }

  for (const item of apiResult.results) {
    const relevance = calculateRelevance(domain, item.title, item.snippet);

    // Filter out unrelated Wikipedia search results
    if (relevance !== RELEVANCE_LEVELS.NONE) {
      evidenceItems.push({
        source: EVIDENCE_SOURCES.WIKIPEDIA,
        sourceType: EVIDENCE_SOURCE_TYPES.PUBLIC_KNOWLEDGE,
        title: item.title,
        url: item.url,
        excerpt: item.snippet,
        relevance,
        verificationStatus: VERIFICATION_STATUS.SUPPORTED,
        retrievedAt: item.retrievedAt || new Date().toISOString(),
        metadata: { pageid: item.pageid }
      });
    }
  }

  return {
    source: EVIDENCE_SOURCES.WIKIPEDIA,
    checked: true,
    count: evidenceItems.length,
    evidence: evidenceItems
  };
}

module.exports = {
  evaluateWikipedia
};
