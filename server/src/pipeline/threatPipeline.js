const { normalizeAndValidate } = require('./urlNormalizer');
const { evaluateReputation } = require('./reputationEvaluator');
const { evaluateCommunityReports } = require('./communityReportEvaluator');
const { calculateRisk } = require('./riskCalculator');

/**
 * Main Threat Analysis Pipeline Orchestrator
 * Pipeline Flow:
 * Requested URL/Domain -> Normalization & Validation -> Local Reputation Lookup -> Community Reports -> Risk Calculation -> Explainable Decision
 */
async function analyzeDomain(rawInput) {
  // Stage 1: URL Normalization & Validation
  const normalizedContext = normalizeAndValidate(rawInput);
  const domain = normalizedContext.domain;

  // Stage 2: Existing Local Reputation Lookup
  const reputationData = await evaluateReputation(domain);

  // Stage 3: Existing Community Reports & Evidence Lookup
  const communityData = await evaluateCommunityReports(domain);

  // Stage 4: Risk Calculation & Classification
  const decision = calculateRisk(domain, reputationData, communityData);

  return decision;
}

module.exports = {
  analyzeDomain
};
