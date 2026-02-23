// Move history, algebraic notation, PGN export/import

export class Notation {
  constructor(containerEl) {
    this.container = containerEl;
    this.moves = [];        // Full move list
    this.currentIndex = -1; // Currently viewed move index (-1 = start position)
    this.classifications = null; // Array of { classification, cpLoss, bestMove } per move
    this.onMoveClick = null; // callback(index)
    this.onMoveHover = null; // callback(index, event) for detail tooltip
  }

  addMove(move) {
    // If we're not at the end, truncate future moves
    if (this.currentIndex < this.moves.length - 1) {
      this.moves = this.moves.slice(0, this.currentIndex + 1);
    }
    this.moves.push(move);
    this.currentIndex = this.moves.length - 1;
    this.render();
    this.scrollToBottom();
  }

  setMoves(moves) {
    this.moves = moves;
    this.currentIndex = moves.length - 1;
    this.render();
  }

  setCurrentIndex(index) {
    this.currentIndex = index;
    this.render();
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

  clear() {
    this.moves = [];
    this.currentIndex = -1;
    this.classifications = null;
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
    }
  }

  _createMoveCell(index) {
    const cell = document.createElement('span');
    cell.className = 'move-cell';
    cell.textContent = this.moves[index].san;
    if (index === this.currentIndex) cell.classList.add('active');

    // Apply classification color if available
    if (this.classifications && this.classifications[index]) {
      const cls = this.classifications[index].classification;
      if (cls) cell.classList.add(`move-${cls}`);
    }

    cell.addEventListener('click', () => {
      if (this.onMoveClick) this.onMoveClick(index);
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

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  toPGN(headers = {}) {
    let pgn = '';

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
    for (const [key, val] of Object.entries(allHeaders)) {
      pgn += `[${key} "${val}"]\n`;
    }
    pgn += '\n';

    // Moves
    for (let i = 0; i < this.moves.length; i++) {
      if (i % 2 === 0) {
        pgn += `${Math.floor(i / 2) + 1}. `;
      }
      pgn += this.moves[i].san + ' ';
    }

    pgn += allHeaders.Result;
    return pgn.trim();
  }
}
