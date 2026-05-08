const stripTrailingSlash = (url: string) => url.trim().replace(/\/$/, '');

/**
 * Backend API (servidor en red local; ajusta si cambia la IP o el puerto).
 *
 * - Con valor no vacío, esta URL tiene prioridad sobre `VITE_API_BASE_URL` en `.env`.
 * - Pon `''` para usar solo variables de entorno (útil antes de desplegar).
 *
 * Proxy de Vite (`/api` → backend): `vite.config.ts` y `VITE_DEV_PROXY_TARGET` en `.env.development`.
 */
export const MANUAL_API_BASE_URL = 'http://192.168.3.21:4000';

const resolved =
  MANUAL_API_BASE_URL.trim() !== ''
    ? MANUAL_API_BASE_URL
    : (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://192.168.3.21:4000');

export const API_BASE_URL = stripTrailingSlash(resolved);
export const API_PROXY_TARGET = API_BASE_URL;
