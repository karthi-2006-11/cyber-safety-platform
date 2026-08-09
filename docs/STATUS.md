# Cyber Safety Platform — Status & Roadmap

This document outlines the current status of features, planned work, and known limitations in accordance with phase 1 project instructions.

---

## 1. IMPLEMENTED (Phase 1 Foundation)

- [x] **Monorepo Architecture**: Clean separation between `client/`, `server/`, `extension/`, `shared/`, and `docs/`.
- [x] **Express Backend API Foundation**: Clean directory separation (routes, controllers, services, models, middleware, config, utilities).
- [x] **MongoDB Schema Foundation**: Minimal Mongoose entity schemas for `User`, `Website`, `ThreatInfo`, `UserReport`, and `Evidence`.
- [x] **Environment Configuration**: `.env.example` and `.env` setup using `dotenv`. Zero hardcoded credentials.
- [x] **Browser Extension Architecture**: Chromium Manifest V3 service worker (`background.js`), action popup UI (`popup.html`/`popup.js`), and content script listener stub (`content.js`).
- [x] **User Dashboard UI**: React 18 + Vite frontend with dark cyber design system, status indicator, domain check component, report submission modal, and empty state table.
- [x] **Classification Terminology Enforcement**: Restricted strictly to `SAFE`, `SUSPICIOUS`, `HIGH_CONFIDENCE_THREAT`, `UNKNOWN`.
- [x] **Input Validation & Normalization**: Sanitization and domain extraction middleware (`urlHelper.js`, `validateInput.js`).
- [x] **Git Repository Configuration**: Clean `.gitignore` masking `.env`, `node_modules`, build artifacts, and logs.

---

## 2. PLANNED (Future Implementation Phases)

- [ ] **Automated Threat Detection Engine**: Dynamic analysis algorithms for analyzing domain risk parameters.
- [ ] **Automated Blocking Execution**: Declarative blocking overlays or net request rules for high-confidence threats.
- [ ] **Wikipedia Integration**: Ingesting public background evidence for domain history.
- [ ] **Reddit Community Integration**: Ingesting community discussion evidence regarding reported domains.
- [ ] **Evidence Verification Workflow**: Automated hashing and administrative verification for user-submitted proof.
- [ ] **User Authentication & Authorization**: Session/JWT login system for analyst and user accounts.

---

## 3. NOT IMPLEMENTED (Intentionally Excluded in Phase 1)

- ❌ Fake or mock threat score generators claiming active protection when none exists.
- ❌ Mathematical security guarantee mechanisms (explicitly forbidden by security principles).
- ❌ Code execution of user-submitted evidence files.
- ❌ Unrelated social networking, chat, payment systems, or advertisement features.

---

## 4. Known Limitations

1. **Phase 1 Threat Data**: In this initial phase, domain threat check queries default to `UNKNOWN` status unless a record has been manually populated into the MongoDB database or submitted via report.
2. **MongoDB Connection**: If a local MongoDB daemon is not currently running, the server operates cleanly with in-memory fallback for user reports and health endpoints.
