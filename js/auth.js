// Authentication manager — wraps Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase-config.js';

export class AuthManager {
  constructor() {
    this.user = null;
    this.profile = null; // Firestore profile data
    this.onAuthChange = null; // callback(user)
    this._initialized = false;
  }

  /**
   * Start listening for auth state changes
   */
  init() {
    const auth = getFirebaseAuth();
    if (!auth) return;

    onAuthStateChanged(auth, async (user) => {
      this.user = user;
      if (user) {
        await this._loadProfile(user.uid);
      } else {
        this.profile = null;
      }
      this._initialized = true;
      if (this.onAuthChange) this.onAuthChange(user);
    });
  }

  /**
   * Register a new user
   */
  async register(email, password, displayName) {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase not configured');

    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });

    // Create Firestore profile
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'users', credential.user.uid), {
        displayName,
        email,
        createdAt: new Date().toISOString(),
        isAdmin: false
      });
    }

    return credential.user;
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase not configured');

    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  /**
   * Logout
   */
  async logout() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    if (!this.user) return null;
    return {
      uid: this.user.uid,
      email: this.user.email,
      displayName: this.user.displayName || this.user.email
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
    return this.profile?.isAdmin === true;
  }

  /**
   * Load Firestore profile
   */
  async _loadProfile(uid) {
    try {
      const db = getFirebaseDb();
      if (!db) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        this.profile = snap.data();
      } else {
        // Create profile if it doesn't exist
        this.profile = {
          displayName: this.user.displayName || this.user.email,
          email: this.user.email,
          createdAt: new Date().toISOString(),
          isAdmin: false
        };
        await setDoc(doc(db, 'users', uid), this.profile);
      }
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  }

  /**
   * Update display name
   */
  async updateDisplayName(name) {
    const auth = getFirebaseAuth();
    if (!auth || !this.user) return;
    await updateProfile(this.user, { displayName: name });
    const db = getFirebaseDb();
    if (db) {
      await setDoc(doc(db, 'users', this.user.uid), { displayName: name }, { merge: true });
    }
    if (this.profile) this.profile.displayName = name;
  }
}
