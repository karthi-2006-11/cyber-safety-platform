document.addEventListener('DOMContentLoaded', async () => {
  const domainEl = document.getElementById('domain-name');
  const badgeEl = document.getElementById('status-badge');
  const descEl = document.getElementById('status-description');
  const dotEl = document.getElementById('backend-status-dot');
  const labelEl = document.getElementById('protection-status-label');
  const rulesCountEl = document.getElementById('blocked-rules-count');
  const openBtn = document.getElementById('open-dashboard-btn');

  // Check Backend health and set protection active label
  try {
    const healthRes = await fetch('http://localhost:5000/api/v1/health');
    if (healthRes.ok) {
      dotEl.className = 'status-dot online';
      labelEl.textContent = 'Protection Active';
      labelEl.style.color = '#10b981';
    } else {
      throw new Error('Non-200 response');
    }
  } catch (err) {
    dotEl.className = 'status-dot offline';
    labelEl.textContent = 'Threat analysis unavailable';
    labelEl.style.color = '#ef4444';
  }

  // Load active tab info & blocked rules map from chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['currentDomain', 'activeStatus', 'threatData', 'blockedDomainsMap'], (data) => {
      if (data.currentDomain) {
        domainEl.textContent = data.currentDomain;
      } else {
        domainEl.textContent = 'No active domain';
      }

      const status = data.activeStatus || 'UNKNOWN';
      badgeEl.textContent = status.replace(/_/g, ' ');
      badgeEl.className = `badge ${status.toLowerCase()}`;

      switch (status) {
        case 'SAFE':
          descEl.textContent = 'This website domain is verified as Safe.';
          break;
        case 'SUSPICIOUS':
          descEl.textContent = 'Warning: This domain exhibits suspicious security attributes.';
          break;
        case 'HIGH_CONFIDENCE_THREAT':
          descEl.textContent = 'AUTOMATICALLY BLOCKED: Known high-confidence cyber threat.';
          break;
        case 'UNKNOWN':
        default:
          descEl.textContent = 'No threat indicators recorded. Status is Unknown.';
          break;
      }

      const map = data.blockedDomainsMap || {};
      const count = Object.keys(map).length;
      rulesCountEl.textContent = `${count} Active DNR Block Rules`;
    });
  }

  openBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'http://localhost:3000' });
    } else {
      window.open('http://localhost:3000', '_blank');
    }
  });
});
