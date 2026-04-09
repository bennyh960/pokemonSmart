import { EditorState } from './editor-state.js';
import { HistoryManager } from './history.js';
import { ToolSystem } from './tool-system.js';
import { CanvasViewport } from './canvas-viewport.js';
import { TilePalette, categorizeTiles } from './tile-palette.js';
import { Toolbar } from './toolbar.js';
import { PropertiesPanel } from './properties-panel.js';
import { createBlankMap, saveMap, loadMapFromProject } from './map-io.js';
import { mapRelationIndex } from './map-relation-index.js';
import { RegionMapOverlay } from './region-map.js';
// Tilesets are loaded dynamically — see loadTilesetManifest() below
import type { TileDef, NPCData, MapTransition } from './types.js';
import { toAssetUrl } from '../engine/asset-path.js';
import './style.css';

/** Vite-friendly static imports for each known tileset manifest. */
async function loadTilesetManifest(name: string): Promise<Record<string, unknown>> {
  switch (name) {
    case 'overworld': return (await import('../data/tilesets/overworld.json')) as unknown as Record<string, unknown>;
    case 'interior':  return (await import('../data/tilesets/interior.json')) as unknown as Record<string, unknown>;
    default: throw new Error(`Unknown tileset: ${name}`);
  }
}

/** Normalize interactType from any format (string, object, legacy destroy). */
function toInteractRef(raw: unknown, destroy?: unknown): TileDef['interactType'] {
  if (raw && typeof raw === 'object' && 'id' in (raw as Record<string, unknown>)) return raw as TileDef['interactType'];
  if (typeof raw === 'string' && raw) return { id: raw };
  if (typeof destroy === 'string' && destroy) return { id: destroy };
  return undefined;
}

/** Parse a manifest JSON object into a tiles Record. */
function parseManifestTiles(manifest: Record<string, unknown>): Record<string, TileDef> {
  const tiles: Record<string, TileDef> = {};
  const rawTiles = manifest.tiles;
  if (Array.isArray(rawTiles)) {
    for (const raw of rawTiles as Array<Record<string, unknown>>) {
      const size = (raw.tileSize as number) ?? 16;
      const iRef = toInteractRef(raw.interactType, raw.destroy);
      tiles[raw.key as string] = { sx: raw.sx as number, sy: raw.sy as number, w: (raw.w as number) ?? size, h: (raw.h as number) ?? size, walkable: raw.walkable as boolean, encounterTypes: (raw.encounterTypes as string[] | undefined) ?? ((raw.encounter as boolean) ? ['*'] : undefined), above: (raw.above as boolean) ?? false, overlay: (raw.overlay as boolean) ?? false, category: (raw.category as string) ?? (iRef ? 'interactive' : undefined), interactType: iRef, cells: raw.cells as TileDef['cells'] };
    }
  } else if (rawTiles && typeof rawTiles === 'object') {
    const baseTileSize = (manifest.tileSize as number) ?? 16;
    for (const [id, raw] of Object.entries(rawTiles as Record<string, Record<string, unknown>>)) {
      const iRef = toInteractRef(raw.interactType, raw.destroy);
      tiles[id] = { sx: raw.sx as number, sy: raw.sy as number, w: (raw.w as number) ?? baseTileSize, h: (raw.h as number) ?? baseTileSize, walkable: raw.walkable as boolean, encounterTypes: (raw.encounterTypes as string[] | undefined) ?? ((raw.encounter as boolean) ? ['*'] : undefined), above: (raw.above as boolean) ?? (raw.renderAbove as boolean) ?? false, overlay: (raw.overlay as boolean) ?? false, category: (raw.category as string) ?? (iRef ? 'interactive' : undefined), interactType: iRef };
    }
  }
  return tiles;
}

async function init() {
  // 1. Load initial tileset (overworld)
  const initialManifest = await loadTilesetManifest('overworld');
  const tilesetImage = new Image();
  tilesetImage.src = toAssetUrl(initialManifest.image as string);
  await new Promise<void>((resolve, reject) => {
    tilesetImage.onload = () => resolve();
    tilesetImage.onerror = () => reject(new Error('Failed to load tileset image'));
  });

  // 2. Parse tiles
  const tiles: Record<string, TileDef> = parseManifestTiles(initialManifest);
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

  let currentTileset = 'overworld';
  // Declared early so switchTileset closure can reference it; assigned below after toolbar is built
  let tilesetSelector: HTMLSelectElement;

  const palette = new TilePalette(paletteEl, state, initialManifest.image as string, tiles, tilesetImage.naturalWidth, tilesetImage);
  const viewport = new CanvasViewport(canvasEl, state, tilesetImage, new Map(Object.entries(tiles)), toolSystem);

  /** Switch the active tileset, reload the image, and update palette + viewport. */
  async function switchTileset(name: string): Promise<void> {
    if (name === currentTileset) return;
    try {
      const manifest = await loadTilesetManifest(name);
      const newTiles = parseManifestTiles(manifest);
      const newImage = new Image();
      await new Promise<void>((resolve, reject) => {
        newImage.onload = () => resolve();
        newImage.onerror = () => reject(new Error(`Failed to load tileset image: ${manifest.image}`));
        newImage.src = toAssetUrl(manifest.image as string);
        if (newImage.complete) resolve();
      });
      // Update tiles in-place so existing references (ToolSystem) stay valid
      for (const key of Object.keys(tiles)) delete tiles[key];
      Object.assign(tiles, newTiles);
      palette.updateTileset(newImage, tiles);
      viewport.updateTileset(newImage, new Map(Object.entries(tiles)));
      tilesetSelector.value = name;
      currentTileset = name;
    } catch (err) {
      console.error('Failed to switch tileset:', err);
    }
  }

  /** Handle map load: auto-switch tileset if the map uses a different one, then load the map. */
  async function handleLoadMap(data: import('./types.js').TileMapData): Promise<void> {
    if (data.tileset && data.tileset !== currentTileset) {
      await switchTileset(data.tileset);
    }
    const cats = categorizeTiles(tiles);
    state.loadMap(data, cats);
    history.clear();
  }

  const toolbar = new Toolbar(toolbarEl, state, history, tiles, handleLoadMap);
  void toolbar; // referenced only for side effects

  // Navigation callback — used by PropertiesPanel map links and RegionMapOverlay
  const navigateToMap = async (mapId: string) => {
    try {
      const data = await loadMapFromProject(mapId);
      await handleLoadMap(data);
    } catch (err) {
      console.error('Failed to navigate to map:', mapId, err);
    }
  };

  new PropertiesPanel(propsEl, state, history, tiles, navigateToMap);

  // Region map overlay (full-screen canvas view of all maps)
  const regionMap = new RegionMapOverlay(document.body, navigateToMap);

  // Add tileset selector to toolbar
  tilesetSelector = document.createElement('select');
  tilesetSelector.id = 'sel-tileset';
  tilesetSelector.title = 'Active Tileset';
  tilesetSelector.style.cssText = 'margin-left:8px;';
  for (const name of ['overworld', 'interior']) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    tilesetSelector.appendChild(opt);
  }
  tilesetSelector.value = currentTileset;
  tilesetSelector.addEventListener('change', () => switchTileset(tilesetSelector.value));
  toolbarEl.querySelector('[data-group="view"]')!.appendChild(tilesetSelector);

  // Add Region button to toolbar
  const regionBtn = document.createElement('button');
  regionBtn.id = 'btn-region';
  regionBtn.textContent = '🗺 Region';
  regionBtn.title = 'Open Region Map (view all maps and connections)';
  regionBtn.style.cssText = 'margin-left:8px;';
  regionBtn.addEventListener('click', () => regionMap.toggle(state.mapData.id));
  toolbarEl.querySelector('[data-group="view"]')!.appendChild(regionBtn);

  // Kick off background loading of map relation index
  mapRelationIndex.load().catch(console.error);

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
      dialogue: [{ en: 'Hello!', he: '' }],
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
      case 'i': state.setTool('eyedropper'); break;
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
