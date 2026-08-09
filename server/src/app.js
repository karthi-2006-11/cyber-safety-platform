const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const threatRoutes = require('./routes/threat.routes');
const reportRoutes = require('./routes/report.routes');
const moderationRoutes = require('./routes/moderation.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Security and middleware setup
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Route Mount Points
app.use('/api/v1', healthRoutes);
app.use('/api/v1', threatRoutes);
app.use('/api/v1', reportRoutes);
app.use('/api/v1', moderationRoutes);

// Handling unmapped routes and central errors
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
