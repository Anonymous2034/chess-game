// Service Worker — Offline support for Grandmasters Chess
const CACHE_NAME = 'grandmasters-v116';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './lib/chess.min.js',

  // JavaScript modules
  './js/main.js',
  './js/admin.js',
  './js/analysis.js',
  './js/auth.js',
  './js/board.js',
  './js/bot-match.js',
  './js/bots.js',
  './js/captured.js',
  './js/coach-api.js',
  './js/coach.js',
  './js/coach-tips.js',
  './js/coach-webllm.js',
  './js/gm-coach-profiles.js',
  './js/database.js',
  './js/data-service.js',
  './js/dgt.js',
  './js/engine.js',
  './js/eval-graph.js',
  './js/game.js',
  './js/multiplayer.js',
  './js/notation.js',
  './js/openings.js',
  './js/profile.js',
  './js/puzzle.js',
  './js/endgame-trainer.js',
  './js/rating-graph.js',
  './js/sound.js',
  './js/music.js',
  './js/chess-news.js',
  './js/stats.js',
  './js/supabase-config.js',
  './js/themes.js',
  './js/tournament.js',
  './js/position-commentary.js',
  './js/utils.js',
  './js/composer-profiles.js',
  './js/free-layout.js',

  // Stockfish engine
  './lib/stockfish/stockfish.js',
  './lib/stockfish/stockfish-nnue-16-single.wasm',

  // Data files
  './data/collections.json',
  './data/puzzles.json',
  './data/endgames.json',
  './data/classic-games/immortal-games.pgn',
  './data/classic-games/miniatures.pgn',
  './data/classic-games/world-championships.pgn',
  './data/events/candidates.pgn',
  './data/events/linares.pgn',
  './data/events/wijk-aan-zee.pgn',
  './data/events/zurich-1953.pgn',
  './data/events/norway-chess.pgn',
  './data/events/sinquefield-cup.pgn',
  './data/events/grand-prix.pgn',
  './data/openings/french.pgn',
  './data/openings/italian.pgn',
  './data/openings/kings-indian.pgn',
  './data/openings/queens-gambit.pgn',
  './data/openings/ruy-lopez.pgn',
  './data/openings/sicilian.pgn',
  './data/openings/caro-kann.pgn',
  './data/openings/english.pgn',
  './data/openings/nimzo-indian.pgn',
  './data/openings/grunfeld.pgn',
  './data/openings/scotch.pgn',
  './data/openings/pirc.pgn',
  './data/openings/dutch.pgn',
  './data/openings/catalan.pgn',
  './data/openings/slav.pgn',
  './data/openings/kings-gambit.pgn',
  './data/players/alekhine.pgn',
  './data/players/anand.pgn',
  './data/players/botvinnik.pgn',
  './data/players/capablanca.pgn',
  './data/players/carlsen.pgn',
  './data/players/fischer.pgn',
  './data/players/karpov.pgn',
  './data/players/kasparov.pgn',
  './data/players/kramnik.pgn',
  './data/players/morphy.pgn',
  './data/players/petrosian.pgn',
  './data/players/tal.pgn',
  './data/players/lasker.pgn',
  './data/players/smyslov.pgn',
  './data/players/spassky.pgn',
  './data/players/steinitz.pgn',
  './data/players/ding.pgn',
  './data/players/caruana.pgn',
  './data/players/nakamura.pgn',
  './data/players/aronian.pgn',
  './data/players/korchnoi.pgn',
  './data/players/rubinstein.pgn',
  './data/players/nimzowitsch.pgn',
  './data/players/bronstein.pgn',
  './data/players/shirov.pgn',
  './data/players/topalov.pgn',
  './data/players/firouzja.pgn',
  './data/players/praggnanandhaa.pgn',

  // Piece SVGs — root
  './assets/pieces/bB.svg', './assets/pieces/bK.svg', './assets/pieces/bN.svg',
  './assets/pieces/bP.svg', './assets/pieces/bQ.svg', './assets/pieces/bR.svg',
  './assets/pieces/wB.svg', './assets/pieces/wK.svg', './assets/pieces/wN.svg',
  './assets/pieces/wP.svg', './assets/pieces/wQ.svg', './assets/pieces/wR.svg',

  // Piece SVGs — standard
  './assets/pieces/standard/bB.svg', './assets/pieces/standard/bK.svg', './assets/pieces/standard/bN.svg',
  './assets/pieces/standard/bP.svg', './assets/pieces/standard/bQ.svg', './assets/pieces/standard/bR.svg',
  './assets/pieces/standard/wB.svg', './assets/pieces/standard/wK.svg', './assets/pieces/standard/wN.svg',
  './assets/pieces/standard/wP.svg', './assets/pieces/standard/wQ.svg', './assets/pieces/standard/wR.svg',

  // Piece SVGs — medieval
  './assets/pieces/medieval/bB.svg', './assets/pieces/medieval/bK.svg', './assets/pieces/medieval/bN.svg',
  './assets/pieces/medieval/bP.svg', './assets/pieces/medieval/bQ.svg', './assets/pieces/medieval/bR.svg',
  './assets/pieces/medieval/wB.svg', './assets/pieces/medieval/wK.svg', './assets/pieces/medieval/wN.svg',
  './assets/pieces/medieval/wP.svg', './assets/pieces/medieval/wQ.svg', './assets/pieces/medieval/wR.svg',

  // Piece SVGs — neo
  './assets/pieces/neo/bB.svg', './assets/pieces/neo/bK.svg', './assets/pieces/neo/bN.svg',
  './assets/pieces/neo/bP.svg', './assets/pieces/neo/bQ.svg', './assets/pieces/neo/bR.svg',
  './assets/pieces/neo/wB.svg', './assets/pieces/neo/wK.svg', './assets/pieces/neo/wN.svg',
  './assets/pieces/neo/wP.svg', './assets/pieces/neo/wQ.svg', './assets/pieces/neo/wR.svg',

  // Piece SVGs — pixel
  './assets/pieces/pixel/bB.svg', './assets/pieces/pixel/bK.svg', './assets/pieces/pixel/bN.svg',
  './assets/pieces/pixel/bP.svg', './assets/pieces/pixel/bQ.svg', './assets/pieces/pixel/bR.svg',
  './assets/pieces/pixel/wB.svg', './assets/pieces/pixel/wK.svg', './assets/pieces/pixel/wN.svg',
  './assets/pieces/pixel/wP.svg', './assets/pieces/pixel/wQ.svg', './assets/pieces/pixel/wR.svg',

  // Portrait SVGs — grandmasters
  './img/gm/alekhine.svg', './img/gm/anand.svg', './img/gm/botvinnik.svg',
  './img/gm/capablanca.svg', './img/gm/carlsen.svg', './img/gm/fischer.svg',
  './img/gm/karpov.svg', './img/gm/kasparov.svg', './img/gm/kramnik.svg',
  './img/gm/lasker.svg', './img/gm/morphy.svg', './img/gm/petrosian.svg',
  './img/gm/smyslov.svg', './img/gm/spassky.svg', './img/gm/steinitz.svg',
  './img/gm/tal.svg',

  // Portrait SVGs — machines
  './img/machines/alphazero.svg', './img/machines/komodo.svg',
  './img/machines/leela.svg', './img/machines/stockfish.svg',

  // Portrait SVGs — personalities
  './img/personalities/beginner-betty.svg', './img/personalities/candidate-master.svg',
  './img/personalities/casual-carl.svg', './img/personalities/club-charlie.svg',
  './img/personalities/positional-pat.svg', './img/personalities/speed-demon.svg',
  './img/personalities/tactician-tanya.svg', './img/personalities/the-wall.svg',

  // Portrait SVGs — composers
  './img/composers/albeniz.svg', './img/composers/bach.svg', './img/composers/beethoven.svg',
  './img/composers/brahms.svg', './img/composers/chopin.svg', './img/composers/clementi.svg',
  './img/composers/debussy.svg', './img/composers/dvorak.svg', './img/composers/faure.svg',
  './img/composers/gluck.svg', './img/composers/grieg.svg', './img/composers/handel.svg',
  './img/composers/haydn.svg', './img/composers/liszt.svg', './img/composers/mendelssohn.svg',
  './img/composers/mozart.svg', './img/composers/mussorgsky.svg', './img/composers/pachelbel.svg',
  './img/composers/rachmaninoff.svg', './img/composers/ravel.svg', './img/composers/saint-saens.svg',
  './img/composers/satie.svg', './img/composers/schubert.svg', './img/composers/schumann.svg',
  './img/composers/strauss-ii.svg', './img/composers/tchaikovsky.svg', './img/composers/telemann.svg',
  './img/composers/vivaldi.svg', './img/composers/wagner.svg',

  // Player avatars
  './img/avatars/king.svg', './img/avatars/queen.svg', './img/avatars/rook.svg',
  './img/avatars/bishop.svg', './img/avatars/knight.svg', './img/avatars/pawn.svg',
  './img/avatars/crown.svg', './img/avatars/shield.svg', './img/avatars/sword.svg',
  './img/avatars/star.svg', './img/avatars/flame.svg', './img/avatars/lightning.svg',

  // Logo
  './assets/logo.svg',

  // App icons
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Install — precache assets (resilient: individual failures don't block install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.all(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn('SW: failed to cache', url, err)
            )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches and force reload all open tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      })
  );
});

// Fetch — cache-first for local, stale-while-revalidate for esm.sh, network-only for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-only for external API calls (let browser handle normally)
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('lichess.ovh') ||
      url.hostname.includes('openai.com') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('esm.run')) {
    return;
  }

  // Stale-while-revalidate for esm.sh (Supabase client modules)
  if (url.hostname === 'esm.sh') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Network-first for HTML, JS, JSON (ensures updates reach users)
  // Cache-first for static assets (images, fonts, wasm)
  const path = url.pathname;
  if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.json') ||
      path.endsWith('.css') || path === '/' || path.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (SVG, PNG, WASM, PGN, audio)
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
