// Position Commentary — engine-derived positional analysis for Live Advisors
// Takes a chess.js instance and engine analysis, returns textual sections

export class PositionCommentary {

  static generate(chess, analysis) {
    const sections = [];
    sections.push(this._evaluation(analysis));
    sections.push(this._material(chess));
    sections.push(this._pawnStructure(chess));
    sections.push(this._centerControl(chess));
    sections.push(this._kingSafety(chess));
    sections.push(this._openFiles(chess));
    sections.push(this._pieceActivity(chess));
    return sections.filter(s => s);
  }

  // Convert centipawn score to plain English
  static _evaluation(analysis) {
    if (!analysis) return null;
    const { score, mate } = analysis;

    let text;
    if (mate !== null && mate !== undefined) {
      text = mate > 0
        ? `White has mate in ${mate}.`
        : `Black has mate in ${Math.abs(mate)}.`;
    } else {
      const cp = score / 100;
      const abs = Math.abs(cp);
      if (abs < 0.3) {
        text = 'The position is roughly equal.';
      } else if (abs < 1.0) {
        text = `${cp > 0 ? 'White' : 'Black'} has a slight edge (${cp > 0 ? '+' : ''}${cp.toFixed(1)}).`;
      } else if (abs < 2.5) {
        text = `${cp > 0 ? 'White' : 'Black'} has a clear advantage (${cp > 0 ? '+' : ''}${cp.toFixed(1)}).`;
      } else {
        text = `${cp > 0 ? 'White' : 'Black'} has a decisive advantage (${cp > 0 ? '+' : ''}${cp.toFixed(1)}).`;
      }
    }

    return { title: 'Evaluation', text, icon: '\u2696' }; // balance scale
  }

  // Count material and report imbalances
  static _material(chess) {
    const board = chess.board();
    const count = { w: {}, b: {} };
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

    for (const row of board) {
      for (const sq of row) {
        if (!sq || sq.type === 'k') continue;
        count[sq.color][sq.type] = (count[sq.color][sq.type] || 0) + 1;
      }
    }

    let wTotal = 0, bTotal = 0;
    for (const p of Object.keys(values)) {
      wTotal += (count.w[p] || 0) * values[p];
      bTotal += (count.b[p] || 0) * values[p];
    }

    if (wTotal === bTotal) {
      // Check for imbalances even if total is equal
      const imbalances = [];
      for (const p of ['q', 'r', 'b', 'n', 'p']) {
        const diff = (count.w[p] || 0) - (count.b[p] || 0);
        if (diff > 0) imbalances.push(`White has ${diff} extra ${diff > 1 ? names[p] + 's' : names[p]}`);
        if (diff < 0) imbalances.push(`Black has ${-diff} extra ${-diff > 1 ? names[p] + 's' : names[p]}`);
      }
      const text = imbalances.length > 0
        ? `Material points are equal. ${imbalances.join(', ')}.`
        : 'Material is equal.';
      return { title: 'Material', text, icon: '\u265F' }; // chess pawn
    }

    // Describe who is up and by how much
    const diff = wTotal - bTotal;
    const side = diff > 0 ? 'White' : 'Black';
    const pts = Math.abs(diff);

    // Try to describe the imbalance naturally
    const pieces = [];
    for (const p of ['q', 'r', 'b', 'n', 'p']) {
      const d = (count.w[p] || 0) - (count.b[p] || 0);
      const absd = Math.abs(d);
      if (absd > 0) {
        const pSide = d > 0 ? 'White' : 'Black';
        pieces.push(`${pSide} +${absd} ${absd > 1 ? names[p] + 's' : names[p]}`);
      }
    }

    const text = `${side} is up ${pts} point${pts !== 1 ? 's' : ''} of material. ${pieces.join(', ')}.`;
    return { title: 'Material', text, icon: '\u265F' };
  }

  // Scan for doubled, isolated, and passed pawns
  static _pawnStructure(chess) {
    const board = chess.board();
    const pawns = { w: [], b: [] };

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (sq && sq.type === 'p') {
          pawns[sq.color].push({ rank: r, file: f });
        }
      }
    }

    const features = [];

    const fileChar = f => String.fromCharCode(97 + f);

    // Doubled pawns
    for (const color of ['w', 'b']) {
      const side = color === 'w' ? 'White' : 'Black';
      const fileCounts = {};
      for (const p of pawns[color]) {
        fileCounts[p.file] = (fileCounts[p.file] || 0) + 1;
      }
      for (const [f, cnt] of Object.entries(fileCounts)) {
        if (cnt >= 2) features.push(`${side} has doubled pawns on the ${fileChar(+f)}-file`);
      }
    }

    // Isolated pawns
    for (const color of ['w', 'b']) {
      const side = color === 'w' ? 'White' : 'Black';
      const files = new Set(pawns[color].map(p => p.file));
      for (const f of files) {
        if (!files.has(f - 1) && !files.has(f + 1)) {
          features.push(`${side} has an isolated ${fileChar(f)}-pawn`);
        }
      }
    }

    // Passed pawns
    for (const color of ['w', 'b']) {
      const side = color === 'w' ? 'White' : 'Black';
      const opp = color === 'w' ? 'b' : 'w';
      for (const p of pawns[color]) {
        let passed = true;
        const dir = color === 'w' ? -1 : 1;
        const startR = p.rank + dir;
        const endR = color === 'w' ? 0 : 7;
        const step = color === 'w' ? -1 : 1;

        for (let r = startR; (step > 0 ? r <= endR : r >= endR); r += step) {
          for (let df = -1; df <= 1; df++) {
            const f = p.file + df;
            if (f < 0 || f > 7) continue;
            const sq = board[r][f];
            if (sq && sq.type === 'p' && sq.color === opp) {
              passed = false;
              break;
            }
          }
          if (!passed) break;
        }

        if (passed) {
          const rankNum = color === 'w' ? (8 - p.rank) : (p.rank + 1);
          features.push(`${side} has a passed pawn on ${fileChar(p.file)}${rankNum}`);
        }
      }
    }

    if (features.length === 0) return null;

    return { title: 'Pawn Structure', text: features.join('. ') + '.', icon: '\u2659' }; // white pawn
  }

  // Check center squares e4, d4, e5, d5
  static _centerControl(chess) {
    const board = chess.board();
    // Board array: row 0 = rank 8, row 7 = rank 1
    // d4 = board[4][3], e4 = board[4][4], d5 = board[3][3], e5 = board[3][4]
    const centerSquares = [
      { sq: 'd4', r: 4, f: 3 },
      { sq: 'e4', r: 4, f: 4 },
      { sq: 'd5', r: 3, f: 3 },
      { sq: 'e5', r: 3, f: 4 }
    ];

    const wPawns = [];
    const bPawns = [];
    const wPieces = [];
    const bPieces = [];

    for (const { sq, r, f } of centerSquares) {
      const piece = board[r][f];
      if (!piece) continue;
      if (piece.type === 'p') {
        (piece.color === 'w' ? wPawns : bPawns).push(sq);
      } else {
        (piece.color === 'w' ? wPieces : bPieces).push(sq);
      }
    }

    const parts = [];
    if (wPawns.length > 0) parts.push(`White has pawn${wPawns.length > 1 ? 's' : ''} on ${wPawns.join(' and ')}`);
    if (bPawns.length > 0) parts.push(`Black has pawn${bPawns.length > 1 ? 's' : ''} on ${bPawns.join(' and ')}`);
    if (wPieces.length > 0) parts.push(`White occupies ${wPieces.join(' and ')} with a piece`);
    if (bPieces.length > 0) parts.push(`Black occupies ${bPieces.join(' and ')} with a piece`);

    if (wPawns.length === 0 && bPawns.length === 0 && wPieces.length === 0 && bPieces.length === 0) {
      return { title: 'Center', text: 'The center is open with no pawns or pieces on the key squares.', icon: '\u2316' }; // position indicator
    }

    return { title: 'Center', text: parts.join('. ') + '.', icon: '\u2316' };
  }

  // Check pawn shield in front of each king
  static _kingSafety(chess) {
    const board = chess.board();
    const parts = [];

    for (const color of ['w', 'b']) {
      const side = color === 'w' ? 'White' : 'Black';
      // Find king
      let kingR = -1, kingF = -1;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const sq = board[r][f];
          if (sq && sq.type === 'k' && sq.color === color) {
            kingR = r; kingF = f;
          }
        }
      }
      if (kingR < 0) continue;

      // Determine if king has castled (kingside or queenside)
      const isKingside = kingF >= 5;
      const isQueenside = kingF <= 2;
      const shieldRank = color === 'w' ? kingR - 1 : kingR + 1;

      if (shieldRank < 0 || shieldRank > 7) continue;

      // Check 3 pawns in front of king
      let shieldPawns = 0;
      let advancedPawns = [];
      const files = [kingF - 1, kingF, kingF + 1].filter(f => f >= 0 && f <= 7);

      for (const f of files) {
        const sq = board[shieldRank][f];
        if (sq && sq.type === 'p' && sq.color === color) {
          shieldPawns++;
        } else {
          // Check if pawn advanced further
          const nextRank = color === 'w' ? shieldRank - 1 : shieldRank + 1;
          if (nextRank >= 0 && nextRank <= 7) {
            const sq2 = board[nextRank][f];
            if (sq2 && sq2.type === 'p' && sq2.color === color) {
              advancedPawns.push(String.fromCharCode(97 + f));
            }
          }
        }
      }

      if (isKingside || isQueenside) {
        if (shieldPawns === files.length) {
          parts.push(`${side}'s king is well-sheltered behind an intact pawn shield`);
        } else if (shieldPawns >= files.length - 1 && advancedPawns.length > 0) {
          parts.push(`${side}'s king shelter is slightly weakened \u2014 the ${advancedPawns.join('/')} pawn has advanced`);
        } else if (shieldPawns < files.length - 1) {
          parts.push(`${side}'s king is exposed \u2014 pawn shield is broken`);
        }
      } else {
        // King in center
        parts.push(`${side}'s king remains in the center`);
      }
    }

    if (parts.length === 0) return null;
    return { title: 'King Safety', text: parts.join('. ') + '.', icon: '\u265A' }; // black king
  }

  // Scan files a-h for open/semi-open status
  static _openFiles(chess) {
    const board = chess.board();
    const open = [];
    const semiOpen = { w: [], b: [] };

    for (let f = 0; f < 8; f++) {
      let wPawn = false, bPawn = false;
      for (let r = 0; r < 8; r++) {
        const sq = board[r][f];
        if (sq && sq.type === 'p') {
          if (sq.color === 'w') wPawn = true;
          if (sq.color === 'b') bPawn = true;
        }
      }

      const fileChar = String.fromCharCode(97 + f);
      if (!wPawn && !bPawn) {
        open.push(fileChar);
      } else if (!wPawn && bPawn) {
        semiOpen.w.push(fileChar);
      } else if (wPawn && !bPawn) {
        semiOpen.b.push(fileChar);
      }
    }

    const parts = [];
    if (open.length > 0) {
      parts.push(`The ${open.join(', ')}-file${open.length > 1 ? 's are' : ' is'} fully open`);
    }
    if (semiOpen.w.length > 0) {
      parts.push(`White has semi-open ${semiOpen.w.join(', ')}-file${semiOpen.w.length > 1 ? 's' : ''}`);
    }
    if (semiOpen.b.length > 0) {
      parts.push(`Black has semi-open ${semiOpen.b.join(', ')}-file${semiOpen.b.length > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) return null;
    return { title: 'Open Files', text: parts.join('. ') + '.', icon: '\u2656' }; // white rook
  }

  // Count legal moves per side as a rough activity measure
  static _pieceActivity(chess) {
    const turn = chess.turn();
    const currentMoves = chess.moves().length;

    // We need to get the opponent's move count — flip turn via null move trick
    // chess.js doesn't support null moves, so we use the current side's count
    // and describe relative to typical ranges
    const side = turn === 'w' ? 'White' : 'Black';

    let text;
    if (currentMoves >= 35) {
      text = `${side} has ${currentMoves} legal moves \u2014 very active position.`;
    } else if (currentMoves >= 25) {
      text = `${side} has ${currentMoves} legal moves \u2014 good piece activity.`;
    } else if (currentMoves >= 15) {
      text = `${side} has ${currentMoves} legal moves \u2014 moderate activity.`;
    } else {
      text = `${side} has only ${currentMoves} legal moves \u2014 cramped position.`;
    }

    return { title: 'Piece Activity', text, icon: '\u265E' }; // black knight
  }
}
