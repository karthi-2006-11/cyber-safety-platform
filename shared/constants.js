/**
 * Shared constants and threat classifications for Cyber Safety Platform.
 * 
 * IMPORTANT SECURITY PRINCIPLE:
 * We do NOT mathematically guarantee 100% security or vulnerability.
 * Classification levels reflect evidence-based confidence levels.
 */

const THREAT_LEVELS = Object.freeze({
  SAFE: 'SAFE',
  SUSPICIOUS: 'SUSPICIOUS',
  HIGH_CONFIDENCE_THREAT: 'HIGH_CONFIDENCE_THREAT',
  UNKNOWN: 'UNKNOWN'
});

const REPORT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  REVIEWED: 'REVIEWED',
  ACTIONED: 'ACTIONED',
  REJECTED: 'REJECTED'
});

const EVIDENCE_TYPES = Object.freeze({
  TEXT_DESCRIPTION: 'TEXT_DESCRIPTION',
  URL_REFERENCE: 'URL_REFERENCE',
  SECURITY_ADVISORY: 'SECURITY_ADVISORY'
});

module.exports = {
  THREAT_LEVELS,
  REPORT_STATUS,
  EVIDENCE_TYPES
};
