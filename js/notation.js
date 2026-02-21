// Move history, algebraic notation, PGN export/import

export class Notation {
  constructor(containerEl) {
    this.container = containerEl;
    this.moves = [];        // Full move list
    this.currentIndex = -1; // Currently viewed move index (-1 = start position)
    this.onMoveClick = null; // callback(index)
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

  clear() {
    this.moves = [];
    this.currentIndex = -1;
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
      const whiteCell = document.createElement('span');
      whiteCell.className = 'move-cell';
      whiteCell.textContent = this.moves[i].san;
      if (i === this.currentIndex) whiteCell.classList.add('active');
      whiteCell.addEventListener('click', () => {
        if (this.onMoveClick) this.onMoveClick(i);
      });
      row.appendChild(whiteCell);

      // Black move
      if (i + 1 < this.moves.length) {
        const blackCell = document.createElement('span');
        blackCell.className = 'move-cell';
        blackCell.textContent = this.moves[i + 1].san;
        if (i + 1 === this.currentIndex) blackCell.classList.add('active');
        blackCell.addEventListener('click', () => {
          if (this.onMoveClick) this.onMoveClick(i + 1);
        });
        row.appendChild(blackCell);
      }

      this.container.appendChild(row);
    }
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
