// Training Plan Generator — analyzes game history and recommends practice areas

const STORAGE_KEY = 'chess_training_plan';

export class TrainingPlanGenerator {
  constructor(stats, puzzleManager, endgameTrainer, profile) {
    this.stats = stats;
    this.puzzleManager = puzzleManager;
    this.endgameTrainer = endgameTrainer;
    this.profile = profile;
  }

  /**
   * Generate a full training plan based on all available data.
   * Returns { focusAreas: [...], weeklyPlan: [...], summary: string }
   */
  generate() {
    const games = this.stats.games;
    const record = this.stats.getRecord();

    if (record.total < 3) {
      return {
        focusAreas: [],
        weeklyPlan: [],
        summary: 'Play at least 3 games to generate your training plan.'
      };
    }

    const focusAreas = [];

    // 1. Opening weaknesses
    const openingIssues = this._analyzeOpenings(games);
    if (openingIssues) focusAreas.push(openingIssues);

    // 2. Color imbalance
    const colorIssue = this._analyzeColorBalance(games);
    if (colorIssue) focusAreas.push(colorIssue);

    // 3. Tactical weakness (short losses)
    const tacticalIssue = this._analyzeTacticalWeakness(games);
    if (tacticalIssue) focusAreas.push(tacticalIssue);

    // 4. Endgame weakness (long losses)
    const endgameIssue = this._analyzeEndgameWeakness(games);
    if (endgameIssue) focusAreas.push(endgameIssue);

    // 5. Puzzle progress gaps
    const puzzleIssue = this._analyzePuzzleGaps();
    if (puzzleIssue) focusAreas.push(puzzleIssue);

    // 6. Endgame training gaps
    const endgameTrainingIssue = this._analyzeEndgameTrainingGaps();
    if (endgameTrainingIssue) focusAreas.push(endgameTrainingIssue);

    // 7. Challenge level
    const challengeIssue = this._analyzeChallengeLevel(games);
    if (challengeIssue) focusAreas.push(challengeIssue);

    // 8. Recent form / trend
    const trendIssue = this._analyzeRecentTrend(games);
    if (trendIssue) focusAreas.push(trendIssue);

    // Sort by priority (lower = more important)
    focusAreas.sort((a, b) => a.priority - b.priority);

    // Generate weekly plan
    const weeklyPlan = this._generateWeeklyPlan(focusAreas, record);

    const summary = this._buildSummary(record, focusAreas);

    return { focusAreas, weeklyPlan, summary };
  }

  _analyzeOpenings(games) {
    const openingStats = this.stats.getOpeningStats();
    // Find openings with 3+ games and < 35% win rate
    const weak = openingStats.filter(o => o.total >= 3 && o.winRate < 35);
    if (weak.length === 0) return null;

    const worst = weak[0]; // already sorted by total games desc
    return {
      id: 'openings',
      icon: '\u265e', // ♞
      title: 'Opening Repertoire',
      priority: 2,
      description: `Your win rate with ${worst.name} is only ${worst.winRate}% across ${worst.total} games.`,
      recommendations: [
        `Study ${worst.name} theory and typical plans`,
        `Review master games in this opening`,
        weak.length > 1 ? `Also struggling with: ${weak.slice(1, 3).map(o => `${o.name} (${o.winRate}%)`).join(', ')}` : null
      ].filter(Boolean),
      actions: [
        { label: `Study ${worst.name}`, type: 'opening', data: worst.name }
      ]
    };
  }

  _analyzeColorBalance(games) {
    if (games.length < 6) return null;

    const white = games.filter(g => g.playerColor === 'w' || g.playerColor === 'white');
    const black = games.filter(g => g.playerColor === 'b' || g.playerColor === 'black');

    if (white.length < 3 || black.length < 3) return null;

    const whiteWR = Math.round((white.filter(g => g.result === 'win').length / white.length) * 100);
    const blackWR = Math.round((black.filter(g => g.result === 'win').length / black.length) * 100);
    const diff = Math.abs(whiteWR - blackWR);

    if (diff < 20) return null;

    const weaker = whiteWR < blackWR ? 'White' : 'Black';
    const weakerWR = Math.min(whiteWR, blackWR);
    const strongerWR = Math.max(whiteWR, blackWR);

    return {
      id: 'color-balance',
      icon: '\u265f', // ♟
      title: 'Color Balance',
      priority: 3,
      description: `Your ${weaker} win rate (${weakerWR}%) is significantly lower than your ${weaker === 'White' ? 'Black' : 'White'} win rate (${strongerWR}%).`,
      recommendations: [
        `Play more games as ${weaker} to build experience`,
        weaker === 'Black'
          ? 'Focus on solid defensive openings as Black'
          : 'Work on initiative and first-move advantage as White'
      ],
      actions: []
    };
  }

  _analyzeTacticalWeakness(games) {
    const losses = games.filter(g => g.result === 'loss');
    if (losses.length < 3) return null;

    const shortLosses = losses.filter(g => (g.moveCount || 40) < 25);
    const shortLossRate = shortLosses.length / losses.length;

    if (shortLossRate < 0.4) return null;

    // Check puzzle progress
    const puzzleSummary = this.puzzleManager.getProgressSummary();
    const puzzleNote = puzzleSummary.totalSolved < 20
      ? `You've only solved ${puzzleSummary.totalSolved} puzzles — aim for at least 50.`
      : null;

    return {
      id: 'tactics',
      icon: '\u2694', // ⚔
      title: 'Tactical Awareness',
      priority: 1,
      description: `${Math.round(shortLossRate * 100)}% of your losses end before move 25, suggesting tactical vulnerabilities.`,
      recommendations: [
        'Practice tactical puzzles daily (10-15 per session)',
        puzzleNote,
        'Focus on forks, pins, and back-rank patterns'
      ].filter(Boolean),
      actions: [
        { label: 'Fork puzzles', type: 'puzzle', data: { theme: 'fork' } },
        { label: 'Pin puzzles', type: 'puzzle', data: { theme: 'pin' } },
        { label: 'Back rank puzzles', type: 'puzzle', data: { theme: 'back-rank' } }
      ]
    };
  }

  _analyzeEndgameWeakness(games) {
    const losses = games.filter(g => g.result === 'loss');
    if (losses.length < 3) return null;

    const longLosses = losses.filter(g => (g.moveCount || 40) > 45);
    const longLossRate = longLosses.length / losses.length;

    if (longLossRate < 0.35) return null;

    return {
      id: 'endgame-play',
      icon: '\u265a', // ♚
      title: 'Endgame Technique',
      priority: 2,
      description: `${Math.round(longLossRate * 100)}% of your losses come in long games (45+ moves), indicating endgame struggles.`,
      recommendations: [
        'Study fundamental endgame principles',
        'Practice king and pawn endgames first',
        'Learn rook endgame essentials (Lucena, Philidor)'
      ],
      actions: [
        { label: 'Train pawn endgames', type: 'endgame', data: 'pawn-endgame' },
        { label: 'Train rook endgames', type: 'endgame', data: 'rook-endgame' }
      ]
    };
  }

  _analyzePuzzleGaps() {
    const summary = this.puzzleManager.getProgressSummary();

    if (summary.totalSolved >= 50) return null; // doing well

    return {
      id: 'puzzles',
      icon: '\u2727', // ✧
      title: 'Puzzle Practice',
      priority: summary.totalSolved < 10 ? 1 : 4,
      description: summary.totalSolved === 0
        ? 'You haven\'t solved any puzzles yet. Puzzles are the fastest way to improve pattern recognition.'
        : `You've solved ${summary.totalSolved} puzzles (rating: ${summary.rating}). Regular practice will sharpen your tactical eye.`,
      recommendations: [
        'Solve 10 puzzles per day for consistent improvement',
        'Try the daily puzzle for streak building',
        'Gradually increase difficulty as you improve'
      ],
      actions: [
        { label: 'Start puzzles', type: 'puzzle', data: { theme: 'all' } },
        { label: 'Daily puzzle', type: 'puzzle', data: { daily: true } }
      ]
    };
  }

  _analyzeEndgameTrainingGaps() {
    const summary = this.endgameTrainer.getProgressSummary();
    const categories = this.endgameTrainer.getCategories();

    if (categories.length === 0) return null;

    // Find categories with 0 solved
    const unsolved = categories.filter(c => c.solved === 0);
    if (unsolved.length === 0 && summary.totalSolved > 10) return null;

    const totalPositions = categories.reduce((s, c) => s + c.count, 0);
    const solvedPct = totalPositions > 0 ? Math.round((summary.totalSolved / totalPositions) * 100) : 0;

    const priorityCategories = ['pawn-endgame', 'rook-endgame'];
    const urgentUnsolved = unsolved.filter(c => priorityCategories.includes(c.name));

    return {
      id: 'endgame-training',
      icon: '\u2655', // ♕
      title: 'Endgame Training',
      priority: urgentUnsolved.length > 0 ? 2 : 5,
      description: `You've completed ${solvedPct}% of endgame positions (${summary.totalSolved}/${totalPositions}).`
        + (urgentUnsolved.length > 0
          ? ` Critical gaps: ${urgentUnsolved.map(c => c.name.replace('-', ' ')).join(', ')}.`
          : ''),
      recommendations: [
        'Master pawn endgames before moving to piece endgames',
        'Practice each category until you can solve positions quickly',
        unsolved.length > 0 ? `${unsolved.length} category${unsolved.length > 1 ? 'ies' : 'y'} untouched` : null
      ].filter(Boolean),
      actions: unsolved.slice(0, 2).map(c => ({
        label: `Train ${c.name.replace(/-/g, ' ')}`,
        type: 'endgame',
        data: c.name
      }))
    };
  }

  _analyzeChallengeLevel(games) {
    if (games.length < 10) return null;

    const recent = games.slice(-20);
    const winRate = recent.filter(g => g.result === 'win').length / recent.length;

    if (winRate > 0.7) {
      // Winning too much — play stronger opponents
      const avgElo = Math.round(recent.reduce((s, g) => s + g.opponentElo, 0) / recent.length);
      return {
        id: 'challenge',
        icon: '\u2191', // ↑
        title: 'Challenge Level',
        priority: 3,
        description: `You're winning ${Math.round(winRate * 100)}% of recent games (avg opponent: ${avgElo}). Time to face stronger competition.`,
        recommendations: [
          'Play opponents 200-300 ELO above your current level',
          'Losses against stronger opponents teach more than easy wins',
          'Try tournament mode for structured competitive play'
        ],
        actions: [
          { label: 'Start tournament', type: 'tournament' }
        ]
      };
    }

    if (winRate < 0.25) {
      const avgElo = Math.round(recent.reduce((s, g) => s + g.opponentElo, 0) / recent.length);
      return {
        id: 'challenge',
        icon: '\u2193', // ↓
        title: 'Difficulty Adjustment',
        priority: 1,
        description: `You're winning only ${Math.round(winRate * 100)}% of recent games (avg opponent: ${avgElo}). Consider stepping back to build confidence.`,
        recommendations: [
          'Play against opponents closer to your level',
          'Focus on fundamentals and pattern recognition',
          'Build confidence with wins before increasing difficulty'
        ],
        actions: []
      };
    }

    return null;
  }

  _analyzeRecentTrend(games) {
    if (games.length < 15) return null;

    const last10 = games.slice(-10);
    const prev10 = games.slice(-20, -10);

    if (prev10.length < 5) return null;

    const recentWR = last10.filter(g => g.result === 'win').length / last10.length;
    const prevWR = prev10.filter(g => g.result === 'win').length / prev10.length;

    const diff = recentWR - prevWR;

    if (diff < -0.2) {
      return {
        id: 'trend',
        icon: '\u2198', // ↘
        title: 'Recent Slump',
        priority: 1,
        description: `Your win rate dropped from ${Math.round(prevWR * 100)}% to ${Math.round(recentWR * 100)}% in your last 10 games.`,
        recommendations: [
          'Take a break between games to stay fresh',
          'Review your recent losses for recurring patterns',
          'Try puzzles to rebuild confidence before playing'
        ],
        actions: [
          { label: 'Practice puzzles', type: 'puzzle', data: { theme: 'all' } }
        ]
      };
    }

    if (diff > 0.25) {
      return {
        id: 'trend',
        icon: '\u2197', // ↗
        title: 'Hot Streak',
        priority: 8,
        description: `Win rate improved from ${Math.round(prevWR * 100)}% to ${Math.round(recentWR * 100)}% — you're on fire!`,
        recommendations: [
          'Increase opponent difficulty to keep growing',
          'Note what\'s working and build on it',
          'Try new openings while confidence is high'
        ],
        actions: []
      };
    }

    return null;
  }

  _generateWeeklyPlan(focusAreas, record) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const plan = [];

    // Determine main practice areas
    const hasTacticalIssue = focusAreas.some(f => f.id === 'tactics' || f.id === 'puzzles');
    const hasEndgameIssue = focusAreas.some(f => f.id === 'endgame-play' || f.id === 'endgame-training');
    const hasOpeningIssue = focusAreas.some(f => f.id === 'openings');

    // Build a balanced weekly plan
    const puzzleThemes = ['mate', 'fork', 'pin', 'skewer', 'discovery', 'back-rank'];
    let themeIdx = 0;

    for (let d = 0; d < 7; d++) {
      const activities = [];
      const dayName = days[d];

      if (d % 2 === 0) {
        // Even days: puzzles
        const theme = puzzleThemes[themeIdx % puzzleThemes.length];
        activities.push({
          text: `10 puzzles (focus: ${theme})`,
          action: { type: 'puzzle', data: { theme } }
        });
        themeIdx++;
      }

      if (d % 3 === 0 && hasEndgameIssue) {
        activities.push({
          text: '5 endgame positions',
          action: { type: 'endgame', data: 'pawn-endgame' }
        });
      }

      if (d === 1 || d === 4) {
        activities.push({
          text: '2 games vs computer',
          action: { type: 'play' }
        });
      }

      if (d === 5 && hasOpeningIssue) {
        const openingArea = focusAreas.find(f => f.id === 'openings');
        activities.push({
          text: `Study ${openingArea ? openingArea.actions[0]?.data || 'openings' : 'openings'}`,
          action: null
        });
      }

      if (d === 6) {
        activities.push({
          text: 'Free play or tournament',
          action: { type: 'tournament' }
        });
      }

      // Ensure at least one activity per day
      if (activities.length === 0) {
        activities.push({
          text: 'Daily puzzle + review a master game',
          action: { type: 'puzzle', data: { daily: true } }
        });
      }

      plan.push({ day: dayName, activities });
    }

    return plan;
  }

  _buildSummary(record, focusAreas) {
    const rating = this.stats.estimateRating();
    const ratingStr = rating ? ` (est. rating: ${rating})` : '';
    const topIssues = focusAreas.slice(0, 3).map(f => f.title.toLowerCase());

    if (focusAreas.length === 0) {
      return `Based on ${record.total} games${ratingStr}: Your game looks solid! Keep playing and challenging yourself.`;
    }

    return `Based on ${record.total} games${ratingStr}: Focus on ${topIssues.join(', ')}.`;
  }
}
