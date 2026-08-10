# Cyber Safety Platform — Architecture Document

## Overview

The Cyber Safety Platform is a real-time background protection system designed with a core security mission:
> *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The platform consists of four primary decoupled components:
1. **Browser Extension (`extension/`)**: Chromium Manifest V3 background service worker listening to navigation, querying backend threat API, managing dynamic `declarativeNetRequest` rules, rendering warning banners, and serving an isolated extension block page (`blocked.html`).
2. **Threat Analysis Engine (`server/src/pipeline/`)**: Decoupled 6-stage evaluation pipeline combining URL normalization, local reputation records, Google Web Risk API threat intelligence, community user reports, Wikipedia/Reddit public evidence, and explainable risk calculation.
3. **Community Intelligence & Moderation (`server/src/services/report.service.js`)**: Anonymized reporter tracking (`independentReporterCount`), multi-evidence attachment, duplicate report filtering, and JWT RBAC-protected moderator workflow.
4. **Production Security & Auth System (`server/src/middleware/authMiddleware.js`)**: Server-side JWT authentication, `bcrypt` password hashing, role-based access control (`USER`, `MODERATOR`, `ADMIN`), rate limiting, and report ownership isolation.
5. **User & Moderator Dashboard (`client/`)**: Modern React 18 + Vite interface with dark glassmorphism UI for inspecting threats, submitting community reports, managing user authentication, and actioning pending threats.

---

## Production Security & Authentication Architecture (Phase 7)

```
Client Request
      ↓
  [ Bearer JWT Token in Authorization Header ]
      ↓
  [ authMiddleware.requireAuth ] ──(If missing/invalid)──► HTTP 401 Unauthorized
      ↓
  [ Decodes & Verifies JWT Signature (JWT_SECRET) ]
      ↓
  [ Validates User Account in MongoDB (isActive !== false) ]
      ↓
  [ Attaches Trusted User Identity: req.user = { id, email, role } ]
      ↓ (Strips any client-spoofed x-user-role headers)
  [ authMiddleware.requireRole('MODERATOR', 'ADMIN') ] ──(If req.user.role !== MODERATOR)──► HTTP 403 Forbidden
      ↓
  [ Execute Protected Controller Action with Moderator Audit Trail ]
```

### Security Safeguards
- **Removal of Header Vulnerability**: Client-supplied `x-user-role` headers are explicitly deleted and ignored by server middleware. Authorization is strictly bound to server-verified JWT claims and user database records.
- **Password Hashing**: Passwords are hashed with `bcrypt` (cost factor 10). Password hashes are specified with `select: false` in Mongoose models and JSON output transforms, ensuring hashes are never exposed in API responses or logs.
- **Generic Auth Errors**: Login failures return generic `401 Invalid email or password` errors to prevent email enumeration.
- **Report Ownership Isolation**: `GET /api/v1/reports/my-reports` derives user identity strictly from `req.user.id`. Client query overrides (`?userId=...`) are ignored.
- **Public Extension Endpoint**: `GET /api/v1/threats/high-confidence` remains a public read-only endpoint returning non-sensitive domain strings for extension DNR dynamic rule synchronization without embedding secret keys in extension code.

---

## 6-Stage Threat Analysis Pipeline

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
