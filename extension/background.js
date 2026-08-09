/**
 * Cyber Safety Platform - Extension Background Service Worker
 * Architecture Foundation Phase 1
 */

const API_BASE_URL = 'http://localhost:5000/api/v1';

// Listen to tab selection / update events to inspect current domain
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    inspectTabUrl(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      inspectTabUrl(activeInfo.tabId, tab.url);
    }
  });
});

/**
 * Extracts domain and queries backend API for classification decision.
 */
async function inspectTabUrl(tabId, urlString) {
  // Ignore chrome:// or internal browser extension URLs
  if (!urlString || urlString.startsWith('chrome://') || urlString.startsWith('chrome-extension://')) {
    updateBadge(tabId, '', '#6c757d');
    return;
  }

  let domain = '';
  try {
    const parsed = new URL(urlString);
    domain = parsed.hostname;
  } catch (e) {
    return;
  }

  // Store active domain state locally
  await chrome.storage.local.set({ currentDomain: domain, currentUrl: urlString, lastCheckedAt: new Date().toISOString() });

  try {
    const response = await fetch(`${API_BASE_URL}/threats/check?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) {
      throw new Error(`API HTTP ${response.status}`);
    }

    const json = await response.json();
    const status = json.data ? json.data.status : 'UNKNOWN';

    await chrome.storage.local.set({ activeStatus: status, threatData: json.data });

    // Update UI badge based on classification terminology
    switch (status) {
      case 'SAFE':
        updateBadge(tabId, 'SAFE', '#28a745');
        break;
      case 'SUSPICIOUS':
        updateBadge(tabId, 'WARN', '#ffc107');
        break;
      case 'HIGH_CONFIDENCE_THREAT':
        updateBadge(tabId, 'BLOCK', '#dc3545');
        break;
      default:
        updateBadge(tabId, '?', '#6c757d');
        break;
    }
  } catch (err) {
    console.warn('[CyberSafety Extension] Could not reach backend API:', err.message);
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

console.log('[CyberSafety Extension] Background Service Worker Initialized.');
