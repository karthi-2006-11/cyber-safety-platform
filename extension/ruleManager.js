/**
 * Cyber Safety Platform — Extension Rule Manager
 * Manages Manifest V3 chrome.declarativeNetRequest dynamic blocking rules.
 */

// Helper to derive a deterministic numeric ID from a domain string for DNR rule IDs
function generateRuleId(domain) {
  let hash = 0;
  const str = domain.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash % 1000000) + 1; // Range 1 to 1,000,000
}

/**
 * Adds a dynamic declarativeNetRequest blocking/redirect rule for a high-confidence threat domain.
 */
async function addBlockRule(domain, decisionData = {}) {
  if (!domain || typeof domain !== 'string') return false;

  const cleanDomain = domain.toLowerCase().trim();
  const ruleId = generateRuleId(cleanDomain);
  const redirectUrl = chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(cleanDomain)}`);

  const dnrRule = {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: redirectUrl }
    },
    condition: {
      urlFilter: `||${cleanDomain}^`,
      resourceTypes: ['main_frame']
    }
  };

  try {
    if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [dnrRule]
      });
    }

    // Persist blocked domain metadata and evidence payload in chrome.storage.local
    if (chrome.storage && chrome.storage.local) {
      const storageData = await chrome.storage.local.get(['blockedDomainsMap']);
      const map = storageData.blockedDomainsMap || {};
      map[cleanDomain] = {
        domain: cleanDomain,
        ruleId,
        addedAt: new Date().toISOString(),
        decision: decisionData
      };
      await chrome.storage.local.set({ blockedDomainsMap: map });
    }

    return true;
  } catch (err) {
    console.error(`[RuleManager] Error adding dynamic DNR rule for ${cleanDomain}:`, err);
    return false;
  }
}

/**
 * Removes a dynamic DNR rule for a domain.
 */
async function removeBlockRule(domain) {
  if (!domain || typeof domain !== 'string') return false;

  const cleanDomain = domain.toLowerCase().trim();
  const ruleId = generateRuleId(cleanDomain);

  try {
    if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId]
      });
    }

    if (chrome.storage && chrome.storage.local) {
      const storageData = await chrome.storage.local.get(['blockedDomainsMap']);
      const map = storageData.blockedDomainsMap || {};
      delete map[cleanDomain];
      await chrome.storage.local.set({ blockedDomainsMap: map });
    }

    return true;
  } catch (err) {
    console.error(`[RuleManager] Error removing DNR rule for ${cleanDomain}:`, err);
    return false;
  }
}

/**
 * Synchronizes extension dynamic rules with list of high-confidence threat decisions.
 */
async function syncBlockRules(threatDecisionsList = []) {
  if (!Array.isArray(threatDecisionsList)) return;

  for (const item of threatDecisionsList) {
    if (item && item.domain && item.classification === 'HIGH_CONFIDENCE_THREAT') {
      await addBlockRule(item.domain, item);
    }
  }
}

// Export for Node testing or browser script loading
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateRuleId,
    addBlockRule,
    removeBlockRule,
    syncBlockRules
  };
}
