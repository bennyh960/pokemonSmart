/**
 * RegionMapOverlay — world-map view for the map editor.
 *
 * Shows only cities, towns, and key areas as nodes.
 * Routes are drawn as labeled edges (lines) between nodes — NOT as nodes themselves.
 * The graph is intentionally non-linear: multiple paths between locations.
 *
 * Click any node → loads that map in the editor.
 */

// ── Layout ────────────────────────────────────────────────────────────────────

const CELL = 145;   // grid cell size in canvas pixels
const PAD  = 40;    // canvas padding

type NodeType = 'start' | 'city' | 'side' | 'cave' | 'endgame';

interface WorldNode {
  id: string;          // map ID to load on click
  label: string;       // display name
  gymNum?: number;     // 1-8 for gym cities
  col: number;
  row: number;
  type: NodeType;
}

interface WorldEdge {
  from: string;
  to: string;
  label: string;       // route name shown on line
  kind: 'main' | 'extra' | 'side';
}

/**
 * All location nodes (cities + side areas).
 * Buildings are intentionally excluded — they appear in Related Maps instead.
 *
 * Layout (col × row):
 *   - Zeroville starts west (col 0)
 *   - Main path snakes north-east then south
 *   - Cross-connections create loops/shortcuts
 */
const NODES: WorldNode[] = [
  // ── Starting town ──
  { id: 'zeroville',        label: 'Zeroville',         col: 0, row: 3, type: 'start' },

  // ── Gym cities ──
  { id: 'sumville',         label: 'Sumville',     gymNum: 1, col: 1, row: 1, type: 'city' },
  { id: 'minusburg',        label: 'Minusburg',    gymNum: 2, col: 3, row: 0, type: 'city' },
  { id: 'multiplia',        label: 'Multiplia',    gymNum: 3, col: 4, row: 2, type: 'city' },
  { id: 'dividia',          label: 'Dividia',      gymNum: 4, col: 1, row: 4, type: 'city' },
  { id: 'primore',          label: 'Primore',      gymNum: 5, col: 3, row: 3, type: 'city' },
  { id: 'symmetrika',       label: 'Symmetrika',   gymNum: 6, col: 5, row: 1, type: 'city' },
  { id: 'integrala',        label: 'Integrala',    gymNum: 7, col: 3, row: 5, type: 'city' },
  { id: 'absoluta',         label: 'Absoluta',     gymNum: 8, col: 5, row: 4, type: 'city' },

  // ── Final destination ──
  { id: 'nullx-tower',      label: 'NULL-X Tower',       col: 4, row: 6, type: 'endgame' },

  // ── Side / optional areas ──
  { id: 'deep-forest',      label: 'Deep Forest',        col: 0, row: 1, type: 'side' },
  { id: 'safari',           label: 'Safari Zone',        col: 5, row: 3, type: 'side' },
  { id: 'mountain-pass',    label: 'Mountain Pass',      col: 0, row: 5, type: 'cave' },
  { id: 'infinity-plateau', label: 'Infinity Plateau',   col: 6, row: 2, type: 'side' },
];

/**
 * Edges — routes and connections between nodes.
 *
 * kind:
 *   'main'  — main story progression (solid, bright)
 *   'extra' — optional cross-connections (solid, dimmer)
 *   'side'  — dead-end optional areas (dashed)
 */
const EDGES: WorldEdge[] = [
  // ── Main story path ──────────────────────────────────────────────────────
  { from: 'zeroville',   to: 'sumville',      label: 'Route 1',  kind: 'main' },
  { from: 'sumville',    to: 'minusburg',     label: 'Route 2',  kind: 'main' },
  { from: 'minusburg',   to: 'multiplia',     label: 'Route 3',  kind: 'main' },
  { from: 'multiplia',   to: 'dividia',       label: 'Route 4',  kind: 'main' },
  { from: 'dividia',     to: 'primore',       label: 'Route 5',  kind: 'main' },
  { from: 'primore',     to: 'symmetrika',    label: 'Route 6',  kind: 'main' },
  { from: 'symmetrika',  to: 'integrala',     label: 'Route 7',  kind: 'main' },
  { from: 'integrala',   to: 'absoluta',      label: 'Route 8',  kind: 'main' },
  { from: 'absoluta',    to: 'nullx-tower',   label: '',         kind: 'main' },

  // ── Non-linear cross-connections (make the world non-linear) ─────────────
  // Route 9: big western loop — shortcut from start to Dividia (gym 4 area)
  { from: 'zeroville',   to: 'dividia',       label: 'Route 9',  kind: 'extra' },
  // Route 10: southern return — Absoluta → Multiplia backtrack path
  { from: 'absoluta',    to: 'multiplia',     label: 'Route 10', kind: 'extra' },
  // Route 11: forest shortcut — Sumville → Primore (skips gyms 2-4 area, high-level)
  { from: 'sumville',    to: 'primore',       label: 'Route 11', kind: 'extra' },
  // Route 12: eastern coast — Minusburg → Symmetrika (skips to gym 6 early)
  { from: 'minusburg',   to: 'symmetrika',    label: 'Route 12', kind: 'extra' },

  // ── Optional / side area access ───────────────────────────────────────────
  { from: 'zeroville',   to: 'deep-forest',   label: '',         kind: 'side' },
  { from: 'multiplia',   to: 'safari',        label: '',         kind: 'side' },
  { from: 'dividia',     to: 'mountain-pass', label: '',         kind: 'side' },
  { from: 'symmetrika',  to: 'infinity-plateau', label: '',      kind: 'side' },
];

// ── Styling ───────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, { fill: string; stroke: string; text: string }> = {
  start:   { fill: '#2d5a27', stroke: '#5a9e50', text: '#d0f0c0' },
  city:    { fill: '#1a3a5c', stroke: '#4a8ac8', text: '#c8e0f8' },
  side:    { fill: '#3a3020', stroke: '#8a6a30', text: '#d8c080' },
  cave:    { fill: '#2a2030', stroke: '#6a5080', text: '#b8a0d0' },
  endgame: { fill: '#4a0808', stroke: '#c83030', text: '#ffd0d0' },
};

const EDGE_COLORS: Record<WorldEdge['kind'], { stroke: string; dash: number[] }> = {
  main:  { stroke: '#4a8ac8', dash: [] },
  extra: { stroke: '#7a6a30', dash: [] },
  side:  { stroke: '#4a4a4a', dash: [6, 5] },
};

const NODE_W = 96;
const NODE_H = 32;

// ── RegionMapOverlay class ────────────────────────────────────────────────────

export class RegionMapOverlay {
  private overlay: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onNavigate: (mapId: string) => void;
  private visible = false;

  private nodeMap = new Map<string, WorldNode>();
  private minCol: number;
  private minRow: number;

  constructor(parentEl: HTMLElement, onNavigate: (mapId: string) => void) {
    this.onNavigate = onNavigate;

    // Build node lookup
    for (const n of NODES) this.nodeMap.set(n.id, n);

    const cols = NODES.map(n => n.col);
    const rows = NODES.map(n => n.row);
    this.minCol = Math.min(...cols);
    this.minRow = Math.min(...rows);
    const maxCol = Math.max(...cols);
    const maxRow = Math.max(...rows);

    const canvasW = PAD * 2 + (maxCol - this.minCol + 1) * CELL;
    const canvasH = PAD * 2 + (maxRow - this.minRow + 1) * CELL;

    // ── DOM ────────────────────────────────────────────────────────────────
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      display:none; position:fixed; top:0; left:0; right:0; bottom:0;
      background:rgba(0,0,0,0.80); z-index:1000;
      display:none; align-items:center; justify-content:center;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#0d1117; border:2px solid #2a4a6a; border-radius:10px;
      padding:16px; max-width:95vw; max-height:92vh; overflow:auto;
      box-shadow:0 8px 32px rgba(0,0,0,0.6);
    `;

    // Header row
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; gap:16px; margin-bottom:10px; flex-wrap:wrap;';

    const title = document.createElement('h2');
    title.textContent = 'Numeria — World Map';
    title.style.cssText = 'margin:0; color:#c8dff0; font:bold 15px monospace; flex:1;';

    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex; gap:14px; font:11px monospace; align-items:center; flex-wrap:wrap;';
    legend.innerHTML = `
      <span style="color:#5a9e50">⬤ Start</span>
      <span style="color:#4a8ac8">⬤ City (Gym)</span>
      <span style="color:#8a6a30">⬤ Side area</span>
      <span style="color:#c83030">⬤ NULL-X</span>
      <span style="border-bottom:2px solid #4a8ac8;padding-bottom:1px">── Main path</span>
      <span style="border-bottom:2px solid #7a6a30;padding-bottom:1px">── Shortcut</span>
      <span style="border-bottom:2px dashed #4a4a4a;padding-bottom:1px">- - Side access</span>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `background:#2a2a3a;border:1px solid #4a4a5a;color:#c8c8d8;
      padding:4px 10px;border-radius:4px;cursor:pointer;font-size:13px;`;
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(legend);
    header.appendChild(closeBtn);

    const hint = document.createElement('div');
    hint.textContent = 'Click any location to open it in the editor';
    hint.style.cssText = 'color:#5a7a9a;font:11px monospace;margin-bottom:8px;';

    this.canvas = document.createElement('canvas');
    this.canvas.width = canvasW;
    this.canvas.height = canvasH;
    this.canvas.style.cssText = 'cursor:default;display:block;';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas 2d context');
    this.ctx = ctx;

    panel.appendChild(header);
    panel.appendChild(hint);
    panel.appendChild(this.canvas);
    this.overlay.appendChild(panel);
    parentEl.appendChild(this.overlay);

    // Close on backdrop click
    this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.hide(); });

    // Click → navigate
    this.canvas.addEventListener('click', e => {
      const hit = this.hitTest(e);
      if (hit) { this.hide(); this.onNavigate(hit); }
    });

    // Hover tooltip
    this.canvas.addEventListener('mousemove', e => {
      const hit = this.hitTest(e);
      this.canvas.style.cursor = hit ? 'pointer' : 'default';
      this.canvas.title = hit ? `Open map: ${hit}` : '';
    });
  }

  show(currentMapId?: string): void {
    this.overlay.style.display = 'flex';
    this.visible = true;
    this.draw(currentMapId);
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.visible = false;
  }

  toggle(currentMapId?: string): void {
    if (this.visible) this.hide(); else this.show(currentMapId);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private nodeCenter(n: WorldNode): { x: number; y: number } {
    return {
      x: PAD + (n.col - this.minCol) * CELL + CELL / 2,
      y: PAD + (n.row - this.minRow) * CELL + CELL / 2,
    };
  }

  private hitTest(e: MouseEvent): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const n of NODES) {
      const c = this.nodeCenter(n);
      const hw = NODE_W / 2, hh = NODE_H / 2;
      if (mx >= c.x - hw && mx <= c.x + hw && my >= c.y - hh && my <= c.y + hh) return n.id;
    }
    return null;
  }

  private draw(currentMapId?: string): void {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid dots
    ctx.fillStyle = '#181e28';
    for (let c = 0; c * CELL < W; c++) {
      for (let r = 0; r * CELL < H; r++) {
        ctx.fillRect(PAD + c * CELL - 1, PAD + r * CELL - 1, 2, 2);
      }
    }

    // ── Draw edges first (under nodes) ──
    for (const edge of EDGES) {
      const from = this.nodeMap.get(edge.from);
      const to   = this.nodeMap.get(edge.to);
      if (!from || !to) continue;

      const fc = this.nodeCenter(from);
      const tc = this.nodeCenter(to);
      const style = EDGE_COLORS[edge.kind];

      ctx.save();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = edge.kind === 'main' ? 2.5 : 1.5;
      ctx.setLineDash(style.dash);
      ctx.globalAlpha = edge.kind === 'side' ? 0.6 : 0.85;

      ctx.beginPath();
      ctx.moveTo(fc.x, fc.y);
      ctx.lineTo(tc.x, tc.y);
      ctx.stroke();
      ctx.restore();

      // Route label (midpoint)
      if (edge.label) {
        const mx = (fc.x + tc.x) / 2;
        const my = (fc.y + tc.y) / 2;
        // Small pill background for readability
        ctx.save();
        ctx.font = '9px monospace';
        const tw = ctx.measureText(edge.label).width;
        ctx.fillStyle = 'rgba(13,17,23,0.85)';
        ctx.fillRect(mx - tw / 2 - 3, my - 7, tw + 6, 13);
        ctx.fillStyle = style.stroke;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.label, mx, my);
        ctx.restore();
      }
    }

    // ── Draw nodes on top ──
    for (const n of NODES) {
      const c = this.nodeCenter(n);
      const isCurrent = n.id === currentMapId;
      const colors = NODE_COLORS[n.type];

      const hw = NODE_W / 2;
      const hh = NODE_H / 2;

      ctx.save();

      // Highlight glow for current map
      if (isCurrent) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
      }

      // Background fill
      ctx.fillStyle = isCurrent ? '#c8a020' : colors.fill;
      this.roundRect(ctx, c.x - hw, c.y - hh, NODE_W, NODE_H, 6);
      ctx.fill();

      // Border
      ctx.strokeStyle = isCurrent ? '#ffe060' : colors.stroke;
      ctx.lineWidth = isCurrent ? 2.5 : 1.5;
      ctx.stroke();

      ctx.restore();

      // Gym badge number (small circle top-right)
      if (n.gymNum) {
        const bx = c.x + hw - 9;
        const by = c.y - hh + 9;
        ctx.fillStyle = '#0a1a2a';
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(n.gymNum), bx, by);
      }

      // Node label
      const textColor = isCurrent ? '#1a1000' : colors.text;
      ctx.fillStyle = textColor;
      const fontSize = n.label.length > 12 ? 9 : 10;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(n.label, c.x, c.y);
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
