const threatService = require('../services/threat.service');

/**
 * Endpoint controller to check domain threat status.
 * Query param or body: `domain` or `url`
 */
async function checkThreat(req, res, next) {
  try {
    const domain = req.normalizedDomain;
    const result = await threatService.checkDomainThreat(domain);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkThreat
};
