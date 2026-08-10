/**
 * Cyber Safety Platform - Client Production API Configuration
 * Supports local Vite development proxy and production Cloud API host URLs.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';
