const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const { sanitizeText, validateReferenceUrl, generateReporterHash } = require('../src/services/report.service');
const { requireModeratorRole } = require('../src/controllers/moderation.controller');
const { generateRuleId, addBlockRule, syncBlockRules } = require('../../extension/ruleManager');
const { THREAT_LEVELS, RISK_LEVELS, REPORT_STATUS, SIGNAL_SEVERITY } = require('../../shared/constants');

// Mock Chrome Extension API for test environment
globalThis.chrome = globalThis.chrome || {
  runtime: { getURL: (p) => `chrome-extension://mock/${p}` },
  declarativeNetRequest: {
    updateDynamicRules: async ({ removeRuleIds, addRules }) => {
      globalThis.mockDnrRules = globalThis.mockDnrRules || [];
      if (Array.isArray(removeRuleIds)) {
        globalThis.mockDnrRules = globalThis.mockDnrRules.filter(r => !removeRuleIds.includes(r.id));
      }
      if (Array.isArray(addRules)) globalThis.mockDnrRules.push(...addRules);
      return true;
    }
  },
  storage: { local: { data: {}, get: async () => ({}), set: async () => true } }
};

test('A. Single Pending Community Report (Does NOT force HIGH_CONFIDENCE_THREAT)', () => {
  const communityData = {
    reportsCount: 1,
    independentReporterCount: 1,
    verifiedReportCount: 0,
    actionedReportCount: 0,
    pendingReportsCount: 1,
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.LOW,
      weight: 20,
      description: '1 pending report submitted'
    }]
  };

  const decision = calculateRisk('single-pending-domain.com', {}, {}, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.LOW);
  assert.notEqual(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
});

test('B. Multiple Independent Pending Reports (Increases risk to MEDIUM, NOT HIGH_CONFIDENCE_THREAT)', () => {
  const communityData = {
    reportsCount: 4,
    independentReporterCount: 4,
    verifiedReportCount: 0,
    actionedReportCount: 0,
    pendingReportsCount: 4,
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.MEDIUM,
      weight: 45,
      description: '4 pending reports from 4 independent reporters'
    }]
  };

  const decision = calculateRisk('multi-pending-domain.com', {}, {}, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
  assert.notEqual(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
});

test('C. Rejected Report (Contributes Zero Weight)', () => {
  const communityData = {
    reportsCount: 0,
    independentReporterCount: 0,
    verifiedReportCount: 0,
    actionedReportCount: 0,
    signals: [{
      type: 'REJECTED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.INFO,
      weight: 0,
      description: '1 user report investigated and REJECTED'
    }]
  };

  const decision = calculateRisk('rejected-report-domain.com', {}, {}, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
});

test('D. Verified Report Signal', () => {
  const communityData = {
    reportsCount: 1,
    independentReporterCount: 1,
    verifiedReportCount: 1,
    actionedReportCount: 0,
    signals: [{
      type: 'VERIFIED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.HIGH,
      weight: 70,
      description: '1 community report verified by analyst'
    }]
  };

  const decision = calculateRisk('verified-domain.com', {}, {}, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
});

test('E. Actioned Report Signal (Promotes to HIGH_CONFIDENCE_THREAT)', () => {
  const communityData = {
    reportsCount: 1,
    independentReporterCount: 1,
    verifiedReportCount: 0,
    actionedReportCount: 1,
    signals: [{
      type: 'ACTIONED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.HIGH,
      weight: 85,
      description: '1 community report confirmed and ACTIONED'
    }]
  };

  const decision = calculateRisk('actioned-domain.com', {}, {}, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.riskLevel, RISK_LEVELS.HIGH);
  assert.equal(decision.confidence, 0.90);
});

test('F. Duplicate Reporter Hash Generation & Identification', () => {
  const hash1 = generateReporterHash('user_123', '192.168.1.1');
  const hash2 = generateReporterHash('user_123', '192.168.1.1');
  const hash3 = generateReporterHash('user_456', '192.168.1.2');

  assert.equal(hash1, hash2); // Same reporter produces same hash
  assert.notEqual(hash1, hash3); // Different reporter produces different hash
});

test('G. Multiple Reports from Same User (Does NOT inflate independentReporterCount)', () => {
  const hash1 = generateReporterHash('user_123', '127.0.0.1');
  const hash2 = generateReporterHash('user_123', '127.0.0.1');
  const set = new Set([hash1, hash2]);

  assert.equal(set.size, 1); // Recognized as 1 unique independent reporter
});

test('H. Multiple Independent Reporters Identification', () => {
  const h1 = generateReporterHash('user_1', '1.1.1.1');
  const h2 = generateReporterHash('user_2', '2.2.2.2');
  const h3 = generateReporterHash('user_3', '3.3.3.3');
  const set = new Set([h1, h2, h3]);

  assert.equal(set.size, 3);
});

test('I. Strong Evidence + Verified Reports Promotion', () => {
  const communityData = {
    reportsCount: 2,
    independentReporterCount: 2,
    verifiedReportCount: 2,
    actionedReportCount: 0,
    signals: [{
      type: 'VERIFIED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.HIGH,
      weight: 85,
      description: '2 verified reports with verified proof'
    }]
  };

  const decision = calculateRisk('verified-promo-domain.com', {}, {}, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.riskLevel, RISK_LEVELS.HIGH);
});

test('J. Missing Web Risk Key + Community Intelligence (Functions Safely)', () => {
  const webRiskData = { checked: false, reason: 'MISSING_API_KEY', signals: [] };
  const communityData = {
    reportsCount: 1,
    actionedReportCount: 1,
    signals: [{ type: 'ACTIONED_COMMUNITY_REPORTS', severity: SIGNAL_SEVERITY.HIGH, weight: 85, description: 'Actioned' }]
  };

  const decision = calculateRisk('no-key-comm-domain.com', {}, webRiskData, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.ok(decision.reasons.some(r => r.includes('Actioned')));
});

test('K. Web Risk Match + Community Intelligence Combination', () => {
  const webRiskData = {
    checked: true,
    matchFound: true,
    threatTypes: ['MALWARE'],
    signals: [{ type: 'EXTERNAL_THREAT_INTEL_MATCH', severity: SIGNAL_SEVERITY.CRITICAL, weight: 90, description: 'WebRisk Malware' }]
  };
  const communityData = {
    reportsCount: 1,
    verifiedReportCount: 1,
    signals: [{ type: 'VERIFIED_COMMUNITY_REPORTS', severity: SIGNAL_SEVERITY.HIGH, weight: 70, description: 'Verified report' }]
  };

  const decision = calculateRisk('combined-threat.com', {}, webRiskData, communityData);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.evidence.length, 1);
  assert.equal(decision.evidence[0].source, 'GOOGLE_WEB_RISK');
});

test('L. Moderator RBAC Authorization Check (Rejects Normal User)', () => {
  let statusCode = 0;
  let responseData = null;

  const req = { headers: { 'x-user-role': 'USER' } };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  requireModeratorRole(req, res, () => {});

  assert.equal(statusCode, 403);
  assert.equal(responseData.error, 'MODERATOR_AUTHORIZATION_REQUIRED');
});

test('M. XSS Description Payload Sanitization', () => {
  const dirty = '<script>alert("xss")</script><a href="javascript:void(0)">click</a>';
  const clean = sanitizeText(dirty);

  assert.ok(!clean.includes('<script>'));
  assert.ok(clean.includes('&lt;script&gt;'));
});

test('N. Invalid / Malicious Evidence URL Rejection', () => {
  assert.equal(validateReferenceUrl('javascript:alert(1)'), null);
  assert.equal(validateReferenceUrl('file:///etc/passwd'), null);
  assert.equal(validateReferenceUrl('http://127.0.0.1/admin'), null);
  assert.equal(validateReferenceUrl('http://localhost:5000/secret'), null);
  assert.equal(validateReferenceUrl('https://valid-security-blog.com/report'), 'https://valid-security-blog.com/report');
});

test('O. High Confidence Sync Endpoint Domain Inclusion Contract', async () => {
  globalThis.mockDnrRules = [];
  const threatDomain = 'newly-promoted-threat.com';

  const success = await addBlockRule(threatDomain, { classification: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT });
  assert.equal(success, true);
  assert.equal(globalThis.mockDnrRules.length, 1);
});

test('P. Extension Dynamic DNR Synchronization for Promoted Domain', async () => {
  globalThis.mockDnrRules = [];
  const list = [
    { domain: 'promoted-one.com', classification: 'HIGH_CONFIDENCE_THREAT' },
    { domain: 'promoted-two.com', classification: 'HIGH_CONFIDENCE_THREAT' }
  ];

  await syncBlockRules(list);
  assert.equal(globalThis.mockDnrRules.length, 2);
});
