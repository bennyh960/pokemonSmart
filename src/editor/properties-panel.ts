import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { TileDef, NPCData, MapTransition } from './types.js';
import { getCharacterList, getCharacterInfo, getCharacterFrame, loadCharacterSprites } from '../engine/character-sprites.js';
import { createNamePicker } from '../ui/name-picker.js';
import { getAllPokemon, type PokemonData } from '../services/pokemon-data.js';
import { getAllItems, type ItemDef } from '../data/items.js';
import { normalizeReward, type TrainerData, type TrainerReward, type DialogueReward } from '../systems/npc.js';
import { BADGES } from '../data/badges.js';
import encounterTables from '../data/encounter-tables.json';
import { getKnownMapIds } from './map-io.js';

// Ensure character sprites are loaded for preview
loadCharacterSprites().catch(() => {});

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

    // ── Encounter table ──
    this.renderEncounterPanel();
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
    addInput('X', 'x', String(npc.x), 'number');
    addInput('Y', 'y', String(npc.y), 'number');
    addSelect('Facing', 'facing', ['up', 'down', 'left', 'right'], npc.facing);
    addSelect('Type', 'type', ['dialogue', 'trainer', 'shopkeeper', 'healer'], npc.type);
    addInput('Interact Range', 'interactRange', String((npc as unknown as Record<string, unknown>).interactRange ?? 1), 'number');

    // ── Sprite dropdown (from characters.json) ──
    const spriteRow = document.createElement('div');
    spriteRow.className = 'prop-row';
    spriteRow.innerHTML = '<label>Sprite:</label>';
    const spriteSel = document.createElement('select');
    const charList = getCharacterList();
    let foundCurrent = false;
    for (const c of charList) {
      const opt = document.createElement('option');
      opt.value = c.id;
      const displayName = c.name.en || c.name.he || c.id;
      opt.textContent = `${displayName} (${c.id})`;
      if (c.id === npc.spriteType) { opt.selected = true; foundCurrent = true; }
      spriteSel.appendChild(opt);
    }
    if (!foundCurrent) {
      const opt = document.createElement('option');
      opt.value = npc.spriteType;
      opt.textContent = `${npc.spriteType} (legacy)`;
      opt.selected = true;
      spriteSel.prepend(opt);
    }
    spriteSel.addEventListener('change', () => {
      npc.spriteType = spriteSel.value;
      updateSpritePreview();
      emit();
    });
    spriteRow.appendChild(spriteSel);
    section.appendChild(spriteRow);

    // Sprite preview canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 64;
    previewCanvas.height = 64;
    previewCanvas.style.cssText = 'image-rendering:pixelated; border:1px solid #444; margin:4px 0 8px;';
    section.appendChild(previewCanvas);

    const updateSpritePreview = () => {
      const pCtx = previewCanvas.getContext('2d');
      if (!pCtx) return;
      pCtx.clearRect(0, 0, 64, 64);
      const frame = getCharacterFrame(npc.spriteType, 'down', 'stand');
      if (frame) {
        pCtx.imageSmoothingEnabled = false;
        pCtx.drawImage(frame.image, frame.sx, frame.sy, frame.w, frame.h, 0, 0, 64, 64);
      } else {
        pCtx.fillStyle = '#333';
        pCtx.fillRect(0, 0, 64, 64);
        pCtx.fillStyle = '#888';
        pCtx.font = '10px monospace';
        pCtx.fillText('No sprite', 6, 36);
      }
    };
    // Draw initial preview (may need retry after sprites load)
    updateSpritePreview();
    setTimeout(updateSpritePreview, 500);

    // ── Name picker — initial value from character's name if defined ──
    const charInfo = getCharacterInfo(npc.spriteType);
    const initialEn = npc.name || charInfo?.name.en || '';
    const initialHe = (npcAny['nameHe'] as string) || charInfo?.name.he || '';
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:6px 0 3px;';
    nameLabel.textContent = 'Name';
    section.appendChild(nameLabel);
    section.appendChild(createNamePicker({
      initialEn,
      initialHe,
      onChange: (name) => {
        npcAny['name'] = name.en;
        npcAny['nameHe'] = name.he;
        emit();
      },
    }));

    // Dialogue (bilingual — EN and HE side by side)
    const diaRow = document.createElement('div');
    diaRow.className = 'prop-row';
    diaRow.innerHTML = '<label>Dialogue (EN):</label>';
    const taEn = document.createElement('textarea');
    taEn.value = npc.dialogue.map(d => typeof d === 'string' ? d : d.en).join('\n');
    taEn.rows = 3;
    taEn.addEventListener('change', () => syncDialogue());
    diaRow.appendChild(taEn);
    section.appendChild(diaRow);

    const diaRowHe = document.createElement('div');
    diaRowHe.className = 'prop-row';
    diaRowHe.innerHTML = '<label>Dialogue (HE):</label>';
    const taHe = document.createElement('textarea');
    taHe.value = npc.dialogue.map(d => typeof d === 'string' ? '' : d.he).join('\n');
    taHe.rows = 3;
    taHe.style.direction = 'rtl';
    taHe.addEventListener('change', () => syncDialogue());
    diaRowHe.appendChild(taHe);
    section.appendChild(diaRowHe);

    function syncDialogue(): void {
      const enLines = taEn.value.split('\n');
      const heLines = taHe.value.split('\n');
      const maxLen = Math.max(enLines.length, heLines.length);
      npc.dialogue = [];
      for (let i = 0; i < maxLen; i++) {
        const en = (enLines[i] || '').trim();
        const he = (heLines[i] || '').trim();
        if (en || he) {
          npc.dialogue.push({ en, he });
        }
      }
      emit();
    }

    // ── Auto Walk ──
    this.renderAutoWalkUI(section, npc);

    // ── Reward (all NPC types except trainers — trainers have their own reward in battle) ──
    if (npc.type !== 'trainer') {
      this.renderDialogueRewardUI(section, npc);
    }

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

    // ── Reward: Badge ──
    section.appendChild(this.makeBadgeSelector(reward, emit));

    // ── Reward: Story Event ──
    const storyRow = document.createElement('div');
    storyRow.className = 'prop-row';
    storyRow.innerHTML = '<label>Story Event:</label>';
    const storyInput = document.createElement('input');
    storyInput.type = 'text';
    storyInput.value = reward.storyEvent || '';
    storyInput.placeholder = 'e.g. gym1-cleared';
    storyInput.addEventListener('change', () => {
      if (storyInput.value.trim()) reward.storyEvent = storyInput.value.trim();
      else delete (reward as unknown as Record<string, unknown>)['storyEvent'];
      emit();
    });
    storyRow.appendChild(storyInput);
    section.appendChild(storyRow);

    // ── Reward: Items ──
    this.renderRewardItemsUI(section, reward, emit);

    // ── Post-Battle Dialogue (bilingual) ──
    const pbdLabel = document.createElement('div');
    pbdLabel.className = 'trainer-subsection-header';
    pbdLabel.innerHTML = '<span>Post-Battle Dialogue</span>';
    section.appendChild(pbdLabel);

    if (!trainer.postBattleDialogue) trainer.postBattleDialogue = [];

    const pbdEnRow = document.createElement('div');
    pbdEnRow.className = 'prop-row';
    pbdEnRow.innerHTML = '<label>EN:</label>';
    const pbdEnTa = document.createElement('textarea');
    pbdEnTa.value = trainer.postBattleDialogue.map(d => typeof d === 'string' ? d : d.en).join('\n');
    pbdEnTa.rows = 2;
    pbdEnTa.addEventListener('change', () => syncPostBattle());
    pbdEnRow.appendChild(pbdEnTa);
    section.appendChild(pbdEnRow);

    const pbdHeRow = document.createElement('div');
    pbdHeRow.className = 'prop-row';
    pbdHeRow.innerHTML = '<label>HE:</label>';
    const pbdHeTa = document.createElement('textarea');
    pbdHeTa.value = trainer.postBattleDialogue.map(d => typeof d === 'string' ? '' : d.he).join('\n');
    pbdHeTa.rows = 2;
    pbdHeTa.style.direction = 'rtl';
    pbdHeTa.addEventListener('change', () => syncPostBattle());
    pbdHeRow.appendChild(pbdHeTa);
    section.appendChild(pbdHeRow);

    function syncPostBattle(): void {
      const enLines = pbdEnTa.value.split('\n');
      const heLines = pbdHeTa.value.split('\n');
      const maxLen = Math.max(enLines.length, heLines.length);
      trainer.postBattleDialogue = [];
      for (let i = 0; i < maxLen; i++) {
        const en = (enLines[i] || '').trim();
        const he = (heLines[i] || '').trim();
        if (en || he) trainer.postBattleDialogue.push({ en, he });
      }
      emit();
    }

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

  /** Reward editor for non-trainer NPCs (money, items, badge, storyEvent). */
  private renderDialogueRewardUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;

    // Enable reward checkbox
    const enableRow = document.createElement('div');
    enableRow.className = 'prop-row';
    enableRow.innerHTML = '<label>Has Reward:</label>';
    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.checked = !!npc.reward;
    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        npcAny['reward'] = { money: 0 } as DialogueReward;
      } else {
        delete npcAny['reward'];
      }
      emit();
    });
    enableRow.appendChild(enableCb);
    enableRow.appendChild(this.makeInfo('One-time reward given on first NPC interaction. Works for all NPC types.'));
    section.appendChild(enableRow);

    if (!npc.reward) return;
    const reward = npc.reward;

    // Money
    const moneyRow = document.createElement('div');
    moneyRow.className = 'prop-row';
    moneyRow.innerHTML = '<label>Reward $:</label>';
    const moneyInput = document.createElement('input');
    moneyInput.type = 'number'; moneyInput.min = '0'; moneyInput.step = '10';
    moneyInput.value = String(reward.money || 0);
    moneyInput.addEventListener('change', () => { reward.money = parseInt(moneyInput.value, 10) || 0; emit(); });
    moneyRow.appendChild(moneyInput);
    section.appendChild(moneyRow);

    // Badge selector
    section.appendChild(this.makeBadgeSelector(reward, emit));

    // Story event
    const storyRow = document.createElement('div');
    storyRow.className = 'prop-row';
    storyRow.innerHTML = '<label>Story Event:</label>';
    const storyInput = document.createElement('input');
    storyInput.type = 'text';
    storyInput.value = reward.storyEvent || '';
    storyInput.placeholder = 'e.g. story-received-pokedex';
    storyInput.addEventListener('change', () => {
      if (storyInput.value.trim()) reward.storyEvent = storyInput.value.trim();
      else delete (reward as unknown as Record<string, unknown>)['storyEvent'];
      emit();
    });
    storyRow.appendChild(storyInput);
    storyRow.appendChild(this.makeInfo('Sets a flag in pd.flags for story progression. Other NPCs/transitions can check this flag to gate content. E.g. "received-pokedex", "gym1-cleared"'));
    section.appendChild(storyRow);

    // Flag override
    const flagRow = document.createElement('div');
    flagRow.className = 'prop-row';
    flagRow.innerHTML = '<label>Flag:</label>';
    const flagInput = document.createElement('input');
    flagInput.type = 'text';
    flagInput.value = reward.flag || '';
    flagInput.placeholder = 'auto: npc-{id}-rewarded';
    flagInput.addEventListener('change', () => {
      if (flagInput.value.trim()) reward.flag = flagInput.value.trim();
      else delete (reward as unknown as Record<string, unknown>)['flag'];
      emit();
    });
    flagRow.appendChild(flagInput);
    flagRow.appendChild(this.makeInfo('"Already rewarded" guard — prevents giving reward twice. Auto-generated as "npc-{id}-rewarded" if left empty. Override to share a gate between multiple NPCs.'));
    section.appendChild(flagRow);

    // Reward items
    this.renderRewardItemsUI(section, reward as TrainerReward, emit);
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
    const emit = () => this.state.emit('map-modified');
    const trAny = tr as unknown as Record<string, unknown>;

    // Number fields
    const numFields = [
      { label: 'From X', key: 'fromX', value: tr.fromX },
      { label: 'From Y', key: 'fromY', value: tr.fromY },
      { label: 'To X', key: 'toX', value: tr.toX },
      { label: 'To Y', key: 'toY', value: tr.toY },
    ];

    // From X/Y
    for (const f of numFields.slice(0, 2)) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<label>${f.label}:</label>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(f.value);
      input.addEventListener('change', () => { trAny[f.key] = parseInt(input.value, 10) || 0; emit(); });
      row.appendChild(input);
      section.appendChild(row);
    }

    // To Map — select from known maps
    const mapRow = document.createElement('div');
    mapRow.className = 'prop-row';
    mapRow.innerHTML = '<label>To Map:</label>';
    const mapSel = document.createElement('select');
    const knownMaps = getKnownMapIds();
    let foundCurrent = false;
    for (const mapId of knownMaps) {
      const opt = document.createElement('option');
      opt.value = mapId;
      opt.textContent = mapId;
      if (mapId === tr.toMapId) { opt.selected = true; foundCurrent = true; }
      mapSel.appendChild(opt);
    }
    if (!foundCurrent && tr.toMapId) {
      const opt = document.createElement('option');
      opt.value = tr.toMapId;
      opt.textContent = `${tr.toMapId} (custom)`;
      opt.selected = true;
      mapSel.prepend(opt);
    }
    mapSel.addEventListener('change', () => { trAny['toMapId'] = mapSel.value; emit(); });
    mapRow.appendChild(mapSel);
    section.appendChild(mapRow);

    // To X/Y
    for (const f of numFields.slice(2)) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<label>${f.label}:</label>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(f.value);
      input.addEventListener('change', () => { trAny[f.key] = parseInt(input.value, 10) || 0; emit(); });
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

  /** Encounter table editor — uses current map ID as the encounter table key. */
  private renderEncounterPanel(): void {
    const mapData = this.state.mapData;
    const section = this.makeSection('Encounters');
    const emit = () => this.state.emit('map-modified');

    // Encounter table select — pick from existing tables in encounter-tables.json
    const selectRow = document.createElement('div');
    selectRow.className = 'prop-row';
    selectRow.innerHTML = '<label>Encounter Table:</label>';
    const select = document.createElement('select');
    select.style.flex = '1';
    const currentTableId = (mapData as unknown as Record<string, unknown>)['encounterTableId'] as string | null;

    // "None" option
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = '(None)';
    select.appendChild(noneOpt);

    // Options from encounter-tables.json
    for (const key of Object.keys(encounterTables)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      select.appendChild(opt);
    }
    select.value = currentTableId || '';

    select.addEventListener('change', () => {
      (mapData as unknown as Record<string, unknown>)['encounterTableId'] = select.value || null;
      emit();
    });
    selectRow.appendChild(select);
    selectRow.appendChild(this.makeInfo('Wild Pokemon encounter data — defined in encounter-tables.json'));
    section.appendChild(selectRow);

    const tableId = currentTableId;
    if (!tableId) {
      this.container.appendChild(section);
      return;
    }

    // Load or create encounter table entry
    const tables = encounterTables as Record<string, { encounterRate: number; entries: { pokemonId: number; minLevel: number; maxLevel: number; weight: number }[] }>;
    if (!tables[tableId]) {
      (tables as Record<string, unknown>)[tableId] = { encounterRate: 0.10, entries: [] };
    }
    const table = tables[tableId];

    // Encounter rate
    const rateRow = document.createElement('div');
    rateRow.className = 'prop-row';
    rateRow.innerHTML = '<label>Rate:</label>';
    const rateInput = document.createElement('input');
    rateInput.type = 'number'; rateInput.min = '0'; rateInput.max = '1'; rateInput.step = '0.01';
    rateInput.value = String(table.encounterRate);
    rateInput.addEventListener('change', () => { table.encounterRate = parseFloat(rateInput.value) || 0.1; emit(); });
    rateRow.appendChild(rateInput);
    rateRow.appendChild(this.makeInfo('Chance of encounter per step on encounter tiles (0.10 = 10%)'));
    section.appendChild(rateRow);

    // Entries header
    const header = document.createElement('div');
    header.className = 'trainer-subsection-header';
    header.innerHTML = '<span>Pokemon</span>';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-small btn-add';
    addBtn.textContent = '+ Pokemon';
    addBtn.addEventListener('click', () => {
      table.entries.push({ pokemonId: 16, minLevel: 3, maxLevel: 5, weight: 20 });
      emit();
    });
    header.appendChild(addBtn);
    section.appendChild(header);

    const pokemonList = getPokemonList();

    for (let i = 0; i < table.entries.length; i++) {
      const entry = table.entries[i];
      const row = document.createElement('div');
      row.className = 'trainer-slot';

      // Pokemon search input
      const pkmnWrapper = document.createElement('div');
      pkmnWrapper.className = 'pokemon-search-wrapper';
      const pkmnInput = document.createElement('input');
      pkmnInput.type = 'text';
      pkmnInput.className = 'pokemon-search-input';
      pkmnInput.placeholder = 'Pokemon...';
      const cur = pokemonList.find(p => p.id === entry.pokemonId);
      pkmnInput.value = cur ? `#${cur.id} ${cur.name.en}` : `#${entry.pokemonId}`;

      const dropdown = document.createElement('div');
      dropdown.className = 'pokemon-dropdown';
      dropdown.style.display = 'none';

      const renderDD = (filter: string) => {
        dropdown.innerHTML = '';
        const lf = filter.toLowerCase();
        const matches = pokemonList.filter(p =>
          p.name.en.toLowerCase().includes(lf) || String(p.id).includes(lf)
        ).slice(0, 20);
        for (const p of matches) {
          const item = document.createElement('div');
          item.className = 'pokemon-dropdown-item';
          item.textContent = `#${p.id} ${p.name.en}`;
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            entry.pokemonId = p.id;
            pkmnInput.value = `#${p.id} ${p.name.en}`;
            dropdown.style.display = 'none';
            emit();
          });
          dropdown.appendChild(item);
        }
      };
      pkmnInput.addEventListener('focus', () => { pkmnInput.select(); renderDD(''); dropdown.style.display = 'block'; });
      pkmnInput.addEventListener('input', () => { renderDD(pkmnInput.value); dropdown.style.display = 'block'; });
      pkmnInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 150); });
      pkmnWrapper.appendChild(pkmnInput);
      pkmnWrapper.appendChild(dropdown);
      row.appendChild(pkmnWrapper);

      // Level range
      const minLvl = document.createElement('input');
      minLvl.type = 'number'; minLvl.min = '1'; minLvl.max = '100';
      minLvl.value = String(entry.minLevel); minLvl.className = 'trainer-slot-level'; minLvl.title = 'Min Level';
      minLvl.addEventListener('change', () => { entry.minLevel = parseInt(minLvl.value, 10) || 1; emit(); });
      row.appendChild(minLvl);

      const maxLvl = document.createElement('input');
      maxLvl.type = 'number'; maxLvl.min = '1'; maxLvl.max = '100';
      maxLvl.value = String(entry.maxLevel); maxLvl.className = 'trainer-slot-level'; maxLvl.title = 'Max Level';
      maxLvl.addEventListener('change', () => { entry.maxLevel = parseInt(maxLvl.value, 10) || 1; emit(); });
      row.appendChild(maxLvl);

      // Weight
      const weightInput = document.createElement('input');
      weightInput.type = 'number'; weightInput.min = '1'; weightInput.max = '100';
      weightInput.value = String(entry.weight); weightInput.className = 'trainer-slot-qty'; weightInput.title = 'Weight (spawn chance)';
      weightInput.addEventListener('change', () => { entry.weight = parseInt(weightInput.value, 10) || 10; emit(); });
      row.appendChild(weightInput);

      // Remove
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn-small btn-remove';
      rmBtn.textContent = 'x';
      rmBtn.addEventListener('click', () => { table.entries.splice(i, 1); emit(); });
      row.appendChild(rmBtn);

      section.appendChild(row);
    }

    // Export button + info
    const exportRow = document.createElement('div');
    exportRow.style.cssText = 'margin-top:8px; display:flex; gap:6px; align-items:center;';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn-small';
    exportBtn.textContent = 'Copy Encounter JSON';
    exportBtn.addEventListener('click', () => {
      const json = JSON.stringify({ [tableId]: table }, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        exportBtn.textContent = 'Copied!';
        setTimeout(() => { exportBtn.textContent = 'Copy Encounter JSON'; }, 1500);
      });
    });
    exportRow.appendChild(exportBtn);
    exportRow.appendChild(this.makeInfo('Paste into src/data/encounter-tables.json — merge with existing entries'));
    section.appendChild(exportRow);

    this.container.appendChild(section);
  }

  /** Badge dropdown selector with info about which badges are already assigned to other NPCs. */
  private makeBadgeSelector(reward: DialogueReward | TrainerReward, emit: () => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'prop-row';
    row.innerHTML = '<label>Badge:</label>';

    const sel = document.createElement('select');
    // "None" option
    const noneOpt = document.createElement('option');
    noneOpt.value = '0';
    noneOpt.textContent = '(none)';
    if (!reward.badge) noneOpt.selected = true;
    sel.appendChild(noneOpt);

    // Find which badges are already assigned to other NPCs on this map
    const assignedBadges = new Set<number>();
    const npcs = this.state.mapData.npcs || [];
    for (const npc of npcs) {
      const r = npc.reward;
      if (r?.badge) assignedBadges.add(r.badge);
      if (npc.type === 'trainer') {
        const tr = npc as unknown as TrainerData;
        if (tr.reward?.badge) assignedBadges.add(tr.reward.badge);
      }
    }

    for (const badge of BADGES) {
      const opt = document.createElement('option');
      opt.value = String(badge.id);
      const assigned = assignedBadges.has(badge.id) && reward.badge !== badge.id;
      opt.textContent = `#${badge.id} ${badge.name.en} — ${badge.leader.en}${assigned ? ' (⚠ assigned)' : ''}`;
      if (reward.badge === badge.id) opt.selected = true;
      sel.appendChild(opt);
    }

    sel.addEventListener('change', () => {
      const v = parseInt(sel.value, 10) || 0;
      if (v > 0) reward.badge = v; else delete (reward as unknown as Record<string, unknown>)['badge'];
      emit();
    });
    row.appendChild(sel);
    row.appendChild(this.makeInfo('Select a gym badge to award. Badges marked (⚠ assigned) are already given by another NPC on this map.'));
    return row;
  }

  /** Create a small info icon/tooltip element. */
  private makeInfo(text: string): HTMLElement {
    const span = document.createElement('span');
    span.textContent = 'ℹ';
    span.title = text;
    span.style.cssText = 'cursor:help; color:#6688cc; font-size:14px; margin-left:4px; user-select:none;';
    return span;
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
