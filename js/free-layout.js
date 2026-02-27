// Free-floating panel layout — Chessmaster-style draggable/resizable windows
// Each drag-group becomes an independent window with title bar, drag, resize, z-index

export class FreeLayout {
  static STORAGE_KEY = 'chess_free_layout';

  // Window definitions: which drag-groups go into each window
  static WINDOW_DEFS = {
    board:      { label: 'Board',      icon: '\u265A', groups: ['player-top', 'board', 'player-bottom'], minW: 280, minH: 320 },
    navigation: { label: 'Navigation', icon: '\u2194', groups: ['nav', 'opening'],                       minW: 200, minH: 50  },
    'eval-graph': { label: 'Eval Graph', icon: '\u2191', groups: ['eval-graph'],                         minW: 150, minH: 60  },
    music:      { label: 'Music',      icon: '\u266B', groups: ['music'],                                minW: 200, minH: 40  },
    status:     { label: 'Status',     icon: '\u2139', groups: ['status'],                               minW: 200, minH: 36  },
    analysis:   { label: 'Analysis',   icon: '\u2610', groups: ['tab-bar', 'moves', 'book', 'hints', 'gm-coach-tab'], minW: 250, minH: 200 },
    coach:      { label: 'Coach',      icon: '\u2605', groups: ['coach-area'],                           minW: 200, minH: 60  },
    notes:      { label: 'Notes',      icon: '\u270E', groups: ['notes'],                                minW: 200, minH: 80  },
  };

  // Default positions as viewport fractions { x, y, w, h }
  // Left: board (large) + nav + eval graph + music
  // Right: status + analysis (tall) + coach + notes
  static DEFAULT_POSITIONS = {
    board:        { x: 0.005, y: 0.005, w: 0.48,  h: 0.76  },
    navigation:   { x: 0.005, y: 0.77,  w: 0.48,  h: 0.07  },
    'eval-graph': { x: 0.005, y: 0.85,  w: 0.24,  h: 0.14  },
    music:        { x: 0.25,  y: 0.85,  w: 0.235, h: 0.14  },
    status:       { x: 0.49,  y: 0.005, w: 0.505, h: 0.055 },
    analysis:     { x: 0.49,  y: 0.065, w: 0.505, h: 0.52  },
    coach:        { x: 0.49,  y: 0.59,  w: 0.505, h: 0.12  },
    notes:        { x: 0.49,  y: 0.715, w: 0.505, h: 0.28  },
  };

  constructor() {
    this._active = false;
    this._windows = {};       // windowId -> { el, pos }
    this._topZ = 100;
    this._savedGroups = null; // original parent info for unwrap
    this.onWindowResize = null; // callback(windowId, rect) for board redraws
  }

  get active() { return this._active; }

  activate() {
    if (this._active) return;
    this._active = true;
    document.body.classList.add('free-layout-on');


    const layout = this._loadLayout();
    this._wrapDragGroups(layout);
    this._active = true;
    this._saveLayout();
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    document.body.classList.remove('free-layout-on');
    this._unwrapDragGroups();
    this._windows = {};
  }

  // === Wrap drag-groups into free-floating windows ===

  _wrapDragGroups(layout) {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    // Remember original locations for unwrap
    this._savedGroups = {};
    document.querySelectorAll('.drag-group').forEach(g => {
      this._savedGroups[g.dataset.dragId] = {
        parent: g.parentElement,
        nextSibling: g.nextElementSibling
      };
    });

    const containerRect = mainEl.getBoundingClientRect();
    const cW = containerRect.width;
    const cH = containerRect.height;

    for (const [winId, def] of Object.entries(FreeLayout.WINDOW_DEFS)) {
      const win = document.createElement('div');
      win.className = 'free-window';
      win.dataset.winId = winId;

      // Title bar
      const titleBar = document.createElement('div');
      titleBar.className = 'free-window-titlebar';
      titleBar.innerHTML = `<span class="free-window-icon">${def.icon}</span>` +
        `<span class="free-window-label">${def.label}</span>` +
        `<span class="free-window-btns">` +
        `<button class="free-window-btn free-minimize-btn" title="Minimize">&minus;</button>` +
        `<button class="free-window-btn free-close-btn" title="Close">&times;</button>` +
        `</span>`;
      win.appendChild(titleBar);

      // Content area
      const content = document.createElement('div');
      content.className = 'free-window-content';

      // Move drag-groups into this window
      for (const gId of def.groups) {
        const g = document.querySelector(`[data-drag-id="${gId}"]`);
        if (g) content.appendChild(g);
      }
      win.appendChild(content);

      // 8 resize handles
      for (const dir of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
        const h = document.createElement('div');
        h.className = `free-resize-handle free-resize-${dir}`;
        h.dataset.dir = dir;
        win.appendChild(h);
      }

      // Position from layout or defaults
      const pos = layout[winId] || this._defaultPos(winId, cW, cH);
      win.style.left = pos.x + 'px';
      win.style.top = pos.y + 'px';
      win.style.width = pos.w + 'px';
      win.style.height = pos.h + 'px';
      win.style.zIndex = this._topZ++;

      if (pos.minimized) {
        win.classList.add('free-window-minimized');
      }
      if (pos.hidden) {
        win.style.display = 'none';
      }

      mainEl.appendChild(win);
      this._windows[winId] = { el: win, pos };

      // Wire events
      this._setupTitleBarDrag(win, titleBar, winId);
      this._setupResize(win, winId);
      this._setupFocus(win, winId);
      this._setupMinimize(win, winId, titleBar);
      this._setupClose(win, winId);
    }

    // Board-specific: override --board-size so board fills its window
    this._setupBoardFit();

    // Viewport resize listener
    this._viewportHandler = () => this._onViewportResize();
    window.addEventListener('resize', this._viewportHandler);
  }

  _unwrapDragGroups() {
    if (!this._savedGroups) return;

    const boardArea = document.querySelector('.board-area');
    const sidePanel = document.querySelector('.side-panel');
    if (!boardArea || !sidePanel) return;

    // Use _DRAG_LAYOUT_DEFAULTS order to restore groups
    const boardOrder = ['player-top', 'board', 'player-bottom', 'opening', 'eval-graph', 'music', 'nav'];
    const sideOrder = ['status', 'tab-bar', 'moves', 'book', 'hints', 'gm-coach-tab', 'coach-area', 'notes'];

    for (const gId of boardOrder) {
      const g = document.querySelector(`[data-drag-id="${gId}"]`);
      if (g) boardArea.appendChild(g);
    }
    for (const gId of sideOrder) {
      const g = document.querySelector(`[data-drag-id="${gId}"]`);
      if (g) sidePanel.appendChild(g);
    }

    // Keep analysis-summary at top of side-panel
    const summary = document.getElementById('analysis-summary');
    if (summary && sidePanel.contains(summary)) {
      sidePanel.prepend(summary);
    }

    // Disconnect board observer
    if (this._boardObserver) {
      this._boardObserver.disconnect();
      this._boardObserver = null;
    }

    // Remove all free-window elements
    document.querySelectorAll('.free-window').forEach(w => w.remove());

    // Remove viewport listener
    if (this._viewportHandler) {
      window.removeEventListener('resize', this._viewportHandler);
      this._viewportHandler = null;
    }

    // Reset board size to CSS default
    document.documentElement.style.removeProperty('--board-size');
    // Re-read saved board size
    const savedBoardSize = localStorage.getItem('chess_board_size');
    if (savedBoardSize) {
      document.documentElement.style.setProperty('--board-size', savedBoardSize);
    }

    this._savedGroups = null;
  }

  // === Magnetic snap — collect edges of other windows + container ===

  static SNAP_DIST = 12; // px threshold for snapping

  _getSnapEdges(skipWinId) {
    const mainEl = document.querySelector('main');
    const edges = { x: [0], y: [0] }; // container left/top
    if (mainEl) {
      edges.x.push(mainEl.clientWidth);  // container right
      edges.y.push(mainEl.clientHeight); // container bottom
    }
    for (const [id, { el }] of Object.entries(this._windows)) {
      if (id === skipWinId || el.style.display === 'none') continue;
      const l = el.offsetLeft, t = el.offsetTop;
      const r = l + el.offsetWidth, b = t + el.offsetHeight;
      edges.x.push(l, r);
      edges.y.push(t, b);
    }
    return edges;
  }

  _snap(val, targets, threshold) {
    let best = val, bestDist = threshold + 1;
    for (const t of targets) {
      const d = Math.abs(val - t);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    return bestDist <= threshold ? best : val;
  }

  // === Title bar drag-to-move ===

  _setupTitleBarDrag(win, titleBar, winId) {
    let startX, startY, startLeft, startTop;

    const onPointerDown = (e) => {
      // Ignore button clicks
      if (e.target.closest('.free-window-btn')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      titleBar.setPointerCapture(e.pointerId);

      startX = e.clientX;
      startY = e.clientY;
      startLeft = win.offsetLeft;
      startTop = win.offsetTop;
      win.classList.add('free-window-dragging');

      this._bringToFront(winId);
    };

    const onPointerMove = (e) => {
      if (!win.classList.contains('free-window-dragging')) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const mainEl = win.parentElement;
      const maxX = mainEl.clientWidth - win.offsetWidth;
      const maxY = mainEl.clientHeight - win.offsetHeight;

      let nx = Math.max(0, Math.min(maxX, startLeft + dx));
      let ny = Math.max(0, Math.min(maxY, startTop + dy));

      // Magnetic snapping to other windows and container edges
      const snap = FreeLayout.SNAP_DIST;
      const edges = this._getSnapEdges(winId);
      const w = win.offsetWidth, h = win.offsetHeight;

      // Snap left edge and right edge
      const snappedL = this._snap(nx, edges.x, snap);
      const snappedR = this._snap(nx + w, edges.x, snap);
      if (snappedL !== nx) nx = snappedL;
      else if (snappedR !== nx + w) nx = snappedR - w;

      // Snap top edge and bottom edge
      const snappedT = this._snap(ny, edges.y, snap);
      const snappedB = this._snap(ny + h, edges.y, snap);
      if (snappedT !== ny) ny = snappedT;
      else if (snappedB !== ny + h) ny = snappedB - h;

      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
    };

    const onPointerUp = () => {
      win.classList.remove('free-window-dragging');
      this._updatePos(winId);
      this._saveLayout();
    };

    titleBar.addEventListener('pointerdown', onPointerDown);
    titleBar.addEventListener('pointermove', onPointerMove);
    titleBar.addEventListener('pointerup', onPointerUp);
    titleBar.addEventListener('pointercancel', onPointerUp);
  }

  // === Edge/corner resize ===

  _setupResize(win, winId) {
    win.querySelectorAll('.free-resize-handle').forEach(handle => {
      const dir = handle.dataset.dir;

      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);

        const def = FreeLayout.WINDOW_DEFS[winId];
        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = {
          l: win.offsetLeft,
          t: win.offsetTop,
          w: win.offsetWidth,
          h: win.offsetHeight
        };

        const mainEl = win.parentElement;
        const maxW = mainEl.clientWidth;
        const maxH = mainEl.clientHeight;

        win.classList.add('free-window-resizing');
        this._bringToFront(winId);

        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          let l = startRect.l, t = startRect.t, w = startRect.w, h = startRect.h;

          // Horizontal
          if (dir.includes('e')) {
            w = Math.max(def.minW, startRect.w + dx);
            if (l + w > maxW) w = maxW - l;
          }
          if (dir.includes('w')) {
            const newW = Math.max(def.minW, startRect.w - dx);
            l = startRect.l + startRect.w - newW;
            if (l < 0) { l = 0; w = startRect.l + startRect.w; } else { w = newW; }
          }

          // Vertical — south
          if (dir === 's' || dir === 'se' || dir === 'sw') {
            h = Math.max(def.minH, startRect.h + dy);
            if (t + h > maxH) h = maxH - t;
          }
          // Vertical — north
          if (dir === 'n' || dir === 'ne' || dir === 'nw') {
            const newH = Math.max(def.minH, startRect.h - dy);
            t = startRect.t + startRect.h - newH;
            if (t < 0) { t = 0; h = startRect.t + startRect.h; } else { h = newH; }
          }

          win.style.left = l + 'px';
          win.style.top = t + 'px';
          win.style.width = w + 'px';
          win.style.height = h + 'px';

          if (winId === 'board' && this.onWindowResize) {
            this.onWindowResize(winId, { l, t, w, h });
          }
        };

        const onUp = () => {
          win.classList.remove('free-window-resizing');
          handle.removeEventListener('pointermove', onMove);
          handle.removeEventListener('pointerup', onUp);
          handle.removeEventListener('pointercancel', onUp);
          this._updatePos(winId);
          this._saveLayout();
          if (winId === 'board') this._fitBoard();
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
      });
    });
  }

  // === Focus / z-index ===

  _setupFocus(win, winId) {
    win.addEventListener('pointerdown', () => {
      this._bringToFront(winId);
    }, true);
  }

  _bringToFront(winId) {
    const win = this._windows[winId]?.el;
    if (!win) return;

    // Remove active class from all, add to this one
    document.querySelectorAll('.free-window-active').forEach(w => w.classList.remove('free-window-active'));
    win.classList.add('free-window-active');
    win.style.zIndex = ++this._topZ;
  }

  // === Minimize (double-click title bar or button) ===

  _setupMinimize(win, winId, titleBar) {
    const btn = win.querySelector('.free-minimize-btn');

    const toggle = () => {
      win.classList.toggle('free-window-minimized');
      this._updatePos(winId);
      this._saveLayout();
    };

    if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    titleBar.addEventListener('dblclick', toggle);
  }

  // === Close (hide window) ===

  _setupClose(win, winId) {
    const btn = win.querySelector('.free-close-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      win.style.display = 'none';
      this._updatePos(winId);
      this._saveLayout();
    });
  }

  // Show a hidden window (from a menu or keyboard shortcut)
  showWindow(winId) {
    const w = this._windows[winId];
    if (!w) return;
    w.el.style.display = '';
    w.el.classList.remove('free-window-minimized');
    this._bringToFront(winId);
    this._updatePos(winId);
    this._saveLayout();
  }

  // Hide a window (from panel toggles)
  hideWindow(winId) {
    const w = this._windows[winId];
    if (!w) return;
    w.el.style.display = 'none';
    this._saveLayout();
  }

  // === Board aspect-ratio handling ===

  _setupBoardFit() {
    const boardWin = this._windows.board?.el;
    if (!boardWin) return;

    // Use ResizeObserver to keep board square
    if (typeof ResizeObserver !== 'undefined') {
      this._boardObserver = new ResizeObserver(() => this._fitBoard());
      this._boardObserver.observe(boardWin);
    }
    // Initial fit
    requestAnimationFrame(() => this._fitBoard());
  }

  _fitBoard() {
    const boardWin = this._windows.board?.el;
    if (!boardWin) return;

    const content = boardWin.querySelector('.free-window-content');
    if (!content) return;

    const boardEl = document.getElementById('board');
    const container = document.getElementById('board-container');
    if (!boardEl || !container) return;

    // Available space inside the content area (minus player bars)
    const contentRect = content.getBoundingClientRect();
    const playerTop = content.querySelector('.player-info.top');
    const playerBottom = content.querySelector('.player-info.bottom');
    const ptH = playerTop ? playerTop.offsetHeight : 0;
    const pbH = playerBottom ? playerBottom.offsetHeight : 0;

    const availH = contentRect.height - ptH - pbH;
    const availW = contentRect.width;

    // Board should be square — use min of available w and h
    const boardSize = Math.max(120, Math.min(availW - 24, availH)); // 24px for eval bar + margin

    document.documentElement.style.setProperty('--board-size', boardSize + 'px');

    if (this.onWindowResize) {
      this.onWindowResize('board', boardWin.getBoundingClientRect());
    }
  }

  // === Viewport resize — clamp all windows ===

  _onViewportResize() {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const maxW = mainEl.clientWidth;
    const maxH = mainEl.clientHeight;

    for (const [winId, { el }] of Object.entries(this._windows)) {
      if (el.style.display === 'none') continue;

      let l = el.offsetLeft;
      let t = el.offsetTop;
      let w = el.offsetWidth;
      let h = el.offsetHeight;

      // Clamp position so at least title bar is visible
      if (l + w > maxW) l = Math.max(0, maxW - w);
      if (t + h > maxH) t = Math.max(0, maxH - h);
      if (l < 0) l = 0;
      if (t < 0) t = 0;

      el.style.left = l + 'px';
      el.style.top = t + 'px';
    }

    this._fitBoard();
    this._saveLayout();
  }

  // === Position helpers ===

  _defaultPos(winId, containerW, containerH) {
    const frac = FreeLayout.DEFAULT_POSITIONS[winId];
    if (!frac) return { x: 20, y: 20, w: 300, h: 200 };
    return {
      x: Math.round(frac.x * containerW),
      y: Math.round(frac.y * containerH),
      w: Math.round(frac.w * containerW),
      h: Math.round(frac.h * containerH),
      minimized: false,
      hidden: false
    };
  }

  _updatePos(winId) {
    const w = this._windows[winId];
    if (!w) return;
    w.pos = {
      x: w.el.offsetLeft,
      y: w.el.offsetTop,
      w: w.el.offsetWidth,
      h: w.el.offsetHeight,
      minimized: w.el.classList.contains('free-window-minimized'),
      hidden: w.el.style.display === 'none'
    };
  }

  // === Persistence ===

  _saveLayout() {
    const data = { active: true, positions: {} };
    for (const [id, { pos }] of Object.entries(this._windows)) {
      data.positions[id] = pos;
    }
    try {
      localStorage.setItem(FreeLayout.STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota */ }
  }

  _loadLayout() {
    try {
      const raw = localStorage.getItem(FreeLayout.STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data.positions || {};
    } catch {
      return {};
    }
  }

  static hasSavedLayout() {
    try {
      const raw = localStorage.getItem(FreeLayout.STORAGE_KEY);
      if (!raw) return false;
      return JSON.parse(raw).active === true;
    } catch {
      return false;
    }
  }

  static clearSaved() {
    localStorage.removeItem(FreeLayout.STORAGE_KEY);
  }

  // === Reset to default positions ===

  resetLayout() {
    if (!this._active) return;
    const mainEl = document.querySelector('main');
    if (!mainEl) return;
    const cW = mainEl.clientWidth;
    const cH = mainEl.clientHeight;

    for (const [winId, { el }] of Object.entries(this._windows)) {
      const pos = this._defaultPos(winId, cW, cH);
      el.style.left = pos.x + 'px';
      el.style.top = pos.y + 'px';
      el.style.width = pos.w + 'px';
      el.style.height = pos.h + 'px';
      el.style.display = '';
      el.classList.remove('free-window-minimized');
      this._windows[winId].pos = pos;
    }
    this._fitBoard();
    this._saveLayout();
  }
}
