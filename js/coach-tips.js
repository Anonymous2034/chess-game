// Tier 1: Stockfish-powered coaching tips (always free)
// Provides pattern-based advice after analyzing positions

export class CoachTips {
  constructor(engine) {
    this.engine = engine;
  }

  /**
   * Generate a coaching tip after a player's move
   * @param {Object} params
   * @param {string} params.fen - Current position FEN
   * @param {string} params.prevFen - Position before the move
   * @param {Object} params.move - chess.js move object
   * @param {Object[]} params.moveHistory - Full move history
   * @param {Object} params.prevAnalysis - Analysis of position before move (optional)
   * @returns {Promise<Object|null>} Tip object { type, message, severity }
   */
  async generateTip(params) {
    if (!this.engine || !this.engine.ready) return null;

    const { fen, prevFen, move, moveHistory } = params;
    const moveNum = moveHistory.length;

    // Analyze current position (after player's move)
    const afterEval = await this.engine.analyzePosition(fen, 12);

    // If we have the previous position, compare evaluations
    let beforeEval = params.prevAnalysis;
    if (!beforeEval && prevFen) {
      beforeEval = await this.engine.analyzePosition(prevFen, 12);
    }

    const tips = [];

    // 1. Blunder detection
    if (beforeEval && afterEval) {
      const isWhite = move.color === 'w';
      const evalBefore = isWhite ? beforeEval.score : -beforeEval.score;
      const evalAfter = isWhite ? -afterEval.score : afterEval.score;
      const swing = evalBefore - evalAfter;

      if (swing > 200) {
        tips.push({
          type: 'blunder',
          severity: 'error',
          message: `That move lost significant material advantage (${(swing/100).toFixed(1)} pawns). Consider taking more time to check for tactics before moving.`
        });
      } else if (swing > 100) {
        tips.push({
          type: 'mistake',
          severity: 'warning',
          message: `That move wasn't the strongest. You lost about ${(swing/100).toFixed(1)} pawns of advantage. Look for more active moves.`
        });
      } else if (swing < -150) {
        tips.push({
          type: 'opponent_mistake',
          severity: 'opportunity',
          message: `Your opponent made an inaccuracy! Look for tactical opportunities to exploit their mistake.`
        });
      }
    }

    // 2. King safety — not castled after move 8
    if (moveNum >= 16) { // move 8+ for the player's color
      const playerColor = move.color;
      const hasCastled = moveHistory.some(m => m.color === playerColor && (m.flags.includes('k') || m.flags.includes('q')));
      if (!hasCastled) {
        const kingInCenter = this._isKingInCenter(fen, playerColor);
        if (kingInCenter) {
          tips.push({
            type: 'king_safety',
            severity: 'suggestion',
            message: `Your king is still in the center. Consider castling to improve king safety and activate your rook.`
          });
        }
      }
    }

    // 3. Development — check if pieces are still on starting squares
    if (moveNum < 20) {
      const devTip = this._checkDevelopment(fen, move.color, moveNum);
      if (devTip) tips.push(devTip);
    }

    // 4. Center control
    if (moveNum <= 10) {
      const centerTip = this._checkCenterControl(fen, move.color);
      if (centerTip) tips.push(centerTip);
    }

    // 5. Good move recognition
    if (beforeEval && afterEval) {
      const isWhite = move.color === 'w';
      const evalBefore = isWhite ? beforeEval.score : -beforeEval.score;
      const evalAfter = isWhite ? -afterEval.score : afterEval.score;
      const gain = evalAfter - evalBefore;

      if (gain > 100) {
        tips.push({
          type: 'great_move',
          severity: 'praise',
          message: `Excellent move! You gained a significant advantage.`
        });
      } else if (move.captured && gain >= 0) {
        tips.push({
          type: 'good_capture',
          severity: 'praise',
          message: `Good capture! You maintained or improved your position.`
        });
      }
    }

    // Return the most important tip
    if (tips.length === 0) return null;

    // Priority: error > warning > opportunity > suggestion > praise
    const priority = { error: 0, warning: 1, opportunity: 2, suggestion: 3, praise: 4 };
    tips.sort((a, b) => priority[a.severity] - priority[b.severity]);

    return tips[0];
  }

  _isKingInCenter(fen, color) {
    const ranks = fen.split(' ')[0].split('/');
    for (let r = 0; r < 8; r++) {
      let col = 0;
      for (const ch of ranks[r]) {
        if (ch >= '1' && ch <= '8') {
          col += parseInt(ch);
        } else {
          const isTarget = (color === 'w' && ch === 'K') || (color === 'b' && ch === 'k');
          if (isTarget && col >= 2 && col <= 5) {
            return true;
          }
          col++;
        }
      }
    }
    return false;
  }

  _checkDevelopment(fen, color, moveNum) {
    const board = fen.split(' ')[0];
    const ranks = board.split('/');

    if (color === 'w') {
      const backRank = ranks[7]; // rank 1
      let undeveloped = 0;
      // Check if knights and bishops are still on starting squares
      if (backRank.includes('N')) undeveloped++;
      if (backRank.includes('B')) undeveloped++;
      if (undeveloped >= 2 && moveNum > 8) {
        return {
          type: 'development',
          severity: 'suggestion',
          message: `You still have undeveloped pieces on the back rank. Try to develop your knights and bishops before launching an attack.`
        };
      }
    } else {
      const backRank = ranks[0]; // rank 8
      let undeveloped = 0;
      if (backRank.includes('n')) undeveloped++;
      if (backRank.includes('b')) undeveloped++;
      if (undeveloped >= 2 && moveNum > 8) {
        return {
          type: 'development',
          severity: 'suggestion',
          message: `You still have undeveloped pieces on the back rank. Try to develop your knights and bishops before launching an attack.`
        };
      }
    }
    return null;
  }

  _checkCenterControl(fen, color) {
    // Simplified: check if player has pawns or pieces controlling e4,d4,e5,d5
    const board = fen.split(' ')[0];
    const ranks = board.split('/');

    const centerSquares = [
      { r: 3, c: 3 }, { r: 3, c: 4 }, // d5, e5
      { r: 4, c: 3 }, { r: 4, c: 4 }  // d4, e4
    ];

    let control = 0;
    for (const sq of centerSquares) {
      let col = 0;
      for (const ch of ranks[sq.r]) {
        if (ch >= '1' && ch <= '8') {
          col += parseInt(ch);
        } else {
          if (col === sq.c) {
            if ((color === 'w' && ch >= 'A' && ch <= 'Z') ||
                (color === 'b' && ch >= 'a' && ch <= 'z')) {
              control++;
            }
          }
          col++;
        }
      }
    }

    if (control === 0) {
      return {
        type: 'center',
        severity: 'suggestion',
        message: `Consider placing pawns or pieces in the center (d4, e4, d5, e5) to control more space.`
      };
    }
    return null;
  }

  /**
   * Generate a post-game summary
   */
  async generatePostGameSummary(moveHistory, fens, playerColor) {
    if (!this.engine || !this.engine.ready) return null;

    // Quick evaluation of a few key positions
    const keyMoments = [];
    const samplePoints = [
      Math.floor(moveHistory.length * 0.25),
      Math.floor(moveHistory.length * 0.5),
      Math.floor(moveHistory.length * 0.75),
      moveHistory.length - 1
    ];

    for (const idx of samplePoints) {
      if (idx >= 0 && idx < fens.length) {
        const analysis = await this.engine.analyzePosition(fens[idx], 10);
        keyMoments.push({
          moveIndex: idx,
          move: moveHistory[idx]?.san || '',
          eval: analysis.score / 100
        });
      }
    }

    let summary = 'Game Summary:\n';
    const lastEval = keyMoments[keyMoments.length - 1]?.eval || 0;
    const isWhite = playerColor === 'w';
    const playerAdvantage = isWhite ? lastEval : -lastEval;

    if (playerAdvantage > 2) {
      summary += 'You played well and built a strong advantage. ';
    } else if (playerAdvantage > 0) {
      summary += 'You maintained a slight edge throughout. ';
    } else if (playerAdvantage > -1) {
      summary += 'The game was closely contested. ';
    } else {
      summary += 'Your opponent had the upper hand for most of the game. ';
    }

    summary += `The game lasted ${moveHistory.length} moves. `;

    // Opening assessment
    if (keyMoments.length > 0) {
      const openingEval = isWhite ? keyMoments[0].eval : -keyMoments[0].eval;
      if (openingEval > 0.5) {
        summary += 'You came out of the opening with a good position. ';
      } else if (openingEval < -0.5) {
        summary += 'The opening could have gone better — review the first few moves. ';
      }
    }

    return summary;
  }
}
