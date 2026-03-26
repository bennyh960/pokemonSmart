import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { ToolType } from './types.js';
import { categorizeTiles } from './tile-palette.js';
import { getKnownMapIds, loadMapFromProject, loadMapFromFile, saveMap, copyMapToClipboard, createBlankMap } from './map-io.js';
import { MUSIC_TRACK_KEYS } from '../audio/audio-manager.js';

export class Toolbar {
  constructor(container: HTMLElement, state: EditorState, history: HistoryManager, tileManifest: Record<string, unknown>) {
    container.innerHTML = `
      <div class="toolbar-group" data-group="tools">
        <button class="tool-btn active" data-tool="paint" title="Paint (B)">🖌 Paint</button>
        <button class="tool-btn" data-tool="erase" title="Erase (E)">🧹 Erase</button>
        <button class="tool-btn" data-tool="fill" title="Fill (G)">🪣 Fill</button>
        <button class="tool-btn" data-tool="eyedropper" title="Eyedropper (I) — Pick tile from map">💧 Pick</button>
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

    container.querySelector('#btn-save')!.addEventListener('click', async () => {
      try {
        await saveMap(state.mapData);
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') {
          console.error('Save failed:', err);
        }
      }
    });
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
          (y < oldTiles.length && x < (oldTiles[y]?.length ?? 0)) ? oldTiles[y][x] : 'g1'
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

    // ── Map metadata (modal) ──
    const MUSIC_OPTIONS = MUSIC_TRACK_KEYS;

    container.querySelector('#btn-meta')!.addEventListener('click', () => {
      // Remove existing modal if any
      document.querySelector('.modal-backdrop.settings-modal')?.remove();

      const md = state.mapData;
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop settings-modal';

      const musicOpts = MUSIC_OPTIONS.map(k =>
        `<option value="${k}"${(md.music || 'town') === k ? ' selected' : ''}>${k}</option>`
      ).join('');

      backdrop.innerHTML = `
        <div class="modal-dialog">
          <h2>Map Settings</h2>
          <div class="prop-row"><label>Name</label><input id="ms-name" type="text" value="${md.name || ''}"></div>
          <div class="prop-row"><label>ID</label><input id="ms-id" type="text" value="${md.id || ''}"></div>
          <div class="prop-row"><label>Music</label><select id="ms-music">${musicOpts}</select></div>
          <div class="prop-row"><label>Spawn X</label><input id="ms-sx" type="number" value="${md.spawn.x}" min="0"></div>
          <div class="prop-row"><label>Spawn Y</label><input id="ms-sy" type="number" value="${md.spawn.y}" min="0"></div>
          <div class="prop-row"><label>Encounter</label><input id="ms-enc" type="text" value="${md.encounterTableId || ''}" placeholder="table ID or empty"></div>
          <div class="modal-actions">
            <button id="ms-cancel">Cancel</button>
            <button id="ms-ok" class="primary">OK</button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      const close = () => backdrop.remove();

      // Close on backdrop click
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
      });

      // Close on Escape
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);

      backdrop.querySelector('#ms-cancel')!.addEventListener('click', close);

      backdrop.querySelector('#ms-ok')!.addEventListener('click', () => {
        md.name = (backdrop.querySelector('#ms-name') as HTMLInputElement).value;
        md.id = (backdrop.querySelector('#ms-id') as HTMLInputElement).value;
        md.music = (backdrop.querySelector('#ms-music') as HTMLSelectElement).value;
        md.spawn.x = parseInt((backdrop.querySelector('#ms-sx') as HTMLInputElement).value, 10) || 0;
        md.spawn.y = parseInt((backdrop.querySelector('#ms-sy') as HTMLInputElement).value, 10) || 0;
        const enc = (backdrop.querySelector('#ms-enc') as HTMLInputElement).value.trim();
        md.encounterTableId = enc || null;
        state.emit('map-modified');
        close();
        document.removeEventListener('keydown', onKey);
      });

      // Focus first field
      (backdrop.querySelector('#ms-name') as HTMLInputElement).focus();
    });
  }
}
