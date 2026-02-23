// Stockfish WASM integration via Web Worker + UCI protocol

export class Engine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.thinking = false;
    this.depth = 10;
    this.onReady = null;
    this.onBestMove = null;
    this.onNoMove = null;
    this.onStatus = null;
    this.moveTime = null; // ms, alternative to depth

    // Analysis state — never swap worker.onmessage
    this._analyzing = false;
    this._analysisResult = null;
    this._analysisResolve = null;
    this._analysisCancelId = 0;
    this._analysisQueue = Promise.resolve();
    this._ignoreNextBestmove = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker('lib/stockfish/stockfish.js');

        let settled = false;

        // Single permanent handler — never replaced
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

      // Ignore bestmove from a cancelled analysis (after 'stop' was sent)
      if (this._ignoreNextBestmove) {
        this._ignoreNextBestmove = false;
        return;
      }

      const parts = msg.split(' ');
      const bestMove = parts[1];

      // Analysis result — route to analysis resolver, NOT to onBestMove
      if (this._analyzing) {
        this._analyzing = false;
        if (this._analysisResult) {
          this._analysisResult.bestMove = bestMove || null;
        }
        if (this._analysisResolve) {
          const resolve = this._analysisResolve;
          this._analysisResolve = null;
          resolve(this._analysisResult || { bestMove: bestMove || null, score: 0, mate: null, pv: '' });
        }
        this._analysisResult = null;
        return;
      }

      // Game move result
      this.thinking = false;
      if (this.onStatus) this.onStatus('Ready');
      if (bestMove && bestMove !== '(none)' && bestMove !== '0000') {
        if (this.onBestMove) this.onBestMove(bestMove);
      } else {
        if (this.onNoMove) this.onNoMove();
      }

    } else if (msg.startsWith('info')) {
      if (this._analyzing && this._analysisResult) {
        // Analysis info — update result object
        const depthMatch = msg.match(/depth (\d+)/);
        const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = msg.match(/ pv (.+)/);

        if (depthMatch && scoreMatch) {
          if (scoreMatch[1] === 'cp') {
            this._analysisResult.score = parseInt(scoreMatch[2]);
            this._analysisResult.mate = null;
          } else {
            this._analysisResult.mate = parseInt(scoreMatch[2]);
            this._analysisResult.score = this._analysisResult.mate > 0 ? 10000 : -10000;
          }
        }
        if (pvMatch) {
          this._analysisResult.pv = pvMatch[1];
        }
      } else if (this.thinking) {
        // Game move thinking info — update status
        const depthMatch = msg.match(/depth (\d+)/);
        const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
        if (depthMatch) {
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
  }

  setDifficulty(level) {
    this.depth = Math.max(1, Math.min(level, 20));

    if (this.ready) {
      if (level <= 5) {
        this.send('setoption name Skill Level value ' + Math.max(0, level - 1));
      } else {
        this.send('setoption name Skill Level value 20');
      }
    }
  }

  resetOptions() {
    if (!this.ready) return;
    this.send('setoption name Skill Level value 20');
    this.send('setoption name Contempt value 0');
    this.send('setoption name UCI_LimitStrength value false');
    this.depth = 20;
    this.moveTime = null;
  }

  applyPersonality(bot) {
    if (!this.ready) return;

    this.resetOptions();

    if (bot.stockfishElo) {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${bot.stockfishElo}`);
    }

    if (bot.uci) {
      for (const [option, value] of Object.entries(bot.uci)) {
        this.send(`setoption name ${option} value ${value}`);
      }
    }

    this.depth = bot.searchDepth || 20;
    this.moveTime = bot.moveTime || null;
  }

  /**
   * Request a game move. Cancels any in-progress analysis first.
   */
  requestMove(fen) {
    if (!this.ready) return;

    // Cancel any in-progress analysis before requesting a game move
    this._cancelAnalysis();

    if (this.thinking) return;

    this.thinking = true;
    if (this.onStatus) this.onStatus('Thinking...');

    this.send('position fen ' + fen);

    if (this.moveTime) {
      this.send(`go movetime ${this.moveTime}`);
    } else {
      this.send(`go depth ${this.depth}`);
    }
  }

  /**
   * Cancel any in-progress or queued analysis.
   * Sends 'stop' to the engine and resolves the pending promise with empty results.
   */
  _cancelAnalysis() {
    // Increment cancel ID so queued analyses know to skip
    this._analysisCancelId++;

    if (this._analyzing) {
      this.send('stop');
      this._analyzing = false;

      // Resolve pending promise with empty result
      if (this._analysisResolve) {
        this._analysisResolve({ bestMove: null, score: 0, mate: null, pv: '' });
        this._analysisResolve = null;
      }
      this._analysisResult = null;

      // The 'stop' will cause a bestmove response — ignore it
      this._ignoreNextBestmove = true;
    }

    // Clear the queue so no more queued analyses run
    this._analysisQueue = Promise.resolve();
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
      this._cancelAnalysis();
      this.send('ucinewgame');
      this.send('isready');
    }
  }

  /**
   * Analyze a position and return evaluation details.
   * Returns Promise resolving with { bestMove, score, mate, pv }
   * Messages are routed through handleMessage() — worker.onmessage is never swapped.
   * Calls are serialized and can be cancelled by requestMove() or _cancelAnalysis().
   */
  analyzePosition(fen, depth = 18) {
    const cancelId = this._analysisCancelId;

    const doAnalysis = () => new Promise((resolve) => {
      // Skip if cancelled, not ready, or engine is thinking about a game move
      if (!this.ready || this.thinking || cancelId !== this._analysisCancelId) {
        resolve({ bestMove: null, score: 0, mate: null, pv: '' });
        return;
      }

      this._analyzing = true;
      this._analysisResult = { bestMove: null, score: 0, mate: null, pv: '' };
      this._analysisResolve = resolve;

      this.send('position fen ' + fen);
      this.send(`go depth ${depth}`);

      // Safety timeout — if analysis doesn't complete in 30s, resolve empty
      setTimeout(() => {
        if (this._analysisResolve === resolve) {
          this._analyzing = false;
          this._analysisResolve = null;
          this._analysisResult = null;
          resolve({ bestMove: null, score: 0, mate: null, pv: '' });
        }
      }, 30000);
    });

    // Serialize: chain onto previous analysis
    this._analysisQueue = this._analysisQueue
      .then(() => doAnalysis())
      .catch(() => ({ bestMove: null, score: 0, mate: null, pv: '' }));
    return this._analysisQueue;
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }

  static parseUCIMove(uci) {
    return {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined
    };
  }
}
