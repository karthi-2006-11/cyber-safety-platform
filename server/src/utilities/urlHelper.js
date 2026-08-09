/**
 * Helper utilities for parsing and validating target URLs and domains.
 */

/**
 * Extracts and normalizes domain from a given URL or hostname input string.
 * @param {string} rawInput 
 * @returns {string|null} normalized domain (e.g. 'example.com')
 */
function extractDomain(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;

  let cleaned = rawInput.trim().toLowerCase();

  // If missing protocol, prepend http:// for URL parsing
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname;
    
    // Remove leading 'www.' if present for consistent domain representation
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    
    return hostname || null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  extractDomain
};
