const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const logger = require('./utilities/logger');

async function startServer() {
  // Start HTTP Server Listener immediately
  const server = app.listen(env.port, () => {
    logger.info(`Cyber Safety Platform Server started on port ${env.port} [${env.nodeEnv}]`);
    logger.info(`Health Check endpoint available at: http://localhost:${env.port}/api/v1/health`);
    logger.info(`Liveness probe available at: http://localhost:${env.port}/api/v1/health/liveness`);
    logger.info(`Readiness probe available at: http://localhost:${env.port}/api/v1/health/readiness`);
  });

  // Attempt DB Connection asynchronously
  connectDB().catch(err => logger.warn('DB connection attempt:', err.message));

  // Graceful Shutdown Handlers
  const gracefulShutdown = (signal) => {
    logger.info(`[SHUTDOWN] Received ${signal} signal. Initiating graceful server shutdown...`);
    server.close(async () => {
      logger.info('[SHUTDOWN] HTTP server closed cleanly. Closing database connection...');
      await disconnectDB();
      logger.info('[SHUTDOWN] Graceful shutdown completed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle unhandled exceptions / rejections cleanly
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', { message: err.message, stack: err.stack });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception thrown:', { message: err.message, stack: err.stack });
  });
}

startServer();
