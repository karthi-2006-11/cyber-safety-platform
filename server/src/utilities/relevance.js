const { RELEVANCE_LEVELS } = require('../../../shared/constants');

/**
 * Deterministic Relevance Evaluator
 * Computes deterministic relevance score comparing target domain tokens against title and text.
 * 
 * @param {string} domain - Target normalized domain (e.g. 'example.com' or 'phishing-site.com')
 * @param {string} title - Candidate evidence title
 * @param {string} text - Candidate evidence text/snippet
 * @returns {string} RELEVANCE_LEVELS ('HIGH', 'MEDIUM', 'LOW', 'NONE')
 */
function calculateRelevance(domain, title = '', text = '') {
  if (!domain || typeof domain !== 'string') return RELEVANCE_LEVELS.NONE;

  const normalizedDomain = domain.toLowerCase().trim();
  const domainParts = normalizedDomain.split('.');
  const primaryToken = domainParts[0].length > 2 ? domainParts[0] : normalizedDomain;

  const titleLower = (title || '').toLowerCase();
  const textLower = (text || '').toLowerCase();

  // Exact domain string match in title or text
  if (titleLower.includes(normalizedDomain)) {
    return RELEVANCE_LEVELS.HIGH;
  }

  // Primary domain token match in title
  if (titleLower.includes(primaryToken) && primaryToken.length >= 4) {
    return RELEVANCE_LEVELS.HIGH;
  }

  // Exact domain match in body text
  if (textLower.includes(normalizedDomain)) {
    return RELEVANCE_LEVELS.MEDIUM;
  }

  // Primary domain token match in body text
  if (textLower.includes(primaryToken) && primaryToken.length >= 4) {
    return RELEVANCE_LEVELS.MEDIUM;
  }

  // Subdomain token match
  if (domainParts.length > 2) {
    const subToken = domainParts[1];
    if (subToken.length >= 4 && (titleLower.includes(subToken) || textLower.includes(subToken))) {
      return RELEVANCE_LEVELS.LOW;
    }
  }

  return RELEVANCE_LEVELS.NONE;
}

module.exports = {
  calculateRelevance
};
