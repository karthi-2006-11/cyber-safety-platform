const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./utilities/logger');

async function startServer() {
  // Start HTTP Server Listener immediately
  const server = app.listen(env.port, () => {
    logger.info(`Cyber Safety Platform Server started on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health Check endpoint available at: http://localhost:${env.port}/api/v1/health`);
  });

  // Attempt DB Connection asynchronously without blocking HTTP listener
  connectDB().catch(err => logger.warn('DB connection attempt:', err.message));

  // Handle unhandled exceptions / rejections cleanly
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err.message);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception thrown:', err.message);
  });
}

startServer();
