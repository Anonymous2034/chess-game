// App entry point — initializes and wires all components
import { Board } from './board.js';
import { Game } from './game.js';
import { Engine } from './engine.js';
import { Notation } from './notation.js';
import { Database } from './database.js';
import { BOT_PERSONALITIES, GM_STYLES, BOT_TIERS } from './bots.js';
import { OpeningBook } from './openings.js';
import { CapturedPieces } from './captured.js';
import { GameAnalyzer } from './analysis.js';
import { EvalGraph } from './eval-graph.js';
import { CoachManager } from './coach.js';
import { PlayerStats } from './stats.js';
import { Tournament } from './tournament.js';
import { show, hide, debounce, setPieceBasePath } from './utils.js';
import { ThemeManager, BOARD_THEMES, PIECE_THEMES } from './themes.js';
import { BotMatch } from './bot-match.js';
import { initFirebase, isFirebaseConfigured } from './firebase-config.js';
import { AuthManager } from './auth.js';
import { DataService } from './data-service.js';
import { AdminPanel } from './admin.js';

class ChessApp {
  constructor() {
    this.game = new Game();
    this.board = null;
    this.engine = null;
    this.notation = null;
    this.database = new Database();
    this.engineInitialized = false;
    this.activeBot = null;
    this.activeCategory = 'all';
    this.openingBook = new OpeningBook();
    this.lastOpeningName = '';

    // Themes
    this.themes = new ThemeManager();

    // Force move
    this.engineMoveTimeout = null;

    // New features
    this.captured = new CapturedPieces();
    this.analyzer = null;
    this.evalGraph = null;
    this.coach = null;
    this.stats = new PlayerStats();
    this.tournament = new Tournament();
    this.analysisResults = null;
    this.currentTournamentMatch = null;
    this.botMatch = null;
    this.auth = null;
    this.dataService = null;
    this.adminPanel = null;
    this.firebaseReady = false;

    this.init();
  }

  async init() {
    // Apply themes
    setPieceBasePath(this.themes.getPieceBasePath());
    this.themes.apply();
    this.themes.onPieceThemeChange = () => {
      setPieceBasePath(this.themes.getPieceBasePath());
      this.board.update();
    };

    // Init board
    const boardEl = document.getElementById('board');
    this.board = new Board(boardEl, this.game);

    // Init notation
    const moveHistoryEl = document.getElementById('move-history');
    this.notation = new Notation(moveHistoryEl);

    // Init captured pieces
    this.captured.init();

    // Init eval graph
    this.evalGraph = new EvalGraph(document.getElementById('eval-graph-container'));

    // Wire up game callbacks
    this.game.onStatusChange = (status) => this.updateGameStatus(status);
    this.game.onTimerUpdate = (timers) => this.updateTimers(timers);
    this.game.onMoveMade = (move) => this.handleMoveMade(move);
    this.game.onGameOver = (result) => this.handleGameOver(result);

    // Wire up notation click
    this.notation.onMoveClick = (index) => this.navigateToMove(index);
    this.notation.onMoveHover = (index, e) => this.showMoveTooltip(index, e);

    // Setup UI handlers
    this.setupNewGameDialog();
    this.setupNavigationControls();
    this.setupGameControls();
    this.setupPGNHandlers();
    this.setupDatabaseDialog();
    this.setupBoardFlip();
    this.setupAnalysis();
    this.setupCoach();
    this.setupPanelTabs();
    this.setupStatsDialog();
    this.setupTournament();
    this.setupForceMove();
    this.setupMultiAnalysis();
    this.setupThemes();
    this.setupBotMatch();
    this.setupAuth();
    this.setupAdmin();

    // Load database in background
    this.database.loadCollections().then(categories => {
      if (categories.length > 0) {
        this.populateCategoryTabs();
        this.populateCollectionFilter();
      }
    });

    // Check for active tournament
    if (this.tournament.active) {
      this._showTournamentButton();
    }

    // Start with default game
    this.game.newGame({ mode: 'local' });
    this.board.update();
    this.updateGameStatus('White to move');
  }

  async initEngine() {
    if (this.engineInitialized) return;

    const engineStatusEl = document.getElementById('engine-status');
    show(engineStatusEl);
    engineStatusEl.textContent = 'Engine: Loading...';

    try {
      this.engine = new Engine();
      this.engine.onStatus = (status) => {
        const prefix = this.activeBot ? this.activeBot.name : 'Engine';
        engineStatusEl.textContent = `${prefix}: ${status}`;
      };
      this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);

      await this.engine.init();
      this.engineInitialized = true;

      // Initialize coach with engine
      if (this.coach) {
        this.coach.engine = this.engine;
        this.coach.tips.engine = this.engine;
      } else {
        this.coach = new CoachManager(this.engine);
        this._wireCoachCallbacks();
      }

      // Initialize analyzer
      this.analyzer = new GameAnalyzer(this.engine);

      const prefix = this.activeBot ? this.activeBot.name : 'Engine';
      engineStatusEl.textContent = `${prefix}: Ready`;
    } catch (err) {
      console.error('Engine init failed:', err);
      engineStatusEl.textContent = 'Engine: Failed to load';
    }
  }

  // === Move Handling ===

  handleMoveMade(move) {
    this.notation.addMove(move);
    this.board.setLastMove(move);
    this.board.update();
    this.updateTimers(this.game.timers);

    // Update captured pieces
    this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);

    if (this.game.gameOver) {
      this.board.setInteractive(false);
      this._onGameEnd();
      return;
    }

    // Coach auto-tips after player move
    if (this.coach && this.game.mode === 'engine' && move.color === this.game.playerColor) {
      const moveIdx = this.game.currentMoveIndex;
      const prevFen = moveIdx > 0 ? this.game.fens[moveIdx - 1] : null;
      this.coach.onPlayerMove({
        fen: this.chess.fen(),
        prevFen,
        move,
        moveHistory: this.game.moveHistory
      });
    }

    // If playing vs engine and it's engine's turn
    if (this.game.mode === 'engine' && this.chess.turn() !== this.game.playerColor) {
      this.requestEngineMove();
    }

    // Fetch opening explorer
    this.fetchOpeningExplorer();
  }

  get chess() {
    return this.game.chess;
  }

  async requestEngineMove() {
    if (!this.engine || !this.engine.ready) return;

    this.board.setInteractive(false);
    this._startEngineMoveTimer();

    // Check opening book first
    if (this.activeBot) {
      const engineColor = this.game.playerColor === 'w' ? 'b' : 'w';
      const bookMove = this.openingBook.getBookMove(this.activeBot, this.game.moveHistory, engineColor);
      if (bookMove) {
        // Simulate thinking delay (300-800ms) — book moves are instant
        this._clearEngineMoveTimer();
        const delay = 300 + Math.random() * 500;
        setTimeout(() => {
          // Find the UCI-style from/to for this SAN move
          const legalMoves = this.chess.moves({ verbose: true });
          const match = legalMoves.find(m => m.san === bookMove);
          if (match) {
            const move = this.game.makeEngineMove(match.from, match.to, match.promotion);
            if (move) {
              this.notation.addMove(move);
              this.board.setLastMove(move);
              this.board.update();
              this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
              this.fetchOpeningExplorer();
            }
            if (!this.game.gameOver) {
              this.board.setInteractive(true);
            } else {
              this._onGameEnd();
            }
          } else {
            // Book move not legal, fall back to engine
            this.engine.requestMove(this.chess.fen());
          }
        }, delay);
        return;
      }
    }

    this.engine.requestMove(this.chess.fen());
  }

  handleEngineMove(uciMove) {
    this._clearEngineMoveTimer();
    const parsed = Engine.parseUCIMove(uciMove);
    const move = this.game.makeEngineMove(parsed.from, parsed.to, parsed.promotion);

    if (move) {
      this.notation.addMove(move);
      this.board.setLastMove(move);
      this.board.update();
      this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
      this.fetchOpeningExplorer();
    }

    if (!this.game.gameOver) {
      this.board.setInteractive(true);
    } else {
      this._onGameEnd();
    }
  }

  handleGameOver(result) {
    // This is called from game.js for time-based game-over
    this._onGameEnd();
  }

  _onGameEnd() {
    // Show analyze button
    if (this.engineInitialized) {
      show(document.getElementById('btn-analyze'));
    }

    // Record stats if playing vs bot
    if (this.activeBot && this.game.mode === 'engine') {
      const gameResult = this.game.getGameResult();
      let result = 'draw';
      if (gameResult) {
        if (gameResult.result === '1-0') {
          result = this.game.playerColor === 'w' ? 'win' : 'loss';
        } else if (gameResult.result === '0-1') {
          result = this.game.playerColor === 'b' ? 'win' : 'loss';
        }
      }

      const gameRecord = {
        opponent: this.activeBot.name,
        opponentElo: this.activeBot.stockfishElo || this.activeBot.peakElo,
        result,
        opening: this.lastOpeningName || 'Unknown',
        playerColor: this.game.playerColor,
        moveCount: this.game.moveHistory.length,
        timeControl: this.game.timeControl
      };
      this.stats.recordGame(gameRecord);

      // Save to cloud
      if (this.dataService) {
        this.dataService.saveStats(this.stats.data);
        this.dataService.saveGame({
          ...gameRecord,
          pgn: this.notation.toPGN({ Result: gameResult?.result || '*' })
        });
      }

      // Tournament match result
      if (this.tournament.active && this.currentTournamentMatch) {
        this.tournament.recordResult(result, this.currentTournamentMatch.match);
        this.currentTournamentMatch = null;

        // Show tournament progress after a short delay
        setTimeout(() => this._showTournamentProgress(), 500);
      }
    }

    // Coach post-game feedback
    if (this.coach && this.game.mode === 'engine') {
      const gameResult = this.game.getGameResult();
      const resultStr = gameResult ? gameResult.result : 'draw';
      this.coach.postGameFeedback(
        this.game.moveHistory,
        this.game.fens,
        this.game.playerColor,
        resultStr
      );
    }
  }

  // === UI Updates ===

  updateGameStatus(status) {
    const el = document.getElementById('game-status');
    if (el) el.textContent = status;
  }

  updateTimers(timers) {
    const topTimer = document.getElementById('timer-top');
    const bottomTimer = document.getElementById('timer-bottom');
    const topColor = this.board.flipped ? 'w' : 'b';
    const bottomColor = this.board.flipped ? 'b' : 'w';

    topTimer.textContent = this.game.getTimerDisplay(topColor);
    bottomTimer.textContent = this.game.getTimerDisplay(bottomColor);

    // Active timer styling
    topTimer.classList.toggle('active', this.chess.turn() === topColor && this.game.timeControl > 0 && !this.game.gameOver);
    bottomTimer.classList.toggle('active', this.chess.turn() === bottomColor && this.game.timeControl > 0 && !this.game.gameOver);

    // Low time warning
    if (this.game.timeControl > 0) {
      topTimer.classList.toggle('low', timers[topColor] <= 30 && timers[topColor] > 0);
      bottomTimer.classList.toggle('low', timers[bottomColor] <= 30 && timers[bottomColor] > 0);
    }

    // Player names
    const topName = document.querySelector('#player-top .player-name');
    const bottomName = document.querySelector('#player-bottom .player-name');
    if (this.activeBot && this.game.mode === 'engine') {
      const botColor = this.game.playerColor === 'w' ? 'b' : 'w';
      const playerColor = this.game.playerColor;
      if (topName) topName.textContent = topColor === botColor ? this.activeBot.name : (playerColor === 'w' ? 'White' : 'Black');
      if (bottomName) bottomName.textContent = bottomColor === botColor ? this.activeBot.name : (playerColor === 'w' ? 'White' : 'Black');
    } else {
      if (topName) topName.textContent = topColor === 'w' ? 'White' : 'Black';
      if (bottomName) bottomName.textContent = bottomColor === 'w' ? 'White' : 'Black';
    }
  }

  // === Navigation ===

  navigateToMove(index) {
    this.game.goToMove(index);
    this.notation.setCurrentIndex(index);

    // Set last move highlight
    if (index >= 0 && index < this.game.moveHistory.length) {
      this.board.setLastMove(this.game.moveHistory[index]);
    } else {
      this.board.setLastMove(null);
    }

    this.board.update();

    // Update captured pieces
    this.captured.update(this.game.moveHistory, index, this.board.flipped);

    // Update eval graph highlight
    if (this.analysisResults && this.evalGraph) {
      this.evalGraph.render(this.analysisResults.moves, index);
    }

    // In replay mode, don't allow interaction
    if (this.game.replayMode) {
      this.board.setInteractive(false);
    } else if (index === this.game.moveHistory.length - 1) {
      // At the end of moves, re-enable if game is not over
      this.board.setInteractive(!this.game.gameOver);
    }
  }

  setupNavigationControls() {
    document.getElementById('btn-first').addEventListener('click', () => {
      this.navigateToMove(-1);
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      const idx = Math.max(-1, this.notation.currentIndex - 1);
      this.navigateToMove(idx);
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      const idx = Math.min(this.game.moveHistory.length - 1, this.notation.currentIndex + 1);
      this.navigateToMove(idx);
    });

    document.getElementById('btn-last').addEventListener('click', () => {
      this.navigateToMove(this.game.moveHistory.length - 1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          document.getElementById('btn-prev').click();
          break;
        case 'ArrowRight':
          e.preventDefault();
          document.getElementById('btn-next').click();
          break;
        case 'Home':
          e.preventDefault();
          document.getElementById('btn-first').click();
          break;
        case 'End':
          e.preventDefault();
          document.getElementById('btn-last').click();
          break;
      }
    });
  }

  // === Game Controls ===

  setupGameControls() {
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (this.game.replayMode) return;
      // Stop engine if thinking
      this._clearEngineMoveTimer();
      if (this.engine && this.engine.thinking) {
        this.engine.stop();
      }
      if (this.game.undo()) {
        const idx = this.game.currentMoveIndex;
        this.notation.setCurrentIndex(idx);
        if (idx >= 0) {
          this.board.setLastMove(this.game.moveHistory[idx]);
        } else {
          this.board.setLastMove(null);
        }
        this.board.update();
        this.board.setInteractive(true);
        this.captured.update(this.game.moveHistory, idx, this.board.flipped);
      }
    });

    document.getElementById('btn-redo').addEventListener('click', () => {
      if (this.game.replayMode) return;
      if (this.game.redo()) {
        const idx = this.game.currentMoveIndex;
        this.notation.setCurrentIndex(idx);
        if (idx >= 0) {
          this.board.setLastMove(this.game.moveHistory[idx]);
        } else {
          this.board.setLastMove(null);
        }
        this.board.update();
        this.captured.update(this.game.moveHistory, idx, this.board.flipped);
      }
    });
  }

  // === Force Move ===

  setupForceMove() {
    document.getElementById('btn-force-move').addEventListener('click', () => {
      this._forceEngineMove();
    });
  }

  _startEngineMoveTimer() {
    this._clearEngineMoveTimer();
    // Show Force Move button after 8 seconds if engine hasn't moved
    this.engineMoveTimeout = setTimeout(() => {
      if (this.engine && this.engine.thinking) {
        show(document.getElementById('btn-force-move'));
      }
    }, 8000);
  }

  _clearEngineMoveTimer() {
    if (this.engineMoveTimeout) {
      clearTimeout(this.engineMoveTimeout);
      this.engineMoveTimeout = null;
    }
    hide(document.getElementById('btn-force-move'));
  }

  _forceEngineMove() {
    if (!this.engine) return;

    if (this.engine.thinking) {
      // Send 'stop' — Stockfish will immediately return bestmove
      this.engine.stop();

      // Safety fallback: if no bestmove arrives within 3 seconds, play random legal move
      setTimeout(() => {
        if (!this.board.interactive && !this.game.gameOver && this.game.mode === 'engine') {
          this._playRandomFallbackMove();
        }
      }, 3000);
    } else {
      // Engine not thinking — it might be stuck in a weird state
      // Re-request the move
      this.engine.thinking = false;
      this.engine.requestMove(this.chess.fen());

      // If still no response after 5 seconds, play random move
      setTimeout(() => {
        if (!this.board.interactive && !this.game.gameOver && this.game.mode === 'engine') {
          this._playRandomFallbackMove();
        }
      }, 5000);
    }

    hide(document.getElementById('btn-force-move'));
  }

  _playRandomFallbackMove() {
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return;

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const move = this.game.makeEngineMove(randomMove.from, randomMove.to, randomMove.promotion);
    if (move) {
      this.notation.addMove(move);
      this.board.setLastMove(move);
      this.board.update();
      this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
      this.fetchOpeningExplorer();
    }
    if (!this.game.gameOver) {
      this.board.setInteractive(true);
    } else {
      this._onGameEnd();
    }
    this.showToast('Engine unresponsive — random move played');
  }

  // === Multi-Bot Analysis ===

  setupMultiAnalysis() {
    document.getElementById('btn-multi-analysis').addEventListener('click', () => {
      this._renderMultiAnalysisBots();
      show(document.getElementById('multi-analysis-dialog'));
    });

    document.getElementById('close-multi-analysis').addEventListener('click', () => {
      hide(document.getElementById('multi-analysis-dialog'));
    });

    document.getElementById('run-multi-analysis').addEventListener('click', () => {
      this._runMultiAnalysis();
    });
  }

  _renderMultiAnalysisBots() {
    const el = document.getElementById('multi-analysis-bots');
    el.innerHTML = '';

    for (const tier of BOT_TIERS) {
      const tierBots = BOT_PERSONALITIES.filter(b => b.tier === tier.id);
      if (tierBots.length === 0) continue;

      for (const bot of tierBots) {
        const label = document.createElement('label');
        label.innerHTML = `
          <input type="checkbox" value="${bot.id}">
          <img src="${bot.portrait}" alt="${bot.name}" style="width:24px;height:24px;border-radius:50%;">
          <span class="multi-analysis-bot-name">${bot.name}</span>
          <span class="multi-analysis-bot-elo">${bot.peakElo}</span>
        `;
        el.appendChild(label);
      }
    }

    // Hide results from previous run
    hide(document.getElementById('multi-analysis-results'));
  }

  async _runMultiAnalysis() {
    const checkboxes = document.querySelectorAll('#multi-analysis-bots input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
      this.showToast('Select at least one bot');
      return;
    }
    if (checkboxes.length > 6) {
      this.showToast('Select up to 6 bots');
      return;
    }

    // Ensure engine is ready
    await this.initEngine();
    if (!this.engine || !this.engine.ready) {
      this.showToast('Engine failed to load');
      return;
    }

    const selectedBots = Array.from(checkboxes).map(cb => {
      return BOT_PERSONALITIES.find(b => b.id === cb.value);
    }).filter(Boolean);

    const fen = this.chess.fen();
    const resultsEl = document.getElementById('multi-analysis-results');
    resultsEl.innerHTML = '<div class="multi-analysis-thinking">Analyzing position with each bot...</div>';
    show(resultsEl);

    // Temporarily remove the onBestMove handler
    const origHandler = this.engine.onBestMove;
    this.engine.onBestMove = null;

    const results = [];

    for (const bot of selectedBots) {
      // Apply bot personality
      this.engine.applyPersonality(bot);

      // Analyze with higher depth for better quality
      const analysis = await this.engine.analyzePosition(fen, bot.searchDepth || 16);

      // Convert UCI best move to SAN
      let san = analysis.bestMove || '?';
      if (analysis.bestMove) {
        const from = analysis.bestMove.substring(0, 2);
        const to = analysis.bestMove.substring(2, 4);
        const promo = analysis.bestMove.length > 4 ? analysis.bestMove[4] : undefined;
        const legalMoves = this.chess.moves({ verbose: true });
        const match = legalMoves.find(m => m.from === from && m.to === to && (!promo || m.promotion === promo));
        if (match) san = match.san;
      }

      // Format eval
      let evalStr;
      if (analysis.mate !== null) {
        evalStr = `M${analysis.mate}`;
      } else {
        const cp = analysis.score / 100;
        evalStr = `${cp > 0 ? '+' : ''}${cp.toFixed(1)}`;
      }

      // Format PV line as SAN
      let pvSan = '';
      if (analysis.pv) {
        const pvMoves = analysis.pv.split(' ').slice(0, 5);
        // Convert UCI PV to SAN by playing moves on a temp board
        try {
          const tempChess = new Chess(fen);
          const sanMoves = [];
          for (const uci of pvMoves) {
            const f = uci.substring(0, 2);
            const t = uci.substring(2, 4);
            const p = uci.length > 4 ? uci[4] : undefined;
            const m = tempChess.move({ from: f, to: t, promotion: p });
            if (m) sanMoves.push(m.san);
            else break;
          }
          pvSan = sanMoves.join(' ');
        } catch {
          pvSan = analysis.pv.split(' ').slice(0, 5).join(' ');
        }
      }

      results.push({ bot, san, evalStr, pvSan });

      // Update results live
      this._renderMultiAnalysisResults(results);
    }

    // Restore active bot personality if one was active
    if (this.activeBot) {
      this.engine.applyPersonality(this.activeBot);
    } else {
      this.engine.resetOptions();
    }

    // Restore handler
    this.engine.onBestMove = origHandler;
  }

  _renderMultiAnalysisResults(results) {
    const el = document.getElementById('multi-analysis-results');
    let html = '';

    for (const r of results) {
      html += `
        <div class="multi-analysis-line">
          <img class="multi-analysis-portrait" src="${r.bot.portrait}" alt="${r.bot.name}">
          <div class="multi-analysis-bot-info">
            <div class="bot-name">${r.bot.name}</div>
            <div class="bot-elo">${r.bot.peakElo}</div>
          </div>
          <div class="multi-analysis-move">${r.san}</div>
          <div class="multi-analysis-eval">${r.evalStr}</div>
          <div class="multi-analysis-pv">${r.pvSan}</div>
        </div>`;
    }

    el.innerHTML = html;
  }

  // === New Game Dialog ===

  setupNewGameDialog() {
    const dialog = document.getElementById('new-game-dialog');
    const settings = { mode: 'local', color: 'w', botId: 'beginner-betty', time: 0, increment: 0 };

    // Render bot picker
    this.renderBotPicker(settings);

    document.getElementById('btn-new-game').addEventListener('click', () => {
      show(dialog);
      this.updateDialogVisibility(settings.mode);
    });

    document.getElementById('cancel-new-game').addEventListener('click', () => {
      hide(dialog);
    });

    // Button group selections (mode, color)
    dialog.querySelectorAll('.btn-group').forEach(group => {
      const setting = group.dataset.setting;
      if (!setting) return;
      group.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.dataset.value;
          settings[setting] = isNaN(val) ? val : Number(val);

          if (setting === 'mode') {
            this.updateDialogVisibility(val);
          }
        });
      });
    });

    // Time control grid
    this._setupTimeControlGrid(settings);

    document.getElementById('start-new-game').addEventListener('click', async () => {
      hide(dialog);
      await this._startNewGame(settings);
    });
  }

  _setupTimeControlGrid(settings) {
    const grid = document.getElementById('time-control-grid');
    const customInputs = document.getElementById('tc-custom-inputs');

    grid.querySelectorAll('.tc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.tc-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const timeVal = btn.dataset.time;
        const incVal = parseInt(btn.dataset.increment) || 0;

        if (timeVal === 'custom') {
          show(customInputs);
          const mins = parseInt(document.getElementById('tc-custom-minutes').value) || 10;
          settings.time = mins * 60;
          settings.increment = parseInt(document.getElementById('tc-custom-increment').value) || 0;
        } else {
          hide(customInputs);
          settings.time = parseInt(timeVal);
          settings.increment = incVal;
        }
      });
    });

    // Custom input changes
    const customMins = document.getElementById('tc-custom-minutes');
    const customInc = document.getElementById('tc-custom-increment');
    if (customMins) {
      customMins.addEventListener('input', () => {
        settings.time = (parseInt(customMins.value) || 10) * 60;
      });
    }
    if (customInc) {
      customInc.addEventListener('input', () => {
        settings.increment = parseInt(customInc.value) || 0;
      });
    }
  }

  async _startNewGame(settings) {
    let color = settings.color;
    if (color === 'random') {
      color = Math.random() < 0.5 ? 'w' : 'b';
    }

    // Stop any current engine computation
    this._clearEngineMoveTimer();
    if (this.engine && this.engine.thinking) {
      this.engine.stop();
    }

    // Find selected bot
    const bot = BOT_PERSONALITIES.find(b => b.id === settings.botId);

    // Init engine if needed
    if (settings.mode === 'engine') {
      await this.initEngine();
      if (this.engine && bot) {
        this.activeBot = bot;
        this.engine.applyPersonality(bot);
        this.engine.newGame();
      }
    } else {
      this.activeBot = null;
    }

    this.game.newGame({
      mode: settings.mode,
      color,
      botId: settings.botId,
      time: settings.time,
      increment: settings.increment
    });

    this.notation.clear();
    this.board.setLastMove(null);
    this.board.setInteractive(true);

    // Clear opening label
    this.lastOpeningName = '';
    const labelEl = document.getElementById('opening-label');
    if (labelEl) labelEl.textContent = '';

    // Clear captured pieces
    this.captured.clear();

    // Clear analysis
    this.analysisResults = null;
    hide(document.getElementById('btn-analyze'));
    hide(document.getElementById('analysis-progress'));
    hide(document.getElementById('analysis-summary'));
    hide(document.getElementById('eval-graph-container'));
    this.evalGraph.clear();
    this.notation.clearClassifications();

    // Clear coach messages for new game
    if (this.coach) {
      this.coach.clearMessages();
    }

    // Flip board if playing black
    if (settings.mode === 'engine' && color === 'b') {
      this.board.setFlipped(true);
    } else {
      this.board.setFlipped(false);
    }

    this.board.update();
    this.updateTimers(this.game.timers);

    // Show/hide engine status
    const engineStatusEl = document.getElementById('engine-status');
    if (settings.mode === 'engine') {
      show(engineStatusEl);
      if (this.activeBot) {
        engineStatusEl.textContent = `${this.activeBot.name}: Ready`;
      }
    } else {
      hide(engineStatusEl);
    }

    // If engine goes first (player is black)
    if (settings.mode === 'engine' && color === 'b') {
      this.requestEngineMove();
    }

    // Fetch opening explorer for starting position
    this.fetchOpeningExplorer();
  }

  renderBotPicker(settings) {
    const listEl = document.getElementById('bot-picker-list');
    listEl.innerHTML = '';

    for (const tier of BOT_TIERS) {
      const tierBots = BOT_PERSONALITIES.filter(b => b.tier === tier.id);
      if (tierBots.length === 0) continue;

      const label = document.createElement('div');
      label.className = 'bot-tier-label';
      label.textContent = tier.name;
      listEl.appendChild(label);

      for (const bot of tierBots) {
        const card = document.createElement('div');
        card.className = 'bot-list-card' + (bot.id === settings.botId ? ' selected' : '');
        card.dataset.botId = bot.id;

        card.innerHTML = `
          <img class="bot-list-portrait" src="${bot.portrait}" alt="${bot.name}">
          <div class="bot-list-info">
            <div class="bot-list-name">${bot.name}</div>
            <div class="bot-list-elo">${bot.peakElo}</div>
          </div>
        `;

        card.addEventListener('click', () => {
          listEl.querySelectorAll('.bot-list-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          settings.botId = bot.id;
          this.renderBotDetail(bot);
        });

        listEl.appendChild(card);
      }
    }

    // Show detail for initially selected bot
    const initialBot = BOT_PERSONALITIES.find(b => b.id === settings.botId) || BOT_PERSONALITIES[0];
    this.renderBotDetail(initialBot);
  }

  renderBotDetail(bot) {
    const detailEl = document.getElementById('bot-picker-detail');

    // Style bars
    let stylesHtml = '';
    for (const style of GM_STYLES) {
      const val = bot.styles[style.id] || 0;
      const pct = val * 10;
      const level = val <= 4 ? 'low' : val <= 7 ? 'mid' : 'high';
      stylesHtml += `
        <div class="bot-style">
          <span class="bot-style-name">${style.name}</span>
          <div class="bot-style-bar"><div class="bot-style-fill ${level}" style="width:${pct}%"></div></div>
          <span class="bot-style-val">${val}</span>
        </div>`;
    }

    // Favorite openings (GM-only)
    let openingsSectionHtml = '';
    if (bot.favoriteOpenings && bot.favoriteOpenings.length > 0) {
      const tags = bot.favoriteOpenings.map(o =>
        `<span class="gm-opening-tag"><span class="eco">${o.eco}</span> ${o.name}</span>`
      ).join('');
      openingsSectionHtml = `<div class="gm-detail-section"><h4>Favorite Openings</h4><div class="gm-openings-list">${tags}</div></div>`;
    }

    // Famous games (GM-only)
    let gamesSectionHtml = '';
    if (bot.famousGames && bot.famousGames.length > 0) {
      const items = bot.famousGames.map(g =>
        `<div class="gm-famous-game"><div class="gm-game-name">${g.name} (${g.year})</div><div class="gm-game-desc">${g.description}</div></div>`
      ).join('');
      gamesSectionHtml = `<div class="gm-detail-section"><h4>Famous Games</h4>${items}</div>`;
    }

    // World champion info
    const wcHtml = bot.bio?.worldChampion
      ? `<div class="gm-detail-wc">World Champion ${bot.bio.worldChampion}</div>`
      : '';

    // Elo label varies by tier
    const eloLabel = bot.tier === 'machine' ? 'Rating' : bot.tier === 'grandmaster' ? 'Peak Elo' : 'Elo';

    detailEl.innerHTML = `
      <div class="gm-detail-header">
        <img class="gm-portrait-lg" src="${bot.portrait}" alt="${bot.name}">
        <div class="gm-detail-info">
          <div class="gm-detail-name">${bot.name}</div>
          <div class="gm-detail-subtitle">${bot.subtitle}</div>
          <div class="gm-detail-elo">${eloLabel}: ${bot.peakElo}</div>
          ${wcHtml}
        </div>
      </div>
      <div class="gm-detail-bio">${bot.bio?.playingStyle || bot.bio?.summary || ''}</div>
      <div class="gm-detail-section">
        <h4>Playing Style</h4>
        <div class="bot-styles-detail">${stylesHtml}</div>
      </div>
      ${openingsSectionHtml}
      ${gamesSectionHtml}
    `;
  }

  updateDialogVisibility(mode) {
    const engineSections = document.querySelectorAll('.engine-only');
    engineSections.forEach(s => {
      if (mode === 'engine') {
        s.style.display = '';
      } else {
        s.style.display = 'none';
      }
    });
  }

  // === Board Flip ===

  setupBoardFlip() {
    document.getElementById('btn-flip').addEventListener('click', () => {
      this.board.flip();
      this.updateTimers(this.game.timers);
      this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
    });
  }

  // === PGN Import/Export ===

  setupPGNHandlers() {
    const pgnDialog = document.getElementById('pgn-dialog');

    document.getElementById('btn-import-pgn').addEventListener('click', () => {
      show(pgnDialog);
      document.getElementById('pgn-input').value = '';
    });

    document.getElementById('cancel-pgn').addEventListener('click', () => {
      hide(pgnDialog);
    });

    document.getElementById('load-pgn').addEventListener('click', () => {
      const pgn = document.getElementById('pgn-input').value.trim();
      if (!pgn) return;

      const moves = this.game.loadPGN(pgn);
      if (moves) {
        this.notation.setMoves(moves);
        this.board.setLastMove(moves.length > 0 ? moves[moves.length - 1] : null);
        this.board.update();
        this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
        hide(pgnDialog);
      } else {
        alert('Failed to parse PGN. Please check the format.');
      }
    });

    document.getElementById('btn-export-pgn').addEventListener('click', () => {
      const result = this.game.getGameResult();
      const eventName = this.activeBot ? `vs ${this.activeBot.name}` : (this.game.mode === 'engine' ? 'vs Computer' : 'Local Game');
      const pgn = this.notation.toPGN({
        Result: result ? result.result : '*',
        Event: eventName
      });

      // Copy to clipboard
      navigator.clipboard.writeText(pgn).then(() => {
        this.showToast('PGN copied to clipboard');
      }).catch(() => {
        // Fallback: show in dialog
        const pgnDialog = document.getElementById('pgn-dialog');
        document.getElementById('pgn-input').value = pgn;
        show(pgnDialog);
      });
    });
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #81b64c; color: #fff; padding: 8px 16px; border-radius: 6px;
      font-size: 0.85rem; z-index: 1000; transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    setTimeout(() => toast.remove(), 2500);
  }

  // === Database Dialog ===

  setupDatabaseDialog() {
    const dialog = document.getElementById('database-dialog');
    const searchEl = document.getElementById('db-search');

    document.getElementById('btn-database').addEventListener('click', () => {
      show(dialog);
      this.renderDatabaseGames();
    });

    document.getElementById('close-database').addEventListener('click', () => {
      hide(dialog);
    });

    searchEl.addEventListener('input', debounce(() => {
      this.renderDatabaseGames();
    }, 200));

    document.getElementById('db-collection').addEventListener('change', () => {
      this.renderDatabaseGames();
    });

    // Category tab clicks
    document.getElementById('db-category-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.db-tab');
      if (!tab) return;

      document.querySelectorAll('.db-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.activeCategory = tab.dataset.category;

      this.populateCollectionFilter();
      this.renderDatabaseGames();
    });
  }

  populateCategoryTabs() {
    const tabsEl = document.getElementById('db-category-tabs');
    // Count games per category
    const allCount = this.database.games.length;

    // Keep the "All" tab and update its count
    tabsEl.innerHTML = `<button class="db-tab active" data-category="all">All <span class="tab-count">${allCount}</span></button>`;

    for (const cat of this.database.categories) {
      const count = this.database.games.filter(g => g.category === cat.id).length;
      if (count === 0) continue;
      const btn = document.createElement('button');
      btn.className = 'db-tab';
      btn.dataset.category = cat.id;
      btn.innerHTML = `${cat.name} <span class="tab-count">${count}</span>`;
      tabsEl.appendChild(btn);
    }
  }

  populateCollectionFilter() {
    const select = document.getElementById('db-collection');
    select.innerHTML = '<option value="all">All Collections</option>';

    const collections = this.database.getCollectionsForCategory(this.activeCategory);
    for (const col of collections) {
      const option = document.createElement('option');
      option.value = col.name;
      option.textContent = `${col.name} (${col.count})`;
      select.appendChild(option);
    }
  }

  renderDatabaseGames() {
    const listEl = document.getElementById('db-games-list');
    const query = document.getElementById('db-search').value;
    const collection = document.getElementById('db-collection').value;

    const games = this.database.search(query, collection, this.activeCategory);
    listEl.innerHTML = '';

    if (games.length === 0) {
      listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">No games found</div>';
      return;
    }

    games.slice(0, 100).forEach(game => {
      const item = document.createElement('div');
      item.className = 'db-game-item';
      item.innerHTML = `
        <div class="db-game-players">${game.white} vs ${game.black}</div>
        <div class="db-game-info">${game.event} | ${game.date} | ${game.result}${game.eco ? ' | ' + game.eco : ''}</div>
      `;
      item.addEventListener('click', () => {
        this.loadDatabaseGame(game);
        hide(document.getElementById('database-dialog'));
      });
      listEl.appendChild(item);
    });
  }

  loadDatabaseGame(game) {
    // Load game moves into the game state
    this.game.loadFromMoves(game.moves);
    this.notation.setMoves(this.game.moveHistory);

    // Go to start for replay
    this.game.goToStart();
    this.notation.setCurrentIndex(-1);
    this.board.setLastMove(null);
    this.board.setInteractive(false);
    this.board.setFlipped(false);
    this.board.update();
    this.captured.clear();

    // Update player names
    const topName = document.querySelector('#player-top .player-name');
    const bottomName = document.querySelector('#player-bottom .player-name');
    if (topName) topName.textContent = game.black;
    if (bottomName) bottomName.textContent = game.white;

    // Clear bot
    this.activeBot = null;

    // Hide engine status
    hide(document.getElementById('engine-status'));

    this.updateGameStatus(`${game.white} vs ${game.black} — ${game.event} ${game.date}`);
  }

  // === Opening Explorer ===

  _explorerTimeout = null;
  async fetchOpeningExplorer() {
    // Debounce API calls
    clearTimeout(this._explorerTimeout);
    this._explorerTimeout = setTimeout(() => this._doFetchOpeningExplorer(), 300);
  }

  async _doFetchOpeningExplorer() {
    const nameEl = document.getElementById('opening-name');
    const movesEl = document.getElementById('explorer-moves');
    const labelEl = document.getElementById('opening-label');

    const data = await this.database.fetchOpeningExplorer(this.chess.fen());
    if (!data) {
      // Keep showing last known opening name (persistence)
      if (labelEl) labelEl.textContent = this.lastOpeningName;
      nameEl.textContent = this.lastOpeningName;
      movesEl.innerHTML = '';
      return;
    }

    // Opening name — update and persist
    const openingName = data.opening?.name || '';
    if (openingName) {
      this.lastOpeningName = openingName;
    }
    nameEl.textContent = this.lastOpeningName;
    if (labelEl) labelEl.textContent = this.lastOpeningName;

    // Top moves
    movesEl.innerHTML = '';
    if (data.moves && data.moves.length > 0) {
      data.moves.slice(0, 8).forEach(m => {
        const total = m.white + m.draws + m.black;
        const btn = document.createElement('button');
        btn.className = 'explorer-move';
        const winRate = total > 0 ? Math.round((m.white / total) * 100) : 0;
        btn.innerHTML = `<span class="move-text">${m.san}</span><span class="move-stats">${total} (${winRate}%)</span>`;

        btn.addEventListener('click', () => {
          if (!this.game.gameOver && !this.game.replayMode) {
            // Find from/to for this SAN move
            const legalMoves = this.chess.moves({ verbose: true });
            const match = legalMoves.find(lm => lm.san === m.san);
            if (match) {
              this.board.tryMove(match.from, match.to);
            }
          }
        });

        movesEl.appendChild(btn);
      });
    }
  }

  // === Analysis ===

  setupAnalysis() {
    document.getElementById('btn-analyze').addEventListener('click', () => {
      this.runAnalysis();
    });
  }

  async runAnalysis() {
    if (!this.engineInitialized) {
      await this.initEngine();
    }
    if (!this.analyzer) {
      this.analyzer = new GameAnalyzer(this.engine);
    }

    if (this.analyzer.analyzing) return;
    if (this.game.moveHistory.length === 0) return;

    // Stop engine from any ongoing work
    if (this.engine.thinking) {
      this.engine.stop();
    }

    // Temporarily remove the onBestMove handler so analysis doesn't trigger game moves
    const origHandler = this.engine.onBestMove;
    this.engine.onBestMove = null;

    hide(document.getElementById('btn-analyze'));
    const progressEl = document.getElementById('analysis-progress');
    const progressFill = document.getElementById('analysis-progress-fill');
    const progressText = document.getElementById('analysis-progress-text');
    show(progressEl);

    this.analyzer.onProgress = (i, total) => {
      const pct = Math.round((i / total) * 100);
      progressFill.style.width = `${pct}%`;
      progressText.textContent = `Analyzing move ${i + 1} of ${total}...`;
    };

    try {
      const results = await this.analyzer.analyzeGame(this.game.fens, this.game.moveHistory);
      this.analysisResults = results;

      if (results) {
        // Set classifications on notation
        this.notation.setClassifications(results.moves);

        // Show analysis summary
        this._renderAnalysisSummary(results);

        // Show eval graph
        show(document.getElementById('eval-graph-container'));
        this.evalGraph.render(results.moves, this.notation.currentIndex);
        this.evalGraph.onMoveClick = (idx) => this.navigateToMove(idx);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      this.showToast('Analysis failed');
    }

    hide(progressEl);

    // Restore handler
    this.engine.onBestMove = origHandler;
  }

  _renderAnalysisSummary(results) {
    const el = document.getElementById('analysis-summary');
    show(el);

    const classColors = {
      best: '#4caf50', great: '#2196f3', good: '#8bc34a',
      inaccuracy: '#ffc107', mistake: '#ff9800', blunder: '#f44336'
    };

    let countsHtml = '';
    for (const [cls, color] of Object.entries(classColors)) {
      const wCount = results.white.counts[cls] || 0;
      const bCount = results.black.counts[cls] || 0;
      countsHtml += `<div class="analysis-count-item"><span class="analysis-dot" style="background:${color}"></span>${cls}: ${wCount}/${bCount}</div>`;
    }

    el.innerHTML = `
      <h4>Analysis</h4>
      <div class="analysis-accuracy">
        <div class="accuracy-block">
          <div class="accuracy-value">${results.white.accuracy}%</div>
          <div class="accuracy-label">White accuracy</div>
        </div>
        <div class="accuracy-block">
          <div class="accuracy-value">${results.black.accuracy}%</div>
          <div class="accuracy-label">Black accuracy</div>
        </div>
      </div>
      <div class="analysis-counts">${countsHtml}</div>
    `;
  }

  showMoveTooltip(index, event) {
    const tooltip = document.getElementById('move-tooltip');
    if (index < 0 || !this.analysisResults || !event) {
      hide(tooltip);
      return;
    }

    const data = this.analysisResults.moves[index];
    if (!data) {
      hide(tooltip);
      return;
    }

    const evalStr = data.bestEval > 0 ? `+${(data.bestEval / 100).toFixed(1)}` : (data.bestEval / 100).toFixed(1);

    let html = `<strong>${data.move}</strong> — ${data.classification}`;
    html += `<br>Eval: ${evalStr}`;
    if (data.cpLoss > 0) {
      html += `<br>Centipawn loss: ${data.cpLoss}`;
    }
    if (data.bestMove && !data.isBestMove) {
      html += `<br>Best: ${data.bestMove}`;
    }

    tooltip.innerHTML = html;
    show(tooltip);

    // Position near cursor
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 8}px`;
    tooltip.style.top = `${rect.top}px`;
  }

  // === Coach ===

  setupCoach() {
    // Initialize coach (without engine initially — will be set when engine loads)
    this.coach = new CoachManager(null);
    this._wireCoachCallbacks();

    // Send button
    document.getElementById('btn-coach-send').addEventListener('click', () => {
      this._sendCoachMessage();
    });

    // Enter key
    document.getElementById('coach-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._sendCoachMessage();
      }
    });

    // Settings button
    document.getElementById('btn-coach-settings').addEventListener('click', () => {
      this._showCoachSettings();
    });

    document.getElementById('close-coach-settings').addEventListener('click', () => {
      hide(document.getElementById('coach-settings-dialog'));
    });

    // Coach tier selection
    document.getElementById('coach-tier-group').querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('coach-tier-group').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tier = parseInt(btn.dataset.value);
        this.coach.setTier(tier);
        this._updateCoachTierBadge();
        this._updateCoachSettingsSections(tier);
      });
    });

    // Load WebLLM button
    document.getElementById('coach-load-webllm').addEventListener('click', async () => {
      try {
        show(document.getElementById('coach-webllm-progress'));
        await this.coach.loadWebLLM();
        this.showToast('AI model loaded successfully');
        document.getElementById('coach-load-webllm').textContent = 'Model Loaded';
        document.getElementById('coach-load-webllm').disabled = true;
      } catch (err) {
        this.showToast(`Failed to load model: ${err.message}`);
      }
      hide(document.getElementById('coach-webllm-progress'));
    });

    // API save button
    document.getElementById('coach-api-save').addEventListener('click', () => {
      this.coach.updateAPISettings({
        provider: document.getElementById('coach-api-provider').value,
        apiKey: document.getElementById('coach-api-key').value,
        model: document.getElementById('coach-api-model').value
      });
      this.showToast('API settings saved');
    });
  }

  _wireCoachCallbacks() {
    if (!this.coach) return;

    this.coach.onMessage = (messages) => {
      this._renderCoachMessages(messages);
    };

    this.coach.onStatus = (status) => {
      const el = document.getElementById('coach-status');
      if (el) el.textContent = status;

      // Update WebLLM progress if loading
      if (status.startsWith('Loading model:')) {
        const progressText = document.getElementById('coach-webllm-progress-text');
        if (progressText) progressText.textContent = status;
      }
    };
  }

  _sendCoachMessage() {
    const input = document.getElementById('coach-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    // Build game context
    const context = {
      fen: this.chess.fen(),
      opening: this.lastOpeningName,
      moves: this.game.moveHistory.slice(-10).map(m => m.san).join(' '),
      phase: this._getGamePhase(),
      playerColor: this.game.playerColor
    };

    this.coach.sendMessage(text, context);
  }

  _getGamePhase() {
    const moveCount = this.game.moveHistory.length;
    if (moveCount < 15) return 'opening';
    if (moveCount < 40) return 'middlegame';
    return 'endgame';
  }

  _renderCoachMessages(messages) {
    const el = document.getElementById('coach-messages');
    el.innerHTML = '';

    for (const msg of messages) {
      const div = document.createElement('div');
      div.className = `coach-msg ${msg.role}`;
      if (msg.type) div.classList.add(msg.type);
      div.textContent = msg.content;
      el.appendChild(div);
    }

    el.scrollTop = el.scrollHeight;
  }

  _updateCoachTierBadge() {
    const badge = document.getElementById('coach-tier-badge');
    const tierNames = { 1: 'Stockfish', 2: 'Browser AI', 3: 'API' };
    badge.textContent = tierNames[this.coach.activeTier] || 'Tier 1';
  }

  _showCoachSettings() {
    const dialog = document.getElementById('coach-settings-dialog');
    show(dialog);

    // Update tier button states
    const tierGroup = document.getElementById('coach-tier-group');
    tierGroup.querySelectorAll('.btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.value) === this.coach.activeTier);
    });

    this._updateCoachSettingsSections(this.coach.activeTier);

    // Update WebLLM info
    const webllmInfo = document.getElementById('coach-webllm-info');
    if (!this.coach.webllm.checkSupport()) {
      webllmInfo.textContent = 'WebGPU is not supported in this browser. Try Chrome 113+ or Edge 113+.';
      document.getElementById('coach-load-webllm').disabled = true;
    } else if (this.coach.webllm.isReady()) {
      document.getElementById('coach-load-webllm').textContent = 'Model Loaded';
      document.getElementById('coach-load-webllm').disabled = true;
    }

    // Update API settings
    document.getElementById('coach-api-provider').value = this.coach.api.provider;
    document.getElementById('coach-api-key').value = this.coach.api.apiKey;
    document.getElementById('coach-api-model').value = this.coach.api.model;
  }

  _updateCoachSettingsSections(tier) {
    const webllmSection = document.getElementById('coach-webllm-section');
    const apiSection = document.getElementById('coach-api-section');

    if (tier === 2) {
      show(webllmSection);
      hide(apiSection);
    } else if (tier === 3) {
      hide(webllmSection);
      show(apiSection);
    } else {
      hide(webllmSection);
      hide(apiSection);
    }
  }

  // === Admin ===

  setupAdmin() {
    document.getElementById('btn-admin').addEventListener('click', async () => {
      if (!this.dataService) return;

      if (!this.adminPanel) {
        this.adminPanel = new AdminPanel(this.dataService);
      }

      const contentEl = document.getElementById('admin-content');
      contentEl.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Loading...</p>';
      show(document.getElementById('admin-dialog'));

      await this.adminPanel.loadUsers();
      contentEl.innerHTML = this.adminPanel.renderUsersTab();
      this._wireAdminUserClicks(contentEl);
    });

    document.getElementById('close-admin').addEventListener('click', () => {
      hide(document.getElementById('admin-dialog'));
    });

    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const contentEl = document.getElementById('admin-content');
        if (tab.dataset.tab === 'users') {
          contentEl.innerHTML = this.adminPanel ? this.adminPanel.renderUsersTab() : '';
          this._wireAdminUserClicks(contentEl);
        } else if (tab.dataset.tab === 'leaderboard') {
          contentEl.innerHTML = this.adminPanel ? this.adminPanel.renderLeaderboard() : '';
        }
      });
    });
  }

  _wireAdminUserClicks(container) {
    container.querySelectorAll('.admin-user-row').forEach(row => {
      row.addEventListener('click', async () => {
        const uid = row.dataset.uid;
        const detail = await this.adminPanel.getUserDetail(uid);
        if (detail) {
          const contentEl = document.getElementById('admin-content');
          contentEl.innerHTML = this.adminPanel.renderUserDetail(detail) +
            '<button class="btn btn-sm" id="admin-back-to-users" style="margin-top:12px;">Back to Users</button>';

          document.getElementById('admin-back-to-users').addEventListener('click', () => {
            contentEl.innerHTML = this.adminPanel.renderUsersTab();
            this._wireAdminUserClicks(contentEl);
          });
        }
      });
    });
  }

  // === Auth ===

  setupAuth() {
    // Init Firebase if configured
    if (isFirebaseConfigured()) {
      this.firebaseReady = initFirebase();
    }

    if (this.firebaseReady) {
      this.auth = new AuthManager();
      this.dataService = new DataService(this.auth);
      this.auth.onAuthChange = async (user) => {
        this._updateAuthUI(user);
        if (user) {
          // Migrate local data on first login
          await this.dataService.migrateLocalData();
          // Sync stats from cloud
          const cloudStats = await this.dataService.loadStats();
          if (cloudStats && cloudStats.games) {
            this.stats.data = cloudStats;
          }
        }
      };
      this.auth.init();
    }

    const authDialog = document.getElementById('auth-dialog');
    const authBtn = document.getElementById('btn-auth');

    authBtn.addEventListener('click', () => {
      if (this.auth && this.auth.isLoggedIn()) {
        // Logout
        this.auth.logout();
      } else {
        show(authDialog);
      }
    });

    document.getElementById('close-auth').addEventListener('click', () => {
      hide(authDialog);
    });

    // Switch forms
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      hide(document.getElementById('login-form'));
      show(document.getElementById('register-form'));
    });

    document.getElementById('back-to-login').addEventListener('click', () => {
      hide(document.getElementById('register-form'));
      show(document.getElementById('login-form'));
    });

    // Login
    document.getElementById('btn-login').addEventListener('click', async () => {
      if (!this.auth) {
        this._showAuthError('login', 'Firebase not configured. Update firebase-config.js with your project settings.');
        return;
      }
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) return;

      try {
        await this.auth.login(email, password);
        hide(authDialog);
      } catch (err) {
        this._showAuthError('login', err.message);
      }
    });

    // Register
    document.getElementById('btn-register').addEventListener('click', async () => {
      if (!this.auth) {
        this._showAuthError('register', 'Firebase not configured. Update firebase-config.js with your project settings.');
        return;
      }
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      if (!name || !email || !password) return;

      try {
        await this.auth.register(email, password, name);
        hide(authDialog);
      } catch (err) {
        this._showAuthError('register', err.message);
      }
    });
  }

  _updateAuthUI(user) {
    const authBtn = document.getElementById('btn-auth');
    const authStatus = document.getElementById('auth-status');

    if (user) {
      authBtn.textContent = 'Logout';
      authStatus.textContent = user.displayName || user.email;
      show(authStatus);

      // Show admin button if admin
      if (this.auth.isAdmin()) {
        const adminBtn = document.getElementById('btn-admin');
        if (adminBtn) show(adminBtn);
      }
    } else {
      authBtn.textContent = 'Login';
      hide(authStatus);

      const adminBtn = document.getElementById('btn-admin');
      if (adminBtn) hide(adminBtn);
    }
  }

  _showAuthError(form, message) {
    const errorEl = document.getElementById(`${form}-error`);
    errorEl.textContent = message;
    show(errorEl);
  }

  // === Bot Match ===

  setupBotMatch() {
    const matchSettings = { whiteId: null, blackId: null };

    document.getElementById('btn-bot-match').addEventListener('click', () => {
      this._renderBotMatchPickers(matchSettings);
      show(document.getElementById('bot-match-dialog'));
    });

    document.getElementById('cancel-bot-match').addEventListener('click', () => {
      hide(document.getElementById('bot-match-dialog'));
    });

    document.getElementById('start-bot-match').addEventListener('click', async () => {
      if (!matchSettings.whiteId || !matchSettings.blackId) {
        this.showToast('Select both white and black bots');
        return;
      }
      hide(document.getElementById('bot-match-dialog'));
      await this._runBotMatch(matchSettings);
    });
  }

  _renderBotMatchPickers(settings) {
    const whiteEl = document.getElementById('bot-match-white');
    const blackEl = document.getElementById('bot-match-black');

    [whiteEl, blackEl].forEach((el, idx) => {
      el.innerHTML = '';
      const side = idx === 0 ? 'whiteId' : 'blackId';

      for (const tier of BOT_TIERS) {
        const tierBots = BOT_PERSONALITIES.filter(b => b.tier === tier.id);
        if (tierBots.length === 0) continue;

        const label = document.createElement('div');
        label.className = 'bot-tier-label';
        label.textContent = tier.name;
        el.appendChild(label);

        for (const bot of tierBots) {
          const card = document.createElement('div');
          card.className = 'bot-list-card' + (settings[side] === bot.id ? ' selected' : '');
          card.innerHTML = `
            <img class="bot-list-portrait" src="${bot.portrait}" alt="${bot.name}">
            <div class="bot-list-info">
              <div class="bot-list-name">${bot.name}</div>
              <div class="bot-list-elo">${bot.peakElo}</div>
            </div>
          `;
          card.addEventListener('click', () => {
            el.querySelectorAll('.bot-list-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            settings[side] = bot.id;
          });
          el.appendChild(card);
        }
      }
    });
  }

  async _runBotMatch(settings) {
    const white = BOT_PERSONALITIES.find(b => b.id === settings.whiteId);
    const black = BOT_PERSONALITIES.find(b => b.id === settings.blackId);
    if (!white || !black) return;

    // Ensure engine is ready
    await this.initEngine();
    if (!this.engine || !this.engine.ready) {
      this.showToast('Engine failed to load');
      return;
    }

    // Show progress
    const progressDialog = document.getElementById('bot-match-progress');
    const statusEl = document.getElementById('bot-match-status');
    const fillEl = document.getElementById('bot-match-progress-fill');
    show(progressDialog);
    statusEl.textContent = `${white.name} vs ${black.name} — Preparing...`;
    fillEl.style.width = '0%';

    // Temporarily remove onBestMove to prevent interference
    const origHandler = this.engine.onBestMove;
    this.engine.onBestMove = null;

    this.botMatch = new BotMatch(this.engine);
    this.botMatch.onProgress = (moveNum) => {
      const pct = Math.min(100, moveNum * 0.5);
      fillEl.style.width = `${pct}%`;
      statusEl.textContent = `${white.name} vs ${black.name} — Move ${moveNum}...`;
    };

    try {
      const result = await this.botMatch.simulate(white, black);
      hide(progressDialog);

      // Restore handler
      this.engine.onBestMove = origHandler;

      // Load game for replay
      this._loadBotMatchForReplay(result, white, black);
    } catch (err) {
      hide(progressDialog);
      this.engine.onBestMove = origHandler;
      console.error('Bot match failed:', err);
      this.showToast('Bot match simulation failed');
    }
  }

  _loadBotMatchForReplay(result, white, black) {
    // Load moves into game (loadFromMoves expects SAN strings)
    const sanMoves = result.moves.map(m => m.san);
    this.game.loadFromMoves(sanMoves);
    this.notation.setMoves(this.game.moveHistory);

    // Go to start for replay
    this.game.goToStart();
    this.notation.setCurrentIndex(-1);
    this.board.setLastMove(null);
    this.board.setInteractive(false);
    this.board.setFlipped(false);
    this.board.update();
    this.captured.clear();

    // Clear analysis
    this.analysisResults = null;
    hide(document.getElementById('btn-analyze'));
    hide(document.getElementById('analysis-progress'));
    hide(document.getElementById('analysis-summary'));
    hide(document.getElementById('eval-graph-container'));
    this.evalGraph.clear();
    this.notation.clearClassifications();

    // Show analyze button (game is "over" since it's a replay)
    if (this.engineInitialized) {
      show(document.getElementById('btn-analyze'));
    }

    // Update player names
    const topName = document.querySelector('#player-top .player-name');
    const bottomName = document.querySelector('#player-bottom .player-name');
    if (topName) topName.textContent = black.name;
    if (bottomName) bottomName.textContent = white.name;

    // Clear bot (not a player game)
    this.activeBot = null;
    hide(document.getElementById('engine-status'));

    this.updateGameStatus(`${white.name} vs ${black.name} — ${result.result}`);
    this.showToast(`Game complete: ${result.result}. Use arrow keys to replay.`);
  }

  // === Themes ===

  setupThemes() {
    document.getElementById('btn-themes').addEventListener('click', () => {
      this._renderThemeDialog();
      show(document.getElementById('theme-dialog'));
    });

    document.getElementById('close-theme-dialog').addEventListener('click', () => {
      hide(document.getElementById('theme-dialog'));
    });
  }

  _renderThemeDialog() {
    // Board themes
    const swatchesEl = document.getElementById('board-theme-swatches');
    swatchesEl.innerHTML = '';

    for (const theme of BOARD_THEMES) {
      const btn = document.createElement('button');
      btn.className = 'board-theme-swatch' + (theme.id === this.themes.boardTheme ? ' active' : '');
      btn.innerHTML = `
        <div class="swatch-preview">
          <div style="background:${theme.light}"></div>
          <div style="background:${theme.dark}"></div>
          <div style="background:${theme.dark}"></div>
          <div style="background:${theme.light}"></div>
        </div>
        <span class="swatch-label">${theme.name}</span>
      `;
      btn.addEventListener('click', () => {
        swatchesEl.querySelectorAll('.board-theme-swatch').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        this.themes.applyBoardTheme(theme.id);
      });
      swatchesEl.appendChild(btn);
    }

    // Piece themes
    const piecesEl = document.getElementById('piece-theme-list');
    piecesEl.innerHTML = '';

    for (const theme of PIECE_THEMES) {
      const btn = document.createElement('button');
      btn.className = 'piece-theme-option' + (theme.id === this.themes.pieceTheme ? ' active' : '');
      btn.innerHTML = `
        <div class="piece-preview">
          <img src="assets/pieces/${theme.id}/wK.svg" alt="King">
          <img src="assets/pieces/${theme.id}/wQ.svg" alt="Queen">
          <img src="assets/pieces/${theme.id}/bN.svg" alt="Knight">
        </div>
        <span class="piece-theme-label">${theme.name}</span>
      `;
      btn.addEventListener('click', () => {
        piecesEl.querySelectorAll('.piece-theme-option').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        this.themes.setPieceTheme(theme.id);
      });
      piecesEl.appendChild(btn);
    }
  }

  // === Panel Tabs ===

  setupPanelTabs() {
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabId = tab.dataset.tab;
        document.querySelectorAll('.panel-content').forEach(panel => {
          if (panel.id === `tab-${tabId}`) {
            show(panel);
          } else {
            hide(panel);
          }
        });
      });
    });
  }

  // === Stats ===

  setupStatsDialog() {
    document.getElementById('btn-stats').addEventListener('click', () => {
      this._renderStats();
      show(document.getElementById('stats-dialog'));
    });

    document.getElementById('close-stats').addEventListener('click', () => {
      hide(document.getElementById('stats-dialog'));
    });
  }

  _renderStats() {
    const el = document.getElementById('stats-content');
    const record = this.stats.getRecord();

    if (record.total === 0) {
      el.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">No games played yet. Play against the computer to start tracking your stats.</p>';
      return;
    }

    let html = '';

    // W/L/D record
    html += `
      <div class="stats-record">
        <div class="stats-record-item wins">
          <div class="stats-record-value">${record.wins}</div>
          <div class="stats-record-label">Wins</div>
        </div>
        <div class="stats-record-item losses">
          <div class="stats-record-value">${record.losses}</div>
          <div class="stats-record-label">Losses</div>
        </div>
        <div class="stats-record-item draws">
          <div class="stats-record-value">${record.draws}</div>
          <div class="stats-record-label">Draws</div>
        </div>
        <div class="stats-record-item">
          <div class="stats-record-value">${record.total}</div>
          <div class="stats-record-label">Total</div>
        </div>
      </div>`;

    // Rating (10+ games)
    const rating = this.stats.estimateRating();
    if (rating) {
      html += `
        <div class="stats-rating">
          <div class="stats-record-label">Estimated Rating</div>
          <div class="stats-rating-value">${rating}</div>
        </div>`;
    }

    // Playing style (10+ games)
    const style = this.stats.getPlayingStyle();
    if (style) {
      html += `
        <div class="stats-style">
          <div class="stats-style-name">${style.name}</div>
          <div class="stats-style-desc">${style.description}</div>
        </div>`;
    }

    // Opening stats
    const openingStats = this.stats.getOpeningStats();
    if (openingStats.length > 0) {
      html += '<div class="stats-openings"><h4>Favorite Openings</h4>';
      for (const o of openingStats.slice(0, 5)) {
        html += `
          <div class="stats-opening-item">
            <span class="stats-opening-name">${o.name} (${o.total} games)</span>
            <span class="stats-opening-rate">${o.winRate}% win</span>
          </div>`;
      }
      html += '</div>';
    }

    // Recent games
    const recent = this.stats.getRecentGames(10);
    if (recent.length > 0) {
      html += '<div class="stats-recent"><h4>Recent Games</h4>';
      for (const g of recent) {
        const date = new Date(g.date).toLocaleDateString();
        html += `
          <div class="stats-game-item">
            <span>vs ${g.opponent} (${g.opponentElo})</span>
            <span class="stats-game-result ${g.result}">${g.result}</span>
          </div>`;
      }
      html += '</div>';
    }

    el.innerHTML = html;
  }

  // === Tournament ===

  setupTournament() {
    // Tournament button
    document.getElementById('btn-tournament').addEventListener('click', () => {
      if (this.tournament.active) {
        this._showTournamentProgress();
      } else {
        this._showTournamentSetup();
      }
    });

    document.getElementById('cancel-tournament-setup').addEventListener('click', () => {
      hide(document.getElementById('tournament-setup-dialog'));
    });

    document.getElementById('tournament-close').addEventListener('click', () => {
      hide(document.getElementById('tournament-dialog'));
    });

    document.getElementById('tournament-abandon').addEventListener('click', () => {
      if (confirm('Are you sure you want to abandon this tournament?')) {
        this.tournament.abandon();
        hide(document.getElementById('tournament-dialog'));
        this._hideTournamentButton();
      }
    });

    document.getElementById('tournament-next-match').addEventListener('click', () => {
      hide(document.getElementById('tournament-dialog'));
      this._playNextTournamentMatch();
    });

    // Format selection
    document.getElementById('tournament-format-group').querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('tournament-format-group').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Games per match selection
    document.getElementById('tournament-games-group').querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('tournament-games-group').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Time control selection
    document.getElementById('tournament-time-group').querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('tournament-time-group').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Start tournament
    document.getElementById('start-tournament').addEventListener('click', () => {
      this._startTournament();
    });
  }

  _showTournamentSetup() {
    const dialog = document.getElementById('tournament-setup-dialog');
    const opponentsEl = document.getElementById('tournament-opponents');

    // Populate opponents
    opponentsEl.innerHTML = '';
    for (const tier of BOT_TIERS) {
      const tierBots = BOT_PERSONALITIES.filter(b => b.tier === tier.id);
      if (tierBots.length === 0) continue;

      const label = document.createElement('div');
      label.className = 'bot-tier-label';
      label.textContent = tier.name;
      opponentsEl.appendChild(label);

      for (const bot of tierBots) {
        const row = document.createElement('label');
        row.className = 'tournament-opponent';
        row.innerHTML = `
          <input type="checkbox" value="${bot.id}" data-name="${bot.name}" data-elo="${bot.stockfishElo || bot.peakElo}">
          <span class="tournament-opponent-name">${bot.name}</span>
          <span class="tournament-opponent-elo">${bot.peakElo}</span>
        `;
        opponentsEl.appendChild(row);
      }
    }

    show(dialog);
  }

  _startTournament() {
    const format = document.querySelector('#tournament-format-group .btn.active')?.dataset.value || 'round-robin';
    const gamesPerMatch = parseInt(document.querySelector('#tournament-games-group .btn.active')?.dataset.value) || 1;
    const timeBtn = document.querySelector('#tournament-time-group .btn.active');
    const timeControl = parseInt(timeBtn?.dataset.time) || 0;
    const increment = parseInt(timeBtn?.dataset.increment) || 0;

    // Get selected opponents
    const checkboxes = document.querySelectorAll('#tournament-opponents input[type="checkbox"]:checked');
    if (checkboxes.length < 2) {
      this.showToast('Select at least 2 opponents');
      return;
    }

    const participants = Array.from(checkboxes).map(cb => ({
      id: cb.value,
      name: cb.dataset.name,
      elo: parseInt(cb.dataset.elo) || 1500
    }));

    this.tournament.create({ format, participants, timeControl, increment, gamesPerMatch });

    hide(document.getElementById('tournament-setup-dialog'));
    this._showTournamentButton();
    this._showTournamentProgress();
  }

  _showTournamentProgress() {
    const dialog = document.getElementById('tournament-dialog');
    const content = document.getElementById('tournament-content');
    const title = document.getElementById('tournament-title');
    const nextMatchBtn = document.getElementById('tournament-next-match');

    title.textContent = `${this.tournament.format === 'round-robin' ? 'Round Robin' : 'Knockout'} Tournament`;

    if (this.tournament.format === 'round-robin') {
      content.innerHTML = this._renderRoundRobinStandings();
    } else {
      content.innerHTML = this._renderKnockoutBracket();
    }

    // Show/hide next match button
    const nextMatch = this.tournament.getNextMatch();
    if (nextMatch && !this.tournament.isFinished()) {
      show(nextMatchBtn);
      nextMatchBtn.textContent = `Play vs ${nextMatch.opponentName}`;
    } else {
      hide(nextMatchBtn);
    }

    // Tournament finished?
    if (this.tournament.isFinished()) {
      const winner = this.tournament.getWinner();
      content.innerHTML += `<div class="tournament-status">Tournament Complete! Winner: ${winner?.name || 'Unknown'}</div>`;
      hide(document.getElementById('tournament-abandon'));
    } else {
      show(document.getElementById('tournament-abandon'));
    }

    show(dialog);
  }

  _renderRoundRobinStandings() {
    const standings = this.tournament.standings;
    let html = '<table class="tournament-standings"><thead><tr><th>#</th><th>Player</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead><tbody>';

    standings.forEach((s, i) => {
      const isPlayer = s.id === '_player';
      html += `<tr class="${isPlayer ? 'player-row' : ''}">
        <td>${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.wins}</td>
        <td>${s.draws}</td>
        <td>${s.losses}</td>
        <td class="points">${s.points}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    const progress = this.tournament.getProgress();
    html += `<div style="text-align:center;font-size:0.75rem;color:#888;">Games played: ${progress.played}/${progress.total}</div>`;
    return html;
  }

  _renderKnockoutBracket() {
    const roundNames = ['Round 1', 'Quarterfinals', 'Semifinals', 'Final'];
    let html = '<div class="tournament-bracket">';

    this.tournament.bracket.forEach((round, r) => {
      const roundName = r < roundNames.length ? roundNames[r] : `Round ${r + 1}`;
      if (this.tournament.bracket.length <= 3) {
        // Adjust naming for small brackets
      }

      html += `<div class="bracket-round">`;
      html += `<div class="bracket-round-title">${roundName}</div>`;

      for (const match of round) {
        html += '<div class="bracket-match">';
        const p1 = match.player1;
        const p2 = match.player2;

        const p1Class = match.winner === p1?.id ? 'winner' : (match.winner && match.winner !== p1?.id ? 'loser' : '');
        const p2Class = match.winner === p2?.id ? 'winner' : (match.winner && match.winner !== p2?.id ? 'loser' : '');

        html += `<div class="bracket-player ${p1Class}">${p1?.name || 'TBD'}</div>`;
        html += `<div class="bracket-player ${p2Class}">${p2?.name || 'TBD'}</div>`;
        html += '</div>';
      }

      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  _playNextTournamentMatch() {
    const match = this.tournament.getNextMatch();
    if (!match) {
      this.showToast('No more matches to play');
      return;
    }

    this.currentTournamentMatch = match;

    // Find the bot
    const bot = BOT_PERSONALITIES.find(b => b.id === match.opponentId);
    if (!bot) return;

    // Start a game with tournament settings
    this._startNewGame({
      mode: 'engine',
      color: match.playerColor,
      botId: match.opponentId,
      time: this.tournament.timeControl,
      increment: this.tournament.increment
    });
  }

  _showTournamentButton() {
    // Tournament button already exists, just highlight it
    const btn = document.getElementById('btn-tournament');
    if (btn) btn.style.borderColor = 'var(--accent)';
  }

  _hideTournamentButton() {
    const btn = document.getElementById('btn-tournament');
    if (btn) btn.style.borderColor = '';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ChessApp();
});
