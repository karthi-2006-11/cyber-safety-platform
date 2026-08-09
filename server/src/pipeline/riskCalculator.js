const {
  THREAT_LEVELS,
  RISK_LEVELS,
  SIGNAL_SEVERITY,
  EVIDENCE_SOURCES,
  EVIDENCE_SOURCE_TYPES,
  VERIFICATION_STATUS
} = require('../../../shared/constants');

/**
 * Pipeline Stage 6: Risk Calculator & Unified Evidence Assembler
 * Aggregates signals and constructs unified explainable decision object.
 * 
 * Rules:
 * - Wikipedia and Reddit serve as SUPPORTING EVIDENCE / CONTEXT.
 * - Wikipedia / Reddit entries do NOT automatically trigger HIGH_CONFIDENCE_THREAT.
 * - Single unverified PENDING report does NOT automatically trigger HIGH_CONFIDENCE_THREAT.
 * - REJECTED reports contribute 0 weight.
 */
function calculateRisk(
  domain,
  reputationData = {},
  webRiskData = {},
  communityData = {},
  wikipediaData = {},
  redditData = {}
) {
  const allSignals = [
    ...(reputationData.signals || []),
    ...(webRiskData.signals || []),
    ...(communityData.signals || [])
  ];

  const reasons = [];
  let totalScore = 0;
  let hasCriticalThreatSignal = false;

  for (const signal of allSignals) {
    if (signal.weight > 0) {
      totalScore += signal.weight;
      reasons.push(signal.description);
      if (signal.severity === SIGNAL_SEVERITY.CRITICAL || signal.severity === SIGNAL_SEVERITY.HIGH) {
        hasCriticalThreatSignal = true;
      }
    } else if (signal.severity === SIGNAL_SEVERITY.INFO && signal.description) {
      reasons.push(signal.description);
    }
  }

  // Assemble Unified Evidence Array
  const unifiedEvidence = [];

  // 1. Google Web Risk Evidence
  if (webRiskData.checked && webRiskData.matchFound && Array.isArray(webRiskData.threatTypes)) {
    for (const threatType of webRiskData.threatTypes) {
      unifiedEvidence.push({
        source: EVIDENCE_SOURCES.GOOGLE_WEB_RISK,
        sourceType: EVIDENCE_SOURCE_TYPES.SECURITY_INTELLIGENCE,
        title: `Google Web Risk: ${threatType}`,
        url: 'https://webrisk.googleapis.com/',
        excerpt: `Domain flagged as ${threatType} by Google Web Risk Threat Intelligence Engine.`,
        relevance: 'HIGH',
        verificationStatus: VERIFICATION_STATUS.SYSTEM_DETECTED,
        retrievedAt: new Date().toISOString()
      });
    }
  }

  // 2. User Community Evidence
  if (Array.isArray(communityData.evidence)) {
    for (const ev of communityData.evidence) {
      unifiedEvidence.push({
        source: EVIDENCE_SOURCES.COMMUNITY_REPORT,
        sourceType: EVIDENCE_SOURCE_TYPES.USER_REPORT,
        title: `Community Evidence (${ev.type || 'USER_SUBMISSION'})`,
        url: ev.content && ev.content.startsWith('http') ? ev.content : null,
        excerpt: ev.content,
        relevance: 'HIGH',
        verificationStatus: ev.isVerified ? VERIFICATION_STATUS.VERIFIED : VERIFICATION_STATUS.PENDING,
        retrievedAt: new Date().toISOString()
      });
    }
  }

  // 3. Wikipedia Public Contextual Evidence
  if (Array.isArray(wikipediaData.evidence)) {
    for (const item of wikipediaData.evidence) {
      unifiedEvidence.push(item);
    }
  }

  // 4. Reddit Public Contextual Evidence
  if (Array.isArray(redditData.evidence)) {
    for (const item of redditData.evidence) {
      unifiedEvidence.push(item);
    }
  }

  let classification = THREAT_LEVELS.UNKNOWN;
  let riskLevel = RISK_LEVELS.NONE;
  let confidence = 0.50; // Baseline confidence

  // Official Website DB record override if present
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
    // Decision matrix based on aggregated threat intel & community signals
    if (totalScore >= 75 || hasCriticalThreatSignal) {
      classification = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
      riskLevel = RISK_LEVELS.HIGH;
      confidence = 0.90;
    } else if (totalScore >= 35) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.MEDIUM;
      confidence = 0.75;
    } else if (totalScore >= 15) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.LOW;
      confidence = 0.60;
    } else {
      classification = THREAT_LEVELS.UNKNOWN;
      riskLevel = RISK_LEVELS.NONE;
      confidence = 0.50;
      if (reasons.length === 0) {
        reasons.push('No threat indicators or verified reports recorded for this domain.');
      }
    }
  }

  return {
    domain,
    classification,
    riskLevel,
    confidence: Number(confidence.toFixed(2)),
    reasons,
    evidence: unifiedEvidence,
    reports: communityData.reports || [],
    signalsCount: allSignals.length,
    analyzedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateRisk
};
