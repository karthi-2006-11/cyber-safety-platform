/**
 * Cyber Safety Platform - Client Production API Configuration
 * Supports local Vite development proxy and production Cloud API host URLs.
 */

function resolveApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (!envUrl) {
    return '/api/v1';
  }

  // Remove trailing slashes
  const cleanUrl = envUrl.replace(/\/+$/, '');

  // If user already included /api/v1 at the end, return cleanUrl
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }

  // Otherwise append /api/v1
  return `${cleanUrl}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl();
