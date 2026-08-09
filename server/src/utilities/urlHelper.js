/**
 * Helper utilities for parsing and validating target URLs and domains.
 */

// Basic domain name format regex (supports subdomains, TLDs, and IPv4 addresses)
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-2]{2,63}$/i;
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Extracts and normalizes domain from a given URL or hostname input string.
 * Strips ports, schemes, paths, query parameters, and trailing slashes.
 * 
 * @param {string} rawInput 
 * @returns {string|null} normalized domain (e.g. 'example.com') or null if invalid
 */
function extractDomain(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;

  let cleaned = rawInput.trim().toLowerCase();
  if (!cleaned) return null;

  // Handle control characters or obvious malformed strings
  if (/[\s<>"'{}|\\^~\[\]`]/.test(cleaned)) return null;

  // If missing protocol, prepend http:// for standard URL parsing
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname;

    if (!hostname) return null;

    // Remove brackets if IPv6 host
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1);
    }

    // Remove leading 'www.' for consistent canonical domain representation
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Validate hostname against domain or IP format
    if (DOMAIN_REGEX.test(hostname) || IP_REGEX.test(hostname) || hostname === 'localhost') {
      return hostname;
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Checks whether a given string is a valid domain or IP address format.
 * @param {string} domain 
 * @returns {boolean}
 */
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  const normalized = extractDomain(domain);
  return normalized !== null;
}

module.exports = {
  extractDomain,
  isValidDomain
};
