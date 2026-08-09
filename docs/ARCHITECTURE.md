# Cyber Safety Platform — Architecture Document

## Overview

The Cyber Safety Platform is a real-time background protection system designed with a core security mission:
> *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The platform consists of three primary decoupled components:
1. **Browser Extension (`extension/`)**: Manifest V3 background service worker listening to tab navigation, inspecting target domains, querying backend API, and enforcing badge indicators & blocking overlays.
2. **Backend API (`server/`)**: Express.js REST application managing website threat records, user safety reports, evidence persistence, and classification lookups via MongoDB.
3. **User Dashboard (`client/`)**: Modern React interface allowing users to inspect domain threat decisions, submit safety feedback with supporting proof, and view system status.

---

## Threat Analysis Pipeline (Phase 2 Architecture)

```
Requested URL / Domain Input
            ↓
  [ Stage 1: URL Normalizer & Validator ]  (Strips ports, paths, schemes; rejects malformed inputs)
            ↓
  [ Stage 2: Local Reputation Evaluator ] (Queries Website & ThreatInfo Mongoose models)
            ↓
  [ Stage 3: Community Report Evaluator ] (Queries UserReport & Evidence models; status weights)
            ↓
  [ Stage 4: Risk Signal Calculator ]      (Aggregates signals, calculates confidence & risk level)
            ↓
  [ Stage 5: Explainable Decision Response ]
      { domain, classification, riskLevel, confidence, reasons, evidence, reports, analyzedAt }
```

### Risk Calculation & Classification Policy

- **No 100% Certainty**: Classifications are probability-based confidence decisions.
- **Classification Categories**:
  - `SAFE`: Verified clean records with no suspicious indicators.
  - `SUSPICIOUS`: Domain exhibits deceptive indicators or pending community reports.
  - `HIGH_CONFIDENCE_THREAT`: Confirmed high-confidence threat backed by official records or verified actioned reports.
  - `UNKNOWN`: Default when no threat indicators or community evidence exist.
- **Risk Levels**: `NONE`, `LOW`, `MEDIUM`, `HIGH`.
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
│   ├── src/pipeline/ # Threat Analysis Pipeline (Normalizer, Reputation, Community Reports, Risk Calculator)
│   └── tests/        # Automated test suite
├── extension/        # Chromium Manifest V3 protection extension
├── shared/           # Shared status enums, risk levels, and constants
└── docs/             # Technical architecture & project documentation
```
