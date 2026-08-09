# Cyber Safety Platform

> *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The Cyber Safety Platform is a seriousness-driven cybersecurity solution providing real-time threat evaluation, evidence-backed risk analysis, community cybercrime reporting, trusted moderation workflows, and dynamic browser protection.

---

## System Architecture Overview

1. **Browser Protection Extension (`extension/`)**: Manifest V3 background service worker using `declarativeNetRequest` dynamic rules to block high-confidence malicious domains and render local explainable block pages (`blocked.html`).
2. **Threat Analysis Engine (`server/src/pipeline/`)**: Decoupled 6-stage evaluation pipeline combining URL normalization, local reputation records, Google Web Risk API threat intelligence, community user reports, Wikipedia/Reddit public evidence, and explainable risk calculation.
3. **Community Intelligence & Moderation (`server/src/services/report.service.js`)**: Anonymized reporter tracking (`independentReporterCount`), multi-evidence attachment, duplicate report filtering, and RBAC-protected moderator workflow.
4. **User & Moderator Dashboard (`client/`)**: Modern React 18 + Vite interface with dark glassmorphism UI for inspecting threats, submitting community reports, and actioning pending threats.

---

## Key Features & Protection Rules

- **Explainable Classification**: `SAFE`, `SUSPICIOUS`, `HIGH_CONFIDENCE_THREAT`, `UNKNOWN`.
- **Strict Threat Promotion**: A single unverified report, Reddit post, or Wikipedia page will **NEVER** force `HIGH_CONFIDENCE_THREAT` or trigger automatic browser blocking.
- **Fail-Safe Operation**: If external services (Google Web Risk, Reddit, Wikipedia) or the backend database are unreachable, the platform operates safely using cached and pre-synchronized DNR rules without blocking unrated sites.
- **Anti-Abuse Safeguards**: XSS HTML tag sanitization, safe URL validation, anonymized reporter hashes, and RBAC-protected moderation endpoints.

---

## Getting Started & Running Locally

### Prerequisites
- Node.js >= 18.0.0
- MongoDB running on `mongodb://127.0.0.1:27017`

### Running Backend API Server
```bash
cd server
npm install
npm start
```
Starts on `http://localhost:5000`.

### Running User Dashboard Client
```bash
cd client
npm install
npm run dev
```
Opens on `http://localhost:3000`.

### Running Automated Test Suite
```bash
cd server
npm test
```
Executes all 71 unit and integration test cases across 7 test suites.

### Loading Browser Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** toggle.
3. Click **Load unpacked** and select the `extension/` directory.
