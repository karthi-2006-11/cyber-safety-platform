# Cyber Safety Platform — Architecture Document

## Overview

The Cyber Safety Platform is a real-time background protection system designed with a core security mission:
> *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The platform consists of three primary decoupled components:
1. **Browser Extension (`extension/`)**: Manifest V3 background service worker listening to tab navigation, inspecting target domains, querying backend API, and enforcing badge indicators & blocking overlays.
2. **Backend API (`server/`)**: Express.js REST application managing website threat records, user safety reports, evidence persistence, external threat intelligence, and classification lookups via MongoDB.
3. **User Dashboard (`client/`)**: Modern React interface allowing users to inspect domain threat decisions, submit safety feedback with supporting proof, and view system status.

---

## 5-Stage Threat Analysis Pipeline (Phase 3 Architecture)

```
Requested URL / Domain Input
            ↓
  [ Stage 1: URL Normalizer & Validator ]  (Strips ports, paths, schemes; validates format)
            ↓
  [ Stage 2: Local Reputation Evaluator ] (Queries Website & ThreatInfo Mongoose models)
            ↓
  [ Stage 3: External Threat Intelligence ]  (Google Web Risk Lookup API + Server TTL Cache)
            ↓
  [ Stage 4: Community Report Evaluator ] (Queries UserReport & Evidence models; status weights)
            ↓
  [ Stage 5: Risk Signal Calculator ]      (Aggregates signals, calculates confidence & risk level)
            ↓
  [ Explainable Decision Response ]
      { domain, classification, riskLevel, confidence, reasons, evidence, reports, analyzedAt }
```

### Risk Calculation & Classification Policy

- **No 100% Certainty**: Classifications are probability-based confidence decisions.
- **Classification Categories**:
  - `SAFE`: Verified clean records with no suspicious indicators.
  - `SUSPICIOUS`: Domain exhibits deceptive indicators or pending community reports.
  - `HIGH_CONFIDENCE_THREAT`: Confirmed high-confidence threat backed by official records, Google Web Risk API threat match, or verified actioned reports.
  - `UNKNOWN`: Default when no threat indicators or community evidence exist.
- **Risk Levels**: `NONE`, `LOW`, `MEDIUM`, `HIGH`.
- **Google Web Risk Integration**:
  - Target Threat Types: `MALWARE`, `SOCIAL_ENGINEERING`, `UNWANTED_SOFTWARE`.
  - Signal Severity: `CRITICAL` / `HIGH` (Weight: 85–90). Elevates decision to `HIGH_CONFIDENCE_THREAT`.
  - Server Caching: Positive lookup results cached in-memory with a 30-minute TTL to respect API quotas. API errors are never cached.
  - Graceful Fallback: If `GOOGLE_WEB_RISK_API_KEY` is missing or the remote API fails/times out, the pipeline proceeds safely using local database and community signals without crashing.
- **Community Report Weights**:
  - `REJECTED`: Assigned 0 weight; excluded from risk elevation.
  - `PENDING`: Assigned low/medium severity weight. Single unverified pending report does NOT trigger `HIGH_CONFIDENCE_THREAT`.
  - `ACTIONED`: Assigned high threat weight.

---

## Component Separation

```
project-root/
├── client/           # User dashboard (React 18 + Vite)
├── server/           # Backend REST API (Node.js + Express + Mongoose)
│   ├── src/pipeline/ # Threat Analysis Pipeline (Normalizer, Reputation, WebRisk, Community Reports, Risk Calculator)
│   ├── src/services/ # WebRisk API Service & Business Services
│   └── tests/        # Automated test suite (pipeline & webRisk tests)
├── extension/        # Chromium Manifest V3 protection extension
├── shared/           # Shared status enums, risk levels, and constants
└── docs/             # Technical architecture & project documentation
```
