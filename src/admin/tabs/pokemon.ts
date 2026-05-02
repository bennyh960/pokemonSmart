import type { PlayerData, Pokemon, Move } from '../../types/index';
import type { MajorStatusId } from '../../types/battle-metadata';
import { ADMIN_NAME, SAVE_KEY_PREFIX, SLOT_INDEX_KEY } from '../constants';
import movesRaw from '../../data/moves.json';
import naturesRaw from '../../data/natures.json';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoveJson {
  id: number;
  name: { en: string; he: string };
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  mathDifficulty: number;
  damageClass: string;
  description: { en: string; he: string };
}

interface NatureEntry {
  name: { en: string; he: string };
  increasedStat: string | null;
  decreasedStat: string | null;
}

interface SaveMeta {
  slot: number;
  playerName: string;
  savedAt: string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const ALL_MOVES = movesRaw as unknown as MoveJson[];

const NATURES = Object.entries(naturesRaw as unknown as Record<string, NatureEntry>)
  .map(([id, n]) => ({ id: Number(id), ...n }))
  .sort((a, b) => a.id - b.id);

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'poison', label: 'Poison' },
  { value: 'burn', label: 'Burn' },
  { value: 'paralyze', label: 'Paralyze' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'freeze', label: 'Freeze' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadAdminSlots(): SaveMeta[] {
  const raw = localStorage.getItem(SLOT_INDEX_KEY);
  if (!raw) return [];
  try {
    const all = JSON.parse(raw) as SaveMeta[];
    return all.filter(s => s.playerName === ADMIN_NAME);
  } catch { return []; }
}

function loadPlayerData(slot: number): PlayerData | null {
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as PlayerData; } catch { return null; }
}

function buildMove(m: MoveJson): Move {
  return {
    id: m.id,
    name: m.name.en,
    type: m.type as Move['type'],
    power: m.power ?? 0,
    accuracy: m.accuracy ?? 100,
    pp: m.pp,
    currentPp: m.pp,
    mathDifficulty: m.mathDifficulty as Move['mathDifficulty'],
  };
}

function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// ── Move search widget ────────────────────────────────────────────────────────

interface MoveSearchWidget {
  el: HTMLElement;
  getValue(): Move | null;
}

function createMoveSearch(initialMove: Move | null): MoveSearchWidget {
  let currentMove = initialMove;

  const wrapper = document.createElement('div');
  wrapper.className = 'move-search';

  // Chip showing selected move
  const chip = document.createElement('div');
  chip.className = 'move-chip';
  wrapper.appendChild(chip);

  // Search input
  const input = document.createElement('input');
  input.className = 'move-search-input';
  input.type = 'text';
  wrapper.appendChild(input);

  // Dropdown list
  const dropdown = document.createElement('ul');
  dropdown.className = 'move-dropdown';
  dropdown.style.display = 'none';
  wrapper.appendChild(dropdown);

  function refreshChip() {
    if (currentMove) {
      chip.innerHTML = `
        <span class="chip-name">${currentMove.name}</span>
        <span class="type-badge type-${currentMove.type}">${currentMove.type}</span>
        <button class="chip-clear" type="button" title="Remove">&#215;</button>
      `;
      chip.style.display = 'flex';
      chip.querySelector<HTMLButtonElement>('.chip-clear')!.addEventListener('click', () => {
        currentMove = null;
        refreshChip();
      });
      input.placeholder = 'Change move...';
    } else {
      chip.style.display = 'none';
      chip.innerHTML = '';
      input.placeholder = 'Search move...';
    }
  }

  function showDropdown(query: string) {
    if (!query.trim()) { dropdown.style.display = 'none'; return; }
    const q = query.toLowerCase();
    const results = ALL_MOVES.filter(m =>
      m.name.en.toLowerCase().includes(q) || m.name.he.includes(query)
    ).slice(0, 15);

    if (results.length === 0) { dropdown.style.display = 'none'; return; }

    dropdown.innerHTML = '';
    for (const m of results) {
      const li = document.createElement('li');
      li.className = 'move-option';
      li.innerHTML = `
        <span class="move-option-name">${m.name.en}</span>
        <span class="type-badge type-${m.type}">${m.type}</span>
        <span class="text-muted">${m.damageClass} · PP ${m.pp}${m.power ? ` · Pow ${m.power}` : ''}</span>
      `;
      li.addEventListener('mousedown', e => {
        e.preventDefault(); // keep input focused
        currentMove = buildMove(m);
        input.value = '';
        dropdown.style.display = 'none';
        refreshChip();
      });
      dropdown.appendChild(li);
    }
    dropdown.style.display = '';
  }

  input.addEventListener('input', () => showDropdown(input.value));
  input.addEventListener('focus', () => { if (input.value) showDropdown(input.value); });
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; input.value = ''; }, 120);
  });

  refreshChip();

  return { el: wrapper, getValue: () => currentMove };
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function openEditModal(
  pokemon: Pokemon,
  onSave: (updated: Pokemon) => void,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';
  overlay.appendChild(modal);

  function close() { overlay.remove(); }
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `
    <div class="modal-pokemon-info">
      <img class="modal-sprite" src="${spriteUrl(pokemon.id)}" alt="${pokemon.name}" />
      <div>
        <div class="modal-pokemon-name">${pokemon.name}</div>
        <div class="modal-pokemon-id">#${String(pokemon.id).padStart(3, '0')} &nbsp; ${pokemon.types.join(' / ')}</div>
      </div>
    </div>
    <button class="btn-icon" title="Close">&#215;</button>
  `;
  header.querySelector<HTMLButtonElement>('.btn-icon')!.addEventListener('click', close);
  modal.appendChild(header);

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'modal-body';
  modal.appendChild(body);

  // Level
  const levelInput = document.createElement('input');
  levelInput.className = 'form-input form-input--small';
  levelInput.type = 'number';
  levelInput.min = '1';
  levelInput.max = '100';
  levelInput.value = String(pokemon.level);

  const levelRow = document.createElement('div');
  levelRow.className = 'form-row';
  levelRow.innerHTML = '<span class="form-label">Level</span>';
  levelRow.appendChild(levelInput);
  body.appendChild(levelRow);

  // HP / MaxHP
  const hpInput = document.createElement('input');
  hpInput.className = 'form-input form-input--small';
  hpInput.type = 'number';
  hpInput.min = '0';
  hpInput.value = String(pokemon.hp);

  const maxHpInput = document.createElement('input');
  maxHpInput.className = 'form-input form-input--small';
  maxHpInput.type = 'number';
  maxHpInput.min = '1';
  maxHpInput.value = String(pokemon.maxHp);
  maxHpInput.title = 'Max HP';

  const healBtn = document.createElement('button');
  healBtn.className = 'btn btn-sm';
  healBtn.textContent = 'Full Heal';
  healBtn.addEventListener('click', () => { hpInput.value = maxHpInput.value; });

  const hpRow = document.createElement('div');
  hpRow.className = 'form-row';
  hpRow.innerHTML = '<span class="form-label">HP</span>';
  hpRow.appendChild(hpInput);
  const slash = document.createElement('span');
  slash.className = 'text-muted';
  slash.textContent = '/';
  hpRow.appendChild(slash);
  hpRow.appendChild(maxHpInput);
  hpRow.appendChild(healBtn);
  body.appendChild(hpRow);

  // Nature
  const natureSelect = document.createElement('select');
  natureSelect.className = 'form-select';
  natureSelect.innerHTML = '<option value="">— None —</option>';
  for (const n of NATURES) {
    const opt = document.createElement('option');
    opt.value = String(n.id);
    opt.textContent = n.increasedStat
      ? `${n.name.en}  (+${n.increasedStat} / -${n.decreasedStat})`
      : `${n.name.en}  (neutral)`;
    if (n.id === pokemon.natureId) opt.selected = true;
    natureSelect.appendChild(opt);
  }
  const natureRow = document.createElement('div');
  natureRow.className = 'form-row';
  natureRow.innerHTML = '<span class="form-label">Nature</span>';
  natureRow.appendChild(natureSelect);
  body.appendChild(natureRow);

  // Status
  const statusSelect = document.createElement('select');
  statusSelect.className = 'form-select';
  for (const o of STATUS_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === (pokemon.status ?? '')) opt.selected = true;
    statusSelect.appendChild(opt);
  }
  const statusRow = document.createElement('div');
  statusRow.className = 'form-row';
  statusRow.innerHTML = '<span class="form-label">Status</span>';
  statusRow.appendChild(statusSelect);
  body.appendChild(statusRow);

  // isGlitched
  const glitchedCb = document.createElement('input');
  glitchedCb.type = 'checkbox';
  glitchedCb.checked = pokemon.isGlitched;
  const glitchedRow = document.createElement('div');
  glitchedRow.className = 'form-row';
  glitchedRow.innerHTML = '<span class="form-label">Glitched</span>';
  glitchedRow.appendChild(glitchedCb);
  body.appendChild(glitchedRow);

  // Moves section
  const movesSection = document.createElement('div');
  movesSection.className = 'moves-section';

  const movesHeader = document.createElement('div');
  movesHeader.className = 'moves-section-header';
  movesHeader.innerHTML = '<span class="form-label" style="width:auto">Moves</span>';
  const restorePpBtn = document.createElement('button');
  restorePpBtn.className = 'btn btn-sm';
  restorePpBtn.textContent = 'Restore PP';
  movesHeader.appendChild(restorePpBtn);
  movesSection.appendChild(movesHeader);

  // Build 4 move slots
  const moveSlots: MoveSearchWidget[] = [];
  const ppLabels: HTMLSpanElement[] = [];

  for (let i = 0; i < 4; i++) {
    const existing = pokemon.moves[i] ?? null;
    const widget = createMoveSearch(existing);
    moveSlots.push(widget);

    const ppLabel = document.createElement('span');
    ppLabel.className = 'text-muted';
    ppLabel.textContent = existing ? `PP ${existing.currentPp}/${existing.pp}` : '';
    ppLabels.push(ppLabel);

    const slotEl = document.createElement('div');
    slotEl.className = 'move-slot';
    const num = document.createElement('span');
    num.className = 'move-slot-num';
    num.textContent = `${i + 1}.`;
    slotEl.appendChild(num);
    slotEl.appendChild(widget.el);
    const meta = document.createElement('div');
    meta.className = 'move-slot-meta';
    meta.appendChild(ppLabel);
    slotEl.appendChild(meta);
    movesSection.appendChild(slotEl);
  }

  restorePpBtn.addEventListener('click', () => {
    for (let i = 0; i < 4; i++) {
      const m = moveSlots[i].getValue();
      if (m) {
        m.currentPp = m.pp;
        ppLabels[i].textContent = `PP ${m.pp}/${m.pp}`;
      }
    }
  });

  body.appendChild(movesSection);

  // ── Footer ──
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', close);

  const applyBtn = document.createElement('button');
  applyBtn.className = 'btn btn-primary';
  applyBtn.textContent = 'Apply Changes';
  applyBtn.addEventListener('click', () => {
    const moves = moveSlots.map(s => s.getValue()).filter((m): m is Move => m !== null);
    const updated: Pokemon = {
      ...pokemon,
      level: Math.min(100, Math.max(1, Number(levelInput.value) || pokemon.level)),
      hp: Math.max(0, Number(hpInput.value) || 0),
      maxHp: Math.max(1, Number(maxHpInput.value) || pokemon.maxHp),
      natureId: natureSelect.value ? Number(natureSelect.value) : null,
      status: (statusSelect.value || null) as MajorStatusId | null,
      isGlitched: glitchedCb.checked,
      moves,
    };
    onSave(updated);
    close();
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(applyBtn);
  modal.appendChild(footer);

  document.body.appendChild(overlay);
  overlay.focus();
}

// ── Pokemon slot element ──────────────────────────────────────────────────────

function makePokemonSlot(pokemon: Pokemon | null | undefined, onClick: () => void): HTMLElement {
  const slot = document.createElement('div');
  if (!pokemon) {
    slot.className = 'poke-slot poke-slot--empty';
    slot.textContent = '—';
    return slot;
  }
  slot.className = 'poke-slot poke-slot--filled';
  slot.title = `Edit ${pokemon.name}`;
  slot.innerHTML = `
    <img class="poke-slot-sprite" src="${spriteUrl(pokemon.id)}" alt="${pokemon.name}" />
    <span class="poke-slot-name">${pokemon.name}</span>
    <span class="poke-slot-level">Lv.${pokemon.level}</span>
  `;
  slot.addEventListener('click', onClick);
  return slot;
}

// ── Main tab renderer ─────────────────────────────────────────────────────────

export function renderPokemonTab(container: HTMLElement): void {
  let adminSlots = loadAdminSlots();
  let selectedSlot: number | null = adminSlots[0]?.slot ?? null;
  let playerData: PlayerData | null = selectedSlot !== null ? loadPlayerData(selectedSlot) : null;
  let dirty = false;

  function saveToStorage() {
    if (selectedSlot === null || !playerData) return;
    localStorage.setItem(`${SAVE_KEY_PREFIX}${selectedSlot}`, JSON.stringify(playerData));
    dirty = false;
    updateSaveBtn();
  }

  function updateSaveBtn() {
    const btn = container.querySelector<HTMLButtonElement>('#save-btn');
    if (!btn) return;
    btn.textContent = dirty ? '💾 Save Changes *' : '✓ Saved';
    btn.className = `btn${dirty ? ' btn-primary' : ''}`;
    btn.disabled = !dirty;
  }

  // ── Toolbar ──
  const toolbar = document.createElement('div');
  toolbar.className = 'pokemon-toolbar';
  container.appendChild(toolbar);

  if (adminSlots.length === 0) {
    toolbar.innerHTML = '<span class="text-muted">No admin saves found. Make a save named <strong>adminBenny</strong> in the game.</span>';
  } else {
    const label = document.createElement('label');
    label.className = 'save-selector';
    const labelText = document.createElement('span');
    labelText.textContent = 'Save Slot:';
    labelText.style.color = '#8b949e';
    labelText.style.fontSize = '13px';

    const select = document.createElement('select');
    select.id = 'save-slot';
    select.className = 'form-select';
    adminSlots.forEach(s => {
      const opt = document.createElement('option');
      opt.value = String(s.slot);
      opt.textContent = `Slot ${s.slot}  —  ${new Date(s.savedAt).toLocaleString()}`;
      if (s.slot === selectedSlot) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      selectedSlot = Number(select.value);
      playerData = loadPlayerData(selectedSlot);
      dirty = false;
      rebuildGrid();
      updateSaveBtn();
    });
    label.appendChild(labelText);
    label.appendChild(select);
    toolbar.appendChild(label);

    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-sm';
    refreshBtn.textContent = '↺ Reload saves';
    refreshBtn.title = 'Reload save list from localStorage';
    refreshBtn.addEventListener('click', () => {
      adminSlots = loadAdminSlots();
      if (selectedSlot !== null) {
        playerData = loadPlayerData(selectedSlot);
        dirty = false;
      }
      rebuildGrid();
      updateSaveBtn();
    });
    toolbar.appendChild(refreshBtn);
  }

  const saveBtn = document.createElement('button');
  saveBtn.id = 'save-btn';
  saveBtn.className = 'btn';
  saveBtn.textContent = '✓ Saved';
  saveBtn.disabled = true;
  saveBtn.style.marginLeft = 'auto';
  saveBtn.addEventListener('click', saveToStorage);
  toolbar.appendChild(saveBtn);

  // ── Grid area ──
  const gridArea = document.createElement('div');
  container.appendChild(gridArea);

  let activeBox = 0;

  function rebuildGrid() {
    gridArea.innerHTML = '';
    if (!playerData) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No save loaded.';
      gridArea.appendChild(empty);
      return;
    }
    const pd = playerData;

    const grid = document.createElement('div');
    grid.className = 'pokemon-grid';
    gridArea.appendChild(grid);

    // Party section
    const partySection = document.createElement('section');
    partySection.innerHTML = '<h2 class="section-title">Party</h2>';
    const partyGrid = document.createElement('div');
    partyGrid.className = 'party-grid';
    for (let i = 0; i < 6; i++) {
      const poke = pd.party[i] ?? null;
      partyGrid.appendChild(makePokemonSlot(poke, () => {
        if (!poke) return;
        openEditModal(poke, updated => {
          pd.party[i] = updated;
          dirty = true;
          rebuildGrid();
          updateSaveBtn();
        });
      }));
    }
    partySection.appendChild(partyGrid);
    grid.appendChild(partySection);

    // Boxes section
    const boxSection = document.createElement('section');
    boxSection.innerHTML = '<h2 class="section-title">PC Boxes</h2>';

    const boxTabsEl = document.createElement('div');
    boxTabsEl.className = 'box-tabs';
    pd.boxes.forEach((box, i) => {
      const btn = document.createElement('button');
      btn.className = `box-tab${i === activeBox ? ' active' : ''}`;
      btn.textContent = box.name;
      btn.addEventListener('click', () => {
        activeBox = i;
        boxTabsEl.querySelectorAll('.box-tab').forEach((b, j) =>
          b.classList.toggle('active', j === i)
        );
        renderBoxSlots();
      });
      boxTabsEl.appendChild(btn);
    });
    boxSection.appendChild(boxTabsEl);

    const boxSlotsEl = document.createElement('div');
    boxSection.appendChild(boxSlotsEl);

    function renderBoxSlots() {
      boxSlotsEl.innerHTML = '';
      const boxGrid = document.createElement('div');
      boxGrid.className = 'box-grid';
      for (let i = 0; i < 30; i++) {
        const poke = pd.boxes[activeBox]?.pokemon[i] ?? null;
        boxGrid.appendChild(makePokemonSlot(poke, () => {
          if (!poke) return;
          openEditModal(poke, updated => {
            pd.boxes[activeBox].pokemon[i] = updated;
            dirty = true;
            renderBoxSlots();
            updateSaveBtn();
          });
        }));
      }
      boxSlotsEl.appendChild(boxGrid);
    }

    renderBoxSlots();
    grid.appendChild(boxSection);
  }

  rebuildGrid();
}
