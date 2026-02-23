// Coach Manager — orchestrates the 3-tier coaching system

import { CoachTips } from './coach-tips.js';
import { CoachWebLLM } from './coach-webllm.js';
import { CoachAPI } from './coach-api.js';

const TIER_KEY = 'chess_coach_tier';

export class CoachManager {
  constructor(engine) {
    this.tips = new CoachTips(engine);
    this.webllm = new CoachWebLLM();
    this.api = new CoachAPI();

    this.activeTier = this._loadTier(); // 1, 2, or 3
    this.messages = [];     // Chat messages: { role: 'coach'|'user', content, type }
    this.onMessage = null;  // callback(messages)
    this.onStatus = null;   // callback(status)
    this.engine = engine;
    this.enabled = true;
  }

  _loadTier() {
    try {
      return parseInt(localStorage.getItem(TIER_KEY)) || 1;
    } catch {
      return 1;
    }
  }

  setTier(tier) {
    this.activeTier = tier;
    try { localStorage.setItem(TIER_KEY, String(tier)); } catch {}
  }

  /**
   * Process a player's move and generate automatic coaching tips
   */
  async onPlayerMove(params) {
    if (!this.enabled) return;

    // Tier 1 always runs: Stockfish auto-tips
    const tip = await this.tips.generateTip(params);
    if (tip) {
      this._addMessage('coach', tip.message, tip.severity);
    }
  }

  /**
   * Handle user chat message
   */
  async sendMessage(text, context = {}) {
    if (!text.trim()) return;

    this._addMessage('user', text.trim());

    if (this.activeTier === 3 && this.api.isConfigured()) {
      // Tier 3: API
      if (this.onStatus) this.onStatus('Thinking...');
      try {
        const response = await this.api.chat(text, context);
        this._addMessage('coach', response, 'response');
      } catch (err) {
        this._addMessage('coach', `Error: ${err.message}`, 'error');
      }
      if (this.onStatus) this.onStatus('');

    } else if (this.activeTier === 2 && this.webllm.isReady()) {
      // Tier 2: WebLLM
      if (this.onStatus) this.onStatus('Thinking...');
      try {
        const response = await this.webllm.chat(text, context);
        this._addMessage('coach', response, 'response');
      } catch (err) {
        this._addMessage('coach', `Error: ${err.message}`, 'error');
      }
      if (this.onStatus) this.onStatus('');

    } else if (this.activeTier === 2 && !this.webllm.isReady()) {
      this._addMessage('coach', 'The in-browser AI model is not loaded yet. Click the settings icon to load it, or switch to Tier 1 (Stockfish tips).', 'info');

    } else {
      // Tier 1: can't chat, but give position-based advice
      if (this.engine && this.engine.ready && context.fen) {
        if (this.onStatus) this.onStatus('Analyzing...');
        const analysis = await this.engine.analyzePosition(context.fen, 14);
        const evalScore = analysis.score / 100;
        const evalStr = evalScore > 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1);

        let advice = `Current evaluation: ${evalStr}. `;
        if (analysis.bestMove) {
          advice += `The engine suggests: ${analysis.bestMove}. `;
        }
        if (analysis.mate !== null) {
          advice += analysis.mate > 0 ? `White can force mate in ${analysis.mate} moves.` : `Black can force mate in ${Math.abs(analysis.mate)} moves.`;
        } else if (Math.abs(evalScore) < 0.5) {
          advice += 'The position is roughly equal. Focus on piece activity and pawn structure.';
        } else if (evalScore > 2) {
          advice += 'White has a significant advantage. Look for tactical shots.';
        } else if (evalScore < -2) {
          advice += 'Black has a significant advantage. Look for tactical shots.';
        } else {
          advice += 'One side has a slight edge. Look for ways to improve your piece placement.';
        }

        this._addMessage('coach', advice, 'response');
        if (this.onStatus) this.onStatus('');
      } else {
        this._addMessage('coach', 'Stockfish tips mode can only provide automatic tips after moves. For interactive chat, switch to Tier 2 (in-browser AI) or Tier 3 (API).', 'info');
      }
    }
  }

  /**
   * Load WebLLM model (Tier 2)
   */
  async loadWebLLM() {
    if (!this.webllm.checkSupport()) {
      throw new Error('WebGPU is not supported in this browser');
    }

    this.webllm.onProgress = (progress) => {
      if (this.onStatus) {
        this.onStatus(`Loading model: ${progress.text}`);
      }
    };

    await this.webllm.load();
    if (this.onStatus) this.onStatus('Model ready');
  }

  /**
   * Generate post-game feedback
   */
  async postGameFeedback(moveHistory, fens, playerColor, result) {
    // Tier 1: Stockfish summary
    const summary = await this.tips.generatePostGameSummary(moveHistory, fens, playerColor);
    if (summary) {
      this._addMessage('coach', summary, 'summary');
    }

    // If Tier 2 or 3, generate richer feedback
    if (this.activeTier >= 2) {
      const context = {
        moves: moveHistory.map(m => m.san).join(' '),
        playerColor,
        phase: 'post-game'
      };

      const prompt = `The game just ended (${result}). Please give a brief post-game analysis: what went well, what could be improved, and one key lesson from this game.`;

      await this.sendMessage(prompt, context);
    }
  }

  _addMessage(role, content, type = '') {
    this.messages.push({ role, content, type, time: Date.now() });

    // Keep messages manageable
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-50);
    }

    if (this.onMessage) {
      this.onMessage(this.messages);
    }
  }

  clearMessages() {
    this.messages = [];
    this.webllm.clearHistory();
    this.api.clearHistory();
    if (this.onMessage) this.onMessage(this.messages);
  }

  /**
   * Get coach settings for UI
   */
  getSettings() {
    return {
      tier: this.activeTier,
      webllmSupported: this.webllm.checkSupport(),
      webllmLoaded: this.webllm.isReady(),
      webllmLoading: this.webllm.loading,
      apiConfigured: this.api.isConfigured(),
      apiProvider: this.api.provider,
      apiModel: this.api.model
    };
  }

  /**
   * Update API settings
   */
  updateAPISettings({ provider, apiKey, model }) {
    if (provider !== undefined) this.api.provider = provider;
    if (apiKey !== undefined) this.api.apiKey = apiKey;
    if (model !== undefined) this.api.model = model;
    this.api.saveSettings();
  }
}
