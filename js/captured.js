// Captured pieces display and material advantage calculation

import { pieceImagePath } from './utils.js';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

export class CapturedPieces {
  constructor() {
    this.topEl = null;
    this.bottomEl = null;
    this.topAdvEl = null;
    this.bottomAdvEl = null;
  }

  init() {
    this.topEl = document.getElementById('captured-top');
    this.bottomEl = document.getElementById('captured-bottom');
    this.topAdvEl = document.getElementById('material-top');
    this.bottomAdvEl = document.getElementById('material-bottom');
  }

  /**
   * Update captured pieces display
   * @param {Object[]} moveHistory - Array of chess.js move objects
   * @param {number} currentMoveIndex - Current position index (-1 = start)
   * @param {boolean} flipped - Whether board is flipped
   */
  update(moveHistory, currentMoveIndex, flipped) {
    if (!this.topEl) return;

    // Collect captured pieces up to currentMoveIndex
    const captured = { w: [], b: [] }; // pieces captured BY each color

    for (let i = 0; i <= currentMoveIndex && i < moveHistory.length; i++) {
      const move = moveHistory[i];
      if (move.captured) {
        // The capturing color captures the opponent's piece
        captured[move.color].push(move.captured);
      }
    }

    // Sort pieces by value (Q, R, B, N, P)
    for (const color of ['w', 'b']) {
      captured[color].sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b));
    }

    // Calculate material advantage
    const whiteCapValue = captured.w.reduce((s, p) => s + (PIECE_VALUES[p] || 0), 0);
    const blackCapValue = captured.b.reduce((s, p) => s + (PIECE_VALUES[p] || 0), 0);
    const advantage = whiteCapValue - blackCapValue;

    // Top = black (or white if flipped), bottom = white (or black if flipped)
    const topColor = flipped ? 'w' : 'b';
    const bottomColor = flipped ? 'b' : 'w';

    // Render captured pieces (pieces captured by opponent = your lost pieces shown near you)
    // Convention: show pieces that the opponent captured near that player
    // So near the top player, show pieces captured by the bottom player
    this._renderPieces(this.topEl, captured[bottomColor], topColor);
    this._renderPieces(this.bottomEl, captured[topColor], bottomColor);

    // Material advantage display
    const topAdv = topColor === 'w' ? -advantage : advantage;
    const bottomAdv = bottomColor === 'w' ? -advantage : advantage;

    this.topAdvEl.textContent = topAdv > 0 ? `+${topAdv}` : '';
    this.bottomAdvEl.textContent = bottomAdv > 0 ? `+${bottomAdv}` : '';
  }

  /**
   * Render piece images into container
   * @param {HTMLElement} el - Container element
   * @param {string[]} pieces - Array of piece types (e.g., ['q', 'r', 'p'])
   * @param {string} color - Color of the captured pieces ('w' or 'b')
   */
  _renderPieces(el, pieces, color) {
    el.innerHTML = '';
    for (const type of pieces) {
      const img = document.createElement('img');
      img.src = pieceImagePath({ type, color });
      img.alt = type;
      img.className = 'captured-piece-img';
      el.appendChild(img);
    }
  }

  clear() {
    if (this.topEl) this.topEl.innerHTML = '';
    if (this.bottomEl) this.bottomEl.innerHTML = '';
    if (this.topAdvEl) this.topAdvEl.textContent = '';
    if (this.bottomAdvEl) this.bottomAdvEl.textContent = '';
  }
}
