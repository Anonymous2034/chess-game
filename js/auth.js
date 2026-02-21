// Authentication manager — wraps Supabase Auth
import { getSupabase } from './supabase-config.js';

export class AuthManager {
  constructor() {
    this.user = null;
    this.profile = null;
    this.onAuthChange = null; // callback(user)
    this._initialized = false;
  }

  /**
   * Start listening for auth state changes
   */
  init() {
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.onAuthStateChange(async (event, session) => {
      this.user = session?.user || null;
      if (this.user) {
        await this._loadProfile(this.user.id);
      } else {
        this.profile = null;
      }
      this._initialized = true;
      if (this.onAuthChange) this.onAuthChange(this.user);
    });
  }

  /**
   * Register a new user
   */
  async register(email, password, displayName) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    if (error) throw error;
    return data.user;
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase not configured');

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  /**
   * Logout
   */
  async logout() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    if (!this.user) return null;
    return {
      uid: this.user.id,
      email: this.user.email,
      displayName: this.profile?.display_name || this.user.user_metadata?.display_name || this.user.email
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
   * Load profile from profiles table
   */
  async _loadProfile(uid) {
    try {
      const sb = getSupabase();
      if (!sb) return;

      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist — create it
        // (normally the trigger handles this, but fallback just in case)
        this.profile = {
          id: uid,
          display_name: this.user.user_metadata?.display_name || this.user.email,
          email: this.user.email,
          is_admin: false
        };
        await sb.from('profiles').insert(this.profile);
      } else if (data) {
        this.profile = data;
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }

  /**
   * Update display name
   */
  async updateDisplayName(name) {
    const sb = getSupabase();
    if (!sb || !this.user) return;

    await sb.auth.updateUser({ data: { display_name: name } });
    await sb.from('profiles').update({ display_name: name }).eq('id', this.user.id);

    if (this.profile) this.profile.display_name = name;
  }
}
