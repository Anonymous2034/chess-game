// Tier 2: WebLLM in-browser coaching (free, requires WebGPU)

export class CoachWebLLM {
  constructor() {
    this.engine = null;
    this.loaded = false;
    this.loading = false;
    this.supported = false;
    this.onProgress = null;  // callback(progress) for download status
    this.conversationHistory = [];
    this.modelId = 'Phi-3.5-mini-instruct-q4f16_1-MLC';
  }

  /**
   * Check if WebGPU is available
   */
  checkSupport() {
    this.supported = typeof navigator !== 'undefined' && !!navigator.gpu;
    return this.supported;
  }

  /**
   * Initialize and load the model
   */
  async load() {
    if (this.loaded || this.loading) return this.loaded;
    if (!this.checkSupport()) {
      throw new Error('WebGPU is not supported in this browser. Try Chrome 113+ or Edge 113+.');
    }

    this.loading = true;

    try {
      // Dynamic import of web-llm from CDN
      const { CreateMLCEngine } = await import(
        'https://esm.run/@mlc-ai/web-llm'
      );

      const initProgressCallback = (report) => {
        if (this.onProgress) {
          this.onProgress({
            text: report.text,
            progress: report.progress || 0
          });
        }
      };

      this.engine = await CreateMLCEngine(this.modelId, {
        initProgressCallback
      });

      this.loaded = true;
      this.loading = false;
      return true;
    } catch (err) {
      this.loading = false;
      console.error('WebLLM load failed:', err);
      throw err;
    }
  }

  /**
   * Send a message to the coach and get a response
   * @param {string} userMessage - The user's question
   * @param {Object} context - Game context { fen, moves, eval, phase, opening }
   * @returns {Promise<string>} Coach response
   */
  async chat(userMessage, context = {}) {
    if (!this.loaded || !this.engine) {
      throw new Error('Model not loaded');
    }

    const systemPrompt = this._buildSystemPrompt(context);

    // Keep conversation manageable
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-6);
    }

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory
    ];

    try {
      const reply = await this.engine.chat.completions.create({
        messages,
        max_tokens: 300,
        temperature: 0.7
      });

      const response = reply.choices[0]?.message?.content || 'I couldn\'t generate a response.';
      this.conversationHistory.push({ role: 'assistant', content: response });
      return response;
    } catch (err) {
      console.error('WebLLM chat error:', err);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  _buildSystemPrompt(context) {
    let prompt = `You are a friendly and knowledgeable chess coach. Give concise, helpful advice about chess positions, strategy, and tactics. Keep responses under 150 words. Be encouraging and educational.`;

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

    return prompt;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Check if model is ready
   */
  isReady() {
    return this.loaded && this.engine !== null;
  }
}
