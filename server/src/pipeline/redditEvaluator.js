const { searchReddit } = require('../services/reddit.service');
const { calculateRelevance } = require('../utilities/relevance');
const cache = require('../utilities/cache');
const {
  EVIDENCE_SOURCES,
  EVIDENCE_SOURCE_TYPES,
  VERIFICATION_STATUS,
  RELEVANCE_LEVELS
} = require('../../../shared/constants');

/**
 * Pipeline Stage 5b: Reddit Evidence Evaluator
 * Searches Reddit API for community discussion, applies relevance filtering,
 * and formats evidence items explicitly labeled as UNVERIFIED community discussion.
 */
async function evaluateReddit(domain, customFetch = null) {
  const cacheKey = `reddit_${domain}`;
  const evidenceItems = [];

  const cached = cache.get(cacheKey);
  let apiResult = cached;

  if (!apiResult) {
    apiResult = await searchReddit(domain, customFetch);
    if (apiResult.success) {
      cache.set(cacheKey, apiResult, 1800); // 30-min TTL
    }
  }

  if (!apiResult.success || !Array.isArray(apiResult.results)) {
    return {
      source: EVIDENCE_SOURCES.REDDIT,
      checked: false,
      reason: apiResult.reason || 'UNAVAILABLE',
      evidence: []
    };
  }

  for (const item of apiResult.results) {
    const relevance = calculateRelevance(domain, item.title, item.snippet);

    if (relevance !== RELEVANCE_LEVELS.NONE) {
      evidenceItems.push({
        source: EVIDENCE_SOURCES.REDDIT,
        sourceType: EVIDENCE_SOURCE_TYPES.COMMUNITY_DISCUSSION,
        title: `${item.subreddit}: ${item.title}`,
        url: item.url,
        excerpt: item.snippet,
        relevance,
        verificationStatus: VERIFICATION_STATUS.UNVERIFIED,
        retrievedAt: item.createdAt || new Date().toISOString(),
        metadata: { subreddit: item.subreddit }
      });
    }
  }

  return {
    source: EVIDENCE_SOURCES.REDDIT,
    checked: true,
    count: evidenceItems.length,
    evidence: evidenceItems
  };
}

module.exports = {
  evaluateReddit
};
