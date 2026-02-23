// DGT Electronic Chess Board integration — v2 (Pegasus BLE fix)
// Supports:
//   - USB (Web Serial API) — Professional DGT e-Board with piece recognition
//   - DGT LiveChess 2 (WebSocket) — Professional board via LiveChess software
//   - Bluetooth (BLE) — DGT Pegasus via Nordic UART Service (occupancy only)
console.log('[DGT] dgt.js v9 loaded (voice + auto new game)');

// BLE plugin (Capacitor community plugin, available on Android/iOS)
const BluetoothLe = window.Capacitor?.Plugins?.BluetoothLe || null;

// Nordic UART Service UUIDs (used by DGT Pegasus)
const NUS_SERVICE    = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX_CHAR    = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write to board
const NUS_TX_CHAR    = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Receive from board

// DGT Protocol constants (same byte values for both Professional and Pegasus)
const DGT_SEND_BRD = 0x42;        // 'B' — Request full board dump
const DGT_SEND_UPDATE_BRD = 0x44; // 'D' — Enable field updates
const DGT_MSG_BOARD_DUMP = 0x86;  // Board dump response
const DGT_MSG_FIELD_UPDATE = 0x8E;// Single square update
const DGT_MSG_SERIALNR = 0x91;    // Serial number response
const DGT_MSG_VERSION = 0x93;     // Version response

// DGT piece codes → chess.js piece objects (Professional board only)
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
    this.connectionType = null; // 'serial' | 'livechess' | 'pegasus' | null
    this.connected = false;
    this.port = null;           // Web Serial port
    this.reader = null;         // ReadableStream reader
    this.writer = null;         // WritableStream writer
    this.ws = null;             // WebSocket for LiveChess
    this._readLoopActive = false;
    this._bleDeviceId = null;   // BLE device ID for Capacitor plugin
    this._bleListeners = [];    // Capacitor listener handles for cleanup
    this._webBtDevice = null;   // Web Bluetooth device object
    this._webBtRxChar = null;   // Web Bluetooth RX characteristic (write to board)
    this._webBtTxChar = null;   // Web Bluetooth TX characteristic (read from board)
    this._pollInterval = null;  // Pegasus board state polling interval

    // Board type: 'professional' (piece codes) or 'pegasus' (occupancy 0/1)
    this.boardType = 'professional';

    // Board state — 64 elements
    // Professional: piece codes (0x00-0x0C)
    // Pegasus: occupancy (0=empty, 1=occupied)
    this.dgtBoard = new Array(64).fill(0x00);
    this.lastStableBoard = null;
    this._expectedGameBoard = null; // Expected game position for sync check
    this._sensorGaps = new Set();   // Pegasus squares with permanent sensor issues
    this._boardSynced = false;      // True once board matches game after connect/sync
    this._flashTimer = null;        // Auto-clear timer for confirmation LED flash
    this._castleTimer = null;       // Timer for sequential castle LED animation
    this._engineMovePhase = null;   // 'from' | 'to' | null — sequential LED guidance
    this._startPosTimer = null;     // Timer for starting position auto-detect
    this._startPosDetected = false; // Prevents repeated callback fires
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
    this.onStartingPositionDetected = null;
  }

  // === Public API ===

  isConnected() {
    return this.connected;
  }

  isPegasus() {
    return this.boardType === 'pegasus';
  }

  async connectSerial() {
    console.log('[DGT] connectSerial() called, navigator.serial available:', !!navigator.serial);
    if (!navigator.serial) {
      this._setStatus('Web Serial not supported. Use Chrome or Edge.');
      return false;
    }

    try {
      this.port = await navigator.serial.requestPort();
      console.log('[DGT] Port selected, opening at 9600 baud...');
      await this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      this.writer = this.port.writable.getWriter();
      this.connected = true;
      this.connectionType = 'serial';
      this.boardType = 'professional';
      console.log('[DGT] Port opened, sending initial commands...');

      if (this.onConnectionChange) this.onConnectionChange(true);
      this._setStatus('Connected via USB');

      // Request initial board state and enable updates
      await this._sendCommand(DGT_SEND_BRD);
      console.log('[DGT] Sent DGT_SEND_BRD (0x42)');
      await this._sendCommand(DGT_SEND_UPDATE_BRD);
      console.log('[DGT] Sent DGT_SEND_UPDATE_BRD (0x44), starting read loop...');

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
          this.boardType = 'professional';
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

  async connectPegasus() {
    // Web Bluetooth API (Chrome/Edge on desktop and Android)
    if (navigator.bluetooth) {
      return this._connectPegasusWebBt();
    }
    // Capacitor BLE plugin (native app)
    if (BluetoothLe) {
      return this._connectPegasusCapacitor();
    }
    this._setStatus('Bluetooth not available. Use Chrome or Edge.');
    return false;
  }

  /** Connect via Web Bluetooth API (browser) */
  async _connectPegasusWebBt() {
    try {
      this._setStatus('Scanning for DGT Pegasus...');

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'DGT_PEGASUS' },
          { namePrefix: 'DGT Pegasus' },
          { namePrefix: 'Pegasus' },
        ],
        optionalServices: [NUS_SERVICE],
      });

      if (!device) {
        this._setStatus('No device selected');
        return false;
      }

      this._webBtDevice = device;
      this._setStatus('Connecting to ' + (device.name || 'DGT Pegasus') + '...');

      // Listen for disconnect
      device.addEventListener('gattserverdisconnected', () => {
        if (this.connected && this.connectionType === 'pegasus') {
          this.connected = false;
          this.connectionType = null;
          this._webBtDevice = null;
          this._webBtRxChar = null;
          this._webBtTxChar = null;
          if (this.onConnectionChange) this.onConnectionChange(false);
          this._setStatus('Bluetooth connection lost');
        }
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(NUS_SERVICE);

      this._webBtTxChar = await service.getCharacteristic(NUS_TX_CHAR);
      this._webBtRxChar = await service.getCharacteristic(NUS_RX_CHAR);

      // Subscribe to notifications (data from board)
      await this._webBtTxChar.startNotifications();
      this._webBtTxChar.addEventListener('characteristicvaluechanged', (event) => {
        const dataView = event.target.value;
        const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
        if (bytes.length > 0) {
          console.log('[DGT] BLE received', bytes.length, 'bytes:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
          this._appendToBuffer(bytes);
          this._parseMessages();
        }
      });

      this.connected = true;
      this.connectionType = 'pegasus';
      this.boardType = 'pegasus';

      this._setStatus('Authenticating with ' + (device.name || 'DGT Pegasus') + '...');

      // Full Pegasus init: dev key → reset → board dump → enable updates
      // IMPORTANT: must complete BEFORE onConnectionChange fires,
      // because syncToPosition sends 0x42 and would get 0x7F garbage pre-auth.
      await this._sendPegasusBytes([99, 7, 190, 245, 174, 221, 169, 95, 0]);
      await this._delay(200);
      await this._sendCommand(0x40); // CMD_RESET
      await this._delay(200);
      await this._sendCommand(DGT_SEND_BRD);
      await this._delay(500); // Wait for board dump response
      await this._sendCommand(DGT_SEND_UPDATE_BRD);
      await this._delay(200);

      // Now notify the app — board is authenticated and ready
      this._setStatus('Connected via Bluetooth — ' + (device.name || 'DGT Pegasus'));
      if (this.onConnectionChange) this.onConnectionChange(true);

      // Start polling — the Pegasus needs periodic board dump requests
      // for reliable move detection (field events alone are not enough)
      this._startPegasusPolling();

      return true;
    } catch (err) {
      console.error('[DGT] Web Bluetooth error:', err);
      if (err.name === 'NotFoundError' || err.message?.includes('cancel')) {
        this._setStatus('No device selected');
      } else {
        this._setStatus('Bluetooth failed: ' + err.message);
      }
      return false;
    }
  }

  /** Connect via Capacitor BLE plugin (native app) */
  async _connectPegasusCapacitor() {
    try {
      await BluetoothLe.initialize();

      this._setStatus('Scanning for DGT Pegasus...');

      const result = await BluetoothLe.requestDevice({
        services: [NUS_SERVICE],
        optionalServices: [],
      });

      const device = result?.device;
      if (!device?.deviceId) {
        this._setStatus('No device selected');
        return false;
      }

      this._bleDeviceId = device.deviceId;
      this._bleListeners = [];
      this._setStatus('Connecting to ' + (device.name || 'DGT Pegasus') + '...');

      const disconnectKey = `disconnected|${this._bleDeviceId}`;
      const disconnectHandle = await BluetoothLe.addListener(disconnectKey, () => {
        if (this.connected && this.connectionType === 'pegasus') {
          this.connected = false;
          this.connectionType = null;
          this._bleDeviceId = null;
          this._removeListeners();
          if (this.onConnectionChange) this.onConnectionChange(false);
          this._setStatus('Bluetooth connection lost');
        }
      });
      this._bleListeners.push(disconnectHandle);

      await BluetoothLe.connect({ deviceId: this._bleDeviceId, timeout: 10000 });

      const notifKey = `notification|${this._bleDeviceId}|${NUS_SERVICE}|${NUS_TX_CHAR}`;
      const notifHandle = await BluetoothLe.addListener(notifKey, (event) => {
        const bytes = this._hexToBytes(event?.value);
        if (bytes.length > 0) {
          console.log('[DGT] BLE received', bytes.length, 'bytes:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
          this._appendToBuffer(bytes);
          this._parseMessages();
        }
      });
      this._bleListeners.push(notifHandle);

      await BluetoothLe.startNotifications({
        deviceId: this._bleDeviceId,
        service: NUS_SERVICE,
        characteristic: NUS_TX_CHAR,
      });

      this.connected = true;
      this.connectionType = 'pegasus';
      this.boardType = 'pegasus';

      this._setStatus('Authenticating with ' + (device.name || 'DGT Pegasus') + '...');

      // Full Pegasus init: dev key → reset → board dump → enable updates
      await this._sendPegasusBytes([99, 7, 190, 245, 174, 221, 169, 95, 0]);
      await this._delay(200);
      await this._sendCommand(0x40); // CMD_RESET
      await this._delay(200);
      await this._sendCommand(DGT_SEND_BRD);
      await this._delay(500);
      await this._sendCommand(DGT_SEND_UPDATE_BRD);
      await this._delay(200);

      // Now notify the app — board is authenticated and ready
      this._setStatus('Connected via Bluetooth — ' + (device.name || 'DGT Pegasus'));
      if (this.onConnectionChange) this.onConnectionChange(true);

      // Start polling — the Pegasus needs periodic board dump requests
      this._startPegasusPolling();

      return true;
    } catch (err) {
      console.error('[DGT] Capacitor BLE error:', err);
      if (err.message?.includes('requestDevice') || err.message?.includes('cancel')) {
        this._setStatus('No device selected');
      } else {
        this._setStatus('Bluetooth failed: ' + err.message);
      }
      this._removeListeners();
      return false;
    }
  }

  disconnect() {
    this.clearLeds();
    clearTimeout(this.debounceTimer);
    clearTimeout(this._syncWarningTimer);
    this._stopPegasusPolling();

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
    } else if (this.connectionType === 'pegasus') {
      // Web Bluetooth cleanup
      if (this._webBtDevice) {
        try { this._webBtDevice.gatt.disconnect(); } catch {}
        this._webBtDevice = null;
        this._webBtRxChar = null;
        this._webBtTxChar = null;
      }
      // Capacitor plugin cleanup
      if (this._bleDeviceId && BluetoothLe) {
        try {
          BluetoothLe.stopNotifications({
            deviceId: this._bleDeviceId,
            service: NUS_SERVICE,
            characteristic: NUS_TX_CHAR,
          });
        } catch {}
        try { BluetoothLe.disconnect({ deviceId: this._bleDeviceId }); } catch {}
      }
      this._removeListeners();
      this._bleDeviceId = null;
    }

    this.connected = false;
    this.connectionType = null;
    this.rxBuffer = new Uint8Array(0);
    this.lastStableBoard = null;
    this._expectedGameBoard = null;
    this._sensorGaps = new Set();
    this._boardSynced = false;
    this.pendingEngineMove = null;
    clearTimeout(this._flashTimer);
    clearTimeout(this._castleTimer);
    clearTimeout(this._startPosTimer);
    this._startPosTimer = null;
    this._startPosDetected = false;

    if (this.onConnectionChange) this.onConnectionChange(false);
    this._setStatus('Disconnected');
  }

  /**
   * Called by main.js when engine makes a move.
   * Stores the move so we can guide the user to play it on the physical board.
   * Also lights up the from/to squares on the Pegasus board.
   */
  setEngineMoveToPlay(move) {
    this.pendingEngineMove = move;
    this._engineMovePhase = 'from';
    clearTimeout(this._flashTimer); // Cancel player confirmation flash
    if (this.boardType === 'pegasus' && move.from && move.to) {
      // Detect castling: king moves 2 squares horizontally
      const castleSquares = this._getCastleSquares(move);
      if (castleSquares) {
        this._showCastleLeds(castleSquares);
        this._engineMovePhase = null; // Castling uses its own LED sequencing
      } else {
        // Phase 1: light only the FROM square
        this.setLedSingle(move.from);
      }
    }
  }

  /**
   * Light up squares on the Pegasus board (from and to squares of a move).
   * @param {string} from - algebraic square (e.g. 'e2')
   * @param {string} to - algebraic square (e.g. 'e4')
   */
  async setLeds(from, to) {
    if (this.connectionType !== 'pegasus') return;
    const fromIdx = this._algebraicToDgtSquare(from);
    const toIdx = this._algebraicToDgtSquare(to);
    // LED ON: 0x60, length, 0x05, speed, blink, intensity, squares..., 0x00
    // speed=3, blink=0 (continuous), intensity=2
    const cmd = [0x60, 0x07, 0x05, 0x03, 0x00, 0x02, fromIdx, toIdx, 0x00];
    console.log('[DGT] LEDs on: ' + from + '(' + fromIdx + '), ' + to + '(' + toIdx + ')');
    await this._sendPegasusBytes(cmd);
  }

  /**
   * Light up a single square on the Pegasus board.
   * @param {string} square - algebraic square (e.g. 'e2')
   */
  async setLedSingle(square) {
    if (this.connectionType !== 'pegasus') return;
    const idx = this._algebraicToDgtSquare(square);
    const cmd = [0x60, 0x06, 0x05, 0x03, 0x00, 0x02, idx, 0x00];
    console.log('[DGT] LED single: ' + square + '(' + idx + ')');
    await this._sendPegasusBytes(cmd);
  }

  /**
   * Light up multiple squares on the Pegasus board (for castling etc).
   * @param {string[]} squares - array of algebraic squares
   * @param {boolean} flash - if true, single blink; if false, continuous pulse
   */
  async setLedsMulti(squares, flash) {
    if (this.connectionType !== 'pegasus' || !squares.length) return;
    const indices = squares.map(sq => this._algebraicToDgtSquare(sq));
    const n = indices.length;
    const blink = flash ? 0x01 : 0x00;
    // speed=3, intensity=2
    const cmd = [0x60, 5 + n, 0x05, 0x03, blink, 0x02, ...indices, 0x00];
    console.log('[DGT] LEDs multi (' + (flash ? 'flash' : 'pulse') + '): ' + squares.join(', '));
    await this._sendPegasusBytes(cmd);
  }

  /**
   * Sequential castling LED animation: king squares first, then rook squares added.
   * @param {string[]} squares - [kingFrom, kingTo, rookFrom, rookTo]
   */
  async _showCastleLeds(squares) {
    if (this.connectionType !== 'pegasus') return;
    clearTimeout(this._castleTimer);
    // Phase 1: light king from/to
    console.log('[DGT] Castle LEDs phase 1 (king): ' + squares[0] + ' → ' + squares[1]);
    await this.setLeds(squares[0], squares[1]);
    // Phase 2: after 2s, add rook squares (show all 4)
    this._castleTimer = setTimeout(() => {
      console.log('[DGT] Castle LEDs phase 2 (+ rook): ' + squares[2] + ' → ' + squares[3]);
      this.setLedsMulti(squares, false);
    }, 2000);
  }

  /**
   * Brief confirmation flash on from/to squares (for player moves).
   * Auto-clears after 1.5 seconds.
   */
  async flashLeds(from, to) {
    if (this.connectionType !== 'pegasus') return;
    clearTimeout(this._flashTimer);
    const fromIdx = this._algebraicToDgtSquare(from);
    const toIdx = this._algebraicToDgtSquare(to);
    // speed=3, blink=1 (single flash), intensity=2
    const cmd = [0x60, 0x07, 0x05, 0x03, 0x01, 0x02, fromIdx, toIdx, 0x00];
    console.log('[DGT] LED flash: ' + from + ' → ' + to);
    await this._sendPegasusBytes(cmd);
    this._flashTimer = setTimeout(() => this.clearLeds(), 600);
  }

  /**
   * Detect castling from a move (king moves 2 squares).
   * Returns [kingFrom, kingTo, rookFrom, rookTo] or null if not castling.
   */
  _getCastleSquares(move) {
    if (!move.from || !move.to) return null;
    const ff = move.from.charCodeAt(0) - 97; // file index 0-7
    const tf = move.to.charCodeAt(0) - 97;
    const rank = move.from[1];
    // King moves exactly 2 files = castling
    if (Math.abs(tf - ff) === 2) {
      if (tf > ff) {
        // King-side: king e→g, rook h→f
        return [move.from, move.to, 'h' + rank, 'f' + rank];
      } else {
        // Queen-side: king e→c, rook a→d
        return [move.from, move.to, 'a' + rank, 'd' + rank];
      }
    }
    return null;
  }

  /**
   * Speak a move aloud using the Web Speech API.
   * @param {string} san - move in Standard Algebraic Notation (e.g. "Nf3", "Bxe5+")
   */
  speakMove(san) {
    if (!window.speechSynthesis) return;
    if (localStorage.getItem('chess_voice_enabled') === 'false') return;

    const text = this._sanToSpeech(san);
    if (!text) return;

    // Chrome bug: cancel() immediately before speak() can silently kill the utterance.
    // Also Chrome pauses speechSynthesis after ~15s inactivity — resume() fixes it.
    speechSynthesis.cancel();
    speechSynthesis.resume();
    // Small delay after cancel so the engine is ready to accept new speech
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      speechSynthesis.speak(utterance);
    }, 50);
  }

  /**
   * Convert SAN notation to spoken English.
   * "Nf3" → "Knight f3", "Bxe5+" → "Bishop takes e5, check", "O-O" → "Castles kingside"
   */
  _sanToSpeech(san) {
    if (!san) return '';

    // Castling
    if (san.replace(/[+#]/, '').trim() === 'O-O-O') return 'Castles queenside';
    if (san.replace(/[+#]/, '').trim() === 'O-O') return 'Castles kingside';

    let s = san;
    let suffix = '';

    // Check / checkmate suffix
    if (s.endsWith('#')) { suffix = ', checkmate'; s = s.slice(0, -1); }
    else if (s.endsWith('+')) { suffix = ', check'; s = s.slice(0, -1); }

    // Promotion: e8=Q
    let promo = '';
    const promoIdx = s.indexOf('=');
    if (promoIdx !== -1) {
      const promoNames = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
      promo = ' promotes to ' + (promoNames[s[promoIdx + 1]] || s[promoIdx + 1]);
      s = s.slice(0, promoIdx);
    }

    // Piece name (uppercase first char)
    const pieceNames = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
    let piece = '';
    if (pieceNames[s[0]]) {
      piece = pieceNames[s[0]];
      s = s.slice(1);
    }

    // Capture
    const takes = s.includes('x');
    s = s.replace('x', '');

    // Destination is last 2 chars; anything before is disambiguation
    const dest = s.slice(-2);
    const disambig = s.slice(0, -2);

    // Build spoken text
    let text = '';
    if (piece) {
      text = piece + ' ';
    } else if (takes && disambig) {
      // Pawn capture: "e takes d5"
      text = disambig + ' ';
    }
    if (takes) text += 'takes ';
    text += dest + promo + suffix;

    return text;
  }

  /**
   * Turn off all LEDs on the Pegasus board.
   */
  async clearLeds() {
    if (this.connectionType !== 'pegasus') return;
    clearTimeout(this._flashTimer);
    clearTimeout(this._castleTimer);
    this._engineMovePhase = null;
    await this._sendPegasusBytes([0x60, 0x02, 0x00, 0x00]);
  }

  /**
   * Check if engine move guidance should advance from "from" to "to" phase.
   * Called from _onPhysicalBoardChanged when pendingEngineMove is set.
   * Returns true if handled (caller should return early).
   */
  checkEngineMovePhase() {
    if (!this.pendingEngineMove || !this._engineMovePhase) return false;
    const move = this.pendingEngineMove;
    const fromIdx = this._algebraicToDgtSquare(move.from);
    const toIdx = this._algebraicToDgtSquare(move.to);

    if (this._engineMovePhase === 'from') {
      // Check if piece was lifted from the FROM square
      if (this.dgtBoard[fromIdx] === 0) {
        console.log('[DGT] Engine move: piece lifted from ' + move.from + ' — showing TO: ' + move.to);
        this._engineMovePhase = 'to';
        this.setLedSingle(move.to);
        return true; // Handled — don't detect moves yet
      }
    }
    // Phase 'to': let the normal board-match check handle completion
    return false;
  }

  /**
   * Reset all board tracking state while keeping the BLE/Serial connection alive.
   * Use when the board gets into a bad state (wrong moves, sensor issues, etc.).
   */
  resetBoardState() {
    // Clear all tracking state
    this.dgtBoard = new Array(64).fill(0x00);
    this.lastStableBoard = null;
    this._expectedGameBoard = null;
    this._sensorGaps = new Set();
    this._boardSynced = false;
    this._startPosDetected = false;
    this.pendingEngineMove = null;
    this._engineMovePhase = null;
    this.rxBuffer = new Uint8Array(0);

    // Clear all timers
    clearTimeout(this.debounceTimer);
    clearTimeout(this._flashTimer);
    clearTimeout(this._castleTimer);
    clearTimeout(this._startPosTimer);
    clearTimeout(this._syncWarningTimer);
    this._startPosTimer = null;

    this.clearLeds();
    this._setStatus('Board state reset — syncing...');
    console.log('[DGT] Board state reset (connection preserved)');
  }

  /**
   * Sync lastStableBoard to the current game position and request a board dump.
   * Called when starting a new game or on connection.
   */
  syncToPosition(chess) {
    this._expectedGameBoard = this._gameToBoard(chess);
    this.lastStableBoard = [...this._expectedGameBoard];
    this._sensorGaps = new Set(); // Re-detect on each sync
    this._boardSynced = false;    // Need to re-sync with physical board
    this._startPosDetected = false;
    clearTimeout(this._startPosTimer);
    this._startPosTimer = null;
    this.pendingEngineMove = null;
    this._engineMovePhase = null;
    this.clearLeds();

    if ((this.connectionType === 'serial' && this.writer) ||
        this.connectionType === 'pegasus') {
      this._sendCommand(DGT_SEND_BRD);
    }
  }

  /**
   * Core move detection: compare DGT board state against all legal moves.
   * Works for both Professional (piece codes) and Pegasus (occupancy).
   * Returns { from, to, promotion } or null if no match.
   */
  detectMove(chess) {
    const legalMoves = chess.moves({ verbose: true });
    const matches = [];

    for (const move of legalMoves) {
      // Simulate move on temporary board
      const temp = new Chess(chess.fen());
      temp.move(move);

      const tempBoard = this._gameToBoard(temp);

      if (this._boardsMatch(tempBoard, this.dgtBoard)) {
        matches.push(move);
      }
    }

    console.log('[DGT] detectMove: ' + legalMoves.length + ' legal, ' + matches.length + ' matches' +
      (matches.length > 0 ? ' → ' + matches.map(m => m.san).join(', ') : ''));

    if (matches.length === 1) {
      this.lastStableBoard = [...this.dgtBoard];
      clearTimeout(this._syncWarningTimer);
      return { from: matches[0].from, to: matches[0].to, promotion: matches[0].promotion };
    }

    if (matches.length > 1) {
      const uniqueFromTo = new Set(matches.map(m => m.from + m.to));
      if (uniqueFromTo.size === 1) {
        // All same from/to — promotion with different piece types
        if (this.boardType === 'professional') {
          // Professional board: detect which piece is on the promotion square
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
        }

        // Pegasus or fallback: default to queen promotion
        const queenMove = matches.find(m => m.promotion === 'q') || matches[0];
        this.lastStableBoard = [...this.dgtBoard];
        clearTimeout(this._syncWarningTimer);
        return { from: queenMove.from, to: queenMove.to, promotion: queenMove.promotion };
      }

      // Multiple different from/to — for Pegasus, occupancy might match multiple moves.
      // Disambiguate: find the match whose FROM square is NOW EMPTY on the physical board
      // (was occupied before, now empty = that's the piece that actually moved)
      if (this.boardType === 'pegasus' && this.lastStableBoard) {
        const best = matches.find(m => {
          const fromIdx = this._algebraicToDgtSquare(m.from);
          return this.lastStableBoard[fromIdx] !== 0 && this.dgtBoard[fromIdx] === 0;
        });
        if (best) {
          this.lastStableBoard = [...this.dgtBoard];
          clearTimeout(this._syncWarningTimer);
          return { from: best.from, to: best.to, promotion: best.promotion };
        }
        // Still ambiguous — wait for more board state changes
        return null;
      } else if (this.boardType === 'pegasus') {
        const nonPromo = matches.find(m => !m.promotion) || matches[0];
        this.lastStableBoard = [...this.dgtBoard];
        clearTimeout(this._syncWarningTimer);
        return { from: nonPromo.from, to: nonPromo.to, promotion: nonPromo.promotion };
      }
    }

    // No match — board may be in transition or out of sync
    return null;
  }

  // === Protocol: Send Commands ===

  async _sendCommand(cmd) {
    if (this.connectionType === 'pegasus') {
      // Web Bluetooth path
      if (this._webBtRxChar) {
        try {
          await this._webBtRxChar.writeValueWithoutResponse(new Uint8Array([cmd]));
        } catch (err) {
          console.warn('DGT BLE send error:', err);
        }
        return;
      }
      // Capacitor plugin path
      if (BluetoothLe && this._bleDeviceId) {
        try {
          const hex = cmd.toString(16).padStart(2, '0');
          await BluetoothLe.writeWithoutResponse({
            deviceId: this._bleDeviceId,
            service: NUS_SERVICE,
            characteristic: NUS_RX_CHAR,
            value: hex,
          });
        } catch (err) {
          console.warn('DGT BLE send error:', err);
        }
        return;
      }
    }

    if (!this.writer) return;
    try {
      await this.writer.write(new Uint8Array([cmd]));
    } catch (err) {
      console.warn('DGT send error:', err);
    }
  }

  // === Protocol: Serial Read Loop ===

  async _serialReadLoop() {
    console.log('[DGT] _serialReadLoop starting, port.readable:', !!this.port?.readable);
    if (!this.port?.readable) return;

    this._readLoopActive = true;
    this.reader = this.port.readable.getReader();
    console.log('[DGT] Read loop active, waiting for data...');

    try {
      while (this._readLoopActive) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          console.log('[DGT] Serial received', value.length, 'bytes:', Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(' '));
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

  // === Protocol: Buffer & Message Parser ===

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
        this.rxBuffer = this.rxBuffer.slice(1);
        continue;
      }

      // Size: 7-bit MSB + 7-bit LSB (compatible with both Professional and Pegasus)
      const size = (this.rxBuffer[1] << 7) | this.rxBuffer[2];

      if (size < 3 || size > 256) {
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

    // Check if anything actually changed before updating
    let changed = false;
    for (let i = 0; i < 64; i++) {
      if (this.dgtBoard[i] !== payload[i]) changed = true;
      this.dgtBoard[i] = payload[i];
    }

    if (!this.lastStableBoard) {
      // First board dump after connection
      const occupied = this.dgtBoard.filter(v => v !== 0).length;
      console.log('[DGT] Initial board dump: ' + occupied + ' pieces, boardType=' + this.boardType);
      this._setStatus('Board connected (' + occupied + ' pieces)');
    } else if (changed) {
      console.log('[DGT] Board dump: state changed');
    }

    // Board dumps are reliable full snapshots — process immediately
    this._onBoardChanged();
  }

  _handleFieldUpdate(payload) {
    if (payload.length < 2) return;

    const square = payload[0]; // 0-63
    const piece = payload[1];  // piece code (Professional) or 0/1 (Pegasus)
    console.log('[DGT] Field update: square=' + square + ' (' + this._dgtSquareToAlgebraic(square) + ') piece=0x' + piece.toString(16));

    if (square >= 0 && square < 64) {
      this.dgtBoard[square] = piece;
    }

    // Debounce: moving a piece causes multiple updates (lift + place)
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this._onBoardChanged(), this.debounceMs);
  }

  // === LiveChess WebSocket ===

  _handleLiveChessMessage(data) {
    if (data.response === 'call' && data.id === 1) {
      this._setStatus('Subscribed to board events');
      return;
    }

    if (data.param?.board) {
      this.dgtBoard = this._fenToBoard(data.param.board);
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._onBoardChanged(), this.debounceMs);
    }

    if (data.param?.fen) {
      this.dgtBoard = this._fenToBoard(data.param.fen);
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this._onBoardChanged(), this.debounceMs);
    }
  }

  _fenToBoard(fen) {
    const board = new Array(64).fill(0x00);
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

  /**
   * Check if the physical board matches the starting position.
   * Pegasus: rows 0-1 (ranks 8-7) and rows 6-7 (ranks 2-1) occupied, rest empty.
   */
  _isStartingPosition() {
    for (let i = 0; i < 64; i++) {
      if (this._sensorGaps.has(i)) continue;
      const row = Math.floor(i / 8);
      const expected = (row <= 1 || row >= 6) ? 1 : 0;
      if (this.dgtBoard[i] !== expected) return false;
    }
    return true;
  }

  _onBoardChanged() {
    // Starting position detection: if board is synced (game in progress) and pieces
    // are reset to starting position, fire callback after 2s stable confirmation.
    if (this._boardSynced && this.boardType === 'pegasus') {
      if (this._isStartingPosition()) {
        if (!this._startPosDetected) {
          if (!this._startPosTimer) {
            console.log('[DGT] Starting position detected — confirming (2s)...');
            this._startPosTimer = setTimeout(() => {
              this._startPosTimer = null;
              if (this._isStartingPosition()) {
                this._startPosDetected = true;
                console.log('[DGT] Starting position confirmed — firing callback');
                this._setStatus('Starting position — ready for new game');
                if (this.onStartingPositionDetected) {
                  this.onStartingPositionDetected();
                }
              }
            }, 2000);
          }
        }
        this.lastStableBoard = [...this.dgtBoard];
        return;
      } else {
        // Board moved away from starting position — reset detection
        clearTimeout(this._startPosTimer);
        this._startPosTimer = null;
        this._startPosDetected = false;
      }
    }

    // Layer 1: Initial sync check — only runs BEFORE board is synced.
    // Once synced, all board changes flow to move detection (Layers 2-3).
    // This prevents intermediate castling states from being absorbed as sensor gaps.
    if (!this._boardSynced && this._expectedGameBoard && this.boardType === 'pegasus') {
      let mismatches = 0;
      const gaps = new Set();
      for (let i = 0; i < 64; i++) {
        if (this._expectedGameBoard[i] !== this.dgtBoard[i]) {
          mismatches++;
          gaps.add(i);
        }
      }
      if (mismatches <= 2) {
        // Close enough — record any mismatching squares as sensor gaps
        this._sensorGaps = gaps;
        this._boardSynced = true;
        if (gaps.size > 0) {
          const names = [...gaps].map(i => this._dgtSquareToAlgebraic(i)).join(', ');
          console.log('[DGT] Board synced (' + gaps.size + ' sensor gap: ' + names + ')');
        } else {
          console.log('[DGT] Board synced to game position!');
        }
        this._setStatus('Board synced — ready to play');
        this.lastStableBoard = [...this.dgtBoard];
        clearTimeout(this._syncWarningTimer);
        return;
      }
    }

    // No change from last stable state (skipping sensor gap squares)
    if (this.lastStableBoard && this._boardsMatch(this.lastStableBoard, this.dgtBoard)) {
      clearTimeout(this._syncWarningTimer);
      return;
    }

    // Count how many squares differ (excluding sensor gaps)
    let diffCount = 0;
    if (this.lastStableBoard) {
      for (let i = 0; i < 64; i++) {
        if (this._sensorGaps.has(i)) continue;
        if (this.dgtBoard[i] !== this.lastStableBoard[i]) diffCount++;
      }
    }

    // Large diff (>4 squares) = board is out of sync with game, not a move in progress.
    // A normal move changes 1-2 squares, castling changes 4.
    if (diffCount > 4) {
      const actual = this.dgtBoard.filter(v => v !== 0).length;
      console.log('[DGT] Board out of sync (' + diffCount + ' squares differ, ' + actual + ' pieces)');
      this.lastStableBoard = [...this.dgtBoard];
      clearTimeout(this._syncWarningTimer);
      this._setStatus('Board has ' + actual + ' pieces — arrange starting position');
      return;
    }

    // Small diff (1-4 squares) = likely a move in progress. Try to detect.
    console.log('[DGT] Board changed (' + diffCount + ' squares) — detecting move...');
    if (this._onPhysicalBoardChanged) {
      this._onPhysicalBoardChanged();
    }

    clearTimeout(this._syncWarningTimer);
    this._syncWarningTimer = setTimeout(() => {
      this._setStatus('Board doesn\'t match game. Please correct your board.');
    }, 5000);
  }

  // === Helpers ===

  /**
   * Convert a chess.js game position to a board array.
   * Professional: piece codes (0x00-0x0C)
   * Pegasus: occupancy (0=empty, 1=occupied)
   */
  _gameToBoard(chess) {
    const board = chess.board();
    const arr = new Array(64);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = r * 8 + c;
        const piece = board[r][c];
        if (this.boardType === 'pegasus') {
          arr[idx] = piece ? 1 : 0;
        } else {
          arr[idx] = piece ? (PIECE_TO_DGT[piece.color + piece.type] || 0x00) : 0x00;
        }
      }
    }
    return arr;
  }

  /** Legacy alias for _gameToBoard (used by main.js for engine move sync) */
  _chessJsToArray(chess) {
    return this._gameToBoard(chess);
  }

  _boardsMatch(a, b) {
    for (let i = 0; i < 64; i++) {
      if (this._sensorGaps.has(i)) continue; // Skip squares with known sensor issues
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  _dgtSquareToAlgebraic(sq) {
    const file = sq % 8;
    const rank = 8 - Math.floor(sq / 8);
    return String.fromCharCode(97 + file) + rank;
  }

  _algebraicToDgtSquare(sq) {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1]);
    return (8 - rank) * 8 + file;
  }

  _bytesToString(bytes) {
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('').trim();
  }

  /** Convert hex string (from BLE plugin) to Uint8Array */
  _hexToBytes(hex) {
    if (!hex || typeof hex !== 'string') return new Uint8Array(0);
    const clean = hex.replace(/\s/g, '');
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /** Send a multi-byte command to the Pegasus board */
  async _sendPegasusBytes(byteArray) {
    const data = new Uint8Array(byteArray);
    // Web Bluetooth path
    if (this._webBtRxChar) {
      try {
        await this._webBtRxChar.writeValueWithoutResponse(data);
      } catch (err) {
        console.warn('DGT BLE multi-byte send error:', err);
      }
      return;
    }
    // Capacitor plugin path
    if (BluetoothLe && this._bleDeviceId) {
      try {
        const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
        await BluetoothLe.writeWithoutResponse({
          deviceId: this._bleDeviceId,
          service: NUS_SERVICE,
          characteristic: NUS_RX_CHAR,
          value: hex,
        });
      } catch (err) {
        console.warn('DGT BLE multi-byte send error:', err);
      }
    }
  }

  /** Remove all BLE event listeners */
  _removeListeners() {
    for (const handle of this._bleListeners) {
      try { handle.remove(); } catch {}
    }
    this._bleListeners = [];
  }

  /** Start polling the Pegasus board state every 500ms */
  _startPegasusPolling() {
    this._stopPegasusPolling();
    this._pollInterval = setInterval(() => {
      if (this.connected && this.connectionType === 'pegasus') {
        this._sendCommand(DGT_SEND_BRD);
      } else {
        this._stopPegasusPolling();
      }
    }, 500);
  }

  /** Stop the Pegasus polling interval */
  _stopPegasusPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  /** Simple delay helper */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _setStatus(msg) {
    if (this.onStatusChange) this.onStatusChange(msg);
  }
}
