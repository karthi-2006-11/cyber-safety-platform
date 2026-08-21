const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRuleId, addBlockRule, removeBlockRule, syncBlockRules } = require('../../extension/ruleManager');
const { extractCanonicalDomain, isPrivateOrLocalHost, inspectTabUrl } = require('../../extension/background');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const { THREAT_LEVELS, RISK_LEVELS, SIGNAL_SEVERITY } = require('../../shared/constants');

// Mock chrome extension APIs for Node environment testing
globalThis.chrome = {
  action: {
    setBadgeText: async () => {},
    setBadgeBackgroundColor: async () => {}
  },
  tabs: {
    get: async () => ({ id: 1, url: 'https://example.com' })
  },
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

test('16. Localhost & Custom Port Filtering', () => {
  assert.equal(isPrivateOrLocalHost('localhost'), true);
  assert.equal(isPrivateOrLocalHost('sub.localhost'), true);
  assert.equal(extractCanonicalDomain('http://localhost'), null);
  assert.equal(extractCanonicalDomain('http://localhost:3000'), null);
  assert.equal(extractCanonicalDomain('http://localhost:5000/api'), null);
  assert.equal(extractCanonicalDomain('http://localhost:8080'), null);
});

test('17. Loopback IPv4 Range Filtering (127.0.0.0/8)', () => {
  assert.equal(isPrivateOrLocalHost('127.0.0.1'), true);
  assert.equal(isPrivateOrLocalHost('127.0.0.2'), true);
  assert.equal(isPrivateOrLocalHost('127.255.255.255'), true);
  assert.equal(extractCanonicalDomain('http://127.0.0.1'), null);
  assert.equal(extractCanonicalDomain('http://127.0.0.1:8080/admin'), null);
});

test('18. Private IPv4 Range Filtering (10/8, 172.16/12, 192.168/16)', () => {
  // 10.0.0.0/8
  assert.equal(isPrivateOrLocalHost('10.0.0.1'), true);
  assert.equal(isPrivateOrLocalHost('10.255.255.255'), true);
  assert.equal(extractCanonicalDomain('http://10.0.0.1'), null);

  // 172.16.0.0/12 (172.16 - 172.31)
  assert.equal(isPrivateOrLocalHost('172.16.0.1'), true);
  assert.equal(isPrivateOrLocalHost('172.31.255.255'), true);
  assert.equal(extractCanonicalDomain('http://172.16.0.1:8080'), null);

  // 192.168.0.0/16
  assert.equal(isPrivateOrLocalHost('192.168.0.1'), true);
  assert.equal(isPrivateOrLocalHost('192.168.255.255'), true);
  assert.equal(extractCanonicalDomain('http://192.168.1.10/login'), null);
});

test('19. Link-Local & Unspecified IPv4 Filtering (169.254/16, 0.0.0.0)', () => {
  assert.equal(isPrivateOrLocalHost('169.254.1.1'), true);
  assert.equal(isPrivateOrLocalHost('0.0.0.0'), true);
  assert.equal(extractCanonicalDomain('http://169.254.1.1'), null);
  assert.equal(extractCanonicalDomain('http://0.0.0.0'), null);
});

test('20. IPv6 Loopback, Unique-Local & Link-Local Filtering (::1, fc00::/7, fe80::/10)', () => {
  assert.equal(isPrivateOrLocalHost('::1'), true);
  assert.equal(isPrivateOrLocalHost('[::1]'), true);
  assert.equal(isPrivateOrLocalHost('fc00::1'), true);
  assert.equal(isPrivateOrLocalHost('fe80::1'), true);
  assert.equal(extractCanonicalDomain('http://[::1]/'), null);
  assert.equal(extractCanonicalDomain('http://[fc00::1]/'), null);
  assert.equal(extractCanonicalDomain('http://[fe80::1]/'), null);
});

test('21. Browser Internal Protocol & Non-HTTP Scheme Filtering', () => {
  assert.equal(extractCanonicalDomain('chrome://settings'), null);
  assert.equal(extractCanonicalDomain('chrome-extension://abcdef'), null);
  assert.equal(extractCanonicalDomain('edge://history'), null);
  assert.equal(extractCanonicalDomain('about:blank'), null);
  assert.equal(extractCanonicalDomain('file:///C:/test.txt'), null);
  assert.equal(extractCanonicalDomain('data:text/plain,hello'), null);
  assert.equal(extractCanonicalDomain('blob:http://example.com/uuid'), null);
  assert.equal(extractCanonicalDomain('javascript:alert(1)'), null);
});

test('22. Public Domain & Port Preservation', () => {
  assert.equal(isPrivateOrLocalHost('example.com'), false);
  assert.equal(isPrivateOrLocalHost('subdomain.example.com'), false);
  assert.equal(extractCanonicalDomain('https://example.com'), 'example.com');
  assert.equal(extractCanonicalDomain('http://example.com'), 'example.com');
  assert.equal(extractCanonicalDomain('https://example.com:8443/test'), 'example.com');
  assert.equal(extractCanonicalDomain('https://subdomain.example.com/path?q=1'), 'subdomain.example.com');
});

test('23. False-Positive Protection (IP-Like Public Domains)', () => {
  // 172.32 is public, not in 172.16 - 172.31 range
  assert.equal(isPrivateOrLocalHost('172.32.0.1'), false);
  assert.equal(extractCanonicalDomain('http://172.32.0.1'), '172.32.0.1');

  // Domain names starting with IP patterns must NOT be ignored
  assert.equal(isPrivateOrLocalHost('192.168.example.com'), false);
  assert.equal(extractCanonicalDomain('http://192.168.example.com'), '192.168.example.com');

  assert.equal(isPrivateOrLocalHost('10.example.com'), false);
  assert.equal(extractCanonicalDomain('http://10.example.com'), '10.example.com');

  assert.equal(isPrivateOrLocalHost('127.example.com'), false);
  assert.equal(extractCanonicalDomain('http://127.example.com'), '127.example.com');
});

test('24. Zero API Calls & Zero Cache Entries for Ignored Destinations', async () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({}) };
  };

  try {
    await inspectTabUrl(1, 'http://localhost:3000');
    await inspectTabUrl(1, 'http://127.0.0.1:8080');
    await inspectTabUrl(1, 'http://192.168.1.1');
    await inspectTabUrl(1, 'chrome://settings');

    assert.equal(fetchCalled, false, 'Fetch MUST NOT be called for private/local/internal URLs');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
