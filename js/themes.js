// Theme manager — board and piece theme switching

const STORAGE_KEY = 'chess_theme';

export const BOARD_THEMES = [
  {
    id: 'classic',
    name: 'Classic',
    light: '#f0d9b5',
    dark: '#b58863',
    highlightLight: '#cdd26a',
    highlightDark: '#aaa23a',
    selectedLight: '#829ee0',
    selectedDark: '#6282c7'
  },
  {
    id: 'blue',
    name: 'Blue',
    light: '#dee3e6',
    dark: '#8ca2ad',
    highlightLight: '#a8cce0',
    highlightDark: '#7ba3b5',
    selectedLight: '#92b4d0',
    selectedDark: '#6890ab'
  },
  {
    id: 'green',
    name: 'Green',
    light: '#ffffdd',
    dark: '#86a666',
    highlightLight: '#e6e67a',
    highlightDark: '#aabb55',
    selectedLight: '#b4cce0',
    selectedDark: '#7fa8c0'
  },
  {
    id: 'brown',
    name: 'Brown',
    light: '#eeded0',
    dark: '#927262',
    highlightLight: '#d4c87a',
    highlightDark: '#a89060',
    selectedLight: '#b0a8d0',
    selectedDark: '#8878a8'
  }
];

export const PIECE_THEMES = [
  { id: 'standard', name: 'Standard' },
  { id: 'neo', name: 'Neo' },
  { id: 'medieval', name: 'Medieval' },
  { id: 'pixel', name: 'Pixel' }
];

export class ThemeManager {
  constructor() {
    this.boardTheme = 'classic';
    this.pieceTheme = 'standard';
    this.onPieceThemeChange = null; // callback to re-render board
    this._load();
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        if (saved.board && BOARD_THEMES.find(t => t.id === saved.board)) {
          this.boardTheme = saved.board;
        }
        if (saved.pieces && PIECE_THEMES.find(t => t.id === saved.pieces)) {
          this.pieceTheme = saved.pieces;
        }
      }
    } catch {}
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        board: this.boardTheme,
        pieces: this.pieceTheme
      }));
    } catch {}
  }

  /** Apply the current board theme by setting CSS variables on :root */
  applyBoardTheme(themeId) {
    if (themeId) this.boardTheme = themeId;
    const theme = BOARD_THEMES.find(t => t.id === this.boardTheme) || BOARD_THEMES[0];
    const root = document.documentElement;

    root.style.setProperty('--light-square', theme.light);
    root.style.setProperty('--dark-square', theme.dark);

    // Update highlight/selected colors via data attribute so CSS can reference them
    root.style.setProperty('--highlight-light', theme.highlightLight);
    root.style.setProperty('--highlight-dark', theme.highlightDark);
    root.style.setProperty('--selected-light', theme.selectedLight);
    root.style.setProperty('--selected-dark', theme.selectedDark);

    this._save();
  }

  /** Get the piece image base path for the current piece theme */
  getPieceBasePath() {
    return `assets/pieces/${this.pieceTheme}`;
  }

  /** Set piece theme and re-render */
  setPieceTheme(themeId) {
    if (!PIECE_THEMES.find(t => t.id === themeId)) return;
    this.pieceTheme = themeId;
    this._save();
    if (this.onPieceThemeChange) this.onPieceThemeChange();
  }

  /** Apply saved themes on init */
  apply() {
    this.applyBoardTheme();
  }
}
