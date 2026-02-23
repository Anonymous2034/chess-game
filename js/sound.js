// Sound effects — Web Audio API synthesis, no external files needed

const STORAGE_KEY = 'chess_sound_muted';

export class SoundManager {
  constructor() {
    this._ctx = null;
    this._muted = false;
    this._voicesReady = false;
    this._load();
    this._initVoices();
  }

  /** Preload speechSynthesis voices — Chrome loads them asynchronously. */
  _initVoices() {
    if (!window.speechSynthesis) return;

    const checkVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        this._voicesReady = true;
        // Prefer an English voice
        this._preferredVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }
    };

    checkVoices();
    if (!this._voicesReady) {
      speechSynthesis.addEventListener('voiceschanged', checkVoices);
    }

    // Warmup: schedule a silent utterance on first user gesture to unlock speech API
    const warmup = () => {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      speechSynthesis.speak(u);
      document.removeEventListener('click', warmup);
      document.removeEventListener('keydown', warmup);
    };
    document.addEventListener('click', warmup, { once: true });
    document.addEventListener('keydown', warmup, { once: true });
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

  /**
   * Speak a move aloud using Web Speech API.
   * Works independently of DGT board connection.
   */
  speakMove(san) {
    if (!window.speechSynthesis) return;
    if (localStorage.getItem('chess_voice_enabled') === 'false') return;
    if (!san) return;

    const text = this._sanToSpeech(san);
    if (!text) return;

    // Chrome pauses speechSynthesis after ~15s inactivity — resume() fixes it.
    speechSynthesis.resume();

    // Only cancel if actively speaking — calling cancel() unconditionally
    // before speak() silently kills the new utterance in Chrome.
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
    }

    // Speak directly — no setTimeout. Wrapping in setTimeout moves the call
    // out of the user-gesture context, which can block speech on some browsers.
    const utterance = new SpeechSynthesisUtterance(text);
    if (this._preferredVoice) utterance.voice = this._preferredVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }

  _sanToSpeech(san) {
    if (san.replace(/[+#]/, '').trim() === 'O-O-O') return 'Castles queenside';
    if (san.replace(/[+#]/, '').trim() === 'O-O') return 'Castles kingside';

    let s = san;
    let suffix = '';
    if (s.endsWith('#')) { suffix = ', checkmate'; s = s.slice(0, -1); }
    else if (s.endsWith('+')) { suffix = ', check'; s = s.slice(0, -1); }

    let promo = '';
    const promoIdx = s.indexOf('=');
    if (promoIdx !== -1) {
      const promoNames = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
      promo = ' promotes to ' + (promoNames[s[promoIdx + 1]] || s[promoIdx + 1]);
      s = s.slice(0, promoIdx);
    }

    const pieceNames = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };
    let piece = '';
    if (pieceNames[s[0]]) { piece = pieceNames[s[0]]; s = s.slice(1); }

    const takes = s.includes('x');
    s = s.replace('x', '');
    const dest = s.slice(-2);
    const disambig = s.slice(0, -2);

    let text = '';
    if (piece) { text = piece + ' '; }
    else if (takes && disambig) { text = disambig + ' '; }
    if (takes) text += 'takes ';
    text += dest + promo + suffix;
    return text;
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
