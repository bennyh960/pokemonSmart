import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { TileDef, NPCData, MapTransition } from './types.js';
import { getCharacterList, getCharacterInfo, getCharacterFrame, loadCharacterSprites, CHARACTER_ROLES } from '../engine/character-sprites.js';
import { createNamePicker } from '../ui/name-picker.js';
import { getAllPokemon, getMoveDisplayName, type PokemonData } from '../services/pokemon-data.js';
import { getAllItems, type ItemDef } from '../data/items.js';
import { getTMEffect } from '../data/item-defs.js';
import { normalizeReward, type TrainerData, type TrainerReward, type DialogueReward } from '../systems/npc.js';
import { GATES } from '../data/story/gates.js';
import { BADGES } from '../data/badges.js';
import { getStoryEvents } from '../data/story/events.js';
import encounterTables from '../data/encounter-tables.json';
import { getKnownMapIds, loadMapFromProject } from './map-io.js';
import { mapRelationIndex } from './map-relation-index.js';
import { categorizeTiles } from './tile-palette.js';

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
  private onNavigate?: (mapId: string) => void;

  constructor(container: HTMLElement, state: EditorState, history: HistoryManager, tiles: Record<string, TileDef>, onNavigate?: (mapId: string) => void) {
    this.container = container;
    this.state = state;
    this._history = history;
    this.tiles = tiles;
    this.onNavigate = onNavigate;

    state.on('selection-changed', () => this.refresh(true));
    state.on('map-modified', () => this.refresh(false));
    state.on('map-loaded', () => this.refresh(false));
    this.refresh(false);
  }

  private refresh(scrollToSelected = false): void {
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

    // ── Map info (area field) ──
    this.renderMapInfo();

    // ── Related maps ──
    this.renderRelatedMaps();

    // ── NPC list ──
    this.renderNpcList(scrollToSelected);

    // ── Transition list ──
    this.renderTransitionList(scrollToSelected);

    // ── Encounter table ──
    this.renderEncounterPanel();
  }

  private renderCellProps(cx: number, cy: number): void {
    const ground = this.state.getGroundTile(cx, cy);
    const obj = this.state.getObjectTile(cx, cy);
    const def = typeof ground === 'string' ? this.tiles[ground] : null;

    const section = this.makeSection('Cell Properties');
    const body = PropertiesPanel.sectionBody(section);
    body.innerHTML = `
      <div class="prop-row"><label>Position:</label><span>(${cx}, ${cy})</span></div>
      <div class="prop-row"><label>Ground:</label><span>${String(ground)}</span></div>
      <div class="prop-row"><label>Object:</label><span>${obj ?? 'none'}</span></div>
      <div class="prop-row"><label>Size:</label><span>${def ? `${def.w}×${def.h}` : '?'}px</span></div>
      <div class="prop-row"><label>Walkable:</label><span>${def?.walkable ?? '?'}</span></div>
      <div class="prop-row"><label>Encounter:</label><span>${def?.encounterTypes ? def.encounterTypes.join(', ') : 'none'}</span></div>
      <div class="prop-row"><label>Above:</label><span>${def?.above ?? false}</span></div>
    `;
    this.container.appendChild(section);
  }

  private renderNpcProps(npc: NPCData): void {
    const section = this.makeSection(`NPC: ${npc.id}`);
    const body = PropertiesPanel.sectionBody(section);
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
      body.appendChild(row);
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
      body.appendChild(row);
    };

    // Basic fields
    addInput('ID', 'id', npc.id);
    addInput('X', 'x', String(npc.x), 'number');
    addInput('Y', 'y', String(npc.y), 'number');
    addSelect('Facing', 'facing', ['up', 'down', 'left', 'right'], npc.facing);
    addSelect('Type', 'type', ['dialogue', 'trainer', 'shopkeeper', 'healer', 'gate-guard'], npc.type);
    addInput('Interact Range', 'interactRange', String((npc as unknown as Record<string, unknown>).interactRange ?? 1), 'number');

    // ── Sprite dropdown with role filter ──
    const charList = getCharacterList();

    // Role filter dropdown
    const filterRow = document.createElement('div');
    filterRow.className = 'prop-row';
    filterRow.innerHTML = '<label>Filter:</label>';
    const roleSel = document.createElement('select');
    roleSel.style.width = '100%';
    const allOpt = document.createElement('option');
    allOpt.value = ''; allOpt.textContent = 'All sprites';
    roleSel.appendChild(allOpt);
    for (const role of CHARACTER_ROLES) {
      const opt = document.createElement('option');
      opt.value = role; opt.textContent = role;
      roleSel.appendChild(opt);
    }
    filterRow.appendChild(roleSel);
    body.appendChild(filterRow);

    // Sprite select
    const spriteRow = document.createElement('div');
    spriteRow.className = 'prop-row';
    spriteRow.innerHTML = '<label>Sprite:</label>';
    const spriteSel = document.createElement('select');

    function populateSpriteOptions(roleFilter: string): void {
      spriteSel.innerHTML = '';
      let foundCurrent = false;
      const filtered = roleFilter
        ? charList.filter(c => c.roles.includes(roleFilter as never))
        : charList;
      for (const c of filtered) {
        const opt = document.createElement('option');
        opt.value = c.id;
        const displayName = c.name.en || c.name.he || c.id;
        const roleStr = c.roles.length > 0 ? ` [${c.roles.join(',')}]` : '';
        opt.textContent = `${displayName} (${c.id})${roleStr}`;
        if (c.id === npc.spriteType) { opt.selected = true; foundCurrent = true; }
        spriteSel.appendChild(opt);
      }
      if (!foundCurrent) {
        const opt = document.createElement('option');
        opt.value = npc.spriteType;
        const info = charList.find(c => c.id === npc.spriteType);
        opt.textContent = info
          ? `${info.name.en || info.name.he || info.id} (${info.id})`
          : `${npc.spriteType} (legacy)`;
        opt.selected = true;
        spriteSel.prepend(opt);
      }
    }
    populateSpriteOptions('');
    roleSel.addEventListener('change', () => populateSpriteOptions(roleSel.value));
    spriteSel.addEventListener('change', () => {
      npc.spriteType = spriteSel.value;
      updateSpritePreview();
      emit();
    });
    spriteRow.appendChild(spriteSel);
    body.appendChild(spriteRow);

    // Sprite preview canvas
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 64;
    previewCanvas.height = 64;
    previewCanvas.style.cssText = 'image-rendering:pixelated; border:1px solid #444; margin:4px 0 8px;';
    body.appendChild(previewCanvas);

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
    body.appendChild(nameLabel);
    body.appendChild(createNamePicker({
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
    body.appendChild(diaRow);

    const diaRowHe = document.createElement('div');
    diaRowHe.className = 'prop-row';
    diaRowHe.innerHTML = '<label>Dialogue (HE):</label>';
    const taHe = document.createElement('textarea');
    taHe.value = npc.dialogue.map(d => typeof d === 'string' ? '' : d.he).join('\n');
    taHe.rows = 3;
    taHe.style.direction = 'rtl';
    taHe.addEventListener('change', () => syncDialogue());
    diaRowHe.appendChild(taHe);
    body.appendChild(diaRowHe);

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
    this.renderAutoWalkUI(body, npc);

    // ── Story / Visibility ──
    this.renderStoryFieldsUI(body, npc);

    // ── Reward (dialogue/shopkeeper/healer only — trainers and gate-guards don't use this) ──
    if (npc.type !== 'trainer' && npc.type !== 'gate-guard') {
      this.renderDialogueRewardUI(body, npc);
    }

    // ── Trainer-specific fields ──
    if (npc.type === 'trainer') {
      this.renderTrainerUI(body, npc as unknown as TrainerData);
    }

    // ── Gate-guard fields ──
    if (npc.type === 'gate-guard') {
      this.renderGateGuardUI(body, npc);
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
    body.appendChild(delBtn);
    this.container.appendChild(section);
  }

  // ── Gate-Guard: Gate ID and Passed Dialogue ──
  private renderGateGuardUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;

    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:8px 0 3px;';
    label.textContent = 'Gate Guard';
    section.appendChild(label);

    // Line of sight
    const losRow = document.createElement('div');
    losRow.className = 'prop-row';
    losRow.innerHTML = '<label>Line of Sight:</label>';
    const losInput = document.createElement('input');
    losInput.type = 'number';
    losInput.min = '1';
    losInput.max = '10';
    losInput.value = String((npcAny['lineOfSight'] as number) ?? 3);
    losInput.addEventListener('change', () => {
      const v = parseInt(losInput.value, 10);
      npcAny['lineOfSight'] = isNaN(v) ? 3 : Math.max(1, v);
      emit();
    });
    losRow.appendChild(losInput);
    losRow.appendChild(this.makeInfo('How many tiles in front the guard can see. Default 3.'));
    section.appendChild(losRow);

    // Gate ID input — datalist for known gates + free text for new ones
    const gateRow = document.createElement('div');
    gateRow.className = 'prop-row';
    gateRow.innerHTML = '<label>Gate ID:</label>';

    const datalistId = 'gate-id-list';
    let datalist = document.getElementById(datalistId) as HTMLDataListElement | null;
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = datalistId;
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = '';
    for (const id of Object.keys(GATES)) {
      const opt = document.createElement('option');
      opt.value = id;
      const g = GATES[id];
      opt.label = g.title?.en || id;
      datalist.appendChild(opt);
    }

    const gateInput = document.createElement('input');
    gateInput.type = 'text';
    gateInput.setAttribute('list', datalistId);
    gateInput.value = (npcAny['gateId'] as string) || '';
    gateInput.placeholder = 'e.g. gate-route1-sumville';
    gateInput.addEventListener('change', () => {
      npcAny['gateId'] = gateInput.value.trim() || '';
      emit();
    });
    gateRow.appendChild(gateInput);
    gateRow.appendChild(this.makeInfo('Select an existing gate or type a new ID. Gates are defined in src/data/story/gates.ts.'));
    section.appendChild(gateRow);

    // Passed Dialogue EN
    const passedDef = ((npcAny['passedDialogue'] as Array<{en:string;he:string}>) || []);
    const passedDialogueRow = document.createElement('div');
    passedDialogueRow.className = 'prop-row';
    passedDialogueRow.innerHTML = '<label>Passed (EN):</label>';
    const passedEn = document.createElement('textarea');
    passedEn.value = passedDef.map(d => d.en).join('\n');
    passedEn.rows = 2;
    passedEn.placeholder = 'You may pass! (shown after gate is cleared)';
    passedEn.addEventListener('change', () => syncPassedDialogue());
    passedDialogueRow.appendChild(passedEn);
    section.appendChild(passedDialogueRow);

    // Passed Dialogue HE
    const passedDialogueRowHe = document.createElement('div');
    passedDialogueRowHe.className = 'prop-row';
    passedDialogueRowHe.innerHTML = '<label>Passed (HE):</label>';
    const passedHe = document.createElement('textarea');
    passedHe.value = passedDef.map(d => d.he).join('\n');
    passedHe.rows = 2;
    passedHe.style.direction = 'rtl';
    passedHe.placeholder = 'תעבור, בבקשה!';
    passedHe.addEventListener('change', () => syncPassedDialogue());
    passedDialogueRowHe.appendChild(passedHe);
    section.appendChild(passedDialogueRowHe);

    function syncPassedDialogue(): void {
      const enLines = passedEn.value.split('\n').filter(l => l.trim());
      const heLines = passedHe.value.split('\n').filter(l => l.trim());
      const maxLen = Math.max(enLines.length, heLines.length);
      if (maxLen === 0) {
        delete npcAny['passedDialogue'];
      } else {
        npcAny['passedDialogue'] = Array.from({ length: maxLen }, (_, i) => ({
          en: enLines[i] || '',
          he: heLines[i] || '',
        }));
      }
      emit();
    }
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

    // ── Despawn on defeat ──
    const dodRow = document.createElement('div');
    dodRow.className = 'prop-row';
    dodRow.innerHTML = '<label>Despawn on defeat:</label>';
    const dodCb = document.createElement('input');
    dodCb.type = 'checkbox';
    dodCb.checked = !!trainer.despawnOnDefeat;
    dodCb.title = 'When checked, this trainer disappears from the map after the player wins the battle (rival/rocket style)';
    dodCb.addEventListener('change', () => {
      if (dodCb.checked) trainerAny['despawnOnDefeat'] = true;
      else delete trainerAny['despawnOnDefeat'];
      emit();
    });
    dodRow.appendChild(dodCb);
    dodRow.appendChild(this.makeInfo('Trainer sprite disappears after losing. Use for rival, Team Rocket, story bosses.'));
    section.appendChild(dodRow);

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

    // Sort items so TM/HM appear first, then alphabetically
    const allItems = getItemList().slice().sort((a, b) => {
      const aIsTM = getTMEffect(a.id) !== null;
      const bIsTM = getTMEffect(b.id) !== null;
      if (aIsTM && !bIsTM) return -1;
      if (!aIsTM && bIsTM) return 1;
      return a.name.en.localeCompare(b.name.en);
    });

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
        const tmData = getTMEffect(item.id);
        const label = tmData
          ? `${item.name.en} \u2014 ${getMoveDisplayName(tmData.moveId)} (${item.id})`
          : `${item.name.en} (${item.id})`;
        opt.textContent = label;
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

  /**
   * Collect all story flags and where each one is used.
   * Sources: story events (conditions + actions) + current map's NPC spawn/despawn fields.
   */
  private collectStoryFlags(): Map<string, string[]> {
    const usages = new Map<string, string[]>();
    const add = (flag: string, src: string) => {
      if (!usages.has(flag)) usages.set(flag, []);
      usages.get(flag)!.push(src);
    };

    // Scan registered story events
    for (const ev of getStoryEvents()) {
      for (const cond of ev.conditions ?? []) {
        const c = cond as Record<string, unknown>;
        if (typeof c['flag'] === 'string') add(c['flag'], `event "${ev.id}" (condition)`);
      }
      for (const act of ev.actions) {
        const a = act as Record<string, unknown>;
        if (act.type === 'set-flag' && typeof a['flag'] === 'string') add(a['flag'] as string, `event "${ev.id}" (sets flag)`);
        if (act.type === 'start-cutscene' && typeof a['cutsceneId'] === 'string') {/* skip non-flag */}
      }
    }

    // Scan current map NPCs
    for (const n of (this.state.mapData.npcs ?? []) as NPCData[]) {
      if (n.spawnAfter) add(n.spawnAfter, `NPC "${n.id}" → spawnAfter`);
      if (n.despawnAfter) add(n.despawnAfter, `NPC "${n.id}" → despawnAfter`);
    }

    return usages;
  }

  /**
   * Build a flag input field (text + datalist autocomplete) with live usage info.
   * Shows a coloured note below the input if the entered flag is already referenced elsewhere.
   */
  private makeFlagInput(opts: {
    value: string | undefined;
    allFlags: Map<string, string[]>;
    currentNpcId: string;
    roleLabel: string;      // e.g. "spawnAfter" — used to exclude self from usage display
    onChange: (flag: string | undefined) => void;
  }): HTMLElement {
    const { value, allFlags, currentNpcId, roleLabel, onChange } = opts;
    const wrap = document.createElement('div');
    wrap.style.flex = '1';

    const inputRow = document.createElement('div');
    inputRow.style.display = 'flex';
    inputRow.style.gap = '4px';

    // Text input with datalist
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = 'flag name…';
    input.style.flex = '1';
    const listId = `fl-${Math.random().toString(36).slice(2, 8)}`;
    const datalist = document.createElement('datalist');
    datalist.id = listId;
    for (const flag of Array.from(allFlags.keys()).sort()) {
      const opt = document.createElement('option');
      opt.value = flag;
      datalist.appendChild(opt);
    }
    input.setAttribute('list', listId);
    inputRow.appendChild(datalist);
    inputRow.appendChild(input);

    // ⓘ button — click to see full usage list
    const infoBtn = document.createElement('button');
    infoBtn.textContent = 'ⓘ';
    infoBtn.title = 'Show where this flag is used';
    infoBtn.style.cssText = 'width:22px;padding:0;flex-shrink:0;background:#1e2a3a;border:1px solid #445;color:#88aaff;cursor:pointer;border-radius:3px;';
    infoBtn.addEventListener('click', () => {
      const flag = input.value.trim();
      if (!flag) { alert('Enter a flag name first.'); return; }
      const usages = allFlags.get(flag) ?? [];
      const self = `NPC "${currentNpcId}" → ${roleLabel}`;
      const others = usages.filter(u => u !== self);
      if (others.length === 0) {
        alert(`Flag "${flag}" is not referenced anywhere else in the registered story events or this map's NPCs.\n\nNote: it may be set/checked in other map files not yet loaded.`);
      } else {
        alert(`Flag "${flag}" is used in:\n\n• ${others.join('\n• ')}`);
      }
    });
    inputRow.appendChild(infoBtn);

    // Info note shown inline
    const infoNote = document.createElement('div');
    infoNote.style.cssText = 'font-size:10px;margin-top:2px;min-height:13px;';

    const updateNote = (flag: string) => {
      if (!flag) { infoNote.textContent = ''; return; }
      const self = `NPC "${currentNpcId}" → ${roleLabel}`;
      const others = (allFlags.get(flag) ?? []).filter(u => u !== self);
      if (others.length > 0) {
        infoNote.style.color = '#ffaa44';
        const preview = others.slice(0, 2).join(', ');
        const extra = others.length > 2 ? ` +${others.length - 2} more` : '';
        infoNote.textContent = `⚠ also in: ${preview}${extra}`;
      } else {
        infoNote.style.color = '#55bb77';
        infoNote.textContent = allFlags.has(flag) ? '✓ known flag' : '＋ new flag';
      }
    };

    // Initial note
    updateNote(value || '');

    input.addEventListener('input', () => updateNote(input.value.trim()));
    input.addEventListener('change', () => {
      const v = input.value.trim();
      updateNote(v);
      onChange(v || undefined);
    });

    wrap.appendChild(inputRow);
    wrap.appendChild(infoNote);
    return wrap;
  }

  private renderStoryFieldsUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;
    const allFlags = this.collectStoryFlags();

    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:8px 0 3px;';
    label.textContent = 'Visibility / Story';
    section.appendChild(label);

    // Hidden checkbox
    const hiddenRow = document.createElement('div');
    hiddenRow.className = 'prop-row';
    hiddenRow.innerHTML = '<label>Hidden:</label>';
    const hiddenCb = document.createElement('input');
    hiddenCb.type = 'checkbox';
    hiddenCb.checked = !!npc.hidden;
    hiddenCb.title = 'NPC exists but is not rendered or interactable';
    hiddenCb.addEventListener('change', () => {
      npcAny['hidden'] = hiddenCb.checked || undefined;
      emit();
    });
    hiddenRow.appendChild(hiddenCb);
    section.appendChild(hiddenRow);

    // Spawn After flag — searchable select
    const spawnRow = document.createElement('div');
    spawnRow.className = 'prop-row';
    spawnRow.style.alignItems = 'flex-start';
    const spawnLabel = document.createElement('label');
    spawnLabel.textContent = 'Spawn After:';
    spawnRow.appendChild(spawnLabel);
    spawnRow.appendChild(this.makeFlagInput({
      value: npc.spawnAfter,
      allFlags,
      currentNpcId: npc.id,
      roleLabel: 'spawnAfter',
      onChange: v => { npcAny['spawnAfter'] = v; emit(); },
    }));
    section.appendChild(spawnRow);

    // Despawn After flag — searchable select
    const despawnRow = document.createElement('div');
    despawnRow.className = 'prop-row';
    despawnRow.style.alignItems = 'flex-start';
    const despawnLabel = document.createElement('label');
    despawnLabel.textContent = 'Despawn After:';
    despawnRow.appendChild(despawnLabel);
    despawnRow.appendChild(this.makeFlagInput({
      value: npc.despawnAfter,
      allFlags,
      currentNpcId: npc.id,
      roleLabel: 'despawnAfter',
      onChange: v => { npcAny['despawnAfter'] = v; emit(); },
    }));
    section.appendChild(despawnRow);

    // ── Despawn when party reaches level threshold ──
    const partyHdr = document.createElement('div');
    partyHdr.style.cssText = 'font-size:10px;color:#7a8aaa;margin:8px 0 3px;font-weight:600;';
    partyHdr.textContent = 'Despawn when party is strong enough:';
    section.appendChild(partyHdr);

    const dwp = (npcAny['despawnWhenParty'] as { count?: number; minLevel?: number } | undefined);

    const partyRow = document.createElement('div');
    partyRow.className = 'prop-row';
    partyRow.style.gap = '6px';

    const cntLabel = document.createElement('label');
    cntLabel.textContent = '≥';
    cntLabel.style.cssText = 'min-width:auto;';
    const cntInput = document.createElement('input');
    cntInput.type = 'number';
    cntInput.min = '1';
    cntInput.max = '6';
    cntInput.placeholder = 'count';
    cntInput.title = 'Number of qualifying Pokémon needed';
    cntInput.value = dwp?.count != null ? String(dwp.count) : '';
    cntInput.style.width = '46px';

    const lvlLabel = document.createElement('label');
    lvlLabel.textContent = 'Pokémon ≥ Lv';
    lvlLabel.style.cssText = 'min-width:auto;';
    const lvlInput = document.createElement('input');
    lvlInput.type = 'number';
    lvlInput.min = '1';
    lvlInput.max = '100';
    lvlInput.placeholder = 'level';
    lvlInput.title = 'Minimum level each qualifying Pokémon must have';
    lvlInput.value = dwp?.minLevel != null ? String(dwp.minLevel) : '';
    lvlInput.style.width = '46px';

    const updateDwp = () => {
      const cnt = parseInt(cntInput.value, 10);
      const lvl = parseInt(lvlInput.value, 10);
      const bothEmpty = cntInput.value.trim() === '' && lvlInput.value.trim() === '';
      if (!isNaN(cnt) && !isNaN(lvl) && cnt > 0 && lvl > 0) {
        // Both valid — save and refresh
        npcAny['despawnWhenParty'] = { count: cnt, minLevel: lvl };
        emit();
      } else if (bothEmpty) {
        // Both cleared — remove and refresh
        delete npcAny['despawnWhenParty'];
        emit();
      }
      // Partially filled — do nothing (don't emit, don't refresh, inputs keep their typed value)
    };
    cntInput.addEventListener('change', updateDwp);
    lvlInput.addEventListener('change', updateDwp);

    partyRow.appendChild(cntLabel);
    partyRow.appendChild(cntInput);
    partyRow.appendChild(lvlLabel);
    partyRow.appendChild(lvlInput);
    partyRow.appendChild(this.makeInfo('NPC disappears once the player has ≥ count Pokémon all at or above minLevel. Clear both fields to disable.'));
    section.appendChild(partyRow);

    // ── Line of sight (only meaningful when despawnWhenParty is set) ──
    if (npcAny['despawnWhenParty']) {
      const losRow = document.createElement('div');
      losRow.className = 'prop-row';
      losRow.innerHTML = '<label>Block range (tiles):</label>';
      const losIn = document.createElement('input');
      losIn.type = 'number';
      losIn.min = '1';
      losIn.max = '10';
      losIn.value = String((npcAny['lineOfSight'] as number | undefined) ?? 3);
      losIn.title = 'How many tiles in front the NPC can see to block the player';
      losIn.style.width = '46px';
      losIn.addEventListener('change', () => {
        const v = parseInt(losIn.value, 10);
        npcAny['lineOfSight'] = isNaN(v) ? 3 : Math.max(1, v);
        emit();
      });
      losRow.appendChild(losIn);
      losRow.appendChild(this.makeInfo('NPC shows ! and blocks the player when they step within this many tiles. Works like a gate guard.'));
      section.appendChild(losRow);
    }
  }

  /** Render an editable list of walk steps for one phase (main / afterSpawn / afterDespawn). */
  private renderWalkSteps(
    parent: HTMLElement,
    steps: import('../systems/npc.js').WalkStep[],
    emit: () => void,
  ): void {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.style.alignItems = 'center';

      const lbl = document.createElement('label');
      lbl.textContent = `${i + 1}:`;
      lbl.style.minWidth = '18px';
      row.appendChild(lbl);

      const dirSel = document.createElement('select');
      dirSel.style.width = '60px';
      for (const d of ['up', 'down', 'left', 'right']) {
        const opt = document.createElement('option');
        opt.value = d; opt.textContent = d;
        if (d === step.dir) opt.selected = true;
        dirSel.appendChild(opt);
      }
      dirSel.addEventListener('change', () => { step.dir = dirSel.value as 'up' | 'down' | 'left' | 'right'; emit(); });
      row.appendChild(dirSel);

      const stepsIn = document.createElement('input');
      stepsIn.type = 'number'; stepsIn.value = String(step.steps); stepsIn.min = '1';
      stepsIn.style.width = '36px'; stepsIn.title = 'Tiles to walk';
      stepsIn.addEventListener('change', () => { step.steps = parseInt(stepsIn.value) || 1; emit(); });
      row.appendChild(stepsIn);

      const delayIn = document.createElement('input');
      delayIn.type = 'number'; delayIn.value = String(step.delay); delayIn.min = '0'; delayIn.step = '0.5';
      delayIn.style.width = '36px'; delayIn.title = 'Delay after step (s)';
      delayIn.addEventListener('change', () => { step.delay = parseFloat(delayIn.value) || 0; emit(); });
      row.appendChild(delayIn);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕'; removeBtn.title = 'Remove step';
      removeBtn.style.marginLeft = '2px';
      removeBtn.addEventListener('click', () => { steps.splice(i, 1); emit(); });
      row.appendChild(removeBtn);

      parent.appendChild(row);
    }

    const addRow = document.createElement('div');
    addRow.className = 'prop-row';
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Step';
    addBtn.addEventListener('click', () => { steps.push({ dir: 'right', steps: 2, delay: 0.5 }); emit(); });
    addRow.appendChild(addBtn);
    parent.appendChild(addRow);
  }

  /**
   * Render an optional phase-pattern sub-section (After Spawn / After Despawn).
   * @param label     Display name e.g. "After Spawn"
   * @param patKey    Key on AutoWalkConfig e.g. "afterSpawnPattern"
   * @param loopKey   e.g. "afterSpawnLoop"
   * @param defaultDir Default direction for new steps
   */
  private renderPhasePatternUI(
    parent: HTMLElement,
    aw: import('../systems/npc.js').AutoWalkConfig,
    label: string,
    patKey: 'beforeSpawnPattern' | 'afterSpawnPattern' | 'beforeDespawnPattern' | 'afterDespawnPattern',
    loopKey: 'beforeSpawnLoop' | 'afterSpawnLoop' | 'beforeDespawnLoop' | 'afterDespawnLoop',
    emit: () => void,
  ): void {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:10px;color:#7a8aaa;font-weight:600;margin:8px 0 3px;display:flex;align-items:center;gap:6px;';

    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.style.width = 'auto';
    enableCb.checked = !!(aw[patKey] && (aw[patKey] as import('../systems/npc.js').WalkStep[]).length > 0);
    enableCb.title = `Enable ${label} pattern`;

    const hdrLabel = document.createElement('span');
    hdrLabel.textContent = `⚡ ${label}`;
    hdrLabel.style.cursor = 'pointer';
    hdrLabel.addEventListener('click', () => { enableCb.click(); });

    hdr.appendChild(enableCb);
    hdr.appendChild(hdrLabel);
    parent.appendChild(hdr);

    const body = document.createElement('div');
    body.style.paddingLeft = '8px';

    const render = () => {
      body.innerHTML = '';
      const pat = aw[patKey] as import('../systems/npc.js').WalkStep[] | undefined;
      if (!pat || pat.length === 0) return;

      // Loop checkbox
      const loopRow = document.createElement('div');
      loopRow.className = 'prop-row';
      loopRow.innerHTML = '<label>Loop:</label>';
      const loopCb = document.createElement('input');
      loopCb.type = 'checkbox';
      loopCb.checked = !!(aw[loopKey]);
      loopCb.style.width = 'auto';
      loopCb.addEventListener('change', () => { (aw as unknown as Record<string, unknown>)[loopKey] = loopCb.checked || undefined; emit(); });
      loopRow.appendChild(loopCb);
      body.appendChild(loopRow);

      this.renderWalkSteps(body, pat, emit);
    };

    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        (aw as unknown as Record<string, unknown>)[patKey] = [{ dir: 'right', steps: 3, delay: 0 }];
        (aw as unknown as Record<string, unknown>)[loopKey] = undefined;
      } else {
        (aw as unknown as Record<string, unknown>)[patKey] = undefined;
        (aw as unknown as Record<string, unknown>)[loopKey] = undefined;
      }
      emit();
      render();
    });

    render();
    parent.appendChild(body);
  }

  private renderAutoWalkUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const aw = npc.autoWalk as import('../systems/npc.js').AutoWalkConfig | null;

    // Enable checkbox
    const enableRow = document.createElement('div');
    enableRow.className = 'prop-row';
    enableRow.innerHTML = '<label>Auto Walk:</label>';
    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.checked = !!aw;
    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        npc.autoWalk = { pattern: [{ dir: 'right', steps: 2, delay: 1 }, { dir: 'left', steps: 2, delay: 1 }], loop: true };
      } else {
        npc.autoWalk = null;
      }
      emit();
    });
    enableRow.appendChild(enableCb);
    section.appendChild(enableRow);

    if (!aw || !aw.pattern) return;

    // ── Main pattern ──
    const mainHdr = document.createElement('div');
    mainHdr.style.cssText = 'font-size:10px;color:#7a8aaa;font-weight:600;margin:6px 0 3px;';
    mainHdr.textContent = 'Main Pattern (while visible)';
    section.appendChild(mainHdr);

    // Loop checkbox
    const loopRow = document.createElement('div');
    loopRow.className = 'prop-row';
    loopRow.innerHTML = '<label>Loop:</label>';
    const loopCb = document.createElement('input');
    loopCb.type = 'checkbox';
    loopCb.checked = aw.loop !== false;
    loopCb.style.width = 'auto';
    loopCb.addEventListener('change', () => { aw.loop = loopCb.checked; emit(); });
    loopRow.appendChild(loopCb);
    section.appendChild(loopRow);

    this.renderWalkSteps(section, aw.pattern, emit);

    // ── Phase patterns ──
    this.renderPhasePatternUI(section, aw, 'Before Spawn', 'beforeSpawnPattern', 'beforeSpawnLoop', emit);
    this.renderPhasePatternUI(section, aw, 'After Spawn', 'afterSpawnPattern', 'afterSpawnLoop', emit);
    this.renderPhasePatternUI(section, aw, 'Before Despawn', 'beforeDespawnPattern', 'beforeDespawnLoop', emit);
    this.renderPhasePatternUI(section, aw, 'After Despawn', 'afterDespawnPattern', 'afterDespawnLoop', emit);
  }

  private renderTransitionProps(tr: MapTransition, index: number): void {
    const section = this.makeSection('Transition');
    const body = PropertiesPanel.sectionBody(section);
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
      body.appendChild(row);
    }

    // Return to previous checkbox (placed before destination fields so it can hide them)
    const rpRow = document.createElement('div');
    rpRow.className = 'prop-row';
    rpRow.innerHTML = `<label>Return to prev:</label>`;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!tr.returnToPrevious;
    rpRow.appendChild(cb);
    rpRow.appendChild(this.makeInfo('Exit to where the player entered from'));
    body.appendChild(rpRow);

    // Destination fields container (hidden when returnToPrevious is checked)
    const destContainer = document.createElement('div');

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
    destContainer.appendChild(mapRow);

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
      destContainer.appendChild(row);
    }

    // Toggle destination fields visibility
    const updateDestVisibility = () => { destContainer.style.display = cb.checked ? 'none' : ''; };
    updateDestVisibility();
    cb.addEventListener('change', () => {
      tr.returnToPrevious = cb.checked;
      if (cb.checked) {
        trAny['toMapId'] = null;
        trAny['toX'] = null;
        trAny['toY'] = null;
      }
      updateDestVisibility();
      this.state.emit('map-modified');
    });

    body.appendChild(destContainer);

    // Warn if multiple transitions use returnToPrevious (only one entry point is saved at a time)
    const warnEl = document.createElement('div');
    warnEl.style.cssText = 'color:#ff6; font-size:11px; padding:4px 0; display:none;';
    warnEl.textContent = '⚠ Multiple "return to prev" transitions on this map — only one entry point is tracked, this may cause loops.';
    body.appendChild(warnEl);
    const checkReturnWarning = () => {
      const count = (this.state.mapData.transitions || []).filter(t => t.returnToPrevious).length;
      warnEl.style.display = (cb.checked && count > 1) ? '' : 'none';
    };
    checkReturnWarning();
    cb.addEventListener('change', () => { setTimeout(checkReturnWarning, 0); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete Transition';
    delBtn.addEventListener('click', () => {
      this.state.mapData.transitions?.splice(index, 1);
      this.state.selectTransition(null);
      this.state.emit('map-modified');
    });
    body.appendChild(delBtn);
    this.container.appendChild(section);
  }

  private renderMapInfo(): void {
    const mapData = this.state.mapData;
    const section = this.makeSection('Map Info', true);
    const body = PropertiesPanel.sectionBody(section);

    // Map ID (read-only display)
    const idRow = document.createElement('div');
    idRow.className = 'prop-row';
    idRow.innerHTML = `<label>ID:</label><span style="font-family:monospace;font-size:11px">${mapData.id ?? '—'}</span>`;
    body.appendChild(idRow);

    // Area field (editable)
    const areaRow = document.createElement('div');
    areaRow.className = 'prop-row';
    const areaLabel = document.createElement('label');
    areaLabel.textContent = 'Area:';
    const areaInput = document.createElement('input');
    areaInput.type = 'text';
    areaInput.value = mapData.area ?? '';
    areaInput.placeholder = 'e.g. Dividia, Route 1';
    areaInput.title = 'Group this map with a city/region. Maps sharing the same area appear in Related Maps.';
    areaInput.addEventListener('change', () => {
      const val = areaInput.value.trim();
      mapData.area = val || undefined;
      this.state.emit('map-modified');
    });
    areaRow.appendChild(areaLabel);
    areaRow.appendChild(areaInput);
    areaRow.appendChild(this.makeInfo('Set to group with other maps (e.g. city buildings). Shared area maps appear in Related Maps below.'));
    body.appendChild(areaRow);

    this.container.appendChild(section);
  }

  private renderRelatedMaps(): void {
    const mapData = this.state.mapData;
    const mapId = mapData.id ?? '';
    const area = mapData.area;

    const section = this.makeSection('Related Maps', true);
    const body = PropertiesPanel.sectionBody(section);

    if (!mapRelationIndex.isReady) {
      body.innerHTML = '<div class="prop-empty">Loading map index…</div>';
      // Re-render once the index is done
      mapRelationIndex.onReady(() => this.refresh());
      this.container.appendChild(section);
      return;
    }

    // Live outgoing from current map's transitions (may include unsaved additions)
    const liveOutgoing = (mapData.transitions ?? []).map(t => t.toMapId);
    const related = mapRelationIndex.getRelated(mapId, area, liveOutgoing);

    if (related.length === 0) {
      body.innerHTML = '<div class="prop-empty">No related maps — set Area or add Transitions</div>';
    } else {
      const areaItems  = related.filter(r => r.relation === 'area');
      const outItems   = related.filter(r => r.relation === 'outgoing');
      const inItems    = related.filter(r => r.relation === 'incoming');

      if (areaItems.length > 0) {
        const hdr = document.createElement('div');
        hdr.className = 'trainer-subsection-header';
        hdr.textContent = area ? `Same area: ${area}` : 'Same area';
        body.appendChild(hdr);
        for (const rel of areaItems) body.appendChild(this.makeMapLink(rel.id, rel.name));
      }

      if (outItems.length > 0) {
        const hdr = document.createElement('div');
        hdr.className = 'trainer-subsection-header';
        hdr.textContent = 'Outgoing transitions';
        body.appendChild(hdr);
        for (const rel of outItems) body.appendChild(this.makeMapLink(rel.id, rel.name));
      }

      if (inItems.length > 0) {
        const hdr = document.createElement('div');
        hdr.className = 'trainer-subsection-header';
        hdr.textContent = 'Incoming transitions';
        body.appendChild(hdr);
        for (const rel of inItems) body.appendChild(this.makeMapLink(rel.id, rel.name));
      }
    }

    this.container.appendChild(section);
  }

  private makeMapLink(mapId: string, name: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.cssText = 'cursor:pointer; display:flex; align-items:center; gap:6px;';

    const idSpan = document.createElement('span');
    idSpan.style.cssText = 'font-family:monospace; font-size:10px; color:#8a9aaa; flex-shrink:0;';
    idSpan.textContent = mapId;

    item.appendChild(idSpan);

    if (name !== mapId) {
      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-size:11px; color:#c8d8e8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
      nameSpan.textContent = name;
      item.appendChild(nameSpan);
    }

    item.title = `Open ${mapId} in editor`;
    item.addEventListener('click', () => {
      if (this.onNavigate) {
        this.onNavigate(mapId);
      } else {
        // Fallback: load directly
        loadMapFromProject(mapId).then(data => {
          const cats = categorizeTiles(this.tiles as Record<string, never>);
          this.state.loadMap(data, cats);
        }).catch(err => console.error('Failed to load map:', err));
      }
    });

    return item;
  }

  private renderNpcList(scrollToSelected = false): void {
    const section = this.makeSection('NPCs');
    const body = PropertiesPanel.sectionBody(section);
    const npcs = this.state.mapData.npcs || [];
    if (npcs.length === 0) {
      body.innerHTML = '<div class="prop-empty">No NPCs</div>';
    } else {
      for (const npc of npcs) {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.textContent = `${npc.id} (${npc.x},${npc.y}) [${npc.type}]`;
        item.addEventListener('click', () => {
          this.state.selectNpc(npc.id);
          this.state.focusTile(npc.x, npc.y);
        });
        if (this.state.selectedNpcId === npc.id) {
          item.classList.add('selected');
          if (scrollToSelected) {
            requestAnimationFrame(() => item.scrollIntoView({ block: 'nearest' }));
          }
        }
        body.appendChild(item);
      }
    }
    this.container.appendChild(section);
  }

  private renderTransitionList(scrollToSelected = false): void {
    const section = this.makeSection('Transitions');
    const body = PropertiesPanel.sectionBody(section);
    const transitions = this.state.mapData.transitions || [];
    if (transitions.length === 0) {
      body.innerHTML = '<div class="prop-empty">No transitions</div>';
    } else {
      transitions.forEach((tr, i) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.textContent = `(${tr.fromX},${tr.fromY}) → ${tr.toMapId} (${tr.toX},${tr.toY})`;
        item.addEventListener('click', () => {
          this.state.selectTransition(i);
          this.state.focusTile(tr.fromX, tr.fromY);
        });
        if (this.state.selectedTransitionIndex === i) {
          item.classList.add('selected');
          if (scrollToSelected) {
            requestAnimationFrame(() => item.scrollIntoView({ block: 'nearest' }));
          }
        }
        body.appendChild(item);
      });
    }
    this.container.appendChild(section);
  }

  /** Encounter table editor — uses current map ID as the encounter table key. */
  private renderEncounterPanel(): void {
    const mapData = this.state.mapData;
    const section = this.makeSection('Encounters');
    const body = PropertiesPanel.sectionBody(section);
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
    body.appendChild(selectRow);

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
    body.appendChild(rateRow);

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
    body.appendChild(header);

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

      body.appendChild(row);
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
    body.appendChild(exportRow);

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

  /** Collapsed state persisted across refreshes (keyed by section title). */
  private static collapsedSections = new Set<string>();

  private makeSection(title: string, startOpen = true): HTMLElement {
    const section = document.createElement('div');
    section.className = 'props-section';

    const h3 = document.createElement('h3');
    h3.className = 'props-section-toggle';

    const arrow = document.createElement('span');
    arrow.className = 'props-section-arrow';

    h3.appendChild(arrow);
    h3.appendChild(document.createTextNode(title));
    section.appendChild(h3);

    const body = document.createElement('div');
    body.className = 'props-section-body';
    section.appendChild(body);

    // Restore collapsed state (default open unless previously collapsed)
    const isCollapsed = PropertiesPanel.collapsedSections.has(title) || !startOpen;
    if (isCollapsed) {
      section.classList.add('collapsed');
    }

    h3.addEventListener('click', () => {
      const nowCollapsed = section.classList.toggle('collapsed');
      if (nowCollapsed) {
        PropertiesPanel.collapsedSections.add(title);
      } else {
        PropertiesPanel.collapsedSections.delete(title);
      }
    });

    // Return the body so callers append content into it (not the section root)
    // But we need the section itself for container.appendChild — store body ref
    (section as unknown as Record<string, unknown>)['_body'] = body;
    return section;
  }

  /** Get the collapsible body of a section created by makeSection. */
  private static sectionBody(section: HTMLElement): HTMLElement {
    return ((section as unknown as Record<string, unknown>)['_body'] as HTMLElement) || section;
  }
}
