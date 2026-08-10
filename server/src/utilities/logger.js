/**
 * Structured Production Logger & Security Audit Logger — Phase 8 Observability
 */
const env = require('../config/env');

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'jwt',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'key',
  'clientsecret'
];

/**
 * Recursively redacts sensitive keys from log objects.
 */
function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function formatLog(level, message, context = {}, requestId = null) {
  const timestamp = new Date().toISOString();
  const safeContext = redactSensitiveData(context);

  const logPayload = {
    timestamp,
    level,
    message,
    ...(requestId ? { requestId } : {}),
    ...(Object.keys(safeContext).length > 0 ? { context: safeContext } : {})
  };

  return JSON.stringify(logPayload);
}

const logger = {
  info: (message, context = {}, requestId = null) => {
    if (env.nodeEnv !== 'test') {
      console.log(formatLog('INFO', message, context, requestId));
    }
  },
  warn: (message, context = {}, requestId = null) => {
    if (env.nodeEnv !== 'test') {
      console.warn(formatLog('WARN', message, context, requestId));
    }
  },
  error: (message, context = {}, requestId = null) => {
    if (env.nodeEnv !== 'test') {
      console.error(formatLog('ERROR', message, context, requestId));
    }
  },
  security: (message, context = {}, requestId = null) => {
    if (env.nodeEnv !== 'test') {
      console.warn(formatLog('SECURITY', message, context, requestId));
    }
  },
  redactSensitiveData
};

module.exports = logger;
