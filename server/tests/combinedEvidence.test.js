const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRisk } = require('../src/pipeline/riskCalculator');
const {
  THREAT_LEVELS,
  RISK_LEVELS,
  EVIDENCE_SOURCES,
  VERIFICATION_STATUS
} = require('../../shared/constants');

test('1. Web Risk + Wikipedia Evidence Combination', () => {
  const reputation = { found: false, signals: [] };
  const webRisk = {
    checked: true,
    matchFound: true,
    threatTypes: ['MALWARE'],
    signals: [{
      type: 'EXTERNAL_THREAT_INTEL_MATCH',
      source: 'GOOGLE_WEB_RISK',
      severity: 'CRITICAL',
      weight: 90,
      description: 'Google Web Risk identified this URL as MALWARE'
    }]
  };
  const community = { signals: [], reports: [], evidence: [] };
  const wikipedia = {
    evidence: [{
      source: EVIDENCE_SOURCES.WIKIPEDIA,
      title: 'Malware Site Overview',
      url: 'https://en.wikipedia.org/wiki/Malware_Site',
      excerpt: 'Wikipedia article overview.',
      relevance: 'HIGH',
      verificationStatus: VERIFICATION_STATUS.SUPPORTED
    }]
  };
  const reddit = { evidence: [] };

  const decision = calculateRisk('malware-wiki-domain.com', reputation, webRisk, community, wikipedia, reddit);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.riskLevel, RISK_LEVELS.HIGH);
  assert.equal(decision.evidence.length, 2); // 1 WebRisk + 1 Wikipedia
  assert.ok(decision.evidence.some(e => e.source === EVIDENCE_SOURCES.GOOGLE_WEB_RISK));
  assert.ok(decision.evidence.some(e => e.source === EVIDENCE_SOURCES.WIKIPEDIA));
});

test('2. Web Risk + Reddit Evidence Combination', () => {
  const reputation = { found: false, signals: [] };
  const webRisk = {
    checked: true,
    matchFound: true,
    threatTypes: ['SOCIAL_ENGINEERING'],
    signals: [{
      type: 'EXTERNAL_THREAT_INTEL_MATCH',
      source: 'GOOGLE_WEB_RISK',
      severity: 'CRITICAL',
      weight: 90,
      description: 'Google Web Risk identified this URL as SOCIAL_ENGINEERING'
    }]
  };
  const community = { signals: [], reports: [], evidence: [] };
  const wikipedia = { evidence: [] };
  const reddit = {
    evidence: [{
      source: EVIDENCE_SOURCES.REDDIT,
      title: 'r/NetSec: Phishing Alert',
      url: 'https://reddit.com/r/NetSec/1',
      excerpt: 'Reddit discussion post.',
      relevance: 'HIGH',
      verificationStatus: VERIFICATION_STATUS.UNVERIFIED
    }]
  };

  const decision = calculateRisk('phish-reddit-domain.com', reputation, webRisk, community, wikipedia, reddit);

  assert.equal(decision.classification, THREAT_LEVELS.HIGH_CONFIDENCE_THREAT);
  assert.equal(decision.evidence.length, 2);
  assert.equal(decision.evidence.find(e => e.source === EVIDENCE_SOURCES.REDDIT).verificationStatus, VERIFICATION_STATUS.UNVERIFIED);
});

test('3. Wikipedia Only Evidence (Does NOT force Malicious Classification)', () => {
  const reputation = { found: false, signals: [] };
  const webRisk = { checked: true, matchFound: false, signals: [] };
  const community = { signals: [], reports: [], evidence: [] };
  const wikipedia = {
    evidence: [{
      source: EVIDENCE_SOURCES.WIKIPEDIA,
      title: 'Example Brand Overview',
      url: 'https://en.wikipedia.org/wiki/Example_Brand',
      excerpt: 'Wikipedia article.',
      relevance: 'HIGH',
      verificationStatus: VERIFICATION_STATUS.SUPPORTED
    }]
  };
  const reddit = { evidence: [] };

  const decision = calculateRisk('example-brand.com', reputation, webRisk, community, wikipedia, reddit);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
  assert.equal(decision.evidence.length, 1);
  assert.equal(decision.evidence[0].source, EVIDENCE_SOURCES.WIKIPEDIA);
});

test('4. Reddit Only Evidence (Does NOT force Malicious Classification)', () => {
  const reputation = { found: false, signals: [] };
  const webRisk = { checked: true, matchFound: false, signals: [] };
  const community = { signals: [], reports: [], evidence: [] };
  const wikipedia = { evidence: [] };
  const reddit = {
    evidence: [{
      source: EVIDENCE_SOURCES.REDDIT,
      title: 'r/AskNet: Question on site.com',
      url: 'https://reddit.com/r/AskNet/1',
      excerpt: 'Unverified reddit post.',
      relevance: 'MEDIUM',
      verificationStatus: VERIFICATION_STATUS.UNVERIFIED
    }]
  };

  const decision = calculateRisk('site.com', reputation, webRisk, community, wikipedia, reddit);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.evidence.length, 1);
  assert.equal(decision.evidence[0].verificationStatus, VERIFICATION_STATUS.UNVERIFIED);
});

test('5. Multiple Evidence Sources Combined', () => {
  const reputation = { found: false, signals: [] };
  const webRisk = { checked: true, matchFound: false, signals: [] };
  const community = {
    signals: [{
      type: 'PENDING_COMMUNITY_REPORTS',
      source: 'USER_REPORT_DATABASE',
      severity: 'MEDIUM',
      weight: 45,
      description: '3 pending user reports submitted'
    }],
    reports: [{ category: 'PHISHING', description: 'Scam page', status: 'PENDING' }],
    evidence: [{ type: 'URL_REFERENCE', content: 'https://proof.com', isVerified: false }]
  };
  const wikipedia = {
    evidence: [{
      source: EVIDENCE_SOURCES.WIKIPEDIA,
      title: 'Domain History',
      url: 'https://en.wikipedia.org/wiki/Domain',
      excerpt: 'Public page.',
      relevance: 'MEDIUM',
      verificationStatus: VERIFICATION_STATUS.SUPPORTED
    }]
  };
  const reddit = {
    evidence: [{
      source: EVIDENCE_SOURCES.REDDIT,
      title: 'r/Scams: Discussion on target.com',
      url: 'https://reddit.com/r/Scams/1',
      excerpt: 'User discussion.',
      relevance: 'HIGH',
      verificationStatus: VERIFICATION_STATUS.UNVERIFIED
    }]
  };

  const decision = calculateRisk('target.com', reputation, webRisk, community, wikipedia, reddit);

  assert.equal(decision.classification, THREAT_LEVELS.SUSPICIOUS);
  assert.equal(decision.riskLevel, RISK_LEVELS.MEDIUM);
  assert.equal(decision.evidence.length, 3); // 1 Community + 1 Wikipedia + 1 Reddit
});

test('6. No Evidence Available', () => {
  const reputation = { found: false, signals: [] };
  const webRisk = { checked: true, matchFound: false, signals: [] };
  const community = { signals: [], reports: [], evidence: [] };
  const wikipedia = { evidence: [] };
  const reddit = { evidence: [] };

  const decision = calculateRisk('clean-unknown-site.com', reputation, webRisk, community, wikipedia, reddit);

  assert.equal(decision.classification, THREAT_LEVELS.UNKNOWN);
  assert.equal(decision.riskLevel, RISK_LEVELS.NONE);
  assert.equal(decision.evidence.length, 0);
});
