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
import { initSupabase, isSupabaseConfigured, getSupabase } from './supabase-config.js';
import { AuthManager } from './auth.js';
import { DataService } from './data-service.js';
import { AdminPanel } from './admin.js';
import { DGTBoard } from './dgt.js';
import { SoundManager } from './sound.js';
import { MultiplayerManager } from './multiplayer.js';
import { PuzzleManager } from './puzzle.js';
import { PlayerProfile } from './profile.js';
import { RatingGraph } from './rating-graph.js';
import { MusicPlayer, PLAYLIST } from './music.js';
import { ChessNews } from './chess-news.js';

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
    this.dgtBoard = null;
    this.sound = new SoundManager();
    this._gameOverSoundPlayed = false;
    this.multiplayer = null;
    this.puzzleManager = new PuzzleManager();
    this.puzzleActive = false;
    this.profile = new PlayerProfile();
    this.ratingGraph = null;
    this.music = new MusicPlayer();
    this.chessNews = new ChessNews();
    this._evalBarEnabled = localStorage.getItem('chess_eval_bar') !== 'false'; // ON by default
    this._evalBarAbortId = 0;
    this._lastAdvisorResults = {}; // botId -> { san, eval }

    // Move clock — tracks thinking time per move
    this._moveClockStart = Date.now();
    this._moveClockInterval = null;
    this._moveClockColor = 'w'; // whose turn is being timed

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
    this.setupAdvisors();
    this.setupThemes();
    this.setupBotMatch();
    this.setupAuth();
    this.setupAdmin();
    this.setupDGT();
    this.setupSoundToggle();
    this.setupMultiplayer();
    this.setupPuzzles();
    this.setupReviewDialog();
    this.setupHamburgerMenu();
    this.setupOfflineIndicator();
    this.setupMusic();
    this.setupNews();
    this.setupEvalBar();
    this.setupEvalBarToggle();
    this.setupResizeHandles();
    this.setupNotes();

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
        if (status.startsWith('Thinking')) {
          engineStatusEl.innerHTML = `<span class="thinking">${prefix}: ${status} <span class="thinking-dots"><span></span><span></span><span></span></span></span>`;
        } else {
          engineStatusEl.textContent = `${prefix}: ${status}`;
        }
      };
      this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);
      this.engine.onNoMove = () => this._handleEngineNoMove();

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
    // Puzzle mode interception — validate move before applying side effects
    if (this.puzzleActive) {
      this._handlePuzzleMove(move);
      return;
    }

    this.sound.playMoveSound(move);
    this.notation.addMove(move);
    this.board.setLastMove(move);
    this.board.update();
    this.updateTimers(this.game.timers);

    // Update captured pieces
    this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);

    if (this.game.gameOver) {
      this._stopMoveClock();
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

    // Relay move to opponent in multiplayer
    if (this.game.mode === 'multiplayer' && this.multiplayer) {
      this.multiplayer.sendMove(move);
      this.board.setInteractive(false);
    }

    // Start move clock for the new side to move
    this._startMoveClock(this.chess.turn());

    // If playing vs engine and it's engine's turn
    if (this.game.mode === 'engine' && this.chess.turn() !== this.game.playerColor) {
      this.requestEngineMove();
      // DON'T run analysis while engine needs to move — wait for handleEngineMove()
    } else {
      // Safe to analyze — it's the player's turn or local/multiplayer mode
      this._updateAdvisorAnalysis();
      this._updateEvalBar();
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
    this._setEngineThinking(true);
    this._startEngineMoveTimer();

    // ALWAYS restore active bot personality before requesting a move.
    // Analysis (eval bar, advisors) may have changed engine personality.
    if (this.activeBot) {
      this.engine.applyPersonality(this.activeBot);
    }

    // Check opening book first
    if (this.activeBot) {
      const engineColor = this.game.playerColor === 'w' ? 'b' : 'w';
      const bookMove = this.openingBook.getBookMove(this.activeBot, this.game.moveHistory, engineColor);
      if (bookMove) {
        // Simulate thinking delay (300-800ms) — book moves are instant
        this._clearEngineMoveTimer();
        const delay = 300 + Math.random() * 500;
        setTimeout(() => {
          this._setEngineThinking(false);
          // Find the UCI-style from/to for this SAN move
          const legalMoves = this.chess.moves({ verbose: true });
          const match = legalMoves.find(m => m.san === bookMove);
          if (match) {
            const move = this.game.makeEngineMove(match.from, match.to, match.promotion);
            if (move) {
              this.sound.playMoveSound(move);
              this.notation.addMove(move);
              this.board.setLastMove(move);
              this.board.update();
              this.updateTimers(this.game.timers);
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
            this._setEngineThinking(true);
            this._startEngineMoveTimer();
            this.engine.thinking = false;
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
    this._setEngineThinking(false);
    const parsed = Engine.parseUCIMove(uciMove);
    const move = this.game.makeEngineMove(parsed.from, parsed.to, parsed.promotion);

    if (move) {
      this.sound.playMoveSound(move);
      this.notation.addMove(move);
      this.board.setLastMove(move);
      this.board.update();
      this.updateTimers(this.game.timers);
      this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
      this.fetchOpeningExplorer();

      // DGT: show engine move guidance
      if (this.dgtBoard?.isConnected()) {
        this.dgtBoard.setEngineMoveToPlay({ from: move.from, to: move.to, san: move.san });
        const engineMoveEl = document.getElementById('dgt-engine-move');
        const engineMoveSan = document.getElementById('dgt-engine-move-san');
        if (engineMoveEl && engineMoveSan) {
          engineMoveSan.textContent = move.san;
          show(engineMoveEl);
        }
        this.showToast(`Play ${move.san} on your DGT board`);
      }
    }

    if (!this.game.gameOver) {
      this.board.setInteractive(true);
      // Start move clock for player's turn
      this._startMoveClock(this.chess.turn());
      // Update advisor analysis and eval bar after engine move
      this._updateAdvisorAnalysis();
      this._updateEvalBar();
    } else {
      this._stopMoveClock();
      this._onGameEnd();
    }
  }

  _handleEngineNoMove() {
    // Engine returned bestmove (none) or 0000 — game is over (checkmate/stalemate)
    this._clearEngineMoveTimer();
    this._setEngineThinking(false);
    if (!this.game.gameOver) {
      // The game should already be over — check
      if (this.chess.game_over()) {
        this.game.gameOver = true;
        this._onGameEnd();
      } else {
        // Something unexpected — make board interactive again
        this.board.setInteractive(true);
      }
    }
  }

  handleGameOver(result) {
    // This is called from game.js for time-based game-over
    this._gameOverSoundPlayed = true;
    this.sound.playGameOverSound();
    // In multiplayer, notify opponent of timeout loss
    if (this.game.mode === 'multiplayer' && this.multiplayer) {
      this.multiplayer.sendResign();
    }
    this._onGameEnd();
  }

  _onGameEnd() {
    // Multiplayer game end — archive and clean up
    if (this.game.mode === 'multiplayer') {
      this._onMultiplayerGameEnd();
      return;
    }

    // Sound: checkmate was already played by playMoveSound; only play for other endings
    if (!this._gameOverSoundPlayed && !this.chess.in_checkmate()) {
      this.sound.playGameOverSound();
    }
    this._gameOverSoundPlayed = false;

    // Show analyze button
    if (this.engineInitialized) {
      show(document.getElementById('analyze-group'));
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

    // Auto-run analysis after game ends (delayed to let UI settle)
    if (this.engineInitialized && this.game.moveHistory.length >= 4) {
      setTimeout(() => {
        // Only run if game is still over (user didn't start a new one)
        if (this.game.gameOver) this.runAnalysis();
      }, 1000);
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
    const topPlayerInfo = document.getElementById('player-top');
    const bottomPlayerInfo = document.getElementById('player-bottom');
    const topColor = this.board.flipped ? 'w' : 'b';
    const bottomColor = this.board.flipped ? 'b' : 'w';
    const turn = this.chess.turn();
    const isOver = this.game.gameOver;

    if (this.game.timeControl > 0) {
      // Timed game — show clock
      topTimer.textContent = this.game.getTimerDisplay(topColor);
      bottomTimer.textContent = this.game.getTimerDisplay(bottomColor);
      topTimer.classList.toggle('active', turn === topColor && !isOver);
      bottomTimer.classList.toggle('active', turn === bottomColor && !isOver);
      topTimer.classList.toggle('low', timers[topColor] <= 30 && timers[topColor] > 0);
      bottomTimer.classList.toggle('low', timers[bottomColor] <= 30 && timers[bottomColor] > 0);
    } else {
      // No timer — show turn dot instead of "--:--"
      topTimer.classList.remove('active', 'low');
      bottomTimer.classList.remove('active', 'low');
      topTimer.innerHTML = (turn === topColor && !isOver) ? '<span class="turn-dot"></span>' : '';
      bottomTimer.innerHTML = (turn === bottomColor && !isOver) ? '<span class="turn-dot"></span>' : '';
    }

    // Active turn indicator on player info bars (works with/without timer)
    topPlayerInfo.classList.toggle('active-turn', turn === topColor && !isOver);
    bottomPlayerInfo.classList.toggle('active-turn', turn === bottomColor && !isOver);

    // Player names
    const topName = document.querySelector('#player-top .player-name');
    const bottomName = document.querySelector('#player-bottom .player-name');
    if (this.activeBot && this.game.mode === 'engine') {
      const botColor = this.game.playerColor === 'w' ? 'b' : 'w';
      const playerColor = this.game.playerColor;
      const botLabel = `${this.activeBot.name} (${this.activeBot.peakElo})`;
      const playerRating = this.stats?.estimateRating() || 1200;
      const playerLabel = `You (${playerRating})`;
      if (topName) topName.textContent = topColor === botColor ? botLabel : playerLabel;
      if (bottomName) bottomName.textContent = bottomColor === botColor ? botLabel : playerLabel;
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

    // Show per-move insight if analysis is available
    this._updateMoveInsight(index);

    // Load notes for this move
    this._loadNoteForCurrentMove();

    // Update advisor analysis for navigated position
    this._updateAdvisorAnalysis();
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

  // === Per-Move Notes ===

  setupNotes() {
    this._gameNotes = {}; // moveIndex -> text

    document.getElementById('btn-toggle-notes').addEventListener('click', () => {
      const el = document.getElementById('move-notes');
      el.classList.toggle('hidden');
      if (!el.classList.contains('hidden')) {
        this._loadNoteForCurrentMove();
      }
    });

    document.getElementById('move-notes-input').addEventListener('input', (e) => {
      const idx = this.notation.currentIndex;
      if (idx < 0) return;
      if (e.target.value.trim()) {
        this._gameNotes[idx] = e.target.value;
      } else {
        delete this._gameNotes[idx];
      }
    });
  }

  _loadNoteForCurrentMove() {
    const input = document.getElementById('move-notes-input');
    if (!input) return;
    const idx = this.notation.currentIndex;
    input.value = this._gameNotes[idx] || '';
    const moveNum = idx >= 0 ? `Move ${Math.floor(idx / 2) + 1}` : 'Start';
    input.placeholder = `Notes for ${moveNum}...`;
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
    // Auto-recover after 15 seconds if engine is completely stuck
    this.engineSafetyTimeout = setTimeout(() => {
      if (this.engine && this.engine.thinking && !this.game.gameOver && this.game.mode === 'engine') {
        console.warn('Engine safety timeout — forcing move');
        this._forceEngineMove();
      }
    }, 15000);
  }

  _clearEngineMoveTimer() {
    if (this.engineMoveTimeout) {
      clearTimeout(this.engineMoveTimeout);
      this.engineMoveTimeout = null;
    }
    if (this.engineSafetyTimeout) {
      clearTimeout(this.engineSafetyTimeout);
      this.engineSafetyTimeout = null;
    }
    hide(document.getElementById('btn-force-move'));
  }

  // === Move Clock (per-move thinking time) ===

  _startMoveClock(color) {
    this._stopMoveClock();
    this._moveClockColor = color;
    this._moveClockStart = Date.now();

    // Determine which clock element is active
    const topColor = this.board.flipped ? 'w' : 'b';
    const activeId = color === topColor ? 'move-clock-top' : 'move-clock-bottom';
    const inactiveId = color === topColor ? 'move-clock-bottom' : 'move-clock-top';

    const activeEl = document.getElementById(activeId);
    const inactiveEl = document.getElementById(inactiveId);

    if (activeEl) { activeEl.classList.add('active'); activeEl.textContent = '0s'; }
    if (inactiveEl) inactiveEl.classList.remove('active');

    this._moveClockInterval = setInterval(() => this._tickMoveClock(), 100);
  }

  _stopMoveClock() {
    if (this._moveClockInterval) {
      clearInterval(this._moveClockInterval);
      this._moveClockInterval = null;
    }
    // Remove active class from both
    const top = document.getElementById('move-clock-top');
    const bot = document.getElementById('move-clock-bottom');
    if (top) top.classList.remove('active');
    if (bot) bot.classList.remove('active');
  }

  _tickMoveClock() {
    const elapsed = (Date.now() - this._moveClockStart) / 1000;
    const topColor = this.board.flipped ? 'w' : 'b';
    const elId = this._moveClockColor === topColor ? 'move-clock-top' : 'move-clock-bottom';
    const el = document.getElementById(elId);
    if (!el) return;

    if (elapsed < 60) {
      el.textContent = `${Math.floor(elapsed)}s`;
    } else {
      const mins = Math.floor(elapsed / 60);
      const secs = Math.floor(elapsed % 60);
      el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  _setEngineThinking(thinking) {
    if (this.game.mode !== 'engine') return;
    const engineColor = this.game.playerColor === 'w' ? 'b' : 'w';
    const topColor = this.board.flipped ? 'w' : 'b';
    const barId = engineColor === topColor ? 'player-top' : 'player-bottom';
    const bar = document.getElementById(barId);
    if (bar) {
      bar.classList.toggle('engine-thinking', thinking);
      if (thinking) bar.classList.remove('active-turn');
    }
  }

  // Watchdog: periodically check if the game is stuck
  _startEngineWatchdog() {
    if (this._engineWatchdog) clearInterval(this._engineWatchdog);
    this._engineWatchdog = setInterval(() => {
      if (this.game.gameOver || this.game.mode !== 'engine') return;

      const engineTurn = this.chess.turn() !== this.game.playerColor;
      if (engineTurn && !this.engine.thinking && !this.board.interactive) {
        console.warn('Watchdog: engine stuck — handler may have been lost. Re-requesting move.');
        // Restore canonical handler first
        this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);
        this.engine.onNoMove = () => this._handleEngineNoMove();
        if (this.activeBot) this.engine.applyPersonality(this.activeBot);
        this.engine.requestMove(this.chess.fen());
        this._startEngineMoveTimer();
      }
    }, 5000);
  }

  _stopEngineWatchdog() {
    if (this._engineWatchdog) {
      clearInterval(this._engineWatchdog);
      this._engineWatchdog = null;
    }
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
      this.sound.playMoveSound(move);
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
    // "Analysis Lines" now opens the Ideas tab with the advisor picker
    document.getElementById('btn-multi-analysis').addEventListener('click', () => {
      // Switch to Ideas tab
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-content').forEach(c => hide(c));
      const ideasTab = document.querySelector('.panel-tab[data-tab="ideas"]');
      if (ideasTab) ideasTab.classList.add('active');
      show(document.getElementById('tab-ideas'));

      // Open the advisor picker
      const picker = document.getElementById('advisor-picker');
      if (picker.classList.contains('hidden')) {
        this._renderAdvisorPicker();
        show(picker);
      }
    });

    // Keep the dialog close handler for backwards compatibility
    document.getElementById('close-multi-analysis')?.addEventListener('click', () => {
      hide(document.getElementById('multi-analysis-dialog'));
    });

    document.getElementById('run-multi-analysis')?.addEventListener('click', () => {
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

  // === Live Advisor Panel ===

  setupAdvisors() {
    this._advisorAbortId = 0;
    this._advisorBots = [];
    this._advisorAnalyzing = false;

    // Load saved advisor selection, or use defaults
    try {
      const saved = localStorage.getItem('chess_live_advisors');
      if (saved) {
        const ids = JSON.parse(saved);
        this._advisorBots = ids.map(id => BOT_PERSONALITIES.find(b => b.id === id)).filter(Boolean);
      }
    } catch { /* ignore */ }

    // No default advisors — user must explicitly choose them via the picker

    // "Choose Advisors" button
    document.getElementById('btn-pick-advisors').addEventListener('click', () => {
      const picker = document.getElementById('advisor-picker');
      if (picker.classList.contains('hidden')) {
        this._renderAdvisorPicker();
        show(picker);
      } else {
        hide(picker);
      }
    });

    // Render initial state and start analyzing if advisors already selected
    if (this._advisorBots.length > 0) {
      this._renderAdvisorCards();
      // Auto-analyze after engine loads
      setTimeout(() => this._updateAdvisorAnalysis(), 2000);
    }
  }

  _renderAdvisorPicker() {
    const picker = document.getElementById('advisor-picker');
    const selectedIds = this._advisorBots.map(b => b.id);
    let html = '';

    for (const tier of BOT_TIERS) {
      const tierBots = BOT_PERSONALITIES.filter(b => b.tier === tier.id);
      if (tierBots.length === 0) continue;

      html += `<div class="advisor-picker-tier">${tier.name}</div>`;
      for (const bot of tierBots) {
        const checked = selectedIds.includes(bot.id) ? 'checked' : '';
        html += `
          <label>
            <input type="checkbox" value="${bot.id}" ${checked}>
            <img src="${bot.portrait}" alt="${bot.name}">
            <span>${bot.name}</span>
            <span class="advisor-pick-elo">${bot.peakElo}</span>
          </label>`;
      }
    }

    picker.innerHTML = html;

    // Listen for changes
    picker.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = picker.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > 3) {
          cb.checked = false;
          this.showToast('Maximum 3 advisors');
          return;
        }
        this._advisorBots = Array.from(checked).map(c =>
          BOT_PERSONALITIES.find(b => b.id === c.value)
        ).filter(Boolean);

        // Save selection
        localStorage.setItem('chess_live_advisors', JSON.stringify(this._advisorBots.map(b => b.id)));

        this._renderAdvisorCards();
        this._updateAdvisorTabBadge(false);
        this._updateAdvisorAnalysis();
      });
    });
  }

  _renderAdvisorCards() {
    const list = document.getElementById('ideas-list');
    if (this._advisorBots.length === 0) {
      list.innerHTML = '<div class="ideas-empty">Pick up to 3 grandmasters or engines to see their ideas for each position.</div>';
      return;
    }
    let html = '';
    for (const bot of this._advisorBots) {
      html += `
        <div class="idea-card idea-thinking" id="idea-${bot.id}">
          <div class="idea-card-top">
            <img class="idea-portrait" src="${bot.portrait}" alt="${bot.name}">
            <div class="idea-info">
              <span class="idea-name">${bot.name}</span>
              <span class="idea-elo">${bot.peakElo}</span>
            </div>
            <div class="idea-move-box">
              <div class="idea-move">...</div>
              <div class="idea-eval"></div>
            </div>
          </div>
          <div class="idea-pv"></div>
        </div>`;
    }
    list.innerHTML = html;
  }

  async _updateAdvisorAnalysis() {
    if (this._advisorBots.length === 0) return;
    if (this.game.gameOver) return;

    // Abort previous analysis
    const abortId = ++this._advisorAbortId;

    // Wait for engine to be free
    if (!this.engine || !this.engine.ready) {
      await this.initEngine();
      if (!this.engine || !this.engine.ready) return;
    }

    // Wait until engine is not thinking for the game
    const waitForEngine = () => new Promise(resolve => {
      if (!this.engine.thinking) return resolve();
      const check = setInterval(() => {
        if (!this.engine.thinking) {
          clearInterval(check);
          resolve();
        }
      }, 200);
      // Timeout after 30 seconds
      setTimeout(() => { clearInterval(check); resolve(); }, 30000);
    });

    await waitForEngine();
    if (abortId !== this._advisorAbortId) return;

    this._advisorAnalyzing = true;
    this._updateAdvisorTabBadge(true);

    // Show thinking state
    this._renderAdvisorCards();

    const fen = this.chess.fen();

    // Skip if engine is needed for game moves
    if (this.game.mode === 'engine' && this.chess.turn() !== this.game.playerColor) {
      return;
    }

    for (const bot of this._advisorBots) {
      if (abortId !== this._advisorAbortId) break;

      // Wait again if engine got busy (e.g. engine made a move mid-analysis)
      await waitForEngine();
      if (abortId !== this._advisorAbortId) break;

      // Apply this advisor's personality
      this.engine.applyPersonality(bot);

      // Quick analysis at moderate depth
      const analysis = await this.engine.analyzePosition(fen, Math.min(bot.searchDepth || 14, 14));
      if (abortId !== this._advisorAbortId) break;

      // Convert UCI bestmove to SAN
      let san = analysis.bestMove || '?';
      if (analysis.bestMove) {
        const from = analysis.bestMove.substring(0, 2);
        const to = analysis.bestMove.substring(2, 4);
        const promo = analysis.bestMove.length > 4 ? analysis.bestMove[4] : undefined;
        const tempChess = new Chess(fen);
        const legalMoves = tempChess.moves({ verbose: true });
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

      // Format PV as SAN
      let pvSan = '';
      if (analysis.pv) {
        try {
          const tempChess = new Chess(fen);
          const sanMoves = [];
          for (const uci of analysis.pv.split(' ').slice(0, 5)) {
            const f = uci.substring(0, 2);
            const t = uci.substring(2, 4);
            const p = uci.length > 4 ? uci[4] : undefined;
            const m = tempChess.move({ from: f, to: t, promotion: p });
            if (m) sanMoves.push(m.san);
            else break;
          }
          pvSan = sanMoves.join(' ');
        } catch {
          pvSan = '';
        }
      }

      // Save result for Moves tab annotation
      this._lastAdvisorResults[bot.id] = { san, evalStr, name: bot.name };

      // Update this advisor's card
      const card = document.getElementById(`idea-${bot.id}`);
      if (card && abortId === this._advisorAbortId) {
        card.classList.remove('idea-thinking');
        card.querySelector('.idea-move').textContent = san;
        card.querySelector('.idea-eval').textContent = evalStr;
        card.querySelector('.idea-pv').textContent = pvSan;
      }
    }

    // Show advisor annotations in Moves tab
    this._updateAdvisorAnnotations();

    // Restore active bot personality
    if (this.activeBot) {
      this.engine.applyPersonality(this.activeBot);
    } else {
      this.engine.resetOptions();
    }

    // Always restore the canonical game handler (never use captured snapshot)
    this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);
    this.engine.onNoMove = () => this._handleEngineNoMove();
    this._advisorAnalyzing = false;
    this._updateAdvisorTabBadge(false);
  }

  _updateAdvisorAnnotations() {
    // Add advisor suggestions below the current move in the notation panel
    const annotationEl = document.getElementById('advisor-annotations');
    if (!annotationEl) return;

    const bots = Object.values(this._lastAdvisorResults);
    if (bots.length === 0) {
      annotationEl.innerHTML = '';
      return;
    }

    let html = '';
    for (const r of bots) {
      html += `<span class="advisor-ann"><span class="advisor-ann-name">${r.name}</span> ${r.san} <span class="advisor-ann-eval">${r.evalStr}</span></span>`;
    }
    annotationEl.innerHTML = html;
  }

  _updateAdvisorTabBadge(thinking) {
    const tab = document.querySelector('.panel-tab[data-tab="ideas"]');
    if (!tab) return;
    if (thinking && this._advisorBots.length > 0) {
      tab.textContent = `Advisors (${this._advisorBots.length})`;
      tab.classList.add('tab-analyzing');
    } else if (this._advisorBots.length > 0) {
      tab.textContent = `Advisors (${this._advisorBots.length})`;
      tab.classList.remove('tab-analyzing');
    } else {
      tab.textContent = 'Advisors';
      tab.classList.remove('tab-analyzing');
    }
  }

  // === Eval Bar ===

  setupEvalBar() {
    // Apply saved preference (ON by default)
    if (this._evalBarEnabled) {
      this._showEvalBar();
    } else {
      this._hideEvalBar();
    }
  }

  _showEvalBar() {
    const bar = document.getElementById('eval-bar');
    bar.classList.remove('eval-hidden');
    bar.classList.remove('hidden');
    this._evalBarEnabled = true;
    localStorage.setItem('chess_eval_bar', 'true');
  }

  _hideEvalBar() {
    const bar = document.getElementById('eval-bar');
    bar.classList.add('eval-hidden');
    this._evalBarEnabled = false;
    localStorage.setItem('chess_eval_bar', 'false');
  }

  toggleEvalBar() {
    if (this._evalBarEnabled) {
      this._hideEvalBar();
    } else {
      this._showEvalBar();
      this._updateEvalBar();
    }
  }

  async _updateEvalBar() {
    if (!this._evalBarEnabled) return;
    if (!this.engine || !this.engine.ready) return;
    if (this.game.gameOver) return;

    // Skip if engine is needed for game moves
    if (this.game.mode === 'engine' && this.chess.turn() !== this.game.playerColor) {
      return;
    }

    const abortId = ++this._evalBarAbortId;
    const fen = this.chess.fen();
    const isBlackToMove = this.chess.turn() === 'b';

    // Wait for engine to be free (but don't wait too long)
    let waited = 0;
    while (this.engine.thinking && waited < 5000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
    if (abortId !== this._evalBarAbortId) return;
    if (this.engine.thinking) return;

    // Reset engine to default strength for neutral evaluation
    this.engine.resetOptions();

    // analyzePosition() is serialized — safe to call without handler swap
    const result = await this.engine.analyzePosition(fen, 12);
    if (abortId !== this._evalBarAbortId) return;

    // Restore active bot personality and canonical handler
    if (this.activeBot) {
      this.engine.applyPersonality(this.activeBot);
    }
    this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);
    this.engine.onNoMove = () => this._handleEngineNoMove();

    // Stockfish returns score from side-to-move perspective — flip for Black
    let scoreWhite = result.score;
    let mateWhite = result.mate;
    if (isBlackToMove) {
      scoreWhite = -scoreWhite;
      if (mateWhite !== null) mateWhite = -mateWhite;
    }

    // Update bar
    const bar = document.getElementById('eval-bar-white');
    const label = document.getElementById('eval-bar-label');
    if (!bar || !label) return;

    let whitePct, labelText;
    if (mateWhite !== null) {
      whitePct = mateWhite > 0 ? 95 : 5;
      const absM = Math.abs(mateWhite);
      labelText = `M${absM}`;

      // Announce forced mate via toast (only when mate is newly detected)
      if (this._lastMateAnnounce !== mateWhite) {
        this._lastMateAnnounce = mateWhite;
        const who = mateWhite > 0 ? 'White' : 'Black';
        this.showToast(`Forced mate in ${absM} for ${who}!`);
      }
    } else {
      this._lastMateAnnounce = null;
      // Convert centipawns to percentage (sigmoid-like)
      const cp = scoreWhite / 100;
      whitePct = 50 + 50 * (2 / (1 + Math.exp(-0.4 * cp)) - 1);
      whitePct = Math.max(3, Math.min(97, whitePct));
      labelText = `${cp > 0 ? '+' : ''}${cp.toFixed(1)}`;
    }

    bar.style.height = `${whitePct}%`;
    label.textContent = labelText;
  }

  // === New Game Dialog ===

  setupNewGameDialog() {
    const dialog = document.getElementById('new-game-dialog');
    const settings = { mode: 'local', color: 'w', botId: 'beginner-betty', time: 0, increment: 0, rated: false };

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
          if (setting === 'rated') {
            settings.rated = val === 'rated';
          } else {
            settings[setting] = isNaN(val) ? val : Number(val);
          }

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
    this._gameOverSoundPlayed = false;

    // Exit puzzle mode if active
    this._exitPuzzleMode();

    // Disconnect any active multiplayer game
    if (this.multiplayer) {
      this.multiplayer.disconnect();
      this.multiplayer = null;
    }
    hide(document.getElementById('btn-resign-mp'));
    hide(document.getElementById('btn-draw-mp'));
    hide(document.getElementById('mp-opponent-status'));

    let color = settings.color;
    if (color === 'random') {
      color = Math.random() < 0.5 ? 'w' : 'b';
    }

    // Stop any current engine computation or bot match
    this._clearEngineMoveTimer();
    this._botMatchAbort = true;
    ++this._advisorAbortId;  // cancel any ongoing advisor analysis
    ++this._evalBarAbortId;  // cancel any ongoing eval bar analysis
    if (this.engine && this.engine.thinking) {
      this.engine.stop();
    }
    // Restore canonical handler in case analysis left it null
    if (this.engine) {
      this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);
      this.engine.onNoMove = () => this._handleEngineNoMove();
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
      increment: settings.increment,
      rated: settings.rated || false
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
    hide(document.getElementById('analyze-group'));
    hide(document.getElementById('analysis-progress'));
    hide(document.getElementById('analysis-summary'));
    hide(document.getElementById('eval-graph-container'));
    hide(document.getElementById('review-dialog'));
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

    // Show/hide rated badge
    const existingBadge = document.getElementById('rated-badge');
    if (existingBadge) existingBadge.remove();
    if (this.game.rated) {
      const statusEl = document.getElementById('game-status');
      if (statusEl) {
        const badge = document.createElement('span');
        badge.className = 'rated-badge';
        badge.textContent = 'RATED';
        badge.id = 'rated-badge';
        statusEl.parentElement.insertBefore(badge, statusEl);
      }
    }

    // Sync DGT board to new game position
    if (this.dgtBoard?.isConnected()) {
      this.dgtBoard.syncToPosition(this.chess);
      hide(document.getElementById('dgt-engine-move'));
    }

    // If engine goes first (player is black)
    if (settings.mode === 'engine' && color === 'b') {
      this.requestEngineMove();
    }

    // Play game start sound
    this.sound.playGameStartSound();

    // Fetch opening explorer for starting position
    this.fetchOpeningExplorer();

    // Start eval bar for the new game (if player goes first)
    if (this._evalBarEnabled && settings.mode === 'engine' && color === 'w') {
      setTimeout(() => this._updateEvalBar(), 500);
    }

    // Start move clock — White always moves first
    this._startMoveClock('w');

    // Start engine watchdog for engine games
    if (settings.mode === 'engine') {
      this._startEngineWatchdog();
    } else {
      this._stopEngineWatchdog();
    }

    // Clear mate announcement
    this._lastMateAnnounce = null;

    // Clear move insight
    hide(document.getElementById('move-insight'));
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

    // Get selected analysis depth
    const depthSelect = document.getElementById('analyze-depth');
    const analysisDepth = depthSelect ? parseInt(depthSelect.value) : 16;

    // Stop engine from any ongoing work
    if (this.engine.thinking) {
      this.engine.stop();
    }

    // Cancel any advisor/eval bar analysis
    ++this._advisorAbortId;
    ++this._evalBarAbortId;

    // Temporarily remove the onBestMove handler so analysis doesn't trigger game moves
    this.engine.onBestMove = null;

    hide(document.getElementById('analyze-group'));
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
      const results = await this.analyzer.analyzeGame(this.game.fens, this.game.moveHistory, analysisDepth);
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

        // Show review dialog
        this._showReviewDialog(results);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      this.showToast('Analysis failed');
    }

    hide(progressEl);

    // Restore canonical handler
    this.engine.onBestMove = (uciMove) => this.handleEngineMove(uciMove);
    this.engine.onNoMove = () => this._handleEngineNoMove();
    if (this.activeBot) {
      this.engine.applyPersonality(this.activeBot);
    }
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

  // === Game Review ===

  setupReviewDialog() {
    document.getElementById('review-close').addEventListener('click', () => {
      hide(document.getElementById('review-dialog'));
    });

    document.getElementById('review-step-through').addEventListener('click', () => {
      hide(document.getElementById('review-dialog'));
      this.navigateToMove(0);
    });

    document.getElementById('review-dialog').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        hide(document.getElementById('review-dialog'));
      }
    });
  }

  _findCriticalMoments(results) {
    const moves = results.moves;
    const scored = moves.map(m => {
      let score = 0;

      score += m.cpLoss;

      const swing = Math.abs(m.playedEval - m.bestEval);
      score += swing * 0.5;

      const signChanged = (m.bestEval > 50 && m.playedEval < -50) ||
                          (m.bestEval < -50 && m.playedEval > 50);
      if (signChanged) score += 150;

      if (m.mate != null) score += 300;

      if (m.classification === 'blunder') score = Math.max(score, 250);
      if (m.classification === 'mistake') score = Math.max(score, 120);

      let label = m.classification;
      if (m.classification === 'blunder') label = 'Blunder';
      else if (m.classification === 'mistake') label = 'Mistake';
      else if (m.classification === 'great') label = 'Great Move';
      else if (signChanged) label = 'Turning Point';
      else if (m.classification === 'best' && swing > 100) label = 'Key Move';

      return { ...m, score, label };
    });

    const candidates = scored.filter(m => m.score >= 80);
    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates.slice(0, 5);
    selected.sort((a, b) => a.moveIndex - b.moveIndex);
    return selected;
  }

  _showReviewDialog(results) {
    const dialog = document.getElementById('review-dialog');

    // Result header
    const gameResult = this.game.getGameResult();
    const resultIcon = document.getElementById('review-result-icon');
    const resultText = document.getElementById('review-result-text');
    const resultDetail = document.getElementById('review-result-detail');

    let icon = '', headline = 'Game Over', detail = '';

    if (gameResult) {
      if (gameResult.result === '1-0' || gameResult.result === '0-1') {
        const winnerColor = gameResult.result === '1-0' ? 'w' : 'b';
        const isPlayerWin = this.game.mode === 'engine' && this.game.playerColor === winnerColor;
        icon = this.chess.in_checkmate() ? '\u265A' : '\u2691';
        headline = isPlayerWin ? 'You Won!' : (this.game.mode === 'engine' ? 'You Lost' : (gameResult.result === '1-0' ? 'White Wins' : 'Black Wins'));
        detail = gameResult.message;
      } else {
        icon = '\u00BD';
        headline = 'Draw';
        detail = gameResult.message;
      }
    }

    resultIcon.textContent = icon;
    resultText.textContent = headline;
    resultDetail.textContent = detail;

    // Player names
    const whiteName = document.getElementById('review-white-name');
    const blackName = document.getElementById('review-black-name');
    if (this.activeBot && this.game.mode === 'engine') {
      whiteName.textContent = this.game.playerColor === 'w' ? 'You' : this.activeBot.name;
      blackName.textContent = this.game.playerColor === 'b' ? 'You' : this.activeBot.name;
    } else {
      whiteName.textContent = 'White';
      blackName.textContent = 'Black';
    }

    // Accuracy bars (animated)
    const whiteBar = document.getElementById('review-white-bar');
    const blackBar = document.getElementById('review-black-bar');
    document.getElementById('review-white-pct').textContent = results.white.accuracy + '%';
    document.getElementById('review-black-pct').textContent = results.black.accuracy + '%';
    whiteBar.style.width = '0%';
    blackBar.style.width = '0%';
    requestAnimationFrame(() => {
      whiteBar.style.width = results.white.accuracy + '%';
      blackBar.style.width = results.black.accuracy + '%';
    });

    // Classification breakdown
    const classColors = {
      best: '#4caf50', great: '#2196f3', good: '#8bc34a',
      inaccuracy: '#ffc107', mistake: '#ff9800', blunder: '#f44336'
    };

    const breakdownEl = document.getElementById('review-breakdown');
    const makeStackedBar = (label, counts) => {
      const total = Object.values(counts).reduce((s, v) => s + v, 0);
      if (total === 0) return '';
      let segments = '';
      for (const [cls, color] of Object.entries(classColors)) {
        const count = counts[cls] || 0;
        if (count === 0) continue;
        const pct = (count / total) * 100;
        segments += `<div class="review-stacked-segment" style="width:${pct}%;background:${color}" data-tooltip="${cls}: ${count}"></div>`;
      }
      return `<div class="review-breakdown-row">
        <span class="review-breakdown-label">${label}</span>
        <div class="review-stacked-bar">${segments}</div>
      </div>`;
    };

    let legendHtml = '<div class="review-breakdown-legend">';
    for (const [cls, color] of Object.entries(classColors)) {
      legendHtml += `<span class="review-legend-item"><span class="review-legend-dot" style="background:${color}"></span>${cls}</span>`;
    }
    legendHtml += '</div>';

    breakdownEl.innerHTML = `<h3>Move Quality</h3>${makeStackedBar('White', results.white.counts)}${makeStackedBar('Black', results.black.counts)}${legendHtml}`;

    // Critical moments
    const moments = this._findCriticalMoments(results);
    const momentsList = document.getElementById('review-moments-list');

    if (moments.length === 0) {
      momentsList.innerHTML = '<div class="review-no-moments">No critical moments \u2014 well played!</div>';
    } else {
      const badgeColor = (cls) => classColors[cls] || '#888';

      momentsList.innerHTML = moments.map(m => {
        const moveNum = Math.floor(m.moveIndex / 2) + 1;
        const side = m.color === 'w' ? '.' : '...';
        const cpText = m.cpLoss > 0 ? `\u2212${m.cpLoss} cp` : '';
        const bestText = m.isBestMove ? '' : `Best: ${m.bestMove}`;
        const borderColor = badgeColor(m.classification);

        return `<div class="review-moment-card" data-move-index="${m.moveIndex}" style="border-left-color:${borderColor}">
          <span class="review-moment-number">${moveNum}${side}</span>
          <span class="review-moment-badge" style="background:${borderColor}">${m.label}</span>
          <div class="review-moment-detail">
            <div class="review-moment-played">${m.move}</div>
            ${bestText ? `<div class="review-moment-best">${bestText}</div>` : ''}
          </div>
          ${cpText ? `<span class="review-moment-cploss">${cpText}</span>` : ''}
        </div>`;
      }).join('');

      momentsList.querySelectorAll('.review-moment-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.dataset.moveIndex);
          hide(dialog);
          this.navigateToMove(idx);
        });
      });
    }

    show(dialog);
  }

  _updateMoveInsight(index) {
    const el = document.getElementById('move-insight');
    if (!el) return;

    if (!this.analysisResults || index < 0 || index >= this.analysisResults.moves.length) {
      hide(el);
      return;
    }

    const data = this.analysisResults.moves[index];
    const classColors = {
      best: '#4caf50', great: '#2196f3', good: '#8bc34a',
      inaccuracy: '#ffc107', mistake: '#ff9800', blunder: '#f44336'
    };
    const color = classColors[data.classification] || '#888';
    const moveNum = Math.floor(index / 2) + 1;
    const side = data.color === 'w' ? '.' : '...';

    // Format eval
    const evalCp = data.playedEval / 100;
    const evalStr = `${evalCp > 0 ? '+' : ''}${evalCp.toFixed(1)}`;

    // Generate learning comment
    const comment = this._getMoveComment(data);

    // Format best move line if not best
    let bestHtml = '';
    if (!data.isBestMove && data.bestMove) {
      // Convert UCI best move to SAN
      let bestSan = data.bestMove;
      try {
        const fen = this.game.fens[index];
        const tempChess = new Chess(fen);
        const from = data.bestMove.substring(0, 2);
        const to = data.bestMove.substring(2, 4);
        const promo = data.bestMove.length > 4 ? data.bestMove[4] : undefined;
        const m = tempChess.move({ from, to, promotion: promo });
        if (m) bestSan = m.san;
      } catch {}
      bestHtml = `<div class="move-insight-best">Best: <strong>${bestSan}</strong> (${data.cpLoss > 0 ? '-' : ''}${data.cpLoss} cp)</div>`;
    }

    // Format PV continuation
    let pvHtml = '';
    if (data.pv) {
      try {
        const fen = this.game.fens[index];
        const tempChess = new Chess(fen);
        const sanMoves = [];
        for (const uci of data.pv.split(' ').slice(0, 6)) {
          const f = uci.substring(0, 2);
          const t = uci.substring(2, 4);
          const p = uci.length > 4 ? uci[4] : undefined;
          const m = tempChess.move({ from: f, to: t, promotion: p });
          if (m) sanMoves.push(m.san);
          else break;
        }
        if (sanMoves.length > 1) {
          pvHtml = `<div class="move-insight-pv">${sanMoves.join(' ')}</div>`;
        }
      } catch {}
    }

    el.innerHTML = `
      <div class="move-insight-header">
        <span class="move-insight-badge" style="background:${color}">${data.classification}</span>
        <span class="move-insight-move">${moveNum}${side} ${data.move}</span>
        <span class="move-insight-eval">${evalStr}</span>
      </div>
      <div class="move-insight-comment">${comment}</div>
      ${bestHtml}
      ${pvHtml}
    `;

    el.style.borderLeftColor = color;
    show(el);
  }

  _getMoveComment(data) {
    const { classification, cpLoss, isBestMove, move, color, bestEval, playedEval } = data;
    const side = color === 'w' ? 'White' : 'Black';

    // Check for eval sign change (advantage flipping)
    const advantageBefore = bestEval > 50 ? 'advantage' : bestEval < -50 ? 'disadvantage' : 'equal';
    const advantageAfter = playedEval > 50 ? 'advantage' : playedEval < -50 ? 'disadvantage' : 'equal';
    const flipped = (bestEval > 100 && playedEval < -100) || (bestEval < -100 && playedEval > 100);

    switch (classification) {
      case 'best':
        if (Math.abs(bestEval) > 300) return 'The engine\'s top choice. Maintaining a strong position.';
        if (Math.abs(bestEval) < 30) return 'Excellent move — keeping the position balanced.';
        return 'This is the best move in the position.';

      case 'great':
        return 'A strong, ambitious move that maintains or improves the position.';

      case 'good':
        return `A reasonable move. The best option was slightly better (${cpLoss} cp difference).`;

      case 'inaccuracy':
        if (flipped) return `This inaccuracy shifted the balance. The position was ${advantageBefore} but is now ${advantageAfter}. Consider looking for more active moves.`;
        return `A small inaccuracy losing ~${(cpLoss / 100).toFixed(1)} pawns of advantage. Look for moves that create threats or improve piece activity.`;

      case 'mistake':
        if (flipped) return `This mistake changed the evaluation significantly. ${side} had an ${advantageBefore} position but now faces ${advantageAfter}. Check for tactics before making moves.`;
        return `A mistake costing ~${(cpLoss / 100).toFixed(1)} pawns. Always check if your opponent has tactical responses before committing.`;

      case 'blunder':
        if (data.mate !== null) return `A critical blunder allowing a forced checkmate. Always scan for checks and captures before moving.`;
        if (flipped) return `A serious blunder that swings the game. Always ask: "What can my opponent do after this move?" Check all captures, checks, and threats.`;
        return `A significant blunder losing ~${(cpLoss / 100).toFixed(1)} pawns. Before each move, consider: Can my opponent capture something? Give a check? Create a threat?`;

      default:
        return '';
    }
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

  // === Sound Toggle ===

  setupSoundToggle() {
    const btn = document.getElementById('btn-sound');
    if (!btn) return;

    this._updateSoundButton(btn);

    btn.addEventListener('click', () => {
      this.sound.toggleMute();
      this._updateSoundButton(btn);
    });
  }

  _updateSoundButton(btn) {
    btn.textContent = this.sound.muted ? 'Sound Off' : 'Sound On';
    btn.classList.toggle('muted', this.sound.muted);
  }

  setupEvalBarToggle() {
    const btn = document.getElementById('btn-eval-bar');
    if (!btn) return;
    this._updateEvalBarButton(btn);

    btn.addEventListener('click', () => {
      this.toggleEvalBar();
      this._updateEvalBarButton(btn);
    });
  }

  _updateEvalBarButton(btn) {
    btn.textContent = this._evalBarEnabled ? 'Eval Bar On' : 'Eval Bar Off';
  }

  // === Resize Handles ===

  setupResizeHandles() {
    // Vertical handle between board-area and side-panel
    this._setupResizeV();
    // Horizontal handle for move history height
    this._setupResizeH();
    // Load saved sizes
    this._loadResizeSizes();
  }

  _setupResizeV() {
    const handle = document.getElementById('resize-handle-main');
    if (!handle) return;

    let startX, startBoardW, startPanelW;
    const boardArea = document.querySelector('.board-area');
    const sidePanel = document.querySelector('.side-panel');
    if (!boardArea || !sidePanel) return;

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const dx = clientX - startX;
      const newBoardSize = Math.max(200, Math.min(800, startBoardW + dx));

      // Update CSS custom property for board size
      document.documentElement.style.setProperty('--board-size', newBoardSize + 'px');

      // Update side panel width
      const newPanelW = Math.max(180, startPanelW - dx);
      sidePanel.style.width = newPanelW + 'px';
    };

    const onEnd = () => {
      document.body.classList.remove('resizing', 'resizing-v');
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);

      // Save sizes
      const boardSize = getComputedStyle(document.documentElement).getPropertyValue('--board-size').trim();
      const panelW = sidePanel.style.width;
      localStorage.setItem('chess_board_size', boardSize);
      localStorage.setItem('chess_panel_width', panelW);
    };

    const onStart = (e) => {
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      startX = clientX;
      // Get current board size from CSS var
      const cs = getComputedStyle(document.documentElement);
      startBoardW = parseInt(cs.getPropertyValue('--board-size')) || boardArea.offsetWidth;
      startPanelW = sidePanel.offsetWidth;

      document.body.classList.add('resizing', 'resizing-v');
      handle.classList.add('active');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    };

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: false });
  }

  _setupResizeH() {
    const handle = document.getElementById('resize-handle-moves');
    if (!handle) return;

    let startY, startH;
    const moveContainer = document.querySelector('.move-history-container');
    if (!moveContainer) return;

    const onMove = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = clientY - startY;
      const newH = Math.max(60, Math.min(500, startH + dy));
      moveContainer.style.minHeight = newH + 'px';
      moveContainer.style.maxHeight = newH + 'px';
      moveContainer.style.flex = 'none';
    };

    const onEnd = () => {
      document.body.classList.remove('resizing', 'resizing-h');
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);

      localStorage.setItem('chess_moves_height', moveContainer.style.minHeight);
    };

    const onStart = (e) => {
      e.preventDefault();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startY = clientY;
      startH = moveContainer.offsetHeight;

      document.body.classList.add('resizing', 'resizing-h');
      handle.classList.add('active');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    };

    handle.addEventListener('mousedown', onStart);
    handle.addEventListener('touchstart', onStart, { passive: false });
  }

  _loadResizeSizes() {
    const savedBoardSize = localStorage.getItem('chess_board_size');
    const savedPanelW = localStorage.getItem('chess_panel_width');
    const savedMovesH = localStorage.getItem('chess_moves_height');

    if (savedBoardSize) {
      document.documentElement.style.setProperty('--board-size', savedBoardSize);
    }
    if (savedPanelW) {
      const panel = document.querySelector('.side-panel');
      if (panel) panel.style.width = savedPanelW;
    }
    if (savedMovesH) {
      const mc = document.querySelector('.move-history-container');
      if (mc) {
        mc.style.minHeight = savedMovesH;
        mc.style.maxHeight = savedMovesH;
        mc.style.flex = 'none';
      }
    }
  }

  // === Puzzles ===

  setupPuzzles() {
    const dialog = document.getElementById('puzzle-dialog');
    const difficultyGroup = document.getElementById('puzzle-difficulty-group');

    // Puzzles button
    document.getElementById('btn-puzzles').addEventListener('click', () => {
      this._renderPuzzleStats();
      show(dialog);
    });

    // Cancel
    document.getElementById('cancel-puzzle').addEventListener('click', () => {
      hide(dialog);
    });

    // Difficulty btn-group toggle
    difficultyGroup.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        difficultyGroup.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Random Puzzle
    document.getElementById('start-puzzle').addEventListener('click', () => {
      const theme = document.getElementById('puzzle-theme-filter').value;
      const difficulty = difficultyGroup.querySelector('.btn.active')?.dataset.value || 'all';
      this._startPuzzle({ theme, difficulty });
    });

    // Daily Puzzle
    document.getElementById('btn-daily-puzzle').addEventListener('click', () => {
      this._startPuzzle({ daily: true });
    });

    // Hint
    document.getElementById('btn-puzzle-hint').addEventListener('click', () => {
      if (!this.puzzleActive || this.puzzleManager.solved) return;
      this.board.clearHints();
      const hint = this.puzzleManager.getHint(this.puzzleManager.hintsUsed);
      if (hint) {
        const sq = this.squares?.[hint.square] || this.board.squares[hint.square];
        if (this.board.squares[hint.square]) {
          this.board.squares[hint.square].classList.add('puzzle-hint');
        }
      }
    });

    // Skip
    document.getElementById('btn-puzzle-skip').addEventListener('click', () => {
      if (!this.puzzleActive) return;
      this.puzzleManager.progress.streak = 0;
      this.puzzleManager._saveProgress();
      const theme = document.getElementById('puzzle-theme-filter').value;
      const difficulty = difficultyGroup.querySelector('.btn.active')?.dataset.value || 'all';
      this._startPuzzle({ theme, difficulty });
    });

    // Next Puzzle
    document.getElementById('btn-puzzle-next').addEventListener('click', () => {
      const theme = document.getElementById('puzzle-theme-filter').value;
      const difficulty = difficultyGroup.querySelector('.btn.active')?.dataset.value || 'all';
      this._startPuzzle({ theme, difficulty });
    });
  }

  async _startPuzzle(options = {}) {
    hide(document.getElementById('puzzle-dialog'));

    // Load puzzles if needed
    if (!this.puzzleManager.loaded) {
      await this.puzzleManager.loadPuzzles();
    }

    if (this.puzzleManager.puzzles.length === 0) {
      this.showToast('Failed to load puzzles');
      return;
    }

    // Get puzzle
    let puzzle;
    if (options.daily) {
      puzzle = this.puzzleManager.getDailyPuzzle();
    } else {
      puzzle = this.puzzleManager.getPuzzle({
        theme: options.theme,
        difficulty: options.difficulty
      });
    }

    if (!puzzle) {
      this.showToast('No puzzles matching filters');
      return;
    }

    // Start puzzle
    this.puzzleManager.startPuzzle(puzzle);
    this.puzzleActive = true;

    const playerColor = this.puzzleManager.getPlayerColor(puzzle.fen);

    // Set up game
    this.game.mode = 'puzzle';
    this.game.playerColor = playerColor;
    this.game.loadFromFEN(puzzle.fen);

    // Set up board
    this.board.setFlipped(playerColor === 'b');
    this.board.setLastMove(null);
    this.board.setInteractive(false);
    this.board.update();
    this.notation.clear();

    // Update puzzle bar
    this._updatePuzzleBar(puzzle);
    show(document.getElementById('puzzle-bar'));
    hide(document.getElementById('btn-puzzle-next'));

    // Update status
    const colorName = playerColor === 'w' ? 'White' : 'Black';
    document.getElementById('game-status').textContent = `Find the best move for ${colorName}`;

    // Auto-play setup move after delay
    const setupMove = this.puzzleManager.getSetupMove();
    if (setupMove) {
      setTimeout(async () => {
        await this.board.animateMove(setupMove.from, setupMove.to);
        const move = this.game.makeMove(setupMove.from, setupMove.to, setupMove.promotion);
        if (move) {
          this.sound.playMoveSound(move);
          this.board.setLastMove(move);
        }
        this.board.update();
        this.puzzleManager.advancePastSetup();
        this.board.setInteractive(true);
        this.game.updateStatus();
        const statusColorName = playerColor === 'w' ? 'White' : 'Black';
        document.getElementById('game-status').textContent = `Your turn — find the best move for ${statusColorName}`;
      }, 500);
    } else {
      this.board.setInteractive(true);
    }
  }

  _handlePuzzleMove(move) {
    const result = this.puzzleManager.validateMove(move.from, move.to, move.promotion);

    if (result === 'wrong') {
      // Flash red, undo the move, let player retry
      this.board.flashSquare(move.to, 'puzzle-wrong');
      this.sound.playMoveSound(move); // still play sound

      // Undo the move in chess.js and sync game state
      this.game.chess.undo();
      this.game.moveHistory.pop();
      this.game.currentMoveIndex = this.game.moveHistory.length - 1;
      this.game.fens.pop();
      this.game.gameOver = false;

      this.board.update();
      this.board.clearHints();

      document.getElementById('game-status').textContent = 'Incorrect — try again!';
      return;
    }

    // Correct move
    this.sound.playMoveSound(move);
    this.board.setLastMove(move);
    this.board.update();
    this.board.flashSquare(move.to, 'puzzle-correct');
    this.board.clearHints();

    if (result === 'complete') {
      // Puzzle solved!
      this.puzzleManager.completePuzzle();
      this.board.setInteractive(false);

      const summary = this.puzzleManager.getProgressSummary();
      document.getElementById('game-status').textContent = 'Puzzle solved!';
      document.getElementById('puzzle-streak').textContent = `Streak: ${summary.streak}`;
      show(document.getElementById('btn-puzzle-next'));
      hide(document.getElementById('btn-puzzle-hint'));
      hide(document.getElementById('btn-puzzle-skip'));
      return;
    }

    // More moves to go — play opponent's response
    this.board.setInteractive(false);
    document.getElementById('game-status').textContent = 'Correct!';

    setTimeout(async () => {
      const opponentMove = this.puzzleManager.getNextOpponentMove();
      if (opponentMove) {
        await this.board.animateMove(opponentMove.from, opponentMove.to);
        const m = this.game.makeMove(opponentMove.from, opponentMove.to, opponentMove.promotion);
        if (m) {
          this.sound.playMoveSound(m);
          this.board.setLastMove(m);
        }
        this.board.update();
      }

      // Check if that was the last move
      if (this.puzzleManager.moveIndex >= this.puzzleManager.currentPuzzle.moves.length) {
        this.puzzleManager.completePuzzle();
        const summary = this.puzzleManager.getProgressSummary();
        document.getElementById('game-status').textContent = 'Puzzle solved!';
        document.getElementById('puzzle-streak').textContent = `Streak: ${summary.streak}`;
        show(document.getElementById('btn-puzzle-next'));
        hide(document.getElementById('btn-puzzle-hint'));
        hide(document.getElementById('btn-puzzle-skip'));
      } else {
        const playerColor = this.game.playerColor === 'w' ? 'White' : 'Black';
        document.getElementById('game-status').textContent = `Your turn — find the best move for ${playerColor}`;
        this.board.setInteractive(true);
      }
    }, 400);
  }

  _updatePuzzleBar(puzzle) {
    document.getElementById('puzzle-rating-badge').textContent = puzzle.rating;
    document.getElementById('puzzle-theme-badge').textContent = puzzle.themes.join(', ');
    const summary = this.puzzleManager.getProgressSummary();
    document.getElementById('puzzle-streak').textContent = `Streak: ${summary.streak}`;
    show(document.getElementById('btn-puzzle-hint'));
    show(document.getElementById('btn-puzzle-skip'));
  }

  _renderPuzzleStats() {
    const el = document.getElementById('puzzle-stats-summary');
    const summary = this.puzzleManager.getProgressSummary();
    el.innerHTML = `
      <div class="puzzle-stat">
        <span class="puzzle-stat-value">${summary.totalSolved}</span>
        <span class="puzzle-stat-label">Solved</span>
      </div>
      <div class="puzzle-stat">
        <span class="puzzle-stat-value">${summary.rating}</span>
        <span class="puzzle-stat-label">Rating</span>
      </div>
      <div class="puzzle-stat">
        <span class="puzzle-stat-value">${summary.streak}</span>
        <span class="puzzle-stat-label">Streak</span>
      </div>
      <div class="puzzle-stat">
        <span class="puzzle-stat-value">${summary.bestStreak}</span>
        <span class="puzzle-stat-label">Best</span>
      </div>
    `;
  }

  _exitPuzzleMode() {
    if (!this.puzzleActive) return;
    this.puzzleActive = false;
    this.board.clearHints();
    hide(document.getElementById('puzzle-bar'));
  }

  // === Hamburger Menu ===

  setupHamburgerMenu() {
    const toggle = document.getElementById('btn-menu-toggle');
    const menu = document.getElementById('nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle.classList.toggle('open');
      menu.classList.toggle('open');
    });

    // Auto-close when a button inside the menu is clicked
    menu.addEventListener('click', (e) => {
      if (e.target.closest('.btn') || e.target.closest('button')) {
        toggle.classList.remove('open');
        menu.classList.remove('open');
      }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        toggle.classList.remove('open');
        menu.classList.remove('open');
      }
    });
  }

  // === Offline Indicator ===

  setupOfflineIndicator() {
    const el = document.getElementById('offline-indicator');
    if (!el) return;
    const update = () => el.classList.toggle('visible', !navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  // === Multiplayer ===

  setupMultiplayer() {
    const dialog = document.getElementById('multiplayer-dialog');
    const mpMenu = document.getElementById('mp-menu');
    const mpWaiting = document.getElementById('mp-waiting');
    const mpLoginRequired = document.getElementById('mp-login-required');

    const mpSettings = { color: 'w', time: 0, increment: 0 };

    // Play Online button
    document.getElementById('btn-play-online').addEventListener('click', () => {
      if (!this.auth || !this.auth.isLoggedIn()) {
        hide(mpMenu);
        hide(mpWaiting);
        show(mpLoginRequired);
      } else {
        show(mpMenu);
        hide(mpWaiting);
        hide(mpLoginRequired);
      }
      show(dialog);
    });

    // Cancel buttons
    document.getElementById('mp-cancel').addEventListener('click', () => hide(dialog));
    document.getElementById('mp-cancel-login').addEventListener('click', () => hide(dialog));
    document.getElementById('mp-cancel-waiting').addEventListener('click', () => {
      if (this.multiplayer) {
        this.multiplayer.disconnect();
        this.multiplayer = null;
      }
      show(mpMenu);
      hide(mpWaiting);
    });

    // Color selection
    document.getElementById('mp-color-group').querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('mp-color-group').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mpSettings.color = btn.dataset.value;
      });
    });

    // Time control selection
    document.getElementById('mp-time-group').querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('mp-time-group').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mpSettings.time = parseInt(btn.dataset.time) || 0;
        mpSettings.increment = parseInt(btn.dataset.increment) || 0;
      });
    });

    // Create Game
    document.getElementById('mp-create').addEventListener('click', async () => {
      const sb = getSupabase();
      if (!sb) { this.showToast('Supabase not configured'); return; }

      let color = mpSettings.color;
      if (color === 'random') color = Math.random() < 0.5 ? 'w' : 'b';

      this.multiplayer = new MultiplayerManager(sb);
      this._wireMultiplayerCallbacks(mpSettings.time, mpSettings.increment);

      const result = await this.multiplayer.createGame(
        this.auth.getCurrentUser()?.displayName || 'Player',
        color,
        mpSettings.time,
        mpSettings.increment
      );

      if (result) {
        hide(mpMenu);
        show(mpWaiting);
        document.getElementById('mp-code-display').textContent = result.code;
      }
    });

    // Join Game
    document.getElementById('mp-join').addEventListener('click', async () => {
      const sb = getSupabase();
      if (!sb) { this.showToast('Supabase not configured'); return; }

      const code = document.getElementById('mp-join-code').value.trim().toUpperCase();
      if (code.length !== 6) {
        this.showToast('Enter a 6-character game code');
        return;
      }

      this.multiplayer = new MultiplayerManager(sb);
      // Wire callbacks before joining (joinGame broadcasts player-joined)
      this._wireMultiplayerCallbacks(0, 0);

      const result = await this.multiplayer.joinGame(
        code,
        this.auth.getCurrentUser()?.displayName || 'Player'
      );

      if (result) {
        hide(dialog);
        this._startMultiplayerGame(result.color, result.timeControl, result.increment);
      }
    });

    // Resign button
    document.getElementById('btn-resign-mp').addEventListener('click', () => {
      if (!this.multiplayer || !confirm('Are you sure you want to resign?')) return;
      this.multiplayer.sendResign();
      this.game.gameOver = true;
      this.game.stopTimer();
      const winner = this.multiplayer.myColor === 'w' ? 'Black' : 'White';
      this.updateGameStatus(`You resigned. ${winner} wins.`);
      this.sound.playGameOverSound();
      this._onMultiplayerGameEnd();
    });

    // Draw offer button
    document.getElementById('btn-draw-mp').addEventListener('click', () => {
      if (!this.multiplayer) return;
      this.multiplayer.sendDrawOffer();
      this.showToast('Draw offer sent');
    });

    // Draw offer response
    document.getElementById('draw-accept').addEventListener('click', () => {
      hide(document.getElementById('draw-offer-dialog'));
      if (!this.multiplayer) return;
      this.multiplayer.sendDrawResponse(true);
      this.game.gameOver = true;
      this.game.stopTimer();
      this.updateGameStatus('Draw agreed!');
      this.sound.playGameOverSound();
      this._onMultiplayerGameEnd();
    });

    document.getElementById('draw-decline').addEventListener('click', () => {
      hide(document.getElementById('draw-offer-dialog'));
      if (this.multiplayer) this.multiplayer.sendDrawResponse(false);
    });
  }

  _wireMultiplayerCallbacks(timeControl, increment) {
    if (!this.multiplayer) return;

    this.multiplayer.onOpponentJoined = (name) => {
      this.multiplayer.opponentName = name;
      hide(document.getElementById('multiplayer-dialog'));
      this._startMultiplayerGame(this.multiplayer.myColor, timeControl, increment);
    };

    this.multiplayer.onOpponentMove = ({ from, to, promotion }) => {
      const move = this.game.makeMove(from, to, promotion);
      if (move) {
        this.sound.playMoveSound(move);
        this.notation.addMove(move);
        this.board.setLastMove(move);
        this.board.update();
        this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
        this.fetchOpeningExplorer();

        if (this.game.gameOver) {
          this.board.setInteractive(false);
          this._onGameEnd();
        } else {
          this.board.setInteractive(true);
        }
      }
    };

    this.multiplayer.onOpponentResigned = () => {
      this.game.gameOver = true;
      this.game.stopTimer();
      const winner = this.multiplayer.myColor === 'w' ? 'White' : 'Black';
      this.updateGameStatus(`Opponent resigned! ${winner} wins.`);
      this.sound.playGameOverSound();
      this._onMultiplayerGameEnd();
    };

    this.multiplayer.onDrawOffered = () => {
      show(document.getElementById('draw-offer-dialog'));
    };

    this.multiplayer.onDrawResponse = (accepted) => {
      if (accepted) {
        this.game.gameOver = true;
        this.game.stopTimer();
        this.updateGameStatus('Draw agreed!');
        this.sound.playGameOverSound();
        this._onMultiplayerGameEnd();
      } else {
        this.showToast('Draw offer declined');
      }
    };

    this.multiplayer.onOpponentDisconnected = () => {
      const statusEl = document.getElementById('mp-opponent-status');
      statusEl.textContent = 'Opponent disconnected';
      statusEl.classList.add('disconnected');
      show(statusEl);
    };

    this.multiplayer.onOpponentReconnected = () => {
      const statusEl = document.getElementById('mp-opponent-status');
      statusEl.textContent = 'Opponent connected';
      statusEl.classList.remove('disconnected');
      show(statusEl);
      setTimeout(() => hide(statusEl), 3000);
    };

    this.multiplayer.onTimerSync = (timers) => {
      if (this.multiplayer.role === 'guest') {
        this.game.timers = timers;
        this.updateTimers(timers);
      }
    };

    this.multiplayer.onError = (msg) => {
      this.showToast(msg);
    };
  }

  _startMultiplayerGame(color, timeControl, increment) {
    this._gameOverSoundPlayed = false;

    // Stop any engine
    this._clearEngineMoveTimer();
    if (this.engine && this.engine.thinking) {
      this.engine.stop();
    }
    this.activeBot = null;

    this.game.newGame({
      mode: 'multiplayer',
      color,
      time: timeControl,
      increment
    });

    this.notation.clear();
    this.board.setLastMove(null);
    this.captured.clear();

    // Clear analysis
    this.analysisResults = null;
    hide(document.getElementById('btn-analyze'));
    hide(document.getElementById('analysis-progress'));
    hide(document.getElementById('analysis-summary'));
    hide(document.getElementById('eval-graph-container'));
    this.evalGraph.clear();
    this.notation.clearClassifications();

    // Clear coach
    if (this.coach) this.coach.clearMessages();

    // Flip board if playing black
    this.board.setFlipped(color === 'b');
    this.board.update();
    this.updateTimers(this.game.timers);

    // Show multiplayer controls, hide engine status
    show(document.getElementById('btn-resign-mp'));
    show(document.getElementById('btn-draw-mp'));
    hide(document.getElementById('engine-status'));

    // Update player names
    const topColor = this.board.flipped ? 'w' : 'b';
    const myName = this.auth?.getCurrentUser()?.displayName || 'You';
    const oppName = this.multiplayer?.opponentName || 'Opponent';
    const topName = document.querySelector('#player-top .player-name');
    const bottomName = document.querySelector('#player-bottom .player-name');
    if (topName) topName.textContent = topColor === color ? myName : oppName;
    if (bottomName) bottomName.textContent = topColor === color ? oppName : myName;

    // Board interactivity — white moves first
    this.board.setInteractive(color === 'w');

    // Start timer sync if host
    if (this.multiplayer && timeControl > 0) {
      this.multiplayer.startTimerSync(() => this.game.timers);
    }

    this.sound.playGameStartSound();
    this.fetchOpeningExplorer();
  }

  _onMultiplayerGameEnd() {
    // Sound
    if (!this._gameOverSoundPlayed && !this.chess.in_checkmate()) {
      this.sound.playGameOverSound();
    }
    this._gameOverSoundPlayed = false;

    this.board.setInteractive(false);

    // Hide multiplayer controls
    hide(document.getElementById('btn-resign-mp'));
    hide(document.getElementById('btn-draw-mp'));
    hide(document.getElementById('mp-opponent-status'));

    // Show analyze button
    if (this.engineInitialized) {
      show(document.getElementById('analyze-group'));
    }

    // Archive game to DB
    if (this.multiplayer) {
      const gameResult = this.game.getGameResult();
      const result = gameResult ? gameResult.result : '*';
      const pgn = this.notation.toPGN({ Result: result });
      this.multiplayer.archiveGame(result, pgn);
      this.multiplayer.disconnect();
      this.multiplayer = null;
    }
  }

  // === DGT Board ===

  setupDGT() {
    this.dgtBoard = new DGTBoard();

    // Hide USB Serial option on platforms that don't support it (mobile/Capacitor)
    if (!navigator.serial) {
      document.getElementById('dgt-connect-usb').style.display = 'none';
    }

    const dgtDialog = document.getElementById('dgt-dialog');
    const statusDot = document.getElementById('dgt-status-dot');
    const statusText = document.getElementById('dgt-status-text');
    const connectOptions = document.getElementById('dgt-connect-options');
    const disconnectBtn = document.getElementById('dgt-disconnect');
    const boardStatusEl = document.getElementById('dgt-board-status');
    const dgtBtn = document.getElementById('btn-dgt');
    const engineMoveEl = document.getElementById('dgt-engine-move');
    const engineMoveSan = document.getElementById('dgt-engine-move-san');

    // Status callback
    this.dgtBoard.onStatusChange = (msg) => {
      if (statusText) statusText.textContent = msg;
    };

    // Connection change callback
    this.dgtBoard.onConnectionChange = (connected) => {
      statusDot.classList.toggle('connected', connected);
      dgtBtn.classList.toggle('dgt-active', connected);

      if (connected) {
        hide(connectOptions);
        show(disconnectBtn);
        show(boardStatusEl);
        boardStatusEl.textContent = 'DGT: Connected';
        // Sync board to current game position
        this.dgtBoard.syncToPosition(this.chess);
      } else {
        show(connectOptions);
        hide(disconnectBtn);
        hide(boardStatusEl);
        hide(engineMoveEl);
      }
    };

    // Physical board change callback — detect moves
    this.dgtBoard._onPhysicalBoardChanged = () => {
      // If there's a pending engine move, check if user replayed it on the board
      if (this.dgtBoard.pendingEngineMove) {
        const gameBoard = this.dgtBoard._chessJsToArray(this.chess);
        if (this.dgtBoard._boardsMatch(gameBoard, this.dgtBoard.dgtBoard)) {
          // Physical board now matches game — engine move was replayed
          this.dgtBoard.lastStableBoard = [...this.dgtBoard.dgtBoard];
          this.dgtBoard.pendingEngineMove = null;
          hide(engineMoveEl);
          return;
        }
      }

      // Try to detect a player move
      const detected = this.dgtBoard.detectMove(this.chess);
      if (!detected) return;

      // In engine mode, only accept moves from the player's color
      if (this.game.mode === 'engine') {
        const turn = this.chess.turn();
        if (turn !== this.game.playerColor) return;
      }

      // Don't accept moves if game is over or in replay
      if (this.game.gameOver || this.game.replayMode) return;

      // Execute the move via the board (handles promotion, validation, etc.)
      this.board.tryMove(detected.from, detected.to);
    };

    // Button handlers
    dgtBtn.addEventListener('click', () => {
      show(dgtDialog);
    });

    document.getElementById('close-dgt').addEventListener('click', () => {
      hide(dgtDialog);
    });

    document.getElementById('dgt-connect-usb').addEventListener('click', () => {
      this.dgtBoard.connectSerial();
    });

    document.getElementById('dgt-connect-livechess').addEventListener('click', () => {
      this.dgtBoard.connectLiveChess();
    });

    disconnectBtn.addEventListener('click', () => {
      this.dgtBoard.disconnect();
    });
  }

  // === Auth ===

  setupAuth() {
    // Init Supabase if configured
    if (isSupabaseConfigured()) {
      this.firebaseReady = initSupabase();
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

    // Forgot password
    document.getElementById('show-forgot-password').addEventListener('click', (e) => {
      e.preventDefault();
      hide(document.getElementById('login-form'));
      show(document.getElementById('forgot-password-form'));
    });

    document.getElementById('back-to-login-from-forgot').addEventListener('click', () => {
      hide(document.getElementById('forgot-password-form'));
      show(document.getElementById('login-form'));
    });

    document.getElementById('btn-send-reset').addEventListener('click', async () => {
      if (!this.auth) {
        this._showAuthError('forgot', 'Supabase not configured.');
        return;
      }
      const email = document.getElementById('forgot-email').value.trim();
      if (!email) return;

      const btn = document.getElementById('btn-send-reset');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await this.auth.resetPassword(email);
        hide(document.getElementById('forgot-error'));
        const successEl = document.getElementById('forgot-success');
        successEl.textContent = 'Password reset email sent! Check your inbox.';
        show(successEl);
      } catch (err) {
        this._showAuthError('forgot', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
      }
    });

    // Login
    document.getElementById('btn-login').addEventListener('click', async () => {
      if (!this.auth) {
        this._showAuthError('login', 'Supabase not configured. Update supabase-config.js with your project URL and anon key.');
        return;
      }
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) return;

      const btn = document.getElementById('btn-login');
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      try {
        await this.auth.login(email, password);
        hide(authDialog);
      } catch (err) {
        let msg = err.message;
        if (msg.includes('Email not confirmed')) {
          msg = 'Please confirm your email first. Check your inbox for a confirmation link.';
        } else if (msg.includes('Invalid login credentials')) {
          msg = 'Invalid email or password. Please try again.';
        }
        this._showAuthError('login', msg);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Login';
      }
    });

    // Register
    document.getElementById('btn-register').addEventListener('click', async () => {
      if (!this.auth) {
        this._showAuthError('register', 'Supabase not configured. Update supabase-config.js with your project URL and anon key.');
        return;
      }
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      if (!name || !email || !password) return;

      const btn = document.getElementById('btn-register');
      btn.disabled = true;
      btn.textContent = 'Registering...';
      try {
        const user = await this.auth.register(email, password, name);
        if (user && !user.confirmed_at && user.identities?.length === 0) {
          this._showAuthError('register', 'An account with this email already exists. Try logging in.');
        } else if (user && !user.confirmed_at) {
          hide(authDialog);
          this.showToast('Check your email to confirm your account, then log in.');
        } else {
          hide(authDialog);
          this.showToast(`Welcome, ${name}!`);
        }
      } catch (err) {
        this._showAuthError('register', err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Register';
      }
    });
  }

  _updateAuthUI(user) {
    const authBtn = document.getElementById('btn-auth');
    const authStatus = document.getElementById('auth-status');
    const badge = document.getElementById('btn-user-badge');
    const badgeAvatar = document.getElementById('header-user-avatar');
    const badgeName = document.getElementById('header-user-name');

    if (user) {
      const currentUser = this.auth.getCurrentUser();
      const displayName = currentUser?.displayName || user.user_metadata?.display_name || user.email;
      authBtn.textContent = 'Logout';
      authStatus.textContent = displayName;
      show(authStatus);

      // Header badge — show name + avatar
      badgeName.textContent = displayName;
      badgeAvatar.src = this.profile.getAvatar();
      show(badgeAvatar);

      // Show admin button if admin
      if (this.auth.isAdmin()) {
        const adminBtn = document.getElementById('btn-admin');
        if (adminBtn) show(adminBtn);
      }
    } else {
      authBtn.textContent = 'Login';
      hide(authStatus);

      // Header badge — show "Login" text, hide avatar
      badgeName.textContent = 'Login';
      hide(badgeAvatar);

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

    // Set up the board for live spectating
    this.game.newGame({ mode: 'local', color: 'w', time: 0 });
    this.game.replayMode = true; // Prevent player interaction
    this.board.setInteractive(false);
    this.board.setFlipped(false);
    this.notation.clear();
    this.board.setLastMove(null);
    this.board.update();
    this.captured.clear();
    this.activeBot = null;

    // Update player names
    const topName = document.querySelector('#player-top .player-name');
    const bottomName = document.querySelector('#player-bottom .player-name');
    if (topName) topName.textContent = black.name;
    if (bottomName) bottomName.textContent = white.name;

    // Show engine status for the match
    const engineStatusEl = document.getElementById('engine-status');
    show(engineStatusEl);
    engineStatusEl.textContent = `${white.name} vs ${black.name} — Live`;

    this.updateGameStatus(`${white.name} vs ${black.name} — In progress`);

    // Temporarily remove onBestMove to prevent interference
    const origBestMove = this.engine.onBestMove;
    const origNoMove = this.engine.onNoMove;
    this.engine.onBestMove = null;
    this.engine.onNoMove = null;

    // Abort flag — set to true to stop the match
    this._botMatchAbort = false;
    const MAX_MOVES = 200;

    this.engine.send('ucinewgame');
    this.engine.send('isready');
    await this.botMatch_waitReady();

    try {
      while (!this.chess.game_over() && this.game.moveHistory.length < MAX_MOVES && !this._botMatchAbort) {
        const currentBot = this.chess.turn() === 'w' ? white : black;

        // Show who is thinking
        engineStatusEl.innerHTML = `<span class="thinking">${currentBot.name}: Thinking <span class="thinking-dots"><span></span><span></span><span></span></span></span>`;

        // Apply personality and get move
        this.engine.applyPersonality(currentBot);
        const uciMove = await this.botMatch_getMove(this.chess.fen(), currentBot);

        if (!uciMove || this._botMatchAbort) break;

        // Parse and make the move on the actual game board
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

        const move = this.game.makeMove(from, to, promotion);
        if (!move) break;

        // Update board visuals live
        this.sound.playMoveSound(move);
        this.notation.addMove(move);
        this.board.setLastMove(move);
        this.board.update();
        this.captured.update(this.game.moveHistory, this.game.currentMoveIndex, this.board.flipped);
        this.fetchOpeningExplorer();

        const moveNum = Math.ceil(this.game.moveHistory.length / 2);
        engineStatusEl.textContent = `${white.name} vs ${black.name} — Move ${moveNum}`;

        // Small delay so the viewer can follow along
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err) {
      console.error('Bot match error:', err);
    }

    // Restore handlers
    this.engine.onBestMove = origBestMove;
    this.engine.onNoMove = origNoMove;
    this._botMatchAbort = false;

    // Determine result
    let result = '1/2-1/2';
    if (this.chess.in_checkmate()) {
      result = this.chess.turn() === 'w' ? '0-1' : '1-0';
    }

    this.game.gameOver = true;
    this.game.replayMode = false;

    // Allow analysis
    this.analysisResults = null;
    if (this.engineInitialized) {
      show(document.getElementById('analyze-group'));
    }

    this.updateGameStatus(`${white.name} vs ${black.name} — ${result}`);
    engineStatusEl.textContent = `${white.name} vs ${black.name} — ${result}`;
    this.showToast(`Game complete: ${result}. Use arrow keys to review.`);
  }

  async botMatch_waitReady() {
    return new Promise((resolve) => {
      const orig = this.engine.worker.onmessage;
      this.engine.worker.onmessage = (e) => {
        const msg = typeof e.data === 'string' ? e.data : String(e.data);
        if (msg === 'readyok') {
          this.engine.worker.onmessage = orig;
          resolve();
        }
      };
    });
  }

  async botMatch_getMove(fen, bot) {
    return new Promise((resolve) => {
      const orig = this.engine.worker.onmessage;
      this.engine.worker.onmessage = (e) => {
        const msg = typeof e.data === 'string' ? e.data : String(e.data);
        if (msg.startsWith('bestmove')) {
          const parts = msg.split(' ');
          const bestMove = parts[1];
          this.engine.worker.onmessage = orig;
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
        this.engine.send(`go movetime ${Math.min(bot.moveTime, 3000)}`);
      } else {
        this.engine.send(`go depth ${Math.min(bot.searchDepth || this.engine.depth, 14)}`);
      }
    });
  }

  // === Music Player ===

  setupMusic() {
    const dialog = document.getElementById('music-dialog');
    const playlistEl = document.getElementById('music-playlist');
    const nowTitle = dialog.querySelector('.music-track-title');
    const nowComposer = dialog.querySelector('.music-track-composer');
    const playBtn = document.getElementById('music-play-pause');
    const volumeSlider = document.getElementById('music-volume');
    const shuffleBtn = document.getElementById('music-shuffle');

    // Open dialog
    document.getElementById('btn-music').addEventListener('click', () => {
      this._renderMusicDialog();
      show(dialog);
    });

    document.getElementById('close-music').addEventListener('click', () => {
      hide(dialog);
    });

    // Play/Pause
    playBtn.addEventListener('click', () => {
      this.music.toggle();
    });

    // Next / Prev
    document.getElementById('music-next').addEventListener('click', () => {
      this.music.next();
    });
    document.getElementById('music-prev').addEventListener('click', () => {
      this.music.prev();
    });

    // Shuffle
    shuffleBtn.addEventListener('click', () => {
      this.music.toggleShuffle();
    });

    // Volume
    volumeSlider.value = Math.round(this.music.audio.volume * 100);
    volumeSlider.addEventListener('input', (e) => {
      this.music.setVolume(parseInt(e.target.value) / 100);
    });

    // Composer filter
    const composerFilter = document.getElementById('music-composer-filter');
    if (composerFilter) {
      // Populate composer options
      const composers = [...new Set(PLAYLIST.map(t => t.composer))].sort();
      composers.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        composerFilter.appendChild(opt);
      });
      composerFilter.addEventListener('change', () => {
        this._updateMusicPlaylist();
      });
    }

    // State change callback
    this.music.onStateChange = ({ playing, track, shuffle }) => {
      playBtn.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
      nowTitle.textContent = track.title;
      nowComposer.textContent = track.composer;
      shuffleBtn.classList.toggle('active', shuffle);
      this._updateMusicPlaylist();
    };
  }

  _renderMusicDialog() {
    this._updateMusicPlaylist();
    const nowTitle = document.querySelector('#music-dialog .music-track-title');
    const nowComposer = document.querySelector('#music-dialog .music-track-composer');
    const track = this.music.currentTrack;
    nowTitle.textContent = track.title;
    nowComposer.textContent = track.composer;

    const playBtn = document.getElementById('music-play-pause');
    playBtn.innerHTML = this.music.playing ? '&#9646;&#9646;' : '&#9654;';

    const shuffleBtn = document.getElementById('music-shuffle');
    shuffleBtn.classList.toggle('active', this.music.shuffle);
  }

  _updateMusicPlaylist() {
    const filterValue = document.getElementById('music-composer-filter')?.value || 'all';
    const filteredTracks = filterValue === 'all' ? PLAYLIST : PLAYLIST.filter(t => t.composer === filterValue);
    const countEl = document.getElementById('music-track-count');
    if (countEl) countEl.textContent = `${filteredTracks.length} tracks`;

    const playlistEl = document.getElementById('music-playlist');
    playlistEl.innerHTML = '';

    filteredTracks.forEach((track) => {
      const i = PLAYLIST.indexOf(track);
      const el = document.createElement('div');
      el.className = 'music-track' + (i === this.music.currentIndex ? ' active' : '');
      el.innerHTML = `
        <span class="music-track-num">${i + 1}</span>
        <div class="music-track-details">
          <div class="music-track-details-title">${track.title}</div>
          <div class="music-track-details-composer">${track.composer}</div>
        </div>
        <span class="music-track-dur">${track.duration}</span>
      `;
      el.addEventListener('click', () => {
        this.music.setTrack(i);
        if (!this.music.playing) this.music.play();
      });
      playlistEl.appendChild(el);
    });
  }

  // === Chess News ===

  setupNews() {
    const dialog = document.getElementById('news-dialog');
    const contentEl = document.getElementById('news-content');

    document.getElementById('btn-news').addEventListener('click', async () => {
      show(dialog);
      this._renderNewsTab('live');
    });

    document.getElementById('close-news').addEventListener('click', () => {
      this._hideNewsDetail();
      hide(dialog);
    });

    // Back button in detail view
    document.getElementById('news-back').addEventListener('click', () => {
      this._hideNewsDetail();
    });

    // Tab switching
    dialog.querySelectorAll('.news-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        dialog.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderNewsTab(tab.dataset.tab);
      });
    });
  }

  async _renderNewsTab(tab) {
    const contentEl = document.getElementById('news-content');

    if (tab === 'live') {
      contentEl.innerHTML = '<div class="news-loading">Loading live broadcasts...</div>';

      const broadcasts = await this.chessNews.fetchBroadcasts();

      if (broadcasts.length === 0) {
        contentEl.innerHTML = '<div class="news-loading">No broadcasts available right now. Check back later.</div>';
        return;
      }

      contentEl.innerHTML = '';

      // Sort: live first, then upcoming, then finished
      const order = { live: 0, upcoming: 1, finished: 2 };
      const sorted = [...broadcasts].sort((a, b) => (order[a.status] || 2) - (order[b.status] || 2));

      // Group by status
      let lastStatus = '';
      for (const b of sorted) {
        if (b.status !== lastStatus) {
          lastStatus = b.status;
          const label = document.createElement('div');
          label.className = 'news-section-label';
          label.textContent = b.status === 'live' ? 'Live Now' : b.status === 'upcoming' ? 'Upcoming' : 'Recently Finished';
          contentEl.appendChild(label);
        }

        const card = document.createElement('div');
        card.className = `news-card ${b.status}`;
        card.innerHTML = `
          <span class="news-badge ${b.status}">${b.status === 'live' ? 'LIVE' : b.status === 'upcoming' ? 'SOON' : 'DONE'}</span>
          <div class="news-info">
            <div class="news-title">${b.name}</div>
            ${b.round ? `<div class="news-desc">${b.round}</div>` : ''}
            ${b.startsAt ? `<div class="news-meta">${this.chessNews.formatDate(b.startsAt)}</div>` : ''}
          </div>
        `;
        card.addEventListener('click', () => {
          this._showNewsDetail(b.name, b.url);
        });
        contentEl.appendChild(card);
      }
    } else if (tab === 'follow') {
      contentEl.innerHTML = '';
      const items = this.chessNews.getNewsItems();

      const icons = {
        fide: '\u265A',
        news: '\uD83D\uDCF0',
        live: '\uD83D\uDD34',
        rating: '\uD83C\uDFC6'
      };

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'news-link-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <div class="news-link-icon">${icons[item.icon] || '\u265E'}</div>
          <div class="news-info">
            <div class="news-title">${item.title}</div>
            <div class="news-desc">${item.description}</div>
          </div>
        `;
        card.addEventListener('click', () => {
          this._showNewsDetail(item.title, item.url);
        });
        contentEl.appendChild(card);
      }
    }
  }

  _showNewsDetail(title, url) {
    const header = document.getElementById('news-header');
    const detailHeader = document.getElementById('news-detail-header');
    const content = document.getElementById('news-content');
    const detailView = document.getElementById('news-detail-view');
    const iframe = document.getElementById('news-iframe');
    const titleEl = document.getElementById('news-detail-title');

    header.classList.add('hidden');
    content.classList.add('hidden');
    detailHeader.classList.remove('hidden');
    detailView.classList.remove('hidden');

    titleEl.textContent = title;
    iframe.src = url;
  }

  _hideNewsDetail() {
    const header = document.getElementById('news-header');
    const detailHeader = document.getElementById('news-detail-header');
    const content = document.getElementById('news-content');
    const detailView = document.getElementById('news-detail-view');
    const iframe = document.getElementById('news-iframe');

    header.classList.remove('hidden');
    content.classList.remove('hidden');
    detailHeader.classList.add('hidden');
    detailView.classList.add('hidden');

    iframe.src = ''; // Stop loading
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

        // Auto-trigger advisor analysis when switching to Ideas tab
        if (tabId === 'ideas' && this._advisorBots.length > 0) {
          this._updateAdvisorAnalysis();
        }
      });
    });
  }

  // === Stats ===

  setupStatsDialog() {
    document.getElementById('btn-stats').addEventListener('click', () => {
      this._renderStats();
      show(document.getElementById('stats-dialog'));
    });

    // Header user badge → open profile
    document.getElementById('btn-user-badge').addEventListener('click', () => {
      if (this.auth && this.auth.isLoggedIn()) {
        this._renderStats();
        show(document.getElementById('stats-dialog'));
      } else {
        show(document.getElementById('auth-dialog'));
      }
    });

    document.getElementById('close-stats').addEventListener('click', () => {
      hide(document.getElementById('stats-dialog'));
      hide(document.getElementById('avatar-picker'));
    });

    // Avatar edit button
    document.getElementById('btn-edit-avatar').addEventListener('click', () => {
      const picker = document.getElementById('avatar-picker');
      if (picker.classList.contains('hidden')) {
        this._showAvatarPicker();
        show(picker);
      } else {
        hide(picker);
      }
    });

    // Initialize rating graph
    this.ratingGraph = new RatingGraph(document.getElementById('rating-graph-container'));
  }

  _showAvatarPicker() {
    const picker = document.getElementById('avatar-picker');
    const avatars = PlayerProfile.getAvatarList();
    picker.innerHTML = avatars.map(path => `
      <div class="avatar-option ${path === this.profile.getAvatar() ? 'selected' : ''}" data-avatar="${path}">
        <img src="${path}" alt="">
      </div>
    `).join('');

    picker.querySelectorAll('.avatar-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const path = opt.dataset.avatar;
        this.profile.setAvatar(path);
        document.getElementById('profile-avatar').src = path;
        picker.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        hide(picker);
      });
    });
  }

  _renderStats() {
    const record = this.stats.getRecord();

    // Profile header
    document.getElementById('profile-avatar').src = this.profile.getAvatar();
    const displayName = (this.auth && this.auth.user) ? this.auth.user.displayName : this.profile.getDisplayName();
    document.getElementById('profile-name').textContent = displayName;

    const currentRating = this.profile.getCurrentRating(this.stats.games);
    document.getElementById('profile-rating').textContent = record.total > 0 ? `Rating: ${currentRating}` : '';
    document.getElementById('profile-record').textContent = record.total > 0
      ? `${record.wins}W / ${record.losses}L / ${record.draws}D — ${record.total} games`
      : 'No games played yet';

    // Account details (when logged in)
    const accountEl = document.getElementById('profile-account-details');
    if (this.auth && this.auth.isLoggedIn()) {
      const user = this.auth.getCurrentUser();
      const createdAt = this.auth.user?.created_at;
      const memberSince = createdAt ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '';
      accountEl.innerHTML = `
        <div class="profile-detail"><span class="profile-detail-label">Email</span><span>${user.email}</span></div>
        ${memberSince ? `<div class="profile-detail"><span class="profile-detail-label">Member since</span><span>${memberSince}</span></div>` : ''}
        <div class="profile-detail"><span class="profile-detail-label">Status</span><span><span class="profile-online-dot"></span> Online</span></div>
      `;
      show(accountEl);
    } else {
      hide(accountEl);
    }

    // Rating graph
    const graphSection = document.getElementById('rating-graph-section');
    if (record.total >= 3) {
      const history = this.profile.getRatingHistory(this.stats.games);
      show(graphSection);
      this.ratingGraph.render(history);
    } else {
      show(graphSection);
      this.ratingGraph.render([]);
    }

    // Stats content
    const el = document.getElementById('stats-content');
    if (record.total === 0) {
      el.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Play against the computer to start tracking your stats.</p>';
      return;
    }

    let html = '';

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

    // Recent games (up to 50)
    const recent = this.stats.getRecentGames(50);
    if (recent.length > 0) {
      html += '<div class="stats-recent"><h4>Recent Games</h4>';
      for (const g of recent) {
        const date = g.date ? new Date(g.date).toLocaleDateString() : '';
        html += `
          <div class="stats-game-item">
            <div>
              <span>vs ${g.opponent} (${g.opponentElo})</span>
              <span class="stats-game-date">${date}</span>
            </div>
            <div>
              <span class="stats-game-opening">${g.opening || ''}</span>
              <span class="stats-game-result-badge ${g.result}">${g.result}</span>
            </div>
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
