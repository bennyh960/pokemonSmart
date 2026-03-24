import { SpriteEditorState } from './editor-state.js';
import { SpritesheetViewport } from './spritesheet-viewport.js';
import { SpriteList } from './sprite-list.js';
import { PropertiesPanel } from './properties-panel.js';
import { saveManifest, copyManifest, loadManifestFromFile, loadManifest } from './io.js';
import './style.css';

async function init() {
  const state = new SpriteEditorState();

  // ── Image loading ──
  // Check URL params for image path, otherwise prompt
  const params = new URLSearchParams(window.location.search);
  const imgParam = params.get('image');

  let imageSrc = imgParam || '/sprites/characters/characters_overworld.png';

  // Allow user to load a different image via toolbar
  state.imageSrc = imageSrc;

  const image = new Image();
  image.src = state.imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      resolve();
    };
    image.onerror = () => reject(new Error('Failed to load spritesheet image: ' + state.imageSrc));
  });

  // Try to pre-load existing manifest
  const manifestParam = params.get('manifest');
  if (manifestParam) {
    try {
      const resp = await fetch(manifestParam);
      if (resp.ok) {
        const json = await resp.text();
        loadManifest(state, json);
      }
    } catch { /* no existing manifest — that's fine */ }
  }

  // ── Build DOM ──
  const root = document.getElementById('editor-root')!;

  const toolbarEl = document.createElement('div');
  toolbarEl.className = 'ts-toolbar';
  toolbarEl.innerHTML = `
    <div class="toolbar-group">
      <button id="btn-load-img">Load Image</button>
      <button id="btn-load">Load JSON</button>
      <button id="btn-load-game">Load from Game</button>
      <button id="btn-save">Save</button>
      <button id="btn-copy">Copy JSON</button>
    </div>
    <div class="toolbar-group">
      <button id="btn-zoom-out">&minus;</button>
      <span class="toolbar-label" id="zoom-label">2x</span>
      <button id="btn-zoom-in">+</button>
      <button id="btn-grid" class="active">Grid</button>
      <button id="btn-crop">Crop</button>
    </div>
    <div class="toolbar-group">
      <label style="color:#888;font-size:12px;">Grid:</label>
      <input id="grid-size" type="number" value="32" min="1" max="128"
        style="width:50px;background:#2a2a44;color:#ddd;border:1px solid #444;border-radius:3px;padding:2px 4px;font-size:12px;" />
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label" id="sprite-count">${state.sprites.length} sprites</span>
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
  let viewport = new SpritesheetViewport(canvasEl, state, image);
  new SpriteList(listEl, state);
  new PropertiesPanel(propsEl, state, image);

  // ── Toolbar wiring ──

  // Load image
  toolbarEl.querySelector('#btn-load-img')!.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      image.src = url;
      await new Promise<void>(r => { image.onload = () => r(); });
      state.imageSrc = url;
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;
      // Rebuild viewport
      viewport.destroy();
      canvasEl.innerHTML = '';
      viewport = new SpritesheetViewport(canvasEl, state, image);
      state.emit('viewport-changed');
    });
    input.click();
  });

  // Load JSON
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

  // Load from Game — fetch characters.json from data/sprites and load its image
  toolbarEl.querySelector('#btn-load-game')!.addEventListener('click', async () => {
    try {
      const jsonPath = '/src/data/sprites/characters.json';
      const resp = await fetch(jsonPath);
      if (!resp.ok) throw new Error(`Failed to fetch ${jsonPath}: ${resp.status}`);
      const json = await resp.text();
      const data = JSON.parse(json);

      // Load the spritesheet image referenced in the manifest
      const imgPath = data.image || '/sprites/characters/characters_overworld.png';
      image.src = imgPath;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Failed to load image: ' + imgPath));
      });
      state.imageSrc = imgPath;
      state.imageWidth = image.naturalWidth;
      state.imageHeight = image.naturalHeight;

      // Load the manifest data
      loadManifest(state, json);

      // Rebuild viewport with new image
      viewport.destroy();
      canvasEl.innerHTML = '';
      viewport = new SpritesheetViewport(canvasEl, state, image);
      state.emit('viewport-changed');
    } catch (err) {
      alert('Failed to load from game: ' + (err as Error).message);
    }
  });

  // Save
  toolbarEl.querySelector('#btn-save')!.addEventListener('click', async () => {
    try { await saveManifest(state); }
    catch (err) { if ((err as DOMException).name !== 'AbortError') console.error('Save failed:', err); }
  });

  // Copy
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

  // Grid size
  const gridSizeInput = toolbarEl.querySelector('#grid-size') as HTMLInputElement;
  gridSizeInput.addEventListener('change', () => {
    const val = parseInt(gridSizeInput.value) || 16;
    state.gridSize = Math.max(1, Math.min(128, val));
    gridSizeInput.value = String(state.gridSize);
    state.emit('viewport-changed');
  });

  // Sprite count
  const spriteCountEl = toolbarEl.querySelector('#sprite-count')!;
  state.on('items-changed', () => {
    spriteCountEl.textContent = `${state.sprites.length} sprites`;
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

  setInterval(() => {
    if (state.cursorCol >= 0) {
      const gs = state.gridSize;
      sPos.textContent = `Pos: (${state.cursorCol * gs}, ${state.cursorRow * gs}) [col ${state.cursorCol}, row ${state.cursorRow}]`;
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
      state.removeSprite(state.selectedIndex);
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
