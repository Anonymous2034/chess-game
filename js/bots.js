// Bot personality definitions for Stockfish UCI configuration

export const BOT_TIERS = [
  { id: 'beginner', name: 'Beginner', eloRange: '800-1200' },
  { id: 'intermediate', name: 'Intermediate', eloRange: '1200-1800' },
  { id: 'advanced', name: 'Advanced', eloRange: '1800-2500' },
  { id: 'expert', name: 'Expert', eloRange: '2500+' }
];

export const BOT_AVATARS = {
  beginner: '\u{1F423}',
  casual: '\u{1F60A}',
  club: '\u265F',
  tactician: '\u2694\uFE0F',
  wall: '\u{1F6E1}\uFE0F',
  speed: '\u26A1',
  positional: '\u{1F3DB}\uFE0F',
  master: '\u{1F3AF}',
  grandmaster: '\u{1F451}',
  maximum: '\u{1F916}'
};

export const BOT_PERSONALITIES = [
  {
    id: 'beginner-betty',
    name: 'Beginner Betty',
    subtitle: 'Just learning the ropes',
    description: 'Makes basic moves but often overlooks tactics. Perfect for absolute beginners.',
    elo: 800,
    tier: 'beginner',
    avatar: 'beginner',
    uci: {
      'Skill Level': 0
    },
    searchDepth: 1,
    moveTime: null
  },
  {
    id: 'casual-carl',
    name: 'Casual Carl',
    subtitle: 'Plays for fun',
    description: 'Knows the basics and can punish obvious blunders, but still makes mistakes.',
    elo: 1000,
    tier: 'beginner',
    avatar: 'casual',
    uci: {
      'Skill Level': 3
    },
    searchDepth: 4,
    moveTime: null
  },
  {
    id: 'club-player-charlie',
    name: 'Club Player Charlie',
    subtitle: 'Solid amateur',
    description: 'A decent club player who understands strategy but can be outplayed tactically.',
    elo: 1400,
    tier: 'intermediate',
    avatar: 'club',
    uci: {
      'Skill Level': 6
    },
    searchDepth: 8,
    moveTime: null
  },
  {
    id: 'tactician-tanya',
    name: 'Tactician Tanya',
    subtitle: 'Sharp and aggressive',
    description: 'Loves sacrifices and complications. Plays aggressively but may overextend. Inspired by Tal.',
    elo: 1600,
    tier: 'intermediate',
    avatar: 'tactician',
    uci: {
      'Skill Level': 10,
      'Contempt': 80
    },
    searchDepth: 10,
    moveTime: null
  },
  {
    id: 'the-wall',
    name: 'The Wall',
    subtitle: 'Defensive fortress',
    description: 'Extremely solid and patient. Will grind you down in the endgame. Inspired by Petrosian.',
    elo: 1700,
    tier: 'intermediate',
    avatar: 'wall',
    uci: {
      'Skill Level': 12,
      'Contempt': -50
    },
    searchDepth: 12,
    moveTime: null
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    subtitle: 'Instant instinct',
    description: 'Moves almost instantly based on pattern recognition. Strong but time-limited.',
    elo: 1500,
    tier: 'intermediate',
    avatar: 'speed',
    uci: {
      'Skill Level': 15,
      'Contempt': 20
    },
    searchDepth: null,
    moveTime: 500
  },
  {
    id: 'positional-pat',
    name: 'Positional Pat',
    subtitle: 'Strategic mastery',
    description: 'Focuses on long-term positional advantages. Rarely blunders. Inspired by Karpov.',
    elo: 2000,
    tier: 'advanced',
    avatar: 'positional',
    uci: {
      'Skill Level': 16,
      'Contempt': -20
    },
    searchDepth: 14,
    moveTime: null
  },
  {
    id: 'candidate-master',
    name: 'Candidate Master',
    subtitle: 'Tournament strength',
    description: 'A serious competitive player. Very few weaknesses. Good luck.',
    elo: 2200,
    tier: 'advanced',
    avatar: 'master',
    uci: {
      'Skill Level': 18
    },
    searchDepth: 16,
    moveTime: null
  },
  {
    id: 'grandmaster',
    name: 'The Grandmaster',
    subtitle: 'Elite strength',
    description: 'Plays at super-GM level. Finds deep tactics and long-term plans effortlessly.',
    elo: 2700,
    tier: 'expert',
    avatar: 'grandmaster',
    uci: {
      'Skill Level': 20,
      'Contempt': 30
    },
    searchDepth: 18,
    moveTime: null
  },
  {
    id: 'stockfish-max',
    name: 'Stockfish Maximum',
    subtitle: 'Inhuman precision',
    description: 'Full engine strength, no handicaps. The ultimate challenge.',
    elo: 3500,
    tier: 'expert',
    avatar: 'maximum',
    uci: {
      'Skill Level': 20
    },
    searchDepth: 20,
    moveTime: null
  }
];
