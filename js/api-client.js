// API client — replaces Supabase with self-hosted backend
// Provides apiFetch() with JWT auto-attach and refresh-on-401

const API_BASE = 'https://grandmasters.pmgsinternational.com/api';
const WS_BASE = 'wss://grandmasters.pmgsinternational.com/ws';

const TOKEN_KEY = 'gm_access_token';
const REFRESH_KEY = 'gm_refresh_token';

let _refreshPromise = null;

export function getApiBase() {
  return API_BASE;
}

export function getWsBase() {
  return WS_BASE;
}

export function isBackendConfigured() {
  return true;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshTokenValue() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken, refreshToken) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasTokens() {
  return !!localStorage.getItem(TOKEN_KEY);
}

async function refreshTokens() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) {
    clearTokens();
    return false;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // 401/403 = token genuinely expired, clear session
      // Other errors = server issue, keep tokens and retry later
      if (res.status === 401 || res.status === 403) {
        clearTokens();
      }
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    // Network error (offline, timeout) — don't clear tokens, user can retry
    return false;
  }
}

/**
 * Fetch wrapper that auto-attaches JWT and retries on 401 with refresh.
 * Clears session on unrecoverable auth failure.
 * @param {string} path - API path (e.g. '/auth/me')
 * @param {RequestInit} options - fetch options
 * @param {Function} onSessionExpired - optional callback when session is lost
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}, onSessionExpired = null) {
  const url = `${API_BASE}${path}`;

  // Attach JWT
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!headers['Content-Type'] && options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && localStorage.getItem(REFRESH_KEY)) {
    // Deduplicate concurrent refresh calls
    if (!_refreshPromise) {
      _refreshPromise = refreshTokens().finally(() => { _refreshPromise = null; });
    }

    const refreshed = await _refreshPromise;

    if (refreshed) {
      // Retry with new token
      const newToken = localStorage.getItem(TOKEN_KEY);
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers });
    } else {
      // Session is dead
      if (onSessionExpired) onSessionExpired();
    }
  }

  return res;
}
