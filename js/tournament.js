// Tournament system — round-robin and knockout formats

const STORAGE_KEY = 'chess_tournament';

export class Tournament {
  constructor() {
    this.active = false;
    this.format = null;         // 'round-robin' or 'knockout'
    this.participants = [];     // Array of { id, name, elo }
    this.timeControl = 0;
    this.increment = 0;
    this.gamesPerMatch = 1;

    // Round-robin
    this.schedule = [];         // Array of { round, white, black, result }
    this.standings = [];        // Array of { id, name, elo, points, wins, draws, losses, played }

    // Knockout
    this.bracket = [];          // Array of rounds, each round is array of matches
    this.currentRound = 0;

    this.currentMatch = null;   // Current match being played
    this._load();
  }

  _load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        Object.assign(this, JSON.parse(data));
      }
    } catch {
      // ignore
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        active: this.active,
        format: this.format,
        participants: this.participants,
        timeControl: this.timeControl,
        increment: this.increment,
        gamesPerMatch: this.gamesPerMatch,
        schedule: this.schedule,
        standings: this.standings,
        bracket: this.bracket,
        currentRound: this.currentRound,
        currentMatch: this.currentMatch
      }));
    } catch {
      // ignore
    }
  }

  /**
   * Create a new tournament
   */
  create({ format, participants, timeControl, increment, gamesPerMatch }) {
    this.active = true;
    this.format = format;
    this.participants = [
      { id: '_player', name: 'You', elo: 1500 },
      ...participants
    ];
    this.timeControl = timeControl || 0;
    this.increment = increment || 0;
    this.gamesPerMatch = gamesPerMatch || 1;
    this.currentMatch = null;

    if (format === 'round-robin') {
      this._initRoundRobin();
    } else {
      this._initKnockout();
    }

    this._save();
  }

  _initRoundRobin() {
    this.schedule = [];
    this.standings = this.participants.map(p => ({
      id: p.id, name: p.name, elo: p.elo,
      points: 0, wins: 0, draws: 0, losses: 0, played: 0
    }));

    // Generate all pairings
    const n = this.participants.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let g = 0; g < this.gamesPerMatch; g++) {
          // Alternate colors
          const white = g % 2 === 0 ? this.participants[i] : this.participants[j];
          const black = g % 2 === 0 ? this.participants[j] : this.participants[i];
          this.schedule.push({
            whiteId: white.id, whiteName: white.name,
            blackId: black.id, blackName: black.name,
            result: null // null = not played, 'w', 'b', 'd'
          });
        }
      }
    }

    // Shuffle schedule for variety
    for (let i = this.schedule.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.schedule[i], this.schedule[j]] = [this.schedule[j], this.schedule[i]];
    }
  }

  _initKnockout() {
    // Ensure participant count is power of 2 (pad with byes if needed)
    let n = this.participants.length;
    let bracketSize = 1;
    while (bracketSize < n) bracketSize *= 2;

    // Pad with byes
    const padded = [...this.participants];
    while (padded.length < bracketSize) {
      padded.push({ id: '_bye', name: 'BYE', elo: 0 });
    }

    // Shuffle participants
    for (let i = padded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [padded[i], padded[j]] = [padded[j], padded[i]];
    }

    // Build bracket rounds
    this.bracket = [];
    this.currentRound = 0;

    // First round
    const firstRound = [];
    for (let i = 0; i < padded.length; i += 2) {
      firstRound.push({
        player1: padded[i],
        player2: padded[i + 1],
        winner: null,
        scores: [] // array of game results
      });
    }

    // Auto-advance byes
    for (const match of firstRound) {
      if (match.player1.id === '_bye') {
        match.winner = match.player2.id;
      } else if (match.player2.id === '_bye') {
        match.winner = match.player1.id;
      }
    }

    this.bracket.push(firstRound);

    // Generate empty subsequent rounds
    let prevRoundSize = firstRound.length;
    while (prevRoundSize > 1) {
      const nextRound = [];
      for (let i = 0; i < prevRoundSize / 2; i++) {
        nextRound.push({
          player1: null,
          player2: null,
          winner: null,
          scores: []
        });
      }
      this.bracket.push(nextRound);
      prevRoundSize = nextRound.length;
    }

    // Propagate byes to next round
    this._propagateKnockoutWinners();
  }

  _propagateKnockoutWinners() {
    for (let r = 0; r < this.bracket.length - 1; r++) {
      const round = this.bracket[r];
      const nextRound = this.bracket[r + 1];

      for (let i = 0; i < round.length; i++) {
        const match = round[i];
        if (match.winner) {
          const nextMatchIdx = Math.floor(i / 2);
          const slot = i % 2 === 0 ? 'player1' : 'player2';
          const winner = match.player1.id === match.winner ? match.player1 : match.player2;
          nextRound[nextMatchIdx][slot] = winner;

          // Auto-advance if opponent is bye or already set
          const nextMatch = nextRound[nextMatchIdx];
          if (nextMatch.player1 && nextMatch.player2) {
            if (nextMatch.player1.id === '_bye') {
              nextMatch.winner = nextMatch.player2.id;
            } else if (nextMatch.player2.id === '_bye') {
              nextMatch.winner = nextMatch.player1.id;
            }
          }
        }
      }
    }
  }

  /**
   * Get the next match to play (where the human player is involved)
   * Returns null if tournament is over or no match available
   */
  getNextMatch() {
    if (!this.active) return null;

    if (this.format === 'round-robin') {
      for (const match of this.schedule) {
        if (match.result === null &&
            (match.whiteId === '_player' || match.blackId === '_player')) {
          return {
            opponentId: match.whiteId === '_player' ? match.blackId : match.whiteId,
            opponentName: match.whiteId === '_player' ? match.blackName : match.whiteName,
            playerColor: match.whiteId === '_player' ? 'w' : 'b',
            match
          };
        }
      }
      // Check if there are any remaining non-player matches to auto-resolve
      this._autoResolveNonPlayerMatches();
      return null;

    } else {
      // Knockout
      for (let r = 0; r < this.bracket.length; r++) {
        for (const match of this.bracket[r]) {
          if (!match.winner && match.player1 && match.player2 &&
              match.player1.id !== '_bye' && match.player2.id !== '_bye') {
            if (match.player1.id === '_player' || match.player2.id === '_player') {
              const isPlayer1 = match.player1.id === '_player';
              return {
                opponentId: isPlayer1 ? match.player2.id : match.player1.id,
                opponentName: isPlayer1 ? match.player2.name : match.player1.name,
                playerColor: Math.random() < 0.5 ? 'w' : 'b',
                match,
                round: r
              };
            }
          }
        }
      }
      // Auto-resolve non-player matches
      this._autoResolveKnockoutNonPlayer();
      return null;
    }
  }

  /**
   * Record the result of the current match
   * @param {string} result - 'win', 'loss', or 'draw'
   */
  recordResult(result, matchRef) {
    if (!this.active || !matchRef) return;

    if (this.format === 'round-robin') {
      // Determine result code
      let resultCode;
      if (result === 'win') {
        resultCode = matchRef.whiteId === '_player' ? 'w' : 'b';
      } else if (result === 'loss') {
        resultCode = matchRef.whiteId === '_player' ? 'b' : 'w';
      } else {
        resultCode = 'd';
      }
      matchRef.result = resultCode;

      // Update standings
      this._updateRoundRobinStandings(matchRef);

    } else {
      // Knockout
      if (result === 'win') {
        matchRef.winner = '_player';
      } else if (result === 'loss') {
        const opp = matchRef.player1.id === '_player' ? matchRef.player2 : matchRef.player1;
        matchRef.winner = opp.id;
      } else {
        // Draw in knockout — for simplicity, consider it a loss for lower-seeded player
        // In practice, we'd play tiebreak games
        matchRef.winner = '_player'; // Give player benefit of doubt on draws
      }

      this._propagateKnockoutWinners();
    }

    this._save();
  }

  _updateRoundRobinStandings(match) {
    const white = this.standings.find(s => s.id === match.whiteId);
    const black = this.standings.find(s => s.id === match.blackId);

    if (white) white.played++;
    if (black) black.played++;

    if (match.result === 'w') {
      if (white) { white.wins++; white.points += 1; }
      if (black) { black.losses++; }
    } else if (match.result === 'b') {
      if (black) { black.wins++; black.points += 1; }
      if (white) { white.losses++; }
    } else {
      if (white) { white.draws++; white.points += 0.5; }
      if (black) { black.draws++; black.points += 0.5; }
    }

    // Sort standings
    this.standings.sort((a, b) => b.points - a.points || b.wins - a.wins);
  }

  _autoResolveNonPlayerMatches() {
    let changed = false;
    for (const match of this.schedule) {
      if (match.result === null && match.whiteId !== '_player' && match.blackId !== '_player') {
        // Simulate result based on Elo
        const wp = this.participants.find(p => p.id === match.whiteId);
        const bp = this.participants.find(p => p.id === match.blackId);
        const whiteWinProb = 1 / (1 + Math.pow(10, ((bp?.elo || 1500) - (wp?.elo || 1500)) / 400));
        const rand = Math.random();
        if (rand < whiteWinProb * 0.85) {
          match.result = 'w';
        } else if (rand < whiteWinProb * 0.85 + (1 - whiteWinProb) * 0.85) {
          match.result = 'b';
        } else {
          match.result = 'd';
        }
        this._updateRoundRobinStandings(match);
        changed = true;
      }
    }
    if (changed) this._save();
  }

  _autoResolveKnockoutNonPlayer() {
    let changed = false;
    for (let r = 0; r < this.bracket.length; r++) {
      for (const match of this.bracket[r]) {
        if (!match.winner && match.player1 && match.player2 &&
            match.player1.id !== '_player' && match.player2.id !== '_player' &&
            match.player1.id !== '_bye' && match.player2.id !== '_bye') {
          // Simulate based on Elo
          const winProb = 1 / (1 + Math.pow(10, (match.player2.elo - match.player1.elo) / 400));
          match.winner = Math.random() < winProb ? match.player1.id : match.player2.id;
          changed = true;
        }
      }
    }
    if (changed) {
      this._propagateKnockoutWinners();
      this._save();
    }
  }

  /**
   * Check if the tournament is finished
   */
  isFinished() {
    if (!this.active) return false;

    if (this.format === 'round-robin') {
      return this.schedule.every(m => m.result !== null);
    } else {
      const finalRound = this.bracket[this.bracket.length - 1];
      return finalRound && finalRound.length === 1 && finalRound[0].winner !== null;
    }
  }

  /**
   * Get tournament winner
   */
  getWinner() {
    if (!this.isFinished()) return null;

    if (this.format === 'round-robin') {
      return this.standings[0];
    } else {
      const finalMatch = this.bracket[this.bracket.length - 1][0];
      const winnerId = finalMatch.winner;
      return this.participants.find(p => p.id === winnerId);
    }
  }

  /**
   * Get progress info
   */
  getProgress() {
    if (this.format === 'round-robin') {
      const played = this.schedule.filter(m => m.result !== null).length;
      return { played, total: this.schedule.length };
    } else {
      const totalMatches = this.bracket.reduce((s, r) => s + r.length, 0);
      const played = this.bracket.reduce((s, r) => s + r.filter(m => m.winner).length, 0);
      return { played, total: totalMatches };
    }
  }

  /**
   * Abandon the tournament
   */
  abandon() {
    this.active = false;
    this._save();
  }

  /**
   * Clear tournament data
   */
  clear() {
    this.active = false;
    this.format = null;
    this.participants = [];
    this.schedule = [];
    this.standings = [];
    this.bracket = [];
    this.currentMatch = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}
