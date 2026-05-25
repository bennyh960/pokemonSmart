/**
 * Properties Panel — Right sidebar for map metadata and entity editing.
 */

import { editorState } from '../state/editor-state.js';
import type { MapData } from '../state/editor-state.js';
import { GAME_MAPS, loadGameMap } from '../io/map-browser.js';

const WEATHER_TYPES = ['rain', 'hail', 'sandstorm', 'sun'] as const;

export function createPropertiesPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'properties-panel';

  function render() {
    panel.innerHTML = '';
    const { map } = editorState;

    // ─── Map Properties ──────────────────────────────────────
    const mapSection = createSection('Map Properties');
    mapSection.appendChild(createField('ID', map.id, (v) => { map.id = v; }));
    mapSection.appendChild(createField('Name', map.name, (v) => { map.name = v; editorState.notify(); }));
    mapSection.appendChild(createField('Music', map.music, (v) => { map.music = v; }));
    mapSection.appendChild(createField('Encounters', map.encounterTableId, (v) => { map.encounterTableId = v; }));
    mapSection.appendChild(createReadonly('Size', `${map.width} × ${map.height}`));
    mapSection.appendChild(createReadonly('Spawn', `(${map.spawn.x}, ${map.spawn.y})`));
    mapSection.appendChild(createOutsideEditor(map, () => editorState.notify()));
    panel.appendChild(mapSection);

    // ─── Selected Entity ─────────────────────────────────────
    if (editorState.selectedEntityType === 'npc' && editorState.selectedEntityIndex >= 0) {
      const npc = map.npcs[editorState.selectedEntityIndex];
      if (npc) {
        const npcSection = createSection('NPC Properties');

        npcSection.appendChild(createField('ID', npc.id, (v) => { npc.id = v; }));
        npcSection.appendChild(createField('Name (EN)', (npc.name as unknown as { en: string; he: string } | undefined)?.en ?? '', (v) => { (npc as unknown as Record<string, unknown>).name = { en: v, he: (npc.name as unknown as { en: string; he: string } | undefined)?.he ?? v }; }));
        npcSection.appendChild(createNumberField('X', npc.x, (v) => { npc.x = v; editorState.notify(); }));
        npcSection.appendChild(createNumberField('Y', npc.y, (v) => { npc.y = v; editorState.notify(); }));

        npcSection.appendChild(createSelect('Facing', npc.facing,
          ['up', 'down', 'left', 'right'],
          (v) => { npc.facing = v as any; },
        ));

        npcSection.appendChild(createSelect('Type', npc.type,
          ['dialogue', 'trainer', 'shopkeeper', 'healer'],
          (v) => { npc.type = v as any; render(); },
        ));

        npcSection.appendChild(createSelect('Sprite', npc.spriteType,
          ['npc-male', 'npc-female', 'nurse', 'shopkeeper', 'trainer-m', 'trainer-f'],
          (v) => { npc.spriteType = v; },
        ));

        npcSection.appendChild(createTextarea('Dialogue', npc.dialogue.join('\n'),
          (v) => { npc.dialogue = v.split('\n').filter(Boolean); },
        ));

        if (npc.type === 'trainer') {
          npcSection.appendChild(createNumberField('Reward', npc.reward ?? 100,
            (v) => { npc.reward = v; },
          ));
          npcSection.appendChild(createNumberField('Line of Sight', npc.lineOfSight ?? 3,
            (v) => { npc.lineOfSight = v; },
          ));
          npcSection.appendChild(createTextarea('Party (id:level per line)',
            (npc.party ?? []).map((p) => `${p.pokemonId}:${p.level}`).join('\n'),
            (v) => {
              npc.party = v.split('\n').filter(Boolean).map((line) => {
                const [id, lvl] = line.split(':');
                return { pokemonId: Number(id), level: Number(lvl) || 5 };
              });
            },
          ));
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'prop-delete-btn';
        deleteBtn.textContent = 'Delete NPC';
        deleteBtn.addEventListener('click', () => {
          editorState.removeNPC(editorState.selectedEntityIndex);
        });
        npcSection.appendChild(deleteBtn);

        panel.appendChild(npcSection);
      }
    }

    if (editorState.selectedEntityType === 'warp' && editorState.selectedEntityIndex >= 0) {
      const warp = map.warps[editorState.selectedEntityIndex];
      if (warp) {
        const warpSection = createSection('Warp Properties');
        warpSection.appendChild(createReadonly('From', `(${warp.fromX}, ${warp.fromY})`));
        warpSection.appendChild(createNumberField('From X', warp.fromX, (v) => { warp.fromX = v; editorState.notify(); }));
        warpSection.appendChild(createNumberField('From Y', warp.fromY, (v) => { warp.fromY = v; editorState.notify(); }));

        // Target map selector with all known game maps
        const mapOptions = ['', ...GAME_MAPS.map((m) => m.id)];
        warpSection.appendChild(createSelect('To Map', warp.toMapId, mapOptions,
          (v) => { warp.toMapId = v; },
        ));
        warpSection.appendChild(createNumberField('To X', warp.toX, (v) => { warp.toX = v; }));
        warpSection.appendChild(createNumberField('To Y', warp.toY, (v) => { warp.toY = v; }));

        // "Go to target map" button
        if (warp.toMapId) {
          const goBtn = document.createElement('button');
          goBtn.className = 'toolbar-btn';
          goBtn.style.cssText = 'margin: 8px 10px; width: calc(100% - 20px);';
          goBtn.textContent = `Open "${warp.toMapId}" in editor`;
          goBtn.addEventListener('click', async () => {
            goBtn.textContent = 'Loading...';
            await loadGameMap(warp.toMapId);
          });
          warpSection.appendChild(goBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'prop-delete-btn';
        deleteBtn.textContent = 'Delete Warp';
        deleteBtn.addEventListener('click', () => {
          editorState.removeWarp(editorState.selectedEntityIndex);
        });
        warpSection.appendChild(deleteBtn);

        panel.appendChild(warpSection);
      }
    }

    // ─── Entity Lists ────────────────────────────────────────
    if (map.npcs.length > 0) {
      const listSection = createSection(`NPCs (${map.npcs.length})`);
      for (let i = 0; i < map.npcs.length; i++) {
        const npc = map.npcs[i];
        const item = document.createElement('div');
        item.className = 'prop-list-item' +
          (editorState.selectedEntityType === 'npc' && editorState.selectedEntityIndex === i ? ' selected' : '');
        item.textContent = `${npc.name || npc.id} (${npc.x},${npc.y})`;
        item.addEventListener('click', () => {
          editorState.selectedEntityType = 'npc';
          editorState.selectedEntityIndex = i;
          editorState.notify();
        });
        listSection.appendChild(item);
      }
      panel.appendChild(listSection);
    }

    if (map.warps.length > 0) {
      const listSection = createSection(`Warps (${map.warps.length})`);
      for (let i = 0; i < map.warps.length; i++) {
        const warp = map.warps[i];
        const item = document.createElement('div');
        item.className = 'prop-list-item' +
          (editorState.selectedEntityType === 'warp' && editorState.selectedEntityIndex === i ? ' selected' : '');
        item.textContent = `(${warp.fromX},${warp.fromY}) → ${warp.toMapId || '???'} (${warp.toX},${warp.toY})`;
        item.addEventListener('click', () => {
          editorState.selectedEntityType = 'warp';
          editorState.selectedEntityIndex = i;
          editorState.notify();
        });
        listSection.appendChild(item);
      }
      panel.appendChild(listSection);
    }
  }

  editorState.subscribe(render);
  render();
  return panel;
}

// ─── Helpers ─────────────────────────────────────────────────

function createSection(title: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'prop-section';
  const h = document.createElement('h3');
  h.textContent = title;
  section.appendChild(h);
  return section;
}

function createField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('change', () => onChange(input.value));
  row.appendChild(lbl);
  row.appendChild(input);
  return row;
}

function createNumberField(label: string, value: number, onChange: (v: number) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  input.addEventListener('change', () => onChange(Number(input.value)));
  row.appendChild(lbl);
  row.appendChild(input);
  return row;
}

function createSelect(label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const select = document.createElement('select');
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  row.appendChild(lbl);
  row.appendChild(select);
  return row;
}

function createTextarea(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row prop-row-full';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const ta = document.createElement('textarea');
  ta.rows = 3;
  ta.value = value;
  ta.addEventListener('change', () => onChange(ta.value));
  row.appendChild(lbl);
  row.appendChild(ta);
  return row;
}

function createReadonly(label: string, value: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('label');
  lbl.textContent = label;
  const span = document.createElement('span');
  span.className = 'prop-readonly';
  span.textContent = value;
  row.appendChild(lbl);
  row.appendChild(span);
  return row;
}

/**
 * Inline editor for the `outside` map property.
 * Mode select: Interior | Outdoor | Climate
 * Climate mode shows per-weather weight inputs + a live "clear %" readout.
 */
function createOutsideEditor(map: MapData, onChange: () => void): HTMLElement {
  const container = document.createElement('div');
  container.className = 'prop-row prop-row-full';
  container.style.cssText = 'flex-direction:column;gap:4px;';

  const header = document.createElement('label');
  header.textContent = 'Outside';
  header.style.cssText = 'font-weight:600;margin-bottom:2px;';
  container.appendChild(header);

  // Determine current mode
  const getMode = (): 'interior' | 'outdoor' | 'climate' => {
    if (map.outside == null) return 'interior';
    if (map.outside === true) return 'outdoor';
    return 'climate';
  };

  // Mode selector row
  const modeRow = document.createElement('div');
  modeRow.style.cssText = 'display:flex;gap:4px;';
  const modeSelect = document.createElement('select');
  modeSelect.style.cssText = 'flex:1;';
  for (const [val, lbl] of [['interior', 'Interior (no effects)'], ['outdoor', 'Outdoor (day/night only)'], ['climate', 'Outdoor + Weather']] as const) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = lbl;
    if (val === getMode()) o.selected = true;
    modeSelect.appendChild(o);
  }
  modeRow.appendChild(modeSelect);
  container.appendChild(modeRow);

  // Climate weights section (shown only in climate mode)
  const weightsDiv = document.createElement('div');
  weightsDiv.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding-left:8px;border-left:2px solid #384;';

  const clearInfo = document.createElement('div');
  clearInfo.style.cssText = 'font-size:10px;color:#8ab;margin-top:2px;';

  const updateClearInfo = () => {
    if (typeof map.outside !== 'object' || map.outside === null) return;
    const total = Object.values(map.outside as Record<string, number>).reduce((s, v) => s + v, 0);
    const clear = Math.max(0, 1 - total);
    clearInfo.textContent = `Clear: ~${Math.round(clear * 100)}%  (sun excluded at night)`;
  };

  const buildWeightInputs = () => {
    weightsDiv.innerHTML = '';
    const climate = (typeof map.outside === 'object' && map.outside !== null)
      ? (map.outside as Record<string, number>)
      : {};

    for (const wType of WEATHER_TYPES) {
      const wr = document.createElement('div');
      wr.style.cssText = 'display:flex;align-items:center;gap:6px;';
      const lbl = document.createElement('label');
      lbl.textContent = wType;
      lbl.style.cssText = 'width:68px;font-size:11px;text-transform:capitalize;';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '0';
      inp.max = '1';
      inp.step = '0.05';
      inp.style.cssText = 'width:60px;';
      inp.value = String(climate[wType] ?? 0);
      inp.addEventListener('input', () => {
        const val = Math.min(1, Math.max(0, parseFloat(inp.value) || 0));
        const c = (typeof map.outside === 'object' && map.outside !== null)
          ? (map.outside as Record<string, number>)
          : {};
        if (val === 0) delete c[wType];
        else c[wType] = val;
        map.outside = Object.keys(c).length > 0 ? c : {};
        updateClearInfo();
        onChange();
      });
      wr.appendChild(lbl);
      wr.appendChild(inp);
      weightsDiv.appendChild(wr);
    }
    weightsDiv.appendChild(clearInfo);
    updateClearInfo();
  };

  const refreshVisibility = () => {
    const mode = getMode();
    weightsDiv.style.display = mode === 'climate' ? 'flex' : 'none';
    weightsDiv.style.flexDirection = 'column';
  };

  modeSelect.addEventListener('change', () => {
    const m = modeSelect.value as 'interior' | 'outdoor' | 'climate';
    if (m === 'interior') map.outside = null;
    else if (m === 'outdoor') map.outside = true;
    else {
      map.outside = typeof map.outside === 'object' && map.outside !== null
        ? map.outside
        : {};
      buildWeightInputs();
    }
    refreshVisibility();
    onChange();
  });

  buildWeightInputs();
  refreshVisibility();
  container.appendChild(weightsDiv);
  return container;
}
