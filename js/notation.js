// Move history, algebraic notation, PGN export/import

export class Notation {
  constructor(containerEl) {
    this.container = containerEl;
    this.moves = [];        // Full move list
    this.currentIndex = -1; // Currently viewed move index (-1 = start position)
    this.classifications = null; // Array of { classification, cpLoss, bestMove } per move
    this.annotations = {};      // Map<moveIndex, { comment, nag }>
    this.onMoveClick = null; // callback(index)
    this.onMoveHover = null; // callback(index, event) for detail tooltip
    this.onAnnotate = null;  // callback(index, event) for double-click annotation
  }

  addMove(move) {
    // If we're not at the end, truncate future moves
    if (this.currentIndex < this.moves.length - 1) {
      this.moves = this.moves.slice(0, this.currentIndex + 1);
    }
    this.moves.push(move);
    this.currentIndex = this.moves.length - 1;
    this.render();
    this.scrollToActive();
  }

  setMoves(moves) {
    this.moves = moves;
    this.currentIndex = moves.length - 1;
    this.render();
  }

  setCurrentIndex(index) {
    this.currentIndex = index;
    this.render();
    this.scrollToActive();
  }

  undo() {
    if (this.currentIndex >= 0) {
      this.currentIndex--;
      this.render();
      return true;
    }
    return false;
  }

  redo() {
    if (this.currentIndex < this.moves.length - 1) {
      this.currentIndex++;
      this.render();
      return true;
    }
    return false;
  }

  canUndo() {
    return this.currentIndex >= 0;
  }

  canRedo() {
    return this.currentIndex < this.moves.length - 1;
  }

  goToStart() {
    this.currentIndex = -1;
    this.render();
  }

  goToEnd() {
    this.currentIndex = this.moves.length - 1;
    this.render();
  }

  /**
   * Set move classifications from analysis results
   * @param {Object[]} classificationData - Array of { classification, cpLoss, bestMove, playedEval, bestEval }
   */
  setClassifications(classificationData) {
    this.classifications = classificationData;
    this.render();
  }

  clearClassifications() {
    this.classifications = null;
    this.render();
  }

  // --- Annotations ---
  setAnnotation(moveIndex, comment, nag) {
    this.annotations[moveIndex] = { comment: comment || '', nag: nag || '' };
    this.render();
  }

  getAnnotation(moveIndex) {
    return this.annotations[moveIndex] || null;
  }

  clearAnnotation(moveIndex) {
    delete this.annotations[moveIndex];
    this.render();
  }

  clearAllAnnotations() {
    this.annotations = {};
    this.render();
  }

  importAnnotations(map) {
    this.annotations = { ...map };
    this.render();
  }

  clear() {
    this.moves = [];
    this.currentIndex = -1;
    this.classifications = null;
    this.annotations = {};
    this.render();
  }

  removeLast() {
    if (this.moves.length > 0) {
      this.moves.pop();
      this.currentIndex = this.moves.length - 1;
      this.render();
    }
  }

  render() {
    this.container.innerHTML = '';

    for (let i = 0; i < this.moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const row = document.createElement('div');
      row.className = 'move-row';

      const numSpan = document.createElement('span');
      numSpan.className = 'move-number';
      numSpan.textContent = moveNum + '.';
      row.appendChild(numSpan);

      // White move
      const whiteCell = this._createMoveCell(i);
      row.appendChild(whiteCell);

      // Black move
      if (i + 1 < this.moves.length) {
        const blackCell = this._createMoveCell(i + 1);
        row.appendChild(blackCell);
      }

      this.container.appendChild(row);

      // Show annotation comments below the move row
      for (let j = i; j <= i + 1 && j < this.moves.length; j++) {
        const ann = this.annotations[j];
        if (ann && ann.comment) {
          const commentRow = document.createElement('div');
          commentRow.className = 'move-comment-row';
          commentRow.textContent = ann.comment;
          this.container.appendChild(commentRow);
        }
      }
    }

    if (this.onRender) this.onRender();
  }

  _createMoveCell(index) {
    const cell = document.createElement('span');
    cell.className = 'move-cell';
    cell.textContent = this.moves[index].san;
    if (index === this.currentIndex) cell.classList.add('active');

    // Append manual NAG symbol if annotation exists
    const ann = this.annotations[index];
    if (ann && ann.nag) {
      const nagSpan = document.createElement('span');
      nagSpan.className = 'move-nag';
      nagSpan.textContent = ann.nag;
      cell.appendChild(nagSpan);
    }

    // Apply classification color if available
    if (this.classifications && this.classifications[index]) {
      const cls = this.classifications[index].classification;
      if (cls) cell.classList.add(`move-${cls}`);
    }

    cell.addEventListener('click', () => {
      if (this.onMoveClick) this.onMoveClick(index);
    });

    // Double-click for annotation
    cell.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (this.onAnnotate) this.onAnnotate(index, e);
    });

    // Hover for analysis detail
    if (this.classifications && this.classifications[index]) {
      cell.addEventListener('mouseenter', (e) => {
        if (this.onMoveHover) this.onMoveHover(index, e);
      });
      cell.addEventListener('mouseleave', () => {
        if (this.onMoveHover) this.onMoveHover(-1, null);
      });
    }

    return cell;
  }

  scrollToActive() {
    const active = this.container.querySelector('.move-cell.active');
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  toPGN(headers = {}) {
    let pgn = '';

    // Classification → PGN annotation glyph
    const ANNOTATION_GLYPHS = {
      best: '!', great: '!!', good: '', inaccuracy: '?!', mistake: '?', blunder: '??'
    };

    // Headers
    const defaultHeaders = {
      Event: '?',
      Site: '?',
      Date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      Round: '?',
      White: '?',
      Black: '?',
      Result: '*'
    };

    const allHeaders = { ...defaultHeaders, ...headers };

    // Add annotator header when classifications exist
    if (this.classifications && this.classifications.length > 0) {
      allHeaders.Annotator = 'Grandmasters Chess';
    }

    for (const [key, val] of Object.entries(allHeaders)) {
      pgn += `[${key} "${val}"]\n`;
    }
    pgn += '\n';

    // Moves with optional annotations
    for (let i = 0; i < this.moves.length; i++) {
      if (i % 2 === 0) {
        pgn += `${Math.floor(i / 2) + 1}. `;
      }
      pgn += this.moves[i].san;

      // Manual annotation NAG (takes priority over classification glyph)
      const ann = this.annotations[i];
      if (ann && ann.nag) {
        pgn += ann.nag;
      } else if (this.classifications && this.classifications[i]) {
        // Append classification annotation glyph
        const cls = this.classifications[i];
        const glyph = ANNOTATION_GLYPHS[cls.classification] || '';
        if (glyph) pgn += glyph;
      }

      // Add eval comment for classifications (non-best moves)
      if (this.classifications && this.classifications[i]) {
        const cls = this.classifications[i];
        if (cls.classification !== 'best' && cls.classification !== 'great' && cls.cpLoss > 0) {
          const cparts = [];
          if (cls.cpLoss) cparts.push(`cpLoss: ${cls.cpLoss}`);
          if (cls.bestMove) cparts.push(`best: ${cls.bestMove}`);
          if (cparts.length > 0) pgn += ` {${cparts.join(', ')}}`;
        }
      }

      // Manual comment
      if (ann && ann.comment) {
        pgn += ` {${ann.comment}}`;
      }

      pgn += ' ';
    }

    pgn += allHeaders.Result;
    return pgn.trim();
  }
}
