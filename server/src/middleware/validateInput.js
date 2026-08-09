const { extractDomain } = require('../utilities/urlHelper');

/**
 * Middleware to validate and sanitize domain query parameters or payload bodies.
 */
function validateDomainInput(req, res, next) {
  const target = req.query.domain || req.body.domain || req.body.url;

  if (!target) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: domain or url'
    });
  }

  const normalized = extractDomain(target);
  if (!normalized) {
    return res.status(400).json({
      success: false,
      error: 'Invalid domain or URL format'
    });
  }

  req.normalizedDomain = normalized;
  next();
}

/**
 * Middleware to validate user report submissions.
 */
function validateReportInput(req, res, next) {
  const { domain, category, description } = req.body;

  if (!domain || !category || !description) {
    return res.status(400).json({
      success: false,
      error: 'Report must include domain, category, and description'
    });
  }

  const normalized = extractDomain(domain);
  if (!normalized) {
    return res.status(400).json({
      success: false,
      error: 'Invalid domain format in report'
    });
  }

  req.normalizedDomain = normalized;
  next();
}

module.exports = {
  validateDomainInput,
  validateReportInput
};
