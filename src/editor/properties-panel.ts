import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { TileDef, NPCData, MapTransition } from './types.js';

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

    const fields = [
      { label: 'ID', key: 'id', value: npc.id },
      { label: 'Name', key: 'name', value: npc.name || '' },
      { label: 'X', key: 'x', value: String(npc.x), type: 'number' },
      { label: 'Y', key: 'y', value: String(npc.y), type: 'number' },
      { label: 'Facing', key: 'facing', value: npc.facing },
      { label: 'Type', key: 'type', value: npc.type },
      { label: 'Sprite', key: 'spriteType', value: npc.spriteType },
      { label: 'Dialogue', key: 'dialogue', value: npc.dialogue.join('\n'), textarea: true },
    ];

    for (const f of fields) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      const label = document.createElement('label');
      label.textContent = f.label + ':';
      row.appendChild(label);

      if (f.textarea) {
        const ta = document.createElement('textarea');
        ta.value = f.value;
        ta.rows = 3;
        ta.addEventListener('change', () => {
          (npc as unknown as Record<string, unknown>)[f.key] = ta.value.split('\n').filter(l => l.trim());
          this.state.emit('map-modified');
        });
        row.appendChild(ta);
      } else if (f.key === 'facing') {
        const sel = document.createElement('select');
        for (const dir of ['up', 'down', 'left', 'right']) {
          const opt = document.createElement('option');
          opt.value = dir; opt.textContent = dir;
          if (dir === f.value) opt.selected = true;
          sel.appendChild(opt);
        }
        sel.addEventListener('change', () => { (npc as unknown as Record<string, unknown>).facing = sel.value; this.state.emit('map-modified'); });
        row.appendChild(sel);
      } else if (f.key === 'type') {
        const sel = document.createElement('select');
        for (const t of ['dialogue', 'trainer', 'shopkeeper', 'healer']) {
          const opt = document.createElement('option');
          opt.value = t; opt.textContent = t;
          if (t === f.value) opt.selected = true;
          sel.appendChild(opt);
        }
        sel.addEventListener('change', () => { (npc as unknown as Record<string, unknown>).type = sel.value; this.state.emit('map-modified'); });
        row.appendChild(sel);
      } else {
        const input = document.createElement('input');
        input.type = f.type || 'text';
        input.value = f.value;
        input.addEventListener('change', () => {
          (npc as unknown as Record<string, unknown>)[f.key] = f.type === 'number' ? parseInt(input.value, 10) : input.value;
          this.state.emit('map-modified');
        });
        row.appendChild(input);
      }
      section.appendChild(row);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete NPC';
    delBtn.addEventListener('click', () => {
      const npcs = this.state.mapData.npcs || [];
      const idx = npcs.indexOf(npc);
      if (idx >= 0) npcs.splice(idx, 1);
      this.state.selectNpc(null);
      this.state.emit('map-modified');
    });
    section.appendChild(delBtn);
    this.container.appendChild(section);
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
