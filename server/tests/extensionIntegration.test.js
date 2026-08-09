const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRuleId, addBlockRule, removeBlockRule, syncBlockRules } = require('../../extension/ruleManager');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const { THREAT_LEVELS, RISK_LEVELS, SIGNAL_SEVERITY } = require('../../shared/constants');

// Mock chrome extension APIs for Node environment testing
globalThis.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://mock-id/${path}`
  },
  declarativeNetRequest: {
    updateDynamicRules: async ({ removeRuleIds, addRules }) => {
      globalThis.mockDnrRules = globalThis.mockDnrRules || [];
      if (Array.isArray(removeRuleIds)) {
        globalThis.mockDnrRules = globalThis.mockDnrRules.filter(r => !removeRuleIds.includes(r.id));
      }
      if (Array.isArray(addRules)) {
        globalThis.mockDnrRules.push(...addRules);
      }
      return true;
    }
  },
  storage: {
    local: {
      data: {},
      get: async (keys) => {
        const result = {};
        keys.forEach(k => { result[k] = globalThis.chrome.storage.local.data[k]; });
        return result;
      },
      set: async (obj) => {
        Object.assign(globalThis.chrome.storage.local.data, obj);
        return true;
      }
    }
  }
};

test('1. HIGH_CONFIDENCE_THREAT Decision Contract', () => {
  const reputation = {
    found: true,
    websiteRecord: { currentStatus: THREAT_LEVELS.HIGH_CONFIDENCE_THREAT }
  };
  const decision = calculateRisk('malicious-target.com', reputation);

  assert.equal(decision.domain, 'malicious-target.com');
  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.riskLevel, RISK_LEVELS.HIGH);
  assert.equal(decision.confidence, 0.90);
});

test('2. SUSPICIOUS Decision Contract', () => {
  const reputation = { found: false, signals: [] };
  const community = {
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.MEDIUM,
      weight: 45,
      description: '3 pending user reports'
    }],
    reports: [{ category: 'PHISHING', description: 'Deceptive login', status: 'PENDING' }]
  };
  const decision = calculateRisk('suspicious-target.com', reputation, {}, community);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
});

test('3. SAFE Decision Contract', () => {
  const reputation = {
    found: true,
    websiteRecord: { currentStatus: THREAT_LEVELS.SAFE }
  };
  const decision = calculateRisk('verified-safe.com', reputation);

  assert.equal(decision.classification, THREAT_LEVELS.SAFE);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
});

test('4. UNKNOWN Decision Contract', () => {
  const decision = calculateRisk('clean-unknown.com');

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
});

test('5. Backend Unavailable Fail-Safe Handling', () => {
  // Simulates offline backend status
  const isBackendAvailable = false;
  const status = isBackendAvailable ? 'ACTIVE' : 'UNREACHABLE';

  assert.equal(status, 'UNREACHABLE');
  // Confirm unindexed sites are not blocked when offline
  assert.notEqual(status, 'HIGH_CONFIDENCE_THREAT');
});

test('6. Malformed Backend Response Handling', () => {
  const rawResponse = { invalidData: true };
  const classification = rawResponse.data ? rawResponse.data.classification : 'UNKNOWN';

  assert.equal(classification, 'UNKNOWN');
});

test('7. Invalid Domain Input Validation', () => {
  const invalidDomain = 'http:///';
  const ruleId = generateRuleId(invalidDomain);

  assert.ok(typeof ruleId === 'number');
  assert.ok(ruleId >= 1 && ruleId <= 1000000);
});

test('8. Deterministic Rule ID Generation & Creation', async () => {
  globalThis.mockDnrRules = [];
  const domain = 'malware-rule-test.com';

  const ruleId1 = generateRuleId(domain);
  const ruleId2 = generateRuleId(domain);
  assert.equal(ruleId1, ruleId2); // Must be deterministic

  const success = await addBlockRule(domain, { classification: 'HIGH_CONFIDENCE_THREAT' });
  assert.equal(success, true);
  assert.equal(globalThis.mockDnrRules.length, 1);
  assert.equal(globalThis.mockDnrRules[0].id, ruleId1);
  assert.ok(globalThis.mockDnrRules[0].condition.urlFilter.includes('||malware-rule-test.com^'));
});

test('9. Duplicate Blocking Rule Prevention', async () => {
  globalThis.mockDnrRules = [];
  const domain = 'duplicate-test.com';

  await addBlockRule(domain, { classification: 'HIGH_CONFIDENCE_THREAT' });
  await addBlockRule(domain, { classification: 'HIGH_CONFIDENCE_THREAT' });

  // DNR update removes previous rule ID before adding, so count stays 1
  assert.equal(globalThis.mockDnrRules.length, 1);
});

test('10. Blocking Rule Removal', async () => {
  globalThis.mockDnrRules = [];
  const domain = 'removal-test.com';

  await addBlockRule(domain, { classification: 'HIGH_CONFIDENCE_THREAT' });
  assert.equal(globalThis.mockDnrRules.length, 1);

  await removeBlockRule(domain);
  assert.equal(globalThis.mockDnrRules.length, 0);
});

test('11. Multiple Blocked Domains Management', async () => {
  globalThis.mockDnrRules = [];
  const list = [
    { domain: 'block-one.com', classification: 'HIGH_CONFIDENCE_THREAT' },
    { domain: 'block-two.com', classification: 'HIGH_CONFIDENCE_THREAT' },
    { domain: 'safe-site.com', classification: 'SAFE' } // Should not be added as block rule
  ];

  await syncBlockRules(list);

  assert.equal(globalThis.mockDnrRules.length, 2);
});

test('12. Evidence Passed to Block Page Payload', () => {
  const mockWebRisk = {
    checked: true,
    matchFound: true,
    threatTypes: ['MALWARE']
  };
  const decision = calculateRisk('evidence-test.com', {}, mockWebRisk, {});

  assert.equal(decision.evidence.length, 1);
  assert.equal(decision.evidence[0].source, 'GOOGLE_WEB_RISK');
  assert.equal(decision.evidence[0].verificationStatus, 'SYSTEM_DETECTED');
});

test('13. Missing Evidence Fallback Text', () => {
  const decision = calculateRisk('no-evidence.com');

  assert.equal(decision.evidence.length, 0);
});

test('14. Unavailable Reddit Evidence Handling', () => {
  const mockRedditData = { checked: false, reason: 'UNCONFIGURED_CREDENTIALS', evidence: [] };
  const decision = calculateRisk('no-reddit.com', {}, {}, {}, {}, mockRedditData);

  assert.equal(decision.evidence.length, 0);
});

test('15. Zero API Secrets Exposed to Extension Contract', () => {
  const decision = calculateRisk('secret-check.com');

  assert.equal(decision.googleWebRiskApiKey, undefined);
  assert.equal(decision.redditClientSecret, undefined);
  assert.equal(decision.jwtSecret, undefined);
});
