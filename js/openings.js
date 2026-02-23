// Per-GM opening book system
// Matches the current move history against a GM's preferred opening lines
// and returns a book move if found, or null to fall back to Stockfish.

export class OpeningBook {
  /**
   * Get a book move for the current position based on the GM's opening lines.
   * @param {Object} bot - The bot personality with openingLines
   * @param {Object[]} moveHistory - Array of chess.js move objects (with .san property)
   * @param {string} engineColor - 'w' or 'b'
   * @returns {string|null} SAN move from book, or null
   */
  getBookMove(bot, moveHistory, engineColor) {
    if (!bot || !bot.openingLines) return null;

    const moveCount = moveHistory.length;

    // Only use book for the first ~8 moves (16 half-moves)
    if (moveCount >= 16) return null;

    const lines = bot.openingLines;

    // Determine which set of lines to use
    if (engineColor === 'w') {
      return this._getWhiteMove(lines, moveHistory, moveCount);
    } else {
      return this._getBlackMove(lines, moveHistory, moveCount);
    }
  }

  /**
   * Get a book move when the engine plays White
   */
  _getWhiteMove(lines, moveHistory, moveCount) {
    if (!lines.white) return null;

    // Engine is White, so it plays on even-numbered moves (0, 2, 4...)
    // moveCount is the total moves played so far
    // If moveCount is even, it's White's turn
    if (moveCount % 2 !== 0) return null; // Not our turn

    const whiteMovesPlayed = []; // White's moves so far
    for (let i = 0; i < moveHistory.length; i += 2) {
      whiteMovesPlayed.push(moveHistory[i].san);
    }

    // Find matching lines: a line matches if all its moves so far
    // match the white moves already played
    const whiteIndex = whiteMovesPlayed.length; // Which white move we need next

    const candidates = [];

    for (const line of lines.white) {
      if (!line.moves || line.moves.length <= whiteIndex) continue;

      // Check that all previous white moves match this line
      let matches = true;
      for (let i = 0; i < whiteIndex && i < line.moves.length; i++) {
        if (whiteMovesPlayed[i] !== line.moves[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        candidates.push({ move: line.moves[whiteIndex], weight: line.weight || 50 });
      }
    }

    return this._weightedPick(candidates);
  }

  /**
   * Get a book move when the engine plays Black
   */
  _getBlackMove(lines, moveHistory, moveCount) {
    if (!lines.black) return null;

    // Engine is Black, plays on odd-numbered moves (1, 3, 5...)
    if (moveCount % 2 !== 1) return null; // Not our turn

    // Get White's first move to find the right response set
    const whiteFirstMove = moveHistory[0]?.san;
    if (!whiteFirstMove) return null;

    // Find the response set for White's first move
    let responseSet = null;
    for (const [key, responses] of Object.entries(lines.black)) {
      if (whiteFirstMove === key) {
        responseSet = responses;
        break;
      }
    }

    if (!responseSet) return null;

    // Calculate which black move index we need
    const blackMovesPlayed = [];
    for (let i = 1; i < moveHistory.length; i += 2) {
      blackMovesPlayed.push(moveHistory[i].san);
    }
    const blackIndex = blackMovesPlayed.length;

    const candidates = [];

    for (const line of responseSet) {
      if (!line.moves || line.moves.length <= blackIndex) continue;

      // Check that all previous black moves match this line
      let matches = true;
      for (let i = 0; i < blackIndex && i < line.moves.length; i++) {
        if (blackMovesPlayed[i] !== line.moves[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        candidates.push({ move: line.moves[blackIndex], weight: line.weight || 50 });
      }
    }

    return this._weightedPick(candidates);
  }

  /**
   * Pick a move from weighted candidates
   */
  _weightedPick(candidates) {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].move;

    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const c of candidates) {
      rand -= c.weight;
      if (rand <= 0) return c.move;
    }

    return candidates[candidates.length - 1].move;
  }
}
