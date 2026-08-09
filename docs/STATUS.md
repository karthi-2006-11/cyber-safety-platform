# Cyber Safety Platform — Status & Roadmap

This document outlines the current status of features, planned work, and known limitations.

---

## 1. IMPLEMENTED

- [x] **Monorepo Architecture**: Clean separation between `client/`, `server/`, `extension/`, `shared/`, and `docs/`.
- [x] **Express Backend API Foundation**: Clean directory separation (routes, controllers, services, models, middleware, config, utilities).
- [x] **MongoDB Schema Foundation**: Minimal Mongoose entity schemas for `User`, `Website`, `ThreatInfo`, `UserReport`, and `Evidence`.
- [x] **Environment Configuration**: `.env.example` and `.env` setup using `dotenv`. Zero hardcoded credentials.
- [x] **Browser Extension Architecture**: Chromium Manifest V3 service worker (`background.js`), action popup UI (`popup.html`/`popup.js`), and content script listener stub (`content.js`).
- [x] **User Dashboard UI**: React 18 + Vite frontend displaying explainable decision responses (`classification`, `riskLevel`, `confidence`, `reasons`, `reports`, `evidence`).
- [x] **Threat Analysis Pipeline (Phase 2)**: 5-stage pipeline (URL normalization, local reputation lookup, community report evaluation, risk signal calculation, explainable decision builder).
- [x] **Community Report Integration**: Integrates `UserReport` & `Evidence` models. Ignores `REJECTED` reports; weights `PENDING` and `ACTIONED` reports cleanly.
- [x] **Input Normalization & Validation**: URL parser handling schemes, ports, query strings, paths, and malformed inputs.
- [x] **Automated Test Suite**: Test coverage for valid domains, malformed URLs, ports, paths, pending/rejected/multiple community reports, and unknown domains.

---

## 2. PLANNED (Future Implementation Phases)

- [ ] **Wikipedia Integration**: Ingesting public background evidence for domain history.
- [ ] **Reddit Community Integration**: Ingesting community discussion evidence regarding reported domains.
- [ ] **Automated Blocking Execution**: Declarative net request rules or overlays for high-confidence threats.
- [ ] **Evidence Verification Workflow**: Automated hashing and administrative verification for user-submitted proof.
- [ ] **User Authentication & Authorization**: Session/JWT login system for analyst and user accounts.

---

## 3. NOT IMPLEMENTED (Intentionally Excluded)

- ❌ Fake or mock threat score generators claiming active protection when none exists.
- ❌ Mathematical security guarantee mechanisms (forbidden by security principles).
- ❌ Code execution of user-submitted evidence files.
- ❌ Unrelated social networking, chat, payment systems, or advertisement features.

---

## 4. Known Limitations

1. **Threat Intelligence Sources**: Third-party external feeds (Wikipedia & Reddit) are planned for future phases. Current decision engine relies strictly on normalized URL signals, local database records, and community report/evidence history.
2. **MongoDB Connection**: If a local MongoDB daemon is not running, the pipeline runs gracefully with in-memory fallback.
