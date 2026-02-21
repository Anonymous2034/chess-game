// App entry point — initializes and wires all components
import { Board } from './board.js';
import { Game } from './game.js';
import { Engine } from './engine.js';
import { Notation } from './notation.js';
import { Database } from './database.js';
import { BOT_PERSONALITIES, GM_STYLES, BOT_TIERS } from './bots.js';
import { OpeningBook } from './openings.js';
import { show, hide, debounce } from './utils.js';

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

    this.init();
  }

  async init() {
    // Init board
    const boardEl = document.getElementById('board');
    this.board = new Board(boardEl, this.game);

    // Init notation
    const moveHistoryEl = document.getElementById('move-history');
    this.notation = new Notation(moveHistoryEl);

    // Wire up game callbacks
    this.game.onStatusChange = (status) => this.updateGameStatus(status);
    this.game.onTimerUpdate = (timers) => this.updateTimers(timers);
    this.game.onMoveMade = (move) => this.handleMoveMade(move);

    // Wire up notation click
    this.notation.onMoveClick = (index) => this.navigateToMove(index);

    // Setup UI handlers
    this.setupNewGameDialog();
    this.setupNavigationControls();
    this.setupGameControls();
    this.setupPGNHandlers();
    this.setupDatabaseDialog();
    this.setupBoardFlip();

    // Load database in background
    this.database.loadCollections().then(categories => {
      if (categories.length > 0) {
        this.populateCategoryTabs();
        this.populateCollectionFilter();
      }
    });

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

    if (this.game.gameOver) {
      this.board.setInteractive(false);
      return;
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

    // Check opening book first
    if (this.activeBot) {
      const engineColor = this.game.playerColor === 'w' ? 'b' : 'w';
      const bookMove = this.openingBook.getBookMove(this.activeBot, this.game.moveHistory, engineColor);
      if (bookMove) {
        // Simulate thinking delay (300-800ms)
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
              this.fetchOpeningExplorer();
            }
            if (!this.game.gameOver) {
              this.board.setInteractive(true);
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
    const parsed = Engine.parseUCIMove(uciMove);
    const move = this.game.makeEngineMove(parsed.from, parsed.to, parsed.promotion);

    if (move) {
      this.notation.addMove(move);
      this.board.setLastMove(move);
      this.board.update();
      this.fetchOpeningExplorer();
    }

    if (!this.game.gameOver) {
      this.board.setInteractive(true);
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
      }
    });
  }

  // === New Game Dialog ===

  setupNewGameDialog() {
    const dialog = document.getElementById('new-game-dialog');
    const settings = { mode: 'local', color: 'w', botId: 'beginner-betty', time: 0 };

    // Render bot picker
    this.renderBotPicker(settings);

    document.getElementById('btn-new-game').addEventListener('click', () => {
      show(dialog);
      this.updateDialogVisibility(settings.mode);
    });

    document.getElementById('cancel-new-game').addEventListener('click', () => {
      hide(dialog);
    });

    // Button group selections (mode, color, time)
    dialog.querySelectorAll('.btn-group').forEach(group => {
      const setting = group.dataset.setting;
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

    document.getElementById('start-new-game').addEventListener('click', async () => {
      hide(dialog);

      let color = settings.color;
      if (color === 'random') {
        color = Math.random() < 0.5 ? 'w' : 'b';
      }

      // Stop any current engine computation
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
        time: settings.time
      });

      this.notation.clear();
      this.board.setLastMove(null);
      this.board.setInteractive(true);

      // Clear opening label
      this.lastOpeningName = '';
      const labelEl = document.getElementById('opening-label');
      if (labelEl) labelEl.textContent = '';

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
    });
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ChessApp();
});
