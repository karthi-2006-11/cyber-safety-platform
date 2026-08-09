document.addEventListener('DOMContentLoaded', async () => {
  const domainEl = document.getElementById('domain-name');
  const badgeEl = document.getElementById('status-badge');
  const descEl = document.getElementById('status-description');
  const dotEl = document.getElementById('backend-status-dot');
  const openBtn = document.getElementById('open-dashboard-btn');

  // Check Backend health
  try {
    const healthRes = await fetch('http://localhost:5000/api/v1/health');
    if (healthRes.ok) {
      dotEl.className = 'status-dot online';
      dotEl.title = 'Backend Online';
    }
  } catch (err) {
    dotEl.className = 'status-dot offline';
    dotEl.title = 'Backend Offline';
  }

  // Load active tab info from local storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['currentDomain', 'activeStatus', 'threatData'], (data) => {
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
          descEl.textContent = 'This website domain is classified as Safe.';
          break;
        case 'SUSPICIOUS':
          descEl.textContent = 'This domain exhibits suspicious attributes. Exercise caution.';
          break;
        case 'HIGH_CONFIDENCE_THREAT':
          descEl.textContent = 'HIGH CONFIDENCE THREAT: Known security threat domain.';
          break;
        case 'UNKNOWN':
        default:
          descEl.textContent = 'No threat data found for this domain. Status is Unknown.';
          break;
      }
    });
  }

  openBtn.addEventListener('click', () => {
    if (chrome.tabs) {
      chrome.tabs.create({ url: 'http://localhost:3000' });
    } else {
      window.open('http://localhost:3000', '_blank');
    }
  });
});
