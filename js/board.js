// Board rendering, drag-and-drop, click-to-move
import { squareToCoords, coordsToSquare, pieceImagePath, show, hide } from './utils.js';

export class Board {
  constructor(containerEl, game) {
    this.container = containerEl;
    this.game = game;
    this.flipped = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.dragPiece = null;
    this.dragStartSquare = null;
    this.interactive = true;

    // Pre-move state
    this.premove = null;         // { from, to, promotion } or null
    this.premoveAllowed = false; // true when engine is thinking

    // Promotion state
    this.pendingPromotion = null;
    this.promotionResolve = null;

    // User arrow annotations (Feature 9)
    this._userArrows = [];       // [{ from, to, color }]
    this._userHighlights = [];   // [{ square, color }]
    this._positionArrows = {};   // FEN -> { arrows, highlights }
    this._arrowStart = null;     // square where right-click started

    this.showLegalMoves = false;
    this.squares = {};
    this.render();
    this.setupDragAndDrop();
    this.setupRightClickArrows();
    this.renderCoordinates();
  }

  render() {
    // Remove any stale drag elements
    document.querySelectorAll('.piece.dragging').forEach(el => el.remove());

    this.container.innerHTML = '';
    this.squares = {};

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const displayRow = this.flipped ? 7 - row : row;
        const displayCol = this.flipped ? 7 - col : col;
        const sq = coordsToSquare(displayRow, displayCol);
        const isLight = (row + col) % 2 === 0;

        const div = document.createElement('div');
        div.className = `square ${isLight ? 'light' : 'dark'}`;
        div.dataset.square = sq;

        // Place piece if present
        const piece = this.game.chess.get(sq);
        if (piece) {
          const img = document.createElement('img');
          img.className = 'piece';
          img.src = pieceImagePath(piece);
          img.alt = `${piece.color}${piece.type}`;
          img.draggable = false; // We handle our own drag
          div.appendChild(img);
        }

        // Click handler
        div.addEventListener('click', (e) => this.onSquareClick(sq, e));

        this.squares[sq] = div;
        this.container.appendChild(div);
      }
    }

    this.applyHighlights();
  }

  renderCoordinates() {
    const filesEl = document.getElementById('coords-files');
    const ranksEl = document.getElementById('coords-ranks');
    if (!filesEl || !ranksEl) return;

    filesEl.innerHTML = '';
    ranksEl.innerHTML = '';

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    const displayFiles = this.flipped ? [...files].reverse() : files;
    const displayRanks = this.flipped ? [...ranks].reverse() : ranks;

    displayFiles.forEach(f => {
      const span = document.createElement('span');
      span.className = 'coord-label';
      span.textContent = f;
      filesEl.appendChild(span);
    });

    displayRanks.forEach(r => {
      const span = document.createElement('span');
      span.className = 'coord-label';
      span.textContent = r;
      ranksEl.appendChild(span);
    });
  }

  applyHighlights() {
    // Clear all highlights
    Object.values(this.squares).forEach(sq => {
      sq.classList.remove('highlighted', 'selected', 'check', 'premove');
      const dot = sq.querySelector('.legal-dot, .legal-capture');
      if (dot) dot.remove();
    });

    // Last move highlight
    if (this.lastMove) {
      const fromDiv = this.squares[this.lastMove.from];
      const toDiv = this.squares[this.lastMove.to];
      if (fromDiv) fromDiv.classList.add('highlighted');
      if (toDiv) toDiv.classList.add('highlighted');
    }

    // Selected square
    if (this.selectedSquare && this.squares[this.selectedSquare]) {
      this.squares[this.selectedSquare].classList.add('selected');
    }

    // Legal move indicators (only when showLegalMoves is enabled)
    if (this.showLegalMoves) {
      this.legalMoves.forEach(move => {
        const div = this.squares[move.to];
        if (!div) return;
        const targetPiece = this.game.chess.get(move.to);
        if (targetPiece || move.flags.includes('e')) {
          // Capture: ring indicator
          const ring = document.createElement('div');
          ring.className = 'legal-capture';
          div.appendChild(ring);
        } else {
          // Empty square: dot indicator
          const dot = document.createElement('div');
          dot.className = 'legal-dot';
          div.appendChild(dot);
        }
      });
    }

    // Check highlight
    if (this.game.chess.in_check()) {
      const turn = this.game.chess.turn();
      const board = this.game.chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            const sq = coordsToSquare(r, c);
            if (this.squares[sq]) this.squares[sq].classList.add('check');
          }
        }
      }
    }

    // Pre-move highlight
    if (this.premove) {
      const fromDiv = this.squares[this.premove.from];
      const toDiv = this.squares[this.premove.to];
      if (fromDiv) fromDiv.classList.add('premove');
      if (toDiv) toDiv.classList.add('premove');
    }
  }

  onSquareClick(sq) {
    // Allow pre-move interaction when engine is thinking
    if (!this.interactive && !this.premoveAllowed) return;

    // If engine is thinking, handle pre-move input
    if (!this.interactive && this.premoveAllowed) {
      this._handlePremoveClick(sq);
      return;
    }

    if (this.selectedSquare) {
      // Try to make a move
      const legalMove = this.legalMoves.find(m => m.to === sq);
      if (legalMove) {
        this.tryMove(this.selectedSquare, sq);
      } else {
        // Select a new piece or deselect
        this.selectSquare(sq);
      }
    } else {
      this.selectSquare(sq);
    }
  }

  selectSquare(sq) {
    const piece = this.game.chess.get(sq);
    if (piece && piece.color === this.game.chess.turn() && this.game.canPlayerMove(piece.color)) {
      this.selectedSquare = sq;
      this.legalMoves = this.game.chess.moves({ square: sq, verbose: true });
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
    }
    this.applyHighlights();
  }

  async tryMove(from, to) {
    // Check if this is a promotion
    const piece = this.game.chess.get(from);
    const isPromotion = piece && piece.type === 'p' &&
      ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    let promotion = undefined;
    if (isPromotion) {
      promotion = await this.showPromotionDialog(piece.color);
      if (!promotion) {
        this.clearSelection();
        return;
      }
    }

    const move = this.game.makeMove(from, to, promotion);
    if (move) {
      this.lastMove = { from, to };
      this.clearSelection();
      this.render();
      this.animateSnap(to);
      this.game.onMoveMade(move);
    } else {
      this.clearSelection();
    }
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.applyHighlights();
  }

  // --- Pre-move helpers ---

  _handlePremoveClick(sq) {
    if (this.selectedSquare) {
      // Second click — set pre-move target
      const piece = this.game.chess.get(this.selectedSquare);
      if (piece && piece.color === this.game.playerColor) {
        // Check if clicking same square → cancel
        if (sq === this.selectedSquare) {
          this.clearPremove();
          this.selectedSquare = null;
          this.legalMoves = [];
          this.applyHighlights();
          return;
        }
        // Check if clicking another own piece → reselect
        const target = this.game.chess.get(sq);
        if (target && target.color === this.game.playerColor) {
          this._selectPremoveSquare(sq);
          return;
        }
        // Set the pre-move
        const isPromotion = piece.type === 'p' &&
          ((piece.color === 'w' && sq[1] === '8') || (piece.color === 'b' && sq[1] === '1'));
        this.setPremove(this.selectedSquare, sq, isPromotion ? 'q' : undefined);
        this.selectedSquare = null;
        this.legalMoves = [];
        this.applyHighlights();
      }
    } else {
      // First click — select own piece for pre-move
      this._selectPremoveSquare(sq);
    }
  }

  _selectPremoveSquare(sq) {
    const piece = this.game.chess.get(sq);
    if (piece && piece.color === this.game.playerColor) {
      this.selectedSquare = sq;
      this.legalMoves = []; // Don't show legal moves for pre-moves
      this.clearPremove();  // Clear any existing pre-move
      this.applyHighlights();
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
      this.applyHighlights();
    }
  }

  setPremove(from, to, promotion) {
    this.premove = { from, to, promotion };
    this.applyHighlights();
  }

  clearPremove() {
    this.premove = null;
    this.applyHighlights();
  }

  showPromotionDialog(color) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('promotion-dialog');
      const pieces = dialog.querySelectorAll('.promotion-piece');
      const handlers = [];

      const cleanup = () => {
        pieces.forEach((btn, i) => btn.removeEventListener('click', handlers[i]));
        dialog.removeEventListener('click', overlayHandler);
        document.removeEventListener('keydown', escHandler);
        hide(dialog);
      };

      pieces.forEach((btn, i) => {
        const pieceType = btn.dataset.piece;
        const img = btn.querySelector('img');
        img.src = pieceImagePath({ color, type: pieceType });

        const handler = () => {
          cleanup();
          resolve(pieceType);
        };
        handlers[i] = handler;
        btn.addEventListener('click', handler);
      });

      const overlayHandler = (e) => {
        if (e.target === dialog.parentElement) {
          cleanup();
          resolve(null);
        }
      };
      dialog.parentElement.addEventListener('click', overlayHandler);

      const escHandler = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      };
      document.addEventListener('keydown', escHandler);

      show(dialog);
    });
  }

  setupDragAndDrop() {
    let dragImg = null;
    let startSquare = null;
    let startX = 0, startY = 0;
    let dragStarted = false;
    const DRAG_THRESHOLD = 10;

    // Clean up any active drag state
    const cleanupDrag = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      // Restore opacity on any piece that was hidden during drag
      if (startSquare && dragStarted) {
        const sq = this.squares[startSquare];
        const img = sq?.querySelector('.piece');
        if (img) img.style.opacity = '';
      }
      if (dragImg) {
        dragImg.remove();
        dragImg = null;
      }
      // Remove any stale drag elements that might be stuck
      document.querySelectorAll('.piece.dragging').forEach(el => el.remove());
      startSquare = null;
      dragStarted = false;
    };

    const onPointerDown = (e) => {
      if (!this.interactive && !this.premoveAllowed) return;

      // Always clean up any previous drag first
      cleanupDrag();

      const squareDiv = e.target.closest('.square');
      if (!squareDiv) return;

      const sq = squareDiv.dataset.square;
      const piece = this.game.chess.get(sq);

      // Pre-move drag: allow dragging own pieces while engine thinks
      if (!this.interactive && this.premoveAllowed) {
        if (!piece || piece.color !== this.game.playerColor) return;
        this._selectPremoveSquare(sq);
      } else {
        if (!piece || piece.color !== this.game.chess.turn() || !this.game.canPlayerMove(piece.color)) return;
        // Select the square to show legal moves
        this.selectSquare(sq);
      }

      const pieceImg = squareDiv.querySelector('.piece');
      if (!pieceImg) return;

      e.preventDefault();
      startSquare = sq;
      startX = e.clientX;
      startY = e.clientY;
      dragStarted = false;

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
    };

    const onPointerMove = (e) => {
      if (!startSquare) return;

      // Check threshold before starting drag
      if (!dragStarted) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

        // Threshold met — create drag image
        dragStarted = true;
        const squareDiv = this.squares[startSquare];
        const pieceImg = squareDiv?.querySelector('.piece');
        if (!pieceImg) return;

        dragImg = pieceImg.cloneNode(true);
        dragImg.classList.add('dragging');
        document.body.appendChild(dragImg);
        pieceImg.style.opacity = '0';
      }

      if (!dragImg) return;
      const size = parseFloat(getComputedStyle(dragImg).width);
      const isTouch = e.pointerType === 'touch';
      const offsetY = isTouch ? size * 0.6 : size / 2;
      dragImg.style.left = (e.clientX - size / 2) + 'px';
      dragImg.style.top = (e.clientY - offsetY) + 'px';
    };

    const onPointerUp = (e) => {
      const savedStart = startSquare;
      const wasDrag = dragStarted;
      cleanupDrag();

      // If drag didn't start (threshold not met), treat as click — square selection handled by click handler
      if (!wasDrag) return;

      // Find target square
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const squareDiv = target?.closest('.square');

      if (squareDiv && savedStart) {
        const toSq = squareDiv.dataset.square;
        if (toSq !== savedStart) {
          // Pre-move drag drop
          if (!this.interactive && this.premoveAllowed) {
            const piece = this.game.chess.get(savedStart);
            if (piece && piece.color === this.game.playerColor) {
              const isPromotion = piece.type === 'p' &&
                ((piece.color === 'w' && toSq[1] === '8') || (piece.color === 'b' && toSq[1] === '1'));
              this.setPremove(savedStart, toSq, isPromotion ? 'q' : undefined);
              this.selectedSquare = null;
              this.legalMoves = [];
              this.render();
              return;
            }
          }
          // Normal move
          const legalMove = this.legalMoves.find(m => m.to === toSq);
          if (legalMove) {
            this.tryMove(savedStart, toSq);
            return;
          }
        }
      }

      // If no valid drop, re-render to restore piece
      this.render();
    };

    const onPointerCancel = () => {
      cleanupDrag();
      this.render();
    };

    this.container.addEventListener('pointerdown', onPointerDown);

    // Safety: clean up if page loses visibility during drag
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && dragImg) {
        cleanupDrag();
        this.render();
      }
    });
  }

  flip() {
    this.flipped = !this.flipped;
    this.render();
    this.renderCoordinates();
  }

  setFlipped(flipped) {
    this.flipped = flipped;
    this.render();
    this.renderCoordinates();
  }

  update() {
    this.render();
  }

  setInteractive(interactive) {
    this.interactive = interactive;
    // When board becomes interactive again, pre-move mode ends
    if (interactive) {
      this.premoveAllowed = false;
    }
  }

  setPremoveAllowed(allowed) {
    this.premoveAllowed = allowed;
  }

  setLastMove(move) {
    if (move) {
      this.lastMove = { from: move.from, to: move.to };
    } else {
      this.lastMove = null;
    }
  }

  /**
   * Animate a piece from one square to another.
   * Returns a Promise that resolves after the animation completes.
   * @param {string} from - source square
   * @param {string} to - target square
   * @param {object} options - { duration: ms, capture: boolean }
   */
  animateMove(from, to, options = {}) {
    const duration = options.duration || 250;
    const isCapture = options.capture || false;

    return new Promise((resolve) => {
      const fromDiv = this.squares[from];
      const toDiv = this.squares[to];
      if (!fromDiv || !toDiv) { resolve(); return; }

      const pieceImg = fromDiv.querySelector('.piece');
      if (!pieceImg) { resolve(); return; }

      // Fade captured piece on target square
      const capturedImg = toDiv.querySelector('.piece');
      if (isCapture && capturedImg) {
        capturedImg.style.transition = `opacity ${duration}ms ease`;
        capturedImg.style.opacity = '0';
      }

      const fromRect = fromDiv.getBoundingClientRect();
      const toRect = toDiv.getBoundingClientRect();
      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;

      pieceImg.style.willChange = 'transform';
      pieceImg.style.transition = `transform ${duration}ms ease`;
      pieceImg.style.transform = `translate(${dx}px, ${dy}px)`;
      pieceImg.style.zIndex = '10';

      setTimeout(() => {
        pieceImg.style.transition = '';
        pieceImg.style.transform = '';
        pieceImg.style.zIndex = '';
        pieceImg.style.willChange = '';
        if (isCapture && capturedImg) {
          capturedImg.style.transition = '';
          capturedImg.style.opacity = '';
        }
        resolve();
      }, duration + 20);
    });
  }

  /**
   * Subtle scale pulse when a piece lands after user drop.
   */
  animateSnap(square, duration = 100) {
    const div = this.squares[square];
    if (!div) return;
    const img = div.querySelector('.piece');
    if (!img) return;
    img.style.willChange = 'transform';
    img.style.transition = `transform ${duration}ms ease-out`;
    img.style.transform = 'scale(1.05)';
    setTimeout(() => {
      img.style.transition = `transform ${duration}ms ease-in`;
      img.style.transform = 'scale(1)';
      setTimeout(() => {
        img.style.transition = '';
        img.style.transform = '';
        img.style.willChange = '';
      }, duration + 10);
    }, duration);
  }

  /**
   * Flash a square with a CSS class for visual feedback.
   * @param {string} square - e.g. 'e4'
   * @param {string} cssClass - e.g. 'puzzle-correct' or 'puzzle-wrong'
   */
  flashSquare(square, cssClass) {
    const div = this.squares[square];
    if (!div) return;
    div.classList.remove(cssClass);
    // Force reflow to restart animation
    void div.offsetWidth;
    div.classList.add(cssClass);
    setTimeout(() => div.classList.remove(cssClass), 700);
  }

  /**
   * Clear puzzle hint highlights from all squares.
   */
  clearHints() {
    Object.values(this.squares).forEach(div => {
      div.classList.remove('puzzle-hint');
    });
  }

  /**
   * Draw an arrow on the board from one square to another.
   * @param {string} from - e.g. 'e2'
   * @param {string} to - e.g. 'e4'
   * @param {string} color - CSS color, default green
   * @param {number} opacity - 0-1
   */
  drawArrow(from, to, color = 'rgba(76,175,80,0.8)', opacity = 0.8) {
    let svg = this.container.querySelector('.board-arrows');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'board-arrows');
      svg.setAttribute('viewBox', '0 0 800 800');
      // Arrowhead marker
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
      this.container.appendChild(svg);
    }

    const sqSize = 100; // viewBox is 800x800 = 8x100
    const fc = squareToCoords(from);
    const tc = squareToCoords(to);

    const fx = this.flipped ? (7 - fc.col) * sqSize + sqSize / 2 : fc.col * sqSize + sqSize / 2;
    const fy = this.flipped ? (7 - fc.row) * sqSize + sqSize / 2 : fc.row * sqSize + sqSize / 2;
    const tx = this.flipped ? (7 - tc.col) * sqSize + sqSize / 2 : tc.col * sqSize + sqSize / 2;
    const ty = this.flipped ? (7 - tc.row) * sqSize + sqSize / 2 : tc.row * sqSize + sqSize / 2;

    // Unique marker per color
    const markerId = 'arrowhead-' + color.replace(/[^a-zA-Z0-9]/g, '');
    let defs = svg.querySelector('defs');
    if (!defs.querySelector('#' + markerId)) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', markerId);
      marker.setAttribute('markerWidth', '12');
      marker.setAttribute('markerHeight', '12');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '6');
      marker.setAttribute('orient', 'auto');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0,0 L12,6 L0,12 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs.appendChild(marker);
    }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fx);
    line.setAttribute('y1', fy);
    line.setAttribute('x2', tx);
    line.setAttribute('y2', ty);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '14');
    line.setAttribute('opacity', opacity);
    line.setAttribute('marker-end', `url(#${markerId})`);
    svg.appendChild(line);
  }

  /** Clear all arrows from the board */
  clearArrows() {
    const svg = this.container.querySelector('.board-arrows');
    if (svg) svg.remove();
  }

  /** Highlight a square with an analysis class */
  setAnalysisHighlight(square, classification) {
    const div = this.squares[square];
    if (!div) return;
    div.classList.add('analysis-' + classification);
  }

  /** Clear all analysis highlights */
  clearAnalysisHighlights() {
    Object.values(this.squares).forEach(div => {
      div.classList.remove('analysis-best', 'analysis-blunder', 'analysis-mistake', 'analysis-inaccuracy');
    });
  }

  // === Feature 9: Right-click arrow annotations ===

  setupRightClickArrows() {
    // Prevent context menu on the board
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    this.container.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) return; // right-click only
      e.preventDefault();
      const sq = e.target.closest('.square')?.dataset.square;
      if (!sq) return;
      this._arrowStart = sq;
    });

    this.container.addEventListener('pointerup', (e) => {
      if (e.button !== 2 || !this._arrowStart) return;
      e.preventDefault();
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const sq = target?.closest('.square')?.dataset.square;
      if (!sq) { this._arrowStart = null; return; }

      // Determine color: default green, +Shift red, +Ctrl yellow, +Alt blue
      let color = 'rgba(76,175,80,0.8)';
      if (e.shiftKey) color = 'rgba(244,67,54,0.8)';
      else if (e.ctrlKey || e.metaKey) color = 'rgba(255,235,59,0.8)';
      else if (e.altKey) color = 'rgba(33,150,243,0.8)';

      if (sq === this._arrowStart) {
        // Same square: if shift held, toggle highlight; otherwise clear all
        if (e.shiftKey) {
          this._toggleUserHighlight(sq, color);
        } else {
          this._userArrows = [];
          this._userHighlights = [];
        }
      } else {
        // Different square: add arrow
        // Remove existing arrow with same from/to
        this._userArrows = this._userArrows.filter(a => !(a.from === this._arrowStart && a.to === sq));
        this._userArrows.push({ from: this._arrowStart, to: sq, color });
      }

      this._arrowStart = null;
      this._savePositionArrows();
      this._renderUserArrows();
    });
  }

  _toggleUserHighlight(sq, color) {
    const idx = this._userHighlights.findIndex(h => h.square === sq);
    if (idx >= 0) {
      this._userHighlights.splice(idx, 1);
    } else {
      this._userHighlights.push({ square: sq, color });
    }
  }

  _renderUserArrows() {
    // Clear existing user arrows SVG
    const existing = this.container.querySelector('.board-user-arrows');
    if (existing) existing.remove();

    // Clear existing highlight overlays
    this.container.querySelectorAll('.square-highlight').forEach(el => el.remove());

    if (this._userArrows.length === 0 && this._userHighlights.length === 0) return;

    // Draw highlights
    for (const h of this._userHighlights) {
      const div = this.squares[h.square];
      if (!div) continue;
      const overlay = document.createElement('div');
      overlay.className = 'square-highlight';
      overlay.style.background = h.color;
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      div.appendChild(overlay);
    }

    // Draw arrows
    if (this._userArrows.length > 0) {
      for (const a of this._userArrows) {
        this.drawArrow(a.from, a.to, a.color, 0.8);
      }
      // Tag the SVG so we can identify user arrows
      const svg = this.container.querySelector('.board-arrows');
      if (svg) svg.classList.add('board-user-arrows');
    }
  }

  _savePositionArrows() {
    const fen = this.game.chess.fen();
    if (this._userArrows.length === 0 && this._userHighlights.length === 0) {
      delete this._positionArrows[fen];
    } else {
      this._positionArrows[fen] = {
        arrows: [...this._userArrows],
        highlights: [...this._userHighlights]
      };
    }
  }

  loadPositionArrows() {
    const fen = this.game.chess.fen();
    const saved = this._positionArrows[fen];
    if (saved) {
      this._userArrows = [...saved.arrows];
      this._userHighlights = [...saved.highlights];
    } else {
      this._userArrows = [];
      this._userHighlights = [];
    }
    this._renderUserArrows();
  }

  clearUserArrows() {
    this._userArrows = [];
    this._userHighlights = [];
    this._renderUserArrows();
  }
}
