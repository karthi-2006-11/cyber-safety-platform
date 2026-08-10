const mongoose = require('mongoose');
const logger = require('./logger');

const User = require('../models/User');
const Website = require('../models/Website');
const UserReport = require('../models/UserReport');
const ThreatInfo = require('../models/ThreatInfo');

/**
 * Initializes and verifies database indexes for production performance and uniqueness constraints.
 */
async function initializeDatabaseIndexes() {
  try {
    logger.info('[Database] Starting database index initialization...');

    // User indexes
    await User.createIndexes();

    // Website indexes
    await Website.createIndexes();

    // UserReport indexes
    await UserReport.createIndexes();

    // ThreatInfo indexes
    await ThreatInfo.createIndexes();

    logger.info('[Database] Database index initialization completed successfully.');
    return { success: true };
  } catch (err) {
    logger.error('[Database] Index initialization failed:', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
}

module.exports = {
  initializeDatabaseIndexes
};
