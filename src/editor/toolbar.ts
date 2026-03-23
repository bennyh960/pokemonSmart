import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { ToolType } from './types.js';
import { categorizeTiles } from './tile-palette.js';
import { getKnownMapIds, loadMapFromProject, loadMapFromFile, downloadMap, copyMapToClipboard, createBlankMap } from './map-io.js';

export class Toolbar {
  constructor(container: HTMLElement, state: EditorState, history: HistoryManager, tileManifest: Record<string, unknown>) {
    container.innerHTML = `
      <div class="toolbar-group" data-group="tools">
        <button class="tool-btn active" data-tool="paint" title="Paint (B)">🖌 Paint</button>
        <button class="tool-btn" data-tool="erase" title="Erase (E)">🧹 Erase</button>
        <button class="tool-btn" data-tool="fill" title="Fill (G)">🪣 Fill</button>
        <button class="tool-btn" data-tool="select" title="Select (S)">🔍 Select</button>
        <button class="tool-btn" data-tool="npc" title="NPC (N)">👤 NPC</button>
        <button class="tool-btn" data-tool="transition" title="Transition (T)">🚪 Trans</button>
      </div>
      <div class="toolbar-group" data-group="file">
        <button id="btn-new" title="New Map">📄 New</button>
        <select id="sel-load" title="Load Map"><option value="">Load Map...</option></select>
        <button id="btn-load-file" title="Load from file">📂 File</button>
        <button id="btn-save" title="Save (Ctrl+S)">💾 Save</button>
        <button id="btn-copy" title="Copy JSON">📋 Copy</button>
      </div>
      <div class="toolbar-group" data-group="edit">
        <button id="btn-undo" title="Undo (Ctrl+Z)" disabled>↩ Undo</button>
        <button id="btn-redo" title="Redo (Ctrl+Shift+Z)" disabled>↪ Redo</button>
      </div>
      <div class="toolbar-group" data-group="view">
        <button id="btn-zoom-out" title="Zoom Out (-)">−</button>
        <span id="zoom-label" class="toolbar-label">2x</span>
        <button id="btn-zoom-in" title="Zoom In (+)">+</button>
        <button id="btn-grid" class="toggle-btn active" title="Toggle Grid (Ctrl+G)">Grid</button>
        <button id="btn-walk" class="toggle-btn" title="Walkability Overlay">Walk</button>
        <button id="btn-resize" title="Resize Map">↔ Resize</button>
        <button id="btn-meta" title="Map Settings">⚙ Settings</button>
      </div>
    `;

    // ── Tool buttons ──
    container.querySelector('[data-group="tools"]')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.tool-btn') as HTMLElement | null;
      if (!btn?.dataset.tool) return;
      state.setTool(btn.dataset.tool as ToolType);
    });

    state.on('tool-changed', () => {
      container.querySelectorAll('.tool-btn').forEach(b => {
        (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.tool === state.activeTool);
      });
    });

    // ── File ops ──
    const selLoad = container.querySelector('#sel-load') as HTMLSelectElement;
    for (const id of getKnownMapIds()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      selLoad.appendChild(opt);
    }
    selLoad.addEventListener('change', async () => {
      if (!selLoad.value) return;
      try {
        const data = await loadMapFromProject(selLoad.value);
        const cats = categorizeTiles(tileManifest as Record<string, never>);
        state.loadMap(data, cats);
        history.clear();
      } catch (err) { console.error('Failed to load map:', err); }
      selLoad.value = '';
    });

    container.querySelector('#btn-load-file')!.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const data = await loadMapFromFile(file);
          const cats = categorizeTiles(tileManifest as Record<string, never>);
          state.loadMap(data, cats);
          history.clear();
        } catch (err) { console.error('Failed to load file:', err); }
      });
      input.click();
    });

    container.querySelector('#btn-new')!.addEventListener('click', () => {
      const w = parseInt(prompt('Map width (tiles):', '25') || '25', 10);
      const h = parseInt(prompt('Map height (tiles):', '20') || '20', 10);
      if (w > 0 && h > 0) {
        const data = createBlankMap(w, h);
        const cats = categorizeTiles(tileManifest as Record<string, never>);
        state.loadMap(data, cats);
        history.clear();
      }
    });

    container.querySelector('#btn-save')!.addEventListener('click', () => downloadMap(state.mapData));
    container.querySelector('#btn-copy')!.addEventListener('click', async () => {
      await copyMapToClipboard(state.mapData);
      alert('Map JSON copied to clipboard!');
    });

    // ── Edit ──
    const btnUndo = container.querySelector('#btn-undo') as HTMLButtonElement;
    const btnRedo = container.querySelector('#btn-redo') as HTMLButtonElement;
    btnUndo.addEventListener('click', () => history.undo());
    btnRedo.addEventListener('click', () => history.redo());
    state.on('history-changed', () => {
      btnUndo.disabled = !history.canUndo();
      btnRedo.disabled = !history.canRedo();
    });

    // ── View ──
    const zoomLabel = container.querySelector('#zoom-label')!;
    container.querySelector('#btn-zoom-out')!.addEventListener('click', () => state.setZoom(state.zoom - 0.5));
    container.querySelector('#btn-zoom-in')!.addEventListener('click', () => state.setZoom(state.zoom + 0.5));
    state.on('viewport-changed', () => { zoomLabel.textContent = state.zoom + 'x'; });

    const btnGrid = container.querySelector('#btn-grid') as HTMLElement;
    btnGrid.addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      btnGrid.classList.toggle('active', state.showGrid);
      state.emit('viewport-changed');
    });

    const btnWalk = container.querySelector('#btn-walk') as HTMLElement;
    btnWalk.addEventListener('click', () => {
      state.showWalkability = !state.showWalkability;
      btnWalk.classList.toggle('active', state.showWalkability);
      state.emit('viewport-changed');
    });

    // ── Resize map ──
    container.querySelector('#btn-resize')!.addEventListener('click', () => {
      const md = state.mapData;
      const newW = parseInt(prompt('New width (tiles):', String(md.width)) || '', 10);
      const newH = parseInt(prompt('New height (tiles):', String(md.height)) || '', 10);
      if (!newW || !newH || newW < 1 || newH < 1) return;
      if (newW === md.width && newH === md.height) return;

      // Resize tiles grid
      const oldTiles = md.tiles;
      md.tiles = Array.from({ length: newH }, (_, y) =>
        Array.from({ length: newW }, (_, x) =>
          (y < oldTiles.length && x < (oldTiles[y]?.length ?? 0)) ? oldTiles[y][x] : 'grass'
        )
      );

      // Resize objectLayer if present
      if (md.objectLayer) {
        const oldObj = md.objectLayer;
        md.objectLayer = Array.from({ length: newH }, (_, y) =>
          Array.from({ length: newW }, (_, x) =>
            (y < oldObj.length && x < (oldObj[y]?.length ?? 0)) ? oldObj[y][x] : null
          )
        );
      }

      // Filter out objects that are now out of bounds
      if (md.objects) {
        md.objects = md.objects.filter(o => o.x < newW && o.y < newH);
      }

      md.width = newW;
      md.height = newH;
      // Clamp spawn
      md.spawn.x = Math.min(md.spawn.x, newW - 1);
      md.spawn.y = Math.min(md.spawn.y, newH - 1);

      state.emit('map-modified');
    });

    // ── Map metadata ──
    container.querySelector('#btn-meta')!.addEventListener('click', () => {
      const md = state.mapData;
      const newName = prompt('Map name:', md.name);
      if (newName !== null) md.name = newName;
      const newId = prompt('Map ID:', md.id || '');
      if (newId !== null) md.id = newId;
      const newMusic = prompt('Music track:', md.music || '');
      if (newMusic !== null) md.music = newMusic;
      const sx = prompt('Spawn X:', String(md.spawn.x));
      const sy = prompt('Spawn Y:', String(md.spawn.y));
      if (sx !== null && sy !== null) {
        md.spawn = { x: parseInt(sx, 10), y: parseInt(sy, 10) };
      }
      const enc = prompt('Encounter table ID (or empty for null):', md.encounterTableId || '');
      if (enc !== null) md.encounterTableId = enc || null;
      state.emit('map-modified');
    });
  }
}
