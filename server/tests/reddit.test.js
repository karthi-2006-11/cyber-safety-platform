const test = require('node:test');
const assert = require('node:assert/strict');
const env = require('../src/config/env');
const cache = require('../src/utilities/cache');
const { searchReddit } = require('../src/services/reddit.service');
const { evaluateReddit } = require('../src/pipeline/redditEvaluator');
const { EVIDENCE_SOURCES, VERIFICATION_STATUS } = require('../../shared/constants');

function createMockFetch(tokenStatus = 200, searchStatus = 200, searchData = {}) {
  return async (url) => {
    if (url.includes('access_token')) {
      return {
        ok: tokenStatus >= 200 && tokenStatus < 300,
        status: tokenStatus,
        json: async () => ({ access_token: 'mock_access_token_123', expires_in: 3600 })
      };
    }
    return {
      ok: searchStatus >= 200 && searchStatus < 300,
      status: searchStatus,
      json: async () => searchData
    };
  };
}

test('1. Relevant Reddit Search Result', async () => {
  cache.clear();
  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = 'mock_id';
  env.redditClientSecret = 'mock_secret';

  const mockFetch = createMockFetch(200, 200, {
    data: {
      children: [
        { data: { title: 'Beware of deceptive-bank.com phishing scam', subreddit: 'NetSec', permalink: '/r/NetSec/comments/123', selftext: 'deceptive-bank.com is attempting credential harvesting' } }
      ]
    }
  });

  const res = await evaluateReddit('deceptive-bank.com', mockFetch);
  env.redditClientId = origId;
  env.redditClientSecret = origSecret;

  assert.equal(res.checked, true);
  assert.equal(res.count, 1);
  assert.equal(res.evidence[0].source, EVIDENCE_SOURCES.REDDIT);
  assert.equal(res.evidence[0].verificationStatus, VERIFICATION_STATUS.UNVERIFIED);
  assert.ok(res.evidence[0].title.includes('r/NetSec'));
});

test('2. Irrelevant Reddit Search Result (Filtered Out)', async () => {
  cache.clear();
  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = 'mock_id';
  env.redditClientSecret = 'mock_secret';

  const mockFetch = createMockFetch(200, 200, {
    data: {
      children: [
        { data: { title: 'Discussion about favorite mechanical keyboards', subreddit: 'Keyboards', permalink: '/r/Keyboards/comments/999', selftext: 'Switches review.' } }
      ]
    }
  });

  const res = await evaluateReddit('specific-domain.com', mockFetch);
  env.redditClientId = origId;
  env.redditClientSecret = origSecret;

  assert.equal(res.checked, true);
  assert.equal(res.count, 0); // Filtered out
});

test('3. No Reddit Search Results', async () => {
  cache.clear();
  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = 'mock_id';
  env.redditClientSecret = 'mock_secret';

  const mockFetch = createMockFetch(200, 200, { data: { children: [] } });

  const res = await evaluateReddit('unknown-site.com', mockFetch);
  env.redditClientId = origId;
  env.redditClientSecret = origSecret;

  assert.equal(res.checked, true);
  assert.equal(res.count, 0);
});

test('4. Missing Reddit API Credentials Fallback', async () => {
  cache.clear();
  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = '';
  env.redditClientSecret = '';

  const res = await evaluateReddit('any-domain.com');
  env.redditClientId = origId;
  env.redditClientSecret = origSecret;

  assert.equal(res.checked, false);
  assert.equal(res.reason, 'UNCONFIGURED_CREDENTIALS');
  assert.equal(res.evidence.length, 0);
});

test('5. Reddit OAuth Token Auth Failure (401)', async () => {
  cache.clear();
  const { clearTokenCache } = require('../src/services/reddit.service');
  clearTokenCache();

  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = 'invalid_id';
  env.redditClientSecret = 'invalid_secret';

  const mockFetch = createMockFetch(401, 200, {});

  const res = await evaluateReddit('auth-fail-domain.com', mockFetch);
  env.redditClientId = origId;
  env.redditClientSecret = origSecret;

  assert.equal(res.checked, false);
  assert.equal(res.reason, 'AUTH_FAILURE_401');
});

test('6. Reddit API Search HTTP 500 Error', async () => {
  cache.clear();
  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = 'mock_id';
  env.redditClientSecret = 'mock_secret';

  const mockFetch = createMockFetch(200, 500, { error: 'Internal Error' });

  const res = await evaluateReddit('server-error-domain.com', mockFetch);
  env.redditClientId = origId;
  env.redditClientSecret = origSecret;

  assert.equal(res.checked, false);
  assert.equal(res.reason, 'HTTP_ERROR_500');
});

test('7. Reddit Cache Behavior', async () => {
  cache.clear();
  const origId = env.redditClientId;
  const origSecret = env.redditClientSecret;
  env.redditClientId = 'mock_id';
  env.redditClientSecret = 'mock_secret';

  let callCount = 0;
  const mockFetch = async (url) => {
    if (url.includes('access_token')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'token_123', expires_in: 3600 }) };
    }
    callCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: { children: [{ data: { title: 'Discussion on cached-domain.com', subreddit: 'sysadmin', permalink: '/r/sysadmin/1' } }] }
      })
    };
  };

  // First lookup -> uncached
  await evaluateReddit('cached-domain.com', mockFetch);
  assert.equal(callCount, 1);

  // Second lookup -> cached
  await evaluateReddit('cached-domain.com', mockFetch);
  assert.equal(callCount, 1);

  env.redditClientId = origId;
  env.redditClientSecret = origSecret;
});
