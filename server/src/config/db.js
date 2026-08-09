const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of hanging indefinitely
    });

    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MongoDB at ${env.mongoUri}: ${error.message}`);
    console.warn(`[Database Warning] Server running with degraded database connectivity.`);
    isConnected = false;
  }
};

const getDBStatus = () => ({
  isConnected,
  uri: env.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Mask credentials if present
});

module.exports = {
  connectDB,
  getDBStatus
};
