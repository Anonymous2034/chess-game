// Opening Repertoire Trainer — spaced repetition drilling of opening lines

export class RepertoireTrainer {
  constructor() {
    this._lines = [];
    this._load();
  }

  // --- Persistence ---
  _load() {
    try {
      const raw = localStorage.getItem('chess_repertoire');
      if (raw) this._lines = JSON.parse(raw);
    } catch { this._lines = []; }
  }

  _save() {
    localStorage.setItem('chess_repertoire', JSON.stringify(this._lines));
  }

  // --- Line management ---
  getLines() { return this._lines; }

  addLineFromMainlines(eco, color, name, moves) {
    const id = 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const line = {
      id, name: name || eco, eco, color,
      moves: moves || [],
      accuracy: 0, totalAttempts: 0, correctAttempts: 0,
      interval: 1, easeFactor: 2.5,
      nextReview: Date.now()
    };
    this._lines.push(line);
    this._save();
    return line;
  }

  addCustomLine(name, moves, color) {
    const id = 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const line = {
      id, name, eco: '', color: color || 'w',
      moves: moves || [],
      accuracy: 0, totalAttempts: 0, correctAttempts: 0,
      interval: 1, easeFactor: 2.5,
      nextReview: Date.now()
    };
    this._lines.push(line);
    this._save();
    return line;
  }

  removeLine(id) {
    this._lines = this._lines.filter(l => l.id !== id);
    this._save();
  }

  getLine(id) {
    return this._lines.find(l => l.id === id) || null;
  }

  // --- Spaced repetition (simplified SM-2) ---
  getDueLines() {
    const now = Date.now();
    return this._lines.filter(l => l.nextReview <= now);
  }

  completeDrill(lineId, wasCorrect) {
    const line = this.getLine(lineId);
    if (!line) return;

    line.totalAttempts++;
    if (wasCorrect) {
      line.correctAttempts++;
      // SM-2: increase interval
      if (line.interval === 1) line.interval = 3;
      else line.interval = Math.round(line.interval * line.easeFactor);
      line.easeFactor = Math.max(1.3, line.easeFactor + 0.1);
    } else {
      // Reset interval, decrease ease
      line.interval = 1;
      line.easeFactor = Math.max(1.3, line.easeFactor - 0.3);
    }

    line.accuracy = line.totalAttempts > 0
      ? Math.round((line.correctAttempts / line.totalAttempts) * 100) : 0;
    line.nextReview = Date.now() + line.interval * 24 * 60 * 60 * 1000;
    this._save();
  }

  // --- Drill state ---
  startDrill(lineId) {
    const line = this.getLine(lineId);
    if (!line || !line.moves.length) return null;
    return {
      lineId: line.id,
      lineName: line.name,
      color: line.color,
      moves: line.moves,
      currentMoveIndex: 0,
      errors: 0,
      completed: false
    };
  }

  // Validate the player's move at the given drill step
  validateDrillMove(drillState, san) {
    if (!drillState || drillState.completed) return { correct: false, expected: null };
    const idx = drillState.currentMoveIndex;
    if (idx >= drillState.moves.length) return { correct: false, expected: null };

    const expected = drillState.moves[idx];
    // Normalize SAN for comparison (strip +, #)
    const normalize = s => s.replace(/[+#]/g, '');
    const correct = normalize(san) === normalize(expected);

    if (correct) {
      drillState.currentMoveIndex++;
      if (drillState.currentMoveIndex >= drillState.moves.length) {
        drillState.completed = true;
      }
    } else {
      drillState.errors++;
    }

    return { correct, expected };
  }

  // Get the next opponent move (the move after the player's, for auto-play)
  getNextOpponentMove(drillState) {
    if (!drillState || drillState.completed) return null;
    const idx = drillState.currentMoveIndex;
    if (idx >= drillState.moves.length) return null;
    return drillState.moves[idx];
  }

  // --- Stats ---
  getStats() {
    const total = this._lines.length;
    const due = this.getDueLines().length;
    const totalAttempts = this._lines.reduce((s, l) => s + l.totalAttempts, 0);
    const totalCorrect = this._lines.reduce((s, l) => s + l.correctAttempts, 0);
    const avgAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    return { total, due, totalAttempts, totalCorrect, avgAccuracy };
  }
}
