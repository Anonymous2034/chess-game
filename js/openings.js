// Opening mainlines — maps ECO codes to SAN move arrays for training mode.
// Each entry is a standard mainline of 5-10 moves (half-moves interleaved: W B W B ...).
export const OPENING_MAINLINES = {
  // === A — Flank Openings ===
  'A10': ['c4', 'e5'],                                                        // English Opening
  'A60': ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6'], // Modern Benoni

  // === B — Semi-Open Games ===
  'B02': ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'Bg4'],              // Alekhine's Defence
  'B10': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],            // Caro-Kann
  'B17': ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Nf3', 'Ngf6', 'Nxf6+', 'Nxf6'], // Caro-Kann Karpov Var.
  'B30': ['e4', 'c5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'cxd4', 'Nxd4', 'e5'], // Sicilian Sveshnikov
  'B80': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6'], // Sicilian Scheveningen
  'B90': ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], // Sicilian Najdorf

  // === C — Open Games ===
  'C00': ['e4', 'e6', 'd4', 'd5'],                                            // French Defense
  'C15': ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3'], // French Winawer
  'C25': ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],                                    // Vienna Game
  'C30': ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'd6', 'd4', 'g5', 'h4', 'g4'],   // King's Gambit
  'C41': ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nbd7'],             // Philidor Defense
  'C42': ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3', 'Nxe4', 'd4', 'd5'], // Petroff Defense
  'C44': ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'],                   // Scotch Game
  'C47': ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nxd4'],    // Four Knights
  'C51': ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5'], // Evans Gambit
  'C60': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], // Ruy Lopez
  'C62': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6'],                            // Ruy Lopez Steinitz Def.
  'C65': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5'], // Ruy Lopez Berlin
  'C84': ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'], // Ruy Lopez Closed

  // === D — Closed/Queen's Pawn Games ===
  'D00': ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'e6', 'Nf3', 'c5'],               // London System
  'D06': ['d4', 'd5', 'c4'],                                                  // Queen's Gambit
  'D10': ['d4', 'd5', 'c4', 'c6', 'Nc3', 'Nf6', 'Nf3', 'dxc4', 'a4', 'Bf5'], // Slav Defense
  'D30': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7'], // QGD
  'D32': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5', 'cxd5', 'exd5', 'Nf3', 'Nc6'], // Tarrasch Defense
  'D69': ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'Nbd7', 'Rc1', 'c6', 'Bd3', 'dxc4', 'Bxc4', 'Nd5'], // QGD Capablanca
  'D70': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7'], // Grunfeld

  // === E — Indian Defenses ===
  'E00': ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O'], // Catalan Opening
  'E12': ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Bb7', 'Bg2', 'Be7'], // Queen's Indian
  'E20': ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5'], // Nimzo-Indian
  'E60': ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'], // King's Indian
};

// Opening-specific commentary — per-move explanations for the training coach.
// Each ECO code maps to an array of strings: commentary[i] is shown after move i+1.
// Odd indices (0,2,4..) = White's moves, even indices (1,3,5..) = Black's replies.
export const OPENING_COMMENTARY = {
  'A10': [
    'The English Opening — 1.c4 controls d5 and steers the game into flank territory.',
    'Black stakes a central claim with 1...e5, creating a reversed Sicilian structure.',
  ],
  'A60': [
    '1.d4 — the classic start. White aims for central control.',
    '1...Nf6 develops a piece and prevents e4 for now.',
    '2.c4 grabs more space in the center. The Queen\'s Gambit complex begins.',
    '2...c5 — the Benoni counter-strike! Black challenges d4 immediately.',
    '3.d5 — White advances, locking the center and gaining space on the queenside.',
    '3...e6 undermines the d5-pawn. Black aims to open the position.',
    '4.Nc3 develops and defends. White builds naturally.',
    '4...exd5 opens the e-file and creates an asymmetric pawn structure.',
    '5.cxd5 recaptures. White\'s space advantage is clear but Black gets counterplay.',
    '5...d6 solidifies. The classic Benoni pawn structure is set: White has space, Black has dynamism.',
  ],
  'B02': [
    '1.e4 — King\'s pawn opening. White controls the center.',
    '1...Nf6 — Alekhine\'s Defence! A provocative choice — Black invites White to overextend.',
    '2.e5 — White accepts the challenge, pushing the knight away and grabbing space.',
    '2...Nd5 — The knight retreats to a strong central square.',
    '3.d4 — White builds a classical center with pawns on d4 and e5.',
    '3...d6 — Black immediately attacks the e5 pawn. The counterattack begins.',
    '4.Nf3 — Solid development, defending the center.',
    '4...Bg4 — Pinning the knight to the queen! Black creates immediate pressure.',
  ],
  'B10': [
    '1.e4 controls the center.',
    '1...c6 — the Caro-Kann! A solid, strategic defense preparing ...d5 with pawn support.',
    '2.d4 builds a strong classical center.',
    '2...d5 — Black strikes at the center immediately. The tension is created.',
    '3.Nc3 defends e4 and develops.',
    '3...dxe4 captures, relieving the central tension.',
    '4.Nxe4 — White has a centralized knight. But where will Black\'s light-squared bishop go?',
    '4...Bf5 — The key move! The bishop develops outside the pawn chain before ...e6 locks it in.',
  ],
  'B17': [
    '1.e4 — the classical opening move.',
    '1...c6 — Caro-Kann. Solid and reliable.',
    '2.d4 establishes the ideal center.',
    '2...d5 strikes back immediately.',
    '3.Nc3 defends e4 with a piece.',
    '3...dxe4 — Black simplifies the center.',
    '4.Nxe4 — a powerful centralized knight.',
    '4...Nd7 — Karpov\'s variation! Instead of the usual ...Bf5, Black prepares ...Ngf6 to challenge the knight.',
    '5.Nf3 — Developing naturally.',
    '5...Ngf6 — Now Black attacks the e4-knight.',
    '6.Nxf6+ — White exchanges before losing the initiative.',
    '6...Nxf6 — A balanced position. Black has a solid pawn structure and easy development.',
  ],
  'B30': [
    '1.e4 — standard.',
    '1...c5 — the Sicilian Defense! The most aggressive response to 1.e4.',
    '2.Nf3 develops and eyes d4.',
    '2...Nc6 — developing and controlling d4.',
    '3.Nc3 — instead of the Open Sicilian with d4, White chooses the Sveshnikov line.',
    '3...Nf6 attacks e4.',
    '4.d4 — now White opens the center.',
    '4...cxd4 — Black captures.',
    '5.Nxd4 — centralizing the knight.',
    '5...e5! — The Sveshnikov thrust! Black weakens d5 but gains dynamic play and space.',
  ],
  'B80': [
    '1.e4 controls the center.',
    '1...c5 — the Sicilian! Black fights for asymmetry.',
    '2.Nf3 develops toward d4.',
    '2...d6 — a flexible response, keeping options open.',
    '3.d4 — White opens the center as planned.',
    '3...cxd4 takes the pawn.',
    '4.Nxd4 — White has a central knight and open lines.',
    '4...Nf6 attacks e4.',
    '5.Nc3 defends and develops.',
    '5...e6 — the Scheveningen! A flexible, solid setup. Black will develop the bishop to e7 and castle.',
  ],
  'B90': [
    '1.e4 controls the center.',
    '1...c5 — the Sicilian.',
    '2.Nf3 develops.',
    '2...d6 — flexible.',
    '3.d4 opens the center.',
    '3...cxd4 captures.',
    '4.Nxd4 — centralized knight.',
    '4...Nf6 attacks e4.',
    '5.Nc3 develops.',
    '5...a6! — the Najdorf! This small move prepares ...e5, prevents Bb5+, and creates a flexible position. Fischer and Kasparov\'s weapon of choice.',
  ],
  'C00': [
    '1.e4 claims the center.',
    '1...e6 — the French Defense. Solid and strategic, preparing ...d5.',
    '2.d4 builds the ideal pawn center.',
    '2...d5 — Black challenges White\'s center immediately. The classic French tension.',
  ],
  'C15': [
    '1.e4 claims the center.',
    '1...e6 — the French Defense.',
    '2.d4 builds the full center.',
    '2...d5 challenges the center.',
    '3.Nc3 defends e4.',
    '3...Bb4 — the Winawer! Black pins the knight and puts pressure on e4.',
    '4.e5 — White gains space and locks the center.',
    '4...c5 — Black counter-attacks the d4 pawn immediately.',
    '5.a3 — White asks the bishop: stay or go?',
    '5...Bxc3+ — Black gives up the bishop pair for White\'s pawn structure.',
    '6.bxc3 — White has doubled c-pawns but the bishop pair and central space.',
  ],
  'C25': [
    '1.e4 claims the center.',
    '1...e5 — the symmetric response.',
    '2.Nc3 — the Vienna Game! White develops the knight before deciding on d4 or f4.',
    '2...Nf6 develops and attacks e4.',
    '3.f4 — the Vienna Gambit! White strikes in the center aggressively.',
  ],
  'C30': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.f4 — the King\'s Gambit! One of the oldest and most romantic openings.',
    '2...exf4 — Black accepts the gambit pawn.',
    '3.Nf3 — developing and preventing ...Qh4+.',
    '3...d6 — a solid defense, preparing to keep the extra pawn.',
    '4.d4 — White builds a strong center.',
    '4...g5 — Black defends the f4-pawn aggressively!',
    '5.h4 — striking at Black\'s pawn chain.',
    '5...g4 — Black pushes forward. The position is wild and tactical.',
  ],
  'C41': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...d6 — the Philidor Defense. Solid but somewhat passive, supporting e5.',
    '3.d4 — White strikes at the center.',
    '3...Nf6 develops and counter-attacks e4.',
    '4.Nc3 develops and defends.',
    '4...Nbd7 — Black keeps a compact, flexible setup. The modern Philidor approach.',
  ],
  'C42': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nf6 — the Petroff! Instead of defending, Black counter-attacks e4.',
    '3.Nxe5 — White takes the pawn.',
    '3...d6 — Black forces the knight back and will regain the pawn.',
    '4.Nf3 retreats.',
    '4...Nxe4 — Black has equalized the material.',
    '5.d4 — White builds a center and opens lines for the bishops.',
    '5...d5 — A solid, symmetric position. The Petroff leads to equality but Black must be precise.',
  ],
  'C44': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.d4 — the Scotch Game! White immediately opens the center.',
    '3...exd4 — Black captures.',
    '4.Nxd4 — White has a strong centralized knight and open lines.',
  ],
  'C47': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.Nc3 develops symmetrically.',
    '3...Nf6 — Four Knights! A classical, solid opening.',
    '4.d4 — White opens the center.',
    '4...exd4 captures.',
    '5.Nxd4 — A central knight. The position is open and balanced.',
  ],
  'C51': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.Bc4 — the Italian! Targeting the f7 weakness.',
    '3...Bc5 — Black mirrors with natural development.',
    '4.b4! — the Evans Gambit! A brilliant pawn sacrifice for rapid development and open lines.',
    '4...Bxb4 — Black accepts.',
    '5.c3 — White drives the bishop back and prepares a massive center with d4.',
    '5...Ba5 — The bishop retreats but stays active on the diagonal.',
  ],
  'C60': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.Bb5 — the Ruy Lopez! The king of openings. White pressures the e5 defender.',
    '3...a6 — the Morphy Defense. Black asks the bishop its intentions.',
    '4.Ba4 — the bishop retreats but maintains the pin threat.',
    '4...Nf6 — developing and counter-attacking e4.',
    '5.O-O — White castles early, a classic Ruy Lopez approach.',
    '5...Be7 — Black prepares to castle. A solid, well-tested setup.',
  ],
  'C62': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.Bb5 — the Ruy Lopez.',
    '3...d6 — the Steinitz Defense. Black supports e5 solidly but blocks the dark-squared bishop.',
  ],
  'C65': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.Bb5 — the Ruy Lopez.',
    '3...Nf6 — the Berlin Defense! Kramnik used this to dethrone Kasparov in 2000.',
    '4.O-O — White castles.',
    '4...Nxe4 — Black takes the pawn! Bold but well-analyzed.',
    '5.d4 — White opens the center for compensation.',
    '5...Nd6 — The knight retreats and attacks the bishop.',
    '6.Bxc6 — White captures.',
    '6...dxc6 — The "Berlin endgame" structure. Doubled pawns but strong bishops.',
    '7.dxe5 — White regains the pawn.',
    '7...Nf5 — The famous Berlin Wall. Extremely solid for Black.',
  ],
  'C84': [
    '1.e4 claims the center.',
    '1...e5 — symmetric.',
    '2.Nf3 attacks e5.',
    '2...Nc6 defends.',
    '3.Bb5 — the Ruy Lopez.',
    '3...a6 — Morphy Defense.',
    '4.Ba4 — maintaining the pressure.',
    '4...Nf6 — counter-attacking e4.',
    '5.O-O — classic castling.',
    '5...Be7 — preparing to castle.',
    '6.Re1 — protecting e4 and preparing for the center.',
    '6...b5 — gaining space on the queenside and restricting the bishop.',
    '7.Bb3 — the bishop goes to a good diagonal, eyeing f7.',
    '7...d6 — The Closed Ruy Lopez is set. A rich middlegame with plans for both sides.',
  ],
  'D00': [
    '1.d4 — Queen\'s pawn opening.',
    '1...d5 — Black mirrors, claiming central space.',
    '2.Bf4 — the London System! The bishop develops early before e3 locks it in.',
    '2...Nf6 — natural development.',
    '3.e3 — solid. White builds a sturdy structure.',
    '3...e6 — Black does the same.',
    '4.Nf3 — completing kingside development.',
    '4...c5 — Black strikes at White\'s center. The typical London middlegame begins.',
  ],
  'D06': [
    '1.d4 — Queen\'s pawn.',
    '1...d5 — symmetric center.',
    '2.c4 — the Queen\'s Gambit! White offers a pawn to gain central control.',
  ],
  'D10': [
    '1.d4 — Queen\'s pawn.',
    '1...d5 — central symmetry.',
    '2.c4 — Queen\'s Gambit.',
    '2...c6 — the Slav Defense! Black supports d5 without blocking the light-squared bishop.',
    '3.Nc3 develops.',
    '3...Nf6 — natural.',
    '4.Nf3 — completing kingside development.',
    '4...dxc4 — Black takes the gambit pawn! The idea is to develop ...Bf5 before playing ...e6.',
    '5.a4 — preventing ...b5 which would try to hold the extra pawn.',
    '5...Bf5 — Mission accomplished! The bishop is outside the pawn chain.',
  ],
  'D30': [
    '1.d4 — Queen\'s pawn.',
    '1...d5 — central.',
    '2.c4 — Queen\'s Gambit.',
    '2...e6 — the Queen\'s Gambit Declined. Solid and classical.',
    '3.Nc3 develops.',
    '3...Nf6 — natural.',
    '4.Bg5 — pinning the knight! This is the main line QGD.',
    '4...Be7 — breaking the pin.',
    '5.e3 — solid structure.',
    '5...O-O — Black castles to safety.',
    '6.Nf3 — completing development.',
    '6...Nbd7 — The classic QGD position. Black will aim for ...c5 or ...dxc4 followed by ...c5.',
  ],
  'D32': [
    '1.d4 — Queen\'s pawn.',
    '1...d5 — central.',
    '2.c4 — Queen\'s Gambit.',
    '2...e6 — declining the gambit.',
    '3.Nc3 develops.',
    '3...c5 — the Tarrasch Defense! Black accepts an isolated d-pawn for piece activity.',
    '4.cxd5 — White exchanges.',
    '4...exd5 — Black recaptures with the e-pawn, creating an isolated queen\'s pawn.',
    '5.Nf3 — developing.',
    '5...Nc6 — Black develops actively. The IQP gives dynamic piece play.',
  ],
  'D69': [
    '1.d4 — Queen\'s pawn.',
    '1...d5 — central.',
    '2.c4 — Queen\'s Gambit.',
    '2...e6 — QGD.',
    '3.Nc3 develops.',
    '3...Nf6 — natural.',
    '4.Bg5 — the main line pin.',
    '4...Be7 — breaking the pin.',
    '5.e3 — solid.',
    '5...O-O — castling.',
    '6.Nf3 — completing development.',
    '6...Nbd7 — standard QGD.',
    '7.Rc1 — controlling the c-file. White prepares for Black\'s ...c5 break.',
    '7...c6 — supporting the center.',
    '8.Bd3 — aiming at the kingside.',
    '8...dxc4 — Black releases the tension.',
    '9.Bxc4 — White has a strong position with active pieces.',
    '9...Nd5 — Capablanca\'s variation! The knight blockades on d5, offering exchanges to ease Black\'s position.',
  ],
  'D70': [
    '1.d4 — Queen\'s pawn.',
    '1...Nf6 — flexible. Black delays committing to a pawn structure.',
    '2.c4 — claiming space.',
    '2...g6 — the fianchetto! Setting up for King\'s Indian or Grunfeld.',
    '3.Nc3 develops.',
    '3...d5 — the Grunfeld Defense! Black strikes at the center immediately instead of playing ...Bg7 first.',
    '4.cxd5 — White takes.',
    '4...Nxd5 — recapturing with the knight.',
    '5.e4 — White builds a massive center.',
    '5...Nxc3 — Black exchanges.',
    '6.bxc3 — White has a big center but doubled pawns.',
    '6...Bg7 — The Grunfeld idea: the bishop on g7 pressures the overextended center. Black will attack d4 and c3.',
  ],
  'E00': [
    '1.d4 — Queen\'s pawn.',
    '1...Nf6 — flexible.',
    '2.c4 — space.',
    '2...e6 — preparing ...d5 or heading for an Indian setup.',
    '3.g3 — the Catalan! White fianchettoes, aiming the bishop at the long diagonal.',
    '3...d5 — Black claims the center.',
    '4.Bg2 — the Catalan bishop. It will pressure the entire queenside via the long diagonal.',
    '4...Be7 — solid development.',
    '5.Nf3 — completing the kingside.',
    '5...O-O — Both sides have castled. The Catalan leads to subtle positional play.',
  ],
  'E12': [
    '1.d4 — Queen\'s pawn.',
    '1...Nf6 — flexible.',
    '2.c4 — space.',
    '2...e6 — preparing.',
    '3.Nf3 — developing.',
    '3...b6 — the Queen\'s Indian! Black fianchettoes to control e4 from afar.',
    '4.g3 — White mirrors with a fianchetto.',
    '4...Bb7 — The bishop aims at e4 and the long diagonal.',
    '5.Bg2 — Both bishops stare at each other along the long diagonal!',
    '5...Be7 — Preparing to castle. A sophisticated positional battle.',
  ],
  'E20': [
    '1.d4 — Queen\'s pawn.',
    '1...Nf6 — flexible.',
    '2.c4 — space.',
    '2...e6 — preparing.',
    '3.Nc3 — developing.',
    '3...Bb4 — the Nimzo-Indian! Black pins the knight and fights for e4 control. One of the most respected openings.',
    '4.e3 — the Rubinstein variation. Solid and positional.',
    '4...O-O — castling to safety.',
    '5.Bd3 — developing toward the kingside.',
    '5...d5 — Black occupies the center. A classical Nimzo-Indian position with rich strategic themes.',
  ],
  'E60': [
    '1.d4 — Queen\'s pawn.',
    '1...Nf6 — flexible.',
    '2.c4 — space.',
    '2...g6 — the fianchetto approach.',
    '3.Nc3 — developing.',
    '3...Bg7 — the King\'s Indian bishop! Aimed at the center and the queenside.',
    '4.e4 — White builds the classical center. The eternal battle: center vs. flank.',
    '4...d6 — Black keeps the structure flexible.',
    '5.Nf3 — completing development.',
    '5...O-O — Black castles and prepares the counter-attack with ...e5 or ...c5.',
  ],
};

// Per-GM opening book system
// Matches the current move history against a GM's preferred opening lines
// and returns a book move if found, or null to fall back to Stockfish.

export class OpeningBook {
  /**
   * Get a book move for the current position based on the GM's opening lines.
   * @param {Object} bot - The bot personality with openingLines
   * @param {Object[]} moveHistory - Array of chess.js move objects (with .san property)
   * @param {string} engineColor - 'w' or 'b'
   * @returns {string|null} SAN move from book, or null
   */
  getBookMove(bot, moveHistory, engineColor) {
    if (!bot || !bot.openingLines) return null;

    const moveCount = moveHistory.length;

    // Only use book for the first ~8 moves (16 half-moves)
    if (moveCount >= 16) return null;

    const lines = bot.openingLines;

    // Determine which set of lines to use
    if (engineColor === 'w') {
      return this._getWhiteMove(lines, moveHistory, moveCount);
    } else {
      return this._getBlackMove(lines, moveHistory, moveCount);
    }
  }

  /**
   * Get a book move when the engine plays White
   */
  _getWhiteMove(lines, moveHistory, moveCount) {
    if (!lines.white) return null;

    // Engine is White, so it plays on even-numbered moves (0, 2, 4...)
    // moveCount is the total moves played so far
    // If moveCount is even, it's White's turn
    if (moveCount % 2 !== 0) return null; // Not our turn

    const whiteMovesPlayed = []; // White's moves so far
    for (let i = 0; i < moveHistory.length; i += 2) {
      whiteMovesPlayed.push(moveHistory[i].san);
    }

    // Find matching lines: a line matches if all its moves so far
    // match the white moves already played
    const whiteIndex = whiteMovesPlayed.length; // Which white move we need next

    const candidates = [];

    for (const line of lines.white) {
      if (!line.moves || line.moves.length <= whiteIndex) continue;

      // Check that all previous white moves match this line
      let matches = true;
      for (let i = 0; i < whiteIndex && i < line.moves.length; i++) {
        if (whiteMovesPlayed[i] !== line.moves[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        candidates.push({ move: line.moves[whiteIndex], weight: line.weight || 50 });
      }
    }

    return this._weightedPick(candidates);
  }

  /**
   * Get a book move when the engine plays Black
   */
  _getBlackMove(lines, moveHistory, moveCount) {
    if (!lines.black) return null;

    // Engine is Black, plays on odd-numbered moves (1, 3, 5...)
    if (moveCount % 2 !== 1) return null; // Not our turn

    // Get White's first move to find the right response set
    const whiteFirstMove = moveHistory[0]?.san;
    if (!whiteFirstMove) return null;

    // Find the response set for White's first move
    let responseSet = null;
    for (const [key, responses] of Object.entries(lines.black)) {
      if (whiteFirstMove === key) {
        responseSet = responses;
        break;
      }
    }

    if (!responseSet) return null;

    // Calculate which black move index we need
    const blackMovesPlayed = [];
    for (let i = 1; i < moveHistory.length; i += 2) {
      blackMovesPlayed.push(moveHistory[i].san);
    }
    const blackIndex = blackMovesPlayed.length;

    const candidates = [];

    for (const line of responseSet) {
      if (!line.moves || line.moves.length <= blackIndex) continue;

      // Check that all previous black moves match this line
      let matches = true;
      for (let i = 0; i < blackIndex && i < line.moves.length; i++) {
        if (blackMovesPlayed[i] !== line.moves[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        candidates.push({ move: line.moves[blackIndex], weight: line.weight || 50 });
      }
    }

    return this._weightedPick(candidates);
  }

  /**
   * Pick a move from weighted candidates
   */
  _weightedPick(candidates) {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0].move;

    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const c of candidates) {
      rand -= c.weight;
      if (rand <= 0) return c.move;
    }

    return candidates[candidates.length - 1].move;
  }
}
