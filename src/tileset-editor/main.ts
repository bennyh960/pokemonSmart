import { TilesetEditorState } from './editor-state.js';
import { SpritesheetViewport } from './spritesheet-viewport.js';
import { TileList } from './tile-list.js';
import { PropertiesPanel } from './properties-panel.js';
import { saveManifest, copyManifest, loadManifestFromFile, loadManifest } from './io.js';
import './style.css';

// Load existing dpp.json to pre-populate
import dppManifestRaw from '../data/tilesets/dpp.json';

async function init() {
  const state = new TilesetEditorState();

  // Load tileset image
  const image = new Image();
  image.src = state.imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      resolve();
    };
    image.onerror = () => reject(new Error('Failed to load tileset image'));
  });

  // Pre-load existing manifest (old format → auto-migrated)
  loadManifest(state, JSON.stringify(dppManifestRaw));

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
  new SpritesheetViewport(canvasEl, state, image);
  new TileList(listEl, state);
  new PropertiesPanel(propsEl, state, image);

  // ── Toolbar wiring ──

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
    } else {
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
