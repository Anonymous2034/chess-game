// Authentication manager — self-hosted backend
import { apiFetch, setTokens, clearTokens, hasTokens, getAccessToken, getRefreshTokenValue } from './api-client.js';

export class AuthManager {
  constructor() {
    this.user = null;
    this.profile = null;
    this.onAuthChange = null; // callback(user)
    this.onPasswordRecovery = null; // unused now (no magic link/password reset)
    this._initialized = false;
  }

  /**
   * Check for existing session on startup
   */
  async init() {
    if (!hasTokens()) {
      this._initialized = true;
      if (this.onAuthChange) this.onAuthChange(null);
      return;
    }

    // Try to load profile from stored token
    try {
      const res = await apiFetch('/auth/me', {}, () => this._onSessionExpired());
      if (res.ok) {
        const data = await res.json();
        this.user = {
          id: data.uid,
          email: data.email,
          created_at: data.createdAt,
        };
        this.profile = {
          id: data.uid,
          display_name: data.displayName,
          email: data.email,
          is_admin: data.isAdmin,
        };
      } else {
        clearTokens();
        this.user = null;
        this.profile = null;
      }
    } catch {
      this.user = null;
      this.profile = null;
    }

    this._initialized = true;
    if (this.onAuthChange) this.onAuthChange(this.user);
  }

  /**
   * Register a new user
   */
  async register(email, password, displayName) {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    setTokens(data.accessToken, data.refreshToken);
    this.user = {
      id: data.user.uid,
      email: data.user.email,
      created_at: data.user.createdAt,
    };
    this.profile = {
      id: data.user.uid,
      display_name: data.user.displayName,
      email: data.user.email,
      is_admin: data.user.isAdmin,
    };

    if (this.onAuthChange) this.onAuthChange(this.user);
    return this.user;
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setTokens(data.accessToken, data.refreshToken);
    this.user = {
      id: data.user.uid,
      email: data.user.email,
      created_at: data.user.createdAt,
    };
    this.profile = {
      id: data.user.uid,
      display_name: data.user.displayName,
      email: data.user.email,
      is_admin: data.user.isAdmin,
    };

    if (this.onAuthChange) this.onAuthChange(this.user);
    return this.user;
  }

  /**
   * Login with Google ID token
   */
  async loginWithGoogle(credential) {
    const res = await apiFetch('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google login failed');

    setTokens(data.accessToken, data.refreshToken);
    this.user = {
      id: data.user.uid,
      email: data.user.email,
      created_at: data.user.createdAt,
    };
    this.profile = {
      id: data.user.uid,
      display_name: data.user.displayName,
      email: data.user.email,
      is_admin: data.user.isAdmin,
    };

    if (this.onAuthChange) this.onAuthChange(this.user);
    return this.user;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      const refreshToken = getRefreshTokenValue();
      await apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Always clear locally even if server call fails
    }
    clearTokens();
    this.user = null;
    this.profile = null;
    if (this.onAuthChange) this.onAuthChange(null);
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    if (!this.user) return null;
    return {
      uid: this.user.id,
      email: this.user.email,
      displayName: this.profile?.display_name || this.user.email,
    };
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.user;
  }

  /**
   * Check if current user is admin
   */
  isAdmin() {
    return this.profile?.is_admin === true;
  }

  /**
   * Update display name
   */
  async updateDisplayName(name) {
    if (!this.user) return;

    const res = await apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ displayName: name }),
    });

    if (res.ok && this.profile) {
      this.profile.display_name = name;
    }
  }

  /**
   * Handle session expiry (called by apiFetch on unrecoverable 401)
   */
  _onSessionExpired() {
    this.user = null;
    this.profile = null;
    clearTokens();
    if (this.onAuthChange) this.onAuthChange(null);
  }
}
