const { normalizeAndValidate } = require('./urlNormalizer');
const { evaluateReputation } = require('./reputationEvaluator');
const { evaluateWebRisk } = require('./webRiskEvaluator');
const { evaluateCommunityReports } = require('./communityReportEvaluator');
const { evaluateWikipedia } = require('./wikipediaEvaluator');
const { evaluateReddit } = require('./redditEvaluator');
const { calculateRisk } = require('./riskCalculator');

/**
 * Main Threat Analysis Pipeline Orchestrator (Phase 4 Architecture)
 * Pipeline Flow:
 * Requested URL/Domain
 *        ↓
 * 1. Normalization & Validation
 *        ↓
 * 2. Local Reputation Lookup (Database)
 *        ↓
 * 3. External Threat Intelligence (Google Web Risk API)
 *        ↓
 * 4. Community Reports & Evidence (UserReport & Evidence)
 *        ↓
 * 5. Public Contextual Evidence (Wikipedia & Reddit)
 *        ↓
 * 6. Risk Calculation & Unified Explainable Decision Response
 */
async function analyzeDomain(rawInput, customFetch = null) {
  // Stage 1: URL Normalization & Validation
  const normalizedContext = normalizeAndValidate(rawInput);
  const domain = normalizedContext.domain;

  // Stage 2: Local Reputation Lookup
  const reputationData = await evaluateReputation(domain);

  // Stage 3: External Threat Intelligence Lookup (Google Web Risk)
  const webRiskData = await evaluateWebRisk(domain, customFetch);

  // Stage 4: Community Reports & Evidence Lookup
  const communityData = await evaluateCommunityReports(domain);

  // Stage 5: Public Contextual Evidence Lookup (Wikipedia & Reddit)
  const wikipediaData = await evaluateWikipedia(domain, customFetch);
  const redditData = await evaluateReddit(domain, customFetch);

  // Stage 6: Risk Calculation & Unified Decision Response
  const decision = calculateRisk(
    domain,
    reputationData,
    webRiskData,
    communityData,
    wikipediaData,
    redditData
  );

  return decision;
}

module.exports = {
  analyzeDomain
};
