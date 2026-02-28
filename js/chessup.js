// ChessUp Smart Board — BLE integration (reverse-engineering scaffold)
// Protocol is unpublished; this module discovers all services/characteristics
// and logs raw notifications for protocol analysis.

const CU_NAME_PREFIX = 'ChessUp';

// Broad service list for discovery — Nordic UART, Battery, Device Info
const CU_OPTIONAL_SERVICES = [
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
  0x180f, // Battery Service
  0x180a, // Device Information
];

const CU_NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const CU_NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const CU_ASSISTANCE_LEVELS = {
  none: 0,
  beginner: 1,
  casual: 2,
  intermediate: 3,
  advanced: 4,
  master: 5,
};

export class ChessUpBoard {
  static HARDWARE_DEFAULTS = {
    ledBrightness: 3,
    assistanceLevel: 'none',
    playerLedMode: 'both',
    engineLedMode: 'sequential',
    moveDelay: 300,
    autoReconnect: true,
    bleTimeout: 10000,
  };

  constructor() {
    // Connection state
    this._device = null;
    this._server = null;
    this._notifyChars = [];
    this._writeChar = null;
    this._discoveredServices = [];
    this._intentionalDisconnect = false;
    this._reconnectTimer = null;
    this._moveDelayTimer = null;
    this.connected = false;

    // Move state
    this._pendingMove = null;
    this.pendingEngineMove = null;

    // Callbacks (same 4-callback contract as DGTBoard)
    this.onStatusChange = () => {};
    this.onConnectionChange = () => {};
    this._onPhysicalBoardChanged = () => {};
    this.onStartingPositionDetected = () => {};

    // Load saved settings
    this._loadHardwareSettings();
  }

  // --- Settings ---

  _loadHardwareSettings() {
    const saved = localStorage.getItem('chessup_hardware_settings');
    const defaults = ChessUpBoard.HARDWARE_DEFAULTS;
    const settings = saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
    this.ledBrightness = settings.ledBrightness;
    this.assistanceLevel = settings.assistanceLevel;
    this.playerLedMode = settings.playerLedMode;
    this.engineLedMode = settings.engineLedMode;
    this.moveDelay = settings.moveDelay;
    this.autoReconnect = settings.autoReconnect;
    this.bleTimeout = settings.bleTimeout;
  }

  _saveHardwareSettings() {
    const settings = {
      ledBrightness: this.ledBrightness,
      assistanceLevel: this.assistanceLevel,
      playerLedMode: this.playerLedMode,
      engineLedMode: this.engineLedMode,
      moveDelay: this.moveDelay,
      autoReconnect: this.autoReconnect,
      bleTimeout: this.bleTimeout,
    };
    localStorage.setItem('chessup_hardware_settings', JSON.stringify(settings));
  }

  setHardwareSetting(key, value) {
    if (key in ChessUpBoard.HARDWARE_DEFAULTS) {
      this[key] = value;
      this._saveHardwareSettings();
    }
  }

  resetHardwareDefaults() {
    const defaults = ChessUpBoard.HARDWARE_DEFAULTS;
    Object.keys(defaults).forEach(k => { this[k] = defaults[k]; });
    this._saveHardwareSettings();
  }

  // --- BLE Connection ---

  async connect() {
    if (!navigator.bluetooth) {
      this._setStatus('Web Bluetooth not available');
      return;
    }

    this._setStatus('Scanning for ChessUp board...');
    this._intentionalDisconnect = false;

    try {
      this._device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: CU_NAME_PREFIX }],
        optionalServices: CU_OPTIONAL_SERVICES,
      });

      this._setStatus('Connecting to ' + (this._device.name || 'ChessUp') + '...');

      this._device.addEventListener('gattserverdisconnected', () => this._onGattDisconnected());

      this._server = await this._device.gatt.connect();

      await this._discoverAllServices(this._server);

      this.connected = true;
      this._setStatus('Connected to ' + (this._device.name || 'ChessUp'));
      this.onConnectionChange(true);

    } catch (err) {
      console.error('[CU] Connection error:', err);
      this._setStatus('Connection failed: ' + err.message);
      this.connected = false;
    }
  }

  async _discoverAllServices(server) {
    this._discoveredServices = [];
    this._notifyChars = [];
    this._writeChar = null;

    let services;
    try {
      services = await server.getPrimaryServices();
    } catch (err) {
      console.warn('[CU] getPrimaryServices failed:', err);
      return;
    }

    console.log(`[CU] Discovered ${services.length} service(s)`);

    for (const service of services) {
      const svcUuid = service.uuid;
      console.log(`[CU] Service: ${svcUuid}`);

      let characteristics;
      try {
        characteristics = await service.getCharacteristics();
      } catch (err) {
        console.warn(`[CU]   getCharacteristics failed for ${svcUuid}:`, err);
        continue;
      }

      const charInfos = [];

      for (const char of characteristics) {
        const props = char.properties;
        const propList = [];
        if (props.read) propList.push('READ');
        if (props.write) propList.push('WRITE');
        if (props.writeWithoutResponse) propList.push('WRITE_NO_RESP');
        if (props.notify) propList.push('NOTIFY');
        if (props.indicate) propList.push('INDICATE');

        console.log(`[CU]   Char: ${char.uuid} [${propList.join(', ')}]`);

        charInfos.push({ uuid: char.uuid, properties: propList });

        // Subscribe to all NOTIFY characteristics
        if (props.notify || props.indicate) {
          try {
            await char.startNotifications();
            char.addEventListener('characteristicvaluechanged', (event) => {
              this._onNotification(svcUuid, char.uuid, event.target.value);
            });
            this._notifyChars.push(char);
            console.log(`[CU]   Subscribed to notifications on ${char.uuid}`);
          } catch (err) {
            console.warn(`[CU]   Failed to subscribe ${char.uuid}:`, err);
          }
        }

        // Pick first WRITE characteristic
        if (!this._writeChar && (props.writeWithoutResponse || props.write)) {
          this._writeChar = char;
          console.log(`[CU]   Selected write characteristic: ${char.uuid}`);
        }
      }

      this._discoveredServices.push({ uuid: svcUuid, characteristics: charInfos });
    }

    console.log(`[CU] Discovery complete: ${this._discoveredServices.length} services, ${this._notifyChars.length} notify chars`);
  }

  // --- Notifications ---

  _onNotification(serviceUuid, charUuid, dataView) {
    const bytes = new Uint8Array(dataView.buffer);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`[CU] Notification [${charUuid}]: ${hex} (${bytes.length} bytes)`);

    const move = this._parseNotification(serviceUuid, charUuid, bytes);
    if (move) {
      this._pendingMove = move;
      clearTimeout(this._moveDelayTimer);
      this._moveDelayTimer = setTimeout(() => {
        this._onPhysicalBoardChanged();
      }, this.moveDelay);
    }
  }

  _parseNotification(serviceUuid, charUuid, bytes) {
    // Protocol unknown — return null until reverse-engineered.
    // All raw notifications are logged above for analysis.
    //
    // Hypothesis: 2-byte move format
    // byte[0] = from square (0-63, a1=0, h8=63)
    // byte[1] = to square (0-63)
    //
    // When protocol is confirmed, uncomment and adjust:
    //
    // if (bytes.length >= 2) {
    //   const from = this._idxToAlgebraic(bytes[0]);
    //   const to = this._idxToAlgebraic(bytes[1]);
    //   if (from && to) {
    //     console.log(`[CU] Parsed move: ${from} -> ${to}`);
    //     return { from, to };
    //   }
    // }

    return null;
  }

  // --- Move Interface ---

  getLastMove() {
    const move = this._pendingMove;
    this._pendingMove = null;
    return move;
  }

  // --- Write ---

  async _writeTo(bytes) {
    if (!this._writeChar) {
      console.warn('[CU] No write characteristic available');
      return;
    }
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    try {
      if (this._writeChar.properties.writeWithoutResponse) {
        await this._writeChar.writeValueWithoutResponse(data);
      } else {
        await this._writeChar.writeValueWithResponse(data);
      }
      console.log(`[CU] Wrote ${data.length} bytes`);
    } catch (err) {
      console.error('[CU] Write error:', err);
    }
  }

  // --- LED Stubs ---

  setLeds(from, to) {
    console.log(`[CU] setLeds(${from}, ${to}) — stub, protocol unknown`);
    // TODO: Send LED command when protocol is known
  }

  clearLeds() {
    console.log('[CU] clearLeds() — stub, protocol unknown');
  }

  setAssistanceLevel(level) {
    const code = CU_ASSISTANCE_LEVELS[level];
    if (code === undefined) {
      console.warn(`[CU] Unknown assistance level: ${level}`);
      return;
    }
    this.assistanceLevel = level;
    this._saveHardwareSettings();
    console.log(`[CU] setAssistanceLevel(${level} = ${code}) — stub, protocol unknown`);
  }

  // --- Disconnect / Reconnect ---

  disconnect() {
    this._intentionalDisconnect = true;
    clearTimeout(this._reconnectTimer);
    clearTimeout(this._moveDelayTimer);

    if (this._device?.gatt?.connected) {
      this._device.gatt.disconnect();
    }

    this._resetState();
    this._setStatus('Disconnected');
    this.onConnectionChange(false);
  }

  _resetState() {
    this.connected = false;
    this._server = null;
    this._notifyChars = [];
    this._writeChar = null;
    this._pendingMove = null;
    this.pendingEngineMove = null;
  }

  _onGattDisconnected() {
    console.log('[CU] GATT disconnected');
    this._resetState();
    this.onConnectionChange(false);

    if (this.autoReconnect && !this._intentionalDisconnect) {
      this._setStatus('Connection lost — reconnecting in 3s...');
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = setTimeout(() => this._attemptReconnect(), 3000);
    } else {
      this._setStatus('Disconnected');
    }
  }

  async _attemptReconnect() {
    if (!this._device?.gatt) {
      this._setStatus('Cannot reconnect — no device');
      return;
    }
    this._setStatus('Reconnecting...');
    try {
      this._server = await this._device.gatt.connect();
      await this._discoverAllServices(this._server);
      this.connected = true;
      this._setStatus('Reconnected to ' + (this._device.name || 'ChessUp'));
      this.onConnectionChange(true);
    } catch (err) {
      console.error('[CU] Reconnect failed:', err);
      this._setStatus('Reconnect failed — retry in 5s...');
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = setTimeout(() => this._attemptReconnect(), 5000);
    }
  }

  // --- Debug / Discovery ---

  async discoverServicesDebug() {
    if (!this._server?.connected) {
      return 'Not connected';
    }
    await this._discoverAllServices(this._server);
    const lines = [];
    for (const svc of this._discoveredServices) {
      lines.push(`Service: ${svc.uuid}`);
      for (const ch of svc.characteristics) {
        lines.push(`  ${ch.uuid} [${ch.properties.join(', ')}]`);
      }
    }
    return lines.join('\n') || 'No services found';
  }

  // --- Helpers ---

  isConnected() {
    return this.connected && this._device?.gatt?.connected;
  }

  _idxToAlgebraic(idx) {
    if (idx < 0 || idx > 63) return null;
    const file = String.fromCharCode(97 + (idx % 8)); // a-h
    const rank = Math.floor(idx / 8) + 1; // 1-8
    return file + rank;
  }

  _setStatus(msg) {
    console.log('[CU] Status:', msg);
    this.onStatusChange(msg);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
