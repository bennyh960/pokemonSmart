import { EditorState } from './editor-state.js';
import { HistoryManager } from './history.js';
import { ToolSystem } from './tool-system.js';
import { CanvasViewport } from './canvas-viewport.js';
import { TilePalette, categorizeTiles } from './tile-palette.js';
import { Toolbar } from './toolbar.js';
import { PropertiesPanel } from './properties-panel.js';
import {
  createBlankMap,
  saveMapWithType,
  loadMapFromProject,
  loadTemplateFromProject,
  loadMapRaw,
  getTemplateConsumers,
  getKnownMapIds,
} from './map-io.js';
import type { EditorMode } from './toolbar.js';
import { mapRelationIndex } from './map-relation-index.js';
import { RegionMapOverlay } from './region-map.js';
// Tilesets are loaded dynamically — see loadTilesetManifest() below
import type { TileDef, NPCData, MapTransition } from './types.js';
import { toAssetUrl } from '../engine/asset-path.js';
import './style.css';

/** Vite-friendly static imports for each known tileset manifest. */
async function loadTilesetManifest(name: string): Promise<Record<string, unknown>> {
  switch (name) {
    case 'overworld':
      return (await import('../data/tilesets/overworld.json')) as unknown as Record<string, unknown>;
    case 'interior':
      return (await import('../data/tilesets/interior.json')) as unknown as Record<string, unknown>;
    case 'caves':
      return (await import('../data/tilesets/caves.json')) as unknown as Record<string, unknown>;
    default:
      throw new Error(`Unknown tileset: ${name}`);
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
      tiles[raw.key as string] = {
        sx: raw.sx as number,
        sy: raw.sy as number,
        w: (raw.w as number) ?? size,
        h: (raw.h as number) ?? size,
        walkable: raw.walkable as boolean,
        encounterTypes:
          (raw.encounterTypes as string[] | undefined) ?? ((raw.encounter as boolean) ? ['*'] : undefined),
        above: (raw.above as boolean) ?? false,
        overlay: (raw.overlay as boolean) ?? false,
        category: (raw.category as string) ?? (iRef ? 'interactive' : undefined),
        interactType: iRef,
        cells: raw.cells as TileDef['cells'],
      };
    }
  } else if (rawTiles && typeof rawTiles === 'object') {
    const baseTileSize = (manifest.tileSize as number) ?? 16;
    for (const [id, raw] of Object.entries(rawTiles as Record<string, Record<string, unknown>>)) {
      const iRef = toInteractRef(raw.interactType, raw.destroy);
      tiles[id] = {
        sx: raw.sx as number,
        sy: raw.sy as number,
        w: (raw.w as number) ?? baseTileSize,
        h: (raw.h as number) ?? baseTileSize,
        walkable: raw.walkable as boolean,
        encounterTypes:
          (raw.encounterTypes as string[] | undefined) ?? ((raw.encounter as boolean) ? ['*'] : undefined),
        above: (raw.above as boolean) ?? (raw.renderAbove as boolean) ?? false,
        overlay: (raw.overlay as boolean) ?? false,
        category: (raw.category as string) ?? (iRef ? 'interactive' : undefined),
        interactType: iRef,
      };
    }
  }
  return tiles;
}

async function init() {
  // 1. Load initial tileset (restores last-used from localStorage, defaults to overworld)
  const initialTilesetName = localStorage.getItem('editor-tileset') ?? 'overworld';
  const initialManifest = await loadTilesetManifest(initialTilesetName);
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

  let currentTileset = localStorage.getItem('editor-tileset') ?? 'overworld';
  // Declared early so switchTileset closure can reference it; assigned below after toolbar is built
  let tilesetSelector: HTMLSelectElement;

  const palette = new TilePalette(
    paletteEl,
    state,
    initialManifest.image as string,
    tiles,
    tilesetImage.naturalWidth,
    tilesetImage,
  );
  const viewport = new CanvasViewport(canvasEl, state, tilesetImage, new Map(Object.entries(tiles)), toolSystem);

  // ── Palette lock overlay (shown when map uses a template) ──
  paletteEl.style.position = 'relative';
  const paletteLock = document.createElement('div');
  paletteLock.id = 'palette-lock';
  paletteLock.style.cssText = [
    'display:none',
    'position:absolute',
    'inset:0',
    'background:rgba(10,10,20,0.90)',
    'color:#ccc',
    'z-index:10',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'text-align:center',
    'padding:24px',
    'gap:10px',
  ].join(';');
  paletteEl.appendChild(paletteLock);

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
      localStorage.setItem('editor-tileset', name);
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

  // ── Editor mode (map vs template) ──
  let editorMode: EditorMode = 'map';

  async function doSave(): Promise<void> {
    try {
      await saveMapWithType(state.mapData, editorMode === 'template' ? 'map-template' : 'map');
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') {
        console.error('Save failed:', err);
        alert('Save failed — check the console for details.');
      }
    }
  }

  // Navigation callback — used by PropertiesPanel map links and RegionMapOverlay
  const navigateToMap = async (mapId: string) => {
    try {
      const data = await loadMapFromProject(mapId);
      await handleLoadMap(data);
    } catch (err) {
      console.error('Failed to navigate to map:', mapId, err);
    }
  };

  // ── Split props column: template info (top) + properties content (bottom) ──
  // PropertiesPanel only receives propsContentEl, so it can never destroy the template section.
  propsEl.style.cssText += ';display:flex;flex-direction:column;overflow:hidden;';

  const templatePanel = document.createElement('div');
  templatePanel.id = 'template-panel';
  templatePanel.style.cssText = [
    'display:none',
    'flex-shrink:0',
    'max-height:55%',
    'overflow-y:auto',
    'padding:12px',
    'font-size:12px',
    'border-bottom:2px solid #3a3a66',
  ].join(';');
  propsEl.appendChild(templatePanel);

  const propsContentEl = document.createElement('div');
  propsContentEl.style.cssText = 'flex:1;overflow-y:auto;min-height:0;';
  propsEl.appendChild(propsContentEl);

  function renderTemplatePanel() {
    const templateId = state.mapData.id || '';
    const consumers = getTemplateConsumers(templateId);
    const allMaps = getKnownMapIds().filter((id) => !consumers.includes(id));

    templatePanel.innerHTML = `
      <div style="font-weight:bold;font-size:13px;margin-bottom:4px;color:#aac">
        📐 Template: <span style="font-family:monospace;color:#7799ff">${templateId}</span>
      </div>
      <div style="color:#666;margin-bottom:12px">${consumers.length} connected map${consumers.length !== 1 ? 's' : ''}</div>

      <div id="tp-list">
        ${
          consumers.length === 0
            ? '<div style="color:#555;font-style:italic">No maps connected yet</div>'
            : consumers
                .map(
                  (mapId) => `
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;padding:6px 8px;background:#252540;border-radius:4px;">
                <span style="flex:1;font-family:monospace;color:#ccc">${mapId}</span>
                <button class="tp-open" data-map="${mapId}" style="background:#2a3a66;color:#aac;border:1px solid #445;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px">Open</button>
                <button class="tp-unlink" data-map="${mapId}" style="background:#4a1a1a;color:#faa;border:1px solid #622;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px">Unlink</button>
              </div>`,
                )
                .join('')
        }
      </div>

      <div style="margin-top:16px;border-top:1px solid #2a2a44;padding-top:12px;">
        <div style="color:#888;margin-bottom:6px">Connect a map to this template:</div>
        <select id="tp-connect-sel" style="width:100%;background:#252540;color:#ccc;border:1px solid #444;border-radius:4px;padding:4px;margin-bottom:6px;">
          <option value="">Choose map...</option>
          ${allMaps.map((id) => `<option value="${id}">${id}</option>`).join('')}
        </select>
        <button id="tp-connect-btn" style="width:100%;background:#1a3a1a;color:#afa;border:1px solid #262;border-radius:4px;padding:6px;cursor:pointer;">
          Link map to this template
        </button>
      </div>

      <div style="margin-top:12px;border-top:1px solid #2a2a44;padding-top:12px;">
        <button id="tp-save-btn" style="width:100%;background:#2a3a66;color:#aac;border:1px solid #445;border-radius:4px;padding:6px;cursor:pointer;">
          💾 Save template
        </button>
      </div>
    `;

    templatePanel.querySelectorAll('.tp-open').forEach((btn) => {
      btn.addEventListener('click', async () => {
        // Switch to map mode first, then navigate
        toolbarEl.querySelector<HTMLElement>('.mode-btn[data-mode="map"]')?.click();
        await navigateToMap((btn as HTMLElement).dataset.map!);
      });
    });

    templatePanel.querySelectorAll('.tp-unlink').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mapId = (btn as HTMLElement).dataset.map!;
        if (!confirm(`Unlink "${mapId}" from this template?\n\nThe map will get its own copy of the tiles.`)) return;
        try {
          // Load merged map (has full tile data), then strip the template field
          const merged = await loadMapFromProject(mapId);
          delete (merged as unknown as Record<string, unknown>).template;
          await saveMapWithType(merged, 'map');
          renderTemplatePanel(); // refresh list
        } catch (err) {
          console.error('Unlink failed:', err);
          alert('Unlink failed — check console.');
        }
      });
    });

    templatePanel.querySelector('#tp-connect-btn')!.addEventListener('click', async () => {
      const sel = templatePanel.querySelector('#tp-connect-sel') as HTMLSelectElement;
      if (!sel.value) return;
      try {
        const raw = (await loadMapRaw(sel.value)) as unknown as Record<string, unknown>;
        const templateTileset = state.mapData.tileset ?? 'overworld';
        const mapTileset = raw.tileset as string | undefined;

        if (mapTileset && mapTileset !== templateTileset) {
          const ok = confirm(
            `This map uses tileset "${mapTileset}" but the template uses "${templateTileset}".\n\n` +
              `The map's tileset will be changed to "${templateTileset}". Proceed?`,
          );
          if (!ok) return;
        }

        // Strip all layout fields — they come from the template now.
        // Only identity, npcs, transitions, spawn, area, music stay on the instance.
        for (const f of ['tiles', 'objects', 'objectLayer', 'width', 'height', 'tileSize', 'tileset']) {
          delete raw[f];
        }
        raw.template = templateId;
        raw.tileset = templateTileset;
        await saveMapWithType(raw as unknown as import('./types.js').TileMapData, 'map');
        renderTemplatePanel(); // refresh list
      } catch (err) {
        console.error('Connect failed:', err);
        alert('Connect failed — check console.');
      }
    });

    templatePanel.querySelector('#tp-save-btn')!.addEventListener('click', () => doSave());
  }

  function handleModeChange(mode: EditorMode) {
    editorMode = mode;
    if (mode === 'template') {
      templatePanel.style.display = 'block';
      renderTemplatePanel();
      hidePaletteLock();
    } else {
      templatePanel.style.display = 'none';
      const md = state.mapData as import('./types.js').TileMapData & { template?: string };
      if (md.template) showPaletteLock(md.template);
      else hidePaletteLock();
    }
  }

  const toolbar = new Toolbar(toolbarEl, state, history, tiles, {
    onLoadMap: handleLoadMap,
    onSave: doSave,
    onModeChange: handleModeChange,
  });
  void toolbar;

  // ── Palette lock: shown on map mode when map uses a template ──
  function showPaletteLock(templateId: string) {
    paletteLock.style.display = 'flex';
    paletteLock.innerHTML = `
      <div style="font-size:28px">🔒</div>
      <div style="font-weight:bold;font-size:13px">Tiles from template</div>
      <div style="color:#7799ff;font-size:12px;font-family:monospace">${templateId}</div>
      <div style="font-size:11px;color:#777;max-width:160px;line-height:1.4">
        Tile layout is locked — switch to Templates mode to edit.
      </div>
      <button id="palette-load-template" style="
        margin-top:4px;background:#2a3a66;color:#aac;
        border:1px solid #4455aa;border-radius:4px;
        padding:6px 12px;font-size:12px;cursor:pointer;">
        Load template →
      </button>
    `;
    paletteLock.querySelector('#palette-load-template')!.addEventListener('click', async () => {
      const tmpl = await loadTemplateFromProject(templateId);
      await handleLoadMap(tmpl);
    });
  }

  function hidePaletteLock() {
    paletteLock.style.display = 'none';
    paletteLock.innerHTML = '';
  }

  state.on('map-loaded', () => {
    if (editorMode === 'template') {
      hidePaletteLock();
      renderTemplatePanel();
    } else {
      const md = state.mapData as import('./types.js').TileMapData & { template?: string };
      if (md.template) showPaletteLock(md.template);
      else hidePaletteLock();
    }
  });

  new PropertiesPanel(propsContentEl, state, history, tiles, navigateToMap);

  // Region map overlay (full-screen canvas view of all maps)
  const regionMap = new RegionMapOverlay(document.body, navigateToMap);

  // Add tileset selector to toolbar
  tilesetSelector = document.createElement('select');
  tilesetSelector.id = 'sel-tileset';
  tilesetSelector.title = 'Active Tileset';
  tilesetSelector.style.cssText = 'margin-left:8px;';
  for (const name of ['overworld', 'interior', 'caves']) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    tilesetSelector.appendChild(opt);
  }
  tilesetSelector.value = initialTilesetName;
  tilesetSelector.addEventListener('change', () => {
    switchTileset(tilesetSelector.value);
    localStorage.setItem('editor-tileset', tilesetSelector.value);
  });
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
    const existing = state.mapData.npcs?.find((n) => n.x === gx && n.y === gy);
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
    const existingIdx = state.mapData.transitions?.findIndex((t) => t.fromX === gx && t.fromY === gy) ?? -1;
    if (existingIdx >= 0) {
      state.selectTransition(existingIdx);
      return;
    }
    const toMapId = prompt('To Map ID:', 'route-1');
    if (!toMapId) return;
    const transition: MapTransition = { fromX: gx, fromY: gy, toMapId };
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
  state.on('layer-changed', () => {
    statusLayer.textContent = `Layer: ${state.activeLayer}`;
  });
  state.on('tool-changed', () => {
    statusTool.textContent = `Tool: ${state.activeTool}`;
  });
  function formatStatusMap(modified = false): string {
    const md = state.mapData;
    const displayName = md.label?.en || md.id;
    const tmpl = md.template ? `  [tmpl: ${md.template}]` : '';
    return `${md.id} (${md.width}×${md.height})${displayName !== md.id ? ` · ${displayName}` : ''}${tmpl}${modified ? ' *' : ''}`;
  }
  state.on('map-loaded', () => {
    statusMap.textContent = formatStatusMap(false);
  });
  state.on('map-modified', () => {
    statusMap.textContent = formatStatusMap(true);
  });

  // 10. Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        history.redo();
      } else if (e.key === 's') {
        e.preventDefault();
        void doSave();
      } else if (e.key === 'g') {
        e.preventDefault();
        state.showGrid = !state.showGrid;
        state.emit('viewport-changed');
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'b':
        state.setTool('paint');
        break;
      case 'e':
        state.setTool('erase');
        break;
      case 'g':
        state.setTool('fill');
        break;
      case 'i':
        state.setTool('eyedropper');
        break;
      case 's':
        state.setTool('select');
        break;
      case 'n':
        state.setTool('npc');
        break;
      case 't':
        state.setTool('transition');
        break;
      case '1':
        state.setLayer('ground');
        break;
      case '2':
        state.setLayer('object');
        break;
      case '=':
      case '+':
        state.setZoom(state.zoom + 0.5);
        break;
      case '-':
        state.setZoom(state.zoom - 0.5);
        break;
      case 'delete': {
        if (state.selectedNpcId) {
          const npcs = state.mapData.npcs || [];
          const idx = npcs.findIndex((n) => n.id === state.selectedNpcId);
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
      case 'arrowleft':
        state.setScroll(state.scrollX - 16 * state.zoom, state.scrollY);
        break;
      case 'arrowright':
        state.setScroll(state.scrollX + 16 * state.zoom, state.scrollY);
        break;
      case 'arrowup':
        state.setScroll(state.scrollX, state.scrollY - 16 * state.zoom);
        break;
      case 'arrowdown':
        state.setScroll(state.scrollX, state.scrollY + 16 * state.zoom);
        break;
    }
  });
}

init().catch(console.error);
