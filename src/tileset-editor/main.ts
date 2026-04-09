import { TilesetEditorState } from './editor-state.js';
import { SpritesheetViewport } from './spritesheet-viewport.js';
import { TileList } from './tile-list.js';
import { PropertiesPanel } from './properties-panel.js';
import { saveManifest, copyManifest, loadManifestFromFile, loadManifest } from './io.js';
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

async function init() {
  const state = new TilesetEditorState();

  // Load initial tileset (overworld)
  const initialManifest = await loadTilesetManifest('overworld');
  loadManifest(state, JSON.stringify(initialManifest));

  // Load tileset image
  const image = new Image();
  image.src = toAssetUrl(state.imageSrc);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      resolve();
    };
    image.onerror = () => reject(new Error('Failed to load tileset image'));
  });

  // ── Build DOM ──
  const root = document.getElementById('editor-root')!;

  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'ts-toolbar';
  toolbarEl.innerHTML = `
    <div class="toolbar-group">
      <button id="btn-load">📂 Load JSON</button>
      <button id="btn-save">💾 Save</button>
      <button id="btn-copy">📋 Copy JSON</button>
    </div>
    <div class="toolbar-group">
      <button id="btn-zoom-out">−</button>
      <span class="toolbar-label" id="zoom-label">2x</span>
      <button id="btn-zoom-in">+</button>
      <button id="btn-grid" class="active">Grid</button>
      <button id="btn-crop">Crop</button>
    </div>
    <div class="toolbar-group">
      <label class="toolbar-label">Tileset:</label>
      <select id="sel-tileset">
        <option value="overworld">overworld</option>
        <option value="interior">interior</option>
      </select>
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label" id="tile-count">${state.tiles.length} tiles</span>
    </div>
  `;

  const listEl = document.createElement('div');
  listEl.className = 'ts-list';

  const canvasEl = document.createElement('div');
  canvasEl.className = 'ts-canvas';

  const propsEl = document.createElement('div');
  propsEl.className = 'ts-props';

  const statusEl = document.createElement('div');
  statusEl.className = 'ts-status';
  statusEl.innerHTML = `
    <span id="s-pos">Pos: -</span>
    <span id="s-sel">Selection: -</span>
  `;

  root.appendChild(toolbarEl);
  root.appendChild(listEl);
  root.appendChild(canvasEl);
  root.appendChild(propsEl);
  root.appendChild(statusEl);

  // ── Init modules ──
  let currentTileset = 'overworld';
  const spritesheetViewport = new SpritesheetViewport(canvasEl, state, image);
  new TileList(listEl, state);
  const propertiesPanel = new PropertiesPanel(propsEl, state, image);

  /** Load an image src reliably, handling both cached and uncached cases. */
  function loadImageSrc(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
      const onLoad = () => { cleanup(); resolve(img); };
      const onError = () => { cleanup(); reject(new Error(`Failed to load tileset image: ${src}`)); };
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
      img.src = src;
      // Already cached — complete fires synchronously before onload would
      if (img.complete && img.naturalWidth > 0) { cleanup(); resolve(img); }
    });
  }

  /** Switch to a different tileset manifest + image. */
  async function switchTileset(name: string): Promise<void> {
    if (name === currentTileset) return;
    try {
      const manifest = await loadTilesetManifest(name);
      const newImage = await loadImageSrc(toAssetUrl(manifest.image as string));

      // Update viewport + panel with the new image BEFORE loadManifest fires
      // items-changed — so every render triggered by that event uses the correct PNG.
      state.imageWidth = newImage.naturalWidth;
      state.imageHeight = newImage.naturalHeight;
      spritesheetViewport.updateImage(newImage);
      propertiesPanel.updateImage(newImage);

      loadManifest(state, JSON.stringify(manifest));
      tilesetSelector.value = name;
      currentTileset = name;
    } catch (err) {
      console.error('Failed to switch tileset:', err);
    }
  }

  // ── Toolbar wiring ──

  // Tileset selector
  const tilesetSelector = toolbarEl.querySelector('#sel-tileset') as HTMLSelectElement;
  tilesetSelector.addEventListener('change', () => switchTileset(tilesetSelector.value));

  // File ops
  toolbarEl.querySelector('#btn-load')!.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (file) await loadManifestFromFile(state, file);
    });
    input.click();
  });
  toolbarEl.querySelector('#btn-save')!.addEventListener('click', async () => {
    try { await saveManifest(state); }
    catch (err) { if ((err as DOMException).name !== 'AbortError') console.error('Save failed:', err); }
  });
  toolbarEl.querySelector('#btn-copy')!.addEventListener('click', async () => {
    await copyManifest(state);
    alert('Copied to clipboard!');
  });

  // Zoom
  const zoomLabel = toolbarEl.querySelector('#zoom-label')!;
  toolbarEl.querySelector('#btn-zoom-out')!.addEventListener('click', () => {
    state.zoom = Math.max(0.5, state.zoom - 0.5);
    zoomLabel.textContent = state.zoom + 'x';
    state.emit('viewport-changed');
  });
  toolbarEl.querySelector('#btn-zoom-in')!.addEventListener('click', () => {
    state.zoom = Math.min(8, state.zoom + 0.5);
    zoomLabel.textContent = state.zoom + 'x';
    state.emit('viewport-changed');
  });

  // Grid toggle
  const btnGrid = toolbarEl.querySelector('#btn-grid') as HTMLElement;
  btnGrid.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    btnGrid.classList.toggle('active', state.showGrid);
    state.emit('viewport-changed');
  });

  // Crop mode toggle
  const btnCrop = toolbarEl.querySelector('#btn-crop') as HTMLElement;
  btnCrop.addEventListener('click', () => {
    state.cropMode = !state.cropMode;
    btnCrop.classList.toggle('active', state.cropMode);
    state.emit('crop-mode-changed');
  });

  // Tile count
  const tileCountEl = toolbarEl.querySelector('#tile-count')!;
  state.on('items-changed', () => {
    tileCountEl.textContent = `${state.tiles.length} tiles`;
  });

  // ── Status bar ──
  const sPos = document.getElementById('s-pos')!;
  const sSel = document.getElementById('s-sel')!;

  state.on('selection-changed', () => {
    if (state.selectionValid) {
      sSel.textContent = `Selection: (${state.selPixelX}, ${state.selPixelY}) ${state.selPixelW}×${state.selPixelH}px`;
    } else if (!state.multiSelectionValid) {
      sSel.textContent = 'Selection: -';
    }
  });

  state.on('multi-selection-changed', () => {
    if (state.multiSelectionValid) {
      sSel.textContent = `Multi-select: ${state.multiSelectedCells.size} cells (Ctrl+Click to add/remove)`;
    } else if (!state.selectionValid) {
      sSel.textContent = 'Selection: -';
    }
  });

  // Cursor position (polled since it updates very frequently)
  setInterval(() => {
    if (state.cursorCol >= 0) {
      sPos.textContent = `Pos: (${state.cursorCol * 16}, ${state.cursorRow * 16}) [col ${state.cursorCol}, row ${state.cursorRow}]`;
    }
  }, 100);

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveManifest(state);
    }
    if (e.key === 'Delete' && state.selectedIndex >= 0) {
      state.removeTile(state.selectedIndex);
    }
    if (e.key === 'Escape' && state.multiSelectionValid) {
      state.clearMultiSelection();
    }
    if (e.key === '=' || e.key === '+') {
      state.zoom = Math.min(8, state.zoom + 0.5);
      zoomLabel.textContent = state.zoom + 'x';
      state.emit('viewport-changed');
    }
    if (e.key === '-') {
      state.zoom = Math.max(0.5, state.zoom - 0.5);
      zoomLabel.textContent = state.zoom + 'x';
      state.emit('viewport-changed');
    }
  });
}

init().catch(console.error);
