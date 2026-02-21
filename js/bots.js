// Grandmaster personality definitions for Stockfish UCI configuration

export const GM_STYLES = [
  { id: 'aggression', name: 'Aggression' },
  { id: 'defense', name: 'Defense' },
  { id: 'positional', name: 'Positional' },
  { id: 'tactical', name: 'Tactical' },
  { id: 'strategy', name: 'Strategy' },
  { id: 'endgame', name: 'Endgame' },
  { id: 'pawnPlay', name: 'Pawn Play' },
  { id: 'counterAttack', name: 'Counter' },
];

export const BOT_PERSONALITIES = [
  {
    id: 'tal',
    name: 'Mikhail Tal',
    subtitle: 'The Magician from Riga',
    description: 'Wild sacrifices and relentless attacks. The most creative and daring attacker in chess history.',
    elo: 1400,
    avatar: '\u{1F525}',
    styles: { aggression: 10, defense: 2, positional: 3, tactical: 10, strategy: 4, endgame: 4, pawnPlay: 4, counterAttack: 6 },
    uci: { 'Skill Level': 8, 'Contempt': 100 },
    searchDepth: 10,
    moveTime: null
  },
  {
    id: 'petrosian',
    name: 'Tigran Petrosian',
    subtitle: 'Iron Tigran',
    description: 'The ultimate defensive player. Prophylactic genius who eliminates your plans before they form.',
    elo: 1500,
    avatar: '\u{1F6E1}\uFE0F',
    styles: { aggression: 2, defense: 10, positional: 9, tactical: 5, strategy: 8, endgame: 8, pawnPlay: 8, counterAttack: 6 },
    uci: { 'Skill Level': 10, 'Contempt': -80 },
    searchDepth: 12,
    moveTime: null
  },
  {
    id: 'capablanca',
    name: 'Jose Raul Capablanca',
    subtitle: 'The Chess Machine',
    description: 'Simple, clear, perfect technique. Makes chess look effortless with crystal-clear logic.',
    elo: 1600,
    avatar: '\u{1F48E}',
    styles: { aggression: 3, defense: 7, positional: 9, tactical: 6, strategy: 8, endgame: 10, pawnPlay: 7, counterAttack: 5 },
    uci: { 'Skill Level': 12, 'Contempt': -30 },
    searchDepth: 12,
    moveTime: null
  },
  {
    id: 'botvinnik',
    name: 'Mikhail Botvinnik',
    subtitle: 'The Patriarch',
    description: 'Father of the Soviet chess school. Scientific approach with deep opening preparation.',
    elo: 1700,
    avatar: '\u{1F52C}',
    styles: { aggression: 5, defense: 7, positional: 8, tactical: 6, strategy: 9, endgame: 7, pawnPlay: 8, counterAttack: 5 },
    uci: { 'Skill Level': 14, 'Contempt': 10 },
    searchDepth: 14,
    moveTime: null
  },
  {
    id: 'alekhine',
    name: 'Alexander Alekhine',
    subtitle: 'The Dark Genius',
    description: 'Ferocious attacks with deep combinations. Turns calm positions into tactical storms.',
    elo: 1800,
    avatar: '\u26A1',
    styles: { aggression: 9, defense: 4, positional: 6, tactical: 9, strategy: 7, endgame: 6, pawnPlay: 5, counterAttack: 7 },
    uci: { 'Skill Level': 15, 'Contempt': 70 },
    searchDepth: 14,
    moveTime: null
  },
  {
    id: 'karpov',
    name: 'Anatoly Karpov',
    subtitle: 'The Boa Constrictor',
    description: 'Positional mastery and relentless pressure. Slowly squeezes opponents in a python grip.',
    elo: 2000,
    avatar: '\u{1F40D}',
    styles: { aggression: 3, defense: 8, positional: 10, tactical: 6, strategy: 9, endgame: 9, pawnPlay: 10, counterAttack: 5 },
    uci: { 'Skill Level': 16, 'Contempt': -40 },
    searchDepth: 16,
    moveTime: null
  },
  {
    id: 'fischer',
    name: 'Bobby Fischer',
    subtitle: 'The Prodigy',
    description: 'Relentless perfectionist. Equally devastating in attack and endgame. The complete player.',
    elo: 2200,
    avatar: '\u{1F3C6}',
    styles: { aggression: 7, defense: 6, positional: 8, tactical: 8, strategy: 8, endgame: 9, pawnPlay: 8, counterAttack: 7 },
    uci: { 'Skill Level': 18, 'Contempt': 20 },
    searchDepth: 16,
    moveTime: null
  },
  {
    id: 'anand',
    name: 'Vishy Anand',
    subtitle: 'The Lightning Kid',
    description: 'Lightning-fast intuition. Brilliant tactician who sees moves before others even calculate.',
    elo: 2300,
    avatar: '\u{1F31F}',
    styles: { aggression: 6, defense: 6, positional: 7, tactical: 9, strategy: 7, endgame: 7, pawnPlay: 6, counterAttack: 7 },
    uci: { 'Skill Level': 18 },
    searchDepth: null,
    moveTime: 1500
  },
  {
    id: 'kasparov',
    name: 'Garry Kasparov',
    subtitle: 'The Beast from Baku',
    description: 'The most dominating player ever. Crushing preparation, fearsome attacks, unbreakable will.',
    elo: 2700,
    avatar: '\u{1F981}',
    styles: { aggression: 9, defense: 6, positional: 8, tactical: 9, strategy: 9, endgame: 8, pawnPlay: 7, counterAttack: 8 },
    uci: { 'Skill Level': 20, 'Contempt': 50 },
    searchDepth: 18,
    moveTime: null
  },
  {
    id: 'carlsen',
    name: 'Magnus Carlsen',
    subtitle: 'The Mozart of Chess',
    description: 'Universal genius. Perfect intuition, endgame magician. The highest-rated player in history.',
    elo: 3500,
    avatar: '\u{1F451}',
    styles: { aggression: 5, defense: 8, positional: 10, tactical: 8, strategy: 9, endgame: 10, pawnPlay: 9, counterAttack: 8 },
    uci: { 'Skill Level': 20 },
    searchDepth: 20,
    moveTime: null
  }
];
