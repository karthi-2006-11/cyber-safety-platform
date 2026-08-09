const reportService = require('../services/report.service');

async function createReport(req, res, next) {
  try {
    const domain = req.normalizedDomain;
    const { category, description, evidenceText } = req.body;

    const result = await reportService.submitReport({
      domain,
      category,
      description,
      evidenceText
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const domain = req.normalizedDomain;
    const reports = await reportService.getReportsForDomain(domain);

    res.status(200).json({
      success: true,
      domain,
      count: reports.length,
      reports
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
  getReports
};
