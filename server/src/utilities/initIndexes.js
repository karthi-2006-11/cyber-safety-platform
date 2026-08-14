const mongoose = require('mongoose');
const logger = require('./logger');
const { hashPassword } = require('./auth');

const User = require('../models/User');
const Website = require('../models/Website');
const UserReport = require('../models/UserReport');
const ThreatInfo = require('../models/ThreatInfo');

/**
 * Seeds or promotes default test accounts with proper server-enforced roles.
 */
async function seedDefaultAccounts() {
  try {
    const defaultAccounts = [
      {
        email: 'user@cybersafety.local',
        name: 'Standard User Account',
        role: 'USER',
        password: 'Password123!'
      },
      {
        email: 'mod@cybersafety.local',
        name: 'Moderator Account',
        role: 'MODERATOR',
        password: 'Password123!'
      },
      {
        email: 'admin@cybersafety.local',
        name: 'Administrator Account',
        role: 'ADMIN',
        password: 'Password123!'
      }
    ];

    for (const acc of defaultAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        const passwordHash = await hashPassword(acc.password);
        user = await User.create({
          email: acc.email,
          passwordHash,
          name: acc.name,
          role: acc.role,
          isActive: true
        });
        logger.info(`[Database Seed] Created default account ${acc.email} with role ${acc.role}`);
      } else if (user.role !== acc.role) {
        user.role = acc.role;
        await user.save();
        logger.info(`[Database Seed] Updated default account ${acc.email} role to ${acc.role}`);
      }
    }
  } catch (err) {
    logger.warn('[Database Seed] Default accounts seed deferred:', err.message);
  }
}

/**
 * Initializes and verifies database indexes for production performance and uniqueness constraints.
 * Also seeds/verifies default roles for test accounts.
 */
async function initializeDatabaseIndexes() {
  try {
    logger.info('[Database] Starting database index initialization & seeding...');

    // User indexes
    await User.createIndexes();

    // Website indexes
    await Website.createIndexes();

    // UserReport indexes
    await UserReport.createIndexes();

    // ThreatInfo indexes
    await ThreatInfo.createIndexes();

    // Seed/Promote default roles
    await seedDefaultAccounts();

    logger.info('[Database] Database index initialization & seeding completed successfully.');
    return { success: true };
  } catch (err) {
    logger.error('[Database] Index initialization failed:', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  }
}

module.exports = {
  initializeDatabaseIndexes,
  seedDefaultAccounts
};
