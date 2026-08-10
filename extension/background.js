/**
 * Cyber Safety Platform - Extension Background Service Worker
 * Phase 5 Automatic Browser Protection & Blocking Engine
 */

// Import dynamic configuration and DNR rule manager helper functions
importScripts('config.js', 'ruleManager.js');

const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:5000/api/v1';

// Synchronize rules on startup
chrome.runtime.onInstalled.addListener(() => {
  syncHighConfidenceThreats();
});

chrome.runtime.onStartup.addListener(() => {
  syncHighConfidenceThreats();
});

// Listen to webNavigation committed events
if (chrome.webNavigation) {
  chrome.webNavigation.onCommitted.addListener((details) => {
    // Only inspect main frame navigation (frameId === 0)
    if (details.frameId === 0 && details.url) {
      inspectTabUrl(details.tabId, details.url);
    }
  });
}

// Fallback tab update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    inspectTabUrl(tabId, tab.url);
  }
});

/**
 * Synchronizes high-confidence threat rules from backend database.
 */
async function syncHighConfidenceThreats() {
  try {
    const res = await fetch(`${API_BASE_URL}/threats/high-confidence`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.domains)) {
        await syncBlockRules(json.domains);
        console.log(`[CyberSafety Extension] Synchronized ${json.domains.length} high-confidence threat rules.`);
      }
    }
  } catch (err) {
    console.warn('[CyberSafety Extension] Could not pre-sync high confidence threats:', err.message);
  }
}

/**
 * Inspects domain and handles classification:
 * HIGH_CONFIDENCE_THREAT -> Installs DNR rule & redirects tab to extension blocked.html
 * SUSPICIOUS -> Sends warning overlay message to content.js
 * SAFE / UNKNOWN -> Allows normal browsing
 */
async function inspectTabUrl(tabId, urlString) {
  if (!urlString || urlString.startsWith('chrome://') || urlString.startsWith('chrome-extension://')) {
    updateBadge(tabId, '', '#6c757d');
    return;
  }

  let domain = '';
  try {
    const parsed = new URL(urlString);
    domain = parsed.hostname;
    if (domain.startsWith('www.')) domain = domain.slice(4);
  } catch (e) {
    return;
  }

  // Save active domain in storage
  await chrome.storage.local.set({ currentDomain: domain, currentUrl: urlString, lastCheckedAt: new Date().toISOString() });

  try {
    const response = await fetch(`${API_BASE_URL}/threats/check?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const decision = json.data || {};
    const status = decision.status || decision.classification || 'UNKNOWN';

    await chrome.storage.local.set({ activeStatus: status, threatData: decision });

    if (status === 'HIGH_CONFIDENCE_THREAT') {
      // 1. Add permanent dynamic DNR rule for domain
      await addBlockRule(domain, decision);

      // 2. Redirect active tab immediately to extension blocked page
      const blockPageUrl = chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(domain)}`);
      if (!urlString.includes('blocked.html')) {
        chrome.tabs.update(tabId, { url: blockPageUrl });
      }

      updateBadge(tabId, 'BLOCK', '#dc3545');

    } else if (status === 'SUSPICIOUS') {
      // Send warning message to content script overlay
      chrome.tabs.sendMessage(tabId, {
        action: 'WARN_USER',
        reason: decision.reasons ? decision.reasons.join('; ') : 'Potential cyber threat detected.',
        decision
      }).catch(() => {});

      updateBadge(tabId, 'WARN', '#ffc107');

    } else if (status === 'SAFE') {
      updateBadge(tabId, 'SAFE', '#28a745');
    } else {
      updateBadge(tabId, '?', '#6c757d');
    }

  } catch (err) {
    console.warn('[CyberSafety Extension] Backend unreachable during inspection:', err.message);
    await chrome.storage.local.set({ activeStatus: 'UNREACHABLE', error: err.message });
    updateBadge(tabId, 'OFF', '#6c757d');
  }
}

function updateBadge(tabId, text, color) {
  if (chrome.action) {
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color });
  }
}

console.log('[CyberSafety Extension] Phase 5 Protection & Blocking Engine Initialized.');
