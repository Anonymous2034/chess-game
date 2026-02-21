// SVG evaluation graph for post-match analysis

export class EvalGraph {
  constructor(containerEl) {
    this.container = containerEl;
    this.onMoveClick = null; // callback(moveIndex)
  }

  /**
   * Render the evaluation graph
   * @param {Object[]} analysisResults - Array of per-move analysis results
   * @param {number} currentIndex - Currently selected move index
   */
  render(analysisResults, currentIndex = -1) {
    if (!this.container || !analysisResults || analysisResults.length === 0) {
      if (this.container) this.container.innerHTML = '';
      return;
    }

    const width = this.container.clientWidth || 400;
    const height = 80;
    const padding = { left: 2, right: 2, top: 4, bottom: 4 };
    const graphW = width - padding.left - padding.right;
    const graphH = height - padding.top - padding.bottom;
    const midY = padding.top + graphH / 2;

    // Clamp evaluations to [-500, 500] centipawns for display
    const maxCp = 500;
    const clamp = (v) => Math.max(-maxCp, Math.min(maxCp, v));

    const points = analysisResults.map((r, i) => {
      const eval_ = clamp(r.bestEval);
      const x = padding.left + (i / (analysisResults.length - 1 || 1)) * graphW;
      const y = midY - (eval_ / maxCp) * (graphH / 2);
      return { x, y, eval: r.bestEval, index: i };
    });

    // Build SVG
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="eval-graph-svg">`;

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#1a1816" rx="4"/>`;

    // White/Black halves
    svg += `<rect x="${padding.left}" y="${padding.top}" width="${graphW}" height="${graphH/2}" fill="rgba(255,255,255,0.05)"/>`;
    svg += `<rect x="${padding.left}" y="${midY}" width="${graphW}" height="${graphH/2}" fill="rgba(0,0,0,0.15)"/>`;

    // Center line (0 eval)
    svg += `<line x1="${padding.left}" y1="${midY}" x2="${width - padding.right}" y2="${midY}" stroke="#555" stroke-width="1" stroke-dasharray="4,3"/>`;

    // Fill area under curve
    if (points.length > 1) {
      // White advantage fill (above midline)
      let whiteFill = `M${points[0].x},${midY}`;
      let blackFill = `M${points[0].x},${midY}`;

      for (const p of points) {
        const wy = Math.min(p.y, midY);
        const by = Math.max(p.y, midY);
        whiteFill += ` L${p.x},${wy}`;
        blackFill += ` L${p.x},${by}`;
      }
      whiteFill += ` L${points[points.length-1].x},${midY} Z`;
      blackFill += ` L${points[points.length-1].x},${midY} Z`;

      svg += `<path d="${whiteFill}" fill="rgba(255,255,255,0.15)"/>`;
      svg += `<path d="${blackFill}" fill="rgba(0,0,0,0.3)"/>`;

      // Eval line
      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      svg += `<path d="${pathD}" fill="none" stroke="#81b64c" stroke-width="1.5"/>`;
    }

    // Current move indicator
    if (currentIndex >= 0 && currentIndex < points.length) {
      const cp = points[currentIndex];
      svg += `<line x1="${cp.x}" y1="${padding.top}" x2="${cp.x}" y2="${height - padding.bottom}" stroke="rgba(129,182,76,0.5)" stroke-width="1"/>`;
      svg += `<circle cx="${cp.x}" cy="${cp.y}" r="3" fill="#81b64c" stroke="#fff" stroke-width="1"/>`;
    }

    // Clickable regions (invisible rects for each move)
    const moveWidth = graphW / (analysisResults.length || 1);
    for (let i = 0; i < analysisResults.length; i++) {
      const x = padding.left + i * moveWidth;
      svg += `<rect x="${x}" y="0" width="${moveWidth}" height="${height}" fill="transparent" data-move="${i}" class="eval-graph-click" style="cursor:pointer"/>`;
    }

    svg += '</svg>';
    this.container.innerHTML = svg;

    // Add click handlers
    this.container.querySelectorAll('.eval-graph-click').forEach(rect => {
      rect.addEventListener('click', () => {
        const idx = parseInt(rect.dataset.move);
        if (this.onMoveClick) this.onMoveClick(idx);
      });
    });
  }

  clear() {
    if (this.container) this.container.innerHTML = '';
  }
}
