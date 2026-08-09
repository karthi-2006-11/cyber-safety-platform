const { THREAT_LEVELS, RISK_LEVELS, SIGNAL_SEVERITY } = require('../../../shared/constants');

/**
 * Pipeline Stage 4: Risk Calculator
 * Transparently aggregates all collected threat signals into an explainable decision.
 * 
 * Rules:
 * - Never claims 100% mathematical certainty.
 * - Single unverified PENDING report does NOT automatically classify a site as HIGH_CONFIDENCE_THREAT.
 * - REJECTED reports contribute 0 weight.
 */
function calculateRisk(domain, reputationData, communityData) {
  const allSignals = [
    ...(reputationData.signals || []),
    ...(communityData.signals || [])
  ];

  const reasons = [];
  let totalScore = 0;

  for (const signal of allSignals) {
    if (signal.weight > 0) {
      totalScore += signal.weight;
      reasons.push(signal.description);
    } else if (signal.severity === SIGNAL_SEVERITY.INFO && signal.description) {
      // Include informational notes (e.g. rejected reports notice)
      reasons.push(signal.description);
    }
  }

  let classification = THREAT_LEVELS.UNKNOWN;
  let riskLevel = RISK_LEVELS.NONE;
  let confidence = 0.50; // Default baseline confidence

  // Official Website record override if present
  if (reputationData.found && reputationData.websiteRecord) {
    const dbStatus = reputationData.websiteRecord.currentStatus;
    if (dbStatus === THREAT_LEVELS.HIGH_CONFIDENCE_THREAT) {
      classification = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
      riskLevel = RISK_LEVELS.HIGH;
      confidence = 0.90;
    } else if (dbStatus === THREAT_LEVELS.SUSPICIOUS) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.MEDIUM;
      confidence = 0.75;
    } else if (dbStatus === THREAT_LEVELS.SAFE) {
      classification = THREAT_LEVELS.SAFE;
      riskLevel = RISK_LEVELS.NONE;
      confidence = 0.85;
    }
  } else {
    // Decision matrix based on aggregated community signals
    if (totalScore >= 75) {
      classification = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
      riskLevel = RISK_LEVELS.HIGH;
      confidence = 0.85;
    } else if (totalScore >= 35) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.MEDIUM;
      confidence = 0.70;
    } else if (totalScore >= 15) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.LOW;
      confidence = 0.60;
    } else {
      classification = THREAT_LEVELS.UNKNOWN;
      riskLevel = RISK_LEVELS.NONE;
      confidence = 0.50;
      reasons.push('No threat indicators or verified reports recorded for this domain.');
    }
  }

  return {
    domain,
    classification,
    riskLevel,
    confidence: Number(confidence.toFixed(2)),
    reasons,
    evidence: communityData.evidence || [],
    reports: communityData.reports || [],
    signalsCount: allSignals.length,
    analyzedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateRisk
};
