// Post-match game analysis — evaluates positions and classifies moves

export class GameAnalyzer {
  constructor(engine) {
    this.engine = engine;
    this.analyzing = false;
    this.onProgress = null;  // callback(moveIndex, total)
    this.results = [];       // per-move analysis results
  }

  /**
   * Analyze a complete game.
   * @param {string[]} fens - Array of FEN strings (position before each move)
   * @param {Object[]} moveHistory - Array of chess.js move objects
   * @param {number} depth - Analysis depth
   * @returns {Promise<Object>} Analysis results with per-move classifications
   */
  async analyzeGame(fens, moveHistory, depth = 16) {
    if (!this.engine || !this.engine.ready || this.analyzing) return null;

    this.analyzing = true;
    this.results = [];

    const total = moveHistory.length;

    for (let i = 0; i < total; i++) {
      if (!this.analyzing) break; // cancelled

      if (this.onProgress) this.onProgress(i, total);

      const fen = fens[i]; // position before the move
      const move = moveHistory[i];

      // Analyze the position before this move
      const analysis = await this.engine.analyzePosition(fen, depth);

      // Analyze the position after this move to get its eval
      const afterFen = fens[i + 1];
      const afterAnalysis = await this.engine.analyzePosition(afterFen, depth);

      // Normalize scores to be from the moving player's perspective
      const isWhite = move.color === 'w';
      const bestEval = isWhite ? analysis.score : -analysis.score;
      const playedEval = isWhite ? -afterAnalysis.score : afterAnalysis.score;

      // Centipawn loss: how much worse the played move is vs the best move
      const cpLoss = Math.max(0, bestEval - playedEval);

      // Check if the played move IS the best move
      const playedUCI = move.from + move.to + (move.promotion || '');
      const isBestMove = analysis.bestMove === playedUCI;

      // Classify the move
      const classification = this._classifyMove(cpLoss, isBestMove, bestEval, playedEval);

      this.results.push({
        moveIndex: i,
        move: move.san,
        color: move.color,
        bestMove: analysis.bestMove,
        bestEval: analysis.score,      // from White's perspective (centipawns)
        playedEval: -afterAnalysis.score, // eval after move, from White's perspective
        cpLoss,
        classification,
        isBestMove,
        mate: analysis.mate,
        pv: analysis.pv
      });
    }

    if (this.onProgress) this.onProgress(total, total);
    this.analyzing = false;

    return {
      moves: this.results,
      white: this._computeSummary('w'),
      black: this._computeSummary('b')
    };
  }

  /**
   * Classify a move based on centipawn loss
   */
  _classifyMove(cpLoss, isBestMove, bestEval, playedEval) {
    if (isBestMove) return 'best';

    // Brilliant: played move is a sacrifice that leads to significant advantage
    if (cpLoss <= 10 && playedEval > bestEval - 50 && bestEval > 100) {
      return 'great';
    }

    if (cpLoss <= 20) return 'best';
    if (cpLoss <= 50) return 'good';
    if (cpLoss <= 100) return 'inaccuracy';
    if (cpLoss <= 200) return 'mistake';
    return 'blunder';
  }

  /**
   * Compute accuracy and classification counts for one side
   */
  _computeSummary(color) {
    const moves = this.results.filter(r => r.color === color);
    if (moves.length === 0) return { accuracy: 0, counts: {} };

    const totalCpLoss = moves.reduce((s, m) => s + m.cpLoss, 0);
    const avgCpLoss = totalCpLoss / moves.length;

    // Accuracy formula: similar to chess.com/lichess
    // accuracy = max(0, 100 - avgCpLoss * 0.5)
    const accuracy = Math.max(0, Math.min(100, 100 - avgCpLoss * 0.5));

    const counts = { best: 0, great: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    for (const m of moves) {
      counts[m.classification] = (counts[m.classification] || 0) + 1;
    }

    return { accuracy: Math.round(accuracy * 10) / 10, counts, avgCpLoss: Math.round(avgCpLoss) };
  }

  cancel() {
    this.analyzing = false;
  }
}
