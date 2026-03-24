import type { SpriteEditorState } from './editor-state.js';

type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null;

const HANDLE_SIZE = 6;

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

  // Pixel-level drag for crop selection
  private cropSelDragging = false;
  private cropSelStartIX = 0;
  private cropSelStartIY = 0;

  // Crop locked drag state
  private cropDragging = false;
  private cropHandle: CropHandle = null;
  private cropDragStartMouseX = 0;
  private cropDragStartMouseY = 0;
  private cropDragStartTargetX = 0;
  private cropDragStartTargetY = 0;
  private cropDragStartTargetW = 0;
  private cropDragStartTargetH = 0;

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

    for (const evt of ['selection-changed', 'items-changed', 'viewport-changed', 'item-selected', 'crop-mode-changed', 'crop-target-changed'] as const) {
      state.on(evt, () => { this.dirty = true; });
    }

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => { this.mouseDown = false; this.panning = false; this.cropDragging = false; this.cropSelDragging = false; });
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

  private screenToImage(sx: number, sy: number): { ix: number; iy: number } {
    return {
      ix: (sx + this.state.scrollX) / this.state.zoom,
      iy: (sy + this.state.scrollY) / this.state.zoom,
    };
  }

  private imageToScreen(ix: number, iy: number): { sx: number; sy: number } {
    return {
      sx: ix * this.state.zoom - this.state.scrollX,
      sy: iy * this.state.zoom - this.state.scrollY,
    };
  }

  private hitTestCrop(screenX: number, screenY: number): CropHandle {
    const s = this.state;
    if (!s.cropMode || !s.cropLocked) return null;

    const { sx: rx, sy: ry } = this.imageToScreen(s.cropTargetX, s.cropTargetY);
    const rw = s.cropTargetW * s.zoom;
    const rh = s.cropTargetH * s.zoom;
    const h = HANDLE_SIZE;

    if (Math.abs(screenX - rx) <= h && Math.abs(screenY - ry) <= h) return 'nw';
    if (Math.abs(screenX - (rx + rw)) <= h && Math.abs(screenY - ry) <= h) return 'ne';
    if (Math.abs(screenX - rx) <= h && Math.abs(screenY - (ry + rh)) <= h) return 'sw';
    if (Math.abs(screenX - (rx + rw)) <= h && Math.abs(screenY - (ry + rh)) <= h) return 'se';

    if (screenX >= rx - h && screenX <= rx + rw + h) {
      if (Math.abs(screenY - ry) <= h) return 'n';
      if (Math.abs(screenY - (ry + rh)) <= h) return 's';
    }
    if (screenY >= ry - h && screenY <= ry + rh + h) {
      if (Math.abs(screenX - rx) <= h) return 'w';
      if (Math.abs(screenX - (rx + rw)) <= h) return 'e';
    }

    if (screenX >= rx && screenX <= rx + rw && screenY >= ry && screenY <= ry + rh) return 'move';
    return null;
  }

  private getCursorForHandle(handle: CropHandle): string {
    switch (handle) {
      case 'nw': case 'se': return 'nwse-resize';
      case 'ne': case 'sw': return 'nesw-resize';
      case 'n': case 's': return 'ns-resize';
      case 'e': case 'w': return 'ew-resize';
      case 'move': return 'move';
      default: return 'crosshair';
    }
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
      // Crop locked: drag/resize overlay
      if (this.state.cropMode && this.state.cropLocked) {
        const handle = this.hitTestCrop(px, py);
        if (handle) {
          this.cropDragging = true;
          this.cropHandle = handle;
          this.cropDragStartMouseX = px;
          this.cropDragStartMouseY = py;
          this.cropDragStartTargetX = this.state.cropTargetX;
          this.cropDragStartTargetY = this.state.cropTargetY;
          this.cropDragStartTargetW = this.state.cropTargetW;
          this.cropDragStartTargetH = this.state.cropTargetH;
          return;
        }
        return;
      }

      // Crop mode (not locked): pixel-level selection
      if (this.state.cropMode) {
        const { ix, iy } = this.screenToImage(px, py);
        this.cropSelDragging = true;
        this.cropSelStartIX = Math.round(ix);
        this.cropSelStartIY = Math.round(iy);
        this.state.setCropSel(this.cropSelStartIX, this.cropSelStartIY, this.cropSelStartIX, this.cropSelStartIY);
        return;
      }

      // Normal: grid-based selection
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

    // Crop locked drag
    if (this.cropDragging && this.cropHandle) {
      const dx = (px - this.cropDragStartMouseX) / this.state.zoom;
      const dy = (py - this.cropDragStartMouseY) / this.state.zoom;
      const s = this.state;

      if (this.cropHandle === 'move') {
        s.cropTargetX = Math.max(0, Math.round(this.cropDragStartTargetX + dx));
        s.cropTargetY = Math.max(0, Math.round(this.cropDragStartTargetY + dy));
      } else {
        let nx = this.cropDragStartTargetX;
        let ny = this.cropDragStartTargetY;
        let nw = this.cropDragStartTargetW;
        let nh = this.cropDragStartTargetH;

        if (this.cropHandle.includes('w')) {
          nw = Math.max(1, Math.round(this.cropDragStartTargetW - dx));
          nx = Math.max(0, Math.round(this.cropDragStartTargetX + dx));
        }
        if (this.cropHandle.includes('e')) {
          nw = Math.max(1, Math.round(this.cropDragStartTargetW + dx));
        }
        if (this.cropHandle.includes('n')) {
          nh = Math.max(1, Math.round(this.cropDragStartTargetH - dy));
          ny = Math.max(0, Math.round(this.cropDragStartTargetY + dy));
        }
        if (this.cropHandle.includes('s')) {
          nh = Math.max(1, Math.round(this.cropDragStartTargetH + dy));
        }

        s.cropTargetX = nx;
        s.cropTargetY = ny;
        s.cropTargetW = nw;
        s.cropTargetH = nh;
      }

      s.emit('crop-target-changed');
      this.dirty = true;
      return;
    }

    // Pixel-level crop selection drag
    if (this.cropSelDragging) {
      const { ix, iy } = this.screenToImage(px, py);
      this.state.setCropSel(this.cropSelStartIX, this.cropSelStartIY, Math.round(ix), Math.round(iy));
      this.dirty = true;
      return;
    }

    // Crop locked: update cursor
    if (this.state.cropMode && this.state.cropLocked) {
      const handle = this.hitTestCrop(px, py);
      this.canvas.style.cursor = this.getCursorForHandle(handle);
      const { col, row } = this.pixelToGrid(px, py);
      this.state.cursorCol = col;
      this.state.cursorRow = row;
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
    this.cropSelDragging = false;
    this.cropDragging = false;
    this.cropHandle = null;
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

    // Highlight defined sprites
    for (let i = 0; i < this.state.sprites.length; i++) {
      const s = this.state.sprites[i];
      const isSelected = i === this.state.selectedIndex;
      const catColor = { fill: 'rgba(100, 180, 255, 0.12)', stroke: '#6699ff' };

      for (const f of s.frames) {
        if (f.sx < 0 || f.sy < 0) continue;
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

    // Crop locked overlay
    if (this.state.cropMode && this.state.cropLocked) {
      this.renderCropOverlay(ctx, zoom, scrollX, scrollY);
    }
    // Crop pixel-level selection (not locked)
    else if (this.state.cropMode && this.state.cropSelValid) {
      const csx = this.state.cropSelX * zoom - scrollX;
      const csy = this.state.cropSelY * zoom - scrollY;
      const csw = this.state.cropSelW * zoom;
      const csh = this.state.cropSelH * zoom;
      ctx.fillStyle = 'rgba(255, 165, 0, 0.15)';
      ctx.fillRect(csx, csy, csw, csh);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(csx, csy, csw, csh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,165,0,0.9)';
      ctx.font = '11px Inter';
      ctx.fillText(`${this.state.cropSelW}×${this.state.cropSelH}px`, csx + 2, csy - 4);
    }
    // Normal grid-based selection
    else if (this.state.selectionValid) {
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

    // Cursor highlight (hide in crop mode)
    if (!this.state.cropMode && this.state.cursorCol >= 0 && this.state.cursorRow >= 0) {
      const cx = this.state.cursorCol * cell - scrollX;
      const cy = this.state.cursorRow * cell - scrollY;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cy, cell, cell);
    }
  }

  private renderCropOverlay(ctx: CanvasRenderingContext2D, zoom: number, scrollX: number, scrollY: number): void {
    const s = this.state;

    // Dim source region
    const srcX = s.cropSrcX * zoom - scrollX;
    const srcY = s.cropSrcY * zoom - scrollY;
    const srcW = s.cropSrcW * zoom;
    const srcH = s.cropSrcH * zoom;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.fillRect(srcX, srcY, srcW, srcH);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(srcX, srcY, srcW, srcH);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 80, 80, 0.8)';
    ctx.font = '10px Inter';
    ctx.fillText('source (will be cleared)', srcX + 2, srcY - 4);

    // Draw target rect with sprite content
    const tx = s.cropTargetX * zoom - scrollX;
    const ty = s.cropTargetY * zoom - scrollY;
    const tw = s.cropTargetW * zoom;
    const th = s.cropTargetH * zoom;

    const checkSize = Math.max(4, 8 * zoom / 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx, ty, tw, th);
    ctx.clip();
    for (let cy2 = ty; cy2 < ty + th; cy2 += checkSize) {
      for (let cx2 = tx; cx2 < tx + tw; cx2 += checkSize) {
        const idx = Math.floor((cx2 - tx) / checkSize) + Math.floor((cy2 - ty) / checkSize);
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(40,40,60,0.8)' : 'rgba(60,60,80,0.8)';
        ctx.fillRect(cx2, cy2, checkSize, checkSize);
      }
    }
    ctx.drawImage(this.image, s.cropSrcX, s.cropSrcY, s.cropSrcW, s.cropSrcH, tx, ty, tw, th);
    ctx.restore();

    // Orange border
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tw, th);

    // Resize handles
    const hs = HANDLE_SIZE;
    ctx.fillStyle = '#ff8800';
    const handles = [
      [tx, ty], [tx + tw / 2 - hs / 2, ty], [tx + tw, ty],
      [tx + tw, ty + th / 2 - hs / 2],
      [tx + tw, ty + th], [tx + tw / 2 - hs / 2, ty + th], [tx, ty + th],
      [tx, ty + th / 2 - hs / 2],
    ];
    for (const [hx, hy] of handles) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    }

    // Size label
    ctx.fillStyle = 'rgba(255, 136, 0, 0.9)';
    ctx.font = '11px Inter';
    ctx.fillText(`${s.cropTargetW}×${s.cropTargetH}px → (${s.cropTargetX}, ${s.cropTargetY})`, tx + 2, ty - 4);
  }

  destroy(): void { cancelAnimationFrame(this.rafId); }
}
