// Achievement system — definitions and unlock tracking

const ACHIEVEMENT_DEFS = [
  // Games
  { id: 'first_win', cat: 'games', name: 'First Blood', desc: 'Win your first game', icon: '⚔️',
    check: s => s.wins >= 1 },
  { id: 'wins_10', cat: 'games', name: 'Rising Star', desc: 'Win 10 games', icon: '⭐',
    check: s => s.wins >= 10 },
  { id: 'wins_50', cat: 'games', name: 'Veteran', desc: 'Win 50 games', icon: '🎖️',
    check: s => s.wins >= 50 },
  { id: 'wins_100', cat: 'games', name: 'Centurion', desc: 'Win 100 games', icon: '🏆',
    check: s => s.wins >= 100 },
  { id: 'games_10', cat: 'games', name: 'Getting Started', desc: 'Play 10 games', icon: '♟️',
    check: s => s.total >= 10 },
  { id: 'games_50', cat: 'games', name: 'Dedicated', desc: 'Play 50 games', icon: '♞',
    check: s => s.total >= 50 },

  // Rating
  { id: 'rating_1200', cat: 'rating', name: 'Club Player', desc: 'Reach 1200 rating', icon: '📊',
    check: s => s.rating >= 1200 },
  { id: 'rating_1400', cat: 'rating', name: 'Competitor', desc: 'Reach 1400 rating', icon: '📈',
    check: s => s.rating >= 1400 },
  { id: 'rating_1600', cat: 'rating', name: 'Expert', desc: 'Reach 1600 rating', icon: '🏅',
    check: s => s.rating >= 1600 },
  { id: 'rating_1800', cat: 'rating', name: 'Master Class', desc: 'Reach 1800 rating', icon: '👑',
    check: s => s.rating >= 1800 },
  { id: 'rating_2000', cat: 'rating', name: 'Grandmaster Level', desc: 'Reach 2000 rating', icon: '🌟',
    check: s => s.rating >= 2000 },

  // Puzzles
  { id: 'puzzles_10', cat: 'puzzles', name: 'Puzzle Solver', desc: 'Solve 10 puzzles', icon: '🧩',
    check: s => s.puzzlesSolved >= 10 },
  { id: 'puzzles_50', cat: 'puzzles', name: 'Puzzle Master', desc: 'Solve 50 puzzles', icon: '🧠',
    check: s => s.puzzlesSolved >= 50 },
  { id: 'puzzles_100', cat: 'puzzles', name: 'Puzzle Legend', desc: 'Solve 100 puzzles', icon: '💡',
    check: s => s.puzzlesSolved >= 100 },

  // Streaks
  { id: 'streak_3', cat: 'streaks', name: 'Hat Trick', desc: 'Win 3 games in a row', icon: '🔥',
    check: s => s.winStreak >= 3 },
  { id: 'streak_5', cat: 'streaks', name: 'On Fire', desc: 'Win 5 games in a row', icon: '🔥',
    check: s => s.winStreak >= 5 },
  { id: 'streak_10', cat: 'streaks', name: 'Unstoppable', desc: 'Win 10 games in a row', icon: '💥',
    check: s => s.winStreak >= 10 },

  // Special
  { id: 'beat_gm', cat: 'special', name: 'Giant Killer', desc: 'Beat a Grandmaster bot', icon: '👊',
    check: s => !!s.beatGM },
  { id: 'beat_machine', cat: 'special', name: 'Man vs Machine', desc: 'Beat a Machine bot', icon: '🤖',
    check: s => !!s.beatMachine },
  { id: 'checkmate_win', cat: 'special', name: 'Checkmate!', desc: 'Win by checkmate', icon: '♚',
    check: s => !!s.checkmateWin },
  { id: 'time_win', cat: 'special', name: 'Time Pressure', desc: 'Win on time', icon: '⏱️',
    check: s => !!s.timeWin },
  { id: 'endgames_10', cat: 'special', name: 'Endgame Scholar', desc: 'Solve 10 endgame positions', icon: '♔',
    check: s => s.endgamesSolved >= 10 },
];

const STORAGE_KEY = 'chess_achievements';

export class AchievementManager {
  constructor() {
    this._unlocked = {};
    this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) this._unlocked = JSON.parse(data);
    } catch {
      this._unlocked = {};
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._unlocked));
    } catch { /* ignore */ }
  }

  /**
   * Check all achievements against a snapshot.
   * Returns array of newly unlocked achievements.
   */
  checkAll(snapshot) {
    const newlyUnlocked = [];
    for (const def of ACHIEVEMENT_DEFS) {
      if (this._unlocked[def.id]) continue;
      try {
        if (def.check(snapshot)) {
          this._unlocked[def.id] = Date.now();
          newlyUnlocked.push(def);
        }
      } catch { /* ignore bad check */ }
    }
    if (newlyUnlocked.length > 0) this._save();
    return newlyUnlocked;
  }

  /**
   * Returns all achievement defs with unlock status.
   */
  getAll() {
    return ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      unlocked: !!this._unlocked[def.id],
      unlockedAt: this._unlocked[def.id] || null
    }));
  }
}
