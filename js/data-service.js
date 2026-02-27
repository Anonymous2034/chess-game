// Data service — abstracts Supabase + localStorage fallback
import { getSupabase } from './supabase-init.js';

export class DataService {
  constructor(auth) {
    this.auth = auth; // AuthManager instance
  }

  _isOnline() {
    return this.auth && this.auth.isLoggedIn() && getSupabase();
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
        const sb = getSupabase();
        await sb.from('user_stats').upsert({
          user_id: this._uid(),
          data: statsData,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save stats to cloud:', err);
      }
    }
  }

  async loadStats() {
    if (this._isOnline()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('user_stats')
          .select('data')
          .eq('user_id', this._uid())
          .single();

        if (data?.data) {
          try {
            localStorage.setItem('chess_game_stats', JSON.stringify(data.data));
          } catch {}
          return data.data;
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
        const sb = getSupabase();
        await sb.from('games').insert({
          user_id: this._uid(),
          opponent: gameData.opponent,
          opponent_elo: gameData.opponentElo,
          result: gameData.result,
          pgn: gameData.pgn,
          opening: gameData.opening,
          player_color: gameData.playerColor,
          move_count: gameData.moveCount,
          time_control: gameData.timeControl
        });
      } catch (err) {
        console.warn('Failed to save game to cloud:', err);
      }
    }
  }

  async getGames(limitCount = 50) {
    if (this._isOnline()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb
          .from('games')
          .select('*')
          .eq('user_id', this._uid())
          .order('created_at', { ascending: false })
          .limit(limitCount);

        if (data) {
          return data.map(g => ({
            id: g.id,
            opponent: g.opponent,
            opponentElo: g.opponent_elo,
            result: g.result,
            pgn: g.pgn,
            opening: g.opening,
            playerColor: g.player_color,
            moveCount: g.move_count,
            timeControl: g.time_control,
            date: g.created_at
          }));
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
        const sb = getSupabase();
        await sb.from('user_settings').upsert({
          user_id: this._uid(),
          data: settings,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save settings to cloud:', err);
      }
    }
  }

  async loadSettings() {
    if (this._isOnline()) {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('user_settings')
          .select('data')
          .eq('user_id', this._uid())
          .single();

        if (data?.data) {
          try { localStorage.setItem('chess_app_settings', JSON.stringify(data.data)); } catch {}
          return data.data;
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
        const sb = getSupabase();
        await sb.from('coach_chats').insert({
          user_id: this._uid(),
          messages: messages.slice(-50),
          game_context: gameContext
        });
      } catch (err) {
        console.warn('Failed to save coach chat:', err);
      }
    }
  }

  async getCoachChats(limitCount = 20) {
    if (this._isOnline()) {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('coach_chats')
          .select('*')
          .eq('user_id', this._uid())
          .order('created_at', { ascending: false })
          .limit(limitCount);

        if (data) {
          return data.map(c => ({
            id: c.id,
            messages: c.messages,
            gameContext: c.game_context,
            date: c.created_at
          }));
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
        const sb = getSupabase();
        await sb.from('tournaments').upsert({
          user_id: this._uid(),
          data: tournamentData,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save tournament to cloud:', err);
      }
    }
  }

  async loadTournament() {
    if (this._isOnline()) {
      try {
        const sb = getSupabase();
        const { data } = await sb
          .from('tournaments')
          .select('data')
          .eq('user_id', this._uid())
          .single();

        if (data?.data) {
          try { localStorage.setItem('chess_tournament', JSON.stringify(data.data)); } catch {}
          return data.data;
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

  // === Migration: move localStorage data to Supabase on first login ===

  async migrateLocalData() {
    if (!this._isOnline()) return;

    const sb = getSupabase();

    // Check if migration already done
    try {
      const { data } = await sb
        .from('migrations')
        .select('user_id')
        .eq('user_id', this._uid())
        .single();
      if (data) return; // Already migrated
    } catch {}

    // Migrate stats
    try {
      const statsStr = localStorage.getItem('chess_game_stats');
      if (statsStr) {
        const stats = JSON.parse(statsStr);
        await sb.from('user_stats').upsert({
          user_id: this._uid(),
          data: stats,
          updated_at: new Date().toISOString()
        });
      }
    } catch {}

    // Migrate tournament
    try {
      const tournStr = localStorage.getItem('chess_tournament');
      if (tournStr) {
        const tourn = JSON.parse(tournStr);
        await sb.from('tournaments').upsert({
          user_id: this._uid(),
          data: tourn,
          updated_at: new Date().toISOString()
        });
      }
    } catch {}

    // Mark as migrated
    try {
      await sb.from('migrations').insert({
        user_id: this._uid()
      });
    } catch {}
  }

  // === Admin Methods ===

  async getAllUsers() {
    if (!this._isOnline()) return [];
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('profiles')
        .select('*');
      if (data) {
        return data.map(p => ({
          uid: p.id,
          displayName: p.display_name,
          email: p.email,
          isAdmin: p.is_admin,
          createdAt: p.created_at
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch all users:', err);
    }
    return [];
  }

  async getUserStats(uid) {
    if (!this._isOnline()) return null;
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from('user_stats')
        .select('data')
        .eq('user_id', uid)
        .single();
      return data?.data || null;
    } catch {
      return null;
    }
  }

  async getUserGames(uid, limitCount = 50) {
    if (!this._isOnline()) return [];
    try {
      const sb = getSupabase();
      const { data } = await sb
        .from('games')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limitCount);

      if (data) {
        return data.map(g => ({
          id: g.id,
          opponent: g.opponent,
          opponentElo: g.opponent_elo,
          result: g.result,
          date: g.created_at
        }));
      }
    } catch {
      return [];
    }
    return [];
  }
}
