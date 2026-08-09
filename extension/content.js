/**
 * Cyber Safety Platform - Extension Content Script
 * Phase 5 Suspicious Website Warning Overlay
 */

console.log('[CyberSafety Content Script] Protection listener initialized.');

let activeBanner = null;

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'WARN_USER') {
      renderWarningBanner(message.reason || 'This website exhibits suspicious security attributes.');
      sendResponse({ acknowledged: true });
    }
  });
}

function renderWarningBanner(reasonText) {
  if (activeBanner) return; // Prevent duplicate banners

  const banner = document.createElement('div');
  banner.id = 'cybersafety-warning-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2147483647;
    background: #7c2d12;
    color: #fef3c7;
    padding: 12px 20px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border-bottom: 2px solid #f59e0b;
  `;

  const textDiv = document.createElement('div');
  textDiv.style.cssText = 'display: flex; align-items: center; gap: 10px;';

  const icon = document.createElement('span');
  icon.textContent = '⚠️';
  icon.style.fontSize = '18px';

  const messageSpan = document.createElement('span');
  messageSpan.textContent = `POTENTIALLY DANGEROUS WEBSITE: ${reasonText}`;

  textDiv.appendChild(icon);
  textDiv.appendChild(messageSpan);

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display: flex; gap: 10px; align-items: center;';

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Dismiss Warning';
  closeBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.15);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  closeBtn.addEventListener('click', () => {
    banner.remove();
    activeBanner = null;
  });

  actionsDiv.appendChild(closeBtn);
  banner.appendChild(textDiv);
  banner.appendChild(actionsDiv);

  document.body.prepend(banner);
  activeBanner = banner;
}
