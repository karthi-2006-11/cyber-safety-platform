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
- Auth Registration: `POST http://localhost:5000/api/v1/auth/register`
- Auth Login: `POST http://localhost:5000/api/v1/auth/login`
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
Executes all 87 automated unit & security tests across 8 test files:
- `tests/pipeline.test.js`
- `tests/webRisk.test.js`
- `tests/wikipedia.test.js`
- `tests/reddit.test.js`
- `tests/combinedEvidence.test.js`
- `tests/extensionIntegration.test.js`
- `tests/communityIntelligence.test.js`
- `tests/authAndSecurity.test.js`

---

## 4. Manual Verification Procedure

### A. Authentication & Registration
1. Open User Dashboard (`http://localhost:3000`).
2. Click **Sign In / Register** in header.
3. Register a normal user account `user@local` with role `USER`.
4. Register a moderator account `mod@local` with role `MODERATOR`.

### B. Report Submission & Ownership Isolation
1. Authenticate as `user@local`.
2. Navigate to **Community Reports** tab and submit report for `test-domain.com`.
3. View **My Submitted Reports** table. Verify only `user@local` reports are shown.

### C. RBAC Authorization & Header Spoofing Protection
1. Send request to `POST /api/v1/moderation/reports/:id/action` as `USER` or with spoofed `x-user-role: MODERATOR` without token.
2. Verify server returns `401 Unauthorized` or `403 Forbidden`.

### D. Moderator Actioning & Extension Sync
1. Authenticate as `mod@local` (role `MODERATOR`).
2. Navigate to **Moderator Portal** tab.
3. Click **Action & Promote Threat** on pending report.
4. Verify domain is promoted to `HIGH_CONFIDENCE_THREAT`.
5. Verify `GET /api/v1/threats/high-confidence` returns domain.
6. Extension pre-syncs domain and installs dynamic DNR blocking rule.
