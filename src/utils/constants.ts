const stripTrailingSlash = (url: string) => url.trim().replace(/\/$/, '');

/**
 * Cambiar backend con una sola línea:
 * - Pon aquí la URL (ej. `http://localhost:4000` o la URL de Render).
 * - Déjalo en cadena vacía `''` para usar solo `.env`: `VITE_API_BASE_URL`
 *   (`npm run dev` → `.env.development`; `npm run build` → `.env.production`).
 *
 * Si ves siempre el servidor de Render aunque edites esto: casi seguro estás en
 * `npm run preview` / `npm start` (build de producción). Para backend local usa `npm run dev`.
 */
export const MANUAL_API_BASE_URL = 'http://192.168.3.21:4000';

const resolved =
  MANUAL_API_BASE_URL.trim() !== ''
    ? MANUAL_API_BASE_URL
    : (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://192.168.3.21:4000');

export const API_BASE_URL = stripTrailingSlash(resolved);
export const API_PROXY_TARGET = API_BASE_URL;
