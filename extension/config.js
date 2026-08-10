/**
 * Cyber Safety Platform - Extension Production Configuration
 * Configurable source of truth for Extension API host & endpoints.
 * 
 * IMPORTANT:
 * Production URLs below are PLACEHOLDERS.
 * Replace 'https://YOUR-PRODUCTION-API.example.com' with the actual deployed HTTPS API URL before production packaging.
 */

const CONFIG = {
  // Toggle environment: 'development' or 'production'
  ENVIRONMENT: 'development',

  // API host targets
  API_HOSTS: {
    development: 'http://localhost:5000',
    // PLACEHOLDER — replace with the actual deployed HTTPS API URL before production packaging
    production: 'https://YOUR-PRODUCTION-API.example.com'
  },

  // Dashboard host targets
  DASHBOARD_HOSTS: {
    development: 'http://localhost:3000',
    // PLACEHOLDER — replace with the actual deployed dashboard URL before production packaging
    production: 'https://YOUR-PRODUCTION-DASHBOARD.example.com'
  },

  // Active API base URL getter
  get API_BASE_URL() {
    const host = this.API_HOSTS[this.ENVIRONMENT] || this.API_HOSTS.development;
    return `${host}/api/v1`;
  },

  // Active Dashboard URL getter
  get DASHBOARD_URL() {
    return this.DASHBOARD_HOSTS[this.ENVIRONMENT] || this.DASHBOARD_HOSTS.development;
  }
};

// Export for service worker importScripts or module scripts
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
