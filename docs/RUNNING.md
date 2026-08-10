# Cyber Safety Platform — Execution & Deployment Guide

## 1. Quick Start (Development Mode)

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB (local or MongoDB Atlas M0 string)

### Local Development Setup
```bash
# 1. Install server dependencies
cd server
npm install

# 2. Start backend API daemon (Port 5000)
npm run dev

# 3. Install client dependencies (in new terminal)
cd ../client
npm install

# 4. Start frontend React dashboard (Port 3000)
npm run dev
```

---

## 2. Production Build & Execution

### Backend API Production Server
```bash
cd server
NODE_ENV=production PORT=5000 JWT_SECRET=your_super_strong_secret_12345 MONGODB_URI=mongodb+srv://... node src/index.js
```

### Frontend React Production Build
```bash
cd client
VITE_API_BASE_URL=https://api.cybersafety.org npm run build
```
Static assets will be output to `client/dist/`.

---

## 3. Browser Extension Production Configuration

1. Open `extension/config.js`.
2. Set `ENVIRONMENT: 'production'` to point the extension to `https://api.cybersafety.org`.
3. To package the extension for local developer mode or enterprise distribution:
```bash
# Zip extension directory
zip -r cyber-safety-extension.zip extension/ -x "*.git*"
```
4. Load into Chrome via `chrome://extensions` -> "Load unpacked" -> Select `extension/` directory.

---

## 4. Automated Testing
```bash
cd server
npm test
```
Executes all 115+ automated test cases covering risk engine, security, JWT RBAC, DNR blocking, and production audit checks.
