document.addEventListener('DOMContentLoaded', async () => {
  const domainEl = document.getElementById('target-domain');
  const badgeEl = document.getElementById('classification-badge');
  const riskEl = document.getElementById('risk-level');
  const confEl = document.getElementById('confidence-score');
  const reasonsListEl = document.getElementById('reasons-list');
  const evidenceContainerEl = document.getElementById('evidence-container');
  const closeBtn = document.getElementById('close-tab-btn');
  const dashboardBtn = document.getElementById('dashboard-btn');

  // Extract domain parameter from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const domain = urlParams.get('domain') || 'unknown-domain.com';
  domainEl.textContent = domain;

  let decision = null;

  // Retrieve stored decision & evidence from chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const storage = await chrome.storage.local.get(['blockedDomainsMap']);
    const map = storage.blockedDomainsMap || {};
    if (map[domain] && map[domain].decision) {
      decision = map[domain].decision;
    }
  }

  // Fallback: Query backend threat check if not cached locally
  if (!decision) {
    try {
      const apiBase = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE_URL : 'http://localhost:5000/api/v1';
      const res = await fetch(`${apiBase}/threats/check?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          decision = json.data;
        }
      }
    } catch (err) {
      console.warn('[BlockPage] Could not query backend decision:', err);
    }
  }

  // Render Decision Metadata safely using textContent
  if (decision) {
    if (decision.classification) {
      badgeEl.textContent = decision.classification.replace(/_/g, ' ');
      badgeEl.className = `badge ${decision.classification.toLowerCase()}`;
    }

    riskEl.textContent = decision.riskLevel || 'HIGH';
    confEl.textContent = decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : '90%';

    // Render Reasons safely
    reasonsListEl.replaceChildren();
    if (Array.isArray(decision.reasons) && decision.reasons.length > 0) {
      decision.reasons.forEach(reasonText => {
        const li = document.createElement('li');
        li.textContent = reasonText;
        reasonsListEl.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'High-confidence threat signals detected by background protection engine.';
      reasonsListEl.appendChild(li);
    }

    // Render Evidence Items safely using DOM elements
    evidenceContainerEl.replaceChildren();
    if (Array.isArray(decision.evidence) && decision.evidence.length > 0) {
      decision.evidence.forEach(item => {
        const card = document.createElement('div');
        card.className = 'evidence-card';

        const header = document.createElement('div');
        header.className = 'evidence-header';

        const title = document.createElement('span');
        title.className = 'evidence-title';
        title.textContent = item.title || item.source;

        const statusBadge = document.createElement('span');
        statusBadge.className = `badge ${item.verificationStatus ? item.verificationStatus.toLowerCase() : 'unknown'}`;
        statusBadge.textContent = (item.verificationStatus || 'UNVERIFIED').replace(/_/g, ' ');

        header.appendChild(title);
        header.appendChild(statusBadge);

        const text = document.createElement('p');
        text.className = 'evidence-text';
        text.textContent = item.excerpt || item.content || 'Supporting evidence details.';

        card.appendChild(header);
        card.appendChild(text);
        evidenceContainerEl.appendChild(card);
      });
    } else {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'empty-notice';
      emptyNotice.textContent = 'Supporting evidence is currently unavailable.';
      evidenceContainerEl.appendChild(emptyNotice);
    }

  } else {
    // Fallback if backend offline and no local record
    badgeEl.textContent = 'HIGH CONFIDENCE THREAT';
    reasonsListEl.replaceChildren();
    const li = document.createElement('li');
    li.textContent = 'Domain blocked in accordance with synchronized security policy.';
    reasonsListEl.appendChild(li);

    evidenceContainerEl.replaceChildren();
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'empty-notice';
    emptyNotice.textContent = 'Supporting evidence is currently unavailable.';
    evidenceContainerEl.appendChild(emptyNotice);
  }

  // Button Handlers
  closeBtn.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.getCurrent(tab => {
        if (tab && tab.id) chrome.tabs.remove(tab.id);
      });
    } else {
      window.close();
    }
  });

  dashboardBtn.addEventListener('click', () => {
    const dashboardUrl = typeof CONFIG !== 'undefined' ? CONFIG.DASHBOARD_URL : 'http://localhost:3000';
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: dashboardUrl });
    } else {
      window.open(dashboardUrl, '_blank');
    }
  });
});
