const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utilities/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });

    isConnected = true;
    logger.info(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);

    // Initialize database indexes safely
    const { initializeDatabaseIndexes } = require('../utilities/initIndexes');
    initializeDatabaseIndexes().catch(err => {
      logger.warn('[Database] Index auto-initialization deferred:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('[Database] MongoDB connection lost.');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('[Database] MongoDB connection re-established.');
    });
  } catch (error) {
    logger.warn(`[Database Warning] Could not connect to MongoDB at ${env.mongoUri}: ${error.message}`);
    logger.warn('[Database Warning] Server running in degraded mode with memory fallbacks.');
    isConnected = false;
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('[Database] MongoDB connection closed gracefully.');
  }
};

const getDBStatus = () => ({
  isConnected,
  uri: env.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
});

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus
};
