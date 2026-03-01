// Multiplayer — Native WebSocket for online play
import { apiFetch, getAccessToken, getWsBase } from './api-client.js';

export class MultiplayerManager {
  constructor() {
    this._ws = null;
    this.channel = null; // kept for isActive() compat — set to ws
    this.gameCode = null;
    this.gameId = null;
    this.role = null;       // 'host' or 'guest'
    this.myColor = null;    // 'w' or 'b'
    this.opponentName = null;
    this.connected = false;
    this._timerSyncInterval = null;

    // Callbacks (set by main.js)
    this.onOpponentJoined = null;
    this.onOpponentMove = null;
    this.onOpponentResigned = null;
    this.onDrawOffered = null;
    this.onDrawResponse = null;
    this.onOpponentDisconnected = null;
    this.onOpponentReconnected = null;
    this.onTimerSync = null;
    this.onError = null;
  }

  // === Public API ===

  /**
   * Create a new multiplayer game.
   * Returns { code, color } on success.
   */
  async createGame(playerName, color, timeControl, increment) {
    const code = this._generateCode();
    this.gameCode = code;
    this.role = 'host';
    this.myColor = color;

    try {
      const res = await apiFetch('/multiplayer/games', {
        method: 'POST',
        body: JSON.stringify({ code, color, timeControl, increment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const data = await res.json();
      this.gameId = data.id;
    } catch (err) {
      if (this.onError) this.onError('Failed to create game: ' + err.message);
      return null;
    }

    await this._connect(code, playerName);
    return { code, color };
  }

  /**
   * Join an existing game by code.
   * Returns { color, timeControl, increment } on success.
   */
  async joinGame(code, playerName) {
    code = code.toUpperCase().trim();
    this.gameCode = code;
    this.role = 'guest';

    let gameData;
    try {
      const res = await apiFetch('/multiplayer/games/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (this.onError) this.onError(data.error || 'Game not found or already started');
        return null;
      }

      gameData = await res.json();
    } catch (err) {
      if (this.onError) this.onError('Failed to find game: ' + err.message);
      return null;
    }

    this.gameId = gameData.id;
    this.myColor = gameData.hostColor === 'w' ? 'b' : 'w';

    await this._connect(code, playerName);

    // Notify host that we joined
    this._send({ event: 'player-joined', payload: { name: playerName } });

    return {
      color: this.myColor,
      timeControl: gameData.timeControl,
      increment: gameData.increment,
    };
  }

  /** Send a move to the opponent. */
  sendMove(move) {
    this._send({
      event: 'move',
      payload: { from: move.from, to: move.to, promotion: move.promotion, san: move.san },
    });
  }

  /** Send resignation. */
  sendResign() {
    this._send({ event: 'resign', payload: {} });
  }

  /** Send draw offer. */
  sendDrawOffer() {
    this._send({ event: 'draw-offer', payload: {} });
  }

  /** Send draw response. */
  sendDrawResponse(accepted) {
    this._send({ event: 'draw-response', payload: { accepted } });
  }

  /** Send timer sync (host only). */
  sendTimerSync(timers) {
    if (this.role !== 'host') return;
    this._send({ event: 'timer-sync', payload: { timers } });
  }

  /** Archive game result to database. */
  async archiveGame(result, pgn) {
    if (!this.gameId) return;
    try {
      await apiFetch(`/multiplayer/games/${this.gameId}`, {
        method: 'PUT',
        body: JSON.stringify({ result, pgn }),
      });
    } catch (err) {
      console.warn('Failed to archive multiplayer game:', err);
    }
  }

  /** Disconnect from the game channel. */
  disconnect() {
    if (this._timerSyncInterval) {
      clearInterval(this._timerSyncInterval);
      this._timerSyncInterval = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.channel = null;
    this.gameCode = null;
    this.gameId = null;
    this.role = null;
    this.myColor = null;
    this.opponentName = null;
    this.connected = false;
  }

  /** Check if currently in a multiplayer game. */
  isActive() {
    return this._ws !== null;
  }

  // === Private ===

  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  _send(msg) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(msg));
    }
  }

  _connect(code, playerName) {
    return new Promise((resolve, reject) => {
      const token = getAccessToken();
      const wsBase = getWsBase();
      const params = new URLSearchParams({
        game: code,
        token,
        name: playerName,
        role: this.role,
      });

      const ws = new WebSocket(`${wsBase}?${params}`);
      this._ws = ws;
      this.channel = ws; // for isActive() compat

      ws.onopen = () => {
        this.connected = true;
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._handleMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (this._ws === ws) {
          this.connected = false;
          // Only fire disconnect if we still think we're in a game
          if (this.gameCode) {
            if (this.onOpponentDisconnected) this.onOpponentDisconnected();
          }
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        if (this.onError) this.onError('Connection error');
        reject(err);
      };
    });
  }

  _handleMessage(msg) {
    const { event, payload } = msg;

    switch (event) {
      case 'player-joined':
        this.opponentName = payload.name;
        this.connected = true;
        if (this.onOpponentJoined) this.onOpponentJoined(payload.name);
        break;

      case 'presence-join':
        // Existing player already in channel when we connect
        if (payload.role !== this.role) {
          this.opponentName = payload.name;
          this.connected = true;
          if (this.onOpponentReconnected) this.onOpponentReconnected();
        }
        break;

      case 'presence-leave':
        if (payload.role !== this.role) {
          this.connected = false;
          if (this.onOpponentDisconnected) this.onOpponentDisconnected();
        }
        break;

      case 'move':
        if (this.onOpponentMove) this.onOpponentMove(payload);
        break;

      case 'resign':
        if (this.onOpponentResigned) this.onOpponentResigned();
        break;

      case 'draw-offer':
        if (this.onDrawOffered) this.onDrawOffered();
        break;

      case 'draw-response':
        if (this.onDrawResponse) this.onDrawResponse(payload.accepted);
        break;

      case 'timer-sync':
        if (this.onTimerSync) this.onTimerSync(payload.timers);
        break;

      default:
        break;
    }
  }

  /**
   * Start host-authoritative timer sync (call after game starts).
   * @param {Function} getTimers - returns current { w, b } timer values
   */
  startTimerSync(getTimers) {
    if (this.role !== 'host' || this._timerSyncInterval) return;
    this._timerSyncInterval = setInterval(() => {
      const timers = getTimers();
      if (timers) this.sendTimerSync(timers);
    }, 5000);
  }
}
