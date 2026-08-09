const { analyzeDomain } = require('../pipeline/threatPipeline');

/**
 * Threat Assessment Service (Phase 2 Real Pipeline Foundation)
 * Delegates threat checking to the modular threat analysis pipeline.
 */
async function checkDomainThreat(domainOrUrl) {
  return await analyzeDomain(domainOrUrl);
}

module.exports = {
  checkDomainThreat
};
