/**
 * Map Editor — Entry point.
 * Loads all tilesets, creates UI panels, wires up keyboard shortcuts.
 */

import { createPalettePanel } from './components/palette-panel.js';
import { createMapCanvas } from './components/map-canvas.js';
import { createToolbar } from './components/toolbar.js';
import { createPropertiesPanel } from './components/properties-panel.js';
import { editorState } from './state/editor-state.js';
import { TILESETS } from './tile-catalog.js';
import { parseManifest, type AtlasCatalog } from '../engine/object-catalog.js';
import './editor-style.css';

/** Map of tileset ID → loaded HTMLImageElement */
export type TilesetImages = Record<string, HTMLImageElement>;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

async function init() {
  const app = document.getElementById('editor-app')!;
  app.innerHTML = '<div class="editor-loading">Loading tilesets...</div>';

  // Load all tileset images in parallel
  const tilesetImages: TilesetImages = {};
  const results = await Promise.allSettled(
    TILESETS.map(async (ts) => {
      const img = await loadImage(ts.path);
      return { id: ts.id, img };
    }),
  );

  let loadedCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      tilesetImages[result.value.id] = result.value.img;
      loadedCount++;
    } else {
      console.warn('[editor] Tileset failed to load:', result.reason);
    }
  }

  if (loadedCount === 0) {
    app.innerHTML = '<div class="editor-loading" style="color:#f66">No tilesets could be loaded</div>';
    return;
  }

  // Load atlas manifest for object rendering
  let atlasCatalog: AtlasCatalog | null = null;
  try {
    const manifestJson = await fetch('/sprites/overworld/tileset-grid.json').then(r => r.json());
    atlasCatalog = parseManifest(manifestJson);
    console.log(`[editor] Atlas manifest loaded: ${atlasCatalog.objects.size} objects`);
  } catch (e) {
    console.warn('[editor] Atlas manifest not loaded:', e);
  }

  app.innerHTML = '';

  // Create layout
  const toolbar = createToolbar();
  const palette = createPalettePanel(tilesetImages);
  const { container: mapContainer, render } = createMapCanvas(tilesetImages, atlasCatalog);
  const properties = createPropertiesPanel();

  const main = document.createElement('div');
  main.className = 'editor-main';
  main.appendChild(palette);
  main.appendChild(mapContainer);
  main.appendChild(properties);

  app.appendChild(toolbar);
  app.appendChild(main);

  render();

  // ─── Keyboard shortcuts ──────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      e.shiftKey ? editorState.redo() : editorState.undo();
    }

    switch (e.key.toLowerCase()) {
      case 'p': editorState.activeTool = 'paint'; editorState.notify(); break;
      case 'e': editorState.activeTool = 'erase'; editorState.notify(); break;
      case 'f': editorState.activeTool = 'fill'; editorState.notify(); break;
      case 's':
        if (!e.ctrlKey) { editorState.activeTool = 'select'; editorState.notify(); }
        break;
      case 'g': editorState.showGrid = !editorState.showGrid; editorState.notify(); break;
      case '1': editorState.zoom = 1; editorState.notify(); break;
      case '2': editorState.zoom = 2; editorState.notify(); break;
      case '3': editorState.zoom = 3; editorState.notify(); break;
      case '4': editorState.zoom = 4; editorState.notify(); break;
    }
  });

  console.log(`[map-editor] Ready — ${loadedCount}/${TILESETS.length} tilesets loaded`);
}

init().catch((err) => {
  console.error('[map-editor] Failed to initialize:', err);
  document.getElementById('editor-app')!.innerHTML =
    `<div class="editor-loading" style="color:#f66">Failed to load: ${err.message}</div>`;
});
