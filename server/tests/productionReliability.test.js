const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../src/config/envValidator');
const logger = require('../src/utilities/logger');
const { requestIdMiddleware } = require('../src/middleware/requestId');
const { nosqlSanitizer } = require('../src/middleware/nosqlSanitizer');
const { errorHandler, notFoundHandler } = require('../src/middleware/errorHandler');
const { getHealth, getLiveness, getReadiness } = require('../src/controllers/health.controller');
const { createRateLimiter } = require('../src/middleware/rateLimiter');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const { THREAT_LEVELS } = require('../../shared/constants');

test('1. validateEnv() — Accepts Valid Configuration', () => {
  const valid = { port: 5000, mongoUri: 'mongodb://localhost:27017/test', jwtSecret: 'super_secret_key_123' };
  const res = validateEnv(valid);
  assert.equal(res.isValid, true);
});

test('2. validateEnv() — Throws Error when Required Env Var Missing', () => {
  const invalid = { port: 5000, mongoUri: '', jwtSecret: 'secret' };
  assert.throws(() => validateEnv(invalid), /CRITICAL ENVIRONMENT CONFIGURATION ERROR/);
});

test('3. validateEnv() — Production Mode Enforces Strong JWT_SECRET', () => {
  const weakProd = { nodeEnv: 'production', port: 5000, mongoUri: 'mongodb://local', jwtSecret: 'dev_secret_key' };
  assert.throws(() => validateEnv(weakProd), /SECURITY CONFIGURATION ERROR/);
});

test('4. validateEnv() — Gracefully Identifies Missing Optional Keys', () => {
  const validNoOptional = { port: 5000, mongoUri: 'mongodb://localhost', jwtSecret: 'valid_secret_123456789' };
  const res = validateEnv(validNoOptional);
  assert.equal(res.isValid, true);
  assert.ok(res.missingOptional.length >= 2);
});

test('5. logger.redactSensitiveData() — Redacts Passwords, Hashes, and Tokens', () => {
  const sensitive = {
    email: 'user@test.com',
    password: 'PlaintextPassword123!',
    passwordHash: '$2b$10$abcdef',
    token: 'jwt.bearer.token',
    nested: { secretKey: 'supersecret' }
  };

  const clean = logger.redactSensitiveData(sensitive);
  assert.equal(clean.email, 'user@test.com');
  assert.equal(clean.password, '[REDACTED]');
  assert.equal(clean.passwordHash, '[REDACTED]');
  assert.equal(clean.token, '[REDACTED]');
  assert.equal(clean.nested.secretKey, '[REDACTED]');
});

test('6. logger.redactSensitiveData() — Preserves Safe Context Fields', () => {
  const safeData = { domain: 'example.com', category: 'PHISHING', count: 5 };
  const clean = logger.redactSensitiveData(safeData);
  assert.deepEqual(clean, safeData);
});

test('7. requestIdMiddleware — Generates Unique Request ID & Response Header', () => {
  const req = { headers: {} };
  let headerSet = null;
  const res = { setHeader: (k, v) => { headerSet = { [k]: v }; } };

  requestIdMiddleware(req, res, () => {});

  assert.ok(req.id.startsWith('req_'));
  assert.equal(headerSet['X-Request-ID'], req.id);
});

test('8. requestIdMiddleware — Preserves Incoming X-Request-ID Header', () => {
  const req = { headers: { 'x-request-id': 'custom_req_999' } };
  let headerSet = null;
  const res = { setHeader: (k, v) => { headerSet = { [k]: v }; } };

  requestIdMiddleware(req, res, () => {});

  assert.equal(req.id, 'custom_req_999');
  assert.equal(headerSet['X-Request-ID'], 'custom_req_999');
});

test('9. nosqlSanitizer — Strips Malicious $ Mongo Operators from Body', () => {
  const req = {
    body: {
      email: { '$gt': '' },
      password: 'Password123!',
      validField: 'safe'
    }
  };

  nosqlSanitizer(req, {}, () => {});

  assert.equal(req.body.email.$gt, undefined);
  assert.equal(req.body.validField, 'safe');
});

test('10. nosqlSanitizer — Strips Malicious Dot Operators from Query', () => {
  const req = {
    query: {
      'user.role': 'ADMIN',
      normalKey: 'value'
    }
  };

  nosqlSanitizer(req, {}, () => {});

  assert.equal(req.query['user.role'], undefined);
  assert.equal(req.query.normalKey, 'value');
});

test('11. errorHandler — Formats Standard Error Response with Request ID', () => {
  const req = { id: 'req_test_123', method: 'GET', originalUrl: '/api/v1/test' };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  const err = new Error('Test Failure');
  errorHandler(err, req, res, () => {});

  assert.equal(statusCode, 500);
  assert.equal(responseData.success, false);
  assert.equal(responseData.requestId, 'req_test_123');
});

test('12. errorHandler — Maps Mongoose CastError to HTTP 400', () => {
  const req = { id: 'req_123', method: 'GET', originalUrl: '/test' };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  const err = new Error('Cast Error');
  err.name = 'CastError';
  errorHandler(err, req, res, () => {});

  assert.equal(statusCode, 400);
  assert.equal(responseData.error, 'INVALID_ID_FORMAT');
});

test('13. notFoundHandler — Formats HTTP 404 Response with Request ID', () => {
  const req = { id: 'req_404', method: 'POST', originalUrl: '/api/v1/unknown' };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  notFoundHandler(req, res);

  assert.equal(statusCode, 404);
  assert.equal(responseData.error, 'NOT_FOUND');
  assert.equal(responseData.requestId, 'req_404');
});

test('14. GET /api/v1/health — Returns ONLINE Status and Uptime', () => {
  const req = { id: 'req_health' };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  getHealth(req, res);

  assert.equal(statusCode, 200);
  assert.equal(responseData.status, 'ONLINE');
  assert.ok(typeof responseData.uptimeSeconds === 'number');
});

test('15. GET /api/v1/health/liveness — Returns HTTP 200 ALIVE', () => {
  const req = { id: 'req_live' };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  getLiveness(req, res);

  assert.equal(statusCode, 200);
  assert.equal(responseData.status, 'ALIVE');
});

test('16. GET /api/v1/health/readiness — Evaluates MongoDB Status', () => {
  const req = { id: 'req_ready' };
  let statusCode = 0;
  let responseData = null;

  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  getReadiness(req, res);

  assert.ok(statusCode === 200 || statusCode === 503);
  assert.ok(responseData.status === 'READY' || responseData.status === 'NOT_READY');
});

test('17. Granular Rate Limiting Protection (HTTP 429)', () => {
  const limiter = createRateLimiter({ name: 'test_limit', windowMs: 60000, maxRequests: 2 });
  const req = { ip: '10.0.0.1', headers: {}, id: 'req_limit' };

  let statusCode = 0;
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (d) => res
  };

  limiter(req, res, () => {});
  limiter(req, res, () => {});
  limiter(req, res, () => {}); // 3rd request exceeds limit

  assert.equal(statusCode, 429);
});

test('18. External Intelligence API Failure Does Not Return SAFE (Fail-Safe Contract)', () => {
  const reputation = { isIndexed: false, status: THREAT_LEVELS.UNKNOWN };
  const webRiskData = { matchFound: false, error: 'SERVICE_UNAVAILABLE' };
  const communityData = { actionedReportCount: 0, pendingReportCount: 0, verifiedReportCount: 0 };
  const wikipediaData = { evidence: [] };
  const redditData = { evidence: [] };

  const decision = calculateRisk('unindexed-test.com', reputation, webRiskData, communityData, wikipediaData, redditData);

  assert.notEqual(decision.classification, THREAT_LEVELS.SAFE);
  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
});

test('19. HIGH_CONFIDENCE_THREAT Promotion Triggers Dynamic DNR Rule Contract', async () => {
  globalThis.mockDnrRules = [];
  globalThis.chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://mock_id/${path}`
    },
    declarativeNetRequest: {
      getDynamicRules: async () => globalThis.mockDnrRules,
      updateDynamicRules: async ({ addRules, removeRuleIds }) => {
        if (removeRuleIds) {
          globalThis.mockDnrRules = globalThis.mockDnrRules.filter(r => !removeRuleIds.includes(r.id));
        }
        if (addRules) {
          globalThis.mockDnrRules.push(...addRules);
        }
      }
    }
  };

  const { addBlockRule } = require('../../extension/ruleManager');

  const success = await addBlockRule('malicious-p8-test.com', { classification: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT });
  assert.equal(success, true);
  assert.equal(globalThis.mockDnrRules.length, 1);
});

test('20. SUSPICIOUS Domain Returns Warning Contract', () => {
  const reputation = { isIndexed: false, status: THREAT_LEVELS.UNKNOWN };
  const webRiskData = { matchFound: false };
  const communityData = { actionedReportCount: 0, pendingReportsCount: 2, independentReporterCount: 2 };
  const wikipediaData = { evidence: [] };
  const redditData = { evidence: [] };

  const decision = calculateRisk('suspicious-p8-test.com', reputation, webRiskData, communityData, wikipediaData, redditData);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, 'MEDIUM');
});
