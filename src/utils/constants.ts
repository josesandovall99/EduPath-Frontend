const stripTrailingSlash = (url: string) => url.trim().replace(/\/$/, '');

/**
 * URL base del backend.
 *
 * En dev y preview locales → '/api' (proxy de Vite, sin CORS).
 * En producción (Render) → URL absoluta desde VITE_API_BASE_URL.
 *
 * El proxy de Vite reescribe '/api/xxx' → 'http://backend/xxx'
 * desde el servidor de Vite mismo, por lo que el browser nunca
 * habla directamente al backend y CORS no aplica.
 */
const isProduction = import.meta.env.PROD &&
  Boolean(import.meta.env.VITE_API_BASE_URL?.includes('onrender.com'));

export const API_BASE_URL = isProduction
  ? stripTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() || '')
  : '/api';

export const API_PROXY_TARGET = import.meta.env.VITE_API_BASE_URL?.trim() ||
  'http://192.168.3.21:4000';
