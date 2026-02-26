// Layout Manager — Full-screen grid-based layout customization
// Allows users to freely place all UI widgets on a grid

export class LayoutManager {
  static GRID_COLS = 16;
  static GRID_ROWS = 12;
  static STORAGE_KEY = 'chess_grid_layout';

  // Widget definitions — id must match drag-group data-drag-id
  static WIDGETS = [
    // Board area widgets
    { id: 'player-top',    label: 'Player Top',       icon: '\u265F', defaultCol: 0,  defaultRow: 0, defaultW: 8, defaultH: 1, minW: 3, minH: 1 },
    { id: 'board',         label: 'Chess Board',      icon: '\u265A', defaultCol: 0,  defaultRow: 1, defaultW: 8, defaultH: 8, minW: 4, minH: 4 },
    { id: 'player-bottom', label: 'Player Bottom',    icon: '\u2659', defaultCol: 0,  defaultRow: 9, defaultW: 8, defaultH: 1, minW: 3, minH: 1 },
    { id: 'opening',       label: 'Opening Name',     icon: '\u2637', defaultCol: 0,  defaultRow: 10,defaultW: 4, defaultH: 1, minW: 2, minH: 1 },
    { id: 'eval-graph',    label: 'Eval Graph',       icon: '\u223F', defaultCol: 4,  defaultRow: 10,defaultW: 4, defaultH: 1, minW: 2, minH: 1 },
    { id: 'nav',           label: 'Nav Controls',     icon: '\u25C0', defaultCol: 0,  defaultRow: 11,defaultW: 4, defaultH: 1, minW: 3, minH: 1 },
    { id: 'music',         label: 'Music Player',     icon: '\u266B', defaultCol: 4,  defaultRow: 11,defaultW: 4, defaultH: 1, minW: 3, minH: 1 },
    // Side panel widgets
    { id: 'status',        label: 'Status Bar',       icon: '\u2139', defaultCol: 8,  defaultRow: 0, defaultW: 8, defaultH: 1, minW: 3, minH: 1 },
    { id: 'tab-bar',       label: 'Tab Bar',          icon: '\u2261', defaultCol: 8,  defaultRow: 1, defaultW: 8, defaultH: 1, minW: 3, minH: 1 },
    { id: 'moves',         label: 'Move History',     icon: '\u2630', defaultCol: 8,  defaultRow: 2, defaultW: 8, defaultH: 4, minW: 3, minH: 2 },
    { id: 'book',          label: 'Opening Explorer', icon: '\u2684', defaultCol: 8,  defaultRow: 2, defaultW: 8, defaultH: 4, minW: 3, minH: 2, defaultVisible: false },
    { id: 'hints',         label: 'GM Hints',         icon: '\u2605', defaultCol: 8,  defaultRow: 2, defaultW: 8, defaultH: 4, minW: 3, minH: 2, defaultVisible: false },
    { id: 'gm-coach-tab',  label: 'GM Coach',         icon: '\u2655', defaultCol: 8,  defaultRow: 2, defaultW: 8, defaultH: 4, minW: 3, minH: 2, defaultVisible: false },
    { id: 'coach-area',    label: 'Coach Commentary', icon: '\u2606', defaultCol: 8,  defaultRow: 6, defaultW: 8, defaultH: 2, minW: 3, minH: 1 },
    { id: 'notes',         label: 'Notes',            icon: '\u270E', defaultCol: 8,  defaultRow: 8, defaultW: 8, defaultH: 4, minW: 3, minH: 1 },
  ];

  constructor() {
    this._overlay = null;
    this._grid = null;
    this._widgetEls = new Map();
    this._active = false;
    this._layout = null;
    this._cellW = 0;
    this._cellH = 0;
    this._boundResize = this._onResize.bind(this);
  }

  open() {
    if (this._active) return;
    this._active = true;
    this._loadLayout();
    this._buildOverlay();
    this._renderWidgets();
    document.body.classList.add('grid-layout-active');
  }

  close() {
    if (!this._active) return;
    this._active = false;
    document.body.classList.remove('grid-layout-active');
    window.removeEventListener('resize', this._boundResize);
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
    this._grid = null;
    this._widgetEls.clear();
    // Apply saved layout to actual DOM
    this._applyToDOM();
  }

  // --- Storage ---

  _loadLayout() {
    try {
      const saved = localStorage.getItem(LayoutManager.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this._layout = {};
        for (const w of LayoutManager.WIDGETS) {
          if (parsed[w.id]) {
            this._layout[w.id] = {
              col: this._clamp(parsed[w.id].col, 0, LayoutManager.GRID_COLS - w.minW),
              row: this._clamp(parsed[w.id].row, 0, LayoutManager.GRID_ROWS - w.minH),
              w: this._clamp(parsed[w.id].w, w.minW, LayoutManager.GRID_COLS),
              h: this._clamp(parsed[w.id].h, w.minH, LayoutManager.GRID_ROWS),
              visible: parsed[w.id].visible !== false
            };
          } else {
            this._layout[w.id] = {
              col: w.defaultCol, row: w.defaultRow,
              w: w.defaultW, h: w.defaultH, visible: w.defaultVisible !== false
            };
          }
        }
        return;
      }
    } catch { /* ignore */ }
    this._resetToDefaults();
  }

  _resetToDefaults() {
    this._layout = {};
    for (const w of LayoutManager.WIDGETS) {
      this._layout[w.id] = {
        col: w.defaultCol, row: w.defaultRow,
        w: w.defaultW, h: w.defaultH, visible: w.defaultVisible !== false
      };
    }
  }

  _saveLayout() {
    localStorage.setItem(LayoutManager.STORAGE_KEY, JSON.stringify(this._layout));
  }

  _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // --- Overlay UI ---

  _buildOverlay() {
    if (this._overlay) this._overlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'grid-layout-overlay';
    overlay.innerHTML = `
      <div class="grid-layout-header">
        <h2 class="grid-layout-title">Layout Manager</h2>
        <div class="grid-layout-actions">
          <button class="btn btn-sm grid-layout-btn" id="grid-layout-classic">Classic Layout</button>
          <button class="btn btn-sm grid-layout-btn" id="grid-layout-reset">Reset Grid</button>
          <button class="btn btn-sm btn-primary grid-layout-btn" id="grid-layout-done">Apply &amp; Close</button>
        </div>
      </div>
      <div class="grid-layout-body">
        <div class="grid-layout-sidebar">
          <div class="grid-layout-sidebar-title">Widgets</div>
          <div class="grid-layout-widget-list" id="grid-widget-list"></div>
          <div class="grid-layout-hint">
            Drag widgets to move them. Drag bottom/right edges to resize.
            Use toggles to show/hide widgets.
          </div>
        </div>
        <div class="grid-layout-canvas" id="grid-layout-canvas">
          <div class="grid-layout-grid" id="grid-layout-grid"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // Build grid cells (16 x 12 = 192 cells)
    this._grid = overlay.querySelector('#grid-layout-grid');
    for (let r = 0; r < LayoutManager.GRID_ROWS; r++) {
      for (let c = 0; c < LayoutManager.GRID_COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.col = c;
        cell.dataset.row = r;
        this._grid.appendChild(cell);
      }
    }

    // Build sidebar widget list
    const list = overlay.querySelector('#grid-widget-list');
    for (const w of LayoutManager.WIDGETS) {
      const item = document.createElement('div');
      item.className = 'grid-sidebar-widget';
      item.dataset.widgetId = w.id;
      const vis = this._layout[w.id]?.visible !== false;
      item.innerHTML = `
        <span class="grid-sidebar-icon">${w.icon}</span>
        <span class="grid-sidebar-label">${w.label}</span>
        <span class="toggle-switch">
          <input type="checkbox" ${vis ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </span>
      `;
      const cb = item.querySelector('input');
      cb.addEventListener('change', () => {
        this._layout[w.id].visible = cb.checked;
        this._saveLayout();
        this._renderWidgets();
      });
      list.appendChild(item);
    }

    // Events
    overlay.querySelector('#grid-layout-done').addEventListener('click', () => this.close());

    overlay.querySelector('#grid-layout-reset').addEventListener('click', () => {
      this._resetToDefaults();
      this._saveLayout();
      this._renderWidgets();
      this._syncSidebarCheckboxes(list);
    });

    overlay.querySelector('#grid-layout-classic').addEventListener('click', () => {
      // Remove grid layout, go back to default flex
      this._active = false;
      document.body.classList.remove('grid-layout-active');
      window.removeEventListener('resize', this._boundResize);
      if (this._overlay) {
        this._overlay.remove();
        this._overlay = null;
      }
      this._grid = null;
      this._widgetEls.clear();
      LayoutManager.resetDOM();
    });

    // Compute cell dimensions after a frame (to get accurate layout)
    requestAnimationFrame(() => {
      this._updateCellSize();
      this._renderWidgets();
    });
    window.addEventListener('resize', this._boundResize);
  }

  _syncSidebarCheckboxes(list) {
    list.querySelectorAll('.grid-sidebar-widget').forEach(item => {
      const id = item.dataset.widgetId;
      const cb = item.querySelector('input');
      if (cb) cb.checked = this._layout[id]?.visible !== false;
    });
  }

  _onResize() {
    if (!this._active) return;
    this._updateCellSize();
    this._renderWidgets();
  }

  _updateCellSize() {
    if (!this._grid) return;
    const rect = this._grid.getBoundingClientRect();
    this._cellW = rect.width / LayoutManager.GRID_COLS;
    this._cellH = rect.height / LayoutManager.GRID_ROWS;
  }

  // --- Widget rendering ---

  _renderWidgets() {
    // Remove old widget overlays
    this._widgetEls.forEach(el => el.remove());
    this._widgetEls.clear();

    if (!this._grid) return;

    for (const w of LayoutManager.WIDGETS) {
      const pos = this._layout[w.id];
      if (!pos || !pos.visible) continue;

      const el = document.createElement('div');
      el.className = 'grid-widget';
      el.dataset.widgetId = w.id;
      el.innerHTML = `
        <div class="grid-widget-label">${w.icon} ${w.label}</div>
        <div class="grid-widget-resize grid-widget-resize-r" data-dir="r"></div>
        <div class="grid-widget-resize grid-widget-resize-b" data-dir="b"></div>
        <div class="grid-widget-resize grid-widget-resize-rb" data-dir="rb"></div>
      `;

      this._positionWidget(el, pos);
      this._grid.appendChild(el);
      this._widgetEls.set(w.id, el);

      // Drag to move
      el.addEventListener('pointerdown', (e) => this._onWidgetPointerDown(e, w.id));
    }

    this._highlightCells();
  }

  _positionWidget(el, pos) {
    el.style.gridColumn = `${pos.col + 1} / span ${pos.w}`;
    el.style.gridRow = `${pos.row + 1} / span ${pos.h}`;
  }

  _highlightCells() {
    if (!this._grid) return;
    this._grid.querySelectorAll('.grid-cell').forEach(c => {
      c.classList.remove('grid-cell-occupied');
    });

    for (const w of LayoutManager.WIDGETS) {
      const pos = this._layout[w.id];
      if (!pos || !pos.visible) continue;
      for (let r = pos.row; r < pos.row + pos.h; r++) {
        for (let c = pos.col; c < pos.col + pos.w; c++) {
          const cell = this._grid.querySelector(`.grid-cell[data-col="${c}"][data-row="${r}"]`);
          if (cell) cell.classList.add('grid-cell-occupied');
        }
      }
    }
  }

  // --- Drag to move ---

  _onWidgetPointerDown(e, widgetId) {
    if (e.target.closest('.grid-widget-resize')) {
      this._onResizePointerDown(e, widgetId);
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = this._layout[widgetId];
    const el = this._widgetEls.get(widgetId);
    if (!el || !pos) return;

    this._updateCellSize();
    const gridRect = this._grid.getBoundingClientRect();
    const offsetCol = Math.floor((e.clientX - gridRect.left) / this._cellW) - pos.col;
    const offsetRow = Math.floor((e.clientY - gridRect.top) / this._cellH) - pos.row;

    el.classList.add('grid-widget-dragging');

    const onMove = (ev) => {
      const newCol = Math.floor((ev.clientX - gridRect.left) / this._cellW) - offsetCol;
      const newRow = Math.floor((ev.clientY - gridRect.top) / this._cellH) - offsetRow;

      pos.col = this._clamp(newCol, 0, LayoutManager.GRID_COLS - pos.w);
      pos.row = this._clamp(newRow, 0, LayoutManager.GRID_ROWS - pos.h);

      this._positionWidget(el, pos);
      this._highlightCells();
    };

    const onUp = () => {
      el.classList.remove('grid-widget-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this._saveLayout();
      this._highlightCells();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- Resize ---

  _onResizePointerDown(e, widgetId) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const dir = e.target.dataset.dir;
    const wDef = LayoutManager.WIDGETS.find(w => w.id === widgetId);
    const pos = this._layout[widgetId];
    const el = this._widgetEls.get(widgetId);
    if (!el || !pos || !dir) return;

    this._updateCellSize();
    const gridRect = this._grid.getBoundingClientRect();
    el.classList.add('grid-widget-resizing');

    const onMove = (ev) => {
      const mouseCol = Math.floor((ev.clientX - gridRect.left) / this._cellW) + 1;
      const mouseRow = Math.floor((ev.clientY - gridRect.top) / this._cellH) + 1;

      if (dir.includes('r')) {
        pos.w = this._clamp(mouseCol - pos.col, wDef.minW, LayoutManager.GRID_COLS - pos.col);
      }
      if (dir.includes('b')) {
        pos.h = this._clamp(mouseRow - pos.row, wDef.minH, LayoutManager.GRID_ROWS - pos.row);
      }

      this._positionWidget(el, pos);
      this._highlightCells();
    };

    const onUp = () => {
      el.classList.remove('grid-widget-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      this._saveLayout();
      this._highlightCells();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // --- Apply grid layout to actual DOM ---

  _applyToDOM() {
    const layout = this._layout;
    if (!layout) return;

    const main = document.querySelector('main');
    if (!main) return;

    // Switch main to CSS grid mode
    main.style.display = 'grid';
    main.style.gridTemplateColumns = `repeat(${LayoutManager.GRID_COLS}, 1fr)`;
    main.style.gridTemplateRows = `repeat(${LayoutManager.GRID_ROWS}, 1fr)`;
    main.style.gap = '4px';
    main.style.padding = '8px';
    main.style.height = 'calc(100dvh - 50px)';
    main.style.minHeight = '0';
    main.style.overflow = 'hidden';
    main.style.alignItems = 'stretch';
    main.style.justifyContent = 'stretch';

    // Make board-area and side-panel transparent containers
    const boardArea = document.querySelector('.board-area');
    const sidePanel = document.querySelector('.side-panel');
    const resizeMain = document.getElementById('resize-handle-main');

    if (boardArea) {
      boardArea.style.display = 'contents';
    }
    if (sidePanel) {
      sidePanel.style.display = 'contents';
      sidePanel.style.width = '';
      sidePanel.style.height = '';
    }
    if (resizeMain) resizeMain.style.display = 'none';

    // Tab content IDs mapped to their drag-group IDs
    const TAB_PANELS = {
      'moves': 'tab-moves',
      'book': 'tab-book',
      'hints': 'tab-ideas',
      'gm-coach-tab': 'tab-gm-coach'
    };

    // Position each drag-group on the grid
    for (const w of LayoutManager.WIDGETS) {
      const pos = layout[w.id];
      const dragGroup = document.querySelector(`[data-drag-id="${w.id}"]`);
      if (!dragGroup) continue;

      if (pos && pos.visible) {
        dragGroup.style.display = 'flex';
        dragGroup.style.flexDirection = 'column';
        dragGroup.style.gridColumn = `${pos.col + 1} / span ${pos.w}`;
        dragGroup.style.gridRow = `${pos.row + 1} / span ${pos.h}`;
        dragGroup.style.overflow = 'auto';
        dragGroup.style.minWidth = '0';
        dragGroup.style.minHeight = '0';

        // In grid mode, show tab panels directly (bypass tab switching)
        if (TAB_PANELS[w.id]) {
          const panel = document.getElementById(TAB_PANELS[w.id]);
          if (panel) panel.classList.remove('hidden');
        }
      } else {
        dragGroup.style.display = 'none';
      }
    }

    // Place analysis-summary near status area
    const summary = document.getElementById('analysis-summary');
    if (summary) {
      const sPos = layout.status;
      if (sPos) {
        summary.style.gridColumn = `${sPos.col + 1} / span ${sPos.w}`;
        const sRow = sPos.row + sPos.h + 1;
        summary.style.gridRow = `${sRow} / span 1`;
      }
    }
  }

  // Check if a grid layout is saved and apply it on page load
  static applyIfSaved() {
    try {
      const saved = localStorage.getItem(LayoutManager.STORAGE_KEY);
      if (saved) {
        const mgr = new LayoutManager();
        mgr._loadLayout();
        mgr._applyToDOM();
        return mgr;
      }
    } catch { /* ignore */ }
    return null;
  }

  // Reset to default flexbox layout (undo CSS grid on main)
  static resetDOM() {
    const main = document.querySelector('main');
    if (!main) return;

    // Clear all inline grid styles on main
    main.style.display = '';
    main.style.gridTemplateColumns = '';
    main.style.gridTemplateRows = '';
    main.style.gap = '';
    main.style.padding = '';
    main.style.height = '';
    main.style.minHeight = '';
    main.style.overflow = '';
    main.style.alignItems = '';
    main.style.justifyContent = '';

    const boardArea = document.querySelector('.board-area');
    const sidePanel = document.querySelector('.side-panel');
    const resizeMain = document.getElementById('resize-handle-main');

    if (boardArea) boardArea.style.display = '';
    if (sidePanel) {
      sidePanel.style.display = '';
      sidePanel.style.width = '';
      sidePanel.style.height = '';
    }
    if (resizeMain) resizeMain.style.display = '';

    // Reset all drag-group inline styles
    document.querySelectorAll('.drag-group').forEach(g => {
      g.style.display = '';
      g.style.flexDirection = '';
      g.style.gridColumn = '';
      g.style.gridRow = '';
      g.style.overflow = '';
      g.style.minWidth = '';
      g.style.minHeight = '';
    });

    const summary = document.getElementById('analysis-summary');
    if (summary) {
      summary.style.gridColumn = '';
      summary.style.gridRow = '';
    }

    // Restore tab panel states (hide all except the active tab)
    const activeTab = document.querySelector('.panel-tab.active');
    const activeTabId = activeTab ? activeTab.dataset.tab : 'moves';
    ['tab-moves', 'tab-book', 'tab-ideas', 'tab-gm-coach'].forEach(id => {
      const panel = document.getElementById(id);
      if (!panel) return;
      if (id === `tab-${activeTabId}`) {
        panel.classList.remove('hidden');
      } else {
        panel.classList.add('hidden');
      }
    });

    localStorage.removeItem(LayoutManager.STORAGE_KEY);
  }
}
