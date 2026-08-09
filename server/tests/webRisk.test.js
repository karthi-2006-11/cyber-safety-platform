const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../src/config/env');
const cache = require('../src/utilities/cache');
const { searchUri } = require('../src/services/webRisk.service');
const { evaluateWebRisk } = require('../src/pipeline/webRiskEvaluator');
const { analyzeDomain } = require('../src/pipeline/threatPipeline');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const { THREAT_LEVELS, RISK_LEVELS, SIGNAL_SEVERITY } = require('../../shared/constants');

// Helper mock fetch generator
function createMockFetch(status = 200, responseBody = {}, shouldTimeout = false) {
  return async (url, options) => {
    if (shouldTimeout) {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseBody
    };
  }
}

test('1. Web Risk API reports MALWARE threat', async () => {
  cache.clear();
  // Temporarily mock API Key for test scope
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const mockFetch = createMockFetch(200, {
    threat: {
      threatTypes: ['MALWARE'],
      expireTime: '2026-08-09T23:00:00Z'
    }
  });

  const evalResult = await evaluateWebRisk('malware-domain.com', mockFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.matchFound, true);
  assert.deepEqual(evalResult.threatTypes, ['MALWARE']);
  assert.equal(evalResult.signals.length, 1);
  assert.equal(evalResult.signals[0].severity, SIGNAL_SEVERITY.CRITICAL);
  assert.ok(evalResult.signals[0].description.includes('MALWARE'));
});

test('2. Web Risk API reports SOCIAL_ENGINEERING threat', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const mockFetch = createMockFetch(200, {
    threat: {
      threatTypes: ['SOCIAL_ENGINEERING'],
      expireTime: '2026-08-09T23:00:00Z'
    }
  });

  const evalResult = await evaluateWebRisk('phishing-domain.com', mockFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.matchFound, true);
  assert.deepEqual(evalResult.threatTypes, ['SOCIAL_ENGINEERING']);
  assert.equal(evalResult.signals[0].severity, SIGNAL_SEVERITY.CRITICAL);
  assert.ok(evalResult.signals[0].description.includes('SOCIAL_ENGINEERING'));
});

test('3. Web Risk API returns no threat (Clean Response)', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const mockFetch = createMockFetch(200, {}); // Empty response object = no threat match

  const evalResult = await evaluateWebRisk('clean-site.com', mockFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.matchFound, false);
  assert.equal(evalResult.signals.length, 1);
  assert.equal(evalResult.signals[0].severity, SIGNAL_SEVERITY.INFO);
  assert.ok(evalResult.signals[0].description.includes('no threat matches'));
});

test('4. Web Risk API Key Missing (Graceful Fallback)', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = ''; // Simulate missing key

  const evalResult = await evaluateWebRisk('unconfigured-key-site.com');
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.checked, false);
  assert.equal(evalResult.reason, 'MISSING_API_KEY');
  assert.equal(evalResult.signals[0].weight, 0);
  assert.ok(evalResult.signals[0].description.includes('MISSING_API_KEY') || evalResult.signals[0].description.includes('unavailable'));
});

test('5. Web Risk API Request Timeout', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const timeoutFetch = createMockFetch(200, {}, true); // Simulates AbortError timeout

  const evalResult = await evaluateWebRisk('timeout-domain.com', timeoutFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.checked, false);
  assert.equal(evalResult.reason, 'TIMEOUT');
});

test('6. Web Risk API returns HTTP Error (500 Internal Error)', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const errorFetch = createMockFetch(500, { error: 'Internal Server Error' });

  const evalResult = await evaluateWebRisk('error-500-domain.com', errorFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.checked, false);
  assert.equal(evalResult.reason, 'HTTP_ERROR_500');
});

test('7. Web Risk API returns Malformed Response', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const malformedFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new SyntaxError('Unexpected token < in JSON'); }
  });

  const evalResult = await evaluateWebRisk('malformed-json-domain.com', malformedFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.equal(evalResult.checked, false);
  assert.equal(evalResult.reason, 'NETWORK_FAILURE');
});

test('8. Web Risk Result Combined with Community Reports', () => {
  const mockReputation = { found: false, signals: [] };
  const mockWebRisk = {
    checked: true,
    matchFound: true,
    threatTypes: ['SOCIAL_ENGINEERING'],
    signals: [{
      type: 'EXTERNAL_THREAT_INTEL_MATCH',
      source: 'GOOGLE_WEB_RISK',
      severity: SIGNAL_SEVERITY.CRITICAL,
      weight: 90,
      description: 'Google Web Risk identified this URL as SOCIAL_ENGINEERING',
      reliability: 0.95
    }]
  };
  const mockCommunity = {
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: SIGNAL_SEVERITY.LOW,
      weight: 20,
      description: '1 pending user report submitted flagging potential PHISHING',
      reliability: 0.60
    }],
    reports: [{ category: 'PHISHING', description: 'Fake login link', status: 'PENDING' }]
  };

  const decision = calculateRisk('combined-threat.com', mockReputation, mockWebRisk, mockCommunity);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.riskLevel, RISK_LEVELS.HIGH);
  assert.equal(decision.confidence, 0.90);
  assert.ok(decision.reasons.some(r => r.includes('SOCIAL_ENGINEERING')));
  assert.ok(decision.reasons.some(r => r.includes('pending user report')));
});

test('9. Web Risk Result Combined with Local Reputation Record', () => {
  const mockReputation = {
    found: true,
    websiteRecord: { currentStatus: THREAT_LEVELS.SUSPICIOUS },
    signals: [{
      type: 'LOCAL_RECORD',
      source: 'DATABASE_WEBSITE_RECORD',
      severity: SIGNAL_SEVERITY.HIGH,
      weight: 60,
      description: 'Official database record specifies status: SUSPICIOUS',
      reliability: 0.95
    }]
  };
  const mockWebRisk = {
    checked: true,
    matchFound: false,
    signals: [{
      type: 'EXTERNAL_THREAT_INTEL_CLEAN',
      source: 'GOOGLE_WEB_RISK',
      severity: SIGNAL_SEVERITY.INFO,
      weight: 0,
      description: 'Google Web Risk returned no threat matches for this domain.',
      reliability: 0.85
    }]
  };
  const mockCommunity = { signals: [], reports: [] };

  const decision = calculateRisk('local-suspicious.com', mockReputation, mockWebRisk, mockCommunity);

  // Local DB specified SUSPICIOUS; clean Web Risk does NOT override database record
  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
});

test('10. External Service Failure Does Not Crash Threat Pipeline', async () => {
  cache.clear();
  const originalKey = env.googleWebRiskApiKey;
  env.googleWebRiskApiKey = 'test_mock_api_key';

  const failingFetch = async () => {
    throw new Error('Connection refused by remote host');
  };

  // Run pipeline end-to-end with failing fetch
  const decision = await analyzeDomain('resilient-domain.com', failingFetch);
  env.googleWebRiskApiKey = originalKey;

  assert.ok(decision);
  assert.equal(decision.domain, 'resilient-domain.com');
  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.ok(decision.reasons.some(r => r.includes('Google Web Risk lookup unavailable')));
});
