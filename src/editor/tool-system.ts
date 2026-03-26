import type { ToolType, TileDef } from './types.js';
import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';

const BASE = 16;

/** Tool interface — strategy pattern. */
export interface EditorTool {
  readonly name: ToolType;
  onMouseDown(gx: number, gy: number, state: EditorState, history: HistoryManager): void;
  onMouseMove(gx: number, gy: number, isDown: boolean, state: EditorState, history: HistoryManager): void;
  onMouseUp(gx: number, gy: number, state: EditorState, history: HistoryManager): void;
}

interface CellDelta { x: number; y: number; oldVal: string | number | null; newVal: string | number | null; }
interface ObjDelta { key: string; x: number; y: number; action: 'add' | 'remove'; }

/** Check if a tile definition is "large" or "above" — should be placed as object. */
function isObjectTile(def: TileDef | undefined): boolean {
  if (!def) return false;
  return def.w > BASE || def.h > BASE || def.above;
}

// ── Paint Tool ──────────────────────────────────────────

class PaintTool implements EditorTool {
  readonly name: ToolType = 'paint';
  tiles: Record<string, TileDef> = {};
  private dragging = false;
  private cellDeltas: CellDelta[] = [];
  private objDeltas: ObjDelta[] = [];
  private visited = new Set<string>();

  onMouseDown(gx: number, gy: number, state: EditorState, _history: HistoryManager): void {
    this.dragging = true;
    this.cellDeltas = [];
    this.objDeltas = [];
    this.visited = new Set();
    this.paintCell(gx, gy, state);
  }

  onMouseMove(gx: number, gy: number, isDown: boolean, state: EditorState, _history: HistoryManager): void {
    if (!isDown || !this.dragging) return;
    this.paintCell(gx, gy, state);
  }

  onMouseUp(_gx: number, _gy: number, state: EditorState, history: HistoryManager): void {
    if (!this.dragging) return;
    this.dragging = false;
    const cellDeltas = [...this.cellDeltas];
    const objDeltas = [...this.objDeltas];
    if (cellDeltas.length === 0 && objDeltas.length === 0) return;

    const layer = state.activeLayer;
    // Note: changes already applied during drag. Command only stores for undo/redo.
    history.execute({
      label: `Paint ${cellDeltas.length + objDeltas.length} tile(s)`,
      execute() {
        for (const d of cellDeltas) { layer === 'ground' ? state.setGroundTile(d.x, d.y, d.newVal as string) : state.setObjectTile(d.x, d.y, d.newVal as string | null); }
        for (const d of objDeltas) { d.action === 'add' ? state.addPlacedObject(d.key, d.x, d.y) : state.removePlacedObject(d.x, d.y); }
      },
      undo() {
        for (const d of cellDeltas) { layer === 'ground' ? state.setGroundTile(d.x, d.y, d.oldVal as string) : state.setObjectTile(d.x, d.y, d.oldVal as string | null); }
        for (const d of objDeltas) { d.action === 'add' ? state.removePlacedObject(d.x, d.y) : state.addPlacedObject(d.key, d.x, d.y); }
      },
    });
  }

  private paintCell(gx: number, gy: number, state: EditorState): void {
    const key = `${gx},${gy}`;
    if (this.visited.has(key)) return;
    this.visited.add(key);
    const tileId = state.selectedTileId;
    if (!tileId) return;

    const def = this.tiles[tileId];
    if (isObjectTile(def)) {
      state.addPlacedObject(tileId, gx, gy);
      this.objDeltas.push({ key: tileId, x: gx, y: gy, action: 'add' });
      return;
    }

    if (state.activeLayer === 'ground') {
      const old = state.getGroundTile(gx, gy);
      if (old === tileId) return;
      this.cellDeltas.push({ x: gx, y: gy, oldVal: old, newVal: tileId });
      state.setGroundTile(gx, gy, tileId);
    } else {
      const old = state.getObjectTile(gx, gy);
      if (old === tileId) return;
      this.cellDeltas.push({ x: gx, y: gy, oldVal: old, newVal: tileId });
      state.setObjectTile(gx, gy, tileId);
    }
  }
}

// ── Erase Tool ──────────────────────────────────────────

class EraseTool implements EditorTool {
  readonly name: ToolType = 'erase';
  tiles: Record<string, TileDef> = {};
  private dragging = false;
  private cellDeltas: CellDelta[] = [];
  private objDeltas: ObjDelta[] = [];
  private visited = new Set<string>();

  onMouseDown(gx: number, gy: number, state: EditorState, _history: HistoryManager): void {
    this.dragging = true;
    this.cellDeltas = [];
    this.objDeltas = [];
    this.visited = new Set();
    this.eraseCell(gx, gy, state);
  }

  onMouseMove(gx: number, gy: number, isDown: boolean, state: EditorState, _history: HistoryManager): void {
    if (!isDown || !this.dragging) return;
    this.eraseCell(gx, gy, state);
  }

  onMouseUp(_gx: number, _gy: number, state: EditorState, history: HistoryManager): void {
    if (!this.dragging) return;
    this.dragging = false;
    const cellDeltas = [...this.cellDeltas];
    const objDeltas = [...this.objDeltas];
    if (cellDeltas.length === 0 && objDeltas.length === 0) return;

    const layer = state.activeLayer;
    history.execute({
      label: `Erase ${cellDeltas.length + objDeltas.length} tile(s)`,
      execute() {
        for (const d of cellDeltas) { layer === 'ground' ? state.setGroundTile(d.x, d.y, d.newVal as string) : state.setObjectTile(d.x, d.y, d.newVal as string | null); }
        for (const d of objDeltas) { state.removePlacedObject(d.x, d.y); }
      },
      undo() {
        for (const d of cellDeltas) { layer === 'ground' ? state.setGroundTile(d.x, d.y, d.oldVal as string) : state.setObjectTile(d.x, d.y, d.oldVal as string | null); }
        for (const d of objDeltas) { state.addPlacedObject(d.key, d.x, d.y); }
      },
    });
  }

  private eraseCell(gx: number, gy: number, state: EditorState): void {
    const key = `${gx},${gy}`;
    if (this.visited.has(key)) return;
    this.visited.add(key);

    // First try to remove a placed object at this position
    const obj = state.getPlacedObjectAt(gx, gy);
    if (obj) {
      this.objDeltas.push({ key: obj.key, x: obj.x, y: obj.y, action: 'remove' });
      state.removePlacedObject(gx, gy);
      return;
    }

    // Also check if click is inside a larger object (not just top-left)
    if (state.mapData.objects) {
      for (let i = state.mapData.objects.length - 1; i >= 0; i--) {
        const o = state.mapData.objects[i];
        const def = this.tiles[o.key];
        if (!def) continue;
        const gw = Math.max(1, Math.round(def.w / BASE));
        const gh = Math.max(1, Math.round(def.h / BASE));
        if (gx >= o.x && gx < o.x + gw && gy >= o.y && gy < o.y + gh) {
          this.objDeltas.push({ key: o.key, x: o.x, y: o.y, action: 'remove' });
          state.mapData.objects.splice(i, 1);
          state.emit('map-modified');
          return;
        }
      }
    }

    // Erase ground/object layer cell
    if (state.activeLayer === 'ground') {
      const old = state.getGroundTile(gx, gy);
      if (old === 'g1') return; // don't erase to empty, use grass as default
      this.cellDeltas.push({ x: gx, y: gy, oldVal: old, newVal: 'g1' });
      state.setGroundTile(gx, gy, 'g1');
    } else {
      const old = state.getObjectTile(gx, gy);
      if (old === null) return;
      this.cellDeltas.push({ x: gx, y: gy, oldVal: old, newVal: null });
      state.setObjectTile(gx, gy, null);
    }
  }
}

// ── Fill Tool ──────────────────────────────────────────

class FillTool implements EditorTool {
  readonly name: ToolType = 'fill';

  onMouseDown(gx: number, gy: number, state: EditorState, history: HistoryManager): void {
    const tileId = state.selectedTileId;
    if (!tileId) return;
    const { width, height } = state.mapData;
    const isGround = state.activeLayer === 'ground';

    const target = isGround ? state.getGroundTile(gx, gy) : state.getObjectTile(gx, gy);
    if (target === tileId) return;

    const deltas: CellDelta[] = [];
    const visited = new Set<string>();
    const queue: [number, number][] = [[gx, gy]];

    while (queue.length > 0 && deltas.length < 10000) {
      const [cx, cy] = queue.shift()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
      const current = isGround ? state.getGroundTile(cx, cy) : state.getObjectTile(cx, cy);
      if (current !== target) continue;
      visited.add(key);
      deltas.push({ x: cx, y: cy, oldVal: current, newVal: tileId });
      queue.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
    }

    if (deltas.length > 0) {
      const layer = state.activeLayer;
      for (const d of deltas) {
        isGround ? state.setGroundTile(d.x, d.y, d.newVal as string) : state.setObjectTile(d.x, d.y, d.newVal as string | null);
      }
      history.execute({
        label: `Fill ${deltas.length} tile(s)`,
        execute() { for (const d of deltas) { layer === 'ground' ? state.setGroundTile(d.x, d.y, d.newVal as string) : state.setObjectTile(d.x, d.y, d.newVal as string | null); } },
        undo() { for (const d of deltas) { layer === 'ground' ? state.setGroundTile(d.x, d.y, d.oldVal as string) : state.setObjectTile(d.x, d.y, d.oldVal as string | null); } },
      });
    }
  }

  onMouseMove(): void {}
  onMouseUp(): void {}
}

// ── Select Tool ──────────────────────────────────────────

class SelectTool implements EditorTool {
  readonly name: ToolType = 'select';

  onMouseDown(gx: number, gy: number, state: EditorState): void {
    const npc = state.mapData.npcs?.find(n => n.x === gx && n.y === gy);
    if (npc) { state.selectNpc(npc.id); return; }
    const tIdx = state.mapData.transitions?.findIndex(t => t.fromX === gx && t.fromY === gy) ?? -1;
    if (tIdx >= 0) { state.selectTransition(tIdx); return; }
    state.selectCell(gx, gy);
  }

  onMouseMove(): void {}
  onMouseUp(): void {}
}

// ── NPC Tool ──────────────────────────────────────────

class NPCTool implements EditorTool {
  readonly name: ToolType = 'npc';
  onOpenDialog: ((gx: number, gy: number) => void) | null = null;
  onMouseDown(gx: number, gy: number): void { this.onOpenDialog?.(gx, gy); }
  onMouseMove(): void {}
  onMouseUp(): void {}
}

// ── Transition Tool ──────────────────────────────────

class TransitionTool implements EditorTool {
  readonly name: ToolType = 'transition';
  onOpenDialog: ((gx: number, gy: number) => void) | null = null;
  onMouseDown(gx: number, gy: number): void { this.onOpenDialog?.(gx, gy); }
  onMouseMove(): void {}
  onMouseUp(): void {}
}

// ── Tool System ──────────────────────────────────────────

export class ToolSystem {
  private tools: Map<ToolType, EditorTool>;
  private state: EditorState;
  private history: HistoryManager;

  constructor(state: EditorState, history: HistoryManager, tiles?: Record<string, TileDef>) {
    this.state = state;
    this.history = history;
    const paintTool = new PaintTool();
    const eraseTool = new EraseTool();
    if (tiles) {
      paintTool.tiles = tiles;
      eraseTool.tiles = tiles;
    }
    this.tools = new Map<ToolType, EditorTool>([
      ['paint', paintTool],
      ['erase', eraseTool],
      ['fill', new FillTool()],
      ['select', new SelectTool()],
      ['npc', new NPCTool()],
      ['transition', new TransitionTool()],
    ]);
  }

  getTool(name: ToolType): EditorTool {
    return this.tools.get(name)!;
  }

  handleMouseDown(gx: number, gy: number): void {
    this.tools.get(this.state.activeTool)?.onMouseDown(gx, gy, this.state, this.history);
  }

  handleMouseMove(gx: number, gy: number, isDown: boolean): void {
    this.tools.get(this.state.activeTool)?.onMouseMove(gx, gy, isDown, this.state, this.history);
  }

  handleMouseUp(gx: number, gy: number): void {
    this.tools.get(this.state.activeTool)?.onMouseUp(gx, gy, this.state, this.history);
  }
}
