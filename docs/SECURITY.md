# Cyber Safety Platform — Final Security Review & Architecture Audit

This document addresses the 10 core security evaluation questions for the Cyber Safety Platform.

---

### Question 1: Can an unauthenticated user become ADMIN?
**NO.**
Public registration (`POST /api/v1/auth/register`) unconditionally assigns `role: 'USER'`. Any client-provided `role`, `x-user-role`, or `x-user-id` parameters are ignored. Role escalation is restricted to `POST /api/v1/auth/promote-user`, which requires a valid JWT with `role: 'ADMIN'`.

---

### Question 2: Can a USER access moderator endpoints?
**NO.**
All moderation routes (`/api/v1/moderation/*`) are protected by `requireAuth` and `requireRole('MODERATOR', 'ADMIN')`. Normal `USER` tokens receive HTTP `403 Forbidden`.

---

### Question 3: Can a client spoof a role?
**NO.**
The server is the sole source of truth for authorization. `authMiddleware.requireAuth` explicitly strips any client-provided `x-user-role` headers before validating JWT signatures and database records.

---

### Question 4: Can a webpage manipulate DNR rules?
**NO.**
DNR dynamic blocking rules are managed exclusively inside the Manifest V3 Extension background service worker via Chrome API (`chrome.declarativeNetRequest.updateDynamicRules`). Untrusted webpages cannot invoke extension APIs or modify dynamic rules.

---

### Question 5: Can API credentials reach the browser or extension?
**NO.**
Google Web Risk, Reddit, and JWT secret keys reside strictly on the Node.js server environment. The browser extension only interacts with `GET /api/v1/threats/high-confidence` and `/api/v1/threats/check`, which expose zero API keys or secrets.

---

### Question 6: Can external API failure incorrectly classify a site as SAFE?
**NO.**
The threat pipeline explicitly separates `SAFE`, `SUSPICIOUS`, `HIGH_CONFIDENCE_THREAT`, and `UNKNOWN` / `UNAVAILABLE`. External service failures return `UNKNOWN` / `UNAVAILABLE` and never convert unknown sites to confirmed `SAFE`.

---

### Question 7: Can malformed input reach MongoDB unsafely?
**NO.**
The `nosqlSanitizer` middleware strips any keys starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params`, neutralizing NoSQL operator injection. Mongoose schemas further enforce strict type validation.

---

### Question 8: Can passwords, tokens, or API keys appear in logs?
**NO.**
The `logger.js` utility uses `redactSensitiveData()` to scan log payloads recursively, replacing any sensitive keys (`password`, `passwordHash`, `token`, `secret`, `authorization`, API keys) with `'[REDACTED]'`.

---

### Question 9: Can an attacker flood report or login endpoints?
**NO.**
Endpoints are guarded by rate limiters (`createRateLimiter`):
- `/auth/login` & `/auth/register`: 10 requests/min per IP.
- `/reports`: 15 requests/min per IP.
- Body parser limits payload size to `100kb`.

---

### Question 10: Can the server crash from an external dependency failure?
**NO.**
All external intelligence lookups (Google Web Risk, Reddit, Wikipedia) and database operations are wrapped in try/catch blocks with fallback handlers. Unhandled promise rejections and uncaught exceptions are caught by global process error handlers.
