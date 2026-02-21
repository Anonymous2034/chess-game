// Sound effects — Web Audio API synthesis, no external files needed

const STORAGE_KEY = 'chess_sound_muted';

export class SoundManager {
  constructor() {
    this._ctx = null;
    this._muted = false;
    this._load();
  }

  // === Public API ===

  /**
   * Classify a move and play the appropriate sound.
   * Priority: checkmate > check > promotion > capture > castle > move
   */
  playMoveSound(move) {
    if (this._muted) return;

    const san = move.san || '';
    const flags = move.flags || '';

    if (san.includes('#'))                              { this._playCheckmate(); return; }
    if (san.includes('+'))                              { this._playCheck();     return; }
    if (flags.includes('p'))                            { this._playPromotion(); return; }
    if (flags.includes('c') || flags.includes('e'))     { this._playCapture();   return; }
    if (flags.includes('k') || flags.includes('q'))     { this._playCastle();    return; }
    this._playMove();
  }

  /**
   * Play after game ends (draw, stalemate, timeout).
   * Checkmate sound is already handled by playMoveSound.
   */
  playGameOverSound() {
    if (this._muted) return;
    this._playGameOver();
  }

  /** Play when a new game starts. */
  playGameStartSound() {
    if (this._muted) return;
    this._playGameStart();
  }

  /** Toggle mute state; returns new muted value. */
  toggleMute() {
    this._muted = !this._muted;
    this._save();
    return this._muted;
  }

  get muted() {
    return this._muted;
  }

  // === AudioContext ===

  _getContext() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  // === Core Synthesis Helper ===

  _scheduleNote(frequency, type, startTime, duration, gainPeak, releaseTime) {
    const ctx = this._getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
    gain.gain.setValueAtTime(gainPeak, startTime + duration - releaseTime);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // === Sound Definitions ===

  /** Regular move — soft woody click */
  _playMove() {
    const t = this._getContext().currentTime;
    this._scheduleNote(520, 'triangle', t, 0.08, 0.25, 0.06);
  }

  /** Capture — sharper percussive hit */
  _playCapture() {
    const t = this._getContext().currentTime;
    this._scheduleNote(440, 'sine',     t, 0.12, 0.35, 0.08);
    this._scheduleNote(660, 'triangle', t, 0.10, 0.20, 0.07);
  }

  /** Castle — two-note slide */
  _playCastle() {
    const t = this._getContext().currentTime;
    this._scheduleNote(440, 'triangle', t,        0.09, 0.28, 0.06);
    this._scheduleNote(550, 'triangle', t + 0.07, 0.09, 0.28, 0.06);
  }

  /** Check — urgent alert ping */
  _playCheck() {
    const t = this._getContext().currentTime;
    this._scheduleNote(880, 'sine', t,        0.12, 0.40, 0.05);
    this._scheduleNote(740, 'sine', t + 0.10, 0.10, 0.30, 0.05);
  }

  /** Checkmate — dramatic descending three-note phrase */
  _playCheckmate() {
    const t = this._getContext().currentTime;
    this._scheduleNote(660, 'sawtooth', t,        0.18, 0.35, 0.10);
    this._scheduleNote(550, 'sawtooth', t + 0.14, 0.18, 0.35, 0.10);
    this._scheduleNote(440, 'sawtooth', t + 0.28, 0.22, 0.35, 0.14);
  }

  /** Promotion — ascending major arpeggio */
  _playPromotion() {
    const t = this._getContext().currentTime;
    this._scheduleNote(440, 'triangle', t,        0.14, 0.30, 0.08);
    this._scheduleNote(554, 'triangle', t + 0.10, 0.14, 0.30, 0.08);
    this._scheduleNote(659, 'triangle', t + 0.20, 0.18, 0.30, 0.10);
  }

  /** Game over / draw — long fading tone */
  _playGameOver() {
    const t = this._getContext().currentTime;
    this._scheduleNote(330, 'sine', t, 0.6, 0.25, 0.40);
  }

  /** Game start — subtle rising two-note */
  _playGameStart() {
    const t = this._getContext().currentTime;
    this._scheduleNote(440, 'triangle', t,        0.12, 0.22, 0.08);
    this._scheduleNote(550, 'triangle', t + 0.12, 0.14, 0.22, 0.10);
  }

  // === Persistence ===

  _load() {
    try {
      this._muted = localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      this._muted = false;
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this._muted));
    } catch {}
  }
}
