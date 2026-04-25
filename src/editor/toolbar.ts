import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { ToolType, TileMapData } from './types.js';
import { categorizeTiles } from './tile-palette.js';
import {
  getKnownTemplateIds,
  loadMapFromProject,
  loadTemplateFromProject,
  saveMap,
  copyMapToClipboard,
  createBlankMap,
} from './map-io.js';
import { GAME_MAPS, KNOWN_FOLDERS } from './io/map-browser.js';
import { MUSIC_TRACK_KEYS } from '../audio/audio-manager.js';

export type EditorMode = 'map' | 'template';

export interface ToolbarCallbacks {
  onLoadMap?: (data: TileMapData) => Promise<void>;
  onSave?: () => Promise<void>;
  onModeChange?: (mode: EditorMode) => void;
}

export class Toolbar {
  constructor(
    container: HTMLElement,
    state: EditorState,
    history: HistoryManager,
    tileManifest: Record<string, unknown>,
    callbacks: ToolbarCallbacks = {},
  ) {
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
        <span class="mode-toggle">
          <button class="mode-btn active" data-mode="map" title="Edit maps">Maps</button>
          <button class="mode-btn" data-mode="template" title="Edit templates">Templates</button>
        </span>
        <button id="btn-new" title="New Map">📄 New</button>
        <input id="sel-load" list="sel-load-list" placeholder="Load Map..." autocomplete="off" title="Load Map" style="width:120px">
        <datalist id="sel-load-list"></datalist>
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

    // ── Mode toggle ──
    let currentMode: EditorMode = 'map';
    const selLoad = container.querySelector('#sel-load') as HTMLInputElement;
    const selLoadList = container.querySelector('#sel-load-list') as HTMLDataListElement;
    const btnNew = container.querySelector('#btn-new') as HTMLButtonElement;
    // const btnLoadFile = container.querySelector('#btn-load-file') as HTMLButtonElement;

    // Maps label (e.g. "minusburg#gym") → actual map ID
    let labelToId = new Map<string, string>();

    const populateLoadSelect = (mode: EditorMode) => {
      selLoad.placeholder = mode === 'map' ? 'Load Map...' : 'Load Template...';
      selLoad.value = '';
      labelToId.clear();
      selLoadList.innerHTML = '';
      if (mode === 'map') {
        for (const { id, label } of GAME_MAPS) {
          const opt = document.createElement('option');
          opt.value = label;
          labelToId.set(label, id);
          selLoadList.appendChild(opt);
        }
      } else {
        for (const id of getKnownTemplateIds()) {
          const opt = document.createElement('option');
          opt.value = id;
          labelToId.set(id, id);
          selLoadList.appendChild(opt);
        }
      }
    };
    populateLoadSelect('map');

    container.querySelector('.mode-toggle')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.mode-btn') as HTMLElement | null;
      if (!btn?.dataset.mode) return;
      const mode = btn.dataset.mode as EditorMode;
      if (mode === currentMode) return;
      currentMode = mode;
      container
        .querySelectorAll('.mode-btn')
        .forEach((b) => (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.mode === mode));
      populateLoadSelect(mode);
      btnNew.textContent = mode === 'map' ? '📄 New' : '📄 New Tmpl';
      btnNew.title = mode === 'map' ? 'New Map' : 'New blank template';
      // btnLoadFile.style.display = mode === 'map' ? '' : 'none';
      callbacks.onModeChange?.(mode);
    });

    // ── Tool buttons ──
    container.querySelector('[data-group="tools"]')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.tool-btn') as HTMLElement | null;
      if (!btn?.dataset.tool) return;
      state.setTool(btn.dataset.tool as ToolType);
    });
    state.on('tool-changed', () => {
      container.querySelectorAll('.tool-btn').forEach((b) => {
        (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.tool === state.activeTool);
      });
    });

    // ── Load (map or template depending on mode) ──
    const doLoad = callbacks.onLoadMap
      ? callbacks.onLoadMap
      : async (data: TileMapData) => {
          const cats = categorizeTiles(tileManifest as Record<string, never>);
          state.loadMap(data, cats);
          history.clear();
        };

    selLoad.addEventListener('change', async () => {
      const raw = selLoad.value.trim();
      if (!raw) return;
      const id = labelToId.get(raw);
      if (!id) return;
      try {
        const data = currentMode === 'template' ? await loadTemplateFromProject(id) : await loadMapFromProject(id);
        await doLoad(data);
      } catch (err) {
        console.error('Failed to load:', err);
      }
      selLoad.value = '';
    });

    // btnLoadFile.addEventListener('click', () => {
    //   const input = document.createElement('input');
    //   input.type = 'file';
    //   input.accept = '.json';
    //   input.addEventListener('change', async () => {
    //     const file = input.files?.[0];
    //     if (!file) return;
    //     try { await doLoad(await loadMapFromFile(file)); }
    //     catch (err) { console.error('Failed to load file:', err); }
    //   });
    //   input.click();
    // });

    btnNew.addEventListener('click', () => {
      if (currentMode === 'template') {
        const w = parseInt(prompt('Template width (tiles):', '20') || '20', 10);
        const h = parseInt(prompt('Template height (tiles):', '15') || '15', 10);
        if (w > 0 && h > 0) {
          const data = createBlankMap(w, h);
          data.id = 'new-template';
          data.name = 'new-template';
          const cats = categorizeTiles(tileManifest as Record<string, never>);
          state.loadMap(data, cats);
          history.clear();
        }
        return;
      }

      // ── New Map modal ──────────────────────────────────────────────────────
      document.querySelector('.modal-backdrop.new-map-modal')?.remove();
      const folderOpts = ['', ...KNOWN_FOLDERS]
        .map(f => `<option value="${f}">${f || '(root)'}</option>`)
        .join('');

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop new-map-modal';
      backdrop.innerHTML = `
        <div class="modal-dialog">
          <h2>New Map</h2>
          <div class="prop-row"><label>Folder</label><select id="nm-folder">${folderOpts}</select></div>
          <div class="prop-row"><label>Map ID</label><input id="nm-id" type="text" placeholder="e.g. minusburg-house-3" autocomplete="off"></div>
          <div class="prop-row"><label>Width</label><input id="nm-w" type="number" value="25" min="1" max="200"></div>
          <div class="prop-row"><label>Height</label><input id="nm-h" type="number" value="20" min="1" max="200"></div>
          <div class="modal-actions">
            <button id="nm-cancel">Cancel</button>
            <button id="nm-ok" class="primary">Create</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const closeModal = () => backdrop.remove();
      backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
      backdrop.querySelector('#nm-cancel')!.addEventListener('click', closeModal);

      backdrop.querySelector('#nm-ok')!.addEventListener('click', () => {
        const folder = (backdrop.querySelector('#nm-folder') as HTMLSelectElement).value;
        const mapId = (backdrop.querySelector('#nm-id') as HTMLInputElement).value.trim() || 'new-map';
        const w = parseInt((backdrop.querySelector('#nm-w') as HTMLInputElement).value, 10) || 25;
        const h = parseInt((backdrop.querySelector('#nm-h') as HTMLInputElement).value, 10) || 20;
        if (w < 1 || h < 1) return;

        const data = createBlankMap(w, h);
        data.id = folder ? `${folder}/${mapId}` : mapId;
        const cats = categorizeTiles(tileManifest as Record<string, never>);
        state.loadMap(data, cats);
        history.clear();
        closeModal();
        document.removeEventListener('keydown', onKey);
      });

      (backdrop.querySelector('#nm-id') as HTMLInputElement).focus();
    });

    // ── Save ──
    container.querySelector('#btn-save')!.addEventListener('click', async () => {
      try {
        if (callbacks.onSave) await callbacks.onSave();
        else await saveMap(state.mapData);
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') console.error('Save failed:', err);
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
    state.on('viewport-changed', () => {
      zoomLabel.textContent = state.zoom + 'x';
    });

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
      if ((state.mapData as unknown as Record<string, unknown>).template) {
        alert(
          `This map uses template "${(state.mapData as unknown as Record<string, unknown>).template}" — dimensions are fixed by the template.\nLoad the template to resize it.`,
        );
        return;
      }
      const md = state.mapData;
      const newW = parseInt(prompt('New width (tiles):', String(md.width)) || '', 10);
      const newH = parseInt(prompt('New height (tiles):', String(md.height)) || '', 10);
      if (!newW || !newH || newW < 1 || newH < 1) return;
      if (newW === md.width && newH === md.height) return;

      const oldTiles = md.tiles;
      md.tiles = Array.from({ length: newH }, (_, y) =>
        Array.from({ length: newW }, (_, x) =>
          y < oldTiles.length && x < (oldTiles[y]?.length ?? 0) ? oldTiles[y][x] : 'g1',
        ),
      );
      if (md.objectLayer) {
        const oldObj = md.objectLayer;
        md.objectLayer = Array.from({ length: newH }, (_, y) =>
          Array.from({ length: newW }, (_, x) =>
            y < oldObj.length && x < (oldObj[y]?.length ?? 0) ? oldObj[y][x] : null,
          ),
        );
      }
      if (md.objects) md.objects = md.objects.filter((o) => o.x < newW && o.y < newH);
      md.width = newW;
      md.height = newH;
      md.spawn.x = Math.min(md.spawn.x, newW - 1);
      md.spawn.y = Math.min(md.spawn.y, newH - 1);
      state.emit('map-modified');
    });

    // ── Map metadata (modal) ──
    const MUSIC_OPTIONS = MUSIC_TRACK_KEYS;

    container.querySelector('#btn-meta')!.addEventListener('click', () => {
      document.querySelector('.modal-backdrop.settings-modal')?.remove();

      const md = state.mapData;
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop settings-modal';

      const musicOpts = MUSIC_OPTIONS.map(
        (k) => `<option value="${k}"${(md.music || 'town') === k ? ' selected' : ''}>${k}</option>`,
      ).join('');

      const labelEn = md.label?.en ?? '';
      const labelHe = md.label?.he ?? '';
      backdrop.innerHTML = `
        <div class="modal-dialog">
          <h2>Map Settings</h2>
          <div class="prop-row"><label>File / ID</label><input id="ms-id" type="text" value="${md.id || ''}"></div>
          <div class="prop-row" style="border-top:1px solid #333;margin-top:6px;padding-top:6px">
            <label>Label EN</label><input id="ms-label-en" type="text" value="${labelEn}" placeholder="English display name">
          </div>
          <div class="prop-row"><label>Label HE</label><input id="ms-label-he" type="text" value="${labelHe}" placeholder="שם בעברית" dir="rtl"></div>
          <div class="prop-row" style="border-top:1px solid #333;margin-top:6px;padding-top:6px">
            <label>Music</label><select id="ms-music">${musicOpts}</select>
          </div>
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
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
      });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          close();
          document.removeEventListener('keydown', onKey);
        }
      };
      document.addEventListener('keydown', onKey);
      backdrop.querySelector('#ms-cancel')!.addEventListener('click', close);

      backdrop.querySelector('#ms-ok')!.addEventListener('click', () => {
        md.id = (backdrop.querySelector('#ms-id') as HTMLInputElement).value;
        const en = (backdrop.querySelector('#ms-label-en') as HTMLInputElement).value.trim();
        const he = (backdrop.querySelector('#ms-label-he') as HTMLInputElement).value.trim();
        if (en || he) md.label = { en, he };
        else delete (md as unknown as Record<string, unknown>).label;
        md.music = (backdrop.querySelector('#ms-music') as HTMLSelectElement).value;
        md.spawn.x = parseInt((backdrop.querySelector('#ms-sx') as HTMLInputElement).value, 10) || 0;
        md.spawn.y = parseInt((backdrop.querySelector('#ms-sy') as HTMLInputElement).value, 10) || 0;
        const enc = (backdrop.querySelector('#ms-enc') as HTMLInputElement).value.trim();
        md.encounterTableId = enc || null;
        state.emit('map-modified');
        close();
        document.removeEventListener('keydown', onKey);
      });

      (backdrop.querySelector('#ms-name') as HTMLInputElement).focus();
    });
  }
}
