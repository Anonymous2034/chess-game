// PGN database browser, game loader, Lichess opening explorer

export class Database {
  constructor() {
    this.categories = [];
    this.collections = [];
    this.games = [];
    this.onGameSelect = null;
  }

  /**
   * Load collections from manifest file
   */
  async loadCollections() {
    try {
      const resp = await fetch('data/collections.json');
      if (!resp.ok) return this.categories;
      const manifest = await resp.json();
      this.categories = manifest.categories;
    } catch {
      // Fallback: no collections
      return this.categories;
    }

    for (const category of this.categories) {
      for (const col of category.collections) {
        try {
          const resp = await fetch(col.file);
          if (!resp.ok) continue;
          const text = await resp.text();
          const games = this.parsePGNFile(text);
          games.forEach(g => {
            g.collection = col.name;
            g.category = category.id;
            g.categoryName = category.name;
          });
          this.collections.push({
            name: col.name,
            count: games.length,
            category: category.id
          });
          this.games.push(...games);
        } catch {
          // File not available, skip
        }
      }
    }

    return this.categories;
  }

  /**
   * Parse a PGN file into an array of game objects
   */
  parsePGNFile(pgnText) {
    const games = [];
    // Normalize line endings
    const normalized = pgnText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Split into individual games
    const gameTexts = normalized.split(/\n\n(?=\[Event)/);

    for (const text of gameTexts) {
      if (!text.trim()) continue;
      const game = this.parseSingleGame(text.trim());
      if (game) games.push(game);
    }

    return games;
  }

  /**
   * Parse a single PGN game text
   */
  parseSingleGame(text) {
    const headers = {};
    const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
    let match;

    while ((match = headerRegex.exec(text)) !== null) {
      headers[match[1]] = match[2];
    }

    // Extract move text (everything after the last header)
    const lastHeaderEnd = text.lastIndexOf(']');
    let moveText = lastHeaderEnd >= 0 ? text.substring(lastHeaderEnd + 1).trim() : '';

    // Remove comments
    moveText = moveText.replace(/\{[^}]*\}/g, '');
    // Remove nested variations iteratively
    let prev;
    do {
      prev = moveText;
      moveText = moveText.replace(/\([^()]*\)/g, '');
    } while (moveText !== prev);
    moveText = moveText.replace(/\d+\.\.\./g, '');

    // Extract individual moves
    const moveTokens = moveText
      .split(/\s+/)
      .filter(t => t && !t.match(/^\d+\.?$/) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/));

    if (!headers.White && !headers.Event) return null;

    return {
      headers,
      white: headers.White || '?',
      black: headers.Black || '?',
      event: headers.Event || '?',
      date: headers.Date || '?',
      result: headers.Result || '*',
      eco: headers.ECO || '',
      moves: moveTokens,
      pgn: text,
      collection: '',
      category: '',
      categoryName: ''
    };
  }

  /**
   * Search games by query string, collection, and category
   */
  search(query, collection = 'all', category = 'all') {
    let results = this.games;

    if (category !== 'all') {
      results = results.filter(g => g.category === category);
    }

    if (collection !== 'all') {
      results = results.filter(g => g.collection === collection);
    }

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(g =>
        g.white.toLowerCase().includes(q) ||
        g.black.toLowerCase().includes(q) ||
        g.event.toLowerCase().includes(q) ||
        g.date.includes(q) ||
        (g.eco && g.eco.toLowerCase().includes(q))
      );
    }

    return results;
  }

  /**
   * Get collections for a specific category
   */
  getCollectionsForCategory(categoryId) {
    if (categoryId === 'all') return this.collections;
    return this.collections.filter(c => c.category === categoryId);
  }

  /**
   * Load a game from the database into a Chess instance
   * Returns array of move objects
   */
  loadGame(game, chess) {
    chess.reset();
    const moves = [];

    for (const san of game.moves) {
      try {
        const move = chess.move(san);
        if (move) {
          moves.push(move);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    return moves;
  }

  /**
   * Fetch opening explorer data from Lichess API
   */
  async fetchOpeningExplorer(fen) {
    try {
      const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=0`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  /**
   * Parse PGN text and return a game object
   */
  importPGN(pgnText) {
    return this.parseSingleGame(pgnText);
  }
}
