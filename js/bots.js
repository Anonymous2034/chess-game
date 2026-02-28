// Four-tier opponent system: Personalities, Grandmasters, Chess Machines, Custom

export const BOT_TIERS = [
  { id: 'personality', name: 'Personalities' },
  { id: 'grandmaster', name: 'Grandmasters' },
  { id: 'machine', name: 'Chess Machines' },
  { id: 'custom', name: 'Custom' },
];

export const GM_STYLES = [
  { id: 'material',      name: 'Material' },
  { id: 'positional',    name: 'Positional' },
  { id: 'aggression',    name: 'Aggression' },
  { id: 'defense',       name: 'Defense' },
  { id: 'kingSafety',    name: 'King Safety' },
  { id: 'pawnStructure', name: 'Pawn Play' },
  { id: 'pieceActivity', name: 'Piece Activity' },
  { id: 'tactical',      name: 'Tactical' },
  { id: 'endgame',       name: 'Endgame' },
  { id: 'drawContempt',  name: 'Fighting Spirit' },
];

export const BOT_PERSONALITIES = [
  // === Tier 1: Personalities ===
  {
    id: 'beginner-betty',
    name: 'Beginner Betty',
    subtitle: 'Just learning the ropes',
    tier: 'personality',
    peakElo: 800,
    stockfishElo: 1320,
    portrait: 'img/personalities/beginner-betty.svg',
    bio: {
      playingStyle: 'Makes basic moves but often overlooks tactics. Hangs pieces occasionally and misses forks. Perfect opponent for absolute beginners who are still learning how the pieces move.'
    },
    styles: { material: 2, positional: 1, aggression: 3, defense: 1, kingSafety: 1, pawnStructure: 1, pieceActivity: 2, tactical: 1, endgame: 1, drawContempt: 5 },
    uci: { 'Skill Level': 0 },
    searchDepth: 1,
    moveTime: null,
  },
  {
    id: 'casual-carl',
    name: 'Casual Carl',
    subtitle: 'Plays for fun',
    tier: 'personality',
    peakElo: 1000,
    stockfishElo: 1320,
    portrait: 'img/personalities/casual-carl.svg',
    bio: {
      playingStyle: 'Knows the basics and can punish obvious blunders, but still makes mistakes regularly. Enjoys the game without taking it too seriously. A relaxed opponent who occasionally surprises with decent moves.'
    },
    styles: { material: 3, positional: 2, aggression: 4, defense: 3, kingSafety: 2, pawnStructure: 2, pieceActivity: 3, tactical: 3, endgame: 2, drawContempt: 6 },
    uci: { 'Skill Level': 3 },
    searchDepth: 4,
    moveTime: null,
  },
  {
    id: 'club-charlie',
    name: 'Club Player Charlie',
    subtitle: 'Solid amateur',
    tier: 'personality',
    peakElo: 1400,
    stockfishElo: 1500,
    portrait: 'img/personalities/club-charlie.svg',
    bio: {
      playingStyle: 'A decent club player who understands basic strategy and can spot simple tactics. Plays solid but predictable chess. Can be outplayed with creative ideas or deep positional understanding.'
    },
    styles: { material: 5, positional: 4, aggression: 4, defense: 5, kingSafety: 4, pawnStructure: 4, pieceActivity: 4, tactical: 5, endgame: 4, drawContempt: 5 },
    uci: { 'Skill Level': 6 },
    searchDepth: 8,
    moveTime: null,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    subtitle: 'Instant instinct',
    tier: 'personality',
    peakElo: 1500,
    stockfishElo: 1600,
    portrait: 'img/personalities/speed-demon.svg',
    bio: {
      playingStyle: 'Moves almost instantly based on pattern recognition. Surprisingly strong despite minimal thinking time. Plays on pure instinct, which can lead to brilliant flashes but also impulsive mistakes.'
    },
    styles: { material: 4, positional: 3, aggression: 7, defense: 3, kingSafety: 3, pawnStructure: 3, pieceActivity: 6, tactical: 7, endgame: 3, drawContempt: 8 },
    uci: { 'Skill Level': 15, 'Contempt': 20 },
    searchDepth: null,
    moveTime: 500,
  },
  {
    id: 'tactician-tanya',
    name: 'Tactician Tanya',
    subtitle: 'Sharp and aggressive',
    tier: 'personality',
    peakElo: 1600,
    stockfishElo: 1700,
    portrait: 'img/personalities/tactician-tanya.svg',
    bio: {
      playingStyle: 'Loves sacrifices and complications. Plays aggressively and constantly looks for tactical shots. May overextend in pursuit of an attack, but punishes passive play with devastating combinations.'
    },
    styles: { material: 3, positional: 3, aggression: 9, defense: 2, kingSafety: 3, pawnStructure: 3, pieceActivity: 7, tactical: 8, endgame: 3, drawContempt: 9 },
    uci: { 'Skill Level': 10, 'Contempt': 80 },
    searchDepth: 10,
    moveTime: null,
  },
  {
    id: 'the-wall',
    name: 'The Wall',
    subtitle: 'Defensive fortress',
    tier: 'personality',
    peakElo: 1700,
    stockfishElo: 1800,
    portrait: 'img/personalities/the-wall.svg',
    bio: {
      playingStyle: 'Extremely solid and patient. Builds an impregnable fortress and waits for you to overextend. Will grind you down in the endgame with relentless technique. Nearly impossible to break through.'
    },
    styles: { material: 6, positional: 7, aggression: 1, defense: 9, kingSafety: 8, pawnStructure: 7, pieceActivity: 4, tactical: 4, endgame: 7, drawContempt: 1 },
    uci: { 'Skill Level': 12, 'Contempt': -50 },
    searchDepth: 12,
    moveTime: null,
  },
  {
    id: 'positional-pat',
    name: 'Positional Pat',
    subtitle: 'Strategic mastery',
    tier: 'personality',
    peakElo: 2000,
    stockfishElo: 2000,
    portrait: 'img/personalities/positional-pat.svg',
    bio: {
      playingStyle: 'Focuses on long-term positional advantages and piece placement. Rarely blunders and maintains steady pressure. Excels at exploiting structural weaknesses and converting small edges into wins.'
    },
    styles: { material: 6, positional: 8, aggression: 3, defense: 7, kingSafety: 6, pawnStructure: 8, pieceActivity: 7, tactical: 5, endgame: 7, drawContempt: 4 },
    uci: { 'Skill Level': 16, 'Contempt': -20 },
    searchDepth: 14,
    moveTime: null,
  },
  {
    id: 'candidate-master',
    name: 'Candidate Master',
    subtitle: 'Tournament strength',
    tier: 'personality',
    peakElo: 2200,
    stockfishElo: 2200,
    portrait: 'img/personalities/candidate-master.svg',
    bio: {
      playingStyle: 'A serious competitive player with very few weaknesses. Combines solid positional understanding with sharp tactical awareness. Punishes mistakes ruthlessly and plays accurate endgames. Good luck.'
    },
    styles: { material: 6, positional: 7, aggression: 6, defense: 6, kingSafety: 6, pawnStructure: 6, pieceActivity: 7, tactical: 7, endgame: 7, drawContempt: 6 },
    uci: { 'Skill Level': 18 },
    searchDepth: 16,
    moveTime: null,
  },
  // === Tier 2: Grandmasters ===
  {
    id: 'tal',
    name: 'Mikhail Tal',
    subtitle: 'The Magician from Riga',
    tier: 'grandmaster',
    peakElo: 2705,
    stockfishElo: 2250,
    portrait: 'img/gm/tal.svg',
    bio: {
      born: '1936, Riga, Latvia',
      died: '1992',
      worldChampion: '1960\u20131961',
      summary: 'The 8th World Chess Champion. Renowned as the most creative and daring attacker in chess history, earning the nickname "The Magician from Riga." Despite chronic health issues, he remained a top player for decades.',
      playingStyle: 'Wildly imaginative attacker who favored audacious piece sacrifices for initiative. His combinations were often unsound by engine standards but devastatingly effective against human opponents. Thrived in chaotic, complicated positions.'
    },
    favoriteOpenings: [
      { name: 'Sicilian Najdorf', eco: 'B90', asColor: 'b' },
      { name: "King's Indian Defense", eco: 'E60', asColor: 'b' },
      { name: 'Modern Benoni', eco: 'A60', asColor: 'b' },
      { name: 'Sicilian (Open)', eco: 'B80', asColor: 'w' },
    ],
    famousGames: [
      { name: 'Tal vs Botvinnik, 1960 WCh Game 6', year: 1960, description: 'Knight sacrifice for devastating kingside attack in the title-winning match' },
      { name: 'Tal vs Larsen, Candidates 1965', year: 1965, description: 'Decisive game in a tied match with brilliant Sicilian Scheveningen attack' },
      { name: 'Tal vs Flesch, 1981', year: 1981, description: 'Masterclass in sacrificial chess with multiple piece sacrifices' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 85 },
        { moves: ['d4'], weight: 15 },
      ],
      black: {
        'e4': [
          { moves: ['c5'], weight: 60 },
          { moves: ['e5'], weight: 25 },
          { moves: ['e6'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 70 },
          { moves: ['c5'], weight: 30 },
        ]
      }
    },
    styles: { material: 3, positional: 3, aggression: 10, defense: 2, kingSafety: 3, pawnStructure: 4, pieceActivity: 9, tactical: 10, endgame: 4, drawContempt: 10 },
    uci: { 'Skill Level': 12, 'Contempt': 100 },
    searchDepth: 12,
    moveTime: null,
  },
  {
    id: 'petrosian',
    name: 'Tigran Petrosian',
    subtitle: 'Iron Tigran',
    tier: 'grandmaster',
    peakElo: 2649,
    stockfishElo: 2200,
    portrait: 'img/gm/petrosian.svg',
    bio: {
      born: '1929, Tbilisi, Georgia',
      died: '1984',
      worldChampion: '1963\u20131969',
      summary: 'The 9th World Chess Champion. Considered the hardest player in history to beat. A student of Nimzowitsch\u2019s prophylactic philosophy, he excelled at preventing opponents\u2019 plans before they formed.',
      playingStyle: 'Supreme defensive master and pioneer of the positional exchange sacrifice. Preferred closed positions, favored knights over bishops, and excelled at neutralizing opponents\u2019 initiative. Would trade material for long-term structural advantages.'
    },
    favoriteOpenings: [
      { name: 'English Opening', eco: 'A10', asColor: 'w' },
      { name: "Queen's Indian Defense", eco: 'E12', asColor: 'b' },
      { name: 'French Defense', eco: 'C00', asColor: 'b' },
      { name: 'Caro-Kann Defense', eco: 'B10', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Petrosian vs Spassky, 1966 WCh Game 10', year: 1966, description: 'Remarkable double exchange sacrifice with complete positional domination' },
      { name: 'Reshevsky vs Petrosian, Zurich 1953', year: 1953, description: 'The most famous positional exchange sacrifice in chess history' },
      { name: 'Petrosian vs Botvinnik, 1963 WCh', year: 1963, description: 'Systematic dismantling en route to the world title' },
    ],
    openingLines: {
      white: [
        { moves: ['c4'], weight: 40 },
        { moves: ['d4'], weight: 40 },
        { moves: ['Nf3'], weight: 20 },
      ],
      black: {
        'e4': [
          { moves: ['e6'], weight: 45 },
          { moves: ['c6'], weight: 40 },
          { moves: ['e5'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 60 },
          { moves: ['e6'], weight: 40 },
        ]
      }
    },
    styles: { material: 5, positional: 9, aggression: 2, defense: 10, kingSafety: 9, pawnStructure: 9, pieceActivity: 6, tactical: 5, endgame: 8, drawContempt: 2 },
    uci: { 'Skill Level': 12, 'Contempt': -80 },
    searchDepth: 12,
    moveTime: null,
  },
  {
    id: 'capablanca',
    name: 'Jose Raul Capablanca',
    subtitle: 'The Chess Machine',
    tier: 'grandmaster',
    peakElo: 2725,
    stockfishElo: 2350,
    portrait: 'img/gm/capablanca.svg',
    bio: {
      born: '1888, Havana, Cuba',
      died: '1942',
      worldChampion: '1921\u20131927',
      summary: 'The 3rd World Chess Champion. A prodigy who learned chess at age four. Went eight years (1916\u20131924) without losing a single tournament game. His endgame technique was considered virtually flawless.',
      playingStyle: 'Crystal-clear positional play with unmatched natural talent. Made chess look effortless with simple, logical moves. Excelled in endgames with minimal visible effort, relying on intuition rather than deep calculation or opening theory.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
      { name: "Queen's Gambit Declined", eco: 'D30', asColor: 'b' },
      { name: 'Four Knights Game', eco: 'C47', asColor: 'w' },
      { name: "QGD Capablanca System", eco: 'D69', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Capablanca vs Marshall, New York 1918', year: 1918, description: 'Refuted the prepared Marshall Attack over the board in real time' },
      { name: 'Capablanca vs Tartakower, New York 1924', year: 1924, description: 'One of the greatest endgames ever played, sacrificing pawns for rook activity' },
      { name: 'Capablanca vs Lasker, 1921 WCh', year: 1921, description: 'Won the title undefeated: 4 wins, 10 draws, 0 losses' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 50 },
        { moves: ['d4'], weight: 50 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 70 },
          { moves: ['c5'], weight: 30 },
        ],
        'd4': [
          { moves: ['d5'], weight: 60 },
          { moves: ['Nf6'], weight: 40 },
        ]
      }
    },
    styles: { material: 6, positional: 9, aggression: 3, defense: 7, kingSafety: 7, pawnStructure: 7, pieceActivity: 8, tactical: 6, endgame: 10, drawContempt: 4 },
    uci: { 'Skill Level': 13, 'Contempt': -30 },
    searchDepth: 13,
    moveTime: null,
  },
  {
    id: 'botvinnik',
    name: 'Mikhail Botvinnik',
    subtitle: 'The Patriarch',
    tier: 'grandmaster',
    peakElo: 2730,
    stockfishElo: 2400,
    portrait: 'img/gm/botvinnik.svg',
    bio: {
      born: '1911, Kuokkala, Russia',
      died: '1995',
      worldChampion: '1948\u20131957, 1958\u20131960, 1961\u20131963',
      summary: 'The 6th World Chess Champion, holding the title across three reigns \u2014 the only champion to achieve this. A trained electrical engineer who pioneered the scientific approach to chess. Later mentored Karpov, Kasparov, and Kramnik.',
      playingStyle: 'Universal, scientific player who introduced meticulous opening preparation. Sought tense positions with chances for both sides. Willing to accept structural weaknesses his opponents couldn\u2019t exploit. Focused on creating long-lasting positional edges.'
    },
    favoriteOpenings: [
      { name: 'French Winawer', eco: 'C15', asColor: 'b' },
      { name: 'Nimzo-Indian Defense', eco: 'E20', asColor: 'b' },
      { name: "English Opening", eco: 'A10', asColor: 'w' },
      { name: "Queen's Gambit", eco: 'D06', asColor: 'w' },
    ],
    famousGames: [
      { name: 'Botvinnik vs Capablanca, AVRO 1938', year: 1938, description: 'Widely considered one of the greatest games ever played. The move 30.Ba3! is legendary.' },
      { name: 'Botvinnik vs Tal, 1961 WCh Return', year: 1961, description: 'Systematically neutralized Tal\u2019s tactical genius to regain the world title' },
      { name: 'Botvinnik vs Smyslov, 1954 WCh Game 7', year: 1954, description: 'Outmaneuvered Smyslov with a well-coordinated queenside attack' },
    ],
    openingLines: {
      white: [
        { moves: ['d4'], weight: 55 },
        { moves: ['c4'], weight: 30 },
        { moves: ['e4'], weight: 15 },
      ],
      black: {
        'e4': [
          { moves: ['e6'], weight: 60 },
          { moves: ['c5'], weight: 25 },
          { moves: ['e5'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 55 },
          { moves: ['d5'], weight: 45 },
        ]
      }
    },
    styles: { material: 6, positional: 8, aggression: 5, defense: 7, kingSafety: 7, pawnStructure: 8, pieceActivity: 7, tactical: 6, endgame: 7, drawContempt: 6 },
    uci: { 'Skill Level': 15, 'Contempt': 10 },
    searchDepth: 14,
    moveTime: null,
  },
  {
    id: 'alekhine',
    name: 'Alexander Alekhine',
    subtitle: 'The Great Attacker',
    tier: 'grandmaster',
    peakElo: 2690,
    stockfishElo: 2450,
    portrait: 'img/gm/alekhine.svg',
    bio: {
      born: '1892, Moscow, Russia',
      died: '1946',
      worldChampion: '1927\u20131935, 1937\u20131946',
      summary: 'The 4th World Chess Champion. Defeated the "invincible" Capablanca in 1927 and is the only world champion to die while holding the title. One of the greatest attacking players ever and a prolific chess theoretician.',
      playingStyle: 'Ferocious attacker whose aggression was built on deep positional understanding. Had an extraordinary ability to see attacking potential where others saw nothing. Equally at home in every style of play \u2014 called "the most versatile of all chess geniuses."'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
      { name: "Queen's Gambit", eco: 'D06', asColor: 'w' },
      { name: 'French Defense', eco: 'C00', asColor: 'b' },
      { name: "Alekhine's Defence", eco: 'B02', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Reti vs Alekhine, Baden-Baden 1925', year: 1925, description: 'Kasparov called it "potentially the most beautiful game ever played"' },
      { name: 'Bogoljubov vs Alekhine, Hastings 1922', year: 1922, description: 'Chernev called this "the greatest game of chess ever played"' },
      { name: 'Alekhine vs Capablanca, 1927 WCh', year: 1927, description: 'Historic match victory through deep preparation and tenacious spirit' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 55 },
        { moves: ['d4'], weight: 45 },
      ],
      black: {
        'e4': [
          { moves: ['e6'], weight: 45 },
          { moves: ['Nf6'], weight: 30 },
          { moves: ['e5'], weight: 25 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 50 },
          { moves: ['d5'], weight: 50 },
        ]
      }
    },
    styles: { material: 4, positional: 6, aggression: 9, defense: 4, kingSafety: 4, pawnStructure: 5, pieceActivity: 9, tactical: 9, endgame: 6, drawContempt: 9 },
    uci: { 'Skill Level': 16, 'Contempt': 70 },
    searchDepth: 14,
    moveTime: null,
  },
  {
    id: 'karpov',
    name: 'Anatoly Karpov',
    subtitle: 'The Boa Constrictor',
    tier: 'grandmaster',
    peakElo: 2780,
    stockfishElo: 2400,
    portrait: 'img/gm/karpov.svg',
    bio: {
      born: '1951, Zlatoust, Russia',
      died: null,
      worldChampion: '1975\u20131985',
      summary: 'The 12th World Chess Champion. Dominated tournament play for a decade and played five epic world championship matches against Kasparov. A student of Botvinnik\u2019s chess school. Held 102 months at world No. 1.',
      playingStyle: 'Master of exploiting the smallest positional advantages. Gradually strangles opponents by depriving them of counterplay until only losing moves remain. Excels in quiet, technical positions and converting tiny edges into wins.'
    },
    favoriteOpenings: [
      { name: "Queen's Pawn (1.d4)", eco: 'D00', asColor: 'w' },
      { name: 'Caro-Kann (Karpov Var.)', eco: 'B17', asColor: 'b' },
      { name: 'Ruy Lopez (Closed)', eco: 'C84', asColor: 'b' },
      { name: "Queen's Indian Defense", eco: 'E12', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Karpov vs Unzicker, Nice Olympiad 1974', year: 1974, description: 'Masterpiece of piece coordination and positional play in the Hedgehog' },
      { name: 'Karpov vs Topalov, Linares 1994', year: 1994, description: 'Classic positional mastery defeating dynamic counterplay' },
      { name: 'Karpov vs Spassky, Candidates 1974', year: 1974, description: 'Overcame the former world champion to earn the title match' },
    ],
    openingLines: {
      white: [
        { moves: ['d4'], weight: 60 },
        { moves: ['e4'], weight: 30 },
        { moves: ['Nf3'], weight: 10 },
      ],
      black: {
        'e4': [
          { moves: ['c6'], weight: 45 },
          { moves: ['e5'], weight: 40 },
          { moves: ['c5'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 65 },
          { moves: ['d5'], weight: 35 },
        ]
      }
    },
    styles: { material: 7, positional: 10, aggression: 3, defense: 8, kingSafety: 8, pawnStructure: 10, pieceActivity: 8, tactical: 6, endgame: 9, drawContempt: 4 },
    uci: { 'Skill Level': 16, 'Contempt': -40 },
    searchDepth: 16,
    moveTime: null,
  },
  {
    id: 'fischer',
    name: 'Bobby Fischer',
    subtitle: 'The Prodigy',
    tier: 'grandmaster',
    peakElo: 2785,
    stockfishElo: 2600,
    portrait: 'img/gm/fischer.svg',
    bio: {
      born: '1943, Chicago, USA',
      died: '2008',
      worldChampion: '1972\u20131975',
      summary: 'The 11th World Chess Champion. Became the youngest US Champion at 14 and a GM at 15. His 1972 victory over Spassky in "The Match of the Century" was a Cold War cultural phenomenon that brought chess global attention.',
      playingStyle: 'Relentless perfectionist combining deep opening preparation, tactical brilliance, positional mastery, and exceptional endgame technique. Played every game to win, even with Black. The most complete player of his era.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
      { name: 'Sicilian Najdorf', eco: 'B90', asColor: 'b' },
      { name: "King's Indian Defense", eco: 'E60', asColor: 'b' },
      { name: "Grunfeld Defense", eco: 'D70', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Byrne vs Fischer, New York 1956', year: 1956, description: '"The Game of the Century" \u2014 13-year-old Fischer\u2019s brilliant queen sacrifice' },
      { name: 'Fischer vs Spassky, 1972 WCh Game 6', year: 1972, description: 'Played the Queen\u2019s Gambit for the first time; Spassky applauded after' },
      { name: 'Fischer vs Larsen, Candidates 1971', year: 1971, description: 'Part of his legendary 6-0 sweep of a world-class GM' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 95 },
        { moves: ['d4'], weight: 5 },
      ],
      black: {
        'e4': [
          { moves: ['c5'], weight: 65 },
          { moves: ['e5'], weight: 35 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 70 },
          { moves: ['d5'], weight: 30 },
        ]
      }
    },
    styles: { material: 7, positional: 8, aggression: 7, defense: 6, kingSafety: 7, pawnStructure: 8, pieceActivity: 8, tactical: 8, endgame: 9, drawContempt: 9 },
    uci: { 'Skill Level': 18, 'Contempt': 20 },
    searchDepth: 16,
    moveTime: null,
  },
  {
    id: 'anand',
    name: 'Vishy Anand',
    subtitle: 'The Lightning Kid',
    tier: 'grandmaster',
    peakElo: 2817,
    stockfishElo: 2700,
    portrait: 'img/gm/anand.svg',
    bio: {
      born: '1969, Mayiladuthurai, India',
      died: null,
      worldChampion: '2007\u20132013',
      summary: 'The 15th World Chess Champion. India\u2019s first grandmaster (1988). Won the world title in 2007 and defended it against Kramnik, Topalov, and Gelfand before losing to Carlsen. Known for rapid playing speed.',
      playingStyle: 'Lightning-fast intuition with brilliant tactical vision. Evolved from a sharp tactician into a complete universal player. Known for rapid calculation speed, deep preparation, and ability to adapt his style to any opponent.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
      { name: 'Sicilian Najdorf', eco: 'B90', asColor: 'b' },
      { name: 'Catalan Opening', eco: 'E00', asColor: 'w' },
      { name: 'Nimzo-Indian Defense', eco: 'E20', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Aronian vs Anand, Wijk aan Zee 2013', year: 2013, description: 'Anand\u2019s "Immortal Game" \u2014 won in 23 moves with a breathtaking sacrificial attack' },
      { name: 'Anand vs Kramnik, 2008 WCh', year: 2008, description: 'Dominant match victory with deep preparation and decisive tactical blows' },
      { name: 'Anand, Mexico City WCh 2007', year: 2007, description: 'Undefeated tournament victory with 2848 performance to become undisputed champion' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 55 },
        { moves: ['d4'], weight: 40 },
        { moves: ['Nf3'], weight: 5 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 45 },
          { moves: ['c5'], weight: 40 },
          { moves: ['e6'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 70 },
          { moves: ['d5'], weight: 30 },
        ]
      }
    },
    styles: { material: 6, positional: 7, aggression: 6, defense: 6, kingSafety: 6, pawnStructure: 6, pieceActivity: 8, tactical: 9, endgame: 7, drawContempt: 7 },
    uci: { 'Skill Level': 18 },
    searchDepth: null,
    moveTime: 1500,
  },
  {
    id: 'kasparov',
    name: 'Garry Kasparov',
    subtitle: 'The Beast from Baku',
    tier: 'grandmaster',
    peakElo: 2851,
    stockfishElo: 2900,
    portrait: 'img/gm/kasparov.svg',
    bio: {
      born: '1963, Baku, Azerbaijan',
      died: null,
      worldChampion: '1985\u20132000',
      summary: 'The 13th World Chess Champion. Became the youngest undisputed champion at age 22. Ranked world No. 1 for 20 consecutive years (1985\u20132005). Pioneered deep computer-assisted preparation.',
      playingStyle: 'The most dominating player ever. Combined ferocious attacking play with extraordinary depth of preparation. Excelled at building dynamic piece activity and launching powerful attacks. His competitive intensity was legendary.'
    },
    favoriteOpenings: [
      { name: 'Sicilian Najdorf', eco: 'B90', asColor: 'b' },
      { name: "King's Indian Defense", eco: 'E60', asColor: 'b' },
      { name: 'Scotch Game', eco: 'C44', asColor: 'w' },
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
    ],
    famousGames: [
      { name: 'Kasparov vs Topalov, Wijk aan Zee 1999', year: 1999, description: '"Kasparov\u2019s Immortal" \u2014 three rook sacrifices and a spectacular king hunt' },
      { name: 'Karpov vs Kasparov, 1985 WCh Game 24', year: 1985, description: '"The game of his life" \u2014 sacrificed two pawns to become youngest champion' },
      { name: 'Kasparov vs Deep Blue, Game 1 1996', year: 1996, description: 'First game won by a computer vs a world champion under standard conditions' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 55 },
        { moves: ['d4'], weight: 40 },
        { moves: ['Nf3'], weight: 5 },
      ],
      black: {
        'e4': [
          { moves: ['c5'], weight: 60 },
          { moves: ['e5'], weight: 30 },
          { moves: ['d6'], weight: 10 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 65 },
          { moves: ['d5'], weight: 35 },
        ]
      }
    },
    styles: { material: 6, positional: 8, aggression: 9, defense: 6, kingSafety: 7, pawnStructure: 7, pieceActivity: 9, tactical: 9, endgame: 8, drawContempt: 9 },
    uci: { 'Skill Level': 20, 'Contempt': 50 },
    searchDepth: 18,
    moveTime: null,
  },
  {
    id: 'carlsen',
    name: 'Magnus Carlsen',
    subtitle: 'The Mozart of Chess',
    tier: 'grandmaster',
    peakElo: 2882,
    stockfishElo: 3190,
    portrait: 'img/gm/carlsen.svg',
    bio: {
      born: '1990, T\u00f8nsberg, Norway',
      died: null,
      worldChampion: '2013\u20132023',
      summary: 'The 16th World Chess Champion. Became a GM at 13 and the youngest world No. 1 at 19. Holds the all-time highest FIDE rating (2882). Won and defended the world title five times before choosing not to defend in 2023.',
      playingStyle: 'Universal genius who wins games other super-GMs would draw. His greatest strength is extracting wins from seemingly equal positions through relentless pressure and flawless endgame technique. Has the lowest error rate of any top player.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez / Berlin', eco: 'C65', asColor: 'b' },
      { name: 'Catalan Opening', eco: 'E00', asColor: 'w' },
      { name: 'London System', eco: 'D00', asColor: 'w' },
      { name: 'Sicilian Sveshnikov', eco: 'B30', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Carlsen vs Anand, 2013 WCh Game 5', year: 2013, description: 'Classic Carlsen grind \u2014 tiny advantage, relentless pressure, won rook ending' },
      { name: 'Carlsen vs Karjakin, 2016 WCh Tiebreak', year: 2016, description: 'Daring kingside pawn sacrifice to win the decisive tiebreak game' },
      { name: 'Carlsen vs Topalov, Nanjing 2009', year: 2009, description: 'Deep positional win part of his legendary 8/10 unbeaten streak' },
    ],
    openingLines: {
      white: [
        { moves: ['d4'], weight: 45 },
        { moves: ['e4'], weight: 40 },
        { moves: ['Nf3'], weight: 10 },
        { moves: ['c4'], weight: 5 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 50 },
          { moves: ['c5'], weight: 35 },
          { moves: ['c6'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 55 },
          { moves: ['d5'], weight: 45 },
        ]
      }
    },
    styles: { material: 7, positional: 10, aggression: 5, defense: 8, kingSafety: 8, pawnStructure: 9, pieceActivity: 9, tactical: 8, endgame: 10, drawContempt: 7 },
    uci: { 'Skill Level': 20 },
    searchDepth: 20,
    moveTime: null,
  },
  {
    id: 'spassky',
    name: 'Boris Spassky',
    subtitle: 'The Creative Champion',
    tier: 'grandmaster',
    peakElo: 2690,
    stockfishElo: 2300,
    portrait: 'img/gm/spassky.svg',
    bio: {
      born: '1937, Leningrad, USSR',
      died: '2023',
      worldChampion: '1969\u20131972',
      summary: 'The 10th World Chess Champion. A versatile and creative player who could adapt to any style. Best remembered for his 1972 World Championship match against Bobby Fischer in Reykjavik \u2014 "The Match of the Century" \u2014 which captivated the world during the Cold War.',
      playingStyle: 'Universal player with a creative flair who felt equally comfortable in sharp tactical battles and quiet positional maneuvering. Combined natural talent with a warm, sportsmanlike temperament. Excelled at finding unexpected resources in all types of positions.'
    },
    favoriteOpenings: [
      { name: "King's Gambit", eco: 'C30', asColor: 'w' },
      { name: 'Ruy Lopez (Closed)', eco: 'C84', asColor: 'w' },
      { name: "King's Indian Defense", eco: 'E60', asColor: 'b' },
      { name: 'Tarrasch Defense', eco: 'D32', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Spassky vs Fischer, 1972 WCh Game 6', year: 1972, description: 'The legendary match game where Fischer played 1.c4 for the first time; Spassky applauded' },
      { name: 'Spassky vs Bronstein, USSR Ch 1960', year: 1960, description: 'Beautiful King\u2019s Gambit miniature showcasing Spassky\u2019s romantic attacking style' },
      { name: 'Spassky vs Petrosian, 1969 WCh Game 19', year: 1969, description: 'Decisive game in the world championship match that won him the title' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 70 },
        { moves: ['d4'], weight: 30 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 50 },
          { moves: ['c5'], weight: 30 },
          { moves: ['e6'], weight: 20 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 60 },
          { moves: ['d5'], weight: 40 },
        ]
      }
    },
    styles: { material: 5, positional: 6, aggression: 7, defense: 5, kingSafety: 5, pawnStructure: 5, pieceActivity: 7, tactical: 7, endgame: 6, drawContempt: 7 },
    uci: { 'Skill Level': 13, 'Contempt': 50 },
    searchDepth: 13,
    moveTime: null,
  },
  {
    id: 'lasker',
    name: 'Emanuel Lasker',
    subtitle: 'The Philosopher Champion',
    tier: 'grandmaster',
    peakElo: 2720,
    stockfishElo: 2150,
    portrait: 'img/gm/lasker.svg',
    bio: {
      born: '1868, Berlinchen, Germany',
      died: '1941',
      worldChampion: '1894\u20131921',
      summary: 'The 2nd World Chess Champion, holding the title for 27 years \u2014 the longest reign in history. Also a distinguished mathematician and philosopher. Fled Nazi Germany in 1933 and spent his final years in New York.',
      playingStyle: 'A profoundly pragmatic and psychologically astute player who tailored his approach to exploit each opponent\u2019s specific weaknesses. Deliberately chose positions that were uncomfortable for his adversary rather than objectively best. Possessed remarkable resilience, frequently saving difficult positions.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
      { name: "Queen's Gambit Declined", eco: 'D30', asColor: 'b' },
      { name: 'French Defense', eco: 'C00', asColor: 'b' },
      { name: "Queen's Gambit", eco: 'D06', asColor: 'w' },
    ],
    famousGames: [
      { name: 'Lasker vs Capablanca, St Petersburg 1914', year: 1914, description: 'Defeated Capablanca in their only decisive classical game before the 1921 title match' },
      { name: 'Lasker vs Steinitz, 1894 WCh', year: 1894, description: 'Won the world championship at age 25 by defeating the aging Steinitz decisively' },
      { name: 'Lasker vs Napier, Cambridge Springs 1904', year: 1904, description: 'Spectacular combination with a famous queen sacrifice' },
    ],
    openingLines: {
      white: [
        { moves: ['d4'], weight: 50 },
        { moves: ['e4'], weight: 50 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 55 },
          { moves: ['e6'], weight: 30 },
          { moves: ['c5'], weight: 15 },
        ],
        'd4': [
          { moves: ['d5'], weight: 65 },
          { moves: ['Nf6'], weight: 35 },
        ]
      }
    },
    styles: { material: 6, positional: 7, aggression: 5, defense: 7, kingSafety: 6, pawnStructure: 6, pieceActivity: 7, tactical: 7, endgame: 9, drawContempt: 7 },
    uci: { 'Skill Level': 11, 'Contempt': 30 },
    searchDepth: 12,
    moveTime: null,
  },
  {
    id: 'steinitz',
    name: 'Wilhelm Steinitz',
    subtitle: 'The Father of Modern Chess',
    tier: 'grandmaster',
    peakElo: 2600,
    stockfishElo: 2050,
    portrait: 'img/gm/steinitz.svg',
    bio: {
      born: '1836, Prague, Austrian Empire',
      died: '1900',
      worldChampion: '1886\u20131894',
      summary: 'The 1st official World Chess Champion. Revolutionized chess by developing the principles of positional play, replacing the romantic attacking style that dominated 19th-century chess. His theoretical contributions laid the foundation for modern chess strategy.',
      playingStyle: 'Pioneer of strategic, positional chess who proved that sound positional play trumps speculative attacks. Advocated accumulating small advantages before launching an attack. In his younger years was a sharp attacker, but later became the architect of closed, maneuvering play.'
    },
    favoriteOpenings: [
      { name: 'Vienna Game', eco: 'C25', asColor: 'w' },
      { name: 'Ruy Lopez (Steinitz Def.)', eco: 'C62', asColor: 'b' },
      { name: "Queen's Gambit", eco: 'D06', asColor: 'w' },
      { name: 'French Defense', eco: 'C00', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Steinitz vs Zukertort, 1886 WCh', year: 1886, description: 'First official World Championship match in history, which Steinitz won decisively' },
      { name: 'Steinitz vs von Bardeleben, Hastings 1895', year: 1895, description: 'One of the most brilliant combinations in chess history; von Bardeleben left without resigning' },
      { name: 'Steinitz vs Chigorin, 1892 WCh', year: 1892, description: 'Defended his title by demonstrating positional superiority over romantic play' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 60 },
        { moves: ['d4'], weight: 40 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 65 },
          { moves: ['e6'], weight: 25 },
          { moves: ['c5'], weight: 10 },
        ],
        'd4': [
          { moves: ['d5'], weight: 70 },
          { moves: ['Nf6'], weight: 30 },
        ]
      }
    },
    styles: { material: 7, positional: 9, aggression: 3, defense: 8, kingSafety: 7, pawnStructure: 8, pieceActivity: 5, tactical: 5, endgame: 7, drawContempt: 5 },
    uci: { 'Skill Level': 10, 'Contempt': -20 },
    searchDepth: 11,
    moveTime: null,
  },
  {
    id: 'kramnik',
    name: 'Vladimir Kramnik',
    subtitle: 'The Berlin Wall',
    tier: 'grandmaster',
    peakElo: 2817,
    stockfishElo: 2750,
    portrait: 'img/gm/kramnik.svg',
    bio: {
      born: '1975, Tuapse, Russia',
      died: null,
      worldChampion: '2000\u20132007',
      summary: 'The 14th World Chess Champion. Dethroned Garry Kasparov in 2000 without losing a single game. Revived the Berlin Defense in the Ruy Lopez, turning it into a major weapon at the highest level. A student of Botvinnik\u2019s chess school.',
      playingStyle: 'Deep positional player with exceptional endgame technique and an unbreakable defensive style. Famous for his ability to neutralize aggressive opponents and grind out wins from minimal advantages. Combined strategic depth with precise calculation.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez / Berlin', eco: 'C65', asColor: 'b' },
      { name: 'Catalan Opening', eco: 'E00', asColor: 'w' },
      { name: 'Petroff Defense', eco: 'C42', asColor: 'b' },
      { name: "Queen's Gambit", eco: 'D06', asColor: 'w' },
    ],
    famousGames: [
      { name: 'Kramnik vs Kasparov, 2000 WCh Game 2', year: 2000, description: 'The Berlin Wall game that shocked the chess world and neutralized Kasparov\u2019s preparation' },
      { name: 'Kramnik vs Topalov, 2006 WCh Game 10', year: 2006, description: 'Critical game in a controversial match that reunified the world title' },
      { name: 'Kramnik vs Aronian, Candidates 2018', year: 2018, description: 'Classic Kramnik positional masterpiece in his final Candidates tournament' },
    ],
    openingLines: {
      white: [
        { moves: ['d4'], weight: 55 },
        { moves: ['Nf3'], weight: 25 },
        { moves: ['e4'], weight: 20 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 60 },
          { moves: ['c5'], weight: 25 },
          { moves: ['e6'], weight: 15 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 55 },
          { moves: ['d5'], weight: 45 },
        ]
      }
    },
    styles: { material: 6, positional: 9, aggression: 3, defense: 9, kingSafety: 8, pawnStructure: 9, pieceActivity: 7, tactical: 6, endgame: 9, drawContempt: 4 },
    uci: { 'Skill Level': 18, 'Contempt': -30 },
    searchDepth: 16,
    moveTime: null,
  },
  {
    id: 'morphy',
    name: 'Paul Morphy',
    subtitle: 'The Pride and Sorrow of Chess',
    tier: 'grandmaster',
    peakElo: 2690,
    stockfishElo: 2100,
    portrait: 'img/gm/morphy.svg',
    bio: {
      born: '1837, New Orleans, USA',
      died: '1884',
      summary: 'Widely regarded as the greatest natural chess talent in history. Dominated every opponent he faced during his brief career (1857\u20131859), defeating the strongest European masters with ease. Retired from chess at just 22 and never returned to competitive play.',
      playingStyle: 'Breathtaking attacking player who was decades ahead of his time. Emphasized rapid piece development, open lines, and initiative \u2014 principles that would only become standard much later. His games remain models of clarity and elegance in open positions.'
    },
    favoriteOpenings: [
      { name: "King's Gambit", eco: 'C30', asColor: 'w' },
      { name: 'Evans Gambit', eco: 'C51', asColor: 'w' },
      { name: 'Philidor Defense', eco: 'C41', asColor: 'b' },
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
    ],
    famousGames: [
      { name: 'Morphy vs Duke of Brunswick & Count Isouard, Paris 1858', year: 1858, description: 'The most famous chess game ever played \u2014 a brilliant opera box miniature' },
      { name: 'Paulsen vs Morphy, New York 1857', year: 1857, description: 'Stunning queen sacrifice and mating attack at the First American Chess Congress' },
      { name: 'Morphy vs Anderssen, Paris 1858', year: 1858, description: 'Victory over the strongest European player of the era, establishing Morphy\u2019s supremacy' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 95 },
        { moves: ['d4'], weight: 5 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 80 },
          { moves: ['c5'], weight: 15 },
          { moves: ['e6'], weight: 5 },
        ],
        'd4': [
          { moves: ['d5'], weight: 60 },
          { moves: ['Nf6'], weight: 40 },
        ]
      }
    },
    styles: { material: 4, positional: 5, aggression: 9, defense: 3, kingSafety: 4, pawnStructure: 4, pieceActivity: 10, tactical: 9, endgame: 5, drawContempt: 10 },
    uci: { 'Skill Level': 11, 'Contempt': 80 },
    searchDepth: 11,
    moveTime: null,
  },
  {
    id: 'smyslov',
    name: 'Vasily Smyslov',
    subtitle: 'The Harmonist',
    tier: 'grandmaster',
    peakElo: 2620,
    stockfishElo: 2200,
    portrait: 'img/gm/smyslov.svg',
    bio: {
      born: '1921, Moscow, USSR',
      died: '2010',
      worldChampion: '1957\u20131958',
      summary: 'The 7th World Chess Champion. Also a talented operatic baritone who nearly pursued a career in music. Remained competitive at the highest level for decades, reaching the Candidates final at age 62. A true artist of the chessboard.',
      playingStyle: 'Smooth, harmonious positional player with supreme endgame technique. Possessed an extraordinary intuitive feel for piece placement and coordination. His moves seemed effortless and natural, guided by a deep sense of harmony rather than brute calculation.'
    },
    favoriteOpenings: [
      { name: 'Ruy Lopez', eco: 'C60', asColor: 'w' },
      { name: "English Opening", eco: 'A10', asColor: 'w' },
      { name: "Grunfeld Defense", eco: 'D70', asColor: 'b' },
      { name: 'Slav Defense', eco: 'D10', asColor: 'b' },
    ],
    famousGames: [
      { name: 'Smyslov vs Botvinnik, 1957 WCh Game 10', year: 1957, description: 'Superb endgame technique in a critical game of the title-winning match' },
      { name: 'Smyslov vs Ribli, Candidates 1983', year: 1983, description: 'At age 62, outplayed a top GM to reach the Candidates final' },
      { name: 'Smyslov vs Reshevsky, Zurich 1953', year: 1953, description: 'A model game of smooth positional play and endgame conversion' },
    ],
    openingLines: {
      white: [
        { moves: ['e4'], weight: 45 },
        { moves: ['d4'], weight: 35 },
        { moves: ['c4'], weight: 20 },
      ],
      black: {
        'e4': [
          { moves: ['e5'], weight: 50 },
          { moves: ['c5'], weight: 30 },
          { moves: ['e6'], weight: 20 },
        ],
        'd4': [
          { moves: ['Nf6'], weight: 55 },
          { moves: ['d5'], weight: 45 },
        ]
      }
    },
    styles: { material: 6, positional: 8, aggression: 3, defense: 7, kingSafety: 7, pawnStructure: 7, pieceActivity: 8, tactical: 5, endgame: 10, drawContempt: 4 },
    uci: { 'Skill Level': 12, 'Contempt': -10 },
    searchDepth: 12,
    moveTime: null,
  },
  // === Tier 3: Chess Machines ===
  {
    id: 'komodo',
    name: 'Komodo',
    subtitle: 'Positional Engine',
    tier: 'machine',
    peakElo: 3350,
    stockfishElo: 3000,
    portrait: 'img/machines/komodo.svg',
    bio: {
      summary: 'Komodo is a UCI chess engine developed by Don Dailey, Larry Kaufman, and Mark Lefler. Known for its human-like positional evaluation and understanding of complex structures. Won multiple TCEC championships.',
      playingStyle: 'Positional powerhouse with human-like evaluation. Excels at exploiting long-term structural advantages and complex middlegame positions. Plays more "humanly" than other engines, making it an excellent training partner.'
    },
    styles: { material: 8, positional: 10, aggression: 5, defense: 9, kingSafety: 8, pawnStructure: 9, pieceActivity: 8, tactical: 8, endgame: 9, drawContempt: 5 },
    uci: { 'Skill Level': 20, 'Contempt': -10 },
    searchDepth: 22,
    moveTime: null,
  },
  {
    id: 'leela',
    name: 'Leela Zero',
    subtitle: 'Neural Network Engine',
    tier: 'machine',
    peakElo: 3400,
    stockfishElo: 3100,
    portrait: 'img/machines/leela.svg',
    bio: {
      summary: 'Leela Chess Zero (LC0) is an open-source neural network chess engine inspired by DeepMind\'s AlphaZero. Trained entirely through self-play reinforcement learning with zero human chess knowledge.',
      playingStyle: 'Creative, intuition-driven play powered by deep neural networks. Finds unconventional plans and prophylactic moves that traditional engines miss. Known for spectacular piece sacrifices for long-term positional compensation.'
    },
    styles: { material: 6, positional: 9, aggression: 7, defense: 7, kingSafety: 7, pawnStructure: 8, pieceActivity: 10, tactical: 8, endgame: 8, drawContempt: 7 },
    uci: { 'Skill Level': 20 },
    searchDepth: 24,
    moveTime: null,
  },
  {
    id: 'stockfish',
    name: 'Stockfish',
    subtitle: 'Maximum Strength',
    tier: 'machine',
    peakElo: 3550,
    stockfishElo: 3190,
    portrait: 'img/machines/stockfish.svg',
    bio: {
      summary: 'Stockfish is the strongest open-source chess engine in the world. Combining traditional alpha-beta search with an efficiently updatable neural network (NNUE), it has dominated computer chess since 2018.',
      playingStyle: 'Pure computational perfection. Combines brute-force calculation depth with neural network evaluation. Finds the objectively best move in virtually every position. The gold standard against which all other engines are measured.'
    },
    styles: { material: 9, positional: 9, aggression: 7, defense: 9, kingSafety: 9, pawnStructure: 9, pieceActivity: 9, tactical: 10, endgame: 10, drawContempt: 6 },
    uci: { 'Skill Level': 20 },
    searchDepth: 26,
    moveTime: null,
  },
  {
    id: 'alphazero',
    name: 'AlphaZero',
    subtitle: 'The Revolutionary',
    tier: 'machine',
    peakElo: 3600,
    stockfishElo: 3190,
    portrait: 'img/machines/alphazero.svg',
    bio: {
      summary: 'AlphaZero is DeepMind\'s revolutionary AI that taught itself chess in just 4 hours, then decisively defeated Stockfish. Published in 2017, it changed our understanding of chess and artificial intelligence forever.',
      playingStyle: 'Plays with breathtaking creativity and aggression. Willingly sacrifices material for long-term initiative and piece activity. Favors dynamic, attacking chess with a style many compare to the great romantic players but with inhuman precision.'
    },
    styles: { material: 5, positional: 10, aggression: 9, defense: 7, kingSafety: 6, pawnStructure: 7, pieceActivity: 10, tactical: 9, endgame: 9, drawContempt: 10 },
    uci: { 'Skill Level': 20, 'Contempt': 60 },
    searchDepth: 26,
    moveTime: null,
  },
];

// === Custom Bot Helpers ===

/** Map a rating (400–3000) to Stockfish UCI config */
export function ratingToEngine(rating) {
  rating = Math.max(400, Math.min(3000, rating));
  let skillLevel, depth;
  if (rating <= 800) {
    skillLevel = Math.round((rating - 400) / 400 * 3);
    depth = Math.round(1 + (rating - 400) / 400 * 2);
  } else if (rating <= 1200) {
    skillLevel = Math.round(3 + (rating - 800) / 400 * 5);
    depth = Math.round(4 + (rating - 800) / 400 * 4);
  } else if (rating <= 1600) {
    skillLevel = Math.round(8 + (rating - 1200) / 400 * 5);
    depth = Math.round(8 + (rating - 1200) / 400 * 4);
  } else if (rating <= 2000) {
    skillLevel = Math.round(13 + (rating - 1600) / 400 * 4);
    depth = Math.round(12 + (rating - 1600) / 400 * 4);
  } else if (rating <= 2500) {
    skillLevel = Math.round(17 + (rating - 2000) / 500 * 2);
    depth = Math.round(16 + (rating - 2000) / 500 * 4);
  } else {
    skillLevel = 20;
    depth = Math.round(20 + (rating - 2500) / 500 * 6);
  }
  return {
    uci: { 'Skill Level': skillLevel },
    searchDepth: depth,
    stockfishElo: rating,
  };
}

/** Load custom bots from localStorage and inject into BOT_PERSONALITIES */
export function loadCustomBots() {
  try {
    const raw = localStorage.getItem('chess_custom_bots');
    if (!raw) return;
    const bots = JSON.parse(raw);
    // Remove previous custom bots
    for (let i = BOT_PERSONALITIES.length - 1; i >= 0; i--) {
      if (BOT_PERSONALITIES[i].tier === 'custom') BOT_PERSONALITIES.splice(i, 1);
    }
    for (const bot of bots) {
      bot.tier = 'custom';
      BOT_PERSONALITIES.push(bot);
    }
  } catch (e) { /* ignore corrupt data */ }
}

/** Save custom bots from BOT_PERSONALITIES to localStorage */
export function saveCustomBots() {
  const customs = BOT_PERSONALITIES.filter(b => b.tier === 'custom');
  localStorage.setItem('chess_custom_bots', JSON.stringify(customs));
}

/** Available portraits for custom bots */
export const CUSTOM_BOT_PORTRAITS = [
  'img/personalities/beginner-betty.svg',
  'img/personalities/casual-carl.svg',
  'img/personalities/club-charlie.svg',
  'img/personalities/speed-demon.svg',
  'img/personalities/tactician-tanya.svg',
  'img/personalities/the-wall.svg',
  'img/personalities/positional-pat.svg',
  'img/personalities/candidate-master.svg',
  'img/gm/tal.svg',
  'img/gm/petrosian.svg',
  'img/gm/capablanca.svg',
  'img/gm/botvinnik.svg',
  'img/gm/alekhine.svg',
  'img/gm/karpov.svg',
  'img/gm/fischer.svg',
  'img/gm/anand.svg',
  'img/gm/kasparov.svg',
  'img/gm/carlsen.svg',
  'img/gm/spassky.svg',
  'img/gm/lasker.svg',
  'img/gm/steinitz.svg',
  'img/gm/kramnik.svg',
  'img/gm/morphy.svg',
  'img/gm/smyslov.svg',
  'img/machines/komodo.svg',
  'img/machines/leela.svg',
  'img/machines/stockfish.svg',
  'img/machines/alphazero.svg',
];
