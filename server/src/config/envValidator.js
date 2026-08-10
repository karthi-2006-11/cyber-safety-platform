/**
 * Environment Configuration Validator — Phase 8 Production Reliability
 */

function validateEnv(envConfig) {
  const missingRequired = [];

  // Required core variables
  if (!envConfig.port) missingRequired.push('PORT');
  if (!envConfig.mongoUri) missingRequired.push('MONGODB_URI');
  if (!envConfig.jwtSecret) missingRequired.push('JWT_SECRET');

  if (missingRequired.length > 0) {
    throw new Error(`CRITICAL ENVIRONMENT CONFIGURATION ERROR: Missing required environment variables: [${missingRequired.join(', ')}]`);
  }

  // Production security checks
  if (envConfig.nodeEnv === 'production') {
    if (envConfig.jwtSecret === 'cyber_safety_jwt_secret_key_2026' || envConfig.jwtSecret === 'dev_secret_key' || envConfig.jwtSecret.length < 16) {
      throw new Error('SECURITY CONFIGURATION ERROR: Production JWT_SECRET must be set to a strong secret key (at least 16 characters).');
    }

    if (envConfig.corsOrigin === '*') {
      console.warn('[SECURITY WARN] CORS_ORIGIN is set to wildcard "*" in production mode. Consider restricting to specific trusted domains.');
    }
  }

  // Optional external service notification warnings
  const missingOptional = [];
  if (!envConfig.googleWebRiskApiKey) missingOptional.push('GOOGLE_WEB_RISK_API_KEY (Google Web Risk threat lookup degraded)');
  if (!envConfig.redditClientId || !envConfig.redditClientSecret) missingOptional.push('REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET (Reddit evidence lookup degraded)');

  return {
    isValid: true,
    missingOptional
  };
}

module.exports = {
  validateEnv
};
