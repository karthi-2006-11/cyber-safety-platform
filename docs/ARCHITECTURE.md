# Cyber Safety Platform — Architecture Document

## Overview

The Cyber Safety Platform is a real-time background protection system designed with a core security mission:
> *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The platform consists of three primary decoupled components:
1. **Browser Extension (`extension/`)**: Chromium Manifest V3 background service worker listening to navigation, querying backend threat API, managing dynamic `declarativeNetRequest` rules, rendering warning banners, and serving an isolated extension block page (`blocked.html`).
2. **Backend API (`server/`)**: Express.js REST application managing website threat records, user safety reports, evidence persistence, Google Web Risk lookups, Wikipedia/Reddit public context lookups, and classification lookups via MongoDB.
3. **User Dashboard (`client/`)**: Modern React interface allowing users to inspect domain threat decisions, submit safety feedback with supporting proof, and view system status.

---

## 6-Stage Threat Analysis Pipeline & Browser Protection Architecture

```
Requested URL / Domain Input
            ↓
  [ Stage 1: URL Normalizer & Validator ]  (Strips ports, paths, schemes; validates format)
            ↓
  [ Stage 2: Local Reputation Evaluator ] (Queries Website & ThreatInfo Mongoose models)
            ↓
  [ Stage 3: External Threat Intelligence ]  (Google Web Risk Lookup API + 30-min TTL Cache)
            ↓
  [ Stage 4: Community Report Evaluator ] (Queries UserReport & Evidence models; status weights)
            ↓
  [ Stage 5: Public Contextual Evidence ]  (Wikipedia + Reddit Services + Deterministic Relevance)
            ↓
  [ Stage 6: Risk Signal Calculator ]      (Aggregates signals, constructs Unified Evidence)
            ↓
  [ Explainable Decision Response ]
       { domain, classification, riskLevel, confidence, reasons, evidence, reports, analyzedAt }
            ↓
  [ Browser Extension Enforcement ]
       ├── HIGH_CONFIDENCE_THREAT → Dynamic DNR Rule Installed + Tab Redirected to blocked.html
       ├── SUSPICIOUS → Warning Banner Overlay Rendered via Content Script
       └── SAFE / UNKNOWN → Normal Access Allowed
```

---

## Browser Protection & Dynamic Rule Architecture (Manifest V3)

### Manifest V3 Technical Reality & Navigation Enforcement
- **Pre-blocked Known Threats**: Domains previously classified as `HIGH_CONFIDENCE_THREAT` are installed as dynamic blocking/redirect rules using `chrome.declarativeNetRequest` (DNR). Chromium intercepts and redirects matching requests to `extension/blocked.html` **before** network navigation occurs.
- **First-Time Unindexed Domains**: When navigating to a new unindexed domain, Chromium MV3 does NOT allow blocking an ongoing HTTP request synchronously while awaiting a remote backend API response. The extension listens via `chrome.webNavigation`, queries `/api/v1/threats/check`, and if `HIGH_CONFIDENCE_THREAT` is returned:
  1) Installs a permanent DNR blocking rule for future visits.
  2) Immediately redirects the active tab to `extension/blocked.html?domain=...`.
- **Zero Fake Promises**: The architecture explicitly documents this technical reality rather than claiming impossible synchronous pre-navigation blocking for unindexed domains.

### Dynamic DNR Rule System (`extension/ruleManager.js`)
- Uses `chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [...], addRules: [...] })`.
- Scoped strictly to target domain (`urlFilter: "||domain^"`).
- Uses deterministic rule IDs generated via domain string hashing.
- Stores decision metadata & evidence in `chrome.storage.local` under `blockedDomainsMap`.

### Extension Block Page (`extension/blocked.html`)
- Hosted locally inside extension package (`chrome-extension://<id>/blocked.html?domain=...`).
- Never loads the dangerous website content.
- Displays:
  - Header: 🚫 WEBSITE BLOCKED - "This website was blocked because our protection system identified it as a high-confidence cyber threat."
  - Blocked domain name, classification (`HIGH_CONFIDENCE_THREAT`), risk level (`HIGH`), confidence score.
  - Explainable detection reasons.
  - Supporting evidence items with verification badges (`SYSTEM DETECTION`, `VERIFIED`, `SUPPORTED`, `UNVERIFIED COMMUNITY REPORT`).
- Renders DOM using safe `textContent` / element creation (zero `innerHTML` XSS risk).

### Suspicious Warning Overlay (`extension/content.js`)
- When classification is `SUSPICIOUS`, extension sends a message to `content.js` to render a non-intrusive warning banner overlay at top of screen: `⚠️ POTENTIALLY DANGEROUS WEBSITE`.

### Extension Permissions (`extension/manifest.json`)
- `declarativeNetRequest`: Dynamic rule creation for high-confidence domain redirects.
- `webNavigation`: Navigation event listener for background domain inspection.
- `storage`: Local persistence of blocked domains map and active domain state.
- `tabs` & `activeTab`: Tab URL inspection and badge updates.
- Host permissions: `http://localhost/*`, `http://127.0.0.1/*`, `https://*/*`.

---

## Component Separation

```
project-root/
├── client/           # User dashboard (React 18 + Vite)
├── server/           # Backend REST API (Node.js + Express + Mongoose)
│   ├── src/pipeline/ # 6-stage Threat Pipeline (Normalizer, Local, WebRisk, Community, Wiki, Reddit, Calculator)
│   ├── src/services/ # WebRisk, Wikipedia, and Reddit Services
│   └── tests/        # Automated test suite (55 tests across 6 test files)
├── extension/        # Chromium Manifest V3 browser protection extension
│   ├── background.js # Background service worker & navigation listener
│   ├── ruleManager.js# Dynamic declarativeNetRequest rule manager
│   ├── blocked.html  # Isolated extension block page HTML
│   ├── blocked.css   # Block page styling
│   ├── blocked.js    # Block page script & evidence renderer
│   ├── content.js    # Suspicious domain warning banner overlay
│   ├── popup.html    # Protection status popup HTML
│   └── popup.js      # Popup status & rule count logic
├── shared/           # Shared status enums, risk levels, and constants
└── docs/             # Technical architecture & project documentation
```
