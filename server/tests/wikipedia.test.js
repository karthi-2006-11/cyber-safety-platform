const test = require('node:test');
const assert = require('node:assert/strict');
const cache = require('../src/utilities/cache');
const { searchWikipedia } = require('../src/services/wikipedia.service');
const { evaluateWikipedia } = require('../src/pipeline/wikipediaEvaluator');
const { EVIDENCE_SOURCES, VERIFICATION_STATUS, RELEVANCE_LEVELS } = require('../../shared/constants');

function createMockFetch(status = 200, responseBody = {}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseBody
  });
}

test('1. Relevant Wikipedia Search Result', async () => {
  cache.clear();
  const mockFetch = createMockFetch(200, {
    query: {
      search: [
        { title: 'Example Corporation', snippet: 'Example Corporation is an online portal for example.com services.', pageid: 12345 }
      ]
    }
  });

  const res = await evaluateWikipedia('example.com', mockFetch);

  assert.equal(res.checked, true);
  assert.equal(res.count, 1);
  assert.equal(res.evidence[0].source, EVIDENCE_SOURCES.WIKIPEDIA);
  assert.equal(res.evidence[0].title, 'Example Corporation');
  assert.equal(res.evidence[0].verificationStatus, VERIFICATION_STATUS.SUPPORTED);
  assert.equal(res.evidence[0].relevance, RELEVANCE_LEVELS.HIGH);
});

test('2. Irrelevant Wikipedia Search Result (Filtered Out)', async () => {
  cache.clear();
  const mockFetch = createMockFetch(200, {
    query: {
      search: [
        { title: 'Unrelated History of Agriculture', snippet: 'Farming techniques in the 18th century.', pageid: 99999 }
      ]
    }
  });

  const res = await evaluateWikipedia('specific-phishing-target.com', mockFetch);

  assert.equal(res.checked, true);
  assert.equal(res.count, 0); // Filtered out due to RELEVANCE_LEVELS.NONE
});

test('3. No Wikipedia Search Results', async () => {
  cache.clear();
  const mockFetch = createMockFetch(200, { query: { search: [] } });

  const res = await evaluateWikipedia('obscure-domain.com', mockFetch);

  assert.equal(res.checked, true);
  assert.equal(res.count, 0);
  assert.equal(res.evidence.length, 0);
});

test('4. Wikipedia API Failure (HTTP 500 Error)', async () => {
  cache.clear();
  const mockFetch = createMockFetch(500, { error: 'Internal Error' });

  const res = await evaluateWikipedia('error-wiki-domain.com', mockFetch);

  assert.equal(res.checked, false);
  assert.equal(res.reason, 'HTTP_ERROR_500');
  assert.equal(res.evidence.length, 0);
});

test('5. Malformed API Response Handling', async () => {
  cache.clear();
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new SyntaxError('Malformed XML/JSON'); }
  });

  const res = await evaluateWikipedia('malformed-wiki-domain.com', mockFetch);

  assert.equal(res.checked, false);
  assert.equal(res.reason, 'NETWORK_FAILURE');
});

test('6. Wikipedia Server Cache Behavior', async () => {
  cache.clear();
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        query: { search: [{ title: 'Example Inc', snippet: 'example.com corporate overview', pageid: 111 }] }
      })
    };
  };

  // First call -> uncached
  await evaluateWikipedia('cached-wiki-domain.com', mockFetch);
  assert.equal(callCount, 1);

  // Second call -> cached (does not invoke mockFetch)
  await evaluateWikipedia('cached-wiki-domain.com', mockFetch);
  assert.equal(callCount, 1);
});
