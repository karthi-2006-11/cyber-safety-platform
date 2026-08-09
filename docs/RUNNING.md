# Running the Cyber Safety Platform

This guide outlines setup requirements and execution commands for launching all three major components of the platform.

---

## Environment & Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB** (Optional): Local instance running at `mongodb://127.0.0.1:27017` or remote MongoDB URI in `server/.env`. If MongoDB is not running, the server runs gracefully in fallback mode.
- **Google Web Risk API Key** (Optional): Set `GOOGLE_WEB_RISK_API_KEY=your_key` in `server/.env` for real-time Google threat lookup. If missing, external checks are safely skipped with fallback to local/community signals.

---

## 1. Backend Server (`server/`)

### Setup & Launch
```bash
# Navigate to server directory
cd server

# Environment variables setup
cp .env.example .env

# Install dependencies
npm install

# Run automated tests
npm test

# Start backend in development mode (port 5000)
npm run dev
```

### Verification Endpoints
```bash
# Health Check
curl http://localhost:5000/api/v1/health

# Threat Pipeline Inspection
curl "http://localhost:5000/api/v1/threats/check?domain=example.com"
```

---

## 2. User Dashboard Client (`client/`)

### Setup & Launch
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start client in development mode (port 3000)
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 3. Browser Protection Extension (`extension/`)

### Loading Extension into Chromium Browser

1. Open Chrome/Chromium and navigate to `chrome://extensions/`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `extension/` directory from this project monorepo.
5. Click the Cyber Safety extension icon in your browser toolbar to view the popup interface.

---

## Root Monorepo Commands

From the root directory:
- `npm run dev:server`: Starts Express backend server
- `npm run dev:client`: Starts React dashboard client
- `npm run build:client`: Compiles production assets for client UI
