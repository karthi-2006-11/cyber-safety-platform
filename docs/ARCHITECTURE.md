# Cyber Safety Platform — Architecture Document

## Overview

The Cyber Safety Platform is a real-time background protection system designed with a core security mission:
> *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The platform consists of three primary decoupled components:
1. **Browser Extension (`extension/`)**: Manifest V3 background service worker listening to tab navigation, inspecting target domains, querying backend API, and enforcing badge indicators & blocking overlays.
2. **Backend API (`server/`)**: Express.js REST application managing website threat records, user safety reports, evidence persistence, and classification lookups via MongoDB.
3. **User Dashboard (`client/`)**: Modern React interface allowing users to inspect domain threat decisions, submit safety feedback with supporting proof, and view system status.

---

## Data Model & Classification Policy

### Classification Terminology

In accordance with strict security principles, the system **never mathematically guarantees 100% security or vulnerability**. Domain status classifications are strictly categorized into:

- `SAFE`: Analyzed domain with low risk indicators.
- `SUSPICIOUS`: Domain exhibiting deceptive or warning attributes; user advised to proceed with caution.
- `HIGH_CONFIDENCE_THREAT`: Confirmed high-confidence threat based on strong evidence; auto-blocked according to policy.
- `UNKNOWN`: Default status when insufficient or no threat evidence exists.

### Primary Entities Foundation

- **User**: Represents user accounts and analyst roles (`email`, `role`, `createdAt`).
- **Website**: Represents domain records and current threat state (`domain`, `currentStatus`, `lastAnalyzedAt`).
- **ThreatInfo**: Stores category-specific threat metrics (`websiteId`, `category`, `confidenceScore`, `summary`).
- **UserReport**: Stores community feedback and reported issues (`websiteId`, `domain`, `category`, `description`, `status`).
- **Evidence**: Stores supporting proof references for user reports and threat decisions (`reportId`, `websiteId`, `type`, `content`, `isVerified`).

---

## Component Separation

```
project-root/
├── client/           # User dashboard (React 18 + Vite)
├── server/           # Backend REST API (Node.js + Express + Mongoose)
├── extension/        # Chromium Manifest V3 protection extension
├── shared/           # Shared status enums and constants
└── docs/             # Technical architecture & project documentation
```
