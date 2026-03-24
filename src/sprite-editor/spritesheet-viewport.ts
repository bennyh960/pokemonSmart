import type { SpriteEditorState } from './editor-state.js';

/** Canvas that renders the spritesheet with grid, selection, and defined sprite highlights. */
export class SpritesheetViewport {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: SpriteEditorState;
  private image: HTMLImageElement;
  private dirty = true;
  private rafId = 0;

  private mouseDown = false;
  private panning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panScrollX = 0;
  private panScrollY = 0;
  private dragStartCol = -1;
  private dragStartRow = -1;

  constructor(container: HTMLElement, state: SpriteEditorState, image: HTMLImageElement) {
    this.state = state;
    this.image = image;

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'crosshair';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    for (const evt of ['selection-changed', 'items-changed', 'viewport-changed', 'item-selected'] as const) {
      state.on(evt, () => { this.dirty = true; });
    }

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => { this.mouseDown = false; this.panning = false; });
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.renderLoop();
  }

  private resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.dirty = true;
  }

  private pixelToGrid(px: number, py: number): { col: number; row: number } {
    const cell = this.state.gridSize * this.state.zoom;
    return {
      col: Math.floor((px + this.state.scrollX) / cell),
      row: Math.floor((py + this.state.scrollY) / cell),
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (e.button === 1) {
      this.panning = true;
      this.panStartX = e.clientX; this.panStartY = e.clientY;
      this.panScrollX = this.state.scrollX; this.panScrollY = this.state.scrollY;
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      this.mouseDown = true;
      const { col, row } = this.pixelToGrid(px, py);
      this.dragStartCol = col;
      this.dragStartRow = row;
      this.state.setSelection(col, row, col, row);
      this.state.selectedIndex = -1;
      this.state.emit('item-selected');
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (this.panning) {
      this.state.scrollX = this.panScrollX - (e.clientX - this.panStartX);
      this.state.scrollY = this.panScrollY - (e.clientY - this.panStartY);
      this.dirty = true;
      return;
    }

    const { col, row } = this.pixelToGrid(px, py);
    this.state.cursorCol = col;
    this.state.cursorRow = row;
    this.dirty = true;

    if (this.mouseDown) {
      this.state.setSelection(this.dragStartCol, this.dragStartRow, col, row);
    }
  }

  private onMouseUp(): void {
    this.mouseDown = false;
    if (this.panning) {
      this.panning = false;
      this.canvas.style.cursor = 'crosshair';
    }
  }

  private onWheel(e: WheelEvent): void {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      this.state.zoom = Math.max(0.5, Math.min(8, this.state.zoom + delta));
      this.state.emit('viewport-changed');
    } else {
      this.state.scrollX += e.deltaX;
      this.state.scrollY += e.deltaY;
      this.dirty = true;
    }
  }

  private renderLoop(): void {
    this.rafId = requestAnimationFrame(() => this.renderLoop());
    if (!this.dirty) return;
    this.dirty = false;
    this.render();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const zoom = this.state.zoom;
    const gs = this.state.gridSize;
    const cell = gs * zoom;
    const { scrollX, scrollY } = this.state;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // Draw spritesheet image
    ctx.drawImage(this.image, -scrollX, -scrollY, this.image.naturalWidth * zoom, this.image.naturalHeight * zoom);

    // Highlight defined sprites — draw each frame individually
    for (let i = 0; i < this.state.sprites.length; i++) {
      const s = this.state.sprites[i];
      const isSelected = i === this.state.selectedIndex;
      const catColor = { fill: 'rgba(100, 180, 255, 0.12)', stroke: '#6699ff' };

      for (const f of s.frames) {
        if (f.sx < 0 || f.sy < 0) continue; // skip null frames
        const x = f.sx * zoom - scrollX;
        const y = f.sy * zoom - scrollY;
        const fw = s.frameWidth * zoom;
        const fh = s.frameHeight * zoom;

        ctx.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.2)' : catColor.fill;
        ctx.fillRect(x, y, fw, fh);

        ctx.strokeStyle = isSelected ? '#ffcc00' : catColor.stroke;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(x, y, fw, fh);
      }

      // Label on first frame
      if (zoom >= 1.5 && s.frames.length > 0) {
        const f0 = s.frames[0];
        const lx = f0.sx * zoom - scrollX;
        const ly = f0.sy * zoom - scrollY;
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(8, 10 * zoom / 2)}px Inter`;
        ctx.fillText(s.id, lx + 2, ly - 4 > 0 ? ly - 4 : ly + Math.max(10, 12 * zoom / 2));
      }
    }

    // Grid overlay
    if (this.state.showGrid) {
      const imgCols = Math.ceil(this.image.naturalWidth / gs);
      const imgRows = Math.ceil(this.image.naturalHeight / gs);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      const startC = Math.max(0, Math.floor(scrollX / cell));
      const startR = Math.max(0, Math.floor(scrollY / cell));
      const endC = Math.min(imgCols, Math.ceil((scrollX + w) / cell));
      const endR = Math.min(imgRows, Math.ceil((scrollY + h) / cell));
      for (let c = startC; c <= endC; c++) {
        const lx = c * cell - scrollX + 0.5;
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, h); ctx.stroke();
      }
      for (let r = startR; r <= endR; r++) {
        const ly = r * cell - scrollY + 0.5;
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
      }
    }

    // Current selection highlight (yellow dashed)
    if (this.state.selectionValid) {
      const sx = this.state.selStartCol * cell - scrollX;
      const sy = this.state.selStartRow * cell - scrollY;
      const sw = this.state.selCols * cell;
      const sh = this.state.selRows * cell;
      ctx.fillStyle = 'rgba(255, 255, 0, 0.12)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,0,0.9)';
      ctx.font = '11px Inter';
      ctx.fillText(`${this.state.selPixelW}×${this.state.selPixelH}px`, sx + 2, sy - 4);
    }

    // Cursor highlight
    if (this.state.cursorCol >= 0 && this.state.cursorRow >= 0) {
      const cx = this.state.cursorCol * cell - scrollX;
      const cy = this.state.cursorRow * cell - scrollY;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cell, cell);
    }
  }

  destroy(): void { cancelAnimationFrame(this.rafId); }
}
