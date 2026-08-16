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
 * Strict Phase 6 Threat Promotion Rules:
 * 1. Single pending report -> SUSPICIOUS / UNKNOWN, NEVER HIGH_CONFIDENCE_THREAT.
 * 2. Multiple pending reports -> SUSPICIOUS (MEDIUM risk), NEVER HIGH_CONFIDENCE_THREAT.
 * 3. Wikipedia / Reddit context -> SUPPORTING EVIDENCE, NEVER forces HIGH_CONFIDENCE_THREAT.
 * 4. REJECTED reports -> 0 weight.
 * 5. HIGH_CONFIDENCE_THREAT requires:
 *    - DB Record specifying HIGH_CONFIDENCE_THREAT
 *    - Google Web Risk Threat Match (MALWARE / SOCIAL_ENGINEERING / UNWANTED_SOFTWARE)
 *    - Actioned Community Report (actionedReportCount > 0)
 *    - OR Verified Reports + Strong Verified Evidence (score >= 80 & verifiedReportCount >= 2)
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
  let hasCriticalSecurityIntelMatch = false;

  for (const signal of allSignals) {
    if (signal.weight > 0) {
      totalScore += signal.weight;
      reasons.push(signal.description);
      if (signal.severity === SIGNAL_SEVERITY.CRITICAL) {
        hasCriticalSecurityIntelMatch = true;
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
      unifiedEvidence.push(ev);
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
  let confidence = 0.50;

  // 1. Check Official Website DB record override
  const dbStatus = (reputationData.found && reputationData.websiteRecord)
    ? reputationData.websiteRecord.currentStatus
    : null;

  if (dbStatus && dbStatus !== THREAT_LEVELS.UNKNOWN) {
    if (dbStatus === THREAT_LEVELS.HIGH_CONFIDENCE_THREAT) {
      classification = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
      riskLevel = RISK_LEVELS.HIGH;
      confidence = 0.90;
    } else if (dbStatus === THREAT_LEVELS.SUSPICIOUS) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.MEDIUM;
      confidence = 0.75;
    } else if (dbStatus === THREAT_LEVELS.SAFE) {
      if (hasCriticalSecurityIntelMatch) {
        classification = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
        riskLevel = RISK_LEVELS.HIGH;
        confidence = 0.90;
      } else {
        classification = THREAT_LEVELS.SAFE;
        riskLevel = RISK_LEVELS.NONE;
        confidence = 0.85;
      }
    }
  } else {
    // 2. Evaluate Promotion Criteria for HIGH_CONFIDENCE_THREAT
    const isWebRiskMatch = webRiskData.checked && webRiskData.matchFound;
    const isActionedCommunityReport = communityData.actionedReportCount > 0;
    const isVerifiedCommunityPromotion = communityData.verifiedReportCount >= 2 && totalScore >= 80;

    if (hasCriticalSecurityIntelMatch || isWebRiskMatch || isActionedCommunityReport || isVerifiedCommunityPromotion) {
      classification = THREAT_LEVELS.HIGH_CONFIDENCE_THREAT;
      riskLevel = RISK_LEVELS.HIGH;
      confidence = 0.90;
    } else if (totalScore >= 35 || (communityData.pendingReportsCount > 0 && communityData.independentReporterCount >= 2)) {
      classification = THREAT_LEVELS.SUSPICIOUS;
      riskLevel = RISK_LEVELS.MEDIUM;
      confidence = 0.75;
    } else if (totalScore >= 15 || communityData.reportsCount > 0) {
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
