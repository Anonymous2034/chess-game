// Puzzle mode — tactical puzzle trainer with progress tracking

const STORAGE_KEY = 'chess_puzzle_progress';

export class PuzzleManager {
  constructor() {
    this.puzzles = [];
    this.loaded = false;
    this.currentPuzzle = null;
    this.moveIndex = 0;       // index into currentPuzzle.moves (0 = setup move)
    this.solved = false;
    this.failed = false;      // true if player made a wrong move (breaks streak)
    this.hintsUsed = 0;

    this.progress = {
      solved: [],       // array of solved puzzle IDs
      rating: 1200,
      streak: 0,
      bestStreak: 0,
      totalSolved: 0
    };

    this._loadProgress();
  }

  /**
   * Load puzzles from the JSON data file.
   */
  async loadPuzzles() {
    if (this.loaded) return;
    try {
      const res = await fetch('data/puzzles.json');
      this.puzzles = await res.json();
      this.loaded = true;
    } catch (err) {
      console.error('Failed to load puzzles:', err);
      this.puzzles = [];
    }
  }

  /**
   * Get a random unsolved puzzle matching the given filters.
   * @param {object} filters - { theme: string, difficulty: string }
   * @returns {object|null} puzzle object or null
   */
  getPuzzle(filters = {}) {
    let candidates = this.puzzles.filter(p => !this.progress.solved.includes(p.id));

    // If all puzzles solved, allow replaying
    if (candidates.length === 0) {
      candidates = [...this.puzzles];
    }

    // Theme filter
    if (filters.theme && filters.theme !== 'all') {
      candidates = candidates.filter(p => p.themes.includes(filters.theme));
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      const ranges = {
        beginner: [0, 1200],
        intermediate: [1200, 1600],
        advanced: [1600, 2000],
        expert: [2000, 9999]
      };
      const [min, max] = ranges[filters.difficulty] || [0, 9999];
      candidates = candidates.filter(p => p.rating >= min && p.rating < max);
    }

    if (candidates.length === 0) return null;

    // Pick a random one
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Get the daily puzzle (same puzzle for the same date).
   */
  getDailyPuzzle() {
    if (this.puzzles.length === 0) return null;
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % this.puzzles.length;
    return this.puzzles[index];
  }

  /**
   * Start a puzzle — reset state for a new puzzle attempt.
   */
  startPuzzle(puzzle) {
    this.currentPuzzle = puzzle;
    this.moveIndex = 0;  // will be incremented after setup move
    this.solved = false;
    this.failed = false;
    this.hintsUsed = 0;
  }

  /**
   * Get the setup move (first move, auto-played by opponent).
   * Returns { from, to, promotion } parsed from UCI.
   */
  getSetupMove() {
    if (!this.currentPuzzle || this.currentPuzzle.moves.length === 0) return null;
    return this._parseUCI(this.currentPuzzle.moves[0]);
  }

  /**
   * Advance past the setup move (call after it's been played).
   */
  advancePastSetup() {
    this.moveIndex = 1;
  }

  /**
   * Get the color the player needs to play as.
   * This is the side to move AFTER the setup move.
   * @param {string} fen - the starting FEN of the puzzle
   */
  getPlayerColor(fen) {
    // The FEN tells us who moves first. After the setup move, it's the other side.
    const parts = fen.split(' ');
    const sideToMove = parts[1]; // 'w' or 'b'
    return sideToMove === 'w' ? 'b' : 'w'; // player plays the OTHER side after setup
  }

  /**
   * Validate a player's move against the expected solution.
   * @returns 'correct' | 'wrong' | 'complete'
   */
  validateMove(from, to, promotion) {
    if (!this.currentPuzzle) return 'wrong';

    const expected = this.currentPuzzle.moves[this.moveIndex];
    if (!expected) return 'wrong';

    const expectedParsed = this._parseUCI(expected);
    const moveMatches = from === expectedParsed.from &&
                        to === expectedParsed.to &&
                        ((!promotion && !expectedParsed.promotion) ||
                         promotion === expectedParsed.promotion);

    if (!moveMatches) {
      this.failed = true;
      return 'wrong';
    }

    this.moveIndex++;

    // Check if this was the last move in the solution
    if (this.moveIndex >= this.currentPuzzle.moves.length) {
      return 'complete';
    }

    return 'correct';
  }

  /**
   * Get the next opponent move (after player's correct move).
   * Returns { from, to, promotion } or null if no more moves.
   */
  getNextOpponentMove() {
    if (!this.currentPuzzle || this.moveIndex >= this.currentPuzzle.moves.length) return null;
    const move = this._parseUCI(this.currentPuzzle.moves[this.moveIndex]);
    this.moveIndex++;
    return move;
  }

  /**
   * Get a hint for the current move.
   * @param {number} level - 1 = highlight piece to move, 2 = highlight target square
   */
  getHint(level) {
    if (!this.currentPuzzle || this.moveIndex >= this.currentPuzzle.moves.length) return null;

    const expected = this._parseUCI(this.currentPuzzle.moves[this.moveIndex]);
    this.hintsUsed++;

    if (level <= 1) {
      return { type: 'piece', square: expected.from };
    }
    return { type: 'target', square: expected.to };
  }

  /**
   * Mark the current puzzle as complete and update progress.
   */
  completePuzzle() {
    if (!this.currentPuzzle) return;

    this.solved = true;
    const firstTry = !this.failed;
    const puzzleId = this.currentPuzzle.id;
    const puzzleRating = this.currentPuzzle.rating;

    // Track solved
    if (!this.progress.solved.includes(puzzleId)) {
      this.progress.solved.push(puzzleId);
      this.progress.totalSolved++;
    }

    // Update streak
    if (firstTry && this.hintsUsed === 0) {
      this.progress.streak++;
      if (this.progress.streak > this.progress.bestStreak) {
        this.progress.bestStreak = this.progress.streak;
      }
    } else {
      this.progress.streak = 0;
    }

    // Adjust rating
    this._adjustRating(puzzleRating, firstTry);

    this._saveProgress();
  }

  /**
   * Get progress summary for display.
   */
  getProgressSummary() {
    return {
      totalSolved: this.progress.totalSolved,
      rating: Math.round(this.progress.rating),
      streak: this.progress.streak,
      bestStreak: this.progress.bestStreak
    };
  }

  // === Private ===

  _parseUCI(uci) {
    return {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined
    };
  }

  _adjustRating(puzzleRating, firstTry) {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (puzzleRating - this.progress.rating) / 400));
    const score = firstTry ? 1 : 0.5;
    this.progress.rating += K * (score - expected);
    this.progress.rating = Math.max(400, Math.min(3000, this.progress.rating));
  }

  _loadProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        Object.assign(this.progress, JSON.parse(data));
      }
    } catch (e) {
      console.warn('Failed to load puzzle progress:', e);
    }
  }

  _saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Failed to save puzzle progress:', e);
    }
  }
}
