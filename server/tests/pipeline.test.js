const test = require('node:test');
const assert = require('node:assert/strict');
const { extractDomain, isValidDomain } = require('../src/utilities/urlHelper');
const { normalizeAndValidate } = require('../src/pipeline/urlNormalizer');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const { THREAT_LEVELS, RISK_LEVELS, SIGNAL_SEVERITY, REPORT_STATUS } = require('../../shared/constants');

test('1. Valid Domain Extraction & Validation', () => {
  const result = extractDomain('example.com');
  assert.equal(result, 'example.com');
  assert.equal(isValidDomain('example.com'), true);
});

test('2. Invalid Domain Rejection', () => {
  const result = extractDomain('invalid_domain_!!');
  assert.equal(result, null);
  assert.equal(isValidDomain('invalid_domain_!!'), false);
});

test('3. Malformed URL Rejection', () => {
  assert.throws(() => {
    normalizeAndValidate('http:///');
  }, /Invalid or malformed URL\/domain format/);
});

test('4. Domain Normalization (Uppercase & www removal)', () => {
  const result = extractDomain('WWW.EXAMPLE.COM');
  assert.equal(result, 'example.com');
});

test('5. Domain with Port Handling', () => {
  const result = extractDomain('http://example.com:8080');
  assert.equal(result, 'example.com');
});

test('6. Domain with Path and Query Handling', () => {
  const result = extractDomain('https://example.com/login/secure?token=123#header');
  assert.equal(result, 'example.com');
});

test('7. Unknown Domain Risk Calculation', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = { checked: false, signals: [] };
  const mockCommunity = { signals: [], reports: [], evidence: [] };

  const decision = calculateRisk('unknown-clean-domain.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.domain, 'unknown-clean-domain.com');
  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
  assert.equal(decision.confidence, 0.50);
  assert.ok(decision.reasons.some(r => r.includes('No threat indicators')));
});

test('8. Single Pending Community Report Signal', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = { checked: false, signals: [] };
  const mockCommunity = {
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.LOW,
      weight: 20,
      description: '1 pending user report submitted flagging potential PHISHING',
      evidenceRef: null,
      reliability: 0.60
    }],
    reports: [{ category: 'PHISHING', description: 'Suspicious login page', status: REPORT_STATUS.PENDING }],
    evidence: []
  };

  const decision = calculateRisk('test-pending-domain.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.LOW);
  assert.equal(decision.confidence, 0.60);
  assert.equal(decision.reports.length, 1);
});

test('9. Multiple Pending Community Reports Signal', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = { checked: false, signals: [] };
  const mockCommunity = {
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.MEDIUM,
      weight: 45,
      description: '3 pending user report(s) submitted flagging potential PHISHING, MALWARE',
      evidenceRef: null,
      reliability: 0.60
    }],
    reports: [
      { category: 'PHISHING', description: 'Report 1', status: REPORT_STATUS.PENDING },
      { category: 'MALWARE', description: 'Report 2', status: REPORT_STATUS.PENDING },
      { category: 'SCAM', description: 'Report 3', status: REPORT_STATUS.PENDING }
    ],
    evidence: []
  };

  const decision = calculateRisk('test-multi-pending-domain.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
  assert.equal(decision.confidence, 0.75);
  assert.equal(decision.reports.length, 3);
});

test('10. Rejected Community Reports Handling (Zero Weight)', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = { checked: false, signals: [] };
  const mockCommunity = {
    signals: [{
      type: 'REJECTED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.INFO,
      weight: 0,
      description: '1 user report(s) were previously investigated and REJECTED as invalid',
      evidenceRef: null,
      reliability: 0.90
    }],
    reports: [],
    evidence: []
  };

  const decision = calculateRisk('test-rejected-report-domain.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
  assert.ok(decision.reasons.some(r => r.includes('REJECTED as invalid')));
});

test('11. Actioned High-Confidence Threat Decision', () => {
  const mockReputation = {
    found: true,
    websiteRecord: { currentStatus: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT },
    signals: [{
      type: 'LOCAL_RECORD',
      source: 'DATABASE_WEBSITE_RECORD',
      severity: SIGNAL_SEVERITY.CRITICAL,
      weight: 90,
      description: 'Official database record specifies status: HIGH_CONFIDENCE_THREAT',
      evidenceRef: 'Malware active distribution',
      reliability: 0.95
    }]
  };
  const mockWebRisk = { checked: false, signals: [] };
  const mockCommunity = { signals: [], reports: [], evidence: [] };

  const decision = calculateRisk('confirmed-malicious-domain.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.riskLevel, RISK_LEVELS.HIGH);
  assert.equal(decision.confidence, 0.90);
});
