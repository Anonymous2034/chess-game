// PGN database browser, game loader, Lichess opening explorer

export class Database {
  constructor() {
    this.categories = [];
    this.collections = [];
    this.games = [];
    this.onGameSelect = null;
    this._explorerCache = new Map();
    this._openingIndex = null;    // Map<name, game[]> — built after loading
    this._fingerprints = new Set(); // dedup set
  }

  // --- ECO code → Opening name mapping ---
  static ECO_RANGES = [
    { lo: 'A10', hi: 'A39', name: 'English Opening' },
    { lo: 'A45', hi: 'A49', name: 'Trompowsky & Indian Game' },
    { lo: 'A50', hi: 'A79', name: 'Benoni Defense' },
    { lo: 'A80', hi: 'A99', name: 'Dutch Defense' },
    { lo: 'B06', hi: 'B06', name: 'Modern Defense' },
    { lo: 'B07', hi: 'B09', name: 'Pirc Defense' },
    { lo: 'B10', hi: 'B19', name: 'Caro-Kann Defense' },
    { lo: 'B20', hi: 'B99', name: 'Sicilian Defense' },
    { lo: 'C00', hi: 'C19', name: 'French Defense' },
    { lo: 'C20', hi: 'C29', name: 'Open Game' },
    { lo: 'C30', hi: 'C39', name: "King's Gambit" },
    { lo: 'C40', hi: 'C43', name: 'Petrov & Philidor' },
    { lo: 'C44', hi: 'C45', name: 'Scotch Game' },
    { lo: 'C46', hi: 'C49', name: 'Four Knights Game' },
    { lo: 'C50', hi: 'C59', name: 'Italian Game' },
    { lo: 'C60', hi: 'C99', name: 'Ruy Lopez' },
    { lo: 'D06', hi: 'D09', name: "Queen's Gambit" },
    { lo: 'D10', hi: 'D19', name: 'Slav Defense' },
    { lo: 'D20', hi: 'D69', name: "Queen's Gambit" },
    { lo: 'D70', hi: 'D99', name: 'Grunfeld Defense' },
    { lo: 'E01', hi: 'E09', name: 'Catalan Opening' },
    { lo: 'E10', hi: 'E19', name: "Queen's Indian Defense" },
    { lo: 'E20', hi: 'E59', name: 'Nimzo-Indian Defense' },
    { lo: 'E60', hi: 'E99', name: "King's Indian Defense" },
  ];

  /**
   * Create a fingerprint for dedup: "white|black|date|round|result"
   */
  static fingerprint(game) {
    return [
      (game.white || '').toLowerCase().trim(),
      (game.black || '').toLowerCase().trim(),
      (game.date || '').trim(),
      (game.event || '').toLowerCase().trim(),
      (game.result || '').trim()
    ].join('|');
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

    // Extract individual moves, strip move numbers (1. or 1.e4) and annotation glyphs
    const moveTokens = moveText
      .split(/\s+/)
      .map(t => t.replace(/^\d+\./, ''))           // strip leading "1." from "1.e4"
      .filter(t => t && !t.match(/^\d+\.?$/) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/) && !t.match(/^\$\d+$/))
      .map(t => t.replace(/[!?]+$/, ''));

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

  // Known player surnames for content-based category matching
  static KNOWN_PLAYERS = [
    'fischer', 'kasparov', 'carlsen', 'morphy', 'capablanca', 'alekhine',
    'tal', 'petrosian', 'karpov', 'anand', 'kramnik', 'botvinnik',
    'lasker', 'steinitz', 'spassky', 'smyslov', 'euwe', 'topalov',
    'caruana', 'ding', 'nepomniachtchi', 'gukesh', 'nakamura', 'aronian',
    'korchnoi', 'rubinstein', 'nimzowitsch', 'bronstein', 'shirov',
    'firouzja', 'praggnanandhaa', 'anderssen', 'andersson', 'benko',
    'byrne', 'chiburdanidze', 'duda', 'gelfand', 'geller', 'giri',
    'keres', 'keymer', 'khalifman', 'leko', 'morozevich', 'najdorf',
    'navara', 'paulsen', 'philidor', 'rapport', 'spielmann', 'tarrasch',
    'tartakower', 'timman', 'wei'
  ];

  // Known event keywords
  static KNOWN_EVENTS = [
    'candidates', 'linares', 'wijk', 'tata steel', 'zurich',
    'world championship', 'olympiad', 'sinquefield', 'norway chess',
    'grand prix', 'grand tour', 'dortmund', 'tilburg'
  ];

  /**
   * Category matching by tag.
   */
  gameMatchesCategory(game, categoryId) {
    if (categoryId === 'all') return true;
    return game.category === categoryId;
  }

  /**
   * Auto-detect which category an imported collection belongs to.
   * Returns 'players', 'events', 'openings', or 'imported'.
   */
  static detectCategory(collectionName) {
    const lower = collectionName.toLowerCase().trim();
    // Exact-match short names that would false-match via includes
    const exactPlayers = ['so', 'li', 'wei'];
    if (exactPlayers.includes(lower)) return 'players';
    // Check player names
    if (Database.KNOWN_PLAYERS.some(p => lower.includes(p))) return 'players';
    // Check event keywords
    if (Database.KNOWN_EVENTS.some(k => lower.includes(k))) return 'events';
    // Check opening keywords
    const openingKeys = ['sicilian', 'french', 'italian', 'spanish', 'ruy lopez',
      'caro-kann', 'caro kann', 'pirc', 'dutch', 'english', 'catalan', 'slav',
      'nimzo', 'grunfeld', 'grünfeld', 'scotch', 'king\'s gambit', 'kings gambit',
      'queen\'s gambit', 'queens gambit', 'king\'s indian', 'kings indian',
      'benoni', 'philidor', 'alekhine defense', 'scandinavian', 'petroff'];
    if (openingKeys.some(k => lower.includes(k))) return 'openings';
    return 'imported';
  }

  static CATEGORY_NAMES = {
    players: 'Players', events: 'Events', openings: 'Openings',
    classic: 'Classic Collections', imported: 'Imported'
  };

  // Surname alias map — nicknames / first names → canonical surname
  static ALIASES = {
    bobby: 'fischer', vishy: 'anand', garry: 'kasparov',
    tigran: 'petrosian', jose: 'capablanca', raul: 'capablanca',
    magnus: 'carlsen', anatoly: 'karpov', boris: 'spassky',
    emanuel: 'lasker', wilhelm: 'steinitz', vladimir: 'kramnik',
    paul: 'morphy', vasily: 'smyslov', alexander: 'alekhine',
    mikhail: 'tal', mikhal: 'tal', misha: 'tal'
  };

  /**
   * Check if two strings are within Levenshtein distance 1.
   * Single-pass O(max(a,b)), no library needed.
   */
  _isWithinDist1(a, b) {
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < la && j < lb) {
      if (a[i] !== b[j]) {
        if (++edits > 1) return false;
        if (la > lb) i++;        // deletion
        else if (la < lb) j++;   // insertion
        else { i++; j++; }       // substitution
      } else { i++; j++; }
    }
    return edits + (la - i) + (lb - j) <= 1;
  }

  /**
   * Fuzzy match: exact substring first, then Levenshtein-1 on individual words.
   */
  _fuzzyMatch(word, haystack) {
    if (haystack.includes(word)) return true;
    if (word.length < 4) return false;
    const tokens = haystack.split(/[\s,]+/);
    return tokens.some(t => this._isWithinDist1(word, t));
  }

  /**
   * Search games by query string, collection, and category
   */
  search(query, collection = 'all', category = 'all') {
    let results;

    // For openings with a specific collection selected, use the ECO index
    if (category === 'openings' && collection !== 'all' && this._openingIndex?.has(collection)) {
      results = this.getOpeningGames(collection);
    } else {
      results = this.games;
      if (category !== 'all') {
        results = results.filter(g => this.gameMatchesCategory(g, category));
      }
      if (collection !== 'all') {
        results = results.filter(g => g.collection === collection);
      }
    }

    if (query) {
      const q = query.toLowerCase().trim();
      // Split into individual words so "Fischer Bobby" matches "Bobby Fischer"
      const words = q.split(/[\s,]+/).filter(w => w.length > 0);
      results = results.filter(g => {
        const haystack = (g.white + ' ' + g.black + ' ' + g.event + ' ' + g.date + ' ' + (g.eco || '')).toLowerCase();
        // All words must appear somewhere in the combined fields
        return words.every(w => {
          // Direct match
          if (this._fuzzyMatch(w, haystack)) return true;
          // Try alias: if "bobby" → also search "fischer"
          const alias = Database.ALIASES[w];
          if (alias && this._fuzzyMatch(alias, haystack)) return true;
          return false;
        });
      });
    }

    return results;
  }

  /**
   * Get collections for a specific category
   */
  getCollectionsForCategory(categoryId) {
    // For openings, return the ECO-based index which spans ALL games
    if (categoryId === 'openings' && this._openingIndex) {
      return Array.from(this._openingIndex.entries())
        .map(([name, games]) => ({ name, count: games.length, category: 'openings' }))
        .sort((a, b) => b.count - a.count);  // most games first
    }
    if (categoryId === 'all') return this.collections.slice().sort((a, b) => a.name.localeCompare(b.name));
    return this.collections.filter(c => c.category === categoryId).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Build the opening index by scanning ALL games' ECO codes.
   * Call after all imports are loaded.
   */
  buildOpeningIndex() {
    this._openingIndex = new Map();

    for (const game of this.games) {
      const eco = game.eco;
      if (!eco || eco.length < 3) continue;

      for (const range of Database.ECO_RANGES) {
        if (eco >= range.lo && eco <= range.hi) {
          if (!this._openingIndex.has(range.name)) this._openingIndex.set(range.name, []);
          this._openingIndex.get(range.name).push(game);
          break;
        }
      }
    }

    let total = 0;
    for (const games of this._openingIndex.values()) total += games.length;
    console.log(`[DB] Opening index: ${this._openingIndex.size} openings, ${total} games indexed`);
  }

  /**
   * Get games for a specific opening from the index.
   */
  getOpeningGames(openingName) {
    return this._openingIndex?.get(openingName) || [];
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
    // Check in-memory cache
    if (this._explorerCache.has(fen)) {
      return this._explorerCache.get(fen);
    }

    try {
      const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=0`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();

      // Evict oldest entry when cache exceeds 200
      if (this._explorerCache.size >= 200) {
        const firstKey = this._explorerCache.keys().next().value;
        this._explorerCache.delete(firstKey);
      }
      this._explorerCache.set(fen, data);

      return data;
    } catch {
      // Return cached result on network error (if any prior cached data exists for this FEN)
      if (this._explorerCache.has(fen)) {
        return this._explorerCache.get(fen);
      }
      return null;
    }
  }

  /**
   * Count DB games that reach the given board position (FEN-based).
   * Handles transpositions — different move orders reaching the same position.
   */
  countByPosition(targetFen) {
    return this.filterByPosition(targetFen).length;
  }

  /**
   * Return all DB games that pass through the given position.
   * Uses cache; if not cached, computes synchronously.
   * For non-blocking use, call countByPositionAsync instead.
   */
  filterByPosition(targetFen) {
    const posKey = targetFen.split(' ').slice(0, 4).join(' ');
    if (!this._positionCache) this._positionCache = new Map();
    if (this._positionCache.has(posKey)) return this._positionCache.get(posKey);
    return this._doPositionMatch(targetFen);
  }

  /**
   * Non-blocking position count — processes in small chunks via setTimeout.
   */
  countByPositionAsync(targetFen) {
    const posKey = targetFen.split(' ').slice(0, 4).join(' ');
    if (!this._positionCache) this._positionCache = new Map();
    if (this._positionCache.has(posKey)) {
      return Promise.resolve(this._positionCache.get(posKey).length);
    }
    return this._doPositionMatchAsync(targetFen).then(r => r.length);
  }

  /** Sync position matching (used by click-to-open-DB) */
  _doPositionMatch(targetFen) {
    const posKey = targetFen.split(' ').slice(0, 4).join(' ');
    const fenParts = targetFen.split(' ');
    const activeColor = fenParts[1];
    const fullmove = parseInt(fenParts[5]) || 1;
    const ply = (fullmove - 1) * 2 + (activeColor === 'b' ? 1 : 0);
    if (ply === 0) return this.games;

    const results = [];
    const temp = new Chess();
    for (const game of this.games) {
      if (game.moves.length < ply) continue;
      temp.reset();
      let valid = true;
      for (let i = 0; i < ply; i++) {
        try { if (!temp.move(game.moves[i])) { valid = false; break; } }
        catch { valid = false; break; }
      }
      if (!valid) continue;
      if (temp.fen().split(' ').slice(0, 4).join(' ') === posKey) results.push(game);
    }

    if (!this._positionCache) this._positionCache = new Map();
    if (this._positionCache.size >= 200) {
      const first = this._positionCache.keys().next().value;
      this._positionCache.delete(first);
    }
    this._positionCache.set(posKey, results);
    return results;
  }

  /** Async chunked position matching — yields to browser between batches */
  _doPositionMatchAsync(targetFen) {
    return new Promise(resolve => {
      const posKey = targetFen.split(' ').slice(0, 4).join(' ');
      const fenParts = targetFen.split(' ');
      const activeColor = fenParts[1];
      const fullmove = parseInt(fenParts[5]) || 1;
      const ply = (fullmove - 1) * 2 + (activeColor === 'b' ? 1 : 0);
      if (ply === 0) { resolve(this.games); return; }

      const results = [];
      const temp = new Chess();
      const games = this.games;
      const CHUNK = 50;
      let idx = 0;

      const processChunk = () => {
        const end = Math.min(idx + CHUNK, games.length);
        for (; idx < end; idx++) {
          const game = games[idx];
          if (game.moves.length < ply) continue;
          temp.reset();
          let valid = true;
          for (let i = 0; i < ply; i++) {
            try { if (!temp.move(game.moves[i])) { valid = false; break; } }
            catch { valid = false; break; }
          }
          if (!valid) continue;
          if (temp.fen().split(' ').slice(0, 4).join(' ') === posKey) results.push(game);
        }
        if (idx < games.length) {
          setTimeout(processChunk, 0);
        } else {
          // Cache
          if (!this._positionCache) this._positionCache = new Map();
          if (this._positionCache.size >= 200) {
            const first = this._positionCache.keys().next().value;
            this._positionCache.delete(first);
          }
          this._positionCache.set(posKey, results);
          resolve(results);
        }
      };
      processChunk();
    });
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
  /**
   * Import all games from a multi-game PGN text into the database.
   * Returns { imported, duplicates } count object.
   */
  importAllGames(pgnText, collectionName = 'Imported', { dedup = false } = {}) {
    const normalized = pgnText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const games = this.parsePGNFile(normalized);
    if (games.length === 0) return { imported: 0, duplicates: 0 };

    const categoryId = Database.detectCategory(collectionName);
    const categoryName = Database.CATEGORY_NAMES[categoryId] || 'Imported';

    // Ensure the category exists
    if (!this.categories.find(c => c.id === categoryId)) {
      this.categories.push({ id: categoryId, name: categoryName, collections: [] });
    }

    this.collections = this.collections.filter(c => c.name !== collectionName);

    // Tag and add games, optionally skipping duplicates
    let duplicates = 0;
    let imported = 0;
    for (const g of games) {
      if (dedup) {
        const fp = Database.fingerprint(g);
        if (this._fingerprints.has(fp)) { duplicates++; continue; }
        this._fingerprints.add(fp);
      }
      g.collection = collectionName;
      g.category = categoryId;
      g.categoryName = categoryName;
      this.games.push(g);
      imported++;
    }

    if (duplicates > 0) {
      console.warn(`[DB] "${collectionName}": skipped ${duplicates} duplicate${duplicates !== 1 ? 's' : ''}`);
    }

    this.collections.push({
      name: collectionName,
      count: imported,
      category: categoryId
    });

    // Persist to IndexedDB so imports survive page refresh
    this._saveImport(collectionName, normalized);

    return { imported, duplicates };
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

      for (const entry of entries) {
        const games = this.parsePGNFile(entry.pgn);
        if (games.length === 0) continue;

        const categoryId = Database.detectCategory(entry.name);
        const categoryName = Database.CATEGORY_NAMES[categoryId] || 'Imported';

        // Ensure the category exists
        if (!this.categories.find(c => c.id === categoryId)) {
          this.categories.push({ id: categoryId, name: categoryName, collections: [] });
        }

        // Remove any existing collection with same name
        this.collections = this.collections.filter(c => c.name !== entry.name);

        // Tag and add games
        for (const g of games) {
          g.collection = entry.name;
          g.category = categoryId;
          g.categoryName = categoryName;
          this.games.push(g);
        }

        this.collections.push({
          name: entry.name,
          count: games.length,
          category: categoryId
        });

        totalGames += games.length;
      }

      return totalGames;
    } catch (err) {
      console.warn('[DB] Failed to load saved imports:', err);
      return 0;
    }
  }
}
