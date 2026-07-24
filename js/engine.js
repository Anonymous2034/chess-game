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

    // Search-request tracking. Every 'go' we send is tagged with a monotonic
    // id and a kind ('game' | 'analysis' | 'multipv'). Because Stockfish emits
    // exactly one 'bestmove' per 'go' (in order), a FIFO of pending searches
    // maps each incoming bestmove to the search that produced it. Only the most
    // recent search (_currentSearchId) is "live"; any bestmove whose id has been
    // superseded is stale and must be discarded. This prevents a pending
    // analysis 'go' from delivering its bestmove to the game-move handler after
    // a game move has been requested (the double-move / flash-and-revert bug).
    this._searchSeq = 0;         // increments on every 'go'
    this._currentSearchId = 0;   // id of the most recent 'go'
    this._pendingSearches = [];  // FIFO of { id, kind } awaiting a bestmove

    // Analysis state — never swap worker.onmessage
    this._analyzing = false;
    this._analysisResult = null;
    this._analysisResolve = null;
    this._analysisCancelId = 0;
    this._analysisQueue = Promise.resolve();

    // Multi-PV state
    this.multiPV = 1;
    this._multiPVResults = [];
    this._multiPVResolve = null;
    this._multiPVAnalyzing = false;
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

  /**
   * Issue a search. Tags it with a fresh id + kind, records it in the pending
   * FIFO, marks it the live search, and sends the 'go' command.
   */
  _startSearch(kind, goCmd) {
    const id = ++this._searchSeq;
    this._currentSearchId = id;
    this._pendingSearches.push({ id, kind });
    this.send(goCmd);
    return id;
  }

  /**
   * Mark the current search as no longer live so its (possibly in-flight)
   * bestmove is treated as stale and discarded. The pending FIFO entry stays so
   * the eventual bestmove is still accounted for (shifted + discarded).
   */
  _discardCurrentSearch() {
    this._currentSearchId = ++this._searchSeq;
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

      // Match this bestmove to the search that produced it (FIFO order).
      const desc = this._pendingSearches.shift();

      // No record of a search for this bestmove — a stray 'stop' echo or a
      // response from before a newGame() reset. Discard.
      if (!desc) return;

      // Superseded by a newer search (e.g. an analysis 'go' whose result came
      // back after a game move was requested, or a search that was stopped and
      // discarded). Route it nowhere — the caller's promise, if any, was already
      // resolved by _cancelAnalysis()/stop(). This is the core fix.
      if (desc.id !== this._currentSearchId) return;

      // Multi-PV analysis result
      if (desc.kind === 'multipv') {
        this._multiPVAnalyzing = false;
        if (this._multiPVResolve) {
          const resolve = this._multiPVResolve;
          this._multiPVResolve = null;
          resolve(this._multiPVResults.filter(Boolean));
        }
        this._multiPVResults = [];
        return;
      }

      // Standard analysis result — route to analysis resolver, NOT to onBestMove
      if (desc.kind === 'analysis') {
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
      // Multi-PV analysis mode
      if (this._multiPVAnalyzing) {
        const depthMatch = msg.match(/depth (\d+)/);
        const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = msg.match(/ pv (.+)/);
        const mpvMatch = msg.match(/multipv (\d+)/);

        if (depthMatch && scoreMatch) {
          const pvIndex = mpvMatch ? parseInt(mpvMatch[1]) - 1 : 0;
          const entry = {
            pvIndex,
            score: scoreMatch[1] === 'cp' ? parseInt(scoreMatch[2]) : (parseInt(scoreMatch[2]) > 0 ? 10000 : -10000),
            mate: scoreMatch[1] === 'mate' ? parseInt(scoreMatch[2]) : null,
            pv: pvMatch ? pvMatch[1] : '',
            bestMove: pvMatch ? pvMatch[1].split(' ')[0] : ''
          };
          this._multiPVResults[pvIndex] = entry;
        }
      } else if (this._analyzing && this._analysisResult) {
        // Standard single-PV analysis info — update result object
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

  setMultiPV(n) {
    this.multiPV = Math.max(1, Math.min(n, 5));
    if (this.ready) {
      this.send(`setoption name MultiPV value ${this.multiPV}`);
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
    this.send('setoption name MultiPV value 1');
    this.multiPV = 1;
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

    const goCmd = this.moveTime ? `go movetime ${this.moveTime}` : `go depth ${this.depth}`;
    this._startSearch('game', goCmd);
  }

  /**
   * Cancel any in-progress or queued analysis.
   * Sends 'stop' to the engine and resolves the pending promise with empty results.
   */
  _cancelAnalysis() {
    // Increment cancel ID so queued analyses know to skip
    this._analysisCancelId++;

    const wasSearching = this._analyzing || this._multiPVAnalyzing;

    // Resolve any pending single-PV analysis promise so its caller doesn't hang.
    if (this._analyzing) {
      this._analyzing = false;
      if (this._analysisResolve) {
        const resolve = this._analysisResolve;
        this._analysisResolve = null;
        resolve({ bestMove: null, score: 0, mate: null, pv: '' });
      }
      this._analysisResult = null;
    }

    // Resolve any pending multi-PV analysis promise too (this path was
    // previously unhandled — a running multi-PV search would swallow the next
    // game bestmove).
    if (this._multiPVAnalyzing) {
      this._multiPVAnalyzing = false;
      if (this._multiPVResolve) {
        const resolve = this._multiPVResolve;
        this._multiPVResolve = null;
        resolve([]);
      }
      this._multiPVResults = [];
    }

    if (wasSearching) {
      // End the running analysis search early. Its bestmove will be discarded
      // as stale once the next 'go' advances _currentSearchId.
      this.send('stop');
    }

    // Clear the queue so no more queued analyses run
    this._analysisQueue = Promise.resolve();
  }

  /**
   * Stop the current search. By default (discard=true) the resulting bestmove
   * is dropped — used when aborting (undo, new game, mode switch). Pass
   * discard=false to let the bestmove be delivered to onBestMove, as the
   * "force move" flow relies on (stop → immediate bestmove → play it).
   */
  stop(discard = true) {
    if (this.thinking) {
      this.send('stop');
      this.thinking = false;
      if (discard) this._discardCurrentSearch();
    }
  }

  newGame() {
    if (this.ready) {
      this.stop();
      this._cancelAnalysis();
      // Drop any bestmoves still in flight from before the reset.
      this._pendingSearches = [];
      this._discardCurrentSearch();
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
      this._startSearch('analysis', `go depth ${depth}`);

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

  analyzePositionMultiPV(fen, depth = 14, numPV = 3) {
    const cancelId = this._analysisCancelId;

    const doAnalysis = () => new Promise((resolve) => {
      if (!this.ready || this.thinking || cancelId !== this._analysisCancelId) {
        resolve([]);
        return;
      }

      this._multiPVAnalyzing = true;
      this._multiPVResults = [];
      this._multiPVResolve = resolve;

      this.send(`setoption name MultiPV value ${numPV}`);
      this.send('position fen ' + fen);
      this._startSearch('multipv', `go depth ${depth}`);

      setTimeout(() => {
        if (this._multiPVResolve === resolve) {
          this._multiPVAnalyzing = false;
          this._multiPVResolve = null;
          const results = this._multiPVResults.filter(Boolean);
          this._multiPVResults = [];
          resolve(results);
        }
      }, 30000);
    });

    this._analysisQueue = this._analysisQueue
      .then(() => doAnalysis())
      .catch(() => []);
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
