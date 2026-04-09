/**
 * Toolbar — Top bar with tools, zoom, grid toggle, map controls.
 */

import { editorState, type Tool } from '../state/editor-state.js';
import { exportMap, exportMapJson } from '../io/map-exporter.js';
import { importMap } from '../io/map-importer.js';
import { GAME_MAPS, loadGameMap } from '../io/map-browser.js';

export function createToolbar(): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'toolbar';

  // ─── Tools ─────────────────────────────────────────────────
  const toolGroup = createGroup('Tools');

  const tools: { tool: Tool; label: string; icon: string }[] = [
    { tool: 'paint', label: 'Paint', icon: 'P' },
    { tool: 'erase', label: 'Erase', icon: 'E' },
    { tool: 'fill', label: 'Fill', icon: 'F' },
    { tool: 'select', label: 'Select', icon: 'S' },
  ];

  const toolButtons: HTMLButtonElement[] = [];
  for (const t of tools) {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn' + (editorState.activeTool === t.tool ? ' active' : '');
    btn.textContent = `${t.icon} ${t.label}`;
    btn.title = t.label;
    btn.addEventListener('click', () => {
      editorState.activeTool = t.tool;
      editorState.notify();
    });
    toolButtons.push(btn);
    toolGroup.appendChild(btn);
  }
  bar.appendChild(toolGroup);

  // ─── Entity tools ──────────────────────────────────────────
  const entityGroup = createGroup('Entities');

  const entityTools: { tool: Tool; label: string }[] = [
    { tool: 'npc', label: '+ NPC' },
    { tool: 'warp', label: '+ Warp' },
    { tool: 'spawn', label: 'Set Spawn' },
  ];

  const entityButtons: HTMLButtonElement[] = [];
  for (const t of entityTools) {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn';
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      editorState.activeTool = t.tool;
      editorState.notify();
    });
    entityButtons.push(btn);
    entityGroup.appendChild(btn);
  }
  bar.appendChild(entityGroup);

  // ─── Undo / Redo ───────────────────────────────────────────
  const historyGroup = createGroup('History');
  const undoBtn = document.createElement('button');
  undoBtn.className = 'toolbar-btn';
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', () => editorState.undo());
  historyGroup.appendChild(undoBtn);

  const redoBtn = document.createElement('button');
  redoBtn.className = 'toolbar-btn';
  redoBtn.textContent = 'Redo';
  redoBtn.addEventListener('click', () => editorState.redo());
  historyGroup.appendChild(redoBtn);
  bar.appendChild(historyGroup);

  // ─── Zoom & Grid ───────────────────────────────────────────
  const viewGroup = createGroup('View');

  const zoomSelect = document.createElement('select');
  zoomSelect.className = 'toolbar-select';
  for (const z of [1, 2, 3, 4]) {
    const opt = document.createElement('option');
    opt.value = String(z);
    opt.textContent = `${z}x`;
    if (z === editorState.zoom) opt.selected = true;
    zoomSelect.appendChild(opt);
  }
  zoomSelect.addEventListener('change', () => {
    editorState.zoom = Number(zoomSelect.value);
    editorState.notify();
  });
  viewGroup.appendChild(zoomSelect);

  const gridCb = document.createElement('label');
  gridCb.className = 'toolbar-checkbox';
  const gridInput = document.createElement('input');
  gridInput.type = 'checkbox';
  gridInput.checked = editorState.showGrid;
  gridInput.addEventListener('change', () => {
    editorState.showGrid = gridInput.checked;
    editorState.notify();
  });
  gridCb.appendChild(gridInput);
  gridCb.appendChild(document.createTextNode(' Grid'));
  viewGroup.appendChild(gridCb);
  bar.appendChild(viewGroup);

  // ─── Map controls ──────────────────────────────────────────
  const mapGroup = createGroup('Map');

  // ── Browse existing game maps dropdown ──
  const browseSelect = document.createElement('select');
  browseSelect.className = 'toolbar-select';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Open Game Map...';
  defaultOpt.disabled = true;
  defaultOpt.selected = true;
  browseSelect.appendChild(defaultOpt);
  for (const m of GAME_MAPS) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    browseSelect.appendChild(opt);
  }
  browseSelect.addEventListener('change', async () => {
    const mapId = browseSelect.value;
    if (!mapId) return;
    browseSelect.disabled = true;
    browseSelect.options[0].textContent = 'Loading...';
    await loadGameMap(mapId);
    browseSelect.disabled = false;
    browseSelect.options[0].textContent = 'Open Game Map...';
    browseSelect.selectedIndex = 0;
  });
  mapGroup.appendChild(browseSelect);

  const newBtn = document.createElement('button');
  newBtn.className = 'toolbar-btn';
  newBtn.textContent = 'New Map';
  newBtn.addEventListener('click', () => {
    const id = prompt('Map ID (e.g., route-3):', 'new-map') || 'new-map';
    const name = prompt('Map Name:', 'New Map') || 'New Map';
    const w = Number(prompt('Width (tiles):', '15')) || 15;
    const h = Number(prompt('Height (tiles):', '10')) || 10;
    editorState.newMap(id, name, w, h);
  });
  mapGroup.appendChild(newBtn);

  const resizeBtn = document.createElement('button');
  resizeBtn.className = 'toolbar-btn';
  resizeBtn.textContent = 'Resize';
  resizeBtn.addEventListener('click', () => {
    const w = Number(prompt('New Width:', String(editorState.map.width)));
    const h = Number(prompt('New Height:', String(editorState.map.height)));
    if (w > 0 && h > 0) editorState.resizeMap(w, h);
  });
  mapGroup.appendChild(resizeBtn);

  const loadBtn = document.createElement('button');
  loadBtn.className = 'toolbar-btn';
  loadBtn.textContent = 'Load File';
  loadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      importMap(text);
    });
    input.click();
  });
  mapGroup.appendChild(loadBtn);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'toolbar-btn toolbar-btn-primary';
  saveBtn.textContent = 'Save JSON';
  saveBtn.addEventListener('click', () => exportMap());
  mapGroup.appendChild(saveBtn);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'toolbar-btn';
  copyBtn.textContent = 'Copy JSON';
  copyBtn.addEventListener('click', () => {
    const json = exportMapJson();
    navigator.clipboard.writeText(json).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1500);
    });
  });
  mapGroup.appendChild(copyBtn);

  bar.appendChild(mapGroup);

  // ─── Map info display ─────────────────────────────────────
  const infoSpan = document.createElement('span');
  infoSpan.className = 'toolbar-info';
  bar.appendChild(infoSpan);

  // Update on state changes
  editorState.subscribe(() => {
    // Update tool button states
    const allButtons = [...toolButtons, ...entityButtons];
    for (const btn of toolButtons) {
      const t = tools.find((t) => btn.textContent?.startsWith(t.icon));
      btn.classList.toggle('active', t?.tool === editorState.activeTool);
    }
    for (const btn of entityButtons) {
      const t = entityTools.find((et) => btn.textContent === et.label);
      btn.classList.toggle('active', t?.tool === editorState.activeTool);
    }
    // Update info
    const { map } = editorState;
    infoSpan.textContent = `${map.name} (${map.id}) — ${map.width}×${map.height} — ${map.npcs.length} NPCs, ${map.warps.length} warps`;
  });

  return bar;
}

function createGroup(label: string): HTMLElement {
  const group = document.createElement('div');
  group.className = 'toolbar-group';
  const lbl = document.createElement('span');
  lbl.className = 'toolbar-group-label';
  lbl.textContent = label;
  group.appendChild(lbl);
  return group;
}

