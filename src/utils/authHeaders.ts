import axios from 'axios';

declare global {
  interface Window {
    __authFetchWrapped?: boolean;
  }
}

export const applyAuthHeaders = () => {
  const personaId = localStorage.getItem('personaId');
  const authToken = localStorage.getItem('authToken');

  if (personaId) {
    axios.defaults.headers.common['x-persona-id'] = personaId;
  } else {
    delete axios.defaults.headers.common['x-persona-id'];
  }

  if (authToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

export const setupAuthFetch = () => {
  if (typeof window === 'undefined' || window.__authFetchWrapped) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const personaId = localStorage.getItem('personaId');
    const authToken = localStorage.getItem('authToken');
    const headers = new Headers(init.headers || {});
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const isBackendRequest =
      requestUrl.startsWith('http://localhost:4000') ||
      requestUrl.startsWith('http://127.0.0.1:4000') ||
      requestUrl.startsWith('/api');
    const requestMethod = (init.method || 'GET').toUpperCase();

    if (personaId && !headers.has('x-persona-id')) {
      headers.set('x-persona-id', personaId);
    }

    if (authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }

    return originalFetch(input, {
      ...init,
      headers,
      cache: isBackendRequest && requestMethod === 'GET' ? 'no-store' : init.cache,
      credentials: init.credentials ?? (isBackendRequest ? 'include' : undefined)
    });
  };

  window.__authFetchWrapped = true;
};
