import type { EditorState } from './editor-state.js';
import type { HistoryManager } from './history.js';
import type { TileDef, NPCData, MapTransition } from './types.js';
import {
  getCharacterList,
  getCharacterInfo,
  getCharacterFrame,
  loadCharacterSprites,
  CHARACTER_ROLES,
} from '../engine/character-sprites.js';
import { createNamePicker } from '../ui/name-picker.js';
import { getAllPokemon, getMoveDisplayName, type PokemonData } from '../services/pokemon-data.js';
import { getAllItems, type ItemDef } from '../data/items.js';
import { getTMEffect } from '../data/item-defs.js';
import {
  normalizeReward,
  type TrainerData,
  type TrainerReward,
  type DialogueReward,
  type ReencounterConfig,
  type NpcInteraction,
} from '../systems/npc.js';
import { GATES } from '../data/story/gates.js';
import { BADGES } from '../data/badges.js';
import { getStoryEvents } from '../data/story/events.js';
import { FLAGS, FLAG_DESCRIPTIONS } from '../data/story/flags.js';
import { getAllCutscenes } from '../data/story/cutscenes.js';
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

const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
];

const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
};

export class PropertiesPanel {
  private container: HTMLElement;
  private state: EditorState;
  // @ts-expect-error Reserved for future use (undo on property edits)
  private _history: HistoryManager;
  private tiles: Record<string, TileDef>;
  private onNavigate?: (mapId: string) => void;

  constructor(
    container: HTMLElement,
    state: EditorState,
    history: HistoryManager,
    tiles: Record<string, TileDef>,
    onNavigate?: (mapId: string) => void,
  ) {
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
      const npc = this.state.mapData.npcs?.find((n) => n.id === selectedNpcId);
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

    // ── Interactive item overrides ──
    this.renderInteractiveItemsPanel();
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
        opt.value = o;
        opt.textContent = o;
        if (o === current) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        npcAny[key] = sel.value;
        emit();
      });
      row.appendChild(sel);
      body.appendChild(row);
    };

    // Basic fields
    addInput('ID', 'id', npc.id);
    addInput('X', 'x', String(npc.x), 'number');
    addInput('Y', 'y', String(npc.y), 'number');
    addSelect('Facing', 'facing', ['up', 'down', 'left', 'right'], npc.facing);
    addSelect('Type', 'type', ['dialogue', 'trainer', 'shopkeeper', 'healer', 'gate-guard', 'wild-pokemon'], npc.type);
    addInput(
      'Interact Range',
      'interactRange',
      String((npc as unknown as Record<string, unknown>).interactRange ?? 1),
      'number',
    );

    // ── Sprite dropdown with role filter ──
    const charList = getCharacterList();

    // Role filter dropdown
    const filterRow = document.createElement('div');
    filterRow.className = 'prop-row';
    filterRow.innerHTML = '<label>Filter:</label>';
    const roleSel = document.createElement('select');
    roleSel.style.width = '100%';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All sprites';
    roleSel.appendChild(allOpt);
    for (const role of CHARACTER_ROLES) {
      const opt = document.createElement('option');
      opt.value = role;
      opt.textContent = role;
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
      const filtered = roleFilter ? charList.filter((c) => c.roles.includes(roleFilter as never)) : charList;
      for (const c of filtered) {
        const opt = document.createElement('option');
        opt.value = c.id;
        const displayName = c.name.en || c.name.he || c.id;
        const roleStr = c.roles.length > 0 ? ` [${c.roles.join(',')}]` : '';
        opt.textContent = `${displayName} (${c.id})${roleStr}`;
        if (c.id === npc.spriteType) {
          opt.selected = true;
          foundCurrent = true;
        }
        spriteSel.appendChild(opt);
      }
      if (!foundCurrent) {
        const opt = document.createElement('option');
        opt.value = npc.spriteType;
        const info = charList.find((c) => c.id === npc.spriteType);
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
      // Auto-set isGlitched for villain characters on new trainer NPCs
      if (npc.type === 'trainer') {
        const charInfo = charList.find((c) => c.id === spriteSel.value);
        const isVillain = charInfo?.roles?.includes('villain') ?? false;
        const trainerAny = npc as unknown as Record<string, unknown>;
        if (isVillain) trainerAny['isGlitched'] = true;
        else if (trainerAny['isGlitched'] === true) delete trainerAny['isGlitched'];
      }
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

    // ── Random Sprite Roles ──
    {
      const rsLabel = document.createElement('div');
      rsLabel.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:8px 0 3px;';
      rsLabel.textContent = 'Random Sprite';
      body.appendChild(rsLabel);

      const rsEnableRow = document.createElement('div');
      rsEnableRow.className = 'prop-row';
      rsEnableRow.innerHTML = '<label>Pick randomly on load:</label>';
      const rsEnableCb = document.createElement('input');
      rsEnableCb.type = 'checkbox';
      rsEnableCb.checked = !!(npc.randomChars && npc.randomChars.length > 0);
      rsEnableRow.appendChild(rsEnableCb);
      body.appendChild(rsEnableRow);

      const rsRolesContainer = document.createElement('div');
      rsRolesContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:4px 0 6px;';
      rsRolesContainer.style.display = rsEnableCb.checked ? 'flex' : 'none';
      body.appendChild(rsRolesContainer);

      const rebuildRoleChips = () => {
        rsRolesContainer.innerHTML = '';
        // Special sentinel '' = characters with no roles assigned
        const allOptions: string[] = ['', ...CHARACTER_ROLES];
        for (const role of allOptions) {
          const chip = document.createElement('label');
          chip.style.cssText =
            'display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:10px;background:#1a2340;font-size:10px;cursor:pointer;border:1px solid #2a3560;';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!(npc.randomChars?.includes(role));
          cb.addEventListener('change', () => {
            const existing = npc.randomChars ?? [];
            if (cb.checked) {
              npcAny['randomChars'] = [...existing.filter((r) => r !== role), role];
            } else {
              const updated = existing.filter((r) => r !== role);
              if (updated.length === 0) delete npcAny['randomChars'];
              else npcAny['randomChars'] = updated;
            }
            emit();
          });
          chip.appendChild(cb);
          chip.appendChild(document.createTextNode(role === '' ? '(no role)' : role));
          rsRolesContainer.appendChild(chip);
        }
      };
      rebuildRoleChips();

      rsEnableCb.addEventListener('change', () => {
        if (rsEnableCb.checked) {
          rsRolesContainer.style.display = 'flex';
          rebuildRoleChips();
        } else {
          rsRolesContainer.style.display = 'none';
          delete npcAny['randomChars'];
          emit();
        }
      });
    }

    // ── Name picker — initial value from character's name if defined ──
    const charInfo = getCharacterInfo(npc.spriteType);
    const initialEn =
      (npc.name as import('../systems/npc.js').BilingualText | undefined)?.en || charInfo?.name.en || '';
    const initialHe =
      (npc.name as import('../systems/npc.js').BilingualText | undefined)?.he || charInfo?.name.he || '';
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:6px 0 3px;';
    nameLabel.textContent = 'Name';
    body.appendChild(nameLabel);
    body.appendChild(
      createNamePicker({
        initialEn,
        initialHe,
        onChange: (name) => {
          npcAny['name'] = { en: name.en, he: name.he };
          delete npcAny['nameHe'];
          emit();
        },
      }),
    );

    // Dialogue (bilingual — EN and HE side by side)
    const diaRow = document.createElement('div');
    diaRow.className = 'prop-row';
    diaRow.innerHTML = '<label>Dialogue (EN):</label>';
    const taEn = document.createElement('textarea');
    taEn.value = npc.dialogue.map((d) => (typeof d === 'string' ? d : d.en)).join('\n');
    taEn.rows = 3;
    taEn.addEventListener('change', () => syncDialogue());
    diaRow.appendChild(taEn);
    body.appendChild(diaRow);

    const diaRowHe = document.createElement('div');
    diaRowHe.className = 'prop-row';
    diaRowHe.innerHTML = '<label>Dialogue (HE):</label>';
    const taHe = document.createElement('textarea');
    taHe.value = npc.dialogue.map((d) => (typeof d === 'string' ? '' : d.he)).join('\n');
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

    // ── Reward (dialogue/shopkeeper/healer only — trainers, gate-guards and wild-pokemon don't use this) ──
    if (npc.type !== 'trainer' && npc.type !== 'gate-guard' && npc.type !== 'wild-pokemon') {
      this.renderDialogueRewardUI(body, npc);
    }

    // ── NPC Interaction ──
    if (npc.type === 'dialogue') {
      this.renderNpcInteractionUI(body, npc);
    }

    // ── Trainer-specific fields ──
    if (npc.type === 'trainer') {
      this.renderTrainerUI(body, npc as unknown as TrainerData);
    }

    // ── Wild Pokémon NPC fields ──
    if (npc.type === 'wild-pokemon') {
      this.renderWildPokemonUI(body, npc as unknown as import('../systems/npc.js').WildPokemonData);
    }

    // ── Gate-guard fields ──
    if (npc.type === 'gate-guard') {
      this.renderGateGuardUI(body, npc);
    }

    // ── Math Questions (all NPC types except gate-guard which uses its own gate) ──
    if (npc.type !== 'gate-guard') {
      this.renderNPCQuestionsUI(body, npc);
    }

    // ── Post-Flag Dialogue ──
    this.renderPostFlagDialogueUI(body, npc);

    // ── Story cross-references ──
    this.renderStoryRefsPanel(body, npc);

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

  // ── Wild Pokémon NPC ──
  private renderWildPokemonUI(section: HTMLElement, npc: import('../systems/npc.js').WildPokemonData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;

    const addRow = (label: string, input: HTMLElement, info?: string) => {
      const row = document.createElement('div');
      row.className = 'prop-row';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      row.appendChild(lbl);
      row.appendChild(input);
      if (info) row.appendChild(this.makeInfo(info));
      section.appendChild(row);
    };

    // Pokémon ID
    const pokemonIdInput = document.createElement('input');
    pokemonIdInput.type = 'number';
    pokemonIdInput.min = '1';
    pokemonIdInput.max = '251';
    pokemonIdInput.value = String(npc.pokemonId ?? 1);
    pokemonIdInput.addEventListener('change', () => {
      npcAny['pokemonId'] = parseInt(pokemonIdInput.value, 10) || 1;
      emit();
    });
    addRow('Pokémon ID:', pokemonIdInput, 'National Pokédex number (1–251)');

    // Level
    const levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.min = '1';
    levelInput.max = '100';
    levelInput.value = String(npc.level ?? 5);
    levelInput.addEventListener('change', () => {
      npcAny['level'] = parseInt(levelInput.value, 10) || 5;
      emit();
    });
    addRow('Level:', levelInput);

    // Is Glitched
    const glitchRow = document.createElement('div');
    glitchRow.className = 'prop-row';
    glitchRow.innerHTML = '<label>Is Glitched (NULL-X):</label>';
    const glitchCb = document.createElement('input');
    glitchCb.type = 'checkbox';
    glitchCb.checked = !!npc.isGlitched;
    glitchCb.title = 'Pokémon cannot be caught and has modified damage.';
    glitchCb.addEventListener('change', () => {
      if (glitchCb.checked) npcAny['isGlitched'] = true;
      else delete npcAny['isGlitched'];
      emit();
    });
    glitchRow.appendChild(glitchCb);
    glitchRow.appendChild(this.makeInfo('Cannot be caught. Deals +5–15% dmg, takes -5–15% dmg.'));
    section.appendChild(glitchRow);

    // Despawn on defeat
    const dodRow = document.createElement('div');
    dodRow.className = 'prop-row';
    dodRow.innerHTML = '<label>Despawn on defeat/flee:</label>';
    const dodCb = document.createElement('input');
    dodCb.type = 'checkbox';
    dodCb.checked = !!npcAny['despawnOnDefeat'];
    dodCb.addEventListener('change', () => {
      if (dodCb.checked) npcAny['despawnOnDefeat'] = true;
      else delete npcAny['despawnOnDefeat'];
      emit();
    });
    dodRow.appendChild(dodCb);
    section.appendChild(dodRow);

    // Flee after turns
    const fleeSection = document.createElement('div');
    fleeSection.style.marginTop = '6px';
    fleeSection.innerHTML = '<b style="font-size:10px">Flee Config</b>';
    section.appendChild(fleeSection);

    const fleeTurnsInput = document.createElement('input');
    fleeTurnsInput.type = 'number';
    fleeTurnsInput.min = '1';
    fleeTurnsInput.placeholder = 'off';
    fleeTurnsInput.value = npc.fleeAfterTurns != null ? String(npc.fleeAfterTurns) : '';
    fleeTurnsInput.addEventListener('change', () => {
      const v = parseInt(fleeTurnsInput.value, 10);
      if (isNaN(v) || fleeTurnsInput.value === '') delete npcAny['fleeAfterTurns'];
      else npcAny['fleeAfterTurns'] = v;
      emit();
    });
    addRow('Flee after turns:', fleeTurnsInput, 'Leave blank to disable');

    const fleeHpInput = document.createElement('input');
    fleeHpInput.type = 'number';
    fleeHpInput.min = '0';
    fleeHpInput.max = '100';
    fleeHpInput.placeholder = 'off';
    fleeHpInput.value = npc.fleeAtHpPct != null ? String(Math.round(npc.fleeAtHpPct * 100)) : '';
    fleeHpInput.addEventListener('change', () => {
      const v = parseInt(fleeHpInput.value, 10);
      if (isNaN(v) || fleeHpInput.value === '') delete npcAny['fleeAtHpPct'];
      else npcAny['fleeAtHpPct'] = v / 100;
      emit();
    });
    addRow('Flee at HP%:', fleeHpInput, 'e.g. 50 = flee when HP ≤ 50%');
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
    gateRow.appendChild(
      this.makeInfo('Select an existing gate or type a new ID. Gates are defined in src/data/story/gates.ts.'),
    );
    section.appendChild(gateRow);

    // Passed Dialogue EN
    const passedDef = (npcAny['passedDialogue'] as Array<{ en: string; he: string }>) || [];
    const passedDialogueRow = document.createElement('div');
    passedDialogueRow.className = 'prop-row';
    passedDialogueRow.innerHTML = '<label>Passed (EN):</label>';
    const passedEn = document.createElement('textarea');
    passedEn.value = passedDef.map((d) => d.en).join('\n');
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
    passedHe.value = passedDef.map((d) => d.he).join('\n');
    passedHe.rows = 2;
    passedHe.style.direction = 'rtl';
    passedHe.placeholder = 'תעבור, בבקשה!';
    passedHe.addEventListener('change', () => syncPassedDialogue());
    passedDialogueRowHe.appendChild(passedHe);
    section.appendChild(passedDialogueRowHe);

    function syncPassedDialogue(): void {
      const enLines = passedEn.value.split('\n').filter((l) => l.trim());
      const heLines = passedHe.value.split('\n').filter((l) => l.trim());
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

  // ── NPC Math Questions (pre-dialogue arithmetic challenge) ──
  private renderNPCQuestionsUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;

    const header = document.createElement('div');
    header.className = 'trainer-subsection-header';
    header.innerHTML = '<span>Math Questions</span>';
    section.appendChild(header);

    // ── Enable / disable ──
    const enableRow = document.createElement('div');
    enableRow.className = 'prop-row';
    enableRow.innerHTML = '<label>Has Questions:</label>';
    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.title = 'Player must solve arithmetic problems before this NPC starts talking';
    const currentQ = npcAny['questions'] as { count: number; types?: string[]; repeated?: boolean } | undefined;
    enableCb.checked = !!currentQ;

    const configDiv = document.createElement('div');
    configDiv.style.display = currentQ ? 'block' : 'none';
    configDiv.style.paddingLeft = '8px';
    configDiv.style.borderLeft = '2px solid #444';
    configDiv.style.marginTop = '4px';

    const rebuildConfig = () => {
      configDiv.innerHTML = '';
      const q = npcAny['questions'] as { count: number; types?: string[]; repeated?: boolean } | undefined;
      if (!q) return;

      // Count
      const countRow = document.createElement('div');
      countRow.className = 'prop-row';
      countRow.innerHTML = '<label>Question Count:</label>';
      const countInput = document.createElement('input');
      countInput.type = 'number';
      countInput.min = '1';
      countInput.max = '20';
      countInput.value = String(q.count ?? 1);
      countInput.title = 'How many correct answers are required before dialogue starts';
      countInput.addEventListener('change', () => {
        q.count = Math.max(1, parseInt(countInput.value, 10) || 1);
        emit();
      });
      countRow.appendChild(countInput);
      configDiv.appendChild(countRow);

      // Op type checkboxes
      const opsLabel = document.createElement('div');
      opsLabel.style.cssText = 'font-size:11px;color:#8899bb;margin:6px 0 2px;';
      opsLabel.textContent = 'Operation types (empty = all grade-appropriate):';
      configDiv.appendChild(opsLabel);

      const OPS: Array<{ value: string; label: string }> = [
        { value: '+', label: 'Addition (+)' },
        { value: '-', label: 'Subtraction (−)' },
        { value: '×', label: 'Multiplication (×)' },
        { value: '÷', label: 'Division (÷)' },
      ];

      const opsRow = document.createElement('div');
      opsRow.style.display = 'flex';
      opsRow.style.flexWrap = 'wrap';
      opsRow.style.gap = '6px';

      for (const op of OPS) {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = op.value;
        cb.checked = !q.types || q.types.length === 0 || q.types.includes(op.value);
        cb.addEventListener('change', () => {
          // Collect all checked ops
          const checked = Array.from(opsRow.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked')).map(
            (c) => c.value,
          );
          // If all 4 checked, store undefined (all allowed)
          q.types = checked.length === 4 || checked.length === 0 ? [] : checked;
          emit();
        });
        label.appendChild(cb);
        label.appendChild(document.createTextNode(op.label));
        opsRow.appendChild(label);
      }
      configDiv.appendChild(opsRow);

      // Repeat behavior
      const repeatedRow = document.createElement('div');
      repeatedRow.className = 'prop-row';
      repeatedRow.innerHTML = '<label>Repeat Every Interaction:</label>';
      const repeatedCb = document.createElement('input');
      repeatedCb.type = 'checkbox';
      repeatedCb.checked = q.repeated === true;
      repeatedCb.title = 'When enabled, the player must answer these questions on every interaction with this NPC';
      repeatedCb.addEventListener('change', () => {
        if (repeatedCb.checked) q.repeated = true;
        else delete q.repeated;
        emit();
      });
      repeatedRow.appendChild(repeatedCb);
      configDiv.appendChild(repeatedRow);
    };

    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        npcAny['questions'] = { count: 1, types: [] };
      } else {
        delete npcAny['questions'];
      }
      configDiv.style.display = enableCb.checked ? 'block' : 'none';
      rebuildConfig();
      emit();
    });

    rebuildConfig();

    enableRow.appendChild(enableCb);
    section.appendChild(enableRow);
    section.appendChild(configDiv);
  }

  // ── Post-Flag Dialogue ──
  private renderPostFlagDialogueUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;

    const header = document.createElement('div');
    header.className = 'trainer-subsection-header';
    header.innerHTML = '<span>Post-Flag Dialogue</span>';
    section.appendChild(header);

    const enableRow = document.createElement('div');
    enableRow.className = 'prop-row';
    enableRow.innerHTML = '<label>Has Post-Flag Dialogue:</label>';
    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.title = 'Replace default dialogue once a story flag is set';
    const current = npcAny['postFlagDialogue'] as { flag: string; dialogue: { en: string; he: string }[] } | undefined;
    enableCb.checked = !!current;

    const configDiv = document.createElement('div');
    configDiv.style.display = current ? 'block' : 'none';
    configDiv.style.paddingLeft = '8px';
    configDiv.style.borderLeft = '2px solid #444';
    configDiv.style.marginTop = '4px';

    const rebuildPFD = () => {
      configDiv.innerHTML = '';
      const pfd = npcAny['postFlagDialogue'] as { flag: string; dialogue: { en: string; he: string }[] } | undefined;
      if (!pfd) return;

      // Flag input
      const flagRow = document.createElement('div');
      flagRow.className = 'prop-row';
      flagRow.innerHTML = '<label>Flag:</label>';
      const flagInput = document.createElement('input');
      flagInput.type = 'text';
      flagInput.value = pfd.flag || '';
      flagInput.placeholder = 'e.g. rescued-professor';
      flagInput.addEventListener('change', () => {
        pfd.flag = flagInput.value.trim();
        emit();
      });
      flagRow.appendChild(flagInput);
      configDiv.appendChild(flagRow);

      // EN dialogue
      const enRow = document.createElement('div');
      enRow.className = 'prop-row';
      enRow.innerHTML = '<label>EN:</label>';
      const enTa = document.createElement('textarea');
      enTa.value = (pfd.dialogue || []).map((d) => (typeof d === 'string' ? d : d.en)).join('\n');
      enTa.rows = 2;
      enTa.addEventListener('change', () => syncPFD());
      enRow.appendChild(enTa);
      configDiv.appendChild(enRow);

      // HE dialogue
      const heRow = document.createElement('div');
      heRow.className = 'prop-row';
      heRow.innerHTML = '<label>HE:</label>';
      const heTa = document.createElement('textarea');
      heTa.value = (pfd.dialogue || []).map((d) => (typeof d === 'string' ? '' : d.he)).join('\n');
      heTa.rows = 2;
      heTa.style.direction = 'rtl';
      heTa.addEventListener('change', () => syncPFD());
      heRow.appendChild(heTa);
      configDiv.appendChild(heRow);

      function syncPFD(): void {
        const enLines = enTa.value.split('\n');
        const heLines = heTa.value.split('\n');
        const maxLen = Math.max(enLines.length, heLines.length);
        pfd!.dialogue = [];
        for (let i = 0; i < maxLen; i++) {
          const en = (enLines[i] || '').trim();
          const he = (heLines[i] || '').trim();
          if (en || he) pfd!.dialogue.push({ en, he });
        }
        emit();
      }
    };

    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        npcAny['postFlagDialogue'] = { flag: '', dialogue: [] };
      } else {
        delete npcAny['postFlagDialogue'];
      }
      configDiv.style.display = enableCb.checked ? 'block' : 'none';
      rebuildPFD();
      emit();
    });

    rebuildPFD();

    enableRow.appendChild(enableCb);
    section.appendChild(enableRow);
    section.appendChild(configDiv);
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

    // ── Is Glitched (NULL-X infected) ──
    const glitchRow = document.createElement('div');
    glitchRow.className = 'prop-row';
    glitchRow.innerHTML = '<label>Is Glitched (NULL-X):</label>';
    const glitchCb = document.createElement('input');
    glitchCb.type = 'checkbox';
    glitchCb.checked = !!trainerAny['isGlitched'];
    glitchCb.title = 'All party Pokémon deal more damage and take less damage. Cannot be caught if wild.';
    glitchCb.addEventListener('change', () => {
      if (glitchCb.checked) trainerAny['isGlitched'] = true;
      else delete trainerAny['isGlitched'];
      emit();
    });
    glitchRow.appendChild(glitchCb);
    glitchRow.appendChild(
      this.makeInfo('Villain/NULL-X trainer. Party Pokémon are corrupted (+5-15% dmg dealt, -5-15% dmg taken).'),
    );
    section.appendChild(glitchRow);

    // ── Despawn on defeat ──
    const dodRow = document.createElement('div');
    dodRow.className = 'prop-row';
    dodRow.innerHTML = '<label>Despawn on defeat:</label>';
    const dodCb = document.createElement('input');
    dodCb.type = 'checkbox';
    dodCb.checked = !!trainer.despawnOnDefeat;
    dodCb.title =
      'When checked, this trainer disappears from the map after the player wins the battle (rival/rocket style)';
    dodCb.addEventListener('change', () => {
      if (dodCb.checked) trainerAny['despawnOnDefeat'] = true;
      else delete trainerAny['despawnOnDefeat'];
      emit();
    });
    dodRow.appendChild(dodCb);
    dodRow.appendChild(
      this.makeInfo('Trainer sprite disappears after losing. Use for rival, Team Rocket, story bosses.'),
    );
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
    pbdEnTa.value = trainer.postBattleDialogue.map((d) => (typeof d === 'string' ? d : d.en)).join('\n');
    pbdEnTa.rows = 2;
    pbdEnTa.addEventListener('change', () => syncPostBattle());
    pbdEnRow.appendChild(pbdEnTa);
    section.appendChild(pbdEnRow);

    const pbdHeRow = document.createElement('div');
    pbdHeRow.className = 'prop-row';
    pbdHeRow.innerHTML = '<label>HE:</label>';
    const pbdHeTa = document.createElement('textarea');
    pbdHeTa.value = trainer.postBattleDialogue.map((d) => (typeof d === 'string' ? '' : d.he)).join('\n');
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

    // ── Re-encounter ──
    this.renderReencounterUI(section, trainer, emit);

    // ── Party ──
    this.renderPartyUI(section, trainer, emit);
  }

  private renderReencounterUI(section: HTMLElement, trainer: TrainerData, emit: () => void): void {
    const trainerAny = trainer as unknown as Record<string, unknown>;

    const header = document.createElement('div');
    header.className = 'trainer-subsection-header';
    header.innerHTML = '<span>Re-encounter</span>';
    section.appendChild(header);

    // ── Enable checkbox ──
    const enableRow = document.createElement('div');
    enableRow.className = 'prop-row';
    enableRow.innerHTML = '<label>Enable rematches:</label>';
    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.checked = !!trainer.reencounter;
    enableCb.title = 'Allow the player to battle this trainer multiple times';

    const configDiv = document.createElement('div');
    configDiv.style.display = trainer.reencounter ? 'block' : 'none';
    configDiv.style.paddingLeft = '8px';
    configDiv.style.borderLeft = '2px solid #444';
    configDiv.style.marginTop = '4px';

    enableCb.addEventListener('change', () => {
      if (enableCb.checked) {
        trainerAny['reencounter'] = { count: 3, lvlStep: 2, timeInterval: 1 } satisfies ReencounterConfig;
      } else {
        delete trainerAny['reencounter'];
      }
      configDiv.style.display = enableCb.checked ? 'block' : 'none';
      rebuildConfig();
      emit();
    });
    enableRow.appendChild(enableCb);
    section.appendChild(enableRow);
    section.appendChild(configDiv);

    const rebuildConfig = () => {
      configDiv.innerHTML = '';
      const rc = trainer.reencounter;
      if (!rc) return;

      // Count
      const countRow = document.createElement('div');
      countRow.className = 'prop-row';
      countRow.innerHTML = '<label>Max rematches:</label>';
      const countInput = document.createElement('input');
      countInput.type = 'number';
      countInput.min = '1';
      countInput.max = '99';
      countInput.value = String(rc.count ?? 3);
      countInput.title = 'Total extra battles allowed (e.g. 3 = up to 4 total fights)';
      countInput.addEventListener('change', () => {
        rc.count = Math.max(1, parseInt(countInput.value, 10) || 1);
        emit();
      });
      countRow.appendChild(countInput);
      configDiv.appendChild(countRow);

      // Level step
      const lvlRow = document.createElement('div');
      lvlRow.className = 'prop-row';
      lvlRow.innerHTML = '<label>Level boost/rematch:</label>';
      const lvlInput = document.createElement('input');
      lvlInput.type = 'number';
      lvlInput.min = '0';
      lvlInput.max = '20';
      lvlInput.value = String(rc.lvlStep ?? 2);
      lvlInput.title = 'Levels added to all party members for each subsequent fight';
      lvlInput.addEventListener('change', () => {
        rc.lvlStep = Math.max(0, parseInt(lvlInput.value, 10) || 0);
        emit();
      });
      lvlRow.appendChild(lvlInput);
      configDiv.appendChild(lvlRow);

      // Add to phone
      const phoneRow = document.createElement('div');
      phoneRow.className = 'prop-row';
      phoneRow.innerHTML = '<label>Add to phone:</label>';
      const phoneCb = document.createElement('input');
      phoneCb.type = 'checkbox';
      phoneCb.checked = rc.addToPhone !== false;
      phoneCb.title = 'Trainer appears in the phone contacts after first defeat';
      phoneCb.addEventListener('change', () => {
        if (phoneCb.checked) delete (rc as unknown as Record<string, unknown>)['addToPhone'];
        else rc.addToPhone = false;
        emit();
      });
      phoneRow.appendChild(phoneCb);
      configDiv.appendChild(phoneRow);

      // ── Trigger conditions (all enabled must pass) ────────────────────────
      const triggerHeader = document.createElement('div');
      triggerHeader.style.cssText =
        'font-size:11px;color:#aaa;margin:6px 0 2px;text-transform:uppercase;letter-spacing:0.05em';
      triggerHeader.textContent = 'Trigger conditions (all enabled must pass)';
      configDiv.appendChild(triggerHeader);

      // ── Party level gate ──
      const lvlGateRow = document.createElement('div');
      lvlGateRow.className = 'prop-row';
      lvlGateRow.innerHTML = '<label>Party level gate:</label>';
      const lvlGateCb = document.createElement('input');
      lvlGateCb.type = 'checkbox';
      lvlGateCb.checked = rc.minPartyLevelBoost != null;
      lvlGateCb.title = "Rematch unlocks when player has ≥1 Pokémon near the next encounter's level";
      const lvlGateFields = document.createElement('div');
      lvlGateFields.style.display = rc.minPartyLevelBoost != null ? 'block' : 'none';
      lvlGateFields.style.paddingLeft = '8px';

      const renderLvlGateFields = () => {
        lvlGateFields.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'prop-row';
        row.innerHTML = '<label>Level margin:</label>';
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '20';
        input.value = String(rc.minPartyLevelBoost ?? 3);
        input.title = 'Player needs ≥1 Pokémon at ≥ (trainerBaseLevel + lvlStep×i − margin)';
        input.addEventListener('change', () => {
          rc.minPartyLevelBoost = Math.max(0, parseInt(input.value, 10) || 0);
          emit();
        });
        row.appendChild(input);
        lvlGateFields.appendChild(row);
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px;color:#888;padding:2px 0 4px';
        hint.textContent = 'e.g. 3 → need Lv≥(nextEncounterLv−3)';
        lvlGateFields.appendChild(hint);
      };

      lvlGateCb.addEventListener('change', () => {
        if (lvlGateCb.checked) {
          rc.minPartyLevelBoost = 3;
          lvlGateFields.style.display = 'block';
          renderLvlGateFields();
        } else {
          delete (rc as unknown as Record<string, unknown>)['minPartyLevelBoost'];
          lvlGateFields.style.display = 'none';
        }
        emit();
      });
      if (rc.minPartyLevelBoost != null) renderLvlGateFields();
      lvlGateRow.appendChild(lvlGateCb);
      configDiv.appendChild(lvlGateRow);
      configDiv.appendChild(lvlGateFields);

      // ── Time cooldown ──
      const timeRow = document.createElement('div');
      timeRow.className = 'prop-row';
      timeRow.innerHTML = '<label>Time cooldown:</label>';
      const timeCb = document.createElement('input');
      timeCb.type = 'checkbox';
      timeCb.checked = rc.timeInterval != null && rc.timeInterval > 0;
      timeCb.title = 'Rematch available only after X hours since last defeat';
      const timeFields = document.createElement('div');
      timeFields.style.display = timeCb.checked ? 'block' : 'none';
      timeFields.style.paddingLeft = '8px';

      const renderTimeFields = () => {
        timeFields.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'prop-row';
        row.innerHTML = '<label>Hours to wait:</label>';
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.5';
        input.value = String(rc.timeInterval ?? 1);
        input.title = 'Hours after last defeat before rematch is available';
        input.addEventListener('change', () => {
          rc.timeInterval = Math.max(0, parseFloat(input.value) || 0);
          emit();
        });
        row.appendChild(input);
        timeFields.appendChild(row);
      };

      timeCb.addEventListener('change', () => {
        if (timeCb.checked) {
          rc.timeInterval = rc.timeInterval && rc.timeInterval > 0 ? rc.timeInterval : 1;
          timeFields.style.display = 'block';
          renderTimeFields();
        } else {
          delete (rc as unknown as Record<string, unknown>)['timeInterval'];
          timeFields.style.display = 'none';
        }
        emit();
      });
      if (timeCb.checked) renderTimeFields();
      timeRow.appendChild(timeCb);
      configDiv.appendChild(timeRow);
      configDiv.appendChild(timeFields);

      // ── Story flag ──
      const flagRow = document.createElement('div');
      flagRow.className = 'prop-row';
      flagRow.innerHTML = '<label>Story flag:</label>';
      const flagCb = document.createElement('input');
      flagCb.type = 'checkbox';
      flagCb.checked = 'triggerFlag' in rc;
      flagCb.title = 'Rematch requires a story flag to be set';
      const flagFields = document.createElement('div');
      flagFields.style.display = flagCb.checked ? 'block' : 'none';
      flagFields.style.paddingLeft = '8px';

      const renderFlagFields = () => {
        flagFields.innerHTML = '';
        const fRow = document.createElement('div');
        fRow.className = 'prop-row';
        fRow.innerHTML = '<label>Required flag:</label>';
        const flagInput = document.createElement('input');
        flagInput.type = 'text';
        flagInput.value = rc.triggerFlag ?? '';
        flagInput.placeholder = 'e.g. gym1-cleared';
        flagInput.title = 'Story flag that must be set before rematch becomes available';
        flagInput.addEventListener('change', () => {
          rc.triggerFlag = flagInput.value.trim();
          emit();
        });
        fRow.appendChild(flagInput);
        flagFields.appendChild(fRow);

        // Delay sub-option
        const delayRow = document.createElement('div');
        delayRow.className = 'prop-row';
        delayRow.innerHTML = '<label>+ delay (hours):</label>';
        const delayCb = document.createElement('input');
        delayCb.type = 'checkbox';
        delayCb.checked = (rc.triggerFlagDelayHours ?? 0) > 0;
        delayCb.title = 'Also wait N hours after the flag was set';
        const delayFields = document.createElement('div');
        delayFields.style.display = delayCb.checked ? 'block' : 'none';
        delayFields.style.paddingLeft = '8px';

        const renderDelayFields = () => {
          delayFields.innerHTML = '';
          const dr = document.createElement('div');
          dr.className = 'prop-row';
          dr.innerHTML = '<label>Delay hours:</label>';
          const di = document.createElement('input');
          di.type = 'number';
          di.min = '0';
          di.step = '0.5';
          di.value = String(rc.triggerFlagDelayHours ?? 1);
          di.title = 'Hours after the flag was set before rematch unlocks';
          di.addEventListener('change', () => {
            rc.triggerFlagDelayHours = Math.max(0, parseFloat(di.value) || 0);
            emit();
          });
          dr.appendChild(di);
          delayFields.appendChild(dr);
        };
        delayCb.addEventListener('change', () => {
          if (delayCb.checked) {
            rc.triggerFlagDelayHours = rc.triggerFlagDelayHours ?? 1;
            delayFields.style.display = 'block';
            renderDelayFields();
          } else {
            delete (rc as unknown as Record<string, unknown>)['triggerFlagDelayHours'];
            delayFields.style.display = 'none';
          }
          emit();
        });
        if (delayCb.checked) renderDelayFields();
        delayRow.appendChild(delayCb);
        flagFields.appendChild(delayRow);
        flagFields.appendChild(delayFields);
      };

      flagCb.addEventListener('change', () => {
        if (flagCb.checked) {
          if (!('triggerFlag' in rc)) rc.triggerFlag = '';
          flagFields.style.display = 'block';
          renderFlagFields();
        } else {
          delete (rc as unknown as Record<string, unknown>)['triggerFlag'];
          delete (rc as unknown as Record<string, unknown>)['triggerFlagDelayHours'];
          flagFields.style.display = 'none';
        }
        emit();
      });
      if (flagCb.checked) renderFlagFields();
      flagRow.appendChild(flagCb);
      configDiv.appendChild(flagRow);
      configDiv.appendChild(flagFields);
    };

    rebuildConfig();
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
    const allItems = getItemList()
      .slice()
      .sort((a, b) => {
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
      itemSel.addEventListener('change', () => {
        ri.itemId = itemSel.value;
        updateKeyNote();
        emit();
      });
      row.appendChild(itemSel);

      // Key item info note — shown when selected item is a key item
      const keyNote = document.createElement('div');
      keyNote.style.cssText = 'font-size:10px;color:#ffaa44;margin:2px 0 4px;display:none;';
      const updateKeyNote = () => {
        const selected = allItems.find((it) => it.id === itemSel.value);
        if (selected?.category === 'key') {
          keyNote.style.display = 'block';
          const parts: string[] = ['⚠ Key item — give ONCE only (use reward flag guard)'];
          if (selected.keyFlag) parts.push(`auto-sets: "${selected.keyFlag}"`);
          if (selected.usedFlag) parts.push(`checked in bag when: "${selected.usedFlag}"`);
          keyNote.textContent = parts.join(' · ');
        } else {
          keyNote.style.display = 'none';
        }
      };
      updateKeyNote();
      row.appendChild(keyNote);

      // Quantity
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.value = String(ri.quantity);
      qtyInput.className = 'trainer-slot-qty';
      qtyInput.title = 'Quantity';
      qtyInput.addEventListener('change', () => {
        ri.quantity = parseInt(qtyInput.value, 10) || 1;
        emit();
      });
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
    const isPool = trainer.party.length > 6;
    const headerTitle = isPool
      ? `<span>Party Pool (${trainer.party.length} → picks 6)</span>`
      : '<span>Party</span>';
    header.innerHTML = headerTitle;
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-small btn-add';
    addBtn.textContent = '+ Pokemon';
    addBtn.addEventListener('click', () => {
      trainer.party.push({ pokemonId: 1, level: 5 });
      emit();
    });
    header.appendChild(addBtn);
    section.appendChild(header);

    if (isPool) {
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:10px;color:#aaa;margin:2px 0 6px;';
      hint.textContent = 'Pool mode: battle picks 6 randomly (forced slots always included).';
      section.appendChild(hint);
    }

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
      const currentPkmn = pokemonList.find((p) => p.id === member.pokemonId);
      pkmnInput.value = currentPkmn ? `#${currentPkmn.id} ${currentPkmn.name.en}` : `#${member.pokemonId}`;

      const dropdown = document.createElement('div');
      dropdown.className = 'pokemon-dropdown';
      dropdown.style.display = 'none';

      const renderDropdownItems = (filter: string) => {
        dropdown.innerHTML = '';
        const lowerFilter = filter.toLowerCase();
        const matches = pokemonList
          .filter((p) => p.name.en.toLowerCase().includes(lowerFilter) || String(p.id).includes(lowerFilter))
          .slice(0, 30); // Limit for performance

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
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 150);
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

      // mustInclude slot selector (visible only in pool mode)
      if (isPool) {
        const mustSel = document.createElement('select');
        mustSel.title = 'Force into specific battle slot, or keep in random pool';
        mustSel.style.cssText = 'font-size:10px;padding:1px 2px;max-width:72px;';
        const poolOpt = document.createElement('option');
        poolOpt.value = '';
        poolOpt.textContent = 'Pool';
        mustSel.appendChild(poolOpt);
        for (let s = 0; s < 6; s++) {
          const o = document.createElement('option');
          o.value = String(s);
          o.textContent = `Slot ${s + 1}`;
          mustSel.appendChild(o);
        }
        const currentMust = (member as { mustInclude?: number | null }).mustInclude;
        mustSel.value = currentMust != null ? String(currentMust) : '';
        mustSel.addEventListener('change', () => {
          const v = mustSel.value === '' ? null : parseInt(mustSel.value, 10);
          (member as { mustInclude?: number | null }).mustInclude = v;
          emit();
        });
        slot.appendChild(mustSel);
      }

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
  private renderPartyMoveUI(
    section: HTMLElement,
    member: { pokemonId: number; level: number; moves?: number[] },
    _index: number,
    emit: () => void,
  ): void {
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

  /** Interaction editor for non-trainer NPCs (show-pokemon, show-types, trade-evolution, swap-pokemon). */
  private renderNpcInteractionUI(section: HTMLElement, npc: NPCData): void {
    const emit = () => this.state.emit('map-modified');
    const npcAny = npc as unknown as Record<string, unknown>;
    const interaction = npcAny['interaction'] as NpcInteraction | undefined;

    const container = document.createElement('div');
    container.style.marginTop = '6px';

    const header = document.createElement('div');
    header.className = 'prop-row';
    header.innerHTML = '<label>Interaction:</label>';
    const kindSel = document.createElement('select');
    for (const opt of ['none', 'show-pokemon', 'show-types', 'trade-evolution', 'swap-pokemon']) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if ((interaction?.kind ?? 'none') === opt) o.selected = true;
      kindSel.appendChild(o);
    }
    header.appendChild(kindSel);
    container.appendChild(header);

    const fields = document.createElement('div');
    fields.style.marginLeft = '8px';
    container.appendChild(fields);
    section.appendChild(container);

    const renderFields = () => {
      fields.innerHTML = '';
      const kind = kindSel.value;
      if (kind === 'none') return;

      if (kind === 'show-pokemon') {
        const cur = interaction?.kind === 'show-pokemon' ? interaction : null;
        const selectedIds: number[] = cur ? [...cur.pokemonIds] : [];
        const pokemonList = getPokemonList();

        const label = document.createElement('div');
        label.className = 'prop-row';
        label.innerHTML = '<label>Required Pokemon:</label>';
        fields.appendChild(label);

        // Chips container showing selected pokemon
        const chipsEl = document.createElement('div');
        chipsEl.className = 'intx-chips';
        fields.appendChild(chipsEl);

        const refreshChips = () => {
          chipsEl.innerHTML = '';
          for (const id of selectedIds) {
            const p = pokemonList.find((x) => x.id === id);
            const chip = document.createElement('span');
            chip.className = 'intx-chip';
            chip.textContent = p ? `#${p.id} ${p.name.en}` : `#${id}`;
            const rm = document.createElement('span');
            rm.className = 'intx-chip-rm';
            rm.textContent = '×';
            rm.addEventListener('click', () => {
              selectedIds.splice(selectedIds.indexOf(id), 1);
              npcAny['interaction'] = { kind: 'show-pokemon', pokemonIds: [...selectedIds] };
              emit();
              refreshChips();
            });
            chip.appendChild(rm);
            chipsEl.appendChild(chip);
          }
        };
        refreshChips();

        // Search + dropdown to add more
        const wrapper = this.makePokemonSearchWidget(pokemonList, 'Add Pokemon...', (p) => {
          if (!selectedIds.includes(p.id)) {
            selectedIds.push(p.id);
            npcAny['interaction'] = { kind: 'show-pokemon', pokemonIds: [...selectedIds] };
            emit();
            refreshChips();
          }
        });
        fields.appendChild(wrapper);
      }

      if (kind === 'show-types') {
        const cur = interaction?.kind === 'show-types' ? interaction : null;
        const selectedTypes: string[] = cur ? [...cur.types] : [];

        const label = document.createElement('div');
        label.className = 'prop-row';
        label.innerHTML = '<label>Required Types:</label>';
        fields.appendChild(label);

        // Type badge buttons — click to toggle
        const badgeRow = document.createElement('div');
        badgeRow.className = 'intx-type-row';
        for (const typeName of POKEMON_TYPES) {
          const btn = document.createElement('button');
          btn.className = 'intx-type-btn';
          btn.textContent = typeName;
          const color = TYPE_COLORS[typeName] ?? '#888';
          const applyStyle = () => {
            const active = selectedTypes.includes(typeName);
            btn.style.background = active ? color : '#333';
            btn.style.color = active ? '#fff' : '#aaa';
            btn.style.borderColor = active ? color : '#555';
            btn.style.opacity = active ? '1' : '0.6';
          };
          applyStyle();
          btn.addEventListener('click', () => {
            const idx = selectedTypes.indexOf(typeName);
            if (idx >= 0) selectedTypes.splice(idx, 1);
            else selectedTypes.push(typeName);
            const prev = npcAny['interaction'] as (NpcInteraction & { kind: 'show-types' }) | undefined;
            npcAny['interaction'] = {
              kind: 'show-types',
              types: [...selectedTypes],
              count: prev?.kind === 'show-types' ? prev.count : 1,
            };
            emit();
            applyStyle();
          });
          badgeRow.appendChild(btn);
        }
        fields.appendChild(badgeRow);

        const countRow = document.createElement('div');
        countRow.className = 'prop-row';
        countRow.innerHTML = '<label>Min count:</label>';
        const countInput = document.createElement('input');
        countInput.type = 'number';
        countInput.min = '1';
        countInput.value = String(cur?.count ?? 1);
        countInput.addEventListener('change', () => {
          const prev = npcAny['interaction'] as (NpcInteraction & { kind: 'show-types' }) | undefined;
          if (prev?.kind === 'show-types') {
            prev.count = parseInt(countInput.value, 10) || 1;
            emit();
          }
        });
        countRow.appendChild(countInput);
        fields.appendChild(countRow);
      }

      if (kind === 'trade-evolution') {
        const note = document.createElement('div');
        note.className = 'prop-row';
        note.style.color = '#aaa';
        note.textContent = 'Scans party for trade-evolvable Pokemon.';
        fields.appendChild(note);
      }

      if (kind === 'swap-pokemon') {
        const cur = interaction?.kind === 'swap-pokemon' ? interaction : null;
        const pokemonList = getPokemonList();

        for (const [label, idKey, defaultId] of [
          ['Offers (gives)', 'offersId', 0],
          ['Wants (takes)', 'wantsId', 0],
        ] as [string, 'offersId' | 'wantsId', number][]) {
          const row = document.createElement('div');
          row.className = 'prop-row';
          row.innerHTML = `<label>${label}:</label>`;
          const currentId = cur ? cur[idKey] : defaultId;
          const wrapper = this.makePokemonSearchWidget(
            pokemonList,
            'Search Pokemon...',
            (p) => {
              const prev = (npcAny['interaction'] as Record<string, unknown> | undefined) ?? {};
              npcAny['interaction'] = {
                kind: 'swap-pokemon',
                offersId: 0,
                level: 20,
                wantsId: 0,
                ...prev,
                [idKey]: p.id,
              };
              emit();
            },
            currentId,
          );
          row.appendChild(wrapper);
          fields.appendChild(row);
        }

        // Level stays as a plain number input
        const lvlRow = document.createElement('div');
        lvlRow.className = 'prop-row';
        lvlRow.innerHTML = '<label>Level:</label>';
        const lvlInput = document.createElement('input');
        lvlInput.type = 'number';
        lvlInput.min = '1';
        lvlInput.max = '100';
        lvlInput.value = String(cur?.level ?? 20);
        lvlInput.addEventListener('change', () => {
          const prev = (npcAny['interaction'] as Record<string, unknown> | undefined) ?? {};
          const lvl = parseInt(lvlInput.value, 10) || 20;
          npcAny['interaction'] = { kind: 'swap-pokemon', offersId: 0, wantsId: 0, ...prev, level: lvl };
          emit();
        });
        lvlRow.appendChild(lvlInput);
        fields.appendChild(lvlRow);
      }
    };

    kindSel.addEventListener('change', () => {
      if (kindSel.value === 'none') {
        delete npcAny['interaction'];
      } else if (kindSel.value === 'trade-evolution') {
        npcAny['interaction'] = { kind: 'trade-evolution' } satisfies NpcInteraction;
      } else if (kindSel.value === 'show-pokemon') {
        npcAny['interaction'] = { kind: 'show-pokemon', pokemonIds: [] } satisfies NpcInteraction;
      } else if (kindSel.value === 'show-types') {
        npcAny['interaction'] = { kind: 'show-types', types: [], count: 1 } satisfies NpcInteraction;
      } else if (kindSel.value === 'swap-pokemon') {
        npcAny['interaction'] = { kind: 'swap-pokemon', offersId: 0, level: 20, wantsId: 0 } satisfies NpcInteraction;
      }
      emit();
      renderFields();
    });

    renderFields();
  }

  /**
   * Creates a Pokémon search input + dropdown widget.
   * @param list     Full Pokémon list
   * @param placeholder  Input placeholder text
   * @param onSelect Called with the chosen PokemonData
   * @param initialId If provided, pre-fills the input with this Pokémon
   */
  private makePokemonSearchWidget(
    list: PokemonData[],
    placeholder: string,
    onSelect: (p: PokemonData) => void,
    initialId?: number,
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'pokemon-search-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pokemon-search-input';
    input.placeholder = placeholder;
    if (initialId !== undefined) {
      const found = list.find((p) => p.id === initialId);
      input.value = found ? `#${found.id} ${found.name.en}` : initialId > 0 ? `#${initialId}` : '';
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'pokemon-dropdown';
    dropdown.style.display = 'none';

    const renderItems = (filter: string) => {
      dropdown.innerHTML = '';
      const lower = filter.toLowerCase().replace(/^#\d+\s*/, '');
      const matches = list
        .filter((p) => p.name.en.toLowerCase().includes(lower) || String(p.id).includes(lower))
        .slice(0, 30);
      for (const p of matches) {
        const item = document.createElement('div');
        item.className = 'pokemon-dropdown-item';
        item.textContent = `#${p.id} ${p.name.en}`;
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          onSelect(p);
          input.value = initialId !== undefined ? `#${p.id} ${p.name.en}` : '';
          dropdown.style.display = 'none';
        });
        dropdown.appendChild(item);
      }
      if (matches.length === 0) {
        dropdown.innerHTML = '<div class="pokemon-dropdown-empty">No matches</div>';
      }
    };

    input.addEventListener('focus', () => {
      input.select();
      renderItems(input.value);
      dropdown.style.display = 'block';
    });
    input.addEventListener('input', () => {
      renderItems(input.value);
      dropdown.style.display = 'block';
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        dropdown.style.display = 'none';
      }, 150);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(dropdown);
    return wrapper;
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
    moneyInput.type = 'number';
    moneyInput.min = '0';
    moneyInput.step = '10';
    moneyInput.value = String(reward.money || 0);
    moneyInput.addEventListener('change', () => {
      reward.money = parseInt(moneyInput.value, 10) || 0;
      emit();
    });
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
    storyRow.appendChild(
      this.makeInfo(
        'Sets a flag in pd.flags for story progression. Other NPCs/transitions can check this flag to gate content. E.g. "received-pokedex", "gym1-cleared"',
      ),
    );
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
    flagRow.appendChild(
      this.makeInfo(
        '"Already rewarded" guard — prevents giving reward twice. Auto-generated as "npc-{id}-rewarded" if left empty. Override to share a gate between multiple NPCs.',
      ),
    );
    section.appendChild(flagRow);

    // Reward items
    this.renderRewardItemsUI(section, reward as TrainerReward, emit);
  }

  /**
   * Render a "Story Cross-References" panel for an NPC.
   * Shows which story events trigger on this NPC, and which events will
   * cause it to spawn or despawn (based on its spawnAfter/despawnAfter flags).
   */
  private renderStoryRefsPanel(section: HTMLElement, npc: NPCData): void {
    const events = getStoryEvents();
    const npcAny = npc as unknown as Record<string, unknown>;

    // Events that trigger when player interacts with this NPC
    const interactEvents = events.filter(
      (e) => e.trigger.type === 'npc-interact' && (e.trigger as { npcId: string }).npcId === npc.id,
    );

    // Events that trigger when this NPC's trainer is defeated
    const defeatEvents = events.filter(
      (e) => e.trigger.type === 'trainer-defeated' && (e.trigger as { trainerId: string }).trainerId === npc.id,
    );

    // Events that SET the spawnAfter flag (i.e., what causes this NPC to appear)
    const spawnFlag = npcAny['spawnAfter'] as string | undefined;
    const spawnSources = spawnFlag
      ? events.filter((e) => e.actions.some((a) => a.type === 'set-flag' && (a as { flag: string }).flag === spawnFlag))
      : [];

    // Events that SET the despawnAfter flag (i.e., what causes this NPC to disappear)
    const despawnFlag = npcAny['despawnAfter'] as string | undefined;
    const despawnSources = despawnFlag
      ? events.filter((e) =>
          e.actions.some((a) => a.type === 'set-flag' && (a as { flag: string }).flag === despawnFlag),
        )
      : [];

    // Cutscenes that steal Pokemon and link to this NPC as the thief
    const thiefCutscenes = getAllCutscenes().flatMap((c) => {
      const thiefSteps = c.steps.filter(
        (s): s is Extract<typeof s, { type: 'thief-npc' }> =>
          s.type === 'thief-npc' && (s as { npcId?: string }).npcId === npc.id,
      );
      return thiefSteps.map((s) => ({
        cutsceneId: c.id,
        restoredFlag: (s as { restoredFlag?: string }).restoredFlag ?? `trainer-${npc.id}-defeated`,
      }));
    });

    const hasAny =
      interactEvents.length || defeatEvents.length || spawnSources.length || despawnSources.length || thiefCutscenes.length;
    if (!hasAny) return;

    // Section header
    const header = document.createElement('div');
    header.style.cssText =
      'font-size:11px;color:#8899bb;font-weight:600;margin:10px 0 4px;border-top:1px solid #2a3a5a;padding-top:8px;';
    header.textContent = '📖 Story Cross-References';
    section.appendChild(header);

    const container = document.createElement('div');
    container.style.cssText =
      'background:#0d1a2e;border:1px solid #1e3050;border-radius:4px;padding:6px 8px;font-size:10px;line-height:1.6;';

    const addGroup = (title: string, items: string[], color: string) => {
      if (!items.length) return;
      const titleEl = document.createElement('div');
      titleEl.style.cssText = `color:${color};font-weight:600;margin-top:4px;`;
      titleEl.textContent = title;
      container.appendChild(titleEl);
      for (const item of items) {
        const row = document.createElement('div');
        row.style.cssText = 'color:#aabbcc;padding-left:8px;';
        row.textContent = `• ${item}`;
        container.appendChild(row);
      }
    };

    if (interactEvents.length) {
      addGroup(
        'When player talks to this NPC:',
        interactEvents.map((e) => {
          const actions = e.actions.map((a) => a.type).join(', ');
          return `"${e.id}" → ${actions}`;
        }),
        '#66ddaa',
      );
    }

    if (defeatEvents.length) {
      addGroup(
        'When this trainer is defeated:',
        defeatEvents.map((e) => {
          const actions = e.actions.map((a) => a.type).join(', ');
          return `"${e.id}" → ${actions}`;
        }),
        '#dd8866',
      );
    }

    if (spawnSources.length) {
      const desc = FLAG_DESCRIPTIONS[spawnFlag!] ?? spawnFlag;
      addGroup(
        `What sets spawnAfter (${spawnFlag}):`,
        spawnSources.map((e) => {
          return `"${e.id}" (trigger: ${e.trigger.type})`;
        }),
        '#88aaff',
      );
      void desc; // suppress unused warning
    }

    if (despawnSources.length) {
      const desc = FLAG_DESCRIPTIONS[despawnFlag!] ?? despawnFlag;
      addGroup(
        `What sets despawnAfter (${despawnFlag}):`,
        despawnSources.map((e) => {
          return `"${e.id}" (trigger: ${e.trigger.type})`;
        }),
        '#ffaacc',
      );
      void desc;
    }

    if (thiefCutscenes.length) {
      addGroup(
        '⚔️ Thief — stolen Pokemon restored when:',
        thiefCutscenes.map((t) => `cutscene "${t.cutsceneId}" → flag "${t.restoredFlag}"`),
        '#ffcc44',
      );
    }

    section.appendChild(container);
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
        if (act.type === 'set-flag' && typeof a['flag'] === 'string')
          add(a['flag'] as string, `event "${ev.id}" (sets flag)`);
        if (act.type === 'start-cutscene' && typeof a['cutsceneId'] === 'string') {
          /* skip non-flag */
        }
      }
    }

    // Scan current map NPCs
    for (const n of (this.state.mapData.npcs ?? []) as NPCData[]) {
      if (n.spawnAfter) add(n.spawnAfter, `NPC "${n.id}" → spawnAfter`);
      if (n.despawnAfter) add(n.despawnAfter, `NPC "${n.id}" → despawnAfter`);
      if (n.postFlagDialogue?.flag) add(n.postFlagDialogue.flag, `NPC "${n.id}" → postFlagDialogue`);
    }

    // Seed with all registered FLAGS so they appear in autocomplete
    // even if not yet used anywhere. Existing entries are kept as-is.
    for (const flagValue of Object.values(FLAGS)) {
      if (!usages.has(flagValue)) usages.set(flagValue, []);
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
    roleLabel: string; // e.g. "spawnAfter" — used to exclude self from usage display
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
      const desc = FLAG_DESCRIPTIONS[flag];
      if (desc) opt.label = desc;
      datalist.appendChild(opt);
    }
    input.setAttribute('list', listId);
    inputRow.appendChild(datalist);
    inputRow.appendChild(input);

    // ⓘ button — click to see full usage list
    const infoBtn = document.createElement('button');
    infoBtn.textContent = 'ⓘ';
    infoBtn.title = 'Show where this flag is used';
    infoBtn.style.cssText =
      'width:22px;padding:0;flex-shrink:0;background:#1e2a3a;border:1px solid #445;color:#88aaff;cursor:pointer;border-radius:3px;';
    infoBtn.addEventListener('click', () => {
      const flag = input.value.trim();
      if (!flag) {
        alert('Enter a flag name first.');
        return;
      }
      const usages = allFlags.get(flag) ?? [];
      const self = `NPC "${currentNpcId}" → ${roleLabel}`;
      const others = usages.filter((u) => u !== self);
      if (others.length === 0) {
        alert(
          `Flag "${flag}" is not referenced anywhere else in the registered story events or this map's NPCs.\n\nNote: it may be set/checked in other map files not yet loaded.`,
        );
      } else {
        alert(`Flag "${flag}" is used in:\n\n• ${others.join('\n• ')}`);
      }
    });
    inputRow.appendChild(infoBtn);

    // Info note shown inline
    const infoNote = document.createElement('div');
    infoNote.style.cssText = 'font-size:10px;margin-top:2px;min-height:13px;';

    const updateNote = (flag: string) => {
      if (!flag) {
        infoNote.textContent = '';
        return;
      }
      const self = `NPC "${currentNpcId}" → ${roleLabel}`;
      const others = (allFlags.get(flag) ?? []).filter((u) => u !== self);
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
    spawnRow.appendChild(
      this.makeFlagInput({
        value: npc.spawnAfter,
        allFlags,
        currentNpcId: npc.id,
        roleLabel: 'spawnAfter',
        onChange: (v) => {
          npcAny['spawnAfter'] = v;
          emit();
        },
      }),
    );
    section.appendChild(spawnRow);

    // Despawn After flag — searchable select
    const despawnRow = document.createElement('div');
    despawnRow.className = 'prop-row';
    despawnRow.style.alignItems = 'flex-start';
    const despawnLabel = document.createElement('label');
    despawnLabel.textContent = 'Despawn After:';
    despawnRow.appendChild(despawnLabel);
    despawnRow.appendChild(
      this.makeFlagInput({
        value: npc.despawnAfter,
        allFlags,
        currentNpcId: npc.id,
        roleLabel: 'despawnAfter',
        onChange: (v) => {
          npcAny['despawnAfter'] = v;
          emit();
        },
      }),
    );
    section.appendChild(despawnRow);

    // ── Blocker NPC ──
    const blockerHdr = document.createElement('div');
    blockerHdr.style.cssText = 'font-size:10px;color:#7a8aaa;margin:8px 0 3px;font-weight:600;';
    blockerHdr.textContent = 'Extra Settings';
    section.appendChild(blockerHdr);

    const blockerRow = document.createElement('div');
    blockerRow.className = 'prop-row';
    blockerRow.innerHTML = '<label>Blocker NPC:</label>';
    const blockerCb = document.createElement('input');
    blockerCb.type = 'checkbox';
    blockerCb.checked = !!npcAny['blocker'];
    blockerCb.title = 'NPC uses line-of-sight to block the player until despawn conditions are met';
    blockerRow.appendChild(blockerCb);
    blockerRow.appendChild(
      this.makeInfo(
        'When enabled, NPC shows ! and pushes the player back when they step into its line of sight. Unblocks when its despawn conditions are met.',
      ),
    );
    section.appendChild(blockerRow);

    // Sub-panel shown when blocker is checked
    const blockerPanel = document.createElement('div');
    blockerPanel.style.cssText =
      'margin-left:12px;border-left:2px solid #3a4a6a;padding-left:8px;display:' +
      (npcAny['blocker'] ? 'block' : 'none') +
      ';';
    section.appendChild(blockerPanel);

    // ── By party strength ──
    const partyStrRow = document.createElement('div');
    partyStrRow.className = 'prop-row';
    partyStrRow.innerHTML = '<label>By party strength:</label>';
    const partyStrCb = document.createElement('input');
    partyStrCb.type = 'checkbox';
    const dwp = npcAny['despawnWhenParty'] as { count?: number; minLevel?: number } | undefined;
    partyStrCb.checked = !!dwp;
    partyStrCb.title = 'Block until player has enough Pokémon at a minimum level';
    partyStrRow.appendChild(partyStrCb);
    blockerPanel.appendChild(partyStrRow);

    // Party strength inputs
    const partyInputsDiv = document.createElement('div');
    partyInputsDiv.style.cssText = 'margin-left:12px;display:' + (dwp ? 'block' : 'none') + ';';

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
        npcAny['despawnWhenParty'] = { count: cnt, minLevel: lvl };
        emit();
      } else if (bothEmpty) {
        delete npcAny['despawnWhenParty'];
        emit();
      }
    };
    cntInput.addEventListener('change', updateDwp);
    lvlInput.addEventListener('change', updateDwp);

    partyRow.appendChild(cntLabel);
    partyRow.appendChild(cntInput);
    partyRow.appendChild(lvlLabel);
    partyRow.appendChild(lvlInput);
    partyRow.appendChild(this.makeInfo('NPC unblocks once the player has ≥ count Pokémon all at or above minLevel.'));
    partyInputsDiv.appendChild(partyRow);
    blockerPanel.appendChild(partyInputsDiv);

    partyStrCb.addEventListener('change', () => {
      partyInputsDiv.style.display = partyStrCb.checked ? 'block' : 'none';
      if (!partyStrCb.checked) {
        delete npcAny['despawnWhenParty'];
        cntInput.value = '';
        lvlInput.value = '';
        emit();
      }
    });

    // ── By flag (despawnAfter) ──
    const byFlagRow = document.createElement('div');
    byFlagRow.className = 'prop-row';
    byFlagRow.innerHTML = '<label>By flag:</label>';
    const byFlagCb = document.createElement('input');
    byFlagCb.type = 'checkbox';
    byFlagCb.checked = !!npc.despawnAfter;
    byFlagCb.title = 'Block until a story flag is set (uses Despawn After field)';
    byFlagRow.appendChild(byFlagCb);
    blockerPanel.appendChild(byFlagRow);

    // Flag input shown when by-flag is checked
    const flagInputDiv = document.createElement('div');
    flagInputDiv.style.cssText = 'margin-left:12px;display:' + (npc.despawnAfter ? 'block' : 'none') + ';';
    flagInputDiv.appendChild(
      this.makeFlagInput({
        value: npc.despawnAfter,
        allFlags,
        currentNpcId: npc.id,
        roleLabel: 'despawnAfter',
        onChange: (v) => {
          npcAny['despawnAfter'] = v;
          emit();
        },
      }),
    );
    blockerPanel.appendChild(flagInputDiv);

    byFlagCb.addEventListener('change', () => {
      flagInputDiv.style.display = byFlagCb.checked ? 'block' : 'none';
      if (!byFlagCb.checked) {
        delete npcAny['despawnAfter'];
        emit();
      }
    });

    // ── Block range ──
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
    losRow.appendChild(this.makeInfo('NPC shows ! and blocks the player when they step within this many tiles.'));
    blockerPanel.appendChild(losRow);

    blockerCb.addEventListener('change', () => {
      if (blockerCb.checked) {
        npcAny['blocker'] = true;
      } else {
        delete npcAny['blocker'];
        // Clear blocker-specific data
        delete npcAny['despawnWhenParty'];
        delete npcAny['lineOfSight'];
        partyStrCb.checked = false;
        partyInputsDiv.style.display = 'none';
        byFlagCb.checked = false;
        flagInputDiv.style.display = 'none';
      }
      blockerPanel.style.display = blockerCb.checked ? 'block' : 'none';
      emit();
    });

    // ── Map Clear Blocker ──
    const mapClearRow = document.createElement('div');
    mapClearRow.className = 'prop-row';
    mapClearRow.innerHTML = '<label>Map Clear Blocker:</label>';
    const mapClearCb = document.createElement('input');
    mapClearCb.type = 'checkbox';
    mapClearCb.checked = !!npcAny['mapClearBlocker'];
    mapClearRow.appendChild(mapClearCb);
    mapClearRow.appendChild(
      this.makeInfo(
        'Appends a live "X of Y trainers still standing" line to the END of this NPC\'s dialogue. ' +
          'Counts all type:"trainer" NPCs on the current map, excluding those with excludeFromMapClear:true. ' +
          'Does not require blocker:true — any dialogue NPC can show the count.',
      ),
    );
    section.appendChild(mapClearRow);
    mapClearCb.addEventListener('change', () => {
      if (mapClearCb.checked) npcAny['mapClearBlocker'] = true;
      else delete npcAny['mapClearBlocker'];
      emit();
    });

    // ── Exclude From Map Clear ──
    const excludeRow = document.createElement('div');
    excludeRow.className = 'prop-row';
    excludeRow.innerHTML = '<label>Exclude From Map Clear:</label>';
    const excludeCb = document.createElement('input');
    excludeCb.type = 'checkbox';
    excludeCb.checked = !!npcAny['excludeFromMapClear'];
    excludeRow.appendChild(excludeCb);
    excludeRow.appendChild(
      this.makeInfo(
        'Excludes this trainer from the auto-computed allTrainersDefeatedFlag("mapId") ' +
          '(flag: "all-trainers-defeated-{mapId}") and from the mapClearBlocker count. ' +
          'Use for gym leaders or story bosses that should not count toward clearing the area.',
      ),
    );
    section.appendChild(excludeRow);
    excludeCb.addEventListener('change', () => {
      if (excludeCb.checked) npcAny['excludeFromMapClear'] = true;
      else delete npcAny['excludeFromMapClear'];
      emit();
    });
  }

  /** Render an editable list of walk steps for one phase (main / afterSpawn / afterDespawn). */
  private renderWalkSteps(parent: HTMLElement, steps: import('../systems/npc.js').WalkStep[], emit: () => void): void {
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
        opt.value = d;
        opt.textContent = d;
        if (d === step.dir) opt.selected = true;
        dirSel.appendChild(opt);
      }
      dirSel.addEventListener('change', () => {
        step.dir = dirSel.value as 'up' | 'down' | 'left' | 'right';
        emit();
      });
      row.appendChild(dirSel);

      const stepsIn = document.createElement('input');
      stepsIn.type = 'number';
      stepsIn.value = String(step.steps);
      stepsIn.min = '0';
      stepsIn.style.width = '36px';
      stepsIn.title = 'Tiles to walk (0 = face direction only)';
      stepsIn.addEventListener('change', () => {
        step.steps = Math.max(0, parseInt(stepsIn.value) || 0);
        emit();
      });
      row.appendChild(stepsIn);

      const delayIn = document.createElement('input');
      delayIn.type = 'number';
      delayIn.value = String(step.delay);
      delayIn.min = '0';
      delayIn.step = '0.5';
      delayIn.style.width = '36px';
      delayIn.title = 'Delay after step (s)';
      delayIn.addEventListener('change', () => {
        step.delay = parseFloat(delayIn.value) || 0;
        emit();
      });
      row.appendChild(delayIn);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.title = 'Remove step';
      removeBtn.style.marginLeft = '2px';
      removeBtn.addEventListener('click', () => {
        steps.splice(i, 1);
        emit();
      });
      row.appendChild(removeBtn);

      parent.appendChild(row);
    }

    const addRow = document.createElement('div');
    addRow.className = 'prop-row';
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Step';
    addBtn.addEventListener('click', () => {
      steps.push({ dir: 'right', steps: 2, delay: 0.5 });
      emit();
    });
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
    patKey: 'afterSpawnPattern' | 'beforeDespawnPattern',
    loopKey: 'afterSpawnLoop' | 'beforeDespawnLoop',
    emit: () => void,
  ): void {
    const hdr = document.createElement('div');
    hdr.style.cssText =
      'font-size:10px;color:#7a8aaa;font-weight:600;margin:8px 0 3px;display:flex;align-items:center;gap:6px;';

    const enableCb = document.createElement('input');
    enableCb.type = 'checkbox';
    enableCb.style.width = 'auto';
    enableCb.checked = !!(aw[patKey] && (aw[patKey] as import('../systems/npc.js').WalkStep[]).length > 0);
    enableCb.title = `Enable ${label} pattern`;

    const hdrLabel = document.createElement('span');
    hdrLabel.textContent = `⚡ ${label}`;
    hdrLabel.style.cursor = 'pointer';
    hdrLabel.addEventListener('click', () => {
      enableCb.click();
    });

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
      loopCb.checked = !!aw[loopKey];
      loopCb.style.width = 'auto';
      loopCb.addEventListener('change', () => {
        (aw as unknown as Record<string, unknown>)[loopKey] = loopCb.checked || undefined;
        emit();
      });
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
        npc.autoWalk = {
          pattern: [
            { dir: 'right', steps: 2, delay: 1 },
            { dir: 'left', steps: 2, delay: 1 },
          ],
          loop: true,
        };
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
    loopCb.addEventListener('change', () => {
      aw.loop = loopCb.checked;
      emit();
    });
    loopRow.appendChild(loopCb);
    section.appendChild(loopRow);

    this.renderWalkSteps(section, aw.pattern, emit);

    // ── Phase patterns ──
    this.renderPhasePatternUI(section, aw, 'After Spawn (once)', 'afterSpawnPattern', 'afterSpawnLoop', emit);
    this.renderPhasePatternUI(section, aw, 'Before Despawn (once)', 'beforeDespawnPattern', 'beforeDespawnLoop', emit);
  }

  private renderTransitionProps(tr: MapTransition, index: number): void {
    const section = this.makeSection('Transition');
    const body = PropertiesPanel.sectionBody(section);
    const emit = () => this.state.emit('map-modified');
    const trAny = tr as unknown as Record<string, unknown>;

    // From X/Y
    for (const f of [
      { label: 'From X', key: 'fromX', value: tr.fromX },
      { label: 'From Y', key: 'fromY', value: tr.fromY },
    ]) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<label>${f.label}:</label>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(f.value);
      input.addEventListener('change', () => {
        trAny[f.key] = parseInt(input.value, 10) || 0;
        emit();
      });
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
      if (mapId === tr.toMapId) {
        opt.selected = true;
        foundCurrent = true;
      }
      mapSel.appendChild(opt);
    }
    if (!foundCurrent && tr.toMapId) {
      const opt = document.createElement('option');
      opt.value = tr.toMapId;
      opt.textContent = `${tr.toMapId} (custom)`;
      opt.selected = true;
      mapSel.prepend(opt);
    }
    mapSel.addEventListener('change', () => {
      trAny['toMapId'] = mapSel.value;
      emit();
    });
    mapRow.appendChild(mapSel);
    destContainer.appendChild(mapRow);

    // Spawn vs custom destination toggle
    const spawnRow = document.createElement('div');
    spawnRow.className = 'prop-row';
    spawnRow.innerHTML = '<label>Destination:</label>';
    const spawnSel = document.createElement('select');
    const optSpawn = document.createElement('option');
    optSpawn.value = 'spawn';
    optSpawn.textContent = 'Use spawn point';
    const optCustom = document.createElement('option');
    optCustom.value = 'custom';
    optCustom.textContent = 'Custom coords';
    spawnSel.appendChild(optSpawn);
    spawnSel.appendChild(optCustom);
    const isCustomMode = tr.toX !== undefined || tr.toY !== undefined;
    spawnSel.value = isCustomMode ? 'custom' : 'spawn';
    spawnRow.appendChild(spawnSel);
    spawnRow.appendChild(this.makeInfo('Where the player appears on the destination map'));
    destContainer.appendChild(spawnRow);

    // To X/Y (only shown in custom mode)
    const toXYContainer = document.createElement('div');
    for (const f of [
      { label: 'To X', key: 'toX', value: tr.toX ?? 1 },
      { label: 'To Y', key: 'toY', value: tr.toY ?? 1 },
    ]) {
      const row = document.createElement('div');
      row.className = 'prop-row';
      row.innerHTML = `<label>${f.label}:</label>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(f.value);
      input.addEventListener('change', () => {
        trAny[f.key] = parseInt(input.value, 10) || 0;
        emit();
      });
      row.appendChild(input);
      toXYContainer.appendChild(row);
    }
    const updateToXYVisibility = () => {
      toXYContainer.style.display = spawnSel.value === 'custom' ? '' : 'none';
    };
    updateToXYVisibility();
    spawnSel.addEventListener('change', () => {
      if (spawnSel.value === 'spawn') {
        delete trAny['toX'];
        delete trAny['toY'];
      } else {
        trAny['toX'] = tr.toX ?? 1;
        trAny['toY'] = tr.toY ?? 1;
      }
      updateToXYVisibility();
      emit();
    });
    destContainer.appendChild(toXYContainer);

    // Toggle destination fields visibility
    const updateDestVisibility = () => {
      destContainer.style.display = cb.checked ? 'none' : '';
    };
    updateDestVisibility();
    cb.addEventListener('change', () => {
      tr.returnToPrevious = cb.checked;
      if (cb.checked) {
        delete trAny['toMapId'];
        delete trAny['toX'];
        delete trAny['toY'];
      }
      updateDestVisibility();
      this.state.emit('map-modified');
    });

    body.appendChild(destContainer);

    // Warn if multiple transitions use returnToPrevious (only one entry point is saved at a time)
    const warnEl = document.createElement('div');
    warnEl.style.cssText = 'color:#ff6; font-size:11px; padding:4px 0; display:none;';
    warnEl.textContent =
      '⚠ Multiple "return to prev" transitions on this map — only one entry point is tracked, this may cause loops.';
    body.appendChild(warnEl);
    const checkReturnWarning = () => {
      const count = (this.state.mapData.transitions || []).filter((t) => t.returnToPrevious).length;
      warnEl.style.display = cb.checked && count > 1 ? '' : 'none';
    };
    checkReturnWarning();
    cb.addEventListener('change', () => {
      setTimeout(checkReturnWarning, 0);
    });

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

    // Map path (read-only display — the id field in the JSON is just the short name)
    const idRow = document.createElement('div');
    idRow.className = 'prop-row';
    idRow.innerHTML = `<label>Path:</label><span style="font-family:monospace;font-size:11px">${mapData.id ?? '—'}</span>`;
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
    areaRow.appendChild(
      this.makeInfo(
        'Set to group with other maps (e.g. city buildings). Shared area maps appear in Related Maps below.',
      ),
    );
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
    const liveOutgoing = (mapData.transitions ?? []).map((t) => t.toMapId);
    const related = mapRelationIndex.getRelated(mapId, area, liveOutgoing);

    if (related.length === 0) {
      body.innerHTML = '<div class="prop-empty">No related maps — set Area or add Transitions</div>';
    } else {
      const areaItems = related.filter((r) => r.relation === 'area');
      const outItems = related.filter((r) => r.relation === 'outgoing');
      const inItems = related.filter((r) => r.relation === 'incoming');

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
      nameSpan.style.cssText =
        'font-size:11px; color:#c8d8e8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
      nameSpan.textContent = name;
      item.appendChild(nameSpan);
    }

    item.title = `Open ${mapId} in editor`;
    item.addEventListener('click', () => {
      if (this.onNavigate) {
        this.onNavigate(mapId);
      } else {
        // Fallback: load directly
        loadMapFromProject(mapId)
          .then((data) => {
            const cats = categorizeTiles(this.tiles as Record<string, never>);
            this.state.loadMap(data, cats);
          })
          .catch((err) => console.error('Failed to load map:', err));
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
    const tables = encounterTables as Record<
      string,
      { encounterRate: number; entries: { pokemonId: number; minLevel: number; maxLevel: number; weight: number }[] }
    >;
    if (!tables[tableId]) {
      (tables as Record<string, unknown>)[tableId] = { encounterRate: 0.1, entries: [] };
    }
    const table = tables[tableId];

    // Encounter rate
    const rateRow = document.createElement('div');
    rateRow.className = 'prop-row';
    rateRow.innerHTML = '<label>Rate:</label>';
    const rateInput = document.createElement('input');
    rateInput.type = 'number';
    rateInput.min = '0';
    rateInput.max = '1';
    rateInput.step = '0.01';
    rateInput.value = String(table.encounterRate);
    rateInput.addEventListener('change', () => {
      table.encounterRate = parseFloat(rateInput.value) || 0.1;
      emit();
    });
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
      const cur = pokemonList.find((p) => p.id === entry.pokemonId);
      pkmnInput.value = cur ? `#${cur.id} ${cur.name.en}` : `#${entry.pokemonId}`;

      const dropdown = document.createElement('div');
      dropdown.className = 'pokemon-dropdown';
      dropdown.style.display = 'none';

      const renderDD = (filter: string) => {
        dropdown.innerHTML = '';
        const lf = filter.toLowerCase();
        const matches = pokemonList
          .filter((p) => p.name.en.toLowerCase().includes(lf) || String(p.id).includes(lf))
          .slice(0, 20);
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
      pkmnInput.addEventListener('focus', () => {
        pkmnInput.select();
        renderDD('');
        dropdown.style.display = 'block';
      });
      pkmnInput.addEventListener('input', () => {
        renderDD(pkmnInput.value);
        dropdown.style.display = 'block';
      });
      pkmnInput.addEventListener('blur', () => {
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 150);
      });
      pkmnWrapper.appendChild(pkmnInput);
      pkmnWrapper.appendChild(dropdown);
      row.appendChild(pkmnWrapper);

      // Level range
      const minLvl = document.createElement('input');
      minLvl.type = 'number';
      minLvl.min = '1';
      minLvl.max = '100';
      minLvl.value = String(entry.minLevel);
      minLvl.className = 'trainer-slot-level';
      minLvl.title = 'Min Level';
      minLvl.addEventListener('change', () => {
        entry.minLevel = parseInt(minLvl.value, 10) || 1;
        emit();
      });
      row.appendChild(minLvl);

      const maxLvl = document.createElement('input');
      maxLvl.type = 'number';
      maxLvl.min = '1';
      maxLvl.max = '100';
      maxLvl.value = String(entry.maxLevel);
      maxLvl.className = 'trainer-slot-level';
      maxLvl.title = 'Max Level';
      maxLvl.addEventListener('change', () => {
        entry.maxLevel = parseInt(maxLvl.value, 10) || 1;
        emit();
      });
      row.appendChild(maxLvl);

      // Weight
      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '1';
      weightInput.max = '100';
      weightInput.value = String(entry.weight);
      weightInput.className = 'trainer-slot-qty';
      weightInput.title = 'Weight (spawn chance)';
      weightInput.addEventListener('change', () => {
        entry.weight = parseInt(weightInput.value, 10) || 10;
        emit();
      });
      row.appendChild(weightInput);

      // Remove
      const rmBtn = document.createElement('button');
      rmBtn.className = 'btn-small btn-remove';
      rmBtn.textContent = 'x';
      rmBtn.addEventListener('click', () => {
        table.entries.splice(i, 1);
        emit();
      });
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
      const exportKey = tableId.includes('/') ? tableId.split('/').pop()! : tableId;
      const json = JSON.stringify({ [exportKey]: table }, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        exportBtn.textContent = 'Copied!';
        setTimeout(() => {
          exportBtn.textContent = 'Copy Encounter JSON';
        }, 1500);
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
      if (v > 0) reward.badge = v;
      else delete (reward as unknown as Record<string, unknown>)['badge'];
      emit();
    });
    row.appendChild(sel);
    row.appendChild(
      this.makeInfo(
        'Select a gym badge to award. Badges marked (⚠ assigned) are already given by another NPC on this map.',
      ),
    );
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

  /** Interactive item overrides — lets map designers remap generic item tiles to specific items. */
  private renderInteractiveItemsPanel(): void {
    const mapData = this.state.mapData;
    const section = this.makeSection('Item Overrides');
    const body = PropertiesPanel.sectionBody(section);
    const emit = () => this.state.emit('map-modified');

    const overrides = (mapData.interactiveItems ??= {});

    // Detect all item-type placed objects on the map
    const objects = mapData.objects ?? [];
    const itemObjects = objects.filter((o) => this.tiles[o.key]?.interactType?.id === 'item');

    // Group by tile key
    const byKey = new Map<string, typeof objects>();
    for (const obj of itemObjects) {
      if (!byKey.has(obj.key)) byKey.set(obj.key, []);
      byKey.get(obj.key)!.push(obj);
    }

    // Keys in overrides with no matching objects on this map
    const staleKeys = Object.keys(overrides).filter((k) => !byKey.has(k));

    if (byKey.size === 0 && staleKeys.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'prop-empty';
      empty.textContent = 'No item tiles found on this map.';
      body.appendChild(empty);
      this.container.appendChild(section);
      return;
    }

    // Sorted items list for selects (TMs first, then alphabetical)
    const allItems = getItemList()
      .slice()
      .sort((a, b) => {
        const aTM = getTMEffect(a.id) !== null;
        const bTM = getTMEffect(b.id) !== null;
        if (aTM && !bTM) return -1;
        if (!aTM && bTM) return 1;
        return a.name.en.localeCompare(b.name.en);
      });

    // ── Per tile-key group ─────────────────────────────────────────
    for (const [tileKey, tileObjs] of byKey) {
      const keyEntries = overrides[tileKey] ?? [];

      // Group header
      const grpHeader = document.createElement('div');
      grpHeader.className = 'trainer-subsection-header';
      const grpLabel = document.createElement('span');
      grpLabel.textContent = `${tileKey} (${tileObjs.length})`;
      grpHeader.appendChild(grpLabel);

      const addBtn = document.createElement('button');
      addBtn.className = 'btn-small btn-add';
      addBtn.textContent = '+ Override';
      addBtn.addEventListener('click', () => {
        if (!overrides[tileKey]) overrides[tileKey] = [];
        overrides[tileKey].push({ itemId: allItems[0]?.id ?? 'potion' });
        emit();
      });
      grpHeader.appendChild(addBtn);
      body.appendChild(grpHeader);

      // Detected object info rows (read-only)
      const tileDef = this.tiles[tileKey];
      const defItemId =
        (
          tileDef?.interactType as
            | { id: string; args?: { itemId?: string | null; itemQty?: number | null } }
            | null
            | undefined
        )?.args?.itemId ?? null;
      const defItemQty =
        (
          tileDef?.interactType as
            | { id: string; args?: { itemId?: string | null; itemQty?: number | null } }
            | null
            | undefined
        )?.args?.itemQty ?? 1;
      const defItemName = defItemId ? (allItems.find((i) => i.id === defItemId)?.name.en ?? defItemId) : 'unknown';

      for (const obj of tileObjs) {
        const infoRow = document.createElement('div');
        infoRow.style.cssText = 'font-size:11px; color:#888; padding:1px 6px 1px 12px;';
        infoRow.textContent = `(${obj.x},${obj.y}) default: ${defItemName} ×${defItemQty}`;
        body.appendChild(infoRow);
      }

      // Override entry rows
      if (keyEntries.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'prop-empty';
        emptyMsg.textContent = 'No overrides — using tileset defaults.';
        body.appendChild(emptyMsg);
      }

      for (let i = 0; i < keyEntries.length; i++) {
        const entry = keyEntries[i];
        const row = document.createElement('div');
        row.className = 'trainer-slot';

        // itemId select
        const itemSel = document.createElement('select');
        itemSel.className = 'trainer-slot-select';
        for (const item of allItems) {
          const opt = document.createElement('option');
          opt.value = item.id;
          const tmData = getTMEffect(item.id);
          opt.textContent = tmData
            ? `${item.name.en} — ${getMoveDisplayName(tmData.moveId)} (${item.id})`
            : `${item.name.en} (${item.id})`;
          if (item.id === entry.itemId) opt.selected = true;
          itemSel.appendChild(opt);
        }
        itemSel.addEventListener('change', () => {
          entry.itemId = itemSel.value;
          emit();
        });
        row.appendChild(itemSel);

        // qty
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.min = '1';
        qtyInput.value = String(entry.itemQty ?? 1);
        qtyInput.className = 'trainer-slot-qty';
        qtyInput.title = 'Quantity';
        qtyInput.placeholder = '1';
        qtyInput.addEventListener('change', () => {
          const v = parseInt(qtyInput.value, 10);
          entry.itemQty = v >= 1 ? v : undefined;
          emit();
        });
        row.appendChild(qtyInput);

        // x coord (optional target)
        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.min = '0';
        xInput.value = entry.x !== undefined ? String(entry.x) : '';
        xInput.className = 'trainer-slot-qty';
        xInput.style.width = '42px';
        xInput.title = 'Target X — leave empty for index-based matching';
        xInput.placeholder = 'x?';
        xInput.addEventListener('change', () => {
          entry.x = xInput.value.trim() === '' ? undefined : parseInt(xInput.value, 10);
          emit();
        });
        row.appendChild(xInput);

        // y coord (optional target)
        const yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.min = '0';
        yInput.value = entry.y !== undefined ? String(entry.y) : '';
        yInput.className = 'trainer-slot-qty';
        yInput.style.width = '42px';
        yInput.title = 'Target Y — leave empty for index-based matching';
        yInput.placeholder = 'y?';
        yInput.addEventListener('change', () => {
          entry.y = yInput.value.trim() === '' ? undefined : parseInt(yInput.value, 10);
          emit();
        });
        row.appendChild(yInput);

        // remove
        const rmBtn = document.createElement('button');
        rmBtn.className = 'btn-small btn-remove';
        rmBtn.textContent = 'x';
        rmBtn.title = 'Remove override';
        rmBtn.addEventListener('click', () => {
          overrides[tileKey].splice(i, 1);
          if (overrides[tileKey].length === 0) delete overrides[tileKey];
          emit();
        });
        row.appendChild(rmBtn);
        body.appendChild(row);
      }
    }

    // ── Stale override warnings ────────────────────────────────────
    for (const staleKey of staleKeys) {
      const warnRow = document.createElement('div');
      warnRow.style.cssText =
        'display:flex; align-items:center; gap:6px; background:#3a2200; ' +
        'border:1px solid #ff8800; border-radius:4px; padding:4px 8px; margin:4px 0;';

      const warnText = document.createElement('span');
      warnText.style.cssText = 'flex:1; font-size:11px; color:#ffaa44;';
      warnText.textContent = `⚠ "${staleKey}" has overrides but no matching tiles on this map`;
      warnRow.appendChild(warnText);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-small btn-remove';
      removeBtn.textContent = 'Remove';
      removeBtn.title = 'Delete stale overrides for this key';
      removeBtn.addEventListener('click', () => {
        delete overrides[staleKey];
        emit();
      });
      warnRow.appendChild(removeBtn);
      body.appendChild(warnRow);
    }

    this.container.appendChild(section);
  }
}
