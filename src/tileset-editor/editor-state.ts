import type { TileEntry, TsEditorEvent } from './types.js';
import { toAssetUrl } from '../engine/asset-path.js';

const DEFAULT_TILE_SIZE = 16

export class TilesetEditorState {
  // All defined tiles
  tiles: TileEntry[] = [];

  // Selection on spritesheet (grid coords, 16px grid)
  selStartCol = -1;
  selStartRow = -1;
  selEndCol = -1;
  selEndRow = -1;
  isDragging = false;

  // Multi-cell selection (Ctrl+Click for non-adjacent tiles)
  // Stored as "col,row" strings for easy Set operations
  multiSelectedCells = new Set<string>();

  // Currently selected tile index in the list (-1 = none)
  selectedIndex = -1;

  // Viewport
  zoom = 2;
  scrollX = 0;
  scrollY = 0;
  showGrid = true;
  cursorCol = -1;
  cursorRow = -1;

  // Crop mode
  cropMode = false;
  cropLocked = false;
  // Pixel-level selection for crop (independent of grid selection)
  cropSelX = -1;
  cropSelY = -1;
  cropSelW = 0;
  cropSelH = 0;
  // Source region (frozen when locked)
  cropSrcX = 0;
  cropSrcY = 0;
  cropSrcW = 0;
  cropSrcH = 0;
  // Target region (draggable/resizable)
  cropTargetX = 0;
  cropTargetY = 0;
  cropTargetW = DEFAULT_TILE_SIZE;
  cropTargetH = DEFAULT_TILE_SIZE;

  // Image
  imageSrc = toAssetUrl('/sprites/overworld/overworld-tileset.png');
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

  // ── Multi-cell selection (Ctrl+Click) ──

  toggleMultiCell(col: number, row: number): void {
    const key = `${col},${row}`;
    if (this.multiSelectedCells.has(key)) {
      this.multiSelectedCells.delete(key);
    } else {
      this.multiSelectedCells.add(key);
    }
    this.emit('multi-selection-changed');
  }

  clearMultiSelection(): void {
    this.multiSelectedCells.clear();
    this.emit('multi-selection-changed');
  }

  get multiSelectionValid(): boolean {
    return this.multiSelectedCells.size > 0;
  }

  /** Parse a "col,row" key into numbers. */
  static parseCell(key: string): { col: number; row: number } {
    const [c, r] = key.split(',').map(Number);
    return { col: c, row: r };
  }

  /** Selection in pixels. */
  get selPixelX(): number { return this.selStartCol * DEFAULT_TILE_SIZE; }
  get selPixelY(): number { return this.selStartRow * DEFAULT_TILE_SIZE; }
  get selCols(): number { return this.selEndCol - this.selStartCol + 1; }
  get selRows(): number { return this.selEndRow - this.selStartRow + 1; }
  get selPixelW(): number { return this.selCols * DEFAULT_TILE_SIZE; }
  get selPixelH(): number { return this.selRows * DEFAULT_TILE_SIZE; }

  // ── Crop lock ──

  get cropSelValid(): boolean {
    return this.cropSelX >= 0 && this.cropSelY >= 0 && this.cropSelW > 0 && this.cropSelH > 0;
  }

  setCropSel(x1: number, y1: number, x2: number, y2: number): void {
    this.cropSelX = Math.max(0, Math.min(x1, x2));
    this.cropSelY = Math.max(0, Math.min(y1, y2));
    this.cropSelW = Math.abs(x2 - x1);
    this.cropSelH = Math.abs(y2 - y1);
    this.emit('selection-changed');
  }

  lockCrop(): void {
    if (!this.cropSelValid) return;
    this.cropSrcX = this.cropSelX;
    this.cropSrcY = this.cropSelY;
    this.cropSrcW = this.cropSelW;
    this.cropSrcH = this.cropSelH;
    this.cropTargetX = this.cropSrcX;
    this.cropTargetY = this.cropSrcY;
    this.cropTargetW = this.cropSrcW;
    this.cropTargetH = this.cropSrcH;
    this.cropLocked = true;
    this.emit('crop-mode-changed');
  }

  unlockCrop(): void {
    this.cropLocked = false;
    this.emit('crop-mode-changed');
  }

  // ── Item management ──

  selectItem(index: number): void {
    this.selectedIndex = index;
    // Highlight the tile's region on the spritesheet
    if (index >= 0 && index < this.tiles.length) {
      const t = this.tiles[index];
      const gridW = Math.max(1, Math.round(t.w / DEFAULT_TILE_SIZE));
      const gridH = Math.max(1, Math.round(t.h / DEFAULT_TILE_SIZE));
      const startCol = Math.round(t.sx / DEFAULT_TILE_SIZE);
      const startRow = Math.round(t.sy / DEFAULT_TILE_SIZE);
      this.setSelection(startCol, startRow, startCol + gridW - 1, startRow + gridH - 1);

      // Scroll to make the tile visible
      const centerX = (startCol + gridW / 2) * DEFAULT_TILE_SIZE * this.zoom;
      const centerY = (startRow + gridH / 2) * DEFAULT_TILE_SIZE * this.zoom;
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
