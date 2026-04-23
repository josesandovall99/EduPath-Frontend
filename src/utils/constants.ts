export const TIPO_ACTIVIDAD_EJERCICIO_ID = 1;
export const DEFAULT_API_BASE_URL = 'http://localhost:4000';

const rawApiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || '').trim();
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, '');
const isDev = Boolean((import.meta as any)?.env?.DEV);

export const API_BASE_URL = normalizedApiBaseUrl || DEFAULT_API_BASE_URL;
export const API_PROXY_TARGET = normalizedApiBaseUrl || DEFAULT_API_BASE_URL;
