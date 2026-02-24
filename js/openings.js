// Opening mainlines — maps ECO codes to SAN move arrays for training mode.
// Each entry is a standard mainline of 5-10 moves (half-moves interleaved: W B W B ...).
export const OPENING_MAINLINES = {
  // === A — Flank Openings ===
  'A10': ['c4', 'e5'],                                                        // English Opening
  'A60': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6'], // Modern Benoni

  // === B — Semi-Open Games ===
  'B02': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'Bg4'],              // Alekhine's Defence
  'B10': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],            // Caro-Kann
  'B17': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Nf3', 'Ngf6', 'Nxf6+', 'Nxf6'], // Caro-Kann Karpov Var.
  'B30': ['e4', 'c5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'cxd4', 'Nxd4', 'e5'], // Sicilian Sveshnikov
  'B80': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'], // Sicilian Scheveningen
  'B90': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], // Sicilian Najdorf

  // === C — Open Games ===
  'C00': ['e4', 'e6', 'd4', 'd5'],                                            // French Defense
  'C15': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3'], // French Winawer
  'C25': ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],                                    // Vienna Game
  'C30': ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4'],   // King's Gambit
  'C41': ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nbd7'],             // Philidor Defense
  'C42': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5'], // Petroff Defense
  'C44': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'],                   // Scotch Game
  'C47': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nxd4'],    // Four Knights
  'C51': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5'], // Evans Gambit
  'C60': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], // Ruy Lopez
  'C62': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6'],                            // Ruy Lopez Steinitz Def.
  'C65': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5'], // Ruy Lopez Berlin
  'C84': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'], // Ruy Lopez Closed

  // === D — Closed/Queen's Pawn Games ===
  'D00': ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5'],               // London System
  'D06': ['d4', 'd5', 'c4'],                                                  // Queen's Gambit
  'D10': ['d4', 'd5', 'c4', 'c6', 'Nc3', 'Nf6', 'Nf3', 'dxc4', 'a4', 'Bf5'], // Slav Defense
  'D30': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7'], // QGD
  'D32': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5', 'cxd5', 'exd5', 'Nf3', 'Nc6'], // Tarrasch Defense
  'D69': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5'], // QGD Capablanca
  'D70': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7'], // Grunfeld

  // === E — Indian Defenses ===
  'E00': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O'], // Catalan Opening
  'E12': ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7'], // Queen's Indian
  'E20': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5'], // Nimzo-Indian
  'E60': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'], // King's Indian
};

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
