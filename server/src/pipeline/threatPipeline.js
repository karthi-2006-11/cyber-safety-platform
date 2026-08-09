const { normalizeAndValidate } = require('./urlNormalizer');
const { evaluateReputation } = require('./reputationEvaluator');
const { evaluateWebRisk } = require('./webRiskEvaluator');
const { evaluateCommunityReports } = require('./communityReportEvaluator');
const { calculateRisk } = require('./riskCalculator');

/**
 * Main Threat Analysis Pipeline Orchestrator (Phase 3 Architecture)
 * Pipeline Flow:
 * Requested URL/Domain
 *        ↓
 * 1. Normalization & Validation
 *        ↓
 * 2. Local Reputation Lookup (Database)
 *        ↓
 * 3. External Threat Intelligence (Google Web Risk API)
 *        ↓
 * 4. Community Reports & Evidence
 *        ↓
 * 5. Risk Calculation & Explainable Decision Response
 */
async function analyzeDomain(rawInput, customFetch = null) {
  // Stage 1: URL Normalization & Validation
  const normalizedContext = normalizeAndValidate(rawInput);
  const domain = normalizedContext.domain;

  // Stage 2: Local Reputation Lookup
  const reputationData = await evaluateReputation(domain);

  // Stage 3: External Threat Intelligence Lookup (Google Web Risk)
  const webRiskData = await evaluateWebRisk(domain, customFetch);

  // Stage 4: Existing Community Reports & Evidence Lookup
  const communityData = await evaluateCommunityReports(domain);

  // Stage 5: Risk Calculation & Explainable Decision
  const decision = calculateRisk(domain, reputationData, webRiskData, communityData);

  return decision;
}

module.exports = {
  analyzeDomain
};
