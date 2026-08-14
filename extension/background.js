/**
 * Cyber Safety Platform - Extension Background Service Worker
 * Phase 12B: Real-Time Threat Warning & Protection Engine
 * 
 * Target Backend: https://cyber-safety-platform-50px.onrender.com/api/v1
 * Threat Lookup Endpoint: GET /api/v1/threats/check?domain=<normalized-domain>
 */

// Import dynamic configuration
importScripts('config.js');

const API_BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
  ? CONFIG.API_BASE_URL
  : 'https://cyber-safety-platform-50px.onrender.com/api/v1';

// Short-lived in-memory domain cache (5 minute TTL)
const domainCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Per-tab request version sequence map to prevent stale async race overwrites
const tabRequestVersions = new Map();

// Listen for tab switching
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!activeInfo || !activeInfo.tabId) return;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
    if (tab && tab.url) {
      inspectTabUrl(activeInfo.tabId, tab.url);
    }
  } catch (err) {
    // Safely ignore tab lifecycle lookup errors
  }
});

// Listen for tab URL updates & page reload
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo && changeInfo.status === 'complete' && tab && tab.url) {
    inspectTabUrl(tabId, tab.url).catch(() => {});
  }
});

/**
 * Clean up sequence maps when tabs are closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabRequestVersions.delete(tabId);
});

/**
 * Extracts and normalizes domain from URL string.
 * Strips scheme, paths, query params, fragments, and leading 'www.'.
 * Bypasses internal browser protocols (chrome://, about:, file://, etc.).
 */
function extractCanonicalDomain(urlString) {
  if (!urlString || typeof urlString !== 'string') return null;

  const trimmed = urlString.trim().toLowerCase();
  if (
    trimmed.startsWith('chrome://') ||
    trimmed.startsWith('chrome-extension://') ||
    trimmed.startsWith('edge://') ||
    trimmed.startsWith('about:') ||
    trimmed.startsWith('file://')
  ) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    return hostname || null;
  } catch (err) {
    return null;
  }
}

/**
 * Real-time domain threat inspection with tab sequence versioning and lifecycle protection.
 */
async function inspectTabUrl(tabId, urlString) {
  if (!tabId) return;

  // Prevent inspecting extension's own warning page to avoid infinite loops
  if (urlString && urlString.includes('blocked.html')) {
    return;
  }

  // Increment version sequence for this tab to guard against stale async races
  const currentVersion = (tabRequestVersions.get(tabId) || 0) + 1;
  tabRequestVersions.set(tabId, currentVersion);

  const domain = extractCanonicalDomain(urlString);

  if (!domain) {
    await updateBadge(tabId, 'N/A', '#6b7280');
    if (tabRequestVersions.get(tabId) === currentVersion) {
      await chrome.storage.local.set({
        activeDomain: urlString ? 'Internal Browser Page' : 'No Active Domain',
        activeStatus: 'UNSUPPORTED',
        activeData: null,
        lastCheckedAt: new Date().toISOString()
      }).catch(() => {});
    }
    return;
  }

  // Check in-memory short-lived cache
  const cached = domainCache.get(domain);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    if (tabRequestVersions.get(tabId) === currentVersion) {
      await applyInspectionResult(tabId, domain, cached.result, urlString);
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/threats/check?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) throw new Error(`HTTP_${response.status}`);

    const json = await response.json();
    const decision = json.data || {};

    // Cache normalized result
    domainCache.set(domain, { timestamp: Date.now(), result: decision });

    // Verify tab is still on the same request version before applying result
    if (tabRequestVersions.get(tabId) === currentVersion) {
      await applyInspectionResult(tabId, domain, decision, urlString);
    }

  } catch (err) {
    console.warn(`[CyberSafety Extension] Backend lookup error for ${domain}:`, err.message);
    const errorDecision = {
      domain,
      classification: 'OFFLINE',
      riskLevel: 'UNKNOWN',
      confidence: 0,
      reasons: ['Cyber Safety backend is currently unreachable.']
    };
    if (tabRequestVersions.get(tabId) === currentVersion) {
      await applyInspectionResult(tabId, domain, errorDecision, urlString);
    }
  }
}

/**
 * Updates extension action badge, persists tab state in chrome.storage.local,
 * and triggers defensive warning interstitial ONLY for confirmed HIGH_CONFIDENCE_THREAT.
 */
async function applyInspectionResult(tabId, domain, decision, originalUrlString = '') {
  if (!tabId) return;

  // Confirm tab still exists before setting storage or triggering protection
  const tabExists = await chrome.tabs.get(tabId).then(() => true).catch(() => false);
  if (!tabExists) return;

  const status = decision.classification || decision.status || 'UNKNOWN';

  // Store active tab data for popup rendering
  await chrome.storage.local.set({
    activeDomain: domain,
    activeStatus: status,
    activeData: decision,
    lastCheckedAt: new Date().toISOString()
  }).catch(() => {});

  // PHASE 12B DEFENSIVE PROTECTION TRIGGER: Only HIGH_CONFIDENCE_THREAT triggers interstitial warning
  if (status === 'HIGH_CONFIDENCE_THREAT') {
    // 1. Store domain decision map for blocked.html warning page reader
    const storageData = await chrome.storage.local.get(['blockedDomainsMap']).catch(() => ({}));
    const map = storageData.blockedDomainsMap || {};
    map[domain] = { timestamp: Date.now(), decision };
    await chrome.storage.local.set({ blockedDomainsMap: map }).catch(() => {});

    // 2. Redirect tab safely to extension-owned warning interstitial page if not already there
    const warningPageUrl = chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(domain)}`);
    if (originalUrlString && !originalUrlString.includes('blocked.html')) {
      await chrome.tabs.update(tabId, { url: warningPageUrl }).catch(() => {});
    }

    await updateBadge(tabId, 'RISK', '#ef4444');
    return;
  }

  // Defensive Policy: All non-HIGH_CONFIDENCE_THREAT statuses allow normal browsing (No blocking)
  switch (status) {
    case 'SAFE':
      await updateBadge(tabId, 'SAFE', '#10b981');
      break;
    case 'SUSPICIOUS':
      // Show warning badge in popup only; normal browsing continues
      await updateBadge(tabId, 'WARN', '#f59e0b');
      break;
    case 'OFFLINE':
      await updateBadge(tabId, 'OFF', '#6b7280');
      break;
    case 'UNKNOWN':
    default:
      await updateBadge(tabId, 'OK', '#64748b');
      break;
  }
}

/**
 * Safe action badge updater that explicitly handles Chrome tab closure/lifecycle errors.
 */
async function updateBadge(tabId, text, color) {
  if (!chrome.action || !tabId) return;
  try {
    const tabExists = await chrome.tabs.get(tabId).then(() => true).catch(() => false);
    if (!tabExists) return;

    await chrome.action.setBadgeText({ tabId, text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
  } catch (err) {
    if (err.message && err.message.includes('No tab with id')) {
      return;
    }
    console.warn('[CyberSafety Extension] Badge update error:', err.message);
  }
}

console.log('[CyberSafety Extension] Phase 12B Real-Time Threat Warning & Protection Engine Initialized.');
