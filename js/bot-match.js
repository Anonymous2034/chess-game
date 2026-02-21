// Bot vs Bot match simulation
// Plays an entire game between two bots using the engine, then returns the result for replay

export class BotMatch {
  constructor(engine) {
    this.engine = engine;
    this.simulating = false;
    this.onProgress = null; // callback(moveNum, fen)
  }

  /**
   * Simulate a complete game between two bots.
   * @param {Object} white - Bot personality object for white
   * @param {Object} black - Bot personality object for black
   * @returns {Promise<{moves: Object[], fens: string[], result: string, pgn: string}>}
   */
  async simulate(white, black) {
    if (this.simulating) throw new Error('Simulation already in progress');
    if (!this.engine || !this.engine.ready) throw new Error('Engine not ready');

    this.simulating = true;

    const chess = new Chess();
    const moves = [];
    const fens = [chess.fen()];
    const MAX_MOVES = 200;

    try {
      this.engine.send('ucinewgame');
      this.engine.send('isready');
      // Wait for ready
      await this._waitReady();

      while (!chess.game_over() && moves.length < MAX_MOVES) {
        const currentBot = chess.turn() === 'w' ? white : black;

        // Apply personality
        this.engine.applyPersonality(currentBot);

        // Get engine move
        const uciMove = await this._getEngineMove(chess.fen(), currentBot);
        if (!uciMove) break;

        // Parse UCI move
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

        // Make the move
        const move = chess.move({ from, to, promotion });
        if (!move) break;

        moves.push(move);
        fens.push(chess.fen());

        if (this.onProgress) {
          this.onProgress(moves.length, chess.fen());
        }
      }

      // Determine result
      let result = '1/2-1/2';
      if (chess.in_checkmate()) {
        result = chess.turn() === 'w' ? '0-1' : '1-0';
      }

      // Build simple PGN
      let pgn = `[White "${white.name}"]\n[Black "${black.name}"]\n[Result "${result}"]\n\n`;
      for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 0) pgn += `${Math.floor(i / 2) + 1}. `;
        pgn += moves[i].san + ' ';
      }
      pgn += result;

      return { moves, fens, result, pgn };
    } finally {
      this.simulating = false;
    }
  }

  /**
   * Get engine move for current position
   */
  _getEngineMove(fen, bot) {
    return new Promise((resolve) => {
      const originalHandler = this.engine.worker.onmessage;

      this.engine.worker.onmessage = (e) => {
        const msg = typeof e.data === 'string' ? e.data : String(e.data);

        if (msg.startsWith('bestmove')) {
          const parts = msg.split(' ');
          const bestMove = parts[1];
          this.engine.worker.onmessage = originalHandler;
          this.engine.thinking = false;

          if (bestMove && bestMove !== '(none)' && bestMove !== '0000') {
            resolve(bestMove);
          } else {
            resolve(null);
          }
        }
      };

      this.engine.thinking = true;
      this.engine.send('position fen ' + fen);

      if (bot.moveTime) {
        this.engine.send(`go movetime ${bot.moveTime}`);
      } else {
        this.engine.send(`go depth ${bot.searchDepth || this.engine.depth}`);
      }
    });
  }

  /**
   * Wait for engine to be ready
   */
  _waitReady() {
    return new Promise((resolve) => {
      const originalHandler = this.engine.worker.onmessage;
      this.engine.worker.onmessage = (e) => {
        const msg = typeof e.data === 'string' ? e.data : String(e.data);
        if (msg === 'readyok') {
          this.engine.worker.onmessage = originalHandler;
          resolve();
        }
      };
    });
  }
}
