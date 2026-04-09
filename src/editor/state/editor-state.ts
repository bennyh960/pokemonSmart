/**
 * Central editor state with simple event emitter for reactive updates.
 */

export type Tool = 'paint' | 'erase' | 'select' | 'fill' | 'npc' | 'warp' | 'spawn';

export interface NPCPlacement {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  type: 'dialogue' | 'trainer' | 'shopkeeper' | 'healer';
  dialogue: string[];
  spriteType: string;
  // Trainer-specific
  party?: { pokemonId: number; level: number }[];
  reward?: number;
  lineOfSight?: number;
}

export interface WarpPlacement {
  fromX: number;
  fromY: number;
  toMapId: string;
  toX: number;
  toY: number;
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: number[][];
  objects?: { id: string; x: number; y: number }[];
  spawn: { x: number; y: number };
  npcs: NPCPlacement[];
  warps: WarpPlacement[];
  music: string;
  encounterTableId: string;
}

type Listener = () => void;

class EditorState {
  // Map data
  map: MapData = this.createEmptyMap('new-map', 'New Map', 15, 10);

  // Editor UI state
  selectedTileId = 1; // grass
  activeTool: Tool = 'paint';
  zoom = 2;
  showGrid = true;
  selectedEntityIndex = -1;
  selectedEntityType: 'npc' | 'warp' | null = null;

  // Undo/redo
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory = 50;

  // Event system
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(): void {
    for (const fn of this.listeners) fn();
  }

  // ─── Map operations ──────────────────────────────────────────

  createEmptyMap(id: string, name: string, width: number, height: number): MapData {
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) {
      tiles.push(new Array(width).fill(1)); // fill with grass
    }
    return {
      id, name, width, height, tiles,
      spawn: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
      npcs: [],
      warps: [],
      music: '',
      encounterTableId: '',
    };
  }

  newMap(id: string, name: string, width: number, height: number): void {
    this.map = this.createEmptyMap(id, name, width, height);
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  resizeMap(newWidth: number, newHeight: number): void {
    this.pushUndo();
    const { tiles, width, height } = this.map;
    const newTiles: number[][] = [];
    for (let y = 0; y < newHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < newWidth; x++) {
        row.push(y < height && x < width ? tiles[y][x] : 1);
      }
      newTiles.push(row);
    }
    this.map.tiles = newTiles;
    this.map.width = newWidth;
    this.map.height = newHeight;
    this.notify();
  }

  // ─── Tile painting ───────────────────────────────────────────

  setTile(x: number, y: number, tileId: number): void {
    if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) return;
    this.map.tiles[y][x] = tileId;
    this.notify();
  }

  getTile(x: number, y: number): number {
    if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) return -1;
    return this.map.tiles[y][x];
  }

  floodFill(startX: number, startY: number, newTileId: number): void {
    const target = this.getTile(startX, startY);
    if (target === newTileId || target === -1) return;
    this.pushUndo();

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) continue;
      if (this.map.tiles[y][x] !== target) continue;

      visited.add(key);
      this.map.tiles[y][x] = newTileId;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    this.notify();
  }

  // ─── Undo / Redo ─────────────────────────────────────────────

  pushUndo(): void {
    this.undoStack.push(JSON.stringify(this.map));
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.stringify(this.map));
    this.map = JSON.parse(this.undoStack.pop()!);
    this.notify();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.stringify(this.map));
    this.map = JSON.parse(this.redoStack.pop()!);
    this.notify();
  }

  // ─── Entity operations ───────────────────────────────────────

  addNPC(npc: NPCPlacement): void {
    this.pushUndo();
    this.map.npcs.push(npc);
    this.notify();
  }

  removeNPC(index: number): void {
    this.pushUndo();
    this.map.npcs.splice(index, 1);
    this.selectedEntityIndex = -1;
    this.selectedEntityType = null;
    this.notify();
  }

  addWarp(warp: WarpPlacement): void {
    this.pushUndo();
    this.map.warps.push(warp);
    this.notify();
  }

  removeWarp(index: number): void {
    this.pushUndo();
    this.map.warps.splice(index, 1);
    this.selectedEntityIndex = -1;
    this.selectedEntityType = null;
    this.notify();
  }

  setSpawn(x: number, y: number): void {
    this.map.spawn = { x, y };
    this.notify();
  }
}

export const editorState = new EditorState();
