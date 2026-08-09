const { extractDomain } = require('../utilities/urlHelper');

/**
 * Pipeline Stage 1: URL Normalizer & Validator
 * Strips scheme, port, path, and query strings. Validates domain structure.
 */
function normalizeAndValidate(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Input URL or domain must be a non-empty string');
  }

  const normalized = extractDomain(rawInput);

  if (!normalized) {
    throw new Error(`Invalid or malformed URL/domain format: "${rawInput}"`);
  }

  return {
    rawInput,
    domain: normalized,
    normalizedAt: new Date()
  };
}

module.exports = {
  normalizeAndValidate
};
