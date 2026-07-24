# Grandmasters Chess — Technical Handover

**Version:** v176 (SW cache) | **Last updated:** 2026-07-24
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

**Frontend:** Pure vanilla JS (ES modules), no build step, no framework. Single `index.html` (~104 KB) + 46 JS modules + 1 CSS file (~203 KB).

**Backend:** Node.js + TypeScript + Express + PostgreSQL. Compiled via `tsc`, runs as Docker container.

**Hosting:** Hetzner VPS at `195.201.28.115`, SSH via `~/.ssh/hetzner_omnex`, files at `/opt/grandmasters/`.

### Cross-cutting frontend conventions (read before touching UI code)

- **Per-device layout system.** Panel visibility is stored per device class — `layout_mobile`, `layout_tablet`, `layout_desktop` in localStorage — so a phone customization never clobbers the desktop arrangement. First visit to a class gets recommended defaults (`ChessApp._layoutDefaultsFor()`); a legacy single `chess_layout` is migrated into the current class on load. When logged in, all three layouts sync to the profile via the `/data/settings` blob (`layouts` field). Breakpoints: mobile `<768px`, tablet `768–1200px`, desktop `>1200px`. "Reset to recommended" restores the current class's defaults.
- **Wall-clock timers.** `game.js` derives remaining time from `Date.now()` anchors (`_turnStartTs` / `_turnStartRemaining`) instead of decrementing on an interval, so backgrounded-tab throttling can't cause drift. A `visibilitychange` handler recomputes instantly on return; the display ticks at ~200ms.
- **Engine request dispatch.** Every `go` sent to Stockfish is tagged with a monotonic id + kind (`game`/`analysis`/`multipv`) tracked in a FIFO. Stale `bestmove` responses (e.g. a late analysis result arriving after a game move was requested) are discarded — this fixes the double-move / flash-and-revert bug. A defensive turn/legality guard in `handleEngineMove` refuses to play any out-of-turn or illegal bestmove.
- **Bot strength via UCI_Elo.** Playing strength is calibrated centrally in `engine.js` from each bot's displayed rating using Stockfish 16's `UCI_LimitStrength` + `UCI_Elo` (1320–3190), feature-detected from the `uci` handshake. No per-bot `Skill Level` caps (they previously pinned 2600+ GMs to ~1600). Sub-1320 bots fall back to a shallow Skill Level + depth cap; if `UCI_Elo` is unavailable a calibrated Skill/depth/movetime table is used.
- **XSS escaping.** Any user-controlled or external text interpolated into `innerHTML` must go through `escapeHtml()` (exported from `utils.js`) — game DB fields, Lichess data, player names, etc.
- **Z-index scale.** All stacking uses CSS variables from a single scale in `:root` (`--z-base … --z-critical`), not magic numbers. Use the nearest tier (± small `calc()` offset); never hardcode a raw z-index.
- **Event delegation in rebuilt panels.** Panels that re-render their DOM on every update (music queue/composer chips, bot picker, database game lists, opening-explorer moves table) attach a single delegated listener on the stable container (guarded by a `dataset.delegated` flag) and read per-row context from `data-*` attributes — never per-item `addEventListener` in the render loop.
- **Offline fallbacks.** Network calls (Lichess import, Syzygy tablebase) wrap fetches in try/catch, pre-check `navigator.onLine`, surface a friendly toast on failure, and never leave a spinner hanging. The background tablebase toast is throttled to once per offline episode.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES modules), HTML5, CSS3 |
| Chess logic | chess.js (move validation, FEN, PGN parsing) |
| Engine | Stockfish 16 NNUE via WASM Web Worker (single-threaded build) |
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
├── index.html                    # SPA shell (~104 KB)
├── sw.js                         # Service Worker (v176)
├── manifest.json                 # PWA manifest
├── bump-version.sh               # Cache-version bumper — RUN BEFORE EVERY PUSH (see §9)
├── css/style.css                 # All styles (~203 KB, incl. z-index variable scale)
├── js/                           # 46 ES modules (see Section 6)
├── lib/
│   ├── chess.min.js              # chess.js library
│   └── stockfish/
│       ├── stockfish.js          # WASM wrapper
│       └── stockfish-nnue-16-single.wasm
├── data/
│   ├── puzzles.json              # tactical puzzles
│   ├── endgames.json             # endgame positions
│   ├── collections.json          # Game collection metadata
│   ├── classic-games/            # PGN files (immortal games, miniatures, world championships)
│   ├── events/                   # PGN files (Candidates, Linares, Norway Chess, etc.)
│   ├── openings/                 # PGN files (Sicilian, Ruy Lopez, QGD, etc.)
│   ├── players/                  # curated GM PGN collections
│   └── imports/                  # bulk GM game archives + manifest.json
├── assets/                       # piece themes, favicon, logo, splash
├── icons/                        # PWA icons (SVG, 192px, 512px, apple-touch)
├── img/                          # gm/, machines/, personalities/, composers/, avatars/
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
├── capacitor.config.ts           # Capacitor (webDir: www)
├── package.json                  # Root (Capacitor deps; `build` + `cap:sync` scripts)
├── serve.py                      # Local dev server
├── clear-cache.html              # SW cache clearing utility
└── test-features.html            # E2E test page
```

**Gitignored / build artifacts (not committed):** `www/`, `android/`, `ios/`, `node_modules/`, `server/.env`, `*.tar.gz`. `www/` is a regenerable staging copy produced by `npm run build`; there is currently **no** `android/` or `ios/` native project checked out. The old `chess-game.tar.gz` archive and the dead `js/layout-manager.js` module were removed.

---

## 5. Features

### Core Chess
- **Play vs AI:** 30+ bot opponents across 4 tiers
  - **Personalities** (8): Beginner Betty (800), Casual Carl (1000), Club Charlie, Positional Pat, Tactician Tanya, Speed Demon, The Wall, Candidate Master
  - **Grandmasters** (17+): Morphy, Steinitz, Lasker, Capablanca, Alekhine, Botvinnik, Petrosian, Smyslov, Tal, Spassky, Fischer, Karpov, Kasparov, Kramnik, Anand, Carlsen, etc.
  - **Machines** (4): Stockfish, AlphaZero, Leela, Komodo
  - **Custom bots:** User-defined with adjustable style sliders
  - **Strength:** driven by Stockfish `UCI_Elo` mapped from each bot's displayed rating (see §2) — labels now match real playing strength
- **Multiplayer:** Real-time online play via WebSocket with game codes
- **Time controls:** Bullet, blitz, rapid, classical, custom periods, Bronstein delay (wall-clock based — no background-tab drift)
- **Premoves:** Queue moves while opponent thinks
- **Takeback/Rematch:** Post-game controls
- **Bot vs Bot:** Spectator mode (BotMatch simulator)

### Analysis & Training
- **Stockfish 16 NNUE:** WASM Web Worker, request-id-tagged search dispatch, configurable depth, Multi-PV support
- **Eval bar:** Real-time position evaluation (6px on mobile)
- **Eval graph:** SVG evaluation chart across all moves
- **Position commentary:** Static analysis (material, pawn structure, king safety, center control, piece activity, open files)
- **Opening book:** ECO code lookup with mainlines and commentary
- **Puzzle trainer:** Elo-rated tactical puzzles with streak tracking
- **Endgame trainer:** Categorized endgame positions with engine-validated moves (player-relative eval, correct for both colors) and progressive hints
- **Repertoire trainer:** Add opening lines, drill with spaced repetition
- **Tablebase:** Lichess Syzygy API for perfect endgame play (≤7 pieces), with offline fallback
- **Training plan:** Auto-generated weekly plan based on game analysis
- **Annotations:** NAG support, per-move comments, PGN import/export

### Game Database
- **100+ PGN files:** Classic games, tournaments, openings, GM collections
- **Bulk imports:** Full career archives of many grandmasters
- **Browse by:** Player, event, opening, collection (lists use event delegation)
- **Auto-import:** Bundled PGN files loaded on first run via IndexedDB
- **Lichess import:** Import games from Lichess username (offline-guarded)

### Coaching System (3 tiers)
1. **CoachTips (rule-based):** position features analyzed with actionable advice. Always available, zero latency.
2. **CoachWebLLM (in-browser AI):** Phi-3.5-mini via WebGPU (Chrome 113+). Runs locally, no server needed.
3. **CoachAPI (cloud):** Backend-proxied LLM for deeper analysis. API key stored in localStorage with an on-screen shared-device warning.
4. **GM Coach profiles:** grandmaster personalities with unique teaching styles and position commentary.

### UI & Customization
- **5 piece themes:** Standard, Neo, Medieval, Pixel, root default
- **7 board themes:** Classic, Blue, Green, Purple, Red, Gray, Tournament
- **Per-device panel layouts:** ~20 toggleable panels with recommended defaults per device class + cloud sync (see §2)
- **Free layout:** Draggable/resizable panel windows (desktop/tablet only; disabled on mobile)
- **12 player avatars** and **dark theme** throughout
- **Sound effects:** Web Audio API synthesis (no external audio files)
- **Voice narration:** Speech synthesis for move announcements
- **Background music:** Classical music streaming from Wikimedia Commons (29 composers)
- **Composer Mode:** CP-SAT constraint solver for instant music composition

### Hardware Integration
- **DGT e-Board (USB):** Web Serial API — full piece recognition
- **DGT LiveChess 2:** WebSocket connection via desktop software
- **DGT Pegasus (BLE):** Bluetooth Low Energy via Capacitor
- **ChessUp Smart Board (BLE):** BLE protocol integration (Nordic UART)
- **Board Scanner:** Camera-based position recognition via getUserMedia (guarded capture + FEN validated before use)

### PWA & Mobile
- **Installable:** Web App Manifest with app shortcuts
- **Offline support:** Service Worker with lazy caching (core files precached)
- **Mobile layout:** Bottom tab navigation (Moves, Analyze, Coach, Board, More)
- **Touch optimized:** Tap-to-move (drag disabled on touch), touch-action isolation on board
- **Wake Lock:** Screen stays on during games
- **Download dialog:** Fullscreen install prompt (Android native + iOS instructions)
- **Capacitor:** iOS/Android build config present (no native project currently checked out)

### User System
- **Email/password registration** with bcrypt
- **Google Sign-In** (OAuth 2.0 — code deployed, needs Client ID)
- **JWT auth:** 15-min access tokens + 30-day refresh tokens with rotation
- **Cloud sync:** Stats, games, settings (incl. per-device layouts), coach chats, tournaments synced to PostgreSQL
- **localStorage fallback:** Full functionality without an account
- **Admin panel:** User management, stats viewer, leaderboard
- **Achievements, Elo rating with history graph, Chess news** (Lichess broadcasts)

---

## 6. JavaScript Modules (46 files)

| Module | Class/Export | Purpose |
|---|---|---|
| `main.js` | `ChessApp` | App orchestrator, ~50 setup methods, all UI wiring, per-device layout system, multiplayer/scanner handlers |
| `game.js` | `Game` | Game state, chess.js instance, **wall-clock timers**, move history |
| `board.js` | `Board` | Board rendering, click/drag handling, premoves |
| `engine.js` | `Engine` | Stockfish WASM worker, UCI protocol, **request-id dispatch + stale-bestmove discard**, **UCI_Elo strength calibration** |
| `notation.js` | `Notation` | Move list rendering, PGN import/export, annotations |
| `captured.js` | `CapturedPieces` | Captured piece display + material advantage |
| `eval-graph.js` | `EvalGraph` | SVG evaluation graph |
| `api-client.js` | `apiFetch()` | JWT-attached fetch wrapper with auto-refresh |
| `auth.js` | `AuthManager` | Login, register, Google OAuth, session management |
| `data-service.js` | `DataService` | Dual-mode data (backend + localStorage fallback); layouts sync |
| `multiplayer.js` | `MultiplayerManager` | WebSocket multiplayer (create, join, moves, presence) |
| `bots.js` | `BOT_PERSONALITIES` | 30+ bot definitions (rating drives calibration; `Skill Level`/`stockfishElo` fields now vestigial) |
| `bot-match.js` | `BotMatch` | Bot vs Bot game simulator |
| `openings.js` | `OpeningBook` | ECO mainlines + commentary |
| `puzzle.js` | `PuzzleManager` | Tactical puzzles with Elo rating system |
| `endgame-trainer.js` | `EndgameTrainer` | Endgame training (player-relative eval validation) |
| `tournament.js` | `Tournament` | Round-robin + knockout tournament system |
| `coach.js` | `CoachManager` | 3-tier coaching orchestrator |
| `coach-tips.js` | `CoachTips` | Rule-based position tips |
| `coach-webllm.js` | `CoachWebLLM` | In-browser Phi-3.5-mini via WebGPU |
| `coach-api.js` | `CoachAPI` | Cloud LLM coaching (localStorage key + warning) |
| `gm-coach-profiles.js` | `GM_COACH_PROFILES` | GM personality coaching profiles |
| `themes.js` | `ThemeManager` | Board + piece theme management |
| `sound.js` | `SoundManager` | Web Audio API sound effects |
| `music.js` | `MusicPlayer` | Classical music streaming |
| `composer-profiles.js` | `COMPOSER_PROFILES` | Composer metadata for Composer Mode |
| `stats.js` | `PlayerStats` | Game records, rating calculation |
| `profile.js` | `PlayerProfile` | Avatar, display name |
| `achievements.js` | `AchievementManager` | Achievements |
| `rating-graph.js` | `RatingGraph` | SVG rating history chart |
| `repertoire.js` | `RepertoireTrainer` | Opening repertoire with spaced repetition |
| `tablebase.js` | `TablebaseLookup` | Lichess Syzygy tablebase (offline-guarded) |
| `training-plan.js` | `TrainingPlanGenerator` | Auto-generated weekly training plan |
| `database.js` | `Database` | PGN collection management + IndexedDB storage |
| `admin.js` | `AdminPanel` | Admin user management panel |
| `position-commentary.js` | `PositionCommentary` | Static position analysis text |
| `free-layout.js` | `FreeLayout` | Draggable/resizable panel windows (desktop/tablet) |
| `board-scanner.js` | `BoardScanner` | Camera-based board position recognition |
| `dgt.js` | `DGTBoard` | DGT e-Board (USB, LiveChess, BLE) |
| `chessup.js` | `ChessUpBoard` | ChessUp Smart Board (BLE) |
| `chess-news.js` | `ChessNews` | Lichess broadcast API |
| `utils.js` | `show()`, `hide()`, `escapeHtml()`, … | DOM + escaping utilities |
| `analysis.js` | — | Analysis panel UI logic |

> Note: `js/layout-manager.js`, `js/supabase-config.js`, and `js/supabase-init.js` were **deleted** — all dead code (never imported). `FreeLayout` is the layout system in use, and the app uses the self-hosted backend exclusively (`isBackendConfigured()` returns `true`).

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
| GET/PUT | `/settings` | User settings + per-device `layouts` (JSONB blob) |
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
- Events relayed: moves, resign, draw offers, timer sync, presence. The server **relays without validating** move legality — the client validates (chess.js legality + turn-ownership guard in `onOpponentMove`).

### Health
- `GET /api/health` → `{ status: 'ok', timestamp }`

---

## 8. Database Schema

```sql
users (id UUID PK, email UNIQUE, password_hash NULL, display_name, is_admin, google_id UNIQUE, created_at)
refresh_tokens (id UUID PK, user_id FK, token_hash, expires_at, revoked, created_at)
user_stats (user_id PK FK, data JSONB, updated_at)
user_settings (user_id PK FK, data JSONB, updated_at)   -- includes per-device `layouts`
games (id UUID PK, user_id FK, opponent, opponent_elo, result, pgn, opening, player_color, move_count, time_control, created_at)
coach_chats (id UUID PK, user_id FK, messages JSONB, game_context JSONB, created_at)
tournaments (user_id PK FK, data JSONB, updated_at)
migrations (user_id PK FK, migrated_at)
multiplayer_games (id UUID PK, code, host_id FK, guest_id FK, host_color, time_control, increment, status, result, pgn, created_at)
```

Schema is idempotent (`CREATE IF NOT EXISTS` + `ALTER` wrapped in exception handlers). Runs automatically on every server start via `initDatabase()`. All `/data/*` and `/admin/*` queries are parameterized and scoped by `req.user.uid` (no SQL injection, no IDOR).

---

## 9. Deployment

### Server Details
- **IP:** 195.201.28.115 (Hetzner VPS)
- **SSH:** `ssh -i ~/.ssh/hetzner_omnex root@195.201.28.115`
- **Files:** `/opt/grandmasters/` (compose project root)
- **Frontend:** `/opt/grandmasters/public/`
- **Docker API:** Old version — requires `DOCKER_API_VERSION=1.41` prefix
- **Compose:** `docker-compose` (v1 syntax, not `docker compose` v2)

### ⚠️ Version bump — RUN BEFORE EVERY PUSH / DEPLOY

Always bump the cache version *before* pushing or deploying frontend changes, or clients keep the old cached assets. Use the script — it keeps the SW cache name and every `?v=` param in lockstep:

```bash
./bump-version.sh          # auto-increment from current sw.js version
./bump-version.sh 177      # or set an explicit version
```

It updates, together:
1. `sw.js` → `const CACHE_NAME = 'grandmasters-vXXX'`
2. `index.html` → `style.css?v=XXX`, **`chess.min.js?v=XXX`**, `main.js?v=XXX`

Notes:
- Uses macOS `sed -i ''` syntax (this repo is maintained on macOS).
- The no-arg auto-detect branch uses `grep -oP` (GNU-only) — on macOS pass an explicit version number.
- If you maintain a Capacitor/Android build, run `npm run build` afterward to refresh the gitignored `www/` staging copy (`npm run cap:sync` also runs `npx cap sync`, which needs a native platform to exist).

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
- The Docker compose project is at `/opt/grandmasters/`, NOT `/opt/grandmasters/server/`. The `server/` directory in the repo is the source; on the server the files live at the root of `/opt/grandmasters/`.
- Use `DOCKER_API_VERSION=1.41` before every docker/docker-compose command.
- Don't use `--no-cache` (not supported on this Docker version).
- If port 3000 is already allocated, stop the old container first: `docker stop grandmasters-api-1 && docker rm grandmasters-api-1`.

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

**Cache name:** `grandmasters-v176` (bump via `bump-version.sh`).

| Scenario | Behavior |
|---|---|
| Install | Precache core files only. NO `skipWaiting()`. |
| Activate | Delete old caches. NO `clients.claim()`. |
| HTML, JS, CSS, JSON | Network-first → cache on success → fallback to cache |
| SVG, PNG, WASM, PGN, audio | Cache-first → lazy-cache on first fetch |
| `/api/*`, `/ws` | Network-only (never cached) |
| External hosts | Skipped entirely |

**Why no skipWaiting/clients.claim:** These caused mid-session cache wipes and reload loops on mobile. The SW waits until all tabs are closed before activating — safe and crash-free. The old ~260-URL precache list (`_UNUSED`) was removed; assets are lazy-cached on first fetch.

**Registration:** Bare `navigator.serviceWorker.register('sw.js')` — no updateViaCache, no update intervals, no message listeners.

---

## 11. Mobile-Specific Behavior

| Feature | Implementation |
|---|---|
| Layout | Bottom tab nav: Moves, Analyze, Coach, Board, More |
| Panel defaults | Device-class defaults applied on first visit; `layout_mobile` persists per-device (see §2) |
| Free layout | Force-disabled on mobile (`matchMedia('(max-width: 768px)')` + fit audit); drag-groups use renamed ids `drag-board` / `drag-player-top` / `drag-player-bottom` |
| Piece movement | Tap-to-move only (drag disabled via `pointerType === 'touch'`) |
| Board scroll | `touch-action: none` on `.board-area`; `main` uses `overflow-x: hidden` so panels stack vertically |
| Eval bar | 6px wide, label hidden |
| Wake Lock | `navigator.wakeLock.request('screen')` keeps screen on |
| Install prompt | Fullscreen download dialog (Android native install + iOS instructions) |
| Settings button | Hidden on mobile (use hamburger menu → Panels for layout toggles) |

---

## 12. Auth Flow

**Which auth runs:** the self-hosted backend (`AuthManager` → `api-client.js`) runs in production. `isBackendConfigured()` is hardcoded `true`. (The old Supabase config modules were dead code and have been removed.)

### Email/Password
1. Register → `POST /auth/register` → server creates user + bcrypt hash → returns JWT pair
2. Login → `POST /auth/login` → server verifies bcrypt → returns JWT pair
3. `apiFetch()` attaches `Authorization: Bearer <token>` to all API calls
4. On 401 → auto-refresh via `POST /auth/refresh` (token rotation) → retry original request
5. If refresh fails with 401/403 → clear tokens, session expired
6. Network errors during refresh → keep tokens, user can retry

### Google OAuth (code deployed, needs Client ID)
1. Google GSI library loaded in `<head>`; button rendered in login + register dialogs
2. User clicks → Google popup → ID token → `POST /auth/google`
3. Backend verifies with `google-auth-library`, creates/links user by email, returns JWT pair
4. Google-only users have `password_hash = NULL`

### Pending Google Setup
Set `GOOGLE_CLIENT_ID` in the frontend `_initGoogleSignIn()` (`main.js`) and the backend `.env`. Add `https://grandmasters.pmgsinternational.com` as an authorized origin in Google Cloud Console.

---

## 13. Key Dependencies

### Frontend (no build step)
- `chess.js` — move validation, FEN, PGN (vendored in `lib/`)
- `Stockfish 16 NNUE` — WASM engine, single-threaded build (vendored in `lib/stockfish/`)
- `@capacitor/core` + plugins — native mobile builds
- Google Identity Services — loaded from CDN

### Backend (npm)
- `express` 4.21, `pg` 8.13, `bcrypt` 5.1, `jsonwebtoken` 9.0, `google-auth-library` 9.14, `ws` 8.18, `cors` 2.8, `typescript` 5.6 (compile only)

---

## 14. Data Storage

| Data | Logged In | Not Logged In |
|---|---|---|
| Game stats | PostgreSQL (`user_stats` JSONB) | localStorage (`chess_game_stats`) |
| Game history | PostgreSQL (`games` table) | localStorage |
| Settings | PostgreSQL (`user_settings` JSONB) | localStorage |
| Per-device layouts | PostgreSQL (`user_settings.layouts`) | localStorage (`layout_mobile` / `layout_tablet` / `layout_desktop`) |
| Coach chats | PostgreSQL (`coach_chats`) | Not persisted |
| Tournament | PostgreSQL (`tournaments` JSONB) | localStorage (`chess_tournament`) |
| Puzzle progress | localStorage (`chess_puzzle_progress`) | localStorage |
| Endgame progress | localStorage (`chess_endgame_progress`) | localStorage |
| Repertoire | localStorage (`chess_repertoire`) | localStorage |
| Free layout positions | localStorage (`chess_free_layout`) | localStorage |
| Panel block heights | localStorage (`chess_block_h_*`, keyed by drag-id) | same |
| Profile / Achievements | localStorage | localStorage |

First login triggers one-time migration: `POST /api/data/migrate`. A legacy single `chess_layout` key is migrated into the current device class on load.

---

## 15. Known Status / Pending Items

### Feature status

| Item | Status |
|---|---|
| Core chess gameplay | Working |
| AI opponents (30+ bots) | Working — strength recalibrated via UCI_Elo (labels now accurate) |
| Stockfish WASM analysis | Working (request-id dispatch, double-move guard) |
| Timers | Working (wall-clock, no background drift) |
| Puzzle trainer | Working |
| Endgame trainer | Working (eval validation fixed for black-to-move) |
| Opening book / database | Working |
| Multiplayer (WebSocket) | Working (client-side legality + turn guard) |
| Email/password auth | Working |
| Google Sign-In | Code deployed, needs Client ID |
| Cloud data sync (incl. layouts) | Working |
| Per-device layout system | Working |
| Admin panel | Working |
| PWA install / offline | Working (v176, stable) |
| Mobile layout | Working (per-device defaults, touch, wake lock) |
| DGT e-Board USB / Pegasus BLE | Working |
| ChessUp BLE | Scaffold (protocol discovery phase) |
| Board scanner (camera) | Working (guarded capture) |
| Background music / Composer Mode | Working |
| Capacitor iOS/Android | Config present; no native project checked out, not actively distributed |

### Recent changes (v174 → v176)
- Per-device layout system with cloud sync; "Reset to recommended"; mobile fit guarantee.
- Wall-clock timers (fixes background-tab clock drift) + `visibilitychange` correction.
- Engine request-id dispatch + stale-bestmove discard; turn/legality guard in `handleEngineMove`.
- Bot strength calibration via `UCI_LimitStrength`/`UCI_Elo` (removed the `Skill Level` caps that pinned 2600+ GMs to ~1600).
- XSS hardening: user/external text escaped via `escapeHtml()`.
- Z-index consolidated to a `:root` variable scale.
- Event delegation for rebuilt panels (music queue, bot picker, DB lists, opening explorer).
- Offline fallbacks for Lichess import + tablebase.
- Drag-id renames (`board`→`drag-board`, `player-top/-bottom`→`drag-player-top/-bottom`) with block-height migration.
- Removed dead code/artifacts: `js/layout-manager.js`, `chess-game.tar.gz`; SW `_UNUSED` precache list; `bump-version.sh` now also bumps `chess.min.js`.
- Endgame eval validation corrected for black-to-move; board-scanner capture guarded against off-screen/zero-size crashes.
- Server hardening: `express-rate-limit` on `/login`, `/register`, `/refresh`, `/google`; CORS restricted to an allowlist (`CORS_ORIGINS`, default `grandmasters.pmgsinternational.com`); `trust proxy` set to 1 for correct per-client limiting behind Caddy. Deleted dead `supabase-config.js` / `supabase-init.js`.

### Known issues / design notes (flagged, not yet addressed)
- **Multiplayer trust model:** server relays without validating moves; guest fully trusts host-authoritative timer sync; resign/draw events are unauthenticated relays; no auto-forfeit on opponent disconnect. History-navigation during a live game can still desync (turn guard mitigates most cases).
- **Registration enumeration:** `/register` returns 409 for existing emails (login is generic/safe).
- **Puzzle validation** accepts only the stored solution line — alternate correct moves / alternate final-move mates are marked wrong.
- **Tournament:** knockout draws always award the human the win; player color is re-randomized per `getNextMatch` call; tie-breaks are points-then-wins only; all-bot subtrees auto-resolve one round per `getNextMatch` call.
- **Vestigial fields:** `bots.js` `stockfishElo` / `searchDepth` / `moveTime` are no longer used for strength (calibration derives from rating), though `searchDepth` still seeds coach analysis depth.

---

## 16. Local Development

```bash
# Serve frontend
cd /Users/anonymousb/Downloads/chess-game
python3 -m http.server 9090
open http://localhost:9090

# Backend (if needed locally)
cd server
cp .env.example .env   # edit DB credentials
npm install
npm run dev            # ts-node src/index.ts
```

No build step needed for the frontend — all files served directly. Quick sanity check after JS edits: `node --check js/<file>.js`.

---

## 17. File Counts

| Category | Count |
|---|---|
| JS modules (`js/`) | 46 |
| TypeScript files (`server/src/`) | 11 |
| CSS files | 1 |
| HTML files | 3 (index, clear-cache, test-features) |
| PGN files | 100+ |
| SVG assets | 140+ (pieces, portraits, avatars, icons) |
| Data files | 4 JSON + 100+ PGN |
