// Game state management, turns, timers

import { formatTime } from './utils.js';

export class Game {
  constructor() {
    this.chess = new Chess();
    this.mode = 'local';        // 'local' or 'engine'
    this.playerColor = 'w';     // Player's color when vs engine
    this.difficulty = 10;
    this.timeControl = 0;       // seconds, 0 = no timer
    this.timers = { w: 0, b: 0 };
    this.timerInterval = null;
    this.gameOver = false;
    this.replayMode = false;

    // History for undo/redo
    this.history = [];       // Array of FEN strings
    this.moveHistory = [];   // Array of move objects
    this.currentMoveIndex = -1;
    this.fens = [this.chess.fen()]; // FEN at each position

    this.botId = null;

    // Callbacks
    this.onStatusChange = null;
    this.onTimerUpdate = null;
    this.onMoveMade = null;
    this.onGameOver = null;
    this.onEngineMove = null;
  }

  newGame(options = {}) {
    this.mode = options.mode || 'local';
    this.playerColor = options.color || 'w';
    this.difficulty = options.difficulty || 10;
    this.botId = options.botId || null;
    this.timeControl = options.time || 0;
    this.gameOver = false;
    this.replayMode = false;

    this.chess.reset();
    this.moveHistory = [];
    this.currentMoveIndex = -1;
    this.fens = [this.chess.fen()];

    // Timers
    this.stopTimer();
    if (this.timeControl > 0) {
      this.timers = { w: this.timeControl, b: this.timeControl };
    } else {
      this.timers = { w: 0, b: 0 };
    }

    this.updateStatus();
  }

  canPlayerMove(color) {
    if (this.gameOver || this.replayMode) return false;
    if (this.mode === 'engine') {
      return color === this.playerColor;
    }
    return true; // local mode: both can move
  }

  makeMove(from, to, promotion) {
    if (this.gameOver) return null;

    try {
      const move = this.chess.move({ from, to, promotion: promotion || undefined });
      if (move) {
        // Truncate future if we undid some moves
        if (this.currentMoveIndex < this.moveHistory.length - 1) {
          this.moveHistory = this.moveHistory.slice(0, this.currentMoveIndex + 1);
          this.fens = this.fens.slice(0, this.currentMoveIndex + 2);
        }

        this.moveHistory.push(move);
        this.currentMoveIndex = this.moveHistory.length - 1;
        this.fens.push(this.chess.fen());

        this.checkGameOver();
        this.updateStatus();
        this.handleTimer();

        return move;
      }
    } catch (e) {
      console.error('Invalid move:', e);
    }
    return null;
  }

  /**
   * Make an engine move (called when Stockfish returns best move)
   */
  makeEngineMove(from, to, promotion) {
    return this.makeMove(from, to, promotion);
  }

  undo() {
    if (this.currentMoveIndex < 0 || this.gameOver) return false;

    // In engine mode, undo both the engine's and player's last move
    let steps = 1;
    if (this.mode === 'engine' && this.currentMoveIndex >= 1) {
      steps = 2;
    }

    const targetIndex = Math.max(-1, this.currentMoveIndex - steps);
    this.goToMove(targetIndex);
    return true;
  }

  redo() {
    if (this.currentMoveIndex >= this.moveHistory.length - 1) return false;

    // In engine mode, redo both moves
    let steps = 1;
    if (this.mode === 'engine' && this.currentMoveIndex + 2 <= this.moveHistory.length - 1) {
      steps = 2;
    }

    const targetIndex = Math.min(this.moveHistory.length - 1, this.currentMoveIndex + steps);
    this.goToMove(targetIndex);
    return true;
  }

  /**
   * Navigate to a specific move index (-1 = start)
   */
  goToMove(index) {
    // Rebuild position from start
    this.chess.reset();
    for (let i = 0; i <= index && i < this.moveHistory.length; i++) {
      this.chess.move(this.moveHistory[i].san);
    }
    this.currentMoveIndex = Math.min(index, this.moveHistory.length - 1);
    this.updateStatus();
  }

  goToStart() {
    this.goToMove(-1);
  }

  goToEnd() {
    this.goToMove(this.moveHistory.length - 1);
  }

  checkGameOver() {
    if (this.chess.game_over()) {
      this.gameOver = true;
      this.stopTimer();
    }
  }

  getGameResult() {
    if (this.chess.in_checkmate()) {
      const winner = this.chess.turn() === 'w' ? 'Black' : 'White';
      return { result: this.chess.turn() === 'w' ? '0-1' : '1-0', message: `Checkmate! ${winner} wins.` };
    }
    if (this.chess.in_stalemate()) {
      return { result: '1/2-1/2', message: 'Stalemate! Draw.' };
    }
    if (this.chess.in_threefold_repetition()) {
      return { result: '1/2-1/2', message: 'Draw by threefold repetition.' };
    }
    if (this.chess.insufficient_material()) {
      return { result: '1/2-1/2', message: 'Draw by insufficient material.' };
    }
    if (this.chess.in_draw()) {
      return { result: '1/2-1/2', message: 'Draw (50-move rule).' };
    }
    return null;
  }

  updateStatus() {
    if (this.onStatusChange) {
      let status;
      if (this.gameOver) {
        const result = this.getGameResult();
        status = result ? result.message : 'Game over';
      } else if (this.replayMode) {
        status = `Replay mode - Move ${this.currentMoveIndex + 1}/${this.moveHistory.length}`;
      } else {
        const turn = this.chess.turn() === 'w' ? 'White' : 'Black';
        status = `${turn} to move`;
        if (this.chess.in_check()) {
          status += ' (Check!)';
        }
      }
      this.onStatusChange(status);
    }
  }

  // Timer management
  handleTimer() {
    if (this.timeControl <= 0) return;

    this.stopTimer();
    if (this.gameOver) return;

    this.timerInterval = setInterval(() => {
      const turn = this.chess.turn();
      this.timers[turn]--;

      if (this.timers[turn] <= 0) {
        this.timers[turn] = 0;
        this.gameOver = true;
        this.stopTimer();
        const winner = turn === 'w' ? 'Black' : 'White';
        if (this.onStatusChange) {
          this.onStatusChange(`Time's up! ${winner} wins on time.`);
        }
        if (this.onGameOver) {
          this.onGameOver({ result: turn === 'w' ? '0-1' : '1-0', message: `${winner} wins on time` });
        }
      }

      if (this.onTimerUpdate) {
        this.onTimerUpdate(this.timers);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getTimerDisplay(color) {
    if (this.timeControl <= 0) return '--:--';
    return formatTime(this.timers[color]);
  }

  /**
   * Load a game from PGN moves
   */
  loadFromMoves(moves, headers = {}) {
    this.chess.reset();
    this.moveHistory = [];
    this.currentMoveIndex = -1;
    this.fens = [this.chess.fen()];
    this.gameOver = false;
    this.replayMode = true;
    this.mode = 'local';
    this.stopTimer();

    for (const san of moves) {
      try {
        const move = this.chess.move(san);
        if (move) {
          this.moveHistory.push(move);
          this.fens.push(this.chess.fen());
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    this.currentMoveIndex = this.moveHistory.length - 1;
    this.updateStatus();
    return this.moveHistory;
  }

  /**
   * Load from PGN string
   */
  loadPGN(pgn) {
    const tempChess = new Chess();
    const loaded = tempChess.load_pgn(pgn);
    if (!loaded) return null;

    const history = tempChess.history({ verbose: true });
    const moves = history.map(m => m.san);
    return this.loadFromMoves(moves);
  }
}
