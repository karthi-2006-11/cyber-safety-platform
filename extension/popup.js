document.addEventListener('DOMContentLoaded', async () => {
  const domainEl = document.getElementById('domain-name');
  const badgeEl = document.getElementById('status-badge');
  const riskLevelEl = document.getElementById('risk-level-value');
  const confidenceEl = document.getElementById('confidence-value');
  const reasonsListEl = document.getElementById('reasons-list');
  const dotEl = document.getElementById('backend-status-dot');
  const labelEl = document.getElementById('protection-status-label');
  const evCountEl = document.getElementById('evidence-count-badge');
  const evContainerEl = document.getElementById('evidence-list-container');
  const openBtn = document.getElementById('open-dashboard-btn');

  const apiBase = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'https://cyber-safety-platform-50px.onrender.com/api/v1';

  // 1. Backend Connectivity Health Check
  try {
    const healthRes = await fetch(`${apiBase}/health`);
    if (healthRes.ok) {
      dotEl.className = 'status-dot online';
      labelEl.textContent = 'ONLINE';
      labelEl.style.color = '#10b981';
    } else {
      throw new Error(`HTTP ${healthRes.status}`);
    }
  } catch (err) {
    dotEl.className = 'status-dot offline';
    labelEl.textContent = 'API Error';
    labelEl.style.color = '#ef4444';
  }

  // 2. Load Active Tab State from chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['activeDomain', 'activeStatus', 'activeData'], (data) => {
      const domain = data.activeDomain || 'No active domain';
      const status = data.activeStatus || 'UNKNOWN';
      const decision = data.activeData || {};

      domainEl.textContent = domain;

      // Classification Badge
      badgeEl.textContent = status.replace(/_/g, ' ');
      badgeEl.className = `badge ${status.toLowerCase()}`;

      // Risk & Confidence
      riskLevelEl.textContent = decision.riskLevel || 'NONE';
      riskLevelEl.className = `metric-val ${ (decision.riskLevel || 'NONE').toLowerCase() }`;
      
      const confNum = decision.confidence !== undefined ? Math.round(decision.confidence * 100) : 50;
      confidenceEl.textContent = `${confNum}%`;

      // Analysis Reasons
      reasonsListEl.innerHTML = '';
      if (Array.isArray(decision.reasons) && decision.reasons.length > 0) {
        for (const reason of decision.reasons) {
          const li = document.createElement('li');
          li.textContent = reason;
          reasonsListEl.appendChild(li);
        }
      } else {
        const li = document.createElement('li');
        li.textContent = status === 'UNSUPPORTED'
          ? 'Internal browser page cannot be evaluated.'
          : 'No threat indicators recorded for this domain.';
        reasonsListEl.appendChild(li);
      }

      // Evidence Breakdown
      const evidence = Array.isArray(decision.evidence) ? decision.evidence : [];
      evCountEl.textContent = `${evidence.length} Source${evidence.length === 1 ? '' : 's'}`;

      evContainerEl.innerHTML = '';
      if (evidence.length === 0) {
        evContainerEl.innerHTML = '<div class="empty-evidence">No external threat evidence linked.</div>';
      } else {
        for (const ev of evidence) {
          const itemEl = document.createElement('div');
          itemEl.className = 'evidence-item';

          let displayTitle = ev.title;
          if (!displayTitle || displayTitle === 'nil') {
            displayTitle = ev.source === 'COMMUNITY_REPORT' ? 'Community Safety Report' : 'Security Intelligence';
          }

          itemEl.innerHTML = `
            <div class="ev-item-header">
              <span class="ev-source-tag ${ (ev.source || 'INTEL').toLowerCase() }">${ev.source || 'INTEL'}</span>
              <span class="ev-status-tag">${ev.verificationStatus || 'SUPPORTED'}</span>
            </div>
            <div class="ev-item-title">${escapeHtml(displayTitle)}</div>
            ${ev.excerpt ? `<div class="ev-item-excerpt">${escapeHtml(ev.excerpt)}</div>` : ''}
          `;
          evContainerEl.appendChild(itemEl);
        }
      }
    });
  }

  // 3. CTA: Open Security Dashboard
  openBtn.addEventListener('click', () => {
    const dashboardUrl = typeof CONFIG !== 'undefined' ? CONFIG.DASHBOARD_URL : 'https://cyber-safety-platform-client.onrender.com';
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: dashboardUrl });
    } else {
      window.open(dashboardUrl, '_blank');
    }
  });
});

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
