# Cyber Safety Platform — Production Operational Guide

## System Readiness Status

> **PRODUCTION-READY ARCHITECTURE — DEPLOYMENT CONFIGURATION REQUIRED**
>
> *The codebase has completed full reliability, observability, and security hardening (Phase 8) and is architecturally ready for deployment. Actual production deployment still requires configuring secure production secrets, HTTPS, production-grade MongoDB infrastructure, monitoring, backups, and operational deployment settings.*

---

## 1. Environment Variables Configuration

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | `5000` | HTTP listening port for Express API server. |
| `NODE_ENV` | Yes | `production` | Environment mode (`development`, `test`, `production`). |
| `MONGODB_URI` | Yes | `mongodb://127.0.0.1:27017/cyber_safety_db` | Primary MongoDB database connection string. |
| `JWT_SECRET` | Yes | *Strong 32+ char secret* | Secret key for signing JWT user tokens. |
| `JWT_EXPIRES_IN` | No | `24h` | JWT token expiration duration. |
| `CORS_ORIGIN` | Yes | `https://dashboard.cybersafety.org` | Trusted origins for CORS protection. |
| `GOOGLE_WEB_RISK_API_KEY` | Optional | *GCP API Key* | API Key for real-time Google Web Risk threat lookups. |
| `REDDIT_CLIENT_ID` | Optional | *Reddit App ID* | OAuth2 Client ID for Reddit evidence lookups. |
| `REDDIT_CLIENT_SECRET` | Optional | *Reddit App Secret* | OAuth2 Client Secret for Reddit evidence lookups. |

---

## 2. Structured JSON Logging

All server logs are output to stdout/stderr in structured JSON format with redaction:

```json
{
  "timestamp": "2026-08-10T14:15:00.123Z",
  "level": "SECURITY",
  "message": "Report #102 ACTIONED by moderator mod@cybersafety.org. Domain malicious-target.com PROMOTED to HIGH_CONFIDENCE_THREAT",
  "requestId": "req_8f1a2b3c4d5e",
  "context": {
    "reportId": "102",
    "domain": "malicious-target.com",
    "moderator": "mod@cybersafety.org"
  }
}
```

### Sensitive Data Redaction
The logger automatically redacts passwords, password hashes, JWT tokens, cookies, secrets, and API keys with `[REDACTED]`.

---

## 3. Health, Liveness & Readiness Monitoring

- **Basic Health Probe**: `GET /api/v1/health` (Returns uptime, version, and database state).
- **Process Liveness Probe**: `GET /api/v1/health/liveness` (Returns HTTP 200 OK if process is running).
- **Dependency Readiness Probe**: `GET /api/v1/health/readiness` (Returns HTTP 200 OK if MongoDB is connected; returns HTTP 503 if disconnected).

---

## 4. Fail-Safe Behavior Contracts

1. **Google Web Risk Failure**: If API times out or fails, lookup logs a warning and returns `{ matchFound: false, error: 'SERVICE_UNAVAILABLE' }`. Pipeline falls back safely to community reports & local records.
2. **Wikipedia / Reddit Failure**: If APIs fail or return no results, external evidence is omitted without throwing server errors.
3. **Unindexed Site Policy**: Sites not present in database or external APIs return `UNKNOWN` status. They are **never** reported as confirmed `SAFE` or blocked as `HIGH_CONFIDENCE_THREAT`.
