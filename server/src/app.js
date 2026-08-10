const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const threatRoutes = require('./routes/threat.routes');
const reportRoutes = require('./routes/report.routes');
const moderationRoutes = require('./routes/moderation.routes');
const authRoutes = require('./routes/auth.routes');
const { requestIdMiddleware } = require('./middleware/requestId');
const { nosqlSanitizer } = require('./middleware/nosqlSanitizer');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// 1. Request Traceability Middleware
app.use(requestIdMiddleware);

// 2. Helmet Security Headers (Production Hardening)
app.use(helmet({
  contentSecurityPolicy: env.nodeEnv === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  noSniff: true
}));

// 3. Strict CORS origin handling
app.use(cors({
  origin: env.corsOrigin === '*' ? '*' : env.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID']
}));

// 4. Request Body Limiters & NoSQL Injection Protection
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(nosqlSanitizer);

// 5. API Route Mount Points
app.use('/api/v1', healthRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', threatRoutes);
app.use('/api/v1', reportRoutes);
app.use('/api/v1', moderationRoutes);

// 6. Handling unmapped routes and central errors
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
