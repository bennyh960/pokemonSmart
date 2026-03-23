import type { TileEntry, TsEditorEvent } from './types.js';

export class TilesetEditorState {
  // All defined tiles
  tiles: TileEntry[] = [];

  // Selection on spritesheet (grid coords, 16px grid)
  selStartCol = -1;
  selStartRow = -1;
  selEndCol = -1;
  selEndRow = -1;
  isDragging = false;

  // Currently selected tile index in the list (-1 = none)
  selectedIndex = -1;

  // Viewport
  zoom = 2;
  scrollX = 0;
  scrollY = 0;
  showGrid = true;
  cursorCol = -1;
  cursorRow = -1;

  // Image
  imageSrc = '/sprites/overworld/dpp-tileset.png';
  imageWidth = 256;
  imageHeight = 29888;

  // Event bus
  private listeners = new Map<TsEditorEvent, Set<() => void>>();

  on(event: TsEditorEvent, cb: () => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  emit(event: TsEditorEvent): void {
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

  /** Selection in pixels. */
  get selPixelX(): number { return this.selStartCol * 16; }
  get selPixelY(): number { return this.selStartRow * 16; }
  get selCols(): number { return this.selEndCol - this.selStartCol + 1; }
  get selRows(): number { return this.selEndRow - this.selStartRow + 1; }
  get selPixelW(): number { return this.selCols * 16; }
  get selPixelH(): number { return this.selRows * 16; }

  // ── Item management ──

  selectItem(index: number): void {
    this.selectedIndex = index;
    // Highlight the tile's region on the spritesheet
    if (index >= 0 && index < this.tiles.length) {
      const t = this.tiles[index];
      const gridW = Math.max(1, Math.round(t.w / 16));
      const gridH = Math.max(1, Math.round(t.h / 16));
      const startCol = Math.round(t.sx / 16);
      const startRow = Math.round(t.sy / 16);
      this.setSelection(startCol, startRow, startCol + gridW - 1, startRow + gridH - 1);

      // Scroll to make the tile visible
      const centerX = (startCol + gridW / 2) * 16 * this.zoom;
      const centerY = (startRow + gridH / 2) * 16 * this.zoom;
      // Only scroll if far from current view (don't jump on every click)
      const viewW = 800; // approximate
      const viewH = 600;
      if (centerX < this.scrollX || centerX > this.scrollX + viewW) {
        this.scrollX = Math.max(0, centerX - viewW / 2);
      }
      if (centerY < this.scrollY || centerY > this.scrollY + viewH) {
        this.scrollY = Math.max(0, centerY - viewH / 2);
      }
      this.emit('viewport-changed');
    }
    this.emit('item-selected');
  }

  addTile(entry: TileEntry): void {
    this.tiles.push(entry);
    this.selectedIndex = this.tiles.length - 1;
    this.emit('items-changed');
    this.emit('item-selected');
  }

  updateTile(index: number, partial: Partial<TileEntry>): void {
    if (index < 0 || index >= this.tiles.length) return;
    Object.assign(this.tiles[index], partial);
    this.emit('items-changed');
  }

  removeTile(index: number): void {
    if (index < 0 || index >= this.tiles.length) return;
    this.tiles.splice(index, 1);
    if (this.selectedIndex >= this.tiles.length) this.selectedIndex = this.tiles.length - 1;
    this.emit('items-changed');
    this.emit('item-selected');
  }

  /** Find a tile whose region contains the given pixel coords. */
  findTileAt(px: number, py: number): number {
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (px >= t.sx && px < t.sx + t.w && py >= t.sy && py < t.sy + t.h) {
        return i;
      }
    }
    return -1;
  }
}
