// Shared helper utilities

/**
 * Convert algebraic square (e.g. "e4") to board indices {row, col}
 * Row 0 = rank 8 (top), Row 7 = rank 1 (bottom)
 */
export function squareToCoords(sq) {
  return {
    col: sq.charCodeAt(0) - 97, // a=0, h=7
    row: 8 - parseInt(sq[1])     // 8=0, 1=7
  };
}

/**
 * Convert board indices to algebraic square
 */
export function coordsToSquare(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

/**
 * Format seconds to mm:ss display
 */
export function formatTime(seconds) {
  if (seconds == null || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Piece theme base path (updated by ThemeManager)
 */
let _pieceBasePath = 'assets/pieces/standard';

export function setPieceBasePath(basePath) {
  _pieceBasePath = basePath;
}

/**
 * Get piece image path
 */
export function pieceImagePath(piece) {
  // piece object from chess.js: { type: 'p', color: 'w' }
  const color = piece.color;
  const type = piece.type.toUpperCase();
  return `${_pieceBasePath}/${color}${type}.svg`;
}

/**
 * Deep clone a simple object
 */
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Show/hide element
 */
export function show(el) {
  el.classList.remove('hidden');
}

export function hide(el) {
  el.classList.add('hidden');
}

/**
 * Debounce function
 */
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
