# Cyber Safety Platform — Status & Roadmap

This document outlines the current status of features, planned work, and known limitations.

---

## 1. IMPLEMENTED

- [x] **Monorepo Architecture**: Clean separation between `client/`, `server/`, `extension/`, `shared/`, and `docs/`.
- [x] **Express Backend API Foundation**: Clean directory separation (routes, controllers, services, models, middleware, config, utilities).
- [x] **MongoDB Schema Foundation**: Minimal Mongoose entity schemas for `User`, `Website`, `ThreatInfo`, `UserReport`, and `Evidence`.
- [x] **Environment Configuration**: `.env.example` and `.env` setup using `dotenv`. Zero hardcoded credentials.
- [x] **Google Web Risk API Integration (Phase 3)**: Real-time external threat intelligence lookup for `MALWARE`, `SOCIAL_ENGINEERING`, and `UNWANTED_SOFTWARE`.
- [x] **Server-side TTL Caching**: In-memory caching (30 min TTL) for Web Risk lookup results to reduce external requests.
- [x] **Browser Extension Architecture**: Chromium Manifest V3 service worker (`background.js`), action popup UI (`popup.html`/`popup.js`), and content script listener stub (`content.js`).
- [x] **User Dashboard UI**: React 18 + Vite frontend displaying explainable decision responses (`classification`, `riskLevel`, `confidence`, `reasons`, `reports`, `evidence`).
- [x] **Threat Analysis Pipeline**: 5-stage pipeline (URL normalization, local reputation lookup, Google Web Risk external threat intel, community report evaluation, risk signal calculation, explainable decision builder).
- [x] **Community Report Integration**: Integrates `UserReport` & `Evidence` models. Ignores `REJECTED` reports; weights `PENDING` and `ACTIONED` reports cleanly.
- [x] **Input Normalization & Validation**: URL parser handling schemes, ports, query strings, paths, and malformed inputs.
- [x] **Automated Test Suite**: 21 automated tests covering valid/invalid domains, malformed URLs, ports, paths, Google Web Risk MALWARE/SOCIAL_ENGINEERING responses, missing API keys, timeouts, 500 errors, pending/rejected community reports, and unknown domains.

---

## 2. PLANNED (Future Implementation Phases)

- [ ] **Wikipedia Integration**: Ingesting public background evidence for domain history.
- [ ] **Reddit Community Integration**: Ingesting community discussion evidence regarding reported domains.
- [ ] **Automated Blocking Execution**: Declarative net request rules or warning overlays for high-confidence threats.
- [ ] **Evidence Verification Workflow**: Automated hashing and administrative verification for user-submitted proof.
- [ ] **User Authentication & Authorization**: Session/JWT login system for analyst and user accounts.

---

## 3. NOT IMPLEMENTED (Intentionally Excluded)

- ❌ Wikipedia Integration (Planned for Phase 4)
- ❌ Reddit Community Integration (Planned for Phase 4)
- ❌ Automatic browser blocking execution (Planned for Phase 5)
- ❌ Fake or mock threat score generators claiming active protection when none exists.
- ❌ Mathematical security guarantee mechanisms (forbidden by security principles).
- ❌ Code execution of user-submitted evidence files.
- ❌ Unrelated social networking, chat, payment systems, or advertisement features.

---

## 4. Known Limitations

1. **Google Web Risk API Key**: Requires a valid GCP Google Web Risk API key set in `server/.env` (`GOOGLE_WEB_RISK_API_KEY=...`). If unconfigured, the system operates safely using local database records and community report signals.
2. **MongoDB Connection**: If a local MongoDB daemon is not running, the pipeline runs gracefully with in-memory fallback.
