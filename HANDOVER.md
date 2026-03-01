# Grandmasters Chess — Technical Handover

**Version:** v173 (SW cache) | **Last updated:** 2026-03-01
**Live:** https://grandmasters.pmgsinternational.com
**GitHub Pages:** https://anonymous2034.github.io/chess-game/
**Repository:** https://github.com/Anonymous2034/chess-game

---

## 1. What Is This?

A full-featured browser-based chess application built as a single-page PWA. Play against 30+ AI opponents modeled after real grandmasters, solve tactical puzzles, train endgames, analyze games with Stockfish WASM, study openings from a 10,000+ game database, and play real-time multiplayer. Works offline, installable on mobile, and connects to physical DGT/ChessUp electronic boards via Bluetooth.

---

## 2. Architecture Overview

```
Browser (PWA)
    |
    |  HTTPS (REST: /api/*)
    |  WSS   (/ws?game=CODE&token=JWT)
    v
Caddy reverse proxy (195.201.28.115)  — TLS termination
    |
    v  port 3000
Docker: grandmasters-api  — Node 20 / Express + ws
    |
    v  pg pool
Docker: grandmasters-db   — PostgreSQL 16
    |
    v  named volume (pgdata)
Persistent data
```

**Frontend:** Pure vanilla JS (ES modules), no build step, no framework. Single `index.html` (105 KB) + 46 JS modules + 1 CSS file (205 KB).

**Backend:** Node.js + TypeScript + Express + PostgreSQL. Compiled via `tsc`, runs as Docker container.

**Hosting:** Hetzner VPS at `195.201.28.115`, SSH via `~/.ssh/hetzner_omnex`, files at `/opt/grandmasters/`.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), HTML5, CSS3 |
| Chess logic | chess.js (move validation, FEN, PGN parsing) |
| Engine | Stockfish 16 NNUE via WASM Web Worker |
| AI Coach | 3-tier: rule-based tips → WebLLM Phi-3.5 (WebGPU) → cloud API |
| Backend | Node 20, Express 4, TypeScript 5.6 |
| Database | PostgreSQL 16 (Docker) |
| Auth | JWT (15min access + 30-day refresh) + Google OAuth |
| Multiplayer | Native WebSocket (ws library) |
| Passwords | bcrypt (12 rounds) |
| PWA | Service Worker (lazy caching), Web App Manifest |
| Hardware | Web Serial (DGT USB), WebSocket (LiveChess), BLE (DGT Pegasus, ChessUp) |
| Mobile | Capacitor (iOS/Android builds), responsive CSS |
| Deployment | Docker Compose, rsync + SSH |

---

## 4. Directory Structure

```
chess-game/
├── index.html                    # SPA shell (105 KB)
├── sw.js                         # Service Worker (v173)
├── manifest.json                 # PWA manifest
├── css/style.css                 # All styles (205 KB)
├── js/                           # 46 ES modules (see Section 6)
├── lib/
│   ├── chess.min.js              # chess.js library
│   └── stockfish/
│       ├── stockfish.js          # WASM wrapper
│       └── stockfish-nnue-16-single.wasm
├── data/
│   ├── puzzles.json              # 49 KB tactical puzzles
│   ├── endgames.json             # 41 KB endgame positions
│   ├── collections.json          # Game collection metadata
│   ├── classic-games/            # 3 PGN files (immortal games, miniatures, world championships)
│   ├── events/                   # 7 PGN files (Candidates, Linares, Norway Chess, etc.)
│   ├── openings/                 # 16 PGN files (Sicilian, Ruy Lopez, QGD, etc.)
│   ├── players/                  # 28 curated GM PGN collections
│   └── imports/                  # 55 bulk GM game archives + manifest.json
├── assets/
│   ├── pieces/                   # 5 themes x 12 SVGs = 60 piece images
│   │   ├── standard/, medieval/, neo/, pixel/, (root)
│   ├── favicon.svg, logo.svg, splash images
├── icons/                        # PWA icons (SVG, 192px, 512px, apple-touch)
├── img/
│   ├── gm/                       # 17 GM portrait SVGs
│   ├── machines/                 # 4 engine mascot SVGs (Stockfish, AlphaZero, Leela, Komodo)
│   ├── personalities/            # 8 personality bot SVGs
│   ├── composers/                # 29 composer portrait SVGs
│   └── avatars/                  # 12 player avatar SVGs
├── server/                       # Backend (see Section 8)
│   ├── src/
│   │   ├── index.ts              # Express + WebSocket entry point
│   │   ├── config.ts             # Environment config
│   │   ├── db.ts                 # pg Pool + schema init
│   │   ├── routes/
│   │   │   ├── auth.ts           # Register, login, Google OAuth, refresh, profile
│   │   │   ├── data.ts           # Stats, games, settings, coach chats, tournaments
│   │   │   ├── admin.ts          # User management (admin only)
│   │   │   └── multiplayer.ts    # Game creation/joining
│   │   ├── ws/channels.ts        # WebSocket relay (multiplayer moves)
│   │   ├── middleware/auth.ts     # JWT middleware
│   │   └── services/
│   │       ├── jwt.ts            # Token sign/verify/store/revoke
│   │       └── password.ts       # bcrypt hash/compare
│   ├── sql/schema.sql            # PostgreSQL schema (idempotent)
│   ├── Dockerfile                # Multi-stage Node 20 Alpine
│   ├── docker-compose.yml        # PostgreSQL 16 + API
│   ├── deploy.sh                 # rsync + docker compose
│   ├── package.json              # grandmasters-api
│   └── .env.example
├── .github/workflows/deploy.yml  # GitHub Pages CI
├── capacitor.config.ts           # Capacitor (iOS/Android)
├── package.json                  # Root (Capacitor deps)
├── serve.py                      # Local dev server
├── clear-cache.html              # SW cache clearing utility
└── test-features.html            # E2E test page
```

---

## 5. Features

### Core Chess
- **Play vs AI:** 30+ bot opponents across 4 tiers
  - **Personalities** (8): Beginner Betty (800), Casual Carl (1000), Club Charlie, Positional Pat, Tactician Tanya, Speed Demon, The Wall, Candidate Master
  - **Grandmasters** (17+): Morphy, Steinitz, Lasker, Capablanca, Alekhine, Botvinnik, Petrosian, Smyslov, Tal, Spassky, Fischer, Karpov, Kasparov, Kramnik, Anand, Carlsen, Ding, Caruana, Nakamura, etc.
  - **Machines** (4): Stockfish, AlphaZero, Leela, Komodo
  - **Custom bots:** User-defined with adjustable style sliders
- **Multiplayer:** Real-time online play via WebSocket with game codes
- **Time controls:** Bullet, blitz, rapid, classical, custom periods, Bronstein delay
- **Premoves:** Queue moves while opponent thinks
- **Takeback/Rematch:** Post-game controls
- **Bot vs Bot:** Spectator mode (BotMatch simulator)

### Analysis & Training
- **Stockfish 16 NNUE:** WASM Web Worker, configurable depth, Multi-PV support
- **Eval bar:** Real-time position evaluation (6px on mobile)
- **Eval graph:** SVG evaluation chart across all moves
- **Position commentary:** Static analysis (material, pawn structure, king safety, center control, piece activity, open files)
- **Opening book:** ECO code lookup with mainlines and commentary
- **Puzzle trainer:** Elo-rated tactical puzzles with streak tracking (SM-2 spaced repetition)
- **Endgame trainer:** Categorized endgame positions with progressive hints
- **Repertoire trainer:** Add opening lines, drill with spaced repetition
- **Tablebase:** Lichess Syzygy API for perfect endgame play (<=7 pieces)
- **Training plan:** Auto-generated weekly plan based on game analysis
- **Annotations:** NAG support, per-move comments, PGN import/export

### Game Database
- **107 PGN files:** Classic games, tournaments, openings, GM collections
- **55 bulk imports:** Full career archives of 55 grandmasters
- **Browse by:** Player, event, opening, collection
- **Auto-import:** Bundled PGN files loaded on first run via IndexedDB
- **Lichess import:** Import games from Lichess username

### Coaching System (3 tiers)
1. **CoachTips (rule-based):** 14 position features analyzed with actionable advice. Always available, zero latency.
2. **CoachWebLLM (in-browser AI):** Phi-3.5-mini via WebGPU (Chrome 113+). Runs locally, no server needed.
3. **CoachAPI (cloud):** Backend-proxied LLM for deeper analysis.
4. **GM Coach profiles:** 10+ grandmaster personalities (Tal, Karpov, Fischer, Kasparov, Carlsen) with unique teaching styles and position commentary.

### UI & Customization
- **5 piece themes:** Standard, Neo, Medieval, Pixel, root default
- **7 board themes:** Classic, Blue, Green, Purple, Red, Gray, Tournament
- **Free layout:** Draggable/resizable panel windows (desktop only)
- **12 player avatars:** King, Queen, Rook, Bishop, Knight, Pawn, Crown, Shield, Sword, Star, Flame, Lightning
- **Dark theme** throughout
- **Sound effects:** Web Audio API synthesis (no external audio files)
- **Voice narration:** Speech synthesis for move announcements
- **Background music:** Classical music streaming from Wikimedia Commons (29 composers)
- **Composer Mode:** CP-SAT constraint solver for instant music composition

### Hardware Integration
- **DGT e-Board (USB):** Web Serial API — full piece recognition
- **DGT LiveChess 2:** WebSocket connection via desktop software
- **DGT Pegasus (BLE):** Bluetooth Low Energy via Capacitor
- **ChessUp Smart Board (BLE):** BLE protocol integration (Nordic UART)
- **Board Scanner:** Camera-based position recognition via getUserMedia

### PWA & Mobile
- **Installable:** Web App Manifest with app shortcuts
- **Offline support:** Service Worker with lazy caching (19 core files precached)
- **Mobile layout:** Bottom tab navigation (Moves, Analyze, Coach, Board, More)
- **Touch optimized:** Tap-to-move (drag disabled on touch), touch-action isolation on board
- **Wake Lock:** Screen stays on during games
- **Download dialog:** Fullscreen install prompt (Android native + iOS instructions)
- **Capacitor:** iOS and Android native builds

### User System
- **Email/password registration** with bcrypt
- **Google Sign-In** (OAuth 2.0 — code deployed, needs Client ID)
- **JWT auth:** 15-min access tokens + 30-day refresh tokens with rotation
- **Cloud sync:** Stats, games, settings, coach chats, tournaments synced to PostgreSQL
- **localStorage fallback:** Full functionality without an account
- **Admin panel:** User management, stats viewer, leaderboard
- **Achievements:** 30+ unlockable achievements across categories
- **Rating system:** Elo-based estimated rating with history graph
- **Chess news:** Live tournament broadcasts from Lichess API

---

## 6. JavaScript Modules (46 files)

| Module | Class/Export | Purpose |
|---|---|---|
| `main.js` | `ChessApp` | App orchestrator, 49 setup methods, all UI wiring |
| `game.js` | `Game` | Game state, chess.js instance, timers, move history |
| `board.js` | `Board` | Board rendering, click/drag handling, premoves |
| `engine.js` | `Engine` | Stockfish WASM Web Worker, UCI protocol |
| `notation.js` | `Notation` | Move list rendering, PGN import/export, annotations |
| `captured.js` | `CapturedPieces` | Captured piece display + material advantage |
| `eval-graph.js` | `EvalGraph` | SVG evaluation graph |
| `api-client.js` | `apiFetch()` | JWT-attached fetch wrapper with auto-refresh |
| `auth.js` | `AuthManager` | Login, register, Google OAuth, session management |
| `data-service.js` | `DataService` | Dual-mode data (backend + localStorage fallback) |
| `multiplayer.js` | `MultiplayerManager` | WebSocket multiplayer (create, join, moves, presence) |
| `bots.js` | `BOT_PERSONALITIES` | 30+ bot definitions with Elo, style, UCI settings |
| `bot-match.js` | `BotMatch` | Bot vs Bot game simulator |
| `openings.js` | `OpeningBook` | ECO mainlines + commentary |
| `puzzle.js` | `PuzzleManager` | Tactical puzzles with Elo rating system |
| `endgame-trainer.js` | `EndgameTrainer` | Endgame position training |
| `tournament.js` | `Tournament` | Round-robin + knockout tournament system |
| `coach.js` | `CoachManager` | 3-tier coaching orchestrator |
| `coach-tips.js` | `CoachTips` | Rule-based position tips |
| `coach-webllm.js` | `CoachWebLLM` | In-browser Phi-3.5-mini via WebGPU |
| `coach-api.js` | `CoachAPI` | Cloud LLM coaching |
| `gm-coach-profiles.js` | `GM_COACH_PROFILES` | GM personality coaching profiles |
| `themes.js` | `ThemeManager` | Board + piece theme management |
| `sound.js` | `SoundManager` | Web Audio API sound effects |
| `music.js` | `MusicPlayer` | Classical music streaming |
| `composer-profiles.js` | `COMPOSER_PROFILES` | 29 composer metadata for Composer Mode |
| `stats.js` | `PlayerStats` | Game records, rating calculation |
| `profile.js` | `PlayerProfile` | Avatar, display name |
| `achievements.js` | `AchievementManager` | 30+ achievements |
| `rating-graph.js` | `RatingGraph` | SVG rating history chart |
| `repertoire.js` | `RepertoireTrainer` | Opening repertoire with spaced repetition |
| `tablebase.js` | `TablebaseLookup` | Lichess Syzygy endgame tablebase |
| `training-plan.js` | `TrainingPlanGenerator` | Auto-generated weekly training plan |
| `database.js` | `Database` | PGN collection management + IndexedDB storage |
| `admin.js` | `AdminPanel` | Admin user management panel |
| `position-commentary.js` | `PositionCommentary` | Static position analysis text |
| `free-layout.js` | `FreeLayout` | Draggable/resizable panel windows (desktop) |
| `board-scanner.js` | `BoardScanner` | Camera-based board position recognition |
| `dgt.js` | `DGTBoard` | DGT e-Board (USB, LiveChess, BLE) |
| `chessup.js` | `ChessUpBoard` | ChessUp Smart Board (BLE) |
| `chess-news.js` | `ChessNews` | Lichess broadcast API |
| `utils.js` | `show()`, `hide()`, etc. | DOM utility functions |
| `analysis.js` | — | Analysis panel UI logic |

---

## 7. API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Email/password registration |
| POST | `/login` | No | Email/password login |
| POST | `/google` | No | Google OAuth (ID token verification) |
| POST | `/logout` | No | Revoke refresh token |
| POST | `/refresh` | No | Rotate refresh token pair |
| GET | `/me` | Yes | Current user profile |
| PUT | `/profile` | Yes | Update display name |

### Data (`/api/data`) — all require auth
| Method | Path | Description |
|---|---|---|
| GET/PUT | `/stats` | Player stats (JSONB blob) |
| GET/POST | `/games` | Game history (max 200) |
| GET/PUT | `/settings` | User settings (JSONB blob) |
| GET/POST | `/coach-chats` | Coach chat sessions (max 100) |
| GET/PUT | `/tournaments` | Tournament state (JSONB blob) |
| POST | `/migrate` | One-time localStorage → server migration |

### Admin (`/api/admin`) — require admin role
| Method | Path | Description |
|---|---|---|
| GET | `/users` | All users with profiles |
| GET | `/users/:uid/stats` | User stats by ID |
| GET | `/users/:uid/games` | User games by ID |

### Multiplayer (`/api/multiplayer`) — require auth
| Method | Path | Description |
|---|---|---|
| POST | `/games` | Create game (returns code) |
| POST | `/games/join` | Join by code |
| PUT | `/games/:id` | Archive result + PGN |

### WebSocket (`/ws`)
- Connect: `wss://grandmasters.pmgsinternational.com/ws?game=CODE&token=JWT&name=Name&role=host|guest`
- Events relayed: moves, resign, draw offers, timer sync, presence

### Health
- `GET /api/health` → `{ status: 'ok', timestamp }`

---

## 8. Database Schema

```sql
users (id UUID PK, email UNIQUE, password_hash NULL, display_name, is_admin, google_id UNIQUE, created_at)
refresh_tokens (id UUID PK, user_id FK, token_hash, expires_at, revoked, created_at)
user_stats (user_id PK FK, data JSONB, updated_at)
user_settings (user_id PK FK, data JSONB, updated_at)
games (id UUID PK, user_id FK, opponent, opponent_elo, result, pgn, opening, player_color, move_count, time_control, created_at)
coach_chats (id UUID PK, user_id FK, messages JSONB, game_context JSONB, created_at)
tournaments (user_id PK FK, data JSONB, updated_at)
migrations (user_id PK FK, migrated_at)
multiplayer_games (id UUID PK, code, host_id FK, guest_id FK, host_color, time_control, increment, status, result, pgn, created_at)
```

Schema is idempotent (`CREATE IF NOT EXISTS` + `ALTER` wrapped in exception handlers). Runs automatically on every server start via `initDatabase()`.

---

## 9. Deployment

### Server Details
- **IP:** 195.201.28.115 (Hetzner VPS)
- **SSH:** `ssh -i ~/.ssh/hetzner_omnex root@195.201.28.115`
- **Files:** `/opt/grandmasters/` (compose project root)
- **Frontend:** `/opt/grandmasters/public/`
- **Docker API:** Old version — requires `DOCKER_API_VERSION=1.41` prefix
- **Compose:** `docker-compose` (v1 syntax, not `docker compose` v2)

### Deploy Frontend
```bash
rsync -avz -e "ssh -i ~/.ssh/hetzner_omnex" \
  ./index.html ./sw.js \
  root@195.201.28.115:/opt/grandmasters/public/

rsync -avz -e "ssh -i ~/.ssh/hetzner_omnex" \
  ./js/ root@195.201.28.115:/opt/grandmasters/public/js/

rsync -avz -e "ssh -i ~/.ssh/hetzner_omnex" \
  ./css/ root@195.201.28.115:/opt/grandmasters/public/css/
```

### Deploy Backend
```bash
# 1. Copy source files to the CORRECT location (/opt/grandmasters/, NOT /opt/grandmasters/server/)
rsync -avz -e "ssh -i ~/.ssh/hetzner_omnex" \
  --exclude node_modules --exclude dist \
  ./server/src/ root@195.201.28.115:/opt/grandmasters/src/
rsync -avz -e "ssh -i ~/.ssh/hetzner_omnex" \
  ./server/sql/ root@195.201.28.115:/opt/grandmasters/sql/
rsync -avz -e "ssh -i ~/.ssh/hetzner_omnex" \
  ./server/package.json root@195.201.28.115:/opt/grandmasters/package.json

# 2. Rebuild and restart
ssh -i ~/.ssh/hetzner_omnex root@195.201.28.115 \
  "cd /opt/grandmasters && DOCKER_API_VERSION=1.41 docker-compose build api && DOCKER_API_VERSION=1.41 docker-compose up -d api"
```

### Deploy Gotchas
- The Docker compose project is at `/opt/grandmasters/`, NOT `/opt/grandmasters/server/`. The `server/` directory in the repo is the source, but on the server the files live at the root of `/opt/grandmasters/`.
- Use `DOCKER_API_VERSION=1.41` before every docker/docker-compose command.
- Don't use `--no-cache` flag (not supported on this Docker version).
- If port 3000 is already allocated, stop the old container first: `docker stop grandmasters-api-1 && docker rm grandmasters-api-1`.

### Version Bumping
When deploying changes, bump **three** version numbers:
1. `sw.js` → `const CACHE_NAME = 'grandmasters-vXXX';`
2. `index.html` → all `?v=XXX` params (CSS, chess.min.js, main.js)
3. Keep all three in sync

### Environment Variables (`.env` on server)
```
DB_HOST=db
DB_PORT=5432
DB_NAME=grandmasters
DB_USER=grandmasters
DB_PASSWORD=<secret>
JWT_SECRET=<64-char hex>
JWT_REFRESH_SECRET=<64-char hex>
GOOGLE_CLIENT_ID=<not yet configured>
PORT=3000
```

---

## 10. Service Worker Strategy

**Cache name:** `grandmasters-v173`

| Scenario | Behavior |
|---|---|
| Install | Precache 19 core files only. NO `skipWaiting()`. |
| Activate | Delete old caches. NO `clients.claim()`. |
| HTML, JS, CSS, JSON | Network-first → cache on success → fallback to cache |
| SVG, PNG, WASM, PGN, audio | Cache-first → lazy-cache on first fetch |
| `/api/*`, `/ws` | Network-only (never cached) |
| External hosts | Skipped entirely |

**Why no skipWaiting/clients.claim:** These caused mid-session cache wipes and reload loops on mobile. The new SW waits until all tabs are closed before activating — safe and crash-free.

**Registration:** Bare `navigator.serviceWorker.register('sw.js')` — no updateViaCache, no update intervals, no message listeners.

---

## 11. Mobile-Specific Behavior

| Feature | Implementation |
|---|---|
| Layout | Bottom tab nav: Moves, Analyze, Coach, Board, More |
| Panel visibility | `body[data-mobile-tab="X"]` CSS selectors show/hide panels |
| Free layout | Disabled on mobile via `matchMedia('(max-width: 768px)')` |
| Piece movement | Tap-to-move only (drag disabled via `e.pointerType === 'touch'` check) |
| Board scroll | `touch-action: none` on `.board-area` prevents page scroll |
| Eval bar | 6px wide, label hidden |
| Wake Lock | `navigator.wakeLock.request('screen')` keeps screen on |
| Install prompt | Fullscreen download dialog (Android native install + iOS instructions) |
| Settings button | Hidden on mobile (use hamburger menu) |
| Scrolling | `overflow-y: auto` on `main` for content below the board |

---

## 12. Auth Flow

### Email/Password
1. User registers → `POST /auth/register` → server creates user + bcrypt hash → returns JWT pair
2. User logs in → `POST /auth/login` → server verifies bcrypt → returns JWT pair
3. `apiFetch()` attaches `Authorization: Bearer <token>` to all API calls
4. On 401 → auto-refresh via `POST /auth/refresh` (token rotation) → retry original request
5. If refresh fails with 401/403 → clear tokens, session expired
6. Network errors during refresh → keep tokens, user can retry

### Google OAuth (code deployed, needs Client ID)
1. Google GSI library loaded in `<head>`
2. "Sign in with Google" button rendered in login + register dialogs
3. User clicks → Google popup → returns ID token (JWT signed by Google)
4. Frontend sends token to `POST /auth/google`
5. Backend verifies with `google-auth-library`, creates/links user, returns JWT pair
6. If email matches existing account → auto-links Google ID (no duplicate accounts)
7. Google-only users have `password_hash = NULL`

### Pending Google Setup
Set `GOOGLE_CLIENT_ID` in:
- Frontend: `_initGoogleSignIn()` in `main.js` (line ~8734, `const GOOGLE_CLIENT_ID = '';`)
- Backend: `.env` on server (`GOOGLE_CLIENT_ID=...`)

To get a Client ID: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 → Web application → Add `https://grandmasters.pmgsinternational.com` as authorized origin.

---

## 13. Key Dependencies

### Frontend (no build step)
- `chess.js` — move validation, FEN, PGN (vendored in `lib/`)
- `Stockfish 16 NNUE` — WASM engine (vendored in `lib/stockfish/`)
- `@capacitor/core` + plugins — native mobile builds
- Google Identity Services — loaded from CDN

### Backend (npm)
- `express` 4.21 — HTTP server
- `pg` 8.13 — PostgreSQL client
- `bcrypt` 5.1 — password hashing
- `jsonwebtoken` 9.0 — JWT signing/verification
- `google-auth-library` 9.14 — Google OAuth token verification
- `ws` 8.18 — WebSocket server
- `cors` 2.8 — CORS middleware
- `typescript` 5.6 — compile time only

---

## 14. Data Storage

| Data | Logged In | Not Logged In |
|---|---|---|
| Game stats | PostgreSQL (`user_stats` JSONB) | localStorage (`chess_game_stats`) |
| Game history | PostgreSQL (`games` table) | localStorage |
| Settings | PostgreSQL (`user_settings` JSONB) | localStorage (`chess_theme`, etc.) |
| Coach chats | PostgreSQL (`coach_chats`) | Not persisted |
| Tournament | PostgreSQL (`tournaments` JSONB) | localStorage (`chess_tournament`) |
| Puzzle progress | localStorage (`chess_puzzle_progress`) | localStorage |
| Endgame progress | localStorage (`chess_endgame_progress`) | localStorage |
| Repertoire | localStorage (`chess_repertoire`) | localStorage |
| Free layout | localStorage (`chess_free_layout`) | localStorage |
| Profile | localStorage (`chess_player_profile`) | localStorage |
| Achievements | localStorage (`chess_achievements`) | localStorage |

First login triggers one-time migration: `POST /api/data/migrate` sends localStorage data to server.

---

## 15. Known Status / Pending Items

| Item | Status |
|---|---|
| Core chess gameplay | Working |
| AI opponents (30+ bots) | Working |
| Stockfish WASM analysis | Working |
| Puzzle trainer | Working |
| Endgame trainer | Working |
| Opening book / database | Working |
| Multiplayer (WebSocket) | Working |
| Email/password auth | Working |
| Google Sign-In | Code deployed, needs Client ID |
| Cloud data sync | Working |
| Admin panel | Working |
| PWA install / offline | Working (v173, stable) |
| Mobile layout | Working (tabs, touch, wake lock) |
| DGT e-Board USB | Working |
| DGT Pegasus BLE | Working |
| ChessUp BLE | Scaffold (protocol discovery phase) |
| Board scanner (camera) | Working |
| Background music | Working |
| Composer Mode | Working |
| Capacitor iOS/Android | Build config present, not actively maintained |

---

## 16. Local Development

```bash
# Serve frontend
cd /Users/anonymousb/Downloads/chess-game
python3 -m http.server 9090

# Open in browser
open http://localhost:9090

# Backend (if needed locally)
cd server
cp .env.example .env  # edit DB credentials
npm install
npm run dev  # ts-node src/index.ts
```

No build step needed for frontend — all files served directly.

---

## 17. File Counts

| Category | Count |
|---|---|
| JS modules (`js/`) | 46 |
| TypeScript files (`server/src/`) | 11 |
| CSS files | 1 |
| HTML files | 3 (index, clear-cache, test-features) |
| PGN files | 107 |
| SVG assets | 140+ (pieces, portraits, avatars, icons) |
| Total data files | 4 JSON + 107 PGN |
