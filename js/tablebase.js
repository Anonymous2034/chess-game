// Tablebase endgame lookup via Lichess Syzygy API

export class TablebaseLookup {
  constructor() {
    this._cache = new Map();
    this.enabled = localStorage.getItem('chess_tablebase') !== 'false';
    this.onResult = null;
    // True when the most recent query() failed because we're offline / couldn't
    // reach the server. Lets the caller show a throttled offline notice.
    this.lastResultOffline = false;
  }

  setEnabled(v) {
    this.enabled = v;
    localStorage.setItem('chess_tablebase', v ? 'true' : 'false');
  }

  getPieceCount(fen) {
    const placement = fen.split(' ')[0];
    let count = 0;
    for (const ch of placement) {
      if (/[pnbrqkPNBRQK]/.test(ch)) count++;
    }
    return count;
  }

  shouldQuery(fen) {
    return this.enabled && this.getPieceCount(fen) <= 7;
  }

  async query(fen) {
    if (this._cache.has(fen)) return this._cache.get(fen);

    // Offline pre-check — skip the network round-trip entirely.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.lastResultOffline = true;
      return null;
    }

    try {
      const resp = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`);
      // A non-ok response (e.g. position not found) is a normal "no data" case,
      // not an offline failure.
      if (!resp.ok) { this.lastResultOffline = false; return null; }
      const data = await resp.json();
      const result = this._parseResponse(data, fen);
      this.lastResultOffline = false;
      this._cache.set(fen, result);
      // Limit cache size
      if (this._cache.size > 500) {
        const first = this._cache.keys().next().value;
        this._cache.delete(first);
      }
      return result;
    } catch (err) {
      // Network/DNS errors surface as TypeError; treat those as offline.
      this.lastResultOffline = (err instanceof TypeError);
      return null;
    }
  }

  _parseResponse(data, fen) {
    const category = data.category || 'unknown'; // win, loss, draw, cursed-win, blessed-loss
    const dtz = data.dtz;
    const dtm = data.dtm;

    let bestMove = null;
    let bestMoveSan = null;

    if (data.moves && data.moves.length > 0) {
      const best = data.moves[0];
      bestMove = best.uci;
      bestMoveSan = best.san;

      // If san not provided, try to convert
      if (!bestMoveSan && bestMove) {
        try {
          const chess = new Chess(fen);
          const move = chess.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), promotion: bestMove[4] });
          if (move) bestMoveSan = move.san;
        } catch { /* ignore */ }
      }
    }

    // Normalize category
    let normalizedCategory;
    if (category === 'win' || category === 'cursed-win') normalizedCategory = 'WIN';
    else if (category === 'loss' || category === 'blessed-loss') normalizedCategory = 'LOSS';
    else normalizedCategory = 'DRAW';

    return {
      category: normalizedCategory,
      rawCategory: category,
      dtz,
      dtm,
      bestMove,
      bestMoveSan,
      moves: (data.moves || []).slice(0, 5).map(m => ({
        uci: m.uci,
        san: m.san,
        dtz: m.dtz,
        dtm: m.dtm,
        category: m.category
      }))
    };
  }
}
