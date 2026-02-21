// Multiplayer — Supabase Realtime (Broadcast + Presence) for online play

export class MultiplayerManager {
  constructor(supabase) {
    this._sb = supabase;
    this.channel = null;
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

    // Insert game row
    try {
      const { data, error } = await this._sb
        .from('multiplayer_games')
        .insert({
          code,
          host_id: await this._uid(),
          host_color: color,
          time_control: timeControl,
          increment,
          status: 'waiting'
        })
        .select('id')
        .single();

      if (error) throw error;
      this.gameId = data.id;
    } catch (err) {
      if (this.onError) this.onError('Failed to create game: ' + err.message);
      return null;
    }

    await this._subscribe(code, playerName);
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

    // Find waiting game
    let gameRow;
    try {
      const { data, error } = await this._sb
        .from('multiplayer_games')
        .select('*')
        .eq('code', code)
        .eq('status', 'waiting')
        .single();

      if (error || !data) {
        if (this.onError) this.onError('Game not found or already started');
        return null;
      }
      gameRow = data;
    } catch (err) {
      if (this.onError) this.onError('Failed to find game: ' + err.message);
      return null;
    }

    // Update game row
    try {
      await this._sb
        .from('multiplayer_games')
        .update({ guest_id: await this._uid(), status: 'playing' })
        .eq('id', gameRow.id);
    } catch (err) {
      if (this.onError) this.onError('Failed to join game: ' + err.message);
      return null;
    }

    this.gameId = gameRow.id;
    this.myColor = gameRow.host_color === 'w' ? 'b' : 'w';

    await this._subscribe(code, playerName);

    // Notify host that we joined
    this.channel.send({
      type: 'broadcast',
      event: 'player-joined',
      payload: { name: playerName }
    });

    return {
      color: this.myColor,
      timeControl: gameRow.time_control,
      increment: gameRow.increment
    };
  }

  /** Send a move to the opponent. */
  sendMove(move) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'move',
      payload: { from: move.from, to: move.to, promotion: move.promotion, san: move.san }
    });
  }

  /** Send resignation. */
  sendResign() {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'resign',
      payload: {}
    });
  }

  /** Send draw offer. */
  sendDrawOffer() {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'draw-offer',
      payload: {}
    });
  }

  /** Send draw response. */
  sendDrawResponse(accepted) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'draw-response',
      payload: { accepted }
    });
  }

  /** Send timer sync (host only). */
  sendTimerSync(timers) {
    if (!this.channel || this.role !== 'host') return;
    this.channel.send({
      type: 'broadcast',
      event: 'timer-sync',
      payload: { timers }
    });
  }

  /** Archive game result to database. */
  async archiveGame(result, pgn) {
    if (!this.gameId) return;
    try {
      await this._sb
        .from('multiplayer_games')
        .update({ result, pgn, status: 'finished' })
        .eq('id', this.gameId);
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
    if (this.channel) {
      this._sb.removeChannel(this.channel);
      this.channel = null;
    }
    this.gameCode = null;
    this.gameId = null;
    this.role = null;
    this.myColor = null;
    this.opponentName = null;
    this.connected = false;
  }

  /** Check if currently in a multiplayer game. */
  isActive() {
    return this.channel !== null;
  }

  // === Private ===

  async _uid() {
    try {
      const { data } = await this._sb.auth.getUser();
      return data?.user?.id || null;
    } catch {
      return null;
    }
  }

  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  _subscribe(code, playerName) {
    return new Promise((resolve) => {
      const channelName = `game:${code}`;

      this.channel = this._sb.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      // Broadcast listeners
      this.channel.on('broadcast', { event: 'move' }, ({ payload }) => {
        if (this.onOpponentMove) this.onOpponentMove(payload);
      });

      this.channel.on('broadcast', { event: 'resign' }, () => {
        if (this.onOpponentResigned) this.onOpponentResigned();
      });

      this.channel.on('broadcast', { event: 'draw-offer' }, () => {
        if (this.onDrawOffered) this.onDrawOffered();
      });

      this.channel.on('broadcast', { event: 'draw-response' }, ({ payload }) => {
        if (this.onDrawResponse) this.onDrawResponse(payload.accepted);
      });

      this.channel.on('broadcast', { event: 'timer-sync' }, ({ payload }) => {
        if (this.onTimerSync) this.onTimerSync(payload.timers);
      });

      this.channel.on('broadcast', { event: 'player-joined' }, ({ payload }) => {
        this.opponentName = payload.name;
        this.connected = true;
        if (this.onOpponentJoined) this.onOpponentJoined(payload.name);
      });

      // Presence for disconnect detection
      this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const opponent = leftPresences.find(p => p.role !== this.role);
        if (opponent) {
          this.connected = false;
          if (this.onOpponentDisconnected) this.onOpponentDisconnected();
        }
      });

      this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        const opponent = newPresences.find(p => p.role !== this.role);
        if (opponent) {
          this.connected = true;
          if (this.onOpponentReconnected) this.onOpponentReconnected();
        }
      });

      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track({ name: playerName, role: this.role });
          resolve();
        }
      });
    });
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
