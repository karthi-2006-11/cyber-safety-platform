/**
 * Cyber Safety Platform - Extension Content Script
 * Phase 1 Architecture Foundation
 */

console.log('[CyberSafety Content Script] Content script initialized on page.');

// Listen for messages from background worker (e.g. for warning banners or blocking overlays)
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'WARN_USER') {
      console.warn('[CyberSafety Warning]', message.reason);
      sendResponse({ acknowledged: true });
    }
  });
}
