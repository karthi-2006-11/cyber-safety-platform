const crypto = require('crypto');
const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');
const Website = require('../models/Website');
const { REPORT_STATUS, EVIDENCE_TYPES, VERIFICATION_STATUS } = require('../../../shared/constants');
const { normalizeAndValidate } = require('../pipeline/urlNormalizer');

/**
 * Sanitizes input string to prevent XSS injection.
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validates external reference URLs for safety.
 */
function validateReferenceUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const trimmed = urlStr.trim();
  if (trimmed === '') return null;

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const hostname = parsed.hostname.toLowerCase();
    // Block internal IP ranges and localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.')
    ) {
      return null;
    }

    return parsed.toString();
  } catch (err) {
    return null;
  }
}

/**
 * Generates an anonymized reporter hash to track independent reporters without revealing identity.
 */
function generateReporterHash(reporterId, ipAddress = '127.0.0.1') {
  const seed = reporterId ? String(reporterId) : String(ipAddress);
  return 'rep_' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12);
}

/**
 * Submits a new community safety report with optional evidence attachments.
 */
async function submitReport({ domain, category, description, reporterId, reporterIp, evidenceList = [] }) {
  const norm = normalizeAndValidate(domain);
  if (!norm || !norm.domain) {
    throw new Error('INVALID_DOMAIN');
  }

  const cleanDomain = norm.domain;
  const cleanCategory = sanitizeText(category || 'OTHER');
  const cleanDescription = sanitizeText(description || '');
  const reporterHash = generateReporterHash(reporterId, reporterIp);

  // Check or create Website record in DB
  let website = await Website.findOne({ domain: cleanDomain });
  if (!website) {
    website = await Website.create({
      domain: cleanDomain,
      currentStatus: 'UNKNOWN',
      lastAnalyzedAt: new Date()
    });
  }

  // Duplicate Check: Check if same reporterHash already submitted a pending/verified report for this domain
  const existingReport = await UserReport.findOne({
    websiteId: website._id,
    reporterHash,
    status: { $in: [REPORT_STATUS.PENDING, REPORT_STATUS.VERIFIED, REPORT_STATUS.ACTIONED] }
  });

  if (existingReport) {
    return {
      isDuplicate: true,
      report: existingReport,
      message: 'You have already submitted a report for this domain.'
    };
  }

  // Create UserReport record
  const report = await UserReport.create({
    websiteId: website._id,
    domain: cleanDomain,
    reportedBy: reporterId || null,
    reporterHash,
    category: cleanCategory,
    description: cleanDescription,
    status: REPORT_STATUS.PENDING,
    confidenceContribution: 0.1
  });

  // Attach evidence references
  const createdEvidence = [];
  if (Array.isArray(evidenceList) && evidenceList.length > 0) {
    for (const item of evidenceList) {
      const type = item.type && Object.values(EVIDENCE_TYPES).includes(item.type)
        ? item.type
        : EVIDENCE_TYPES.TEXT_EXPLANATION;

      const title = sanitizeText(item.title || 'Report Evidence');
      const content = sanitizeText(item.content || item.description || cleanDescription);
      const referenceUrl = validateReferenceUrl(item.url || item.referenceUrl);

      const evRecord = await Evidence.create({
        reportId: report._id,
        websiteId: website._id,
        type,
        title,
        content,
        referenceUrl,
        verificationStatus: VERIFICATION_STATUS.PENDING,
        isVerified: false
      });
      createdEvidence.push(evRecord);
    }
  }

  return {
    isDuplicate: false,
    report,
    evidence: createdEvidence
  };
}

module.exports = {
  sanitizeText,
  validateReferenceUrl,
  generateReporterHash,
  submitReport
};
