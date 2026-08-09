const Website = require('../models/Website');
const UserReport = require('../models/UserReport');
const Evidence = require('../models/Evidence');
const { getDBStatus } = require('../config/db');

// In-memory fallback repository when DB is offline during phase 1 setup
const inMemoryReports = [];

async function submitReport({ domain, category, description, evidenceText }) {
  const dbStatus = getDBStatus();

  if (dbStatus.isConnected) {
    let site = await Website.findOne({ domain });
    if (!site) {
      site = await Website.create({ domain });
    }

    const report = await UserReport.create({
      websiteId: site._id,
      domain,
      category,
      description
    });

    let evidenceObj = null;
    if (evidenceText) {
      evidenceObj = await Evidence.create({
        reportId: report._id,
        websiteId: site._id,
        content: evidenceText
      });
    }

    return {
      success: true,
      report,
      evidence: evidenceObj,
      persistedTo: 'DATABASE'
    };
  }

  // Fallback to in-memory store if DB not available
  const report = {
    id: `mem_report_${Date.now()}`,
    domain,
    category,
    description,
    evidenceText: evidenceText || null,
    createdAt: new Date()
  };
  inMemoryReports.push(report);

  return {
    success: true,
    report,
    persistedTo: 'IN_MEMORY_STUB'
  };
}

async function getReportsForDomain(domain) {
  const dbStatus = getDBStatus();

  if (dbStatus.isConnected) {
    return await UserReport.find({ domain }).sort({ createdAt: -1 });
  }

  return inMemoryReports.filter(r => r.domain === domain);
}

module.exports = {
  submitReport,
  getReportsForDomain
};
