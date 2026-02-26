// Player profile — avatar, display name, rating history

const STORAGE_KEY = 'chess_player_profile';

const AVATARS = [
  'img/avatars/king.svg', 'img/avatars/queen.svg', 'img/avatars/rook.svg',
  'img/avatars/bishop.svg', 'img/avatars/knight.svg', 'img/avatars/pawn.svg',
  'img/avatars/crown.svg', 'img/avatars/shield.svg', 'img/avatars/sword.svg',
  'img/avatars/star.svg', 'img/avatars/flame.svg', 'img/avatars/lightning.svg'
];

export class PlayerProfile {
  constructor() {
    this.avatar = 'img/avatars/knight.svg';
    this.displayName = 'Player';
    this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.avatar = parsed.avatar || this.avatar;
        this.displayName = parsed.displayName || this.displayName;
      }
    } catch { /* ignore */ }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        avatar: this.avatar,
        displayName: this.displayName
      }));
    } catch { /* ignore */ }
  }

  getAvatar() { return this.avatar; }

  setAvatar(path) {
    this.avatar = path;
    this._save();
  }

  getDisplayName() { return this.displayName; }

  setDisplayName(name) {
    this.displayName = name || 'Player';
    this._save();
  }

  static getAvatarList() {
    return AVATARS;
  }

  /**
   * Compute rolling Elo rating from game history.
   * Starts at 1200, applies K=32 adjustment per game.
   * Returns array of { date, rating } points.
   */
  getRatingHistory(games) {
    if (!games || games.length === 0) return [];

    let rating = 1200;
    const history = [{ date: null, rating }];

    for (const g of games) {
      const oppElo = g.opponentElo || 1200;
      const expected = 1 / (1 + Math.pow(10, (oppElo - rating) / 400));
      let score;
      if (g.result === 'win') score = 1;
      else if (g.result === 'draw') score = 0.5;
      else score = 0;

      rating = Math.round(rating + 32 * (score - expected));
      rating = Math.max(400, Math.min(3000, rating));
      history.push({ date: g.date, rating });
    }

    return history;
  }

  /**
   * Get current computed rating from game history
   */
  getCurrentRating(games) {
    const history = this.getRatingHistory(games);
    return history.length > 0 ? history[history.length - 1].rating : 1200;
  }

  /**
   * Compute an overall rating blending game, puzzle, and endgame ratings.
   * Weights: games 50%, puzzles 30%, endgames 20%.
   * Components with no activity are excluded and weights redistributed.
   * @param {object} params - { gameRating, gameCount, puzzleRating, puzzleSolved, endgameRating, endgameSolved }
   * @returns {{ overall: number, components: object[] }}
   */
  getOverallRating({ gameRating, gameCount, puzzleRating, puzzleSolved, endgameRating, endgameSolved }) {
    const components = [];
    if (gameCount >= 1)    components.push({ name: 'Game',    rating: gameRating,    weight: 50 });
    if (puzzleSolved >= 1) components.push({ name: 'Puzzle',  rating: puzzleRating,  weight: 30 });
    if (endgameSolved >= 1) components.push({ name: 'Endgame', rating: endgameRating, weight: 20 });

    if (components.length === 0) return { overall: 1200, components: [] };

    const totalWeight = components.reduce((s, c) => s + c.weight, 0);
    let overall = 0;
    for (const c of components) {
      c.pct = Math.round((c.weight / totalWeight) * 100);
      overall += c.rating * (c.weight / totalWeight);
    }
    return { overall: Math.round(overall), components };
  }
}
