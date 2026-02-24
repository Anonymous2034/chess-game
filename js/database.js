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
      const q = query.toLowerCase().trim();
      // Split into individual words so "Fischer Bobby" matches "Bobby Fischer"
      const words = q.split(/[\s,]+/).filter(w => w.length > 0);
      results = results.filter(g => {
        const haystack = (g.white + ' ' + g.black + ' ' + g.event + ' ' + g.date + ' ' + (g.eco || '')).toLowerCase();
        // All words must appear somewhere in the combined fields
        return words.every(w => haystack.includes(w));
      });
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

  /**
   * Import all games from a multi-game PGN text into the database.
   * Returns the number of games imported.
   */
  importAllGames(pgnText, collectionName = 'Imported') {
    const normalized = pgnText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const games = this.parsePGNFile(normalized);
    if (games.length === 0) return 0;

    const categoryId = 'imported';

    // Ensure the "Imported" category exists
    if (!this.categories.find(c => c.id === categoryId)) {
      this.categories.push({ id: categoryId, name: 'Imported', collections: [] });
    }

    // Remove any existing collection with the same name (re-import replaces)
    this.games = this.games.filter(g => g.collection !== collectionName);
    this.collections = this.collections.filter(c => c.name !== collectionName);

    // Tag and add games
    games.forEach(g => {
      g.collection = collectionName;
      g.category = categoryId;
      g.categoryName = 'Imported';
    });
    this.games.push(...games);

    this.collections.push({
      name: collectionName,
      count: games.length,
      category: categoryId
    });

    // Persist to IndexedDB so imports survive page refresh
    this._saveImport(collectionName, normalized);

    return games.length;
  }

  // === IndexedDB Persistence for Imported Collections ===

  _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('chess_imported_pgns', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('imports')) {
          db.createObjectStore('imports', { keyPath: 'name' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async _saveImport(collectionName, pgnText) {
    try {
      const db = await this._openDB();
      const tx = db.transaction('imports', 'readwrite');
      tx.objectStore('imports').put({ name: collectionName, pgn: pgnText });
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      db.close();
    } catch (err) {
      console.warn('[DB] Failed to save import:', err);
    }
  }

  async _deleteImport(collectionName) {
    try {
      const db = await this._openDB();
      const tx = db.transaction('imports', 'readwrite');
      tx.objectStore('imports').delete(collectionName);
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      db.close();
    } catch (err) {
      console.warn('[DB] Failed to delete import:', err);
    }
  }

  /**
   * Restore all previously imported collections from IndexedDB.
   * Call this after loadCollections() on startup.
   */
  async loadSavedImports() {
    try {
      const db = await this._openDB();
      const tx = db.transaction('imports', 'readonly');
      const store = tx.objectStore('imports');
      const allReq = store.getAll();

      const entries = await new Promise((res, rej) => {
        allReq.onsuccess = () => res(allReq.result);
        allReq.onerror = rej;
      });
      db.close();

      if (!entries || entries.length === 0) return 0;

      let totalGames = 0;
      const categoryId = 'imported';

      // Ensure the "Imported" category exists
      if (!this.categories.find(c => c.id === categoryId)) {
        this.categories.push({ id: categoryId, name: 'Imported', collections: [] });
      }

      for (const entry of entries) {
        const games = this.parsePGNFile(entry.pgn);
        if (games.length === 0) continue;

        // Tag games
        games.forEach(g => {
          g.collection = entry.name;
          g.category = categoryId;
          g.categoryName = 'Imported';
        });

        // Remove duplicates (in case loadCollections already added same-named built-in)
        this.games = this.games.filter(g => g.collection !== entry.name);
        this.collections = this.collections.filter(c => c.name !== entry.name);

        this.games.push(...games);
        this.collections.push({
          name: entry.name,
          count: games.length,
          category: categoryId
        });

        totalGames += games.length;
        console.log('[DB] Restored import "' + entry.name + '": ' + games.length + ' games');
      }

      return totalGames;
    } catch (err) {
      console.warn('[DB] Failed to load saved imports:', err);
      return 0;
    }
  }
}
