# Cyber Safety Platform — Production Deployment Guide

## Deployment Architecture

```
                       [ Internet Users / Chrome Browser ]
                                      │
                        (HTTPS / Web Navigation / DNR)
                                      ▼
                      ┌───────────────┴──────────────┐
                      │    Reverse Proxy / Ingress   │
                      │    (Nginx / Cloud Load Balancer)│
                      └───────────────┬──────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌─────────────────────────┐                         ┌─────────────────────────┐
│ React 18 Dashboard App  │                         │ Express 4 Node.js API   │
│ (Static HTML/CSS/JS)    │                         │ (Port 5000)             │
└─────────────────────────┘                         └────────────┬────────────┘
                                                                 │
                                                    ┌────────────┴────────────┐
                                                    ▼                         ▼
                                         ┌────────────────────┐    ┌─────────────────────┐
                                         │ MongoDB Database   │    │ Google Web Risk /   │
                                         │ (Replica Set)      │    │ Reddit APIs         │
                                         └────────────────────┘    └─────────────────────┘
```

---

## 1. Process Management (PM2 Configuration)

Create `ecosystem.config.js` for Node.js process management:

```javascript
module.exports = {
  apps: [{
    name: 'cyber-safety-server',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

Run with PM2:
```bash
pm2 start ecosystem.config.js --env production
```

---

## 2. Docker Deployment

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 5000
USER node
CMD ["node", "src/index.js"]
```

---

## 3. Database Maintenance & Indexing

Ensure the following indexes exist in MongoDB:

```js
db.users.createIndex({ email: 1 }, { unique: true });
db.websites.createIndex({ domain: 1 }, { unique: true });
db.userreports.createIndex({ domain: 1 });
db.userreports.createIndex({ status: 1, createdAt: -1 });
db.threatinfos.createIndex({ websiteId: 1 });
```
