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
  const { requireRole } = require('../src/middleware/authMiddleware');
  let statusCode = 0;
  let responseData = null;

  const req = { user: { id: '123', email: 'user@local', role: 'USER' } };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; }
  };

  const middleware = requireRole('MODERATOR', 'ADMIN');
  middleware(req, res, () => {});

  assert.equal(statusCode, 403);
  assert.equal(responseData.error, 'FORBIDDEN');
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

test('Q. TEST 1 & 2 & 3: Verified Community Report produces signal and USER_REPORT_DATABASE evidence card', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = { checked: true, matchFound: false, signals: [] };
  const mockCommunity = {
    reportsCount: 1,
    verifiedReportCount: 1,
    signals: [{
      type: 'VERIFIED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.HIGH,
      weight: 70,
      description: '1 community report verified by security analyst'
    }],
    evidence: [{
      source: 'COMMUNITY_REPORT',
      sourceType: 'USER_REPORT',
      title: 'Community Report: PHISHING',
      excerpt: 'Fake bank login page reported for suspicious.com',
      relevance: 'HIGH',
      verificationStatus: 'SUPPORTED',
      retrievedAt: new Date().toISOString()
    }],
    reports: [{ category: 'PHISHING', description: 'Fake bank login page reported for suspicious.com', status: 'VERIFIED' }]
  };

  const decision = calculateRisk('suspicious.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);

  const commEv = decision.evidence.filter(e => e.source === 'COMMUNITY_REPORT');
  assert.equal(commEv.length, 1);
  assert.equal(commEv[0].title, 'Community Report: PHISHING');
});

test('R. TEST 4: Google Web Risk clean result remains separate from Community Report evidence', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = {
    checked: true,
    matchFound: false,
    signals: [{
      type: 'EXTERNAL_THREAT_INTEL_CLEAN',
      source: 'GOOGLE_WEB_RISK',
      severity: SIGNAL_SEVERITY.INFO,
      weight: 0,
      description: 'Google Web Risk returned no threat matches for this domain.'
    }]
  };
  const mockCommunity = {
    reportsCount: 1,
    verifiedReportCount: 1,
    signals: [{
      type: 'VERIFIED_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.HIGH,
      weight: 70,
      description: '1 community report verified by security analyst'
    }],
    evidence: [{
      source: 'COMMUNITY_REPORT',
      sourceType: 'USER_REPORT',
      title: 'Community Report: PHISHING',
      excerpt: 'Phishing domain impersonating banking portal',
      relevance: 'HIGH',
      verificationStatus: 'SUPPORTED'
    }]
  };

  const decision = calculateRisk('suspicious.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);

  const webRiskEv = decision.evidence.filter(e => e.source === 'GOOGLE_WEB_RISK');
  const commEv = decision.evidence.filter(e => e.source === 'COMMUNITY_REPORT');

  assert.equal(webRiskEv.length, 0); // Clean Web Risk emits no threat evidence card
  assert.equal(commEv.length, 1);
  assert.equal(commEv[0].source, 'COMMUNITY_REPORT');
});

test('S. TEST 5: Final risk classification reflects intended VERIFIED community report rule', () => {
  const mockCommunity = {
    reportsCount: 1,
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

  const decision = calculateRisk('suspicious.com', {}, {}, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
});

test('T. TEST 6: Domain Normalization resolves consistently across variants', () => {
  const { extractDomain } = require('../src/utilities/urlHelper');
  const d1 = extractDomain('suspicious.com');
  const d2 = extractDomain('www.suspicious.com');
  const d3 = extractDomain('https://suspicious.com');
  const d4 = extractDomain('https://www.suspicious.com/');

  assert.equal(d1, 'suspicious.com');
  assert.equal(d2, 'suspicious.com');
  assert.equal(d3, 'suspicious.com');
  assert.equal(d4, 'suspicious.com');
});

test('U. TEST 7: Unrelated domain does not receive suspicious.com report', () => {
  const mockCommunityUnrelated = {
    reportsCount: 0,
    verifiedReportCount: 0,
    actionedReportCount: 0,
    signals: [],
    reports: [],
    evidence: []
  };

  const decision = calculateRisk('clean-unrelated-site.org', {}, {}, mockCommunityUnrelated);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
  assert.equal(decision.evidence.length, 0);
});

test('V. TEST 8: Non-actionable report status (REJECTED) contributes 0 weight', () => {
  const mockCommunityRejected = {
    reportsCount: 0,
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

  const decision = calculateRisk('rejected-site.com', {}, {}, mockCommunityRejected);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
});

test('W. Moderation Rejection — Single ACTIONED report rejected updates Website status to UNKNOWN', async () => {
  const UserReport = require('../src/models/UserReport');
  const Website = require('../src/models/Website');
  const Evidence = require('../src/models/Evidence');
  const { rejectReport } = require('../src/controllers/moderation.controller');

  const mockReport = {
    _id: 'report123',
    domain: 'single-actioned-domain.com',
    status: REPORT_STATUS.ACTIONED,
    confidenceContribution: 0.90,
    moderationMetadata: {},
    save: async function() { this.saved = true; }
  };
  const mockWebsite = {
    domain: 'single-actioned-domain.com',
    currentStatus: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT,
    save: async function() { this.saved = true; }
  };

  const origFindById = UserReport.findById;
  const origCountDocs = UserReport.countDocuments;
  const origFindOne = Website.findOne;
  const origUpdateMany = Evidence.updateMany;

  UserReport.findById = async () => mockReport;
  UserReport.countDocuments = async () => 0;
  Website.findOne = async () => mockWebsite;
  Evidence.updateMany = async () => true;

  const req = { params: { id: 'report123' }, body: { notes: 'Reverting action' }, user: { email: 'mod@local' } };
  const res = { status: () => res, json: () => res };

  await rejectReport(req, res, () => {});

  UserReport.findById = origFindById;
  UserReport.countDocuments = origCountDocs;
  Website.findOne = origFindOne;
  Evidence.updateMany = origUpdateMany;

  assert.equal(mockReport.status, REPORT_STATUS.REJECTED);
  assert.equal(mockWebsite.currentStatus, THREAT_LEVELS.UNKNOWN);
});

test('X. Moderation Rejection — Two ACTIONED reports preserves HIGH_CONFIDENCE_THREAT when one is rejected', async () => {
  const UserReport = require('../src/models/UserReport');
  const Website = require('../src/models/Website');
  const Evidence = require('../src/models/Evidence');
  const { rejectReport } = require('../src/controllers/moderation.controller');

  const mockReport = {
    _id: 'reportA',
    domain: 'multi-actioned-domain.com',
    status: REPORT_STATUS.ACTIONED,
    save: async function() {}
  };
  const mockWebsite = {
    domain: 'multi-actioned-domain.com',
    currentStatus: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT,
    save: async function() {}
  };

  const origFindById = UserReport.findById;
  const origCountDocs = UserReport.countDocuments;
  const origFindOne = Website.findOne;
  const origUpdateMany = Evidence.updateMany;

  UserReport.findById = async () => mockReport;
  UserReport.countDocuments = async (query) => {
    if (query && query.status === REPORT_STATUS.ACTIONED) return 1;
    return 0;
  };
  Website.findOne = async () => mockWebsite;
  Evidence.updateMany = async () => true;

  const req = { params: { id: 'reportA' }, body: {}, user: { email: 'mod@local' } };
  const res = { status: () => res, json: () => res };

  await rejectReport(req, res, () => {});

  UserReport.findById = origFindById;
  UserReport.countDocuments = origCountDocs;
  Website.findOne = origFindOne;
  Evidence.updateMany = origUpdateMany;

  assert.equal(mockReport.status, REPORT_STATUS.REJECTED);
  assert.equal(mockWebsite.currentStatus, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
});

test('Y. Moderation Rejection — Rejecting report that was never ACTIONED preserves SAFE reputation', async () => {
  const UserReport = require('../src/models/UserReport');
  const Website = require('../src/models/Website');
  const Evidence = require('../src/models/Evidence');
  const { rejectReport } = require('../src/controllers/moderation.controller');

  const mockReport = {
    _id: 'reportPending',
    domain: 'safe-reputation-domain.com',
    status: REPORT_STATUS.PENDING,
    save: async function() {}
  };
  const mockWebsite = {
    domain: 'safe-reputation-domain.com',
    currentStatus: THREAT_LEVELS.SAFE,
    save: async function() {}
  };

  const origFindById = UserReport.findById;
  const origCountDocs = UserReport.countDocuments;
  const origFindOne = Website.findOne;
  const origUpdateMany = Evidence.updateMany;

  UserReport.findById = async () => mockReport;
  UserReport.countDocuments = async () => 0;
  Website.findOne = async () => mockWebsite;
  Evidence.updateMany = async () => true;

  const req = { params: { id: 'reportPending' }, body: {}, user: { email: 'mod@local' } };
  const res = { status: () => res, json: () => res };

  await rejectReport(req, res, () => {});

  UserReport.findById = origFindById;
  UserReport.countDocuments = origCountDocs;
  Website.findOne = origFindOne;
  Evidence.updateMany = origUpdateMany;

  assert.equal(mockReport.status, REPORT_STATUS.REJECTED);
  assert.equal(mockWebsite.currentStatus, THREAT_LEVELS.SAFE);
});

test('Z. Moderation Rejection — Recalculates to SUSPICIOUS when remaining VERIFIED report exists', async () => {
  const UserReport = require('../src/models/UserReport');
  const Website = require('../src/models/Website');
  const Evidence = require('../src/models/Evidence');
  const { rejectReport } = require('../src/controllers/moderation.controller');

  const mockReport = {
    _id: 'reportActioned',
    domain: 'verified-remaining-domain.com',
    status: REPORT_STATUS.ACTIONED,
    save: async function() {}
  };
  const mockWebsite = {
    domain: 'verified-remaining-domain.com',
    currentStatus: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT,
    save: async function() {}
  };

  const origFindById = UserReport.findById;
  const origCountDocs = UserReport.countDocuments;
  const origFindOne = Website.findOne;
  const origUpdateMany = Evidence.updateMany;

  UserReport.findById = async () => mockReport;
  UserReport.countDocuments = async (query) => {
    if (query && query.status === REPORT_STATUS.ACTIONED) return 0;
    if (query && query.status === REPORT_STATUS.VERIFIED) return 1;
    return 0;
  };
  Website.findOne = async () => mockWebsite;
  Evidence.updateMany = async () => true;

  const req = { params: { id: 'reportActioned' }, body: {}, user: { email: 'mod@local' } };
  const res = { status: () => res, json: () => res };

  await rejectReport(req, res, () => {});

  UserReport.findById = origFindById;
  UserReport.countDocuments = origCountDocs;
  Website.findOne = origFindOne;
  Evidence.updateMany = origUpdateMany;

  assert.equal(mockReport.status, REPORT_STATUS.REJECTED);
  assert.equal(mockWebsite.currentStatus, THREAT_LEVELS.SUSPICIOUS);
});

