// Tier 3: User API key coaching (OpenAI or Anthropic)

const SETTINGS_KEY = 'chess_coach_api_settings';

export class CoachAPI {
  constructor() {
    this.provider = 'openai';  // 'openai' or 'anthropic'
    this.apiKey = '';
    this.model = '';
    this.conversationHistory = [];
    this._loadSettings();
  }

  _loadSettings() {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        const settings = JSON.parse(data);
        this.provider = settings.provider || 'openai';
        this.apiKey = settings.apiKey || '';
        this.model = settings.model || '';
      }
    } catch {
      // ignore
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model
      }));
    } catch {
      // ignore
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }

  getDefaultModel() {
    if (this.provider === 'anthropic') return 'claude-sonnet-4-20250514';
    return 'gpt-4o-mini';
  }

  /**
   * Send a message to the coaching API
   * @param {string} userMessage
   * @param {Object} context - Game context { fen, moves, eval, phase, opening }
   * @returns {Promise<string>} Coach response
   */
  async chat(userMessage, context = {}) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const systemPrompt = this._buildSystemPrompt(context);

    // Keep conversation manageable
    if (this.conversationHistory.length > 16) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    try {
      let response;
      if (this.provider === 'anthropic') {
        response = await this._callAnthropic(systemPrompt);
      } else {
        response = await this._callOpenAI(systemPrompt);
      }

      this.conversationHistory.push({ role: 'assistant', content: response });
      return response;
    } catch (err) {
      console.error('Coach API error:', err);
      // Remove the failed user message
      this.conversationHistory.pop();
      throw err;
    }
  }

  async _callOpenAI(systemPrompt) {
    const model = this.model || this.getDefaultModel();

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  }

  async _callAnthropic(systemPrompt) {
    const model = this.model || this.getDefaultModel();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: this.conversationHistory.map(m => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: 500
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${err}`);
    }

    const data = await res.json();
    return data.content[0]?.text || 'No response generated.';
  }

  _buildSystemPrompt(context) {
    let prompt = context.systemPromptOverride || `You are an expert chess coach helping a player improve. Provide strategic and tactical advice. Be concise (under 200 words), encouraging, and educational. Explain concepts clearly. When analyzing positions, discuss pawn structure, piece activity, king safety, and tactical patterns.`;

    if (context.fen) {
      prompt += `\n\nCurrent position (FEN): ${context.fen}`;
    }
    if (context.opening) {
      prompt += `\nOpening: ${context.opening}`;
    }
    if (context.eval !== undefined) {
      const evalStr = context.eval > 0 ? `+${context.eval.toFixed(1)}` : context.eval.toFixed(1);
      prompt += `\nEngine evaluation: ${evalStr} (positive = White advantage)`;
    }
    if (context.moves) {
      prompt += `\nRecent moves: ${context.moves}`;
    }
    if (context.phase) {
      prompt += `\nGame phase: ${context.phase}`;
    }
    if (context.playerColor) {
      prompt += `\nPlayer is playing as: ${context.playerColor === 'w' ? 'White' : 'Black'}`;
    }

    return prompt;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
