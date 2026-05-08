import axios from 'axios';
import { API_BASE_URL, API_PROXY_TARGET } from './constants';

declare global {
  interface Window {
    __authFetchWrapped?: boolean;
    __edupathAuthExpiredHandled?: boolean;
  }
}

const clearStoredAuthState = () => {
  localStorage.removeItem('estudianteId');
  localStorage.removeItem('codigoEstudiante');
  localStorage.removeItem('nombreEstudiante');
  localStorage.removeItem('semestreEstudiante');
  localStorage.removeItem('adminId');
  localStorage.removeItem('personaId');
  localStorage.removeItem('authToken');
  localStorage.removeItem('adminSession');
  localStorage.removeItem('docenteSession');
  localStorage.removeItem('appActiveRole');
  localStorage.removeItem('appNavigationState');
  localStorage.removeItem('adminDashboardState');
  applyAuthHeaders();
};

export const applyAuthHeaders = () => {
  const authToken = localStorage.getItem('authToken');

  if (authToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const buildAuthHeaders = (headers: HeadersInit = {}) => {
  const authToken = localStorage.getItem('authToken');
  return {
    ...headers,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };
};

export const setupAuthFetch = () => {
  if (typeof window === 'undefined' || window.__authFetchWrapped) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const authToken = localStorage.getItem('authToken');
    const headers = new Headers(init.headers || {});
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const isBackendRequest =
      requestUrl.startsWith(API_BASE_URL) ||
      requestUrl.startsWith(API_PROXY_TARGET) ||
      requestUrl.startsWith('http://localhost:4000') ||
      requestUrl.startsWith('http://127.0.0.1:4000') ||
      requestUrl.startsWith('http://192.168.3.21:4000') ||
      requestUrl.startsWith('/api');
    const requestMethod = (init.method || 'GET').toUpperCase();

    if (authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    return originalFetch(input, {
      ...init,
      headers,
      cache: isBackendRequest && requestMethod === 'GET' ? 'no-store' : init.cache,
      credentials: init.credentials ?? (isBackendRequest ? 'include' : undefined)
    }).then((response) => {
      const isAuthEndpoint = /\/login|\/forgot|\/reset/i.test(requestUrl);
      if (response.status === 401 && isBackendRequest && !isAuthEndpoint && !window.__edupathAuthExpiredHandled) {
        window.__edupathAuthExpiredHandled = true;
        clearStoredAuthState();
        window.dispatchEvent(new CustomEvent('edupath:auth-expired'));
      }

      if (response.status !== 401) {
        window.__edupathAuthExpiredHandled = false;
      }

      return response;
    });
  };

  window.__authFetchWrapped = true;
};
