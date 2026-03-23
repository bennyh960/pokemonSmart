import type { TilesetEditorState } from './editor-state.js';

/** Canvas that renders the tileset PNG with grid, selection, and defined tile highlights. */
export class SpritesheetViewport {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: TilesetEditorState;
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

  constructor(container: HTMLElement, state: TilesetEditorState, image: HTMLImageElement) {
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
    const cell = 16 * this.state.zoom;
    return {
      col: Math.floor((px + this.state.scrollX) / cell),
      row: Math.floor((py + this.state.scrollY) / cell),
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Middle click = pan
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
      // Deselect current item — user is making a new selection
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

    // Drag to select rectangle
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
    const cell = 16 * zoom;
    const { scrollX, scrollY } = this.state;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // Draw tileset image
    ctx.drawImage(this.image, -scrollX, -scrollY, this.image.naturalWidth * zoom, this.image.naturalHeight * zoom);

    // Highlight defined tiles
    for (let i = 0; i < this.state.tiles.length; i++) {
      const t = this.state.tiles[i];
      const x = t.sx * zoom - scrollX;
      const y = t.sy * zoom - scrollY;
      const tw = t.w * zoom;
      const th = t.h * zoom;
      const isSelected = i === this.state.selectedIndex;

      // Fill
      ctx.fillStyle = isSelected ? 'rgba(255, 200, 0, 0.2)' : (t.above ? 'rgba(100, 150, 255, 0.15)' : 'rgba(0, 200, 100, 0.12)');
      ctx.fillRect(x, y, tw, th);

      // Border
      ctx.strokeStyle = isSelected ? '#ffcc00' : (t.above ? '#6699ff' : '#33cc66');
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y, tw, th);

      // Label
      if (zoom >= 1.5) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(8, 10 * zoom / 2)}px Inter`;
        ctx.fillText(t.key, x + 2, y + Math.max(10, 12 * zoom / 2));
      }
    }

    // Grid overlay
    if (this.state.showGrid) {
      const imgCols = Math.ceil(this.image.naturalWidth / 16);
      const imgRows = Math.ceil(this.image.naturalHeight / 16);
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

      // Show selection size
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
