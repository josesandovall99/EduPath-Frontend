
//Par aq probremos en render
//export const DEFAULT_API_BASE_URL = 'https://edupath-backend-xch1.onrender.com';

//Par aq probremos en local
///PARA EL SERVIDOR DE LA UNIVERSIDAD: http://192.168.3.21:4000
// PARA LOCALHOST: http://localhost:4000
export const DEFAULT_API_BASE_URL = 'http://192.168.3.21:4000';


const rawApiBaseUrl = String((import.meta as any)?.env?.VITE_API_BASE_URL || '').trim();
const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/$/, '');
const isDev = Boolean((import.meta as any)?.env?.DEV);

export const API_BASE_URL = normalizedApiBaseUrl || DEFAULT_API_BASE_URL;
export const API_PROXY_TARGET = normalizedApiBaseUrl || DEFAULT_API_BASE_URL;