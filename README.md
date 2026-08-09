# Cyber Safety Platform — Monorepo

> **Core Mission**: *"Build something that has the ability to stop a cybercrime before the user becomes a victim."*

The Cyber Safety Platform is a background protection architecture designed to detect, warn, and block dangerous or high-confidence threat websites before users become victims of cybercrime.

---

## Repository Structure

- [`client/`](file:///d:/mini_project-1(AG)/client) — React 18 + Vite User Dashboard UI.
- [`server/`](file:///d:/mini_project-1(AG)/server) — Node.js + Express.js API backend with Mongoose MongoDB schemas.
- [`extension/`](file:///d:/mini_project-1(AG)/extension) — Chromium Manifest V3 browser protection extension.
- [`shared/`](file:///d:/mini_project-1(AG)/shared) — Shared threat levels (`SAFE`, `SUSPICIOUS`, `HIGH_CONFIDENCE_THREAT`, `UNKNOWN`) and constants.
- [`docs/`](file:///d:/mini_project-1(AG)/docs) — Technical documentation:
  - [`docs/ARCHITECTURE.md`](file:///d:/mini_project-1(AG)/docs/ARCHITECTURE.md)
  - [`docs/RUNNING.md`](file:///d:/mini_project-1(AG)/docs/RUNNING.md)
  - [`docs/STATUS.md`](file:///d:/mini_project-1(AG)/docs/STATUS.md)

---

## Quick Start

### 1. Start Server
```bash
cd server
npm install
npm run dev
```

### 2. Start Client
```bash
cd client
npm install
npm run dev
```

### 3. Load Extension
Load the `extension/` directory into Chrome/Chromium via `chrome://extensions/` (Developer Mode).

---

## Important Security Principles

1. **No Absolute Guarantees**: The system categorizes domains based on evidence into `SAFE`, `SUSPICIOUS`, `HIGH_CONFIDENCE_THREAT`, or `UNKNOWN`.
2. **Zero Fake Threats**: No fake statistical generators or simulated threat alerts.
3. **Environment Security**: All sensitive configurations are managed via `.env` with placeholder defaults in `.env.example`.
