// Endgame Trainer — structured endgame practice with engine-validated moves

const STORAGE_KEY = 'chess_endgame_progress';

export class EndgameTrainer {
  constructor() {
    this.positions = [];
    this.loaded = false;
    this.currentPosition = null;
    this.moveIndex = 0;
    this.phase = 'idle'; // idle, solving, review
    this.hintLevel = 0;
    this.failed = false; // true if player made a suboptimal move
    this.progress = this._loadProgress();
  }

  /**
   * Load endgame positions from JSON data file.
   */
  async loadPositions() {
    if (this.loaded) return;
    try {
      const res = await fetch('data/endgames.json');
      this.positions = await res.json();
      this.loaded = true;
    } catch (err) {
      console.error('Failed to load endgame positions:', err);
      this.positions = [];
    }
  }

  /**
   * Get unique categories with counts and completion stats.
   */
  getCategories() {
    const cats = {};
    for (const pos of this.positions) {
      if (!cats[pos.category]) {
        cats[pos.category] = { name: pos.category, count: 0, solved: 0 };
      }
      cats[pos.category].count++;
      if (this.progress.solved[pos.id]) {
        cats[pos.category].solved++;
      }
    }
    return Object.values(cats);
  }

  /**
   * Get positions in a category, sorted by difficulty.
   */
  getPositionsByCategory(category) {
    return this.positions
      .filter(p => p.category === category)
      .sort((a, b) => a.difficulty - b.difficulty);
  }

  /**
   * Get a specific position by ID.
   */
  getPosition(id) {
    return this.positions.find(p => p.id === id) || null;
  }

  /**
   * Get next unsolved position in a category, or first one if all solved.
   */
  getNextUnsolved(category) {
    const positions = this.getPositionsByCategory(category);
    const unsolved = positions.find(p => !this.progress.solved[p.id]);
    return unsolved || positions[0] || null;
  }

  /**
   * Start a position — set up state for a new attempt.
   */
  startPosition(position) {
    this.currentPosition = position;
    this.moveIndex = 0;
    this.phase = 'solving';
    this.hintLevel = 0;
    this.failed = false;

    // Track attempt
    const catStats = this.progress.categoryStats[position.category] || { attempted: 0, solved: 0 };
    catStats.attempted++;
    this.progress.categoryStats[position.category] = catStats;
    this._saveProgress();
  }

  /**
   * Get the player's color from the FEN (side to move).
   */
  getPlayerColor(fen) {
    const parts = fen.split(' ');
    return parts[1] || 'w';
  }

  /**
   * Validate a player's move using engine analysis.
   * Compares the evaluation before and after the move.
   *
   * @param {string} fenBefore - FEN before the player's move
   * @param {string} fenAfter - FEN after the player's move
   * @param {string} playerMove - UCI move string (e.g. 'e2e4')
   * @param {object} engine - Engine instance with analyzePosition()
   * @param {string} playerColor - 'w' or 'b'
   * @returns {Promise<{correct: boolean, bestMove: string, evalBefore: number, evalAfter: number, message: string}>}
   */
  async validateMove(fenBefore, fenAfter, playerMove, engine, playerColor) {
    // Analyze position before move to get best eval
    const analysisBefore = await engine.analyzePosition(fenBefore, 16);
    // Analyze position after move (from opponent's perspective)
    const analysisAfter = await engine.analyzePosition(fenAfter, 16);

    const bestMoveBefore = analysisBefore.bestMove;
    const evalBefore = analysisBefore.mate !== null
      ? (analysisBefore.mate > 0 ? 10000 : -10000)
      : (analysisBefore.score || 0);
    const evalAfterRaw = analysisAfter.mate !== null
      ? (analysisAfter.mate > 0 ? 10000 : -10000)
      : (analysisAfter.score || 0);

    // evalAfter is from opponent's perspective, so negate it
    const evalAfter = -evalAfterRaw;

    // Normalize evaluations relative to the player's perspective
    const playerEvalBefore = playerColor === 'w' ? evalBefore : -evalBefore;
    const playerEvalAfter = playerColor === 'w' ? evalAfter : -evalAfter;

    // Calculate drop
    const drop = playerEvalBefore - playerEvalAfter;

    // Check for mate-related evaluation
    const mateBeforeVal = analysisBefore.mate;
    const mateAfterVal = analysisAfter.mate;

    // If position was winning (mate) and now it's not, that's bad
    if (mateBeforeVal !== null && mateBeforeVal > 0 && playerColor === 'w') {
      if (mateAfterVal === null || mateAfterVal > 0) {
        // After move, opponent can't mate us — still fine
        // But check if we lost the forced mate
        if (mateAfterVal !== null && mateAfterVal > 0) {
          // Opponent has mate? That's very bad
          return {
            correct: false,
            bestMove: bestMoveBefore,
            evalBefore: playerEvalBefore,
            evalAfter: playerEvalAfter,
            message: 'That move loses the win! The best move was ' + bestMoveBefore
          };
        }
      }
    }

    // Threshold: losing more than 200cp from the best is a mistake
    const THRESHOLD = 200;

    // If the player's move matches the engine's best move, it's always correct
    if (playerMove === bestMoveBefore) {
      return {
        correct: true,
        bestMove: bestMoveBefore,
        evalBefore: playerEvalBefore,
        evalAfter: playerEvalAfter,
        message: 'Excellent! That\'s the best move.'
      };
    }

    // Allow moves that don't drop eval significantly
    if (drop <= THRESHOLD) {
      return {
        correct: true,
        bestMove: bestMoveBefore,
        evalBefore: playerEvalBefore,
        evalAfter: playerEvalAfter,
        message: 'Good move! Continue...'
      };
    }

    // The move is suboptimal
    this.failed = true;
    return {
      correct: false,
      bestMove: bestMoveBefore,
      evalBefore: playerEvalBefore,
      evalAfter: playerEvalAfter,
      message: 'Not the best move. Try again!'
    };
  }

  /**
   * Get a hint for the current position.
   * @param {object} engine - Engine instance
   * @param {string} fen - Current position FEN
   * @returns {Promise<{from: string, to: string, level: number}>}
   */
  async getHint(engine, fen) {
    this.hintLevel++;
    const analysis = await engine.analyzePosition(fen, 16);
    if (!analysis.bestMove) return null;

    const from = analysis.bestMove.substring(0, 2);
    const to = analysis.bestMove.substring(2, 4);

    if (this.hintLevel <= 1) {
      // Level 1: highlight the piece to move
      return { from, to: null, level: 1 };
    }
    // Level 2+: highlight source and target
    return { from, to, level: 2 };
  }

  /**
   * Mark the current position as complete.
   */
  completePosition(positionId) {
    if (!positionId) return;

    const position = this.getPosition(positionId);
    if (!position) return;

    if (!this.progress.solved[positionId]) {
      this.progress.solved[positionId] = {
        date: new Date().toISOString(),
        attempts: (this.progress.solved[positionId]?.attempts || 0) + 1,
        failed: this.failed
      };
      this.progress.totalSolved++;

      // Update category stats
      const catStats = this.progress.categoryStats[position.category] || { attempted: 0, solved: 0 };
      catStats.solved++;
      this.progress.categoryStats[position.category] = catStats;

      // Adjust Elo rating
      const posRating = position.rating || 1200;
      const firstTry = !this.failed && this.hintLevel === 0;
      this._adjustRating(posRating, firstTry);
    }

    this.phase = 'review';
    this._saveProgress();
  }

  /**
   * Get a summary of overall progress.
   */
  getProgressSummary() {
    return {
      totalSolved: this.progress.totalSolved,
      totalPositions: this.positions.length,
      categoryStats: this.progress.categoryStats,
      rating: Math.round(this.progress.rating)
    };
  }

  /**
   * Check if a position is solved.
   */
  isSolved(positionId) {
    return !!this.progress.solved[positionId];
  }

  /**
   * Reset progress (for testing).
   */
  resetProgress() {
    this.progress = {
      solved: {},
      categoryStats: {},
      totalSolved: 0,
      rating: 1200
    };
    this._saveProgress();
  }

  // === Private ===

  _adjustRating(positionRating, firstTry) {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (positionRating - this.progress.rating) / 400));
    const score = firstTry ? 1 : 0.5;
    this.progress.rating += K * (score - expected);
    this.progress.rating = Math.max(400, Math.min(3000, this.progress.rating));
  }

  _loadProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          solved: parsed.solved || {},
          categoryStats: parsed.categoryStats || {},
          totalSolved: parsed.totalSolved || 0,
          rating: parsed.rating ?? 1200
        };
      }
    } catch (e) {
      console.warn('Failed to load endgame progress:', e);
    }
    return {
      solved: {},
      categoryStats: {},
      totalSolved: 0,
      rating: 1200
    };
  }

  _saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('Failed to save endgame progress:', e);
    }
  }
}
