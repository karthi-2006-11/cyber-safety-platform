# Cyber Safety Platform — Running & Testing Guide

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017`

---

## 1. Running Backend Server

```bash
cd server
npm install
npm start
```
- Server starts on `http://localhost:5000`.
- Health Check available at: `http://localhost:5000/api/v1/health`
- Threat Check available at: `http://localhost:5000/api/v1/threats/check?domain=example.com`
- Pre-sync High Confidence endpoint: `http://localhost:5000/api/v1/threats/high-confidence`

---

## 2. Running User Dashboard Client

```bash
cd client
npm install
npm run dev
```
- Dashboard opens at `http://localhost:3000`.

---

## 3. Running Automated Test Suite

```bash
cd server
npm test
```
Executes all 55 automated unit & integration tests across 6 test files:
- `tests/pipeline.test.js`
- `tests/webRisk.test.js`
- `tests/wikipedia.test.js`
- `tests/reddit.test.js`
- `tests/combinedEvidence.test.js`
- `tests/extensionIntegration.test.js`

---

## 4. Loading & Testing Browser Extension (Manifest V3)

1. Open Google Chrome or Chromium browser.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** toggle in top-right corner.
4. Click **Load unpacked** button.
5. Select the `extension/` folder in this workspace repository.

### Safe Manual Verification Procedure

Do NOT use real malicious websites as test targets.

#### Test A: High Confidence Threat Blocking
1. Seed database with controlled fixture domain: `test-malicious-fixture.com` (status `HIGH_CONFIDENCE_THREAT`).
2. Navigate to `http://test-malicious-fixture.com`.
3. Extension receives decision, installs dynamic DNR rule, and redirects tab to `chrome-extension://<id>/blocked.html?domain=test-malicious-fixture.com`.
4. Block page displays: 🚫 WEBSITE BLOCKED, classification, reasons, and evidence.

#### Test B: Suspicious Domain Warning
1. Seed database with controlled fixture domain: `test-suspicious-fixture.com` (status `SUSPICIOUS`).
2. Navigate to `http://test-suspicious-fixture.com`.
3. Extension receives decision, updates badge to `WARN`, and renders warning banner overlay at top of screen (`⚠️ POTENTIALLY DANGEROUS WEBSITE`).

#### Test C: Safe / Unknown Domain Access
1. Navigate to `http://example.com` or `http://test-safe-fixture.com`.
2. Extension allows normal browsing without blocking.
