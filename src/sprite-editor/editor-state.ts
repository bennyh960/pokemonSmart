import type { SpriteEntry, SpriteEditorEvent } from './types.js';

export class SpriteEditorState {
  // All defined sprites (flat for editing, grouped on export)
  sprites: SpriteEntry[] = [];

  // Selection on spritesheet (grid coords, based on current gridSize)
  selStartCol = -1;
  selStartRow = -1;
  selEndCol = -1;
  selEndRow = -1;
  isDragging = false;

  // Currently selected sprite index in the list (-1 = none)
  selectedIndex = -1;

  // Viewport
  zoom = 2;
  scrollX = 0;
  scrollY = 0;
  showGrid = true;
  cursorCol = -1;
  cursorRow = -1;

  // Grid cell size (user-configurable, default 32)
  gridSize = 32;

  // Image
  imageSrc = '';
  imageWidth = 0;
  imageHeight = 0;

  // Event bus
  private listeners = new Map<SpriteEditorEvent, Set<() => void>>();

  on(event: SpriteEditorEvent, cb: () => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event: SpriteEditorEvent): void {
    this.listeners.get(event)?.forEach(cb => cb());
  }

  // ── Selection ──

  setSelection(sc: number, sr: number, ec: number, er: number): void {
    this.selStartCol = Math.min(sc, ec);
    this.selStartRow = Math.min(sr, er);
    this.selEndCol = Math.max(sc, ec);
    this.selEndRow = Math.max(sr, er);
    this.emit('selection-changed');
  }

  clearSelection(): void {
    this.selStartCol = this.selStartRow = this.selEndCol = this.selEndRow = -1;
    this.emit('selection-changed');
  }

  get selectionValid(): boolean {
    return this.selStartCol >= 0 && this.selStartRow >= 0;
  }

  get selPixelX(): number { return this.selStartCol * this.gridSize; }
  get selPixelY(): number { return this.selStartRow * this.gridSize; }
  get selCols(): number { return this.selEndCol - this.selStartCol + 1; }
  get selRows(): number { return this.selEndRow - this.selStartRow + 1; }
  get selPixelW(): number { return this.selCols * this.gridSize; }
  get selPixelH(): number { return this.selRows * this.gridSize; }

  // ── Item management ──

  selectItem(index: number): void {
    this.selectedIndex = index;
    if (index >= 0 && index < this.sprites.length) {
      const s = this.sprites[index];
      // Compute bounding box from frames
      if (s.frames.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const f of s.frames) {
          minX = Math.min(minX, f.sx);
          minY = Math.min(minY, f.sy);
          maxX = Math.max(maxX, f.sx + s.frameWidth);
          maxY = Math.max(maxY, f.sy + s.frameHeight);
        }
        const startCol = Math.floor(minX / this.gridSize);
        const startRow = Math.floor(minY / this.gridSize);
        const endCol = Math.ceil(maxX / this.gridSize) - 1;
        const endRow = Math.ceil(maxY / this.gridSize) - 1;
        this.setSelection(startCol, startRow, endCol, endRow);

        const centerX = ((minX + maxX) / 2) * this.zoom;
        const centerY = ((minY + maxY) / 2) * this.zoom;
        const viewW = 800;
        const viewH = 600;
        if (centerX < this.scrollX || centerX > this.scrollX + viewW) {
          this.scrollX = Math.max(0, centerX - viewW / 2);
        }
        if (centerY < this.scrollY || centerY > this.scrollY + viewH) {
          this.scrollY = Math.max(0, centerY - viewH / 2);
        }
        this.emit('viewport-changed');
      }
    }
    this.emit('item-selected');
  }

  addSprite(entry: SpriteEntry): void {
    this.sprites.push(entry);
    this.selectedIndex = this.sprites.length - 1;
    this.emit('items-changed');
    this.emit('item-selected');
  }

  updateSprite(index: number, partial: Partial<SpriteEntry>): void {
    if (index < 0 || index >= this.sprites.length) return;
    Object.assign(this.sprites[index], partial);
    this.emit('items-changed');
  }

  removeSprite(index: number): void {
    if (index < 0 || index >= this.sprites.length) return;
    this.sprites.splice(index, 1);
    if (this.selectedIndex >= this.sprites.length) this.selectedIndex = this.sprites.length - 1;
    this.emit('items-changed');
    this.emit('item-selected');
  }

  /** Find a sprite whose bounding box contains the given pixel coords. */
  findSpriteAt(px: number, py: number): number {
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      for (const f of s.frames) {
        if (px >= f.sx && px < f.sx + s.frameWidth && py >= f.sy && py < f.sy + s.frameHeight) {
          return i;
        }
      }
    }
    return -1;
  }
}
