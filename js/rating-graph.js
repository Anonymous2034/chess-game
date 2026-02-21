// SVG rating history graph for player profile

export class RatingGraph {
  constructor(containerEl) {
    this.container = containerEl;
  }

  /**
   * Render rating history line chart
   * @param {{ date: string|null, rating: number }[]} history
   */
  render(history) {
    if (!this.container || !history || history.length < 3) {
      if (this.container) {
        this.container.innerHTML = '<div class="rating-graph-empty">Play more games to see your rating history</div>';
      }
      return;
    }

    const width = this.container.clientWidth || 520;
    const height = 160;
    const pad = { left: 40, right: 12, top: 16, bottom: 28 };
    const graphW = width - pad.left - pad.right;
    const graphH = height - pad.top - pad.bottom;

    // Compute Y range
    const ratings = history.map(h => h.rating);
    let minR = Math.min(...ratings);
    let maxR = Math.max(...ratings);
    // Ensure at least 100-point range for visual clarity
    if (maxR - minR < 100) {
      const mid = (minR + maxR) / 2;
      minR = mid - 50;
      maxR = mid + 50;
    }
    // Round to nice numbers
    minR = Math.floor(minR / 50) * 50;
    maxR = Math.ceil(maxR / 50) * 50;

    const xScale = (i) => pad.left + (i / (history.length - 1)) * graphW;
    const yScale = (r) => pad.top + graphH - ((r - minR) / (maxR - minR)) * graphH;

    // Points
    const points = history.map((h, i) => ({ x: xScale(i), y: yScale(h.rating), rating: h.rating, date: h.date }));

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="rating-graph-svg">`;

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#1a1816" rx="6"/>`;

    // Horizontal grid lines + Y labels
    const steps = 4;
    const stepVal = (maxR - minR) / steps;
    for (let i = 0; i <= steps; i++) {
      const val = minR + stepVal * i;
      const y = yScale(val);
      svg += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#333" stroke-width="0.5"/>`;
      svg += `<text x="${pad.left - 6}" y="${y + 4}" fill="#777" font-size="10" text-anchor="end">${Math.round(val)}</text>`;
    }

    // Fill area under curve
    if (points.length > 1) {
      const baseY = yScale(minR);
      let fillD = `M${points[0].x},${baseY}`;
      for (const p of points) fillD += ` L${p.x},${p.y}`;
      fillD += ` L${points[points.length - 1].x},${baseY} Z`;
      svg += `<path d="${fillD}" fill="rgba(129,182,76,0.15)"/>`;

      // Line
      const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      svg += `<path d="${lineD}" fill="none" stroke="#81b64c" stroke-width="2" stroke-linejoin="round"/>`;
    }

    // Current rating dot at end
    const last = points[points.length - 1];
    svg += `<circle cx="${last.x}" cy="${last.y}" r="4" fill="#81b64c" stroke="#fff" stroke-width="1.5"/>`;
    svg += `<text x="${last.x - 6}" y="${last.y - 10}" fill="#81b64c" font-size="11" font-weight="700">${last.rating}</text>`;

    // X-axis labels (show a few dates)
    const labelCount = Math.min(5, points.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (points.length - 1));
      const p = points[idx];
      let label;
      if (p.date) {
        const d = new Date(p.date);
        label = `${d.getMonth() + 1}/${d.getDate()}`;
      } else {
        label = 'Start';
      }
      svg += `<text x="${p.x}" y="${height - 6}" fill="#777" font-size="9" text-anchor="middle">${label}</text>`;
    }

    svg += '</svg>';
    this.container.innerHTML = svg;
  }

  clear() {
    if (this.container) this.container.innerHTML = '';
  }
}
