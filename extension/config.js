/**
 * Cyber Safety Platform - Extension Production Configuration
 * Source of truth for Extension API host & endpoints.
 * 
 * Target Production Backend: https://cyber-safety-platform-50px.onrender.com
 * Target Production Client:  https://cyber-safety-platform-client.onrender.com
 */

const CONFIG = {
  // Toggle environment: 'development' or 'production'
  ENVIRONMENT: 'production',

  // API host targets
  API_HOSTS: {
    development: 'http://localhost:5000',
    production: 'https://cyber-safety-platform-50px.onrender.com'
  },

  // Dashboard host targets
  DASHBOARD_HOSTS: {
    development: 'http://localhost:3000',
    production: 'https://cyber-safety-platform-client.onrender.com'
  },

  // Active API base URL getter
  get API_BASE_URL() {
    const host = this.API_HOSTS[this.ENVIRONMENT] || this.API_HOSTS.production;
    return `${host}/api/v1`;
  },

  // Active Dashboard URL getter
  get DASHBOARD_URL() {
    return this.DASHBOARD_HOSTS[this.ENVIRONMENT] || this.DASHBOARD_HOSTS.production;
  }
};

// Export for service worker importScripts or module environments
if (typeof self !== 'undefined') {
  self.CONFIG = CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
