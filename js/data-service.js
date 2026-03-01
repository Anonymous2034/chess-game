// Data service — self-hosted backend + localStorage fallback
import { apiFetch } from './api-client.js';

export class DataService {
  constructor(auth) {
    this.auth = auth; // AuthManager instance
  }

  _isOnline() {
    return this.auth && this.auth.isLoggedIn();
  }

  _uid() {
    return this.auth?.user?.id;
  }

  // === Stats ===

  async saveStats(statsData) {
    // Always save to localStorage
    try {
      localStorage.setItem('chess_game_stats', JSON.stringify(statsData));
    } catch {}

    if (this._isOnline()) {
      try {
        await apiFetch('/data/stats', {
          method: 'PUT',
          body: JSON.stringify({ data: statsData }),
        });
      } catch (err) {
        console.warn('Failed to save stats to cloud:', err);
      }
    }
  }

  async loadStats() {
    if (this._isOnline()) {
      try {
        const res = await apiFetch('/data/stats');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            try {
              localStorage.setItem('chess_game_stats', JSON.stringify(data));
            } catch {}
            return data;
          }
        }
      } catch (err) {
        console.warn('Failed to load stats from cloud:', err);
      }
    }

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
        await apiFetch('/data/games', {
          method: 'POST',
          body: JSON.stringify({
            opponent: gameData.opponent,
            opponentElo: gameData.opponentElo,
            result: gameData.result,
            pgn: gameData.pgn,
            opening: gameData.opening,
            playerColor: gameData.playerColor,
            moveCount: gameData.moveCount,
            timeControl: gameData.timeControl,
          }),
        });
      } catch (err) {
        console.warn('Failed to save game to cloud:', err);
      }
    }
  }

  async getGames(limitCount = 50) {
    if (this._isOnline()) {
      try {
        const res = await apiFetch(`/data/games?limit=${limitCount}`);
        if (res.ok) {
          const { data } = await res.json();
          return data || [];
        }
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
        await apiFetch('/data/settings', {
          method: 'PUT',
          body: JSON.stringify({ data: settings }),
        });
      } catch (err) {
        console.warn('Failed to save settings to cloud:', err);
      }
    }
  }

  async loadSettings() {
    if (this._isOnline()) {
      try {
        const res = await apiFetch('/data/settings');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            try { localStorage.setItem('chess_app_settings', JSON.stringify(data)); } catch {}
            return data;
          }
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
        await apiFetch('/data/coach-chats', {
          method: 'POST',
          body: JSON.stringify({
            messages: messages.slice(-50),
            gameContext,
          }),
        });
      } catch (err) {
        console.warn('Failed to save coach chat:', err);
      }
    }
  }

  async getCoachChats(limitCount = 20) {
    if (this._isOnline()) {
      try {
        const res = await apiFetch(`/data/coach-chats?limit=${limitCount}`);
        if (res.ok) {
          const { data } = await res.json();
          return data || [];
        }
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
        await apiFetch('/data/tournaments', {
          method: 'PUT',
          body: JSON.stringify({ data: tournamentData }),
        });
      } catch (err) {
        console.warn('Failed to save tournament to cloud:', err);
      }
    }
  }

  async loadTournament() {
    if (this._isOnline()) {
      try {
        const res = await apiFetch('/data/tournaments');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            try { localStorage.setItem('chess_tournament', JSON.stringify(data)); } catch {}
            return data;
          }
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

  // === Migration: move localStorage data to server on first login ===

  async migrateLocalData() {
    if (!this._isOnline()) return;

    try {
      let stats = null;
      let tournament = null;

      try {
        const statsStr = localStorage.getItem('chess_game_stats');
        if (statsStr) stats = JSON.parse(statsStr);
      } catch {}

      try {
        const tournStr = localStorage.getItem('chess_tournament');
        if (tournStr) tournament = JSON.parse(tournStr);
      } catch {}

      await apiFetch('/data/migrate', {
        method: 'POST',
        body: JSON.stringify({ stats, tournament }),
      });
    } catch (err) {
      console.warn('Migration failed:', err);
    }
  }

  // === Admin Methods ===

  async getAllUsers() {
    if (!this._isOnline()) return [];
    try {
      const res = await apiFetch('/admin/users');
      if (res.ok) {
        const { data } = await res.json();
        return data || [];
      }
    } catch (err) {
      console.warn('Failed to fetch all users:', err);
    }
    return [];
  }

  async getUserStats(uid) {
    if (!this._isOnline()) return null;
    try {
      const res = await apiFetch(`/admin/users/${uid}/stats`);
      if (res.ok) {
        const { data } = await res.json();
        return data || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  async getUserGames(uid, limitCount = 50) {
    if (!this._isOnline()) return [];
    try {
      const res = await apiFetch(`/admin/users/${uid}/games?limit=${limitCount}`);
      if (res.ok) {
        const { data } = await res.json();
        return data || [];
      }
    } catch {
      return [];
    }
    return [];
  }
}
