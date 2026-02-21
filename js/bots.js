// Grandmaster personality definitions — Chessmaster-inspired style system

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
  {
    id: 'tal',
    name: 'Mikhail Tal',
    subtitle: 'The Magician from Riga',
    peakElo: 2705,
    stockfishElo: 1600,
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
    uci: { 'Skill Level': 8, 'Contempt': 100 },
    searchDepth: 10,
    moveTime: null,
  },
  {
    id: 'petrosian',
    name: 'Tigran Petrosian',
    subtitle: 'Iron Tigran',
    peakElo: 2649,
    stockfishElo: 1800,
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
    uci: { 'Skill Level': 10, 'Contempt': -80 },
    searchDepth: 12,
    moveTime: null,
  },
  {
    id: 'capablanca',
    name: 'Jose Raul Capablanca',
    subtitle: 'The Chess Machine',
    peakElo: 2725,
    stockfishElo: 2000,
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
    uci: { 'Skill Level': 12, 'Contempt': -30 },
    searchDepth: 12,
    moveTime: null,
  },
  {
    id: 'botvinnik',
    name: 'Mikhail Botvinnik',
    subtitle: 'The Patriarch',
    peakElo: 2730,
    stockfishElo: 2100,
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
    uci: { 'Skill Level': 14, 'Contempt': 10 },
    searchDepth: 14,
    moveTime: null,
  },
  {
    id: 'alekhine',
    name: 'Alexander Alekhine',
    subtitle: 'The Great Attacker',
    peakElo: 2690,
    stockfishElo: 2200,
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
    uci: { 'Skill Level': 15, 'Contempt': 70 },
    searchDepth: 14,
    moveTime: null,
  },
  {
    id: 'karpov',
    name: 'Anatoly Karpov',
    subtitle: 'The Boa Constrictor',
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
];
