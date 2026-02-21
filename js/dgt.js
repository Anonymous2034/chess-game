// DGT Electronic Chess Board integration
// Supports Web Serial API (USB) and DGT LiveChess 2 (WebSocket)

// DGT Protocol constants
const DGT_SEND_BRD = 0x42;        // Request full board dump
const DGT_SEND_UPDATE_BRD = 0x44; // Enable field updates (no clock)
const DGT_MSG_BOARD_DUMP = 0x86;  // Board dump response (67 bytes)
const DGT_MSG_FIELD_UPDATE = 0x8E;// Single square update (5 bytes)
const DGT_MSG_SERIALNR = 0x91;    // Serial number response
const DGT_MSG_VERSION = 0x93;     // Version response

// DGT piece codes → chess.js piece objects
const DGT_PIECES = {
  0x00: null,
  0x01: { color: 'w', type: 'p' },
  0x02: { color: 'w', type: 'r' },
  0x03: { color: 'w', type: 'n' },
  0x04: { color: 'w', type: 'b' },
  0x05: { color: 'w', type: 'k' },
  0x06: { color: 'w', type: 'q' },
  0x07: { color: 'b', type: 'p' },
  0x08: { color: 'b', type: 'r' },
  0x09: { color: 'b', type: 'n' },
  0x0A: { color: 'b', type: 'b' },
  0x0B: { color: 'b', type: 'k' },
  0x0C: { color: 'b', type: 'q' }
};

// Reverse mapping: chess.js piece → DGT code
const PIECE_TO_DGT = {};
for (const [code, piece] of Object.entries(DGT_PIECES)) {
  if (piece) {
    PIECE_TO_DGT[piece.color + piece.type] = parseInt(code);
  }
}

export class DGTBoard {
  constructor() {
    // Connection state
    this.connectionType = null; // 'serial' | 'livechess' | null
    this.connected = false;
    this.port = null;           // Web Serial port
    this.reader = null;         // ReadableStream reader
    this.writer = null;         // WritableStream writer
    this.ws = null;             // WebSocket for LiveChess
    this._readLoopActive = false;

    // Board state
    this.dgtBoard = new Array(64).fill(0x00);
    this.lastStableBoard = null;
    this.debounceTimer = null;
    this.debounceMs = 300;
    this._syncWarningTimer = null;

    // Protocol buffer
    this.rxBuffer = new Uint8Array(0);

    // Engine move guidance
    this.pendingEngineMove = null; // { from, to, san }

    // Callbacks (wired by main.js)
    this.onStatusChange = null;
    this.onConnectionChange = null;
    this._onPhysicalBoardChanged = null;
  }

  // === Public API ===

  isConnected() {
    return this.connected;
  }

  async connectSerial() {
    if (!navigator.serial) {
      this._setStatus('Web Serial not supported. Use Chrome or Edge.');
      return false;
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      this.writer = this.port.writable.getWriter();
      this.connected = true;
      this.connectionType = 'serial';

      if (this.onConnectionChange) this.onConnectionChange(true);
      this._setStatus('Connected via USB');

      // Request initial board state and enable updates
      await this._sendCommand(DGT_SEND_BRD);
      await this._sendCommand(DGT_SEND_UPDATE_BRD);

      // Start reading
      this._serialReadLoop();

      return true;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        this._setStatus('No device selected');
      } else {
        this._setStatus('Connection failed: ' + err.message);
      }
      return false;
    }
  }

  async connectLiveChess() {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket('ws://localhost:1982/api/v1.0');

        this.ws.onopen = () => {
          this.connected = true;
          this.connectionType = 'livechess';
          if (this.onConnectionChange) this.onConnectionChange(true);
          this._setStatus('Connected via LiveChess');

          // Subscribe to board events
          this.ws.send(JSON.stringify({
            id: 1,
            call: 'subscribe',
            param: { feed: 'eboardevent' }
          }));
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this._handleLiveChessMessage(data);
          } catch (e) {
            console.warn('LiveChess parse error:', e);
          }
        };

        this.ws.onerror = () => {
          this._setStatus('LiveChess connection failed. Is LiveChess 2 running?');
          resolve(false);
        };

        this.ws.onclose = () => {
          if (this.connected) {
            this.connected = false;
            this.connectionType = null;
            if (this.onConnectionChange) this.onConnectionChange(false);
            this._setStatus('Disconnected');
          }
        };

        // Timeout
        setTimeout(() => {
          if (!this.connected) {
            try { this.ws.close(); } catch {}
            this._setStatus('LiveChess connection timed out. Is it running on port 1982?');
            resolve(false);
          }
        }, 5000);
      } catch (err) {
        this._setStatus('Failed to connect: ' + err.message);
        resolve(false);
      }
    });
  }

  disconnect() {
    clearTimeout(this.debounceTimer);
    clearTimeout(this._syncWarningTimer);

    if (this.connectionType === 'serial') {
      this._readLoopActive = false;
      try { this.reader?.cancel(); } catch {}
      try { this.reader?.releaseLock(); } catch {}
      try { this.writer?.releaseLock(); } catch {}
      try { this.port?.close(); } catch {}
      this.reader = null;
      this.writer = null;
      this.port = null;
    } else if (this.connectionType === 'livechess') {
      try { this.ws?.close(); } catch {}
      this.ws = null;
    }

    this.connected = false;
    this.connectionType = null;
    this.rxBuffer = new Uint8Array(0);
    this.lastStableBoard = null;
    this.pendingEngineMove = null;

    if (this.onConnectionChange) this.onConnectionChange(false);
    this._setStatus('Disconnected');
  }

  /**
   * Called by main.js when engine makes a move.
   * Stores the move so we can guide the user to play it on the physical board.
   */
  setEngineMoveToPlay(move) {
    this.pendingEngineMove = move;
  }

  /**
   * Request a board dump and update lastStableBoard to match game position.
   * Called when starting a new game.
   */
  syncToPosition(chess) {
    this.lastStableBoard = this._chessJsToArray(chess);
    this.pendingEngineMove = null;

    if (this.connectionType === 'serial' && this.writer) {
      this._sendCommand(DGT_SEND_BRD);
    }
  }

  /**
   * Core move detection: compare DGT board state against all legal moves.
   * Returns { from, to, promotion } or null if no match.
   */
  detectMove(chess) {
    const legalMoves = chess.moves({ verbose: true });
    const matches = [];

    for (const move of legalMoves) {
      // Simulate move on temporary board
      const temp = new Chess(chess.fen());
      temp.move(move);

      const tempBoard = this._chessJsToArray(temp);

      if (this._boardsMatch(tempBoard, this.dgtBoard)) {
        matches.push(move);
      }
    }

    if (matches.length === 1) {
      this.lastStableBoard = [...this.dgtBoard];
      clearTimeout(this._syncWarningTimer);
      return { from: matches[0].from, to: matches[0].to, promotion: matches[0].promotion };
    }

    if (matches.length > 1) {
      // Multiple matches — likely promotion with different piece types
      // Check which promotion piece matches the actual DGT piece on the square
      const uniqueFromTo = new Set(matches.map(m => m.from + m.to));
      if (uniqueFromTo.size === 1) {
        // All same from/to — it's a promotion
        // Find which piece is actually on the promotion square
        const toSquare = matches[0].to;
        const dgtIdx = this._algebraicToDgtSquare(toSquare);
        const actualPiece = DGT_PIECES[this.dgtBoard[dgtIdx]];

        if (actualPiece) {
          const match = matches.find(m => m.promotion === actualPiece.type);
          if (match) {
            this.lastStableBoard = [...this.dgtBoard];
            clearTimeout(this._syncWarningTimer);
            return { from: match.from, to: match.to, promotion: match.promotion };
          }
        }

        // Default to queen
        const queenMove = matches.find(m => m.promotion === 'q') || matches[0];
        this.lastStableBoard = [...this.dgtBoard];
        clearTimeout(this._syncWarningTimer);
        return { from: queenMove.from, to: queenMove.to, promotion: queenMove.promotion };
      }
    }

    // No match — board may be in transition or out of sync
    return null;
  }

  // === Serial Protocol ===

  async _sendCommand(cmd) {
    if (!this.writer) return;
    try {
      await this.writer.write(new Uint8Array([cmd]));
    } catch (err) {
      console.warn('DGT send error:', err);
    }
  }

  async _serialReadLoop() {
    if (!this.port?.readable) return;

    this._readLoopActive = true;
    this.reader = this.port.readable.getReader();

    try {
      while (this._readLoopActive) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this._appendToBuffer(value);
          this._parseMessages();
        }
      }
    } catch (err) {
      if (this._readLoopActive) {
        console.warn('DGT read error:', err);
        this._setStatus('Connection lost');
      }
    } finally {
      try { this.reader?.releaseLock(); } catch {}
      this.reader = null;

      if (this._readLoopActive) {
        this._readLoopActive = false;
        this.connected = false;
        this.connectionType = null;
        if (this.onConnectionChange) this.onConnectionChange(false);
      }
    }
  }

  _appendToBuffer(chunk) {
    const newBuf = new Uint8Array(this.rxBuffer.length + chunk.length);
    newBuf.set(this.rxBuffer, 0);
    newBuf.set(chunk, this.rxBuffer.length);
    this.rxBuffer = newBuf;
  }

  _parseMessages() {
    while (this.rxBuffer.length >= 3) {
      const type = this.rxBuffer[0];

      // Messages from board have bit 7 set
      if ((type & 0x80) === 0) {
        // Skip invalid byte
        this.rxBuffer = this.rxBuffer.slice(1);
        continue;
      }

      // Size: 7-bit MSB + 7-bit LSB
      const size = (this.rxBuffer[1] << 7) | this.rxBuffer[2];

      if (size < 3 || size > 256) {
        // Invalid size, skip byte
        this.rxBuffer = this.rxBuffer.slice(1);
        continue;
      }

      if (this.rxBuffer.length < size) {
        break; // Wait for more data
      }

      const payload = this.rxBuffer.slice(3, size);
      this.rxBuffer = this.rxBuffer.slice(size);

      switch (type) {
        case DGT_MSG_BOARD_DUMP:
          this._handleBoardDump(payload);
          break;
        case DGT_MSG_FIELD_UPDATE:
          this._handleFieldUpdate(payload);
          break;
        case DGT_MSG_SERIALNR:
          this._setStatus('Connected — S/N: ' + this._bytesToString(payload));
          break;
        case DGT_MSG_VERSION:
          if (payload.length >= 2) {
            this._setStatus(`Connected — v${payload[0]}.${payload[1]}`);
          }
          break;
      }
    }
  }

  _handleBoardDump(payload) {
    if (payload.length < 64) return;

    for (let i = 0; i < 64; i++) {
      this.dgtBoard[i] = payload[i];
    }

    this._setStatus('Board position received');
    this._onBoardChanged();
  }

  _handleFieldUpdate(payload) {
    if (payload.length < 2) return;

    const square = payload[0]; // 0-63
    const piece = payload[1];  // piece code

    if (square >= 0 && square < 64) {
      this.dgtBoard[square] = piece;
    }

    // Debounce: moving a piece causes multiple updates (lift + place)
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._onBoardChanged(), this.debounceMs);
  }

  // === LiveChess WebSocket ===

  _handleLiveChessMessage(data) {
    // Subscription confirmation
    if (data.response === 'call' && data.id === 1) {
      this._setStatus('Subscribed to board events');
      return;
    }

    // Board update event
    if (data.param?.board) {
      const fen = data.param.board;
      this.dgtBoard = this._fenToBoard(fen);

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._onBoardChanged(), this.debounceMs);
    }

    // Some LiveChess versions use different field names
    if (data.param?.fen) {
      this.dgtBoard = this._fenToBoard(data.param.fen);
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._onBoardChanged(), this.debounceMs);
    }
  }

  /**
   * Convert FEN piece placement string to 64-element DGT piece code array.
   * FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
   */
  _fenToBoard(fen) {
    const board = new Array(64).fill(0x00);
    // Take only the piece placement part (before first space)
    const placement = fen.split(' ')[0];
    const rows = placement.split('/');

    const fenToDgt = {
      'P': 0x01, 'R': 0x02, 'N': 0x03, 'B': 0x04, 'K': 0x05, 'Q': 0x06,
      'p': 0x07, 'r': 0x08, 'n': 0x09, 'b': 0x0A, 'k': 0x0B, 'q': 0x0C
    };

    let idx = 0;
    for (const row of rows) {
      for (const ch of row) {
        if (ch >= '1' && ch <= '8') {
          idx += parseInt(ch);
        } else if (fenToDgt[ch] !== undefined) {
          board[idx] = fenToDgt[ch];
          idx++;
        }
      }
    }

    return board;
  }

  // === Board Change Detection ===

  _onBoardChanged() {
    // Check if board actually changed from last stable state
    if (this.lastStableBoard &&
        this.dgtBoard.every((v, i) => v === this.lastStableBoard[i])) {
      clearTimeout(this._syncWarningTimer);
      return;
    }

    // If there's a pending engine move, check if user replayed it on physical board
    if (this.pendingEngineMove) {
      // The game state already has the engine move applied,
      // so we check if physical board now matches the current game position
      // This is handled in main.js via the callback
    }

    // Notify main.js
    if (this._onPhysicalBoardChanged) {
      this._onPhysicalBoardChanged();
    }

    // Start sync warning timer — if board stays unrecognized for 5s
    clearTimeout(this._syncWarningTimer);
    this._syncWarningTimer = setTimeout(() => {
      this._setStatus('Board position doesn\'t match the game. Please correct your board.');
    }, 5000);
  }

  // === Helpers ===

  /**
   * Convert chess.js board to 64-element DGT piece code array.
   * chess.board() returns 8x8 array where [0] = rank 8, [7] = rank 1
   * DGT: 0=a8, 1=b8...7=h8, 8=a7...63=h1
   */
  _chessJsToArray(chess) {
    const board = chess.board();
    const arr = new Array(64);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const dgtIdx = r * 8 + c;
        const piece = board[r][c];
        arr[dgtIdx] = piece ? (PIECE_TO_DGT[piece.color + piece.type] || 0x00) : 0x00;
      }
    }
    return arr;
  }

  _boardsMatch(a, b) {
    for (let i = 0; i < 64; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * DGT square index (0=a8) → algebraic notation ('a8')
   */
  _dgtSquareToAlgebraic(sq) {
    const file = sq % 8;
    const rank = 8 - Math.floor(sq / 8);
    return String.fromCharCode(97 + file) + rank;
  }

  /**
   * Algebraic notation ('a8') → DGT square index (0)
   */
  _algebraicToDgtSquare(sq) {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1]);
    return (8 - rank) * 8 + file;
  }

  _bytesToString(bytes) {
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('').trim();
  }

  _setStatus(msg) {
    if (this.onStatusChange) this.onStatusChange(msg);
  }
}
