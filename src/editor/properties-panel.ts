import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { TileDef, NPCData, MapTransition } from './types.js';
import { getCharacterList } from '../engine/character-sprites.js';
import { getAllPokemon, type PokemonData } from '../services/pokemon-data.js';
import { getAllItems, type ItemDef } from '../data/items.js';
import { normalizeReward, type TrainerData, type TrainerReward } from '../systems/npc.js';

/** Cached pokemon list (id + english name) for dropdowns. */
let cachedPokemonList: PokemonData[] | null = null;
function getPokemonList(): PokemonData[] {
  if (!cachedPokemonList) cachedPokemonList = getAllPokemon();
  return cachedPokemonList;
}

/** Cached items list for dropdowns. */
let cachedItemList: ItemDef[] | null = null;
function getItemList(): ItemDef[] {
  if (!cachedItemList) cachedItemList = getAllItems();
  return cachedItemList;
}

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

    // ── Trainer-specific fields ──
    if (npc.type === 'trainer') {
      this.renderTrainerUI(section, npc as unknown as TrainerData);
    }

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

  // ── Trainer: Line of Sight, Reward, Party ──
  private renderTrainerUI(section: HTMLElement, trainer: TrainerData): void {
    const emit = () => this.state.emit('map-modified');
    const trainerAny = trainer as unknown as Record<string, unknown>;

    // Ensure trainer fields exist with defaults
    if (!trainer.party) trainer.party = [];
    if (trainer.lineOfSight == null) trainerAny['lineOfSight'] = 3;

    // Normalize reward (handles legacy number format)
    const reward: TrainerReward = normalizeReward(trainer.reward);
    trainerAny['reward'] = reward;

    // ── Line of Sight ──
    const losRow = document.createElement('div');
    losRow.className = 'prop-row';
    losRow.innerHTML = '<label>Line of Sight:</label>';
    const losInput = document.createElement('input');
    losInput.type = 'number';
    losInput.min = '1';
    losInput.max = '10';
    losInput.value = String(trainer.lineOfSight || 3);
    losInput.addEventListener('change', () => {
      trainerAny['lineOfSight'] = parseInt(losInput.value, 10) || 3;
      emit();
    });
    losRow.appendChild(losInput);
    section.appendChild(losRow);

    // ── Reward: Money ──
    const moneyRow = document.createElement('div');
    moneyRow.className = 'prop-row';
    moneyRow.innerHTML = '<label>Reward $:</label>';
    const moneyInput = document.createElement('input');
    moneyInput.type = 'number';
    moneyInput.min = '0';
    moneyInput.step = '10';
    moneyInput.value = String(reward.money);
    moneyInput.addEventListener('change', () => {
      reward.money = parseInt(moneyInput.value, 10) || 0;
      emit();
    });
    moneyRow.appendChild(moneyInput);
    section.appendChild(moneyRow);

    // ── Reward: Items ──
    this.renderRewardItemsUI(section, reward, emit);

    // ── Party ──
    this.renderPartyUI(section, trainer, emit);
  }

  // ── Reward Items editor ──
  private renderRewardItemsUI(section: HTMLElement, reward: TrainerReward, emit: () => void): void {
    const header = document.createElement('div');
    header.className = 'trainer-subsection-header';
    header.innerHTML = '<span>Reward Items</span>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-small btn-add';
    addBtn.textContent = '+ Item';
    addBtn.addEventListener('click', () => {
      if (!reward.items) reward.items = [];
      reward.items.push({ itemId: 'potion', quantity: 1 });
      emit();
    });
    header.appendChild(addBtn);
    section.appendChild(header);

    const items = reward.items || [];
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'prop-empty';
      empty.textContent = 'No item rewards';
      section.appendChild(empty);
    }

    const allItems = getItemList();
    for (let i = 0; i < items.length; i++) {
      const ri = items[i];
      const row = document.createElement('div');
      row.className = 'trainer-slot';

      // Item select
      const itemSel = document.createElement('select');
      itemSel.className = 'trainer-slot-select';
      for (const item of allItems) {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.id}`;
        if (item.id === ri.itemId) opt.selected = true;
        itemSel.appendChild(opt);
      }
      itemSel.addEventListener('change', () => { ri.itemId = itemSel.value; emit(); });
      row.appendChild(itemSel);

      // Quantity
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.value = String(ri.quantity);
      qtyInput.className = 'trainer-slot-qty';
      qtyInput.title = 'Quantity';
      qtyInput.addEventListener('change', () => { ri.quantity = parseInt(qtyInput.value, 10) || 1; emit(); });
      row.appendChild(qtyInput);

      // Remove
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn-small btn-remove';
      rmBtn.textContent = 'x';
      rmBtn.title = 'Remove item';
      rmBtn.addEventListener('click', () => {
        items.splice(i, 1);
        if (items.length === 0) delete (reward as unknown as Record<string, unknown>)['items'];
        emit();
      });
      row.appendChild(rmBtn);
      section.appendChild(row);
    }
  }

  // ── Party editor ──
  private renderPartyUI(section: HTMLElement, trainer: TrainerData, emit: () => void): void {
    const header = document.createElement('div');
    header.className = 'trainer-subsection-header';
    header.innerHTML = '<span>Party</span>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-small btn-add';
    addBtn.textContent = '+ Pokemon';
    addBtn.addEventListener('click', () => {
      if (trainer.party.length >= 6) return;
      trainer.party.push({ pokemonId: 1, level: 5 });
      emit();
    });
    header.appendChild(addBtn);
    section.appendChild(header);

    if (trainer.party.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'prop-empty';
      empty.textContent = 'No Pokemon in party';
      section.appendChild(empty);
    }

    const pokemonList = getPokemonList();

    for (let i = 0; i < trainer.party.length; i++) {
      const member = trainer.party[i];
      const slot = document.createElement('div');
      slot.className = 'trainer-slot party-slot';

      // Pokemon selector with search
      const pkmnWrapper = document.createElement('div');
      pkmnWrapper.className = 'pokemon-search-wrapper';

      const pkmnInput = document.createElement('input');
      pkmnInput.type = 'text';
      pkmnInput.className = 'pokemon-search-input';
      pkmnInput.placeholder = 'Search Pokemon...';
      const currentPkmn = pokemonList.find(p => p.id === member.pokemonId);
      pkmnInput.value = currentPkmn ? `#${currentPkmn.id} ${currentPkmn.name.en}` : `#${member.pokemonId}`;

      const dropdown = document.createElement('div');
      dropdown.className = 'pokemon-dropdown';
      dropdown.style.display = 'none';

      const renderDropdownItems = (filter: string) => {
        dropdown.innerHTML = '';
        const lowerFilter = filter.toLowerCase();
        const matches = pokemonList.filter(p =>
          p.name.en.toLowerCase().includes(lowerFilter) ||
          String(p.id).includes(lowerFilter)
        ).slice(0, 30); // Limit for performance

        for (const p of matches) {
          const item = document.createElement('div');
          item.className = 'pokemon-dropdown-item';
          item.textContent = `#${p.id} ${p.name.en}`;
          item.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent blur
            member.pokemonId = p.id;
            pkmnInput.value = `#${p.id} ${p.name.en}`;
            dropdown.style.display = 'none';
            emit();
          });
          dropdown.appendChild(item);
        }
        if (matches.length === 0) {
          dropdown.innerHTML = '<div class="pokemon-dropdown-empty">No matches</div>';
        }
      };

      pkmnInput.addEventListener('focus', () => {
        pkmnInput.select();
        renderDropdownItems(pkmnInput.value.replace(/^#\d+\s*/, ''));
        dropdown.style.display = 'block';
      });
      pkmnInput.addEventListener('input', () => {
        renderDropdownItems(pkmnInput.value);
        dropdown.style.display = 'block';
      });
      pkmnInput.addEventListener('blur', () => {
        // Delay to allow mousedown on dropdown item
        setTimeout(() => { dropdown.style.display = 'none'; }, 150);
      });

      pkmnWrapper.appendChild(pkmnInput);
      pkmnWrapper.appendChild(dropdown);
      slot.appendChild(pkmnWrapper);

      // Level input
      const lvlInput = document.createElement('input');
      lvlInput.type = 'number';
      lvlInput.min = '1';
      lvlInput.max = '100';
      lvlInput.value = String(member.level);
      lvlInput.className = 'trainer-slot-level';
      lvlInput.title = 'Level';
      lvlInput.addEventListener('change', () => {
        member.level = Math.max(1, Math.min(100, parseInt(lvlInput.value, 10) || 5));
        emit();
      });
      slot.appendChild(lvlInput);

      // Remove button
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn-small btn-remove';
      rmBtn.textContent = 'x';
      rmBtn.title = 'Remove Pokemon';
      rmBtn.addEventListener('click', () => {
        trainer.party.splice(i, 1);
        emit();
      });
      slot.appendChild(rmBtn);

      section.appendChild(slot);

      // Moves (optional, collapsible)
      this.renderPartyMoveUI(section, member, i, emit);
    }
  }

  // ── Optional moves override per party member ──
  private renderPartyMoveUI(section: HTMLElement, member: { pokemonId: number; level: number; moves?: number[] }, _index: number, emit: () => void): void {
    const movesRow = document.createElement('div');
    movesRow.className = 'party-moves';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-small btn-moves-toggle';
    const hasMoves = member.moves && member.moves.length > 0;
    toggleBtn.textContent = hasMoves ? `Moves (${member.moves!.length})` : 'Custom Moves';
    toggleBtn.title = 'Override default moves (leave empty for auto)';

    const movesContainer = document.createElement('div');
    movesContainer.className = 'party-moves-list';
    movesContainer.style.display = 'none';

    toggleBtn.addEventListener('click', () => {
      const isOpen = movesContainer.style.display !== 'none';
      movesContainer.style.display = isOpen ? 'none' : 'block';
    });

    movesRow.appendChild(toggleBtn);
    section.appendChild(movesRow);

    // Moves content
    if (!member.moves) member.moves = [];
    const moves = member.moves;

    const renderMoves = () => {
      movesContainer.innerHTML = '';

      for (let mi = 0; mi < moves.length; mi++) {
        const mRow = document.createElement('div');
        mRow.className = 'prop-row';
        const mInput = document.createElement('input');
        mInput.type = 'number';
        mInput.min = '1';
        mInput.value = String(moves[mi]);
        mInput.placeholder = 'Move ID';
        mInput.className = 'trainer-slot-move';
        mInput.addEventListener('change', () => {
          moves[mi] = parseInt(mInput.value, 10) || 1;
          emit();
        });
        mRow.appendChild(mInput);

        const rmBtn = document.createElement('button');
        rmBtn.className = 'btn-small btn-remove';
        rmBtn.textContent = 'x';
        rmBtn.addEventListener('click', () => {
          moves.splice(mi, 1);
          if (moves.length === 0) delete member.moves;
          toggleBtn.textContent = moves.length > 0 ? `Moves (${moves.length})` : 'Custom Moves';
          renderMoves();
          emit();
        });
        mRow.appendChild(rmBtn);
        movesContainer.appendChild(mRow);
      }

      if (moves.length < 4) {
        const addMoveBtn = document.createElement('button');
        addMoveBtn.className = 'btn-small btn-add';
        addMoveBtn.textContent = '+ Move';
        addMoveBtn.addEventListener('click', () => {
          moves.push(33); // Default: Tackle
          toggleBtn.textContent = `Moves (${moves.length})`;
          renderMoves();
          emit();
        });
        movesContainer.appendChild(addMoveBtn);
      }

      const hint = document.createElement('div');
      hint.className = 'prop-empty';
      hint.textContent = moves.length === 0 ? 'Empty = auto moves for level' : 'Move IDs (empty = auto)';
      movesContainer.appendChild(hint);
    };

    renderMoves();
    section.appendChild(movesContainer);
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
