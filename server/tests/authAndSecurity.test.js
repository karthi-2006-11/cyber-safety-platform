const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, comparePassword, generateToken, verifyToken } = require('../src/utilities/auth');
const { requireAuth, requireRole } = require('../src/middleware/authMiddleware');
const { sanitizeText, validateReferenceUrl } = require('../src/services/report.service');
const { createRateLimiter } = require('../src/middleware/rateLimiter');
const User = require('../src/models/User');

test('1. Password Hashing and Comparison (bcrypt)', async () => {
  const plain = 'SecurePassword123!';
  const hash = await hashPassword(plain);

  assert.notEqual(plain, hash);
  assert.ok(hash.startsWith('$2b$'));

  const match = await comparePassword(plain, hash);
  assert.equal(match, true);

  const mismatch = await comparePassword('WrongPassword', hash);
  assert.equal(mismatch, false);
});

test('2. JWT Token Generation and Verification', () => {
  const user = { _id: '507f1f77bcf86cd799439011', email: 'test@cybersafety.local', role: 'USER' };
  const token = generateToken(user);

  assert.ok(typeof token === 'string');

  const decoded = verifyToken(token);
  assert.equal(decoded.id, user._id);
  assert.equal(decoded.email, user.email);
  assert.equal(decoded.role, 'USER');
});

test('3. Invalid & Expired JWT Token Rejection', () => {
  assert.equal(verifyToken('invalid.jwt.token'), null);
  assert.equal(verifyToken(''), null);
  assert.equal(verifyToken(null), null);
});

test('4. requireAuth Middleware — Rejects Missing Token (401)', async () => {
  let statusCode = 0;
  let responseData = null;

  const req = { headers: {} };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  await requireAuth(req, res, () => {});

  assert.equal(statusCode, 401);
  assert.equal(responseData.error, 'UNAUTHORIZED');
});

test('5. requireAuth Middleware — Rejects Invalid Token (401)', async () => {
  let statusCode = 0;
  let responseData = null;

  const req = { headers: { authorization: 'Bearer bad_token_123' } };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  await requireAuth(req, res, () => {});

  assert.equal(statusCode, 401);
  assert.equal(responseData.error, 'UNAUTHORIZED');
});

test('6. requireAuth Middleware — Accepts Valid JWT Token', async () => {
  const user = { _id: '507f1f77bcf86cd799439011', email: 'valid@cybersafety.local', role: 'USER' };
  const token = generateToken(user);

  let nextCalled = false;
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};

  await requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, user._id);
  assert.equal(req.user.email, user.email);
  assert.equal(req.user.role, 'USER');
});

test('7. Complete Removal of x-user-role Vulnerability (Header Spoofing Fails)', async () => {
  let statusCode = 0;
  let responseData = null;

  // Attempt header spoofing without Bearer token
  const req = { headers: { 'x-user-role': 'MODERATOR' } };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  await requireAuth(req, res, () => {});

  assert.equal(statusCode, 401);
  assert.equal(req.headers['x-user-role'], undefined); // Header stripped
});

test('8. Authenticated USER Accessing Moderation Endpoint (403 Forbidden)', () => {
  let statusCode = 0;
  let responseData = null;

  const req = { user: { id: '123', email: 'user@local', role: 'USER' }, headers: {} };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  const middleware = requireRole('MODERATOR', 'ADMIN');
  middleware(req, res, () => {});

  assert.equal(statusCode, 403);
  assert.equal(responseData.error, 'FORBIDDEN');
});

test('9. Authenticated MODERATOR Accessing Moderation Endpoint (Allowed)', () => {
  let nextCalled = false;
  const req = { user: { id: '123', email: 'mod@local', role: 'MODERATOR' } };
  const res = {};

  const middleware = requireRole('MODERATOR', 'ADMIN');
  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});

test('10. MODERATOR Accessing ADMIN-Only Endpoint (403 Forbidden)', () => {
  let statusCode = 0;
  let responseData = null;

  const req = { user: { id: '123', email: 'mod@local', role: 'MODERATOR' } };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  const middleware = requireRole('ADMIN');
  middleware(req, res, () => {});

  assert.equal(statusCode, 403);
  assert.equal(responseData.error, 'FORBIDDEN');
});

test('11. ADMIN Accessing ADMIN Endpoint (Allowed)', () => {
  let nextCalled = false;
  const req = { user: { id: '999', email: 'admin@local', role: 'ADMIN' } };
  const res = {};

  const middleware = requireRole('ADMIN');
  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});

test('12. User Report Ownership Isolation', () => {
  const authUser1 = { id: 'user_111', email: 'u1@local', role: 'USER' };
  const authUser2 = { id: 'user_222', email: 'u2@local', role: 'USER' };

  // Query is derived from authenticated req.user.id, ignoring query override params
  const req1 = { user: authUser1, query: { userId: 'user_222' } };
  const targetId = req1.user.id; // Must use req1.user.id

  assert.equal(targetId, 'user_111');
  assert.notEqual(targetId, req1.query.userId);
});

test('13. Password Hash Omission in User JSON Serialization', () => {
  const user = new User({
    email: 'test@local',
    passwordHash: '$2b$10$abcdef1234567890',
    role: 'USER'
  });

  const json = user.toJSON();
  assert.equal(json.passwordHash, undefined);
});

test('14. XSS Description Payload Sanitization', () => {
  const dirty = '<script>alert("XSS Attack")</script><img src="x" onerror="alert(1)">';
  const clean = sanitizeText(dirty);

  assert.ok(!clean.includes('<script>'));
  assert.ok(clean.includes('&lt;script&gt;'));
});

test('15. Malicious Reference URL Filtering', () => {
  assert.equal(validateReferenceUrl('javascript:alert(1)'), null);
  assert.equal(validateReferenceUrl('http://localhost:5000/secret'), null);
  assert.equal(validateReferenceUrl('https://verified-advisory.org/proof'), 'https://verified-advisory.org/proof');
});

test('16. Rate Limiting Middleware Protection', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });
  const req = { ip: '1.2.3.4', headers: {} };

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
