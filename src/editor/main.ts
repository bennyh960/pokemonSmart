import { EditorState } from './editor-state.js';
import { HistoryManager } from './history.js';
import { ToolSystem } from './tool-system.js';
import { CanvasViewport } from './canvas-viewport.js';
import { TilePalette, categorizeTiles } from './tile-palette.js';
import { Toolbar } from './toolbar.js';
import { PropertiesPanel } from './properties-panel.js';
import { createBlankMap, saveMap } from './map-io.js';
import dppManifest from '../data/tilesets/dpp.json';
import type { TileDef, NPCData, MapTransition } from './types.js';
import './style.css';

async function init() {
  // 1. Load tileset image
  const tilesetImage = new Image();
  tilesetImage.src = dppManifest.image;
  await new Promise<void>((resolve, reject) => {
    tilesetImage.onload = () => resolve();
    tilesetImage.onerror = () => reject(new Error('Failed to load tileset image'));
  });

  // 2. Parse tiles from manifest (supports both array and Record formats)
  const tiles: Record<string, TileDef> = {};
  if (Array.isArray(dppManifest.tiles)) {
    for (const raw of dppManifest.tiles as Array<{ key: string; sx: number; sy: number; w?: number; h?: number; tileSize?: number; walkable: boolean; encounter: boolean; above?: boolean; overlay?: boolean; destroy?: null | string; category?: string }>) {
      const size = raw.tileSize ?? 16;
      tiles[raw.key] = { sx: raw.sx, sy: raw.sy, w: raw.w ?? size, h: raw.h ?? size, walkable: raw.walkable, encounter: raw.encounter, above: raw.above ?? false, overlay: raw.overlay ?? false, destroy: (raw.destroy as TileDef['destroy']) ?? null, category: raw.category, cells: (raw as Record<string, unknown>).cells as TileDef['cells'] };
    }
  } else {
    const baseTileSize = (dppManifest as Record<string, unknown>).tileSize as number ?? 16;
    for (const [id, raw] of Object.entries(dppManifest.tiles as Record<string, Record<string, unknown>>)) {
      tiles[id] = { sx: raw.sx as number, sy: raw.sy as number, w: (raw.w as number) ?? baseTileSize, h: (raw.h as number) ?? baseTileSize, walkable: raw.walkable as boolean, encounter: raw.encounter as boolean, above: (raw.above as boolean) ?? (raw.renderAbove as boolean) ?? false, overlay: (raw.overlay as boolean) ?? false, destroy: null };
    }
  }
  const categories = categorizeTiles(tiles);

  // 3. Create initial blank map
  const initialMap = createBlankMap(25, 20);

  // 4. Initialize state + history
  const state = new EditorState(initialMap, categories);
  const history = new HistoryManager(state);

  // 5. Build DOM layout
  const root = document.getElementById('editor-root')!;

  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'editor-toolbar';

  const paletteEl = document.createElement('div');
  paletteEl.className = 'editor-palette';

  const canvasEl = document.createElement('div');
  canvasEl.className = 'editor-canvas';

  const propsEl = document.createElement('div');
  propsEl.className = 'editor-props';

  const statusEl = document.createElement('div');
  statusEl.className = 'editor-status';
  statusEl.innerHTML = `
    <span id="status-pos">Pos: -</span>
    <span id="status-tile">Tile: -</span>
    <span id="status-layer">Layer: ground</span>
    <span id="status-tool">Tool: paint</span>
    <span id="status-map">Map: new-map (25×20)</span>
  `;

  root.appendChild(toolbarEl);
  root.appendChild(paletteEl);
  root.appendChild(canvasEl);
  root.appendChild(propsEl);
  root.appendChild(statusEl);

  // 6. Initialize UI modules
  const toolSystem = new ToolSystem(state, history, tiles);

  new Toolbar(toolbarEl, state, history, tiles);
  new TilePalette(paletteEl, state, dppManifest.image, tiles, tilesetImage.naturalWidth, tilesetImage);
  new CanvasViewport(canvasEl, state, tilesetImage, new Map(Object.entries(tiles)), toolSystem);
  new PropertiesPanel(propsEl, state, history, tiles);

  // 7. Wire NPC tool dialog
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const npcTool = toolSystem.getTool('npc') as any;
  npcTool.onOpenDialog = (gx: number, gy: number) => {
    const existing = state.mapData.npcs?.find(n => n.x === gx && n.y === gy);
    if (existing) {
      state.selectNpc(existing.id);
      return;
    }
    const id = prompt('NPC ID:', `npc-${Date.now()}`);
    if (!id) return;
    const npc: NPCData = {
      id,
      x: gx,
      y: gy,
      facing: 'down',
      type: 'dialogue',
      dialogue: ['Hello!'],
      spriteType: 'npc-male',
    };
    if (!state.mapData.npcs) state.mapData.npcs = [];
    state.mapData.npcs.push(npc);
    state.selectNpc(id);
    state.emit('map-modified');
  };

  // 8. Wire Transition tool dialog
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transTool = toolSystem.getTool('transition') as any;
  transTool.onOpenDialog = (gx: number, gy: number) => {
    const existingIdx = state.mapData.transitions?.findIndex(t => t.fromX === gx && t.fromY === gy) ?? -1;
    if (existingIdx >= 0) {
      state.selectTransition(existingIdx);
      return;
    }
    const toMapId = prompt('To Map ID:', 'route-1');
    if (!toMapId) return;
    const toX = parseInt(prompt('To X:', '1') || '1', 10);
    const toY = parseInt(prompt('To Y:', '7') || '7', 10);
    const transition: MapTransition = { fromX: gx, fromY: gy, toMapId, toX, toY };
    if (!state.mapData.transitions) state.mapData.transitions = [];
    state.mapData.transitions.push(transition);
    state.selectTransition(state.mapData.transitions.length - 1);
    state.emit('map-modified');
  };

  // 9. Status bar updates
  const statusPos = document.getElementById('status-pos')!;
  const statusTile = document.getElementById('status-tile')!;
  const statusLayer = document.getElementById('status-layer')!;
  const statusTool = document.getElementById('status-tool')!;
  const statusMap = document.getElementById('status-map')!;

  state.on('cursor-moved', () => {
    const { cursorGridX: gx, cursorGridY: gy } = state;
    statusPos.textContent = `Pos: (${gx}, ${gy})`;
    const tile = state.activeLayer === 'ground' ? state.getGroundTile(gx, gy) : state.getObjectTile(gx, gy);
    statusTile.textContent = `Tile: ${tile ?? 'none'}`;
  });
  state.on('layer-changed', () => { statusLayer.textContent = `Layer: ${state.activeLayer}`; });
  state.on('tool-changed', () => { statusTool.textContent = `Tool: ${state.activeTool}`; });
  state.on('map-loaded', () => { statusMap.textContent = `Map: ${state.mapData.id || state.mapData.name} (${state.mapData.width}×${state.mapData.height})`; });
  state.on('map-modified', () => { statusMap.textContent = `Map: ${state.mapData.id || state.mapData.name} (${state.mapData.width}×${state.mapData.height}) *`; });

  // 10. Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); history.undo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); history.redo(); }
      else if (e.key === 's') { e.preventDefault(); saveMap(state.mapData); }
      else if (e.key === 'g') { e.preventDefault(); state.showGrid = !state.showGrid; state.emit('viewport-changed'); }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'b': state.setTool('paint'); break;
      case 'e': state.setTool('erase'); break;
      case 'g': state.setTool('fill'); break;
      case 's': state.setTool('select'); break;
      case 'n': state.setTool('npc'); break;
      case 't': state.setTool('transition'); break;
      case '1': state.setLayer('ground'); break;
      case '2': state.setLayer('object'); break;
      case '=': case '+': state.setZoom(state.zoom + 0.5); break;
      case '-': state.setZoom(state.zoom - 0.5); break;
      case 'delete': {
        if (state.selectedNpcId) {
          const npcs = state.mapData.npcs || [];
          const idx = npcs.findIndex(n => n.id === state.selectedNpcId);
          if (idx >= 0) npcs.splice(idx, 1);
          state.selectNpc(null);
          state.emit('map-modified');
        } else if (state.selectedTransitionIndex !== null) {
          state.mapData.transitions?.splice(state.selectedTransitionIndex, 1);
          state.selectTransition(null);
          state.emit('map-modified');
        }
        break;
      }
      case 'arrowleft': state.setScroll(state.scrollX - 16 * state.zoom, state.scrollY); break;
      case 'arrowright': state.setScroll(state.scrollX + 16 * state.zoom, state.scrollY); break;
      case 'arrowup': state.setScroll(state.scrollX, state.scrollY - 16 * state.zoom); break;
      case 'arrowdown': state.setScroll(state.scrollX, state.scrollY + 16 * state.zoom); break;
    }
  });
}

init().catch(console.error);
