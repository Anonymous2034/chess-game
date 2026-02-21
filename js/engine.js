// Stockfish WASM integration via Web Worker + UCI protocol

export class Engine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.thinking = false;
    this.depth = 10;
    this.onReady = null;
    this.onBestMove = null;
    this.onStatus = null;
    this.moveTime = null; // ms, alternative to depth
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        // The stockfish.js file auto-detects worker context and looks for
        // stockfish-nnue-16-single.wasm in the same directory by default.
        this.worker = new Worker('lib/stockfish/stockfish.js');

        let settled = false;

        this.worker.onmessage = (e) => {
          const msg = typeof e.data === 'string' ? e.data : String(e.data);
          this.handleMessage(msg);

          // Resolve on first readyok
          if (!settled && msg === 'readyok') {
            settled = true;
            resolve();
          }
        };

        this.worker.onerror = (err) => {
          console.error('Stockfish worker error:', err);
          if (this.onStatus) this.onStatus('Engine error');
          if (!settled) {
            settled = true;
            reject(new Error('Worker failed to load'));
          }
        };

        // Timeout after 15 seconds
        setTimeout(() => {
          if (!settled) {
            settled = true;
            console.error('Stockfish init timed out');
            if (this.onStatus) this.onStatus('Load timeout');
            reject(new Error('Engine init timed out'));
          }
        }, 15000);

        this.send('uci');
      } catch (err) {
        console.error('Failed to init Stockfish:', err);
        reject(err);
      }
    });
  }

  send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  handleMessage(msg) {
    if (msg === 'uciok') {
      this.send('isready');
    } else if (msg === 'readyok') {
      this.ready = true;
      if (this.onStatus) this.onStatus('Ready');
    } else if (msg.startsWith('bestmove')) {
      const parts = msg.split(' ');
      const bestMove = parts[1];
      this.thinking = false;
      if (this.onStatus) this.onStatus('Ready');
      // Ignore invalid bestmove responses (checkmate/stalemate position)
      if (bestMove && bestMove !== '(none)' && bestMove !== '0000' && this.onBestMove) {
        this.onBestMove(bestMove);
      }
    } else if (msg.startsWith('info')) {
      // Parse search info for display
      const depthMatch = msg.match(/depth (\d+)/);
      const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
      if (depthMatch && this.thinking) {
        let status = `Thinking... depth ${depthMatch[1]}`;
        if (scoreMatch) {
          if (scoreMatch[1] === 'cp') {
            const cp = parseInt(scoreMatch[2]) / 100;
            status += ` (${cp > 0 ? '+' : ''}${cp.toFixed(1)})`;
          } else {
            status += ` (mate in ${scoreMatch[2]})`;
          }
        }
        if (this.onStatus) this.onStatus(status);
      }
    }
  }

  setDifficulty(level) {
    // Level 1-20
    // Map to depth and optionally skill level
    this.depth = Math.max(1, Math.min(level, 20));

    if (this.ready) {
      if (level <= 5) {
        this.send('setoption name Skill Level value ' + Math.max(0, level - 1));
      } else {
        this.send('setoption name Skill Level value 20');
      }
    }
  }

  requestMove(fen) {
    if (!this.ready || this.thinking) return;

    this.thinking = true;
    if (this.onStatus) this.onStatus('Thinking...');

    this.send('position fen ' + fen);

    if (this.moveTime) {
      this.send(`go movetime ${this.moveTime}`);
    } else {
      this.send(`go depth ${this.depth}`);
    }
  }

  stop() {
    if (this.thinking) {
      this.send('stop');
      this.thinking = false;
    }
  }

  newGame() {
    if (this.ready) {
      this.stop();
      this.send('ucinewgame');
      this.send('isready');
    }
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }

  /**
   * Convert UCI move (e.g. "e2e4", "e7e8q") to from/to/promotion
   */
  static parseUCIMove(uci) {
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined
    };
  }
}
