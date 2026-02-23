// Player statistics and rating estimation

const STORAGE_KEY = 'chess_game_stats';

export class PlayerStats {
  constructor() {
    this.games = [];
    this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.games = JSON.parse(data);
      }
    } catch {
      this.games = [];
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.games));
    } catch {
      // localStorage full or unavailable
    }
  }

  /**
   * Record a completed game
   */
  recordGame({ opponent, opponentElo, result, opening, playerColor, moveCount, timeControl }) {
    this.games.push({
      opponent,
      opponentElo: opponentElo || 1200,
      result, // 'win', 'loss', 'draw'
      opening: opening || 'Unknown',
      playerColor,
      moveCount,
      timeControl,
      date: new Date().toISOString()
    });
    this._save();
  }

  /**
   * Get overall win/loss/draw record
   */
  getRecord() {
    let wins = 0, losses = 0, draws = 0;
    for (const g of this.games) {
      if (g.result === 'win') wins++;
      else if (g.result === 'loss') losses++;
      else draws++;
    }
    return { wins, losses, draws, total: this.games.length };
  }

  /**
   * Estimate player rating using performance rating formula
   * Requires 10+ games. Returns null if insufficient data.
   */
  estimateRating() {
    if (this.games.length < 10) return null;

    // Use last 30 games for rating estimation
    const recent = this.games.slice(-30);
    const avgOppElo = recent.reduce((s, g) => s + g.opponentElo, 0) / recent.length;
    const wins = recent.filter(g => g.result === 'win').length;
    const losses = recent.filter(g => g.result === 'loss').length;
    const n = recent.length;

    // Performance rating = avgOppElo + 400*(W-L)/N
    const perfRating = Math.round(avgOppElo + 400 * (wins - losses) / n);

    // Clamp to reasonable range
    return Math.max(100, Math.min(3500, perfRating));
  }

  /**
   * Get statistics grouped by opening
   */
  getOpeningStats() {
    const map = {};
    for (const g of this.games) {
      const key = g.opening || 'Unknown';
      if (!map[key]) map[key] = { name: key, wins: 0, losses: 0, draws: 0, total: 0 };
      map[key].total++;
      if (g.result === 'win') map[key].wins++;
      else if (g.result === 'loss') map[key].losses++;
      else map[key].draws++;
    }

    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map(o => ({
        ...o,
        winRate: o.total > 0 ? Math.round((o.wins / o.total) * 100) : 0
      }));
  }

  /**
   * Detect playing style based on game patterns
   * Requires 10+ games. Returns null if insufficient data.
   */
  getPlayingStyle() {
    if (this.games.length < 10) return null;

    const recent = this.games.slice(-20);
    const avgMoves = recent.reduce((s, g) => s + (g.moveCount || 40), 0) / recent.length;
    const winRate = recent.filter(g => g.result === 'win').length / recent.length;
    const drawRate = recent.filter(g => g.result === 'draw').length / recent.length;

    if (avgMoves < 30 && winRate > 0.5) {
      return {
        name: 'Aggressive',
        description: 'You tend to play sharp, tactical games and go for quick victories. You thrive in complicated positions.'
      };
    }
    if (drawRate > 0.3) {
      return {
        name: 'Solid',
        description: 'You play safe, positional chess. You rarely blunder and prefer to grind out advantages slowly.'
      };
    }
    if (avgMoves > 50) {
      return {
        name: 'Endgame Specialist',
        description: 'You excel in long games and endgames. You\'re patient and good at converting small advantages.'
      };
    }
    if (winRate > 0.6) {
      return {
        name: 'Dominant',
        description: 'You consistently outplay your opponents. Your all-around game is strong with few weaknesses.'
      };
    }
    return {
      name: 'Balanced',
      description: 'You have a well-rounded playing style, comfortable in both tactical and positional positions.'
    };
  }

  /**
   * Get recent games list (most recent first)
   */
  getRecentGames(limit = 20) {
    return this.games.slice(-limit).reverse();
  }

  /**
   * Get/set data for cloud sync
   */
  get data() {
    return { games: this.games };
  }

  set data(val) {
    if (val && Array.isArray(val.games)) {
      this.games = val.games;
      this._save();
    }
  }

  /**
   * Clear all stats
   */
  clearAll() {
    this.games = [];
    this._save();
  }
}
