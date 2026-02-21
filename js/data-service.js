// Data service — abstracts Firestore + localStorage fallback
import {
  collection, doc, setDoc, getDoc, getDocs, addDoc,
  query, where, orderBy, limit, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase-config.js';

export class DataService {
  constructor(auth) {
    this.auth = auth; // AuthManager instance
  }

  _isOnline() {
    return this.auth && this.auth.isLoggedIn() && getFirebaseDb();
  }

  _uid() {
    return this.auth?.user?.uid;
  }

  // === Stats ===

  async saveStats(statsData) {
    // Always save to localStorage
    try {
      localStorage.setItem('chess_game_stats', JSON.stringify(statsData));
    } catch {}

    // Also save to Firestore if online
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        await setDoc(doc(db, 'users', this._uid(), 'data', 'stats'), {
          ...statsData,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save stats to cloud:', err);
      }
    }
  }

  async loadStats() {
    // Try cloud first
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, 'users', this._uid(), 'data', 'stats'));
        if (snap.exists()) {
          const cloudData = snap.data();
          // Update localStorage as cache
          try {
            localStorage.setItem('chess_game_stats', JSON.stringify(cloudData));
          } catch {}
          return cloudData;
        }
      } catch (err) {
        console.warn('Failed to load stats from cloud:', err);
      }
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem('chess_game_stats');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // === Games ===

  async saveGame(gameData) {
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        await addDoc(collection(db, 'games'), {
          ...gameData,
          userId: this._uid(),
          date: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save game to cloud:', err);
      }
    }
  }

  async getGames(limitCount = 50) {
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, 'games'),
          where('userId', '==', this._uid()),
          orderBy('date', 'desc'),
          limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Failed to load games from cloud:', err);
      }
    }
    return [];
  }

  // === Settings (theme, coach tier, etc.) ===

  async saveSettings(settings) {
    try {
      localStorage.setItem('chess_app_settings', JSON.stringify(settings));
    } catch {}

    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        await setDoc(doc(db, 'users', this._uid(), 'data', 'settings'), settings);
      } catch (err) {
        console.warn('Failed to save settings to cloud:', err);
      }
    }
  }

  async loadSettings() {
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, 'users', this._uid(), 'data', 'settings'));
        if (snap.exists()) {
          const data = snap.data();
          try { localStorage.setItem('chess_app_settings', JSON.stringify(data)); } catch {}
          return data;
        }
      } catch (err) {
        console.warn('Failed to load settings from cloud:', err);
      }
    }

    try {
      const stored = localStorage.getItem('chess_app_settings');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // === Coach Chat History ===

  async saveCoachChat(messages, gameContext) {
    if (this._isOnline() && messages.length > 0) {
      try {
        const db = getFirebaseDb();
        await addDoc(collection(db, 'coachChats'), {
          userId: this._uid(),
          messages: messages.slice(-50), // Keep last 50
          gameContext,
          date: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save coach chat:', err);
      }
    }
  }

  async getCoachChats(limitCount = 20) {
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        const q = query(
          collection(db, 'coachChats'),
          where('userId', '==', this._uid()),
          orderBy('date', 'desc'),
          limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Failed to load coach chats:', err);
      }
    }
    return [];
  }

  // === Tournament ===

  async saveTournament(tournamentData) {
    try {
      localStorage.setItem('chess_tournament', JSON.stringify(tournamentData));
    } catch {}

    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        await setDoc(doc(db, 'users', this._uid(), 'data', 'tournament'), tournamentData);
      } catch (err) {
        console.warn('Failed to save tournament to cloud:', err);
      }
    }
  }

  async loadTournament() {
    if (this._isOnline()) {
      try {
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, 'users', this._uid(), 'data', 'tournament'));
        if (snap.exists()) {
          const data = snap.data();
          try { localStorage.setItem('chess_tournament', JSON.stringify(data)); } catch {}
          return data;
        }
      } catch (err) {
        console.warn('Failed to load tournament from cloud:', err);
      }
    }

    try {
      const stored = localStorage.getItem('chess_tournament');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // === Migration: move localStorage data to Firestore on first login ===

  async migrateLocalData() {
    if (!this._isOnline()) return;

    const db = getFirebaseDb();

    // Check if migration already done
    try {
      const snap = await getDoc(doc(db, 'users', this._uid(), 'data', 'migrated'));
      if (snap.exists()) return; // Already migrated
    } catch {}

    // Migrate stats
    try {
      const statsStr = localStorage.getItem('chess_game_stats');
      if (statsStr) {
        const stats = JSON.parse(statsStr);
        await setDoc(doc(db, 'users', this._uid(), 'data', 'stats'), {
          ...stats,
          migratedAt: new Date().toISOString()
        });
      }
    } catch {}

    // Migrate tournament
    try {
      const tournStr = localStorage.getItem('chess_tournament');
      if (tournStr) {
        const tourn = JSON.parse(tournStr);
        await setDoc(doc(db, 'users', this._uid(), 'data', 'tournament'), tourn);
      }
    } catch {}

    // Mark as migrated
    try {
      await setDoc(doc(db, 'users', this._uid(), 'data', 'migrated'), {
        migratedAt: new Date().toISOString()
      });
    } catch {}
  }

  // === Admin Methods ===

  async getAllUsers() {
    if (!this._isOnline()) return [];
    try {
      const db = getFirebaseDb();
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    } catch (err) {
      console.warn('Failed to fetch all users:', err);
      return [];
    }
  }

  async getUserStats(uid) {
    if (!this._isOnline()) return null;
    try {
      const db = getFirebaseDb();
      const snap = await getDoc(doc(db, 'users', uid, 'data', 'stats'));
      return snap.exists() ? snap.data() : null;
    } catch {
      return null;
    }
  }

  async getUserGames(uid, limitCount = 50) {
    if (!this._isOnline()) return [];
    try {
      const db = getFirebaseDb();
      const q = query(
        collection(db, 'games'),
        where('userId', '==', uid),
        orderBy('date', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }
}
