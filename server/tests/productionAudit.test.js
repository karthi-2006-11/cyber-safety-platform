const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const extensionConfig = require('../../extension/config');
const { validateEnv } = require('../src/config/envValidator');
const logger = require('../src/utilities/logger');

test('1. Extension Production Config — Dynamic API URL Resolution', () => {
  assert.equal(typeof extensionConfig.API_BASE_URL, 'string');
  assert.ok(extensionConfig.API_BASE_URL.includes('/api/v1'));
  
  // Test switching environment dynamically
  const originalEnv = extensionConfig.ENVIRONMENT;
  extensionConfig.ENVIRONMENT = 'production';
  assert.equal(extensionConfig.API_BASE_URL, 'https://YOUR-PRODUCTION-API.example.com/api/v1');
  assert.equal(extensionConfig.DASHBOARD_URL, 'https://YOUR-PRODUCTION-DASHBOARD.example.com');
  extensionConfig.ENVIRONMENT = originalEnv;
});

test('2. Manifest V3 Audit — Minimum Necessary Permission Bounds', () => {
  const manifestPath = path.join(__dirname, '../../extension/manifest.json');
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Cyber Safety Protection Engine');
  assert.ok(manifest.permissions.includes('declarativeNetRequest'));
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('webNavigation'));
  
  // Verify no excessive permissions
  assert.equal(manifest.permissions.includes('debugger'), false);
  assert.equal(manifest.permissions.includes('management'), false);
});

test('3. Extension Security Audit — Zero API Secrets Stored in Extension Bundle', () => {
  const extDir = path.join(__dirname, '../../extension');
  const extFiles = fs.readdirSync(extDir).filter(f => f.endsWith('.js') || f.endsWith('.json'));

  for (const file of extFiles) {
    const content = fs.readFileSync(path.join(extDir, file), 'utf8');
    assert.equal(content.includes('JWT_SECRET'), false, `Secret found in extension/${file}`);
    assert.equal(content.includes('MONGODB_URI'), false, `Secret found in extension/${file}`);
    assert.equal(content.includes('GOOGLE_WEB_RISK_API_KEY='), false, `Key found in extension/${file}`);
    assert.equal(content.includes('REDDIT_CLIENT_SECRET='), false, `Secret found in extension/${file}`);
  }
});

test('4. React Client Audit — Zero API Credentials Stored in Client Code', () => {
  const clientSrcDir = path.join(__dirname, '../../client/src');
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.equal(content.includes('JWT_SECRET'), false, `Secret found in ${item}`);
        assert.equal(content.includes('MONGODB_URI'), false, `Secret found in ${item}`);
      }
    }
  }

  scanDir(clientSrcDir);
});

test('5. Env Validation Audit — Strict Production Checks', () => {
  const prodEnv = {
    nodeEnv: 'production',
    port: 5000,
    mongoUri: 'mongodb+srv://user:pass@cluster.mongodb.net/db',
    jwtSecret: 'super_strong_production_secret_32chars!'
  };

  const res = validateEnv(prodEnv);
  assert.equal(res.isValid, true);
  assert.ok(res.missingOptional.length >= 2);
});

test('6. Logger Redaction Audit — Redacts Secrets and Passwords', () => {
  const logData = {
    user: 'admin@cybersafety.org',
    password: 'SuperSecretPassword!',
    jwtSecret: 'secret123',
    apiKey: 'AIzaSyTest123'
  };

  const redacted = logger.redactSensitiveData(logData);
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.jwtSecret, '[REDACTED]');
  assert.equal(redacted.apiKey, '[REDACTED]');
  assert.equal(redacted.user, 'admin@cybersafety.org');
});
