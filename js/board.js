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

    // Promotion state
    this.pendingPromotion = null;
    this.promotionResolve = null;

    this.squares = {};
    this.render();
    this.setupDragAndDrop();
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
      sq.classList.remove('highlighted', 'selected', 'check');
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

    // Legal move indicators
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
  }

  onSquareClick(sq) {
    if (!this.interactive) return;

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

    // Clean up any active drag state
    const cleanupDrag = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      if (dragImg) {
        dragImg.remove();
        dragImg = null;
      }
      // Remove any stale drag elements that might be stuck
      document.querySelectorAll('.piece.dragging').forEach(el => el.remove());
      startSquare = null;
    };

    const onPointerDown = (e) => {
      if (!this.interactive) return;

      // Always clean up any previous drag first
      cleanupDrag();

      const squareDiv = e.target.closest('.square');
      if (!squareDiv) return;

      const sq = squareDiv.dataset.square;
      const piece = this.game.chess.get(sq);
      if (!piece || piece.color !== this.game.chess.turn() || !this.game.canPlayerMove(piece.color)) return;

      // Select the square to show legal moves
      this.selectSquare(sq);

      const pieceImg = squareDiv.querySelector('.piece');
      if (!pieceImg) return;

      e.preventDefault();
      startSquare = sq;

      // Create drag image
      dragImg = pieceImg.cloneNode(true);
      dragImg.classList.add('dragging');
      document.body.appendChild(dragImg);

      const rect = pieceImg.getBoundingClientRect();
      dragImg.style.left = (e.clientX - rect.width / 2) + 'px';
      dragImg.style.top = (e.clientY - rect.height / 2) + 'px';

      // Hide original piece
      pieceImg.style.opacity = '0';

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
    };

    const onPointerMove = (e) => {
      if (!dragImg) return;
      const size = parseFloat(getComputedStyle(dragImg).width);
      dragImg.style.left = (e.clientX - size / 2) + 'px';
      dragImg.style.top = (e.clientY - size / 2) + 'px';
    };

    const onPointerUp = (e) => {
      const savedStart = startSquare;
      cleanupDrag();

      // Find target square
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const squareDiv = target?.closest('.square');

      if (squareDiv && savedStart) {
        const toSq = squareDiv.dataset.square;
        if (toSq !== savedStart) {
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
  }

  setLastMove(move) {
    if (move) {
      this.lastMove = { from: move.from, to: move.to };
    } else {
      this.lastMove = null;
    }
  }
}
