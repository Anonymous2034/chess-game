// Coach Manager — orchestrates the 3-tier coaching system

import { CoachTips } from './coach-tips.js';
import { CoachWebLLM } from './coach-webllm.js';
import { CoachAPI } from './coach-api.js';
import { GM_COACH_PROFILES } from './gm-coach-profiles.js';

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

  /**
   * Generate personality-filtered positional commentary for a GM coach
   * @param {string} coachId — bot id (e.g. 'tal', 'stockfish')
   * @param {Object} positionData — { chess, analysis, fen, sections }
   * @returns {Promise<{ tier: number, text: string, moveHintIntro: string }>}
   */
  async generateCoachCommentary(coachId, positionData) {
    const profile = GM_COACH_PROFILES[coachId];
    if (!profile) return { tier: 1, text: '', moveHintIntro: '' };

    const { sections, analysis } = positionData;

    // Tier 1 (always available): template matching
    const tier1Text = this._buildTier1Commentary(profile, sections, analysis);

    // If tier 2/3 available, enhance with AI
    if (this.activeTier === 3 && this.api.isConfigured()) {
      try {
        const sectionText = sections.map(s => `${s.title}: ${s.text}`).join('\n');
        const prompt = `Based on this position analysis, give a 2-3 sentence coaching insight in character:\n\n${sectionText}`;
        const context = { ...positionData, systemPromptOverride: profile.systemPrompt, phase: 'positional' };
        const response = await this.api.chat(prompt, context);
        return { tier: 3, text: response, moveHintIntro: profile.moveHintIntro };
      } catch { /* fall through to tier 1 */ }
    }

    if (this.activeTier === 2 && this.webllm.isReady()) {
      try {
        const sectionText = sections.map(s => `${s.title}: ${s.text}`).join('\n');
        const prompt = `Based on this position analysis, give a 2-3 sentence coaching insight in character:\n\n${sectionText}`;
        const context = { ...positionData, systemPromptOverride: profile.systemPrompt, phase: 'positional' };
        const response = await this.webllm.chat(prompt, context);
        return { tier: 2, text: response, moveHintIntro: profile.moveHintIntro };
      } catch { /* fall through to tier 1 */ }
    }

    return { tier: 1, text: tier1Text, moveHintIntro: profile.moveHintIntro };
  }

  /**
   * Tier 1: template-based commentary from profile + position sections
   */
  _buildTier1Commentary(profile, sections, analysis) {
    const lines = [];

    // 1) Evaluation line
    if (analysis) {
      const cp = analysis.score / 100;
      if (analysis.mate !== null && analysis.mate !== undefined) {
        lines.push(cp > 0 ? profile.commentary.advantage : profile.commentary.disadvantage);
      } else if (Math.abs(cp) < 0.3) {
        lines.push(profile.commentary.equalPosition);
      } else if (cp > 0.3) {
        lines.push(profile.commentary.advantage);
      } else {
        lines.push(profile.commentary.disadvantage);
      }
    }

    // 2) Scan sections for features, matched to profile commentary keys
    const featureMatches = [];
    for (const section of sections) {
      if (section.title === 'Material') {
        if (section.text.includes('up')) featureMatches.push({ key: 'materialUp', priority: 'material' });
        else if (section.text.includes('down') || section.text.match(/Black is up|White is up/))
          featureMatches.push({ key: 'materialDown', priority: 'material' });
      }
      if (section.title === 'Pawn Structure') {
        if (section.text.includes('isolated')) featureMatches.push({ key: 'isolatedPawn', priority: 'pawn_structure' });
        if (section.text.includes('passed')) featureMatches.push({ key: 'passedPawn', priority: 'pawn_structure' });
        if (section.text.includes('doubled')) featureMatches.push({ key: 'doubledPawns', priority: 'pawn_structure' });
      }
      if (section.title === 'King Safety') {
        if (section.text.includes('exposed') || section.text.includes('broken'))
          featureMatches.push({ key: 'openKing', priority: 'king_safety' });
        else if (section.text.includes('well-sheltered') || section.text.includes('intact'))
          featureMatches.push({ key: 'kingSafe', priority: 'king_safety' });
        if (section.text.includes('remains in the center'))
          featureMatches.push({ key: 'notCastled', priority: 'king_safety' });
      }
      if (section.title === 'Open Files') {
        if (section.text.includes('open')) featureMatches.push({ key: 'openFile', priority: 'piece_activity' });
      }
      if (section.title === 'Piece Activity') {
        if (section.text.includes('cramped')) featureMatches.push({ key: 'cramped', priority: 'piece_activity' });
        else if (section.text.includes('active') || section.text.includes('very active'))
          featureMatches.push({ key: 'activePosition', priority: 'piece_activity' });
      }
      if (section.title === 'Center') {
        featureMatches.push({ key: 'centerControl', priority: 'center_control' });
      }
    }

    // 3) Sort by profile priorities
    const priorityOrder = profile.priorities || [];
    featureMatches.sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a.priority);
      const bIdx = priorityOrder.indexOf(b.priority);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });

    // 4) Take top 2 features
    const seen = new Set();
    for (const match of featureMatches) {
      if (seen.has(match.key)) continue;
      seen.add(match.key);
      const template = profile.commentary[match.key];
      if (template) lines.push(template);
      if (lines.length >= 3) break; // eval + 2 features
    }

    return lines.join(' ');
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
   * Generate positional summary for Live Advisors tab
   * @param {Object} context - { fen, evaluation, commentary (PositionCommentary sections) }
   * @returns {Promise<string|null>} Natural language positional guidance (no concrete moves)
   */
  async getPositionalSummary(context) {
    if (!this.enabled) return null;

    const { evaluation, commentary } = context;

    if (this.activeTier === 3 && this.api.isConfigured()) {
      // Tier 3: API — rich positional guidance
      try {
        const sectionText = commentary.map(s => `${s.title}: ${s.text}`).join('\n');
        const prompt = `You are a chess coach. Based on this position analysis, describe the strategic themes and plans for both sides in 2-3 sentences. Do NOT suggest specific moves.\n\n${sectionText}`;
        return await this.api.chat(prompt, { ...context, phase: 'positional' });
      } catch {
        return null;
      }
    }

    if (this.activeTier === 2 && this.webllm.isReady()) {
      // Tier 2: WebLLM — in-browser AI guidance
      try {
        const sectionText = commentary.map(s => `${s.title}: ${s.text}`).join('\n');
        const prompt = `You are a chess coach. Based on this position analysis, describe the strategic themes and plans for both sides in 2-3 sentences. Do NOT suggest specific moves.\n\n${sectionText}`;
        return await this.webllm.chat(prompt, { ...context, phase: 'positional' });
      } catch {
        return null;
      }
    }

    // Tier 1: Template-based summary from evaluation + commentary features
    if (!evaluation) return null;

    const tips = [];
    const cp = evaluation.score / 100;

    // Evaluation-based tip
    if (evaluation.mate !== null && evaluation.mate !== undefined) {
      tips.push(evaluation.mate > 0
        ? 'White should look for forcing moves to deliver checkmate.'
        : 'Black should look for forcing moves to deliver checkmate.');
    } else if (Math.abs(cp) < 0.3) {
      tips.push('The position is balanced. Focus on improving piece placement and creating long-term weaknesses.');
    } else if (Math.abs(cp) < 1.5) {
      tips.push(`${cp > 0 ? 'White' : 'Black'} has a small advantage. Maintain pressure and avoid unnecessary exchanges.`);
    } else {
      tips.push(`${cp > 0 ? 'White' : 'Black'} has a significant advantage. Convert by simplifying into a winning endgame.`);
    }

    // Add tips based on commentary features
    for (const section of commentary) {
      if (section.title === 'Pawn Structure' && section.text.includes('isolated')) {
        tips.push('Target the isolated pawn — blockade it and attack it with pieces.');
      }
      if (section.title === 'Pawn Structure' && section.text.includes('passed')) {
        tips.push('A passed pawn is a powerful asset. Support its advance or use it to tie down the opponent\'s pieces.');
      }
      if (section.title === 'King Safety' && section.text.includes('exposed')) {
        tips.push('The exposed king is a target. Look for ways to open lines toward it.');
      }
      if (section.title === 'Open Files' && section.text.includes('open')) {
        tips.push('Contest the open files with rooks. Rooks are strongest when doubled on open files.');
      }
      if (section.title === 'Piece Activity' && section.text.includes('cramped')) {
        tips.push('The cramped side should look for piece exchanges to relieve pressure.');
      }
    }

    return tips.length > 0 ? tips.slice(0, 3).join(' ') : null;
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
