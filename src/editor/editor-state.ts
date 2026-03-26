import type {
  TileMapData, TileCategory, LayerMode, ToolType, EditorEvent,
} from './types.js';

/** Central editor state with pub/sub event bus. */
export class EditorState {
  // ── Map data ──
  mapData: TileMapData;
  tileCategories: TileCategory[];

  // ── Editing state ──
  activeTool: ToolType = 'paint';
  activeLayer: LayerMode = 'ground';
  selectedTileId: string | null = 'g1';

  // ── Cursor ──
  cursorGridX = -1;
  cursorGridY = -1;

  // ── Viewport ──
  zoom = 2;
  scrollX = 0;
  scrollY = 0;
  showGrid = true;
  showWalkability = false;
  showTransitions = true;

  // ── Selection ──
  selectedNpcId: string | null = null;
  selectedTransitionIndex: number | null = null;
  selectedCellX: number | null = null;
  selectedCellY: number | null = null;

  // ── Event bus ──
  private listeners = new Map<EditorEvent, Set<() => void>>();

  constructor(initialMap: TileMapData, categories: TileCategory[]) {
    this.mapData = initialMap;
    this.tileCategories = categories;
  }

  // ── Event bus ──

  on(event: EditorEvent, callback: () => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event: EditorEvent): void {
    this.listeners.get(event)?.forEach(cb => cb());
  }

  // ── Setters that emit ──

  setTool(tool: ToolType): void {
    this.activeTool = tool;
    this.emit('tool-changed');
  }

  setLayer(layer: LayerMode): void {
    this.activeLayer = layer;
    this.emit('layer-changed');
  }

  selectTile(id: string): void {
    this.selectedTileId = id;
    this.emit('tile-selected');
  }

  setCursor(gx: number, gy: number): void {
    this.cursorGridX = gx;
    this.cursorGridY = gy;
    this.emit('cursor-moved');
  }

  setZoom(z: number): void {
    this.zoom = Math.max(0.5, Math.min(8, z));
    this.emit('viewport-changed');
  }

  setScroll(x: number, y: number): void {
    this.scrollX = x;
    this.scrollY = y;
    this.emit('viewport-changed');
  }

  selectCell(x: number | null, y: number | null): void {
    this.selectedCellX = x;
    this.selectedCellY = y;
    this.selectedNpcId = null;
    this.selectedTransitionIndex = null;
    this.emit('selection-changed');
  }

  selectNpc(id: string | null): void {
    this.selectedNpcId = id;
    this.selectedCellX = null;
    this.selectedCellY = null;
    this.selectedTransitionIndex = null;
    this.emit('selection-changed');
  }

  selectTransition(index: number | null): void {
    this.selectedTransitionIndex = index;
    this.selectedCellX = null;
    this.selectedCellY = null;
    this.selectedNpcId = null;
    this.emit('selection-changed');
  }

  // ── Map data access ──

  getGroundTile(x: number, y: number): string | number {
    if (y < 0 || y >= this.mapData.height || x < 0 || x >= this.mapData.width) return 'empty';
    return this.mapData.tiles[y][x];
  }

  getObjectTile(x: number, y: number): string | null {
    if (!this.mapData.objectLayer) return null;
    if (y < 0 || y >= this.mapData.height || x < 0 || x >= this.mapData.width) return null;
    return this.mapData.objectLayer[y][x];
  }

  setGroundTile(x: number, y: number, tileId: string | number): void {
    if (y < 0 || y >= this.mapData.height || x < 0 || x >= this.mapData.width) return;
    this.mapData.tiles[y][x] = tileId;
    this.emit('map-modified');
  }

  setObjectTile(x: number, y: number, tileId: string | null): void {
    if (y < 0 || y >= this.mapData.height || x < 0 || x >= this.mapData.width) return;
    if (!this.mapData.objectLayer) {
      this.mapData.objectLayer = Array.from({ length: this.mapData.height },
        () => Array(this.mapData.width).fill(null));
    }
    this.mapData.objectLayer[y][x] = tileId;
    this.emit('map-modified');
  }

  // ── Placed objects ──

  addPlacedObject(key: string, x: number, y: number): void {
    if (!this.mapData.objects) this.mapData.objects = [];
    // Don't duplicate at same position
    const existing = this.mapData.objects.findIndex(o => o.x === x && o.y === y && o.key === key);
    if (existing >= 0) return;
    this.mapData.objects.push({ key, x, y });
    this.emit('map-modified');
  }

  removePlacedObject(x: number, y: number): void {
    if (!this.mapData.objects) return;
    const idx = this.mapData.objects.findIndex(o => o.x === x && o.y === y);
    if (idx >= 0) {
      this.mapData.objects.splice(idx, 1);
      this.emit('map-modified');
    }
  }

  getPlacedObjectAt(x: number, y: number): { key: string; x: number; y: number } | null {
    if (!this.mapData.objects) return null;
    return this.mapData.objects.find(o => o.x === x && o.y === y) ?? null;
  }

  // ── Load a new map ──

  loadMap(data: TileMapData, categories: TileCategory[]): void {
    this.mapData = data;
    this.tileCategories = categories;
    this.selectedCellX = null;
    this.selectedCellY = null;
    this.selectedNpcId = null;
    this.selectedTransitionIndex = null;
    this.scrollX = 0;
    this.scrollY = 0;
    this.emit('map-loaded');
  }
}
