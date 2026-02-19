import axios from 'axios';

declare global {
  interface Window {
    __authFetchWrapped?: boolean;
  }
}

export const applyAuthHeaders = () => {
  const personaId = localStorage.getItem('personaId');
  if (personaId) {
    axios.defaults.headers.common['x-persona-id'] = personaId;
  } else {
    delete axios.defaults.headers.common['x-persona-id'];
  }
};

export const setupAuthFetch = () => {
  if (typeof window === 'undefined' || window.__authFetchWrapped) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const personaId = localStorage.getItem('personaId');
    const headers = new Headers(init.headers || {});

    if (personaId && !headers.has('x-persona-id')) {
      headers.set('x-persona-id', personaId);
    }

    return originalFetch(input, { ...init, headers });
  };

  window.__authFetchWrapped = true;
};
