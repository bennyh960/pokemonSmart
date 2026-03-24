import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { TileDef, NPCData, MapTransition } from './types.js';
import { getCharacterList } from '../engine/character-sprites.js';

export class PropertiesPanel {
  private container: HTMLElement;
  private state: EditorState;
  // @ts-expect-error Reserved for future use (undo on property edits)
  private _history: HistoryManager;
  private tiles: Record<string, TileDef>;

  constructor(container: HTMLElement, state: EditorState, history: HistoryManager, tiles: Record<string, TileDef>) {
    this.container = container;
    this.state = state;
    this._history = history;
    this.tiles = tiles;

    state.on('selection-changed', () => this.refresh());
    state.on('map-modified', () => this.refresh());
    state.on('map-loaded', () => this.refresh());
    this.refresh();
  }

  private refresh(): void {
    this.container.innerHTML = '';
    const { selectedCellX: cx, selectedCellY: cy, selectedNpcId, selectedTransitionIndex } = this.state;

    // ── Selected cell ──
    if (cx !== null && cy !== null) {
      this.renderCellProps(cx, cy);
    }

    // ── Selected NPC ──
    if (selectedNpcId !== null) {
      const npc = this.state.mapData.npcs?.find(n => n.id === selectedNpcId);
      if (npc) this.renderNpcProps(npc);
    }

    // ── Selected transition ──
    if (selectedTransitionIndex !== null) {
      const tr = this.state.mapData.transitions?.[selectedTransitionIndex];
      if (tr) this.renderTransitionProps(tr, selectedTransitionIndex);
    }

    // ── NPC list ──
    this.renderNpcList();

    // ── Transition list ──
    this.renderTransitionList();
  }

  private renderCellProps(cx: number, cy: number): void {
    const ground = this.state.getGroundTile(cx, cy);
    const obj = this.state.getObjectTile(cx, cy);
    const def = typeof ground === 'string' ? this.tiles[ground] : null;

    const section = this.makeSection('Cell Properties');
    section.innerHTML += `
      <div class="prop-row"><label>Position:</label><span>(${cx}, ${cy})</span></div>
      <div class="prop-row"><label>Ground:</label><span>${String(ground)}</span></div>
      <div class="prop-row"><label>Object:</label><span>${obj ?? 'none'}</span></div>
      <div class="prop-row"><label>Size:</label><span>${def ? `${def.w}×${def.h}` : '?'}px</span></div>
      <div class="prop-row"><label>Walkable:</label><span>${def?.walkable ?? '?'}</span></div>
      <div class="prop-row"><label>Encounter:</label><span>${def?.encounter ?? false}</span></div>
      <div class="prop-row"><label>Above:</label><span>${def?.above ?? false}</span></div>
    `;
    this.container.appendChild(section);
  }

  private renderNpcProps(npc: NPCData): void {
    const section = this.makeSection(`NPC: ${npc.id}`);
    const npcAny = npc as unknown as Record<string, unknown>;
    const emit = () => this.state.emit('map-modified');

    // Helper: add a text/number input row
    const addInput = (label: string, key: string, value: string, type = 'text') => {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<label>${label}:</label>`;
      const input = document.createElement('input');
      input.type = type;
      input.value = value;
      input.addEventListener('change', () => {
        npcAny[key] = type === 'number' ? parseInt(input.value, 10) : input.value;
        emit();
      });
      row.appendChild(input);
      section.appendChild(row);
    };

    // Helper: add a select row
    const addSelect = (label: string, key: string, options: string[], current: string) => {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<label>${label}:</label>`;
      const sel = document.createElement('select');
      for (const o of options) {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o;
        if (o === current) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => { npcAny[key] = sel.value; emit(); });
      row.appendChild(sel);
      section.appendChild(row);
    };

    // Basic fields
    addInput('ID', 'id', npc.id);
    addInput('Name', 'name', npc.name || '');
    addInput('X', 'x', String(npc.x), 'number');
    addInput('Y', 'y', String(npc.y), 'number');
    addSelect('Facing', 'facing', ['up', 'down', 'left', 'right'], npc.facing);
    addSelect('Type', 'type', ['dialogue', 'trainer', 'shopkeeper', 'healer'], npc.type);

    // ── Sprite dropdown (from characters.json) ──
    const spriteRow = document.createElement('div');
    spriteRow.className = 'prop-row';
    spriteRow.innerHTML = '<label>Sprite:</label>';
    const spriteSel = document.createElement('select');
    // Add current value as fallback option if not in character list
    const charList = getCharacterList();
    let foundCurrent = false;
    for (const [category, chars] of charList) {
      const group = document.createElement('optgroup');
      group.label = category;
      for (const c of chars) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.id})`;
        if (c.id === npc.spriteType) { opt.selected = true; foundCurrent = true; }
        group.appendChild(opt);
      }
      spriteSel.appendChild(group);
    }
    if (!foundCurrent) {
      const opt = document.createElement('option');
      opt.value = npc.spriteType;
      opt.textContent = `${npc.spriteType} (legacy)`;
      opt.selected = true;
      spriteSel.prepend(opt);
    }
    spriteSel.addEventListener('change', () => { npc.spriteType = spriteSel.value; emit(); });
    spriteRow.appendChild(spriteSel);
    section.appendChild(spriteRow);

    // Dialogue
    const diaRow = document.createElement('div');
    diaRow.className = 'prop-row';
    diaRow.innerHTML = '<label>Dialogue:</label>';
    const ta = document.createElement('textarea');
    ta.value = npc.dialogue.join('\n');
    ta.rows = 3;
    ta.addEventListener('change', () => {
      npc.dialogue = ta.value.split('\n').filter(l => l.trim());
      emit();
    });
    diaRow.appendChild(ta);
    section.appendChild(diaRow);

    // ── Auto Walk ──
    this.renderAutoWalkUI(section, npc);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete NPC';
    delBtn.addEventListener('click', () => {
      const npcs = this.state.mapData.npcs || [];
      const idx = npcs.indexOf(npc);
      if (idx >= 0) npcs.splice(idx, 1);
      this.state.selectNpc(null);
      emit();
    });
    section.appendChild(delBtn);
    this.container.appendChild(section);
  }

  private renderAutoWalkUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const aw = npc.autoWalk;

    // Enable checkbox
    const enableRow = document.createElement('div');
    enableRow.className = 'prop-row';
    enableRow.innerHTML = '<label>Auto Walk:</label>';
    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.checked = !!aw;
    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        npc.autoWalk = {};
      } else {
        npc.autoWalk = null;
      }
      emit();
    });
    enableRow.appendChild(enableCb);
    section.appendChild(enableRow);

    if (!aw) return;

    // Horizontal axis
    const hRow = document.createElement('div');
    hRow.className = 'prop-row';
    hRow.innerHTML = '<label>Horizontal:</label>';
    const hCb = document.createElement('input');
    hCb.type = 'checkbox';
    hCb.checked = !!aw.horizontal;
    hCb.style.width = 'auto';
    hRow.appendChild(hCb);
    if (aw.horizontal) {
      const stepsIn = document.createElement('input');
      stepsIn.type = 'number'; stepsIn.value = String(aw.horizontal.steps); stepsIn.min = '1';
      stepsIn.style.width = '40px'; stepsIn.placeholder = 'steps';
      stepsIn.title = 'Steps';
      const delayIn = document.createElement('input');
      delayIn.type = 'number'; delayIn.value = String(aw.horizontal.delay); delayIn.min = '0'; delayIn.step = '0.5';
      delayIn.style.width = '40px'; delayIn.placeholder = 'delay';
      delayIn.title = 'Delay (s)';
      hRow.appendChild(stepsIn);
      hRow.appendChild(delayIn);
      stepsIn.addEventListener('change', () => { aw.horizontal!.steps = parseInt(stepsIn.value) || 1; emit(); });
      delayIn.addEventListener('change', () => { aw.horizontal!.delay = parseFloat(delayIn.value) || 0; emit(); });
    }
    hCb.addEventListener('change', () => {
      if (hCb.checked) { aw.horizontal = { steps: 2, delay: 1 }; }
      else { delete aw.horizontal; }
      emit();
    });
    section.appendChild(hRow);

    // Vertical axis
    const vRow = document.createElement('div');
    vRow.className = 'prop-row';
    vRow.innerHTML = '<label>Vertical:</label>';
    const vCb = document.createElement('input');
    vCb.type = 'checkbox';
    vCb.checked = !!aw.vertical;
    vCb.style.width = 'auto';
    vRow.appendChild(vCb);
    if (aw.vertical) {
      const stepsIn = document.createElement('input');
      stepsIn.type = 'number'; stepsIn.value = String(aw.vertical.steps); stepsIn.min = '1';
      stepsIn.style.width = '40px'; stepsIn.placeholder = 'steps';
      stepsIn.title = 'Steps';
      const delayIn = document.createElement('input');
      delayIn.type = 'number'; delayIn.value = String(aw.vertical.delay); delayIn.min = '0'; delayIn.step = '0.5';
      delayIn.style.width = '40px'; delayIn.placeholder = 'delay';
      delayIn.title = 'Delay (s)';
      vRow.appendChild(stepsIn);
      vRow.appendChild(delayIn);
      stepsIn.addEventListener('change', () => { aw.vertical!.steps = parseInt(stepsIn.value) || 1; emit(); });
      delayIn.addEventListener('change', () => { aw.vertical!.delay = parseFloat(delayIn.value) || 0; emit(); });
    }
    vCb.addEventListener('change', () => {
      if (vCb.checked) { aw.vertical = { steps: 2, delay: 1 }; }
      else { delete aw.vertical; }
      emit();
    });
    section.appendChild(vRow);
  }

  private renderTransitionProps(tr: MapTransition, index: number): void {
    const section = this.makeSection('Transition');
    const fields = [
      { label: 'From X', key: 'fromX', value: String(tr.fromX), type: 'number' },
      { label: 'From Y', key: 'fromY', value: String(tr.fromY), type: 'number' },
      { label: 'To Map', key: 'toMapId', value: tr.toMapId },
      { label: 'To X', key: 'toX', value: String(tr.toX), type: 'number' },
      { label: 'To Y', key: 'toY', value: String(tr.toY), type: 'number' },
    ];

    for (const f of fields) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      const label = document.createElement('label');
      label.textContent = f.label + ':';
      row.appendChild(label);
      const input = document.createElement('input');
      input.type = f.type || 'text';
      input.value = f.value;
      input.addEventListener('change', () => {
        (tr as unknown as Record<string, unknown>)[f.key] = f.type === 'number' ? parseInt(input.value, 10) : input.value;
        this.state.emit('map-modified');
      });
      row.appendChild(input);
      section.appendChild(row);
    }

    // Return to previous checkbox
    const rpRow = document.createElement('div');
    rpRow.className = 'prop-row';
    rpRow.innerHTML = `<label>Return to prev:</label>`;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!tr.returnToPrevious;
    cb.addEventListener('change', () => { tr.returnToPrevious = cb.checked; this.state.emit('map-modified'); });
    rpRow.appendChild(cb);
    section.appendChild(rpRow);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete Transition';
    delBtn.addEventListener('click', () => {
      this.state.mapData.transitions?.splice(index, 1);
      this.state.selectTransition(null);
      this.state.emit('map-modified');
    });
    section.appendChild(delBtn);
    this.container.appendChild(section);
  }

  private renderNpcList(): void {
    const section = this.makeSection('NPCs');
    const npcs = this.state.mapData.npcs || [];
    if (npcs.length === 0) {
      section.innerHTML += '<div class="prop-empty">No NPCs</div>';
    } else {
      for (const npc of npcs) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.textContent = `${npc.id} (${npc.x},${npc.y}) [${npc.type}]`;
        item.addEventListener('click', () => this.state.selectNpc(npc.id));
        if (this.state.selectedNpcId === npc.id) item.classList.add('selected');
        section.appendChild(item);
      }
    }
    this.container.appendChild(section);
  }

  private renderTransitionList(): void {
    const section = this.makeSection('Transitions');
    const transitions = this.state.mapData.transitions || [];
    if (transitions.length === 0) {
      section.innerHTML += '<div class="prop-empty">No transitions</div>';
    } else {
      transitions.forEach((tr, i) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.textContent = `(${tr.fromX},${tr.fromY}) → ${tr.toMapId} (${tr.toX},${tr.toY})`;
        item.addEventListener('click', () => this.state.selectTransition(i));
        if (this.state.selectedTransitionIndex === i) item.classList.add('selected');
        section.appendChild(item);
      });
    }
    this.container.appendChild(section);
  }

  private makeSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'props-section';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    section.appendChild(h3);
    return section;
  }
}
