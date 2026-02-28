// Board Scanner — Camera-to-screen chess position detection via Canvas pixel analysis
export class BoardScanner {
  constructor() {
    this._stream = null;
    this._videoEl = null;
    this._overlayCanvas = null;
    this._captureCanvas = document.createElement('canvas');
    this._ctx = null;
    this._animFrame = null;
    this._gridRect = null; // { x, y, size }
    this._orientation = 'w'; // 'w' = white on bottom, 'b' = black on bottom
    this._emptyBoardBaseline = null;
    this._detectedBoard = null;
    this._dragState = null;
  }

  /**
   * Start camera and render loop.
   * Returns null on success, error string on failure.
   */
  async startCamera(videoEl, overlayCanvas) {
    this._videoEl = videoEl;
    this._overlayCanvas = overlayCanvas;
    this._ctx = overlayCanvas.getContext('2d');

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      videoEl.srcObject = this._stream;
      await videoEl.play();

      // Wait a frame for video dimensions
      await new Promise(r => requestAnimationFrame(r));
      this._syncCanvasSize();
      this._initGrid();
      this._startRenderLoop();
      return null;
    } catch (err) {
      console.error('[Scanner] Camera error:', err);
      if (err.name === 'NotAllowedError') return 'Camera access denied. Please allow camera permission.';
      if (err.name === 'NotFoundError') return 'No camera found on this device.';
      return 'Could not access camera: ' + err.message;
    }
  }

  stopCamera() {
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this._videoEl) { this._videoEl.srcObject = null; }
    if (this._ctx) { this._ctx.clearRect(0, 0, this._overlayCanvas.width, this._overlayCanvas.height); }
  }

  resumeRender() {
    if (!this._animFrame && this._stream) this._startRenderLoop();
  }

  setOrientation(color) {
    this._orientation = color;
  }

  // === Grid setup ===

  _syncCanvasSize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this._overlayCanvas.getBoundingClientRect();
    this._overlayCanvas.width = rect.width * dpr;
    this._overlayCanvas.height = rect.height * dpr;
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _initGrid() {
    const rect = this._overlayCanvas.getBoundingClientRect();
    const smaller = Math.min(rect.width, rect.height);
    const size = Math.round(smaller * 0.8);
    this._gridRect = {
      x: Math.round((rect.width - size) / 2),
      y: Math.round((rect.height - size) / 2),
      size
    };
  }

  // === Render loop ===

  _startRenderLoop() {
    const render = () => {
      this._renderFrame();
      this._animFrame = requestAnimationFrame(render);
    };
    this._animFrame = requestAnimationFrame(render);
  }

  _renderFrame() {
    const canvas = this._overlayCanvas;
    const ctx = this._ctx;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw video frame
    if (this._videoEl && this._videoEl.readyState >= 2) {
      ctx.drawImage(this._videoEl, 0, 0, rect.width, rect.height);
    }

    // Draw grid overlay
    if (this._gridRect) this._drawGrid(ctx);
  }

  _drawGrid(ctx) {
    const g = this._gridRect;
    const sqSize = g.size / 8;

    // Semi-transparent overlay outside grid
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    const rect = this._overlayCanvas.getBoundingClientRect();
    // Top
    ctx.fillRect(0, 0, rect.width, g.y);
    // Bottom
    ctx.fillRect(0, g.y + g.size, rect.width, rect.height - g.y - g.size);
    // Left
    ctx.fillRect(0, g.y, g.x, g.size);
    // Right
    ctx.fillRect(g.x + g.size, g.y, rect.width - g.x - g.size, g.size);

    // Grid lines
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.7)';
    ctx.lineWidth = 1.5;

    // Outer border
    ctx.strokeRect(g.x, g.y, g.size, g.size);

    // Inner grid lines
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.45)';
    for (let i = 1; i < 8; i++) {
      // Vertical
      ctx.beginPath();
      ctx.moveTo(g.x + i * sqSize, g.y);
      ctx.lineTo(g.x + i * sqSize, g.y + g.size);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + i * sqSize);
      ctx.lineTo(g.x + g.size, g.y + i * sqSize);
      ctx.stroke();
    }

    // Rank/file labels
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const files = this._orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
    const ranks = this._orientation === 'w' ? '87654321' : '12345678';
    for (let i = 0; i < 8; i++) {
      // File labels below
      ctx.fillText(files[i], g.x + (i + 0.5) * sqSize, g.y + g.size + 12);
      // Rank labels left
      ctx.fillText(ranks[i], g.x - 10, g.y + (i + 0.5) * sqSize);
    }

    // Corner drag handles
    const handleSize = 14;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
    const corners = [
      [g.x, g.y], [g.x + g.size, g.y],
      [g.x, g.y + g.size], [g.x + g.size, g.y + g.size]
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.arc(cx, cy, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === Grid controls (drag to move, corner-drag to resize) ===

  setupGridControls(canvas) {
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    };

    const hitCorner = (pos) => {
      if (!this._gridRect) return null;
      const g = this._gridRect;
      const threshold = 24;
      const corners = [
        { key: 'tl', x: g.x, y: g.y },
        { key: 'tr', x: g.x + g.size, y: g.y },
        { key: 'bl', x: g.x, y: g.y + g.size },
        { key: 'br', x: g.x + g.size, y: g.y + g.size },
      ];
      for (const c of corners) {
        if (Math.abs(pos.x - c.x) < threshold && Math.abs(pos.y - c.y) < threshold) return c.key;
      }
      return null;
    };

    const hitGrid = (pos) => {
      if (!this._gridRect) return false;
      const g = this._gridRect;
      return pos.x >= g.x && pos.x <= g.x + g.size && pos.y >= g.y && pos.y <= g.y + g.size;
    };

    const onDown = (e) => {
      e.preventDefault();
      const pos = getPos(e);
      const corner = hitCorner(pos);
      if (corner) {
        this._dragState = { type: 'resize', corner, startPos: pos, startGrid: { ...this._gridRect } };
      } else if (hitGrid(pos)) {
        this._dragState = { type: 'move', startPos: pos, startGrid: { ...this._gridRect } };
      }
    };

    const onMove = (e) => {
      if (!this._dragState) return;
      e.preventDefault();
      const pos = getPos(e);
      const dx = pos.x - this._dragState.startPos.x;
      const dy = pos.y - this._dragState.startPos.y;
      const sg = this._dragState.startGrid;

      if (this._dragState.type === 'move') {
        this._gridRect.x = sg.x + dx;
        this._gridRect.y = sg.y + dy;
      } else if (this._dragState.type === 'resize') {
        // Uniform resize from any corner
        const corner = this._dragState.corner;
        let delta;
        if (corner === 'br') delta = Math.max(dx, dy);
        else if (corner === 'bl') delta = Math.max(-dx, dy);
        else if (corner === 'tr') delta = Math.max(dx, -dy);
        else delta = Math.max(-dx, -dy);

        const newSize = Math.max(80, sg.size + delta);
        this._gridRect.size = newSize;

        if (corner === 'tl') {
          this._gridRect.x = sg.x + sg.size - newSize;
          this._gridRect.y = sg.y + sg.size - newSize;
        } else if (corner === 'tr') {
          this._gridRect.y = sg.y + sg.size - newSize;
        } else if (corner === 'bl') {
          this._gridRect.x = sg.x + sg.size - newSize;
        }
        // br: x/y stay the same
      }
    };

    const onUp = () => { this._dragState = null; };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.style.touchAction = 'none';
  }

  // === Capture & Analyze ===

  captureAndAnalyze() {
    // Pause render loop
    if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }

    // Draw frame to offscreen capture canvas at video resolution
    const vw = this._videoEl.videoWidth;
    const vh = this._videoEl.videoHeight;
    this._captureCanvas.width = vw;
    this._captureCanvas.height = vh;
    const cctx = this._captureCanvas.getContext('2d');
    cctx.drawImage(this._videoEl, 0, 0, vw, vh);

    const board = this._analyzeBoard(cctx, vw, vh);
    const fen = this.boardToFEN(board, 'w');

    return { board, fen, confidence: this._lastConfidence || 0.5 };
  }

  _analyzeBoard(cctx, canvasW, canvasH) {
    const g = this._gridRect;
    const displayRect = this._overlayCanvas.getBoundingClientRect();

    // Scale grid rect from display coords to video coords
    const scaleX = canvasW / displayRect.width;
    const scaleY = canvasH / displayRect.height;
    const gx = g.x * scaleX;
    const gy = g.y * scaleY;
    const gw = g.size * scaleX;
    const gh = g.size * scaleY;

    const sqW = gw / 8;
    const sqH = gh / 8;

    // Get entire grid image data
    const safeX = Math.max(0, Math.round(gx));
    const safeY = Math.max(0, Math.round(gy));
    const safeW = Math.min(Math.round(gw), canvasW - safeX);
    const safeH = Math.min(Math.round(gh), canvasH - safeY);
    const imageData = cctx.getImageData(safeX, safeY, safeW, safeH);

    // Collect stats for each square
    const stats = [];
    for (let row = 0; row < 8; row++) {
      stats[row] = [];
      for (let col = 0; col < 8; col++) {
        const sx = Math.round(col * sqW);
        const sy = Math.round(row * sqH);
        const sw = Math.round(sqW);
        const sh = Math.round(sqH);
        stats[row][col] = this._getSquareStats(imageData, sx, sy, sw, sh);
      }
    }

    // Compute baselines per square color (light vs dark)
    const lightStats = [], darkStats = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        (isLight ? lightStats : darkStats).push(stats[row][col]);
      }
    }

    const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

    const lightBaseline = {
      brightness: median(lightStats.map(s => s.avgBrightness)),
      variance: median(lightStats.map(s => s.variance))
    };
    const darkBaseline = {
      brightness: median(darkStats.map(s => s.avgBrightness)),
      variance: median(darkStats.map(s => s.variance))
    };

    // Apply empty board baseline if available
    const emptyBase = this._emptyBoardBaseline;

    // Detect occupancy and classify
    const board = [];
    let confSum = 0;
    for (let row = 0; row < 8; row++) {
      board[row] = [];
      for (let col = 0; col < 8; col++) {
        const s = stats[row][col];
        const isLight = (row + col) % 2 === 0;
        const baseline = isLight ? lightBaseline : darkBaseline;

        let signals = 0;

        // Signal 1: Brightness deviation from baseline
        const brightDev = Math.abs(s.avgBrightness - baseline.brightness);
        const brightThreshold = emptyBase ? 20 : 25;
        if (brightDev > brightThreshold) signals++;

        // Signal 2: Variance spike (piece edges create texture)
        const varRatio = s.variance / (baseline.variance + 1);
        if (varRatio > 1.5) signals++;

        // Signal 3: Center/edge brightness ratio differs
        const ratio = s.centerBrightness / (s.edgeBrightness + 1);
        const emptyRatio = emptyBase ?
          (emptyBase[row][col].centerBrightness / (emptyBase[row][col].edgeBrightness + 1)) : 1.0;
        if (Math.abs(ratio - emptyRatio) > 0.15) signals++;

        const occupied = signals >= 2;

        if (occupied) {
          // Classify piece color
          const midBrightness = (lightBaseline.brightness + darkBaseline.brightness) / 2;
          const isWhitePiece = s.centerBrightness > midBrightness;

          // Infer piece type heuristically based on rank
          const boardRow = this._orientation === 'w' ? row : 7 - row;
          const boardCol = this._orientation === 'w' ? col : 7 - col;
          const piece = this._inferPieceType(isWhitePiece ? 'w' : 'b', boardRow, boardCol);
          board[row][col] = piece;
          confSum += (signals === 3) ? 0.9 : 0.6;
        } else {
          board[row][col] = null;
          confSum += (signals === 0) ? 0.9 : 0.7;
        }
      }
    }

    this._lastConfidence = confSum / 64;
    this._detectedBoard = board;
    return board;
  }

  _getSquareStats(imageData, sx, sy, sw, sh) {
    const data = imageData.data;
    const imgW = imageData.width;

    // Sample center 60% to avoid borders
    const margin = 0.2;
    const cx = Math.round(sx + sw * margin);
    const cy = Math.round(sy + sh * margin);
    const cw = Math.round(sw * 0.6);
    const ch = Math.round(sh * 0.6);

    let totalBrightness = 0;
    let count = 0;
    const values = [];

    for (let y = cy; y < cy + ch && y < imageData.height; y++) {
      for (let x = cx; x < cx + cw && x < imgW; x++) {
        const idx = (y * imgW + x) * 4;
        const brightness = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        totalBrightness += brightness;
        values.push(brightness);
        count++;
      }
    }

    const avgBrightness = count > 0 ? totalBrightness / count : 0;

    // Variance
    let variance = 0;
    for (const v of values) variance += (v - avgBrightness) ** 2;
    variance = count > 1 ? variance / count : 0;

    // Center brightness (inner 30%)
    const centerMargin = 0.35;
    const ccx = Math.round(sx + sw * centerMargin);
    const ccy = Math.round(sy + sh * centerMargin);
    const ccw = Math.round(sw * 0.3);
    const cch = Math.round(sh * 0.3);
    let centerSum = 0, centerCount = 0;
    for (let y = ccy; y < ccy + cch && y < imageData.height; y++) {
      for (let x = ccx; x < ccx + ccw && x < imgW; x++) {
        const idx = (y * imgW + x) * 4;
        centerSum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        centerCount++;
      }
    }
    const centerBrightness = centerCount > 0 ? centerSum / centerCount : avgBrightness;

    // Edge brightness (outer ring)
    let edgeSum = 0, edgeCount = 0;
    for (let y = sy; y < sy + sh && y < imageData.height; y++) {
      for (let x = sx; x < sx + sw && x < imgW; x++) {
        const inCenter = x >= cx && x < cx + cw && y >= cy && y < cy + ch;
        if (inCenter) continue;
        const idx = (y * imgW + x) * 4;
        edgeSum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        edgeCount++;
      }
    }
    const edgeBrightness = edgeCount > 0 ? edgeSum / edgeCount : avgBrightness;

    return { avgBrightness, variance, centerBrightness, edgeBrightness };
  }

  _inferPieceType(color, boardRow, boardCol) {
    // boardRow 0 = rank 8 (black back rank), boardRow 7 = rank 1 (white back rank)
    const prefix = color === 'w' ? 'w' : 'b';
    // Pawns on ranks 2–7 (boardRow 1–6)
    if (boardRow >= 1 && boardRow <= 6) return prefix + 'P';
    // Back rank — infer by column
    const backRankPieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    return prefix + backRankPieces[boardCol];
  }

  // === Calibration ===

  calibrateEmpty() {
    if (!this._videoEl || this._videoEl.readyState < 2) return false;

    const vw = this._videoEl.videoWidth;
    const vh = this._videoEl.videoHeight;
    this._captureCanvas.width = vw;
    this._captureCanvas.height = vh;
    const cctx = this._captureCanvas.getContext('2d');
    cctx.drawImage(this._videoEl, 0, 0, vw, vh);

    const g = this._gridRect;
    const displayRect = this._overlayCanvas.getBoundingClientRect();
    const scaleX = vw / displayRect.width;
    const scaleY = vh / displayRect.height;
    const gx = g.x * scaleX;
    const gy = g.y * scaleY;
    const gw = g.size * scaleX;
    const gh = g.size * scaleY;

    const sqW = gw / 8;
    const sqH = gh / 8;

    const safeX = Math.max(0, Math.round(gx));
    const safeY = Math.max(0, Math.round(gy));
    const safeW = Math.min(Math.round(gw), vw - safeX);
    const safeH = Math.min(Math.round(gh), vh - safeY);
    const imageData = cctx.getImageData(safeX, safeY, safeW, safeH);

    this._emptyBoardBaseline = [];
    for (let row = 0; row < 8; row++) {
      this._emptyBoardBaseline[row] = [];
      for (let col = 0; col < 8; col++) {
        const sx = Math.round(col * sqW);
        const sy = Math.round(row * sqH);
        this._emptyBoardBaseline[row][col] = this._getSquareStats(imageData, sx, sy, Math.round(sqW), Math.round(sqH));
      }
    }
    return true;
  }

  // === FEN conversion ===

  boardToFEN(board, turn = 'w') {
    let fen = '';
    for (let row = 0; row < 8; row++) {
      let empty = 0;
      for (let col = 0; col < 8; col++) {
        const cell = board[row][col];
        if (!cell) {
          empty++;
        } else {
          if (empty > 0) { fen += empty; empty = 0; }
          const pieceChar = cell[1]; // P, N, B, R, Q, K
          fen += cell[0] === 'w' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
        }
      }
      if (empty > 0) fen += empty;
      if (row < 7) fen += '/';
    }
    return fen + ` ${turn} KQkq - 0 1`;
  }
}
