import type { PlayerData, Pokemon, Move } from '../../types/index';
import { MOVE_BATTLE_OVERRIDES } from '../../data/move-battle-overrides';
import { ITEM_GAME_DATA, ITEM_ID_TO_SLUG } from '../../data/item-defs';
import { ADMIN_NAME, SAVE_KEY_PREFIX, SLOT_INDEX_KEY, EFFECT_WORKS_LS_KEY } from '../constants';
import movesRaw from '../../data/moves.json';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoveJson {
  id: number;
  name: { en: string; he: string };
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  damageClass: string;
  description: { en: string; he: string };
}

interface SaveMeta {
  slot: number;
  playerName: string;
  savedAt: string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const MOVES = movesRaw as unknown as MoveJson[];
const MOVE_BY_ID = new Map<number, MoveJson>(MOVES.map((m) => [m.id, m]));

// TM/HM lookup: moveId → { label, isHM, itemId, slug }
const TM_MOVE_MAP = new Map<number, { label: string; isHM: boolean; itemId: number; slug: string }>();
for (const [idStr, def] of Object.entries(ITEM_GAME_DATA)) {
  if (def.effect.type === 'tm') {
    const itemId = Number(idStr);
    const slug = ITEM_ID_TO_SLUG[itemId] ?? '';
    TM_MOVE_MAP.set(def.effect.moveId, {
      label: def.name?.en ?? (def.effect.isHM ? 'HM' : 'TM'),
      isHM: def.effect.isHM,
      itemId,
      slug,
    });
  }
}

const EFFECT_NAMES = new Set(Object.keys(MOVE_BATTLE_OVERRIDES));
const ALL_TYPES = [...new Set(MOVES.map((m) => m.type))].sort();

// ── Save helpers ──────────────────────────────────────────────────────────────

function loadAdminSlots(): SaveMeta[] {
  const raw = localStorage.getItem(SLOT_INDEX_KEY);
  if (!raw) return [];
  try {
    const all = JSON.parse(raw) as SaveMeta[];
    return all.filter((s) => s.playerName === ADMIN_NAME);
  } catch {
    return [];
  }
}

function loadPD(slot: number): PlayerData | null {
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerData;
  } catch {
    return null;
  }
}

function savePD(slot: number, pd: PlayerData): void {
  localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(pd));
}

function buildMove(m: MoveJson): Move {
  return {
    id: m.id,
    name: m.name.en,
    type: m.type as Move['type'],
    power: m.power ?? 0,
    accuracy: m.accuracy ?? 0,
    pp: m.pp,
    currentPp: m.pp,
  };
}

function findMew(pd: PlayerData): { poke: Pokemon; write: (updated: Pokemon) => void } | null {
  for (let i = 0; i < pd.party.length; i++) {
    if (pd.party[i]?.id === 151) {
      return {
        poke: pd.party[i],
        write: (p) => {
          pd.party[i] = p;
        },
      };
    }
  }
  for (let bi = 0; bi < pd.boxes.length; bi++) {
    for (let si = 0; si < pd.boxes[bi].pokemon.length; si++) {
      const p = pd.boxes[bi].pokemon[si];
      if (p?.id === 151) {
        return {
          poke: p,
          write: (upd) => {
            pd.boxes[bi].pokemon[si] = upd;
          },
        };
      }
    }
  }
  return null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function toast(msg: string, ok = true) {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed',
    'bottom:22px',
    'right:22px',
    `background:${ok ? '#1a7f37' : '#b91c1c'}`,
    'color:#fff',
    'padding:10px 18px',
    'border-radius:8px',
    'font-size:13px',
    'z-index:9999',
    'transition:opacity 0.3s',
    'box-shadow:0 4px 12px rgba(0,0,0,0.4)',
  ].join(';');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

// ── Effect summary ────────────────────────────────────────────────────────────

function summarizeEffect(moveName: string): string {
  const o = MOVE_BATTLE_OVERRIDES[moveName];
  if (!o) return '';
  const parts: string[] = [];
  if (o.ailment) parts.push(`${o.ailment.status} ${o.ailment.chance}%`);
  if (o.effects?.length) for (const e of o.effects) parts.push(`${e.id} ${e.chance}%`);
  if (o.sideEffects?.length) for (const se of o.sideEffects) parts.push(se.id);
  if (o.statChanges?.length) {
    for (const sc of o.statChanges) {
      const sign = sc.stages > 0 ? '+' : '';
      parts.push(`${sc.stat.slice(0, 3)} ${sign}${sc.stages}(${sc.target === 'user' ? 'self' : 'foe'})`);
    }
  }
  if (o.behaviorTags?.length) parts.push(o.behaviorTags.slice(0, 2).join(', '));
  if (o.flinchChance != null && o.flinchChance > 0) parts.push(`flinch ${o.flinchChance}%`);
  if (o.drainPercent != null) parts.push(`drain ${o.drainPercent}%`);
  if (o.recoilPercent != null) parts.push(`recoil ${o.recoilPercent}%`);
  if (o.healingPercent != null) parts.push(`heal ${o.healingPercent}%`);
  if (o.priority != null && o.priority !== 0) parts.push(`pri ${o.priority > 0 ? '+' : ''}${o.priority}`);
  if (o.critRate != null && o.critRate > 0) parts.push('high-crit');
  if (o.minHits != null) parts.push(`${o.minHits}–${o.maxHits ?? o.minHits}× hits`);
  if (o.minimumDamage != null) parts.push(`min-dmg ${o.minimumDamage}`);
  return parts.join(' | ');
}

// ── Effect works init ─────────────────────────────────────────────────────────

function loadEffectWorks(): Record<number, boolean> {
  let saved: Record<number, boolean> = {};
  const raw = localStorage.getItem(EFFECT_WORKS_LS_KEY);
  if (raw) {
    try {
      saved = JSON.parse(raw) as Record<number, boolean>;
    } catch {
      /* ignore */
    }
  }
  const result: Record<number, boolean> = {};
  for (const m of MOVES) result[m.id] = m.id in saved ? saved[m.id] : EFFECT_NAMES.has(m.name.en);
  return result;
}

// ── Row builder ───────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildRow(m: MoveJson, locale: 'en' | 'he', effectWorks: Record<number, boolean>): string {
  const tmInfo = TM_MOVE_MAP.get(m.id);
  const tmHtml = tmInfo ? `<span class="tm-badge${tmInfo.isHM ? ' tm-badge--hm' : ''}">${tmInfo.label}</span>` : '—';
  const effectSummary = summarizeEffect(m.name.en);
  const checked = effectWorks[m.id] ? 'checked' : '';
  const rowClass = effectWorks[m.id] ? 'row-ok' : '';
  const dir = locale === 'he' ? ' dir="rtl"' : '';
  const name = locale === 'en' ? m.name.en : m.name.he;
  const desc = locale === 'en' ? m.description.en : m.description.he;
  const bagDisabled = tmInfo ? '' : 'disabled title="No TM/HM item exists for this move"';

  return `<tr class="${rowClass}" data-id="${m.id}">
    <td class="col-id">${m.id}</td>
    <td class="col-name"${dir}>${escHtml(name)}</td>
    <td><span class="type-badge type-${m.type}">${m.type}</span></td>
    <td>${m.damageClass}</td>
    <td class="col-pp">${m.pp}</td>
    <td class="col-pow">${m.power ?? '—'}</td>
    <td class="col-acc">${m.accuracy ?? '—'}</td>
    <td class="col-tm">${tmHtml}</td>
    <td class="col-effect">${escHtml(effectSummary)}</td>
    <td class="col-works"><input type="checkbox" data-move-id="${m.id}" ${checked} /></td>
    <td class="col-actions">
      <button class="btn btn-sm" data-action="add-bag" data-move-id="${m.id}" ${bagDisabled}>+Bag</button>
      <button class="btn btn-sm btn-mew" data-action="teach-mew" data-move-id="${m.id}">+Mew</button>
    </td>
    <td class="col-desc"${dir}>${escHtml(desc)}</td>
  </tr>`;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderMovesTab(container: HTMLElement): () => void {
  let search = '';
  let typeFilter = 'all';
  let classFilter = 'all';
  let tmFilter = 'all';
  let effectFilter = 'all';
  let locale: 'en' | 'he' = 'en';
  let effectWorks = loadEffectWorks();
  let adminSlots = loadAdminSlots();
  let selectedSlot: number | null = adminSlots[0]?.slot ?? null;

  container.innerHTML = `
    <div class="moves-tab">
      <div class="moves-toolbar">
        <input id="mv-search" class="form-input" type="text" placeholder="Search moves…" style="width:190px" />
        <select id="mv-type" class="form-select">
          <option value="all">All Types</option>
          ${ALL_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <select id="mv-class" class="form-select">
          <option value="all">All Classes</option>
          <option value="physical">Physical</option>
          <option value="special">Special</option>
          <option value="status">Status</option>
        </select>
        <select id="mv-tm" class="form-select">
          <option value="all">TM/HM: All</option>
          <option value="tm">TM only</option>
          <option value="hm">HM only</option>
          <option value="none">Non-TM/HM</option>
        </select>
        <select id="mv-effect" class="form-select">
          <option value="all">Effect: All</option>
          <option value="yes">Effect: Works ✓</option>
          <option value="no">Effect: Not tested</option>
        </select>
        <button id="mv-locale" class="btn btn-sm">EN / עב</button>
        <span id="mv-count" class="moves-count"></span>
        <div class="save-selector" style="margin-left:auto">
          <span style="color:#8b949e;font-size:12px">Target save:</span>
          <select id="mv-save-slot" class="form-select" style="font-size:12px">
            ${
              adminSlots.length === 0
                ? '<option value="">No admin saves</option>'
                : adminSlots.map((s) => `<option value="${s.slot}">Slot ${s.slot}</option>`).join('')
            }
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="moves-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Class</th>
              <th>PP</th>
              <th>Pow</th>
              <th>Acc</th>
              <th>TM/HM</th>
              <th>Effect</th>
              <th title="Effect implemented &amp; tested">✓</th>
              <th>Actions</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody id="mv-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  const searchInput = container.querySelector<HTMLInputElement>('#mv-search')!;
  const typeSelect = container.querySelector<HTMLSelectElement>('#mv-type')!;
  const classSelect = container.querySelector<HTMLSelectElement>('#mv-class')!;
  const tmSelect = container.querySelector<HTMLSelectElement>('#mv-tm')!;
  const effectSelect = container.querySelector<HTMLSelectElement>('#mv-effect')!;
  const localeBtn = container.querySelector<HTMLButtonElement>('#mv-locale')!;
  const countEl = container.querySelector<HTMLSpanElement>('#mv-count')!;
  const tbody = container.querySelector<HTMLTableSectionElement>('#mv-tbody')!;
  const saveSlotSel = container.querySelector<HTMLSelectElement>('#mv-save-slot')!;

  // ── Filters ──

  function filtered(): MoveJson[] {
    const q = search.toLowerCase();
    return MOVES.filter((m) => {
      if (q && !m.name.en.toLowerCase().includes(q) && !m.name.he.includes(search)) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (classFilter !== 'all' && m.damageClass !== classFilter) return false;
      if (tmFilter !== 'all') {
        const info = TM_MOVE_MAP.get(m.id);
        if (tmFilter === 'tm' && (!info || info.isHM)) return false;
        if (tmFilter === 'hm' && (!info || !info.isHM)) return false;
        if (tmFilter === 'none' && info) return false;
      }
      if (effectFilter === 'yes' && !effectWorks[m.id]) return false;
      if (effectFilter === 'no' && effectWorks[m.id]) return false;
      return true;
    });
  }

  function rebuild() {
    const rows = filtered();
    countEl.textContent = `${rows.length} moves`;
    tbody.innerHTML = rows.map((m) => buildRow(m, locale, effectWorks)).join('');
  }

  let searchTimer = 0;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      search = searchInput.value;
      rebuild();
    }, 150);
  });
  typeSelect.addEventListener('change', () => {
    typeFilter = typeSelect.value;
    rebuild();
  });
  classSelect.addEventListener('change', () => {
    classFilter = classSelect.value;
    rebuild();
  });
  tmSelect.addEventListener('change', () => {
    tmFilter = tmSelect.value;
    rebuild();
  });
  effectSelect.addEventListener('change', () => {
    effectFilter = effectSelect.value;
    rebuild();
  });
  saveSlotSel.addEventListener('change', () => {
    selectedSlot = saveSlotSel.value ? Number(saveSlotSel.value) : null;
    adminSlots = loadAdminSlots();
  });

  localeBtn.addEventListener('click', () => {
    locale = locale === 'en' ? 'he' : 'en';
    localeBtn.textContent = locale === 'en' ? 'EN / עב' : 'עב / EN';
    rebuild();
  });

  // ── isEffectWorks checkbox — event delegation ──

  tbody.addEventListener('change', (e) => {
    const cb = e.target as HTMLInputElement;
    if (cb.type !== 'checkbox' || !cb.dataset['moveId']) return;
    const id = Number(cb.dataset['moveId']);
    effectWorks = { ...effectWorks, [id]: cb.checked };
    localStorage.setItem(EFFECT_WORKS_LS_KEY, JSON.stringify(effectWorks));
    const row = cb.closest('tr');
    if (row) row.className = cb.checked ? 'row-ok' : '';
  });

  // ── Action buttons — event delegation ──

  tbody.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!btn || btn.disabled) return;
    const moveId = Number(btn.dataset['moveId']);
    if (btn.dataset['action'] === 'add-bag') handleAddToBag(moveId);
    else if (btn.dataset['action'] === 'teach-mew') handleTeachMew(moveId);
  });

  // ── Add TM to bag ──

  function handleAddToBag(moveId: number) {
    if (selectedSlot === null) {
      toast('No save slot selected.', false);
      return;
    }
    const tmInfo = TM_MOVE_MAP.get(moveId);
    if (!tmInfo) {
      toast('This move has no TM/HM item.', false);
      return;
    }

    const pd = loadPD(selectedSlot);
    if (!pd) {
      toast('Could not load save.', false);
      return;
    }

    const slug = tmInfo.slug;
    if (!slug) {
      toast('Item slug not found.', false);
      return;
    }

    pd.items[slug] = (pd.items[slug] ?? 0) + 1;
    savePD(selectedSlot, pd);

    const moveName = MOVE_BY_ID.get(moveId)?.name.en ?? String(moveId);
    toast(`✓ Added ${tmInfo.label} (${moveName}) to bag — Slot ${selectedSlot}`);
  }

  // ── Teach Mew ──

  function handleTeachMew(moveId: number) {
    if (selectedSlot === null) {
      toast('No save slot selected.', false);
      return;
    }

    const pd = loadPD(selectedSlot);
    if (!pd) {
      toast('Could not load save.', false);
      return;
    }

    const mewResult = findMew(pd);
    if (!mewResult) {
      toast('Mew (ID 151) not found in party or boxes.', false);
      return;
    }

    const moveJson = MOVE_BY_ID.get(moveId);
    if (!moveJson) {
      toast('Move data not found.', false);
      return;
    }

    const newMove = buildMove(moveJson);
    const { poke, write } = mewResult;

    // Prepend, deduplicate same move ID, cap at 8
    const moves: Move[] = [newMove, ...poke.moves.filter((m) => m.id !== newMove.id)].slice(0, 18);
    write({ ...poke, moves });
    savePD(selectedSlot, pd);

    toast(`✓ Taught ${newMove.name} to Mew (slot ${selectedSlot}) — now move #1`);
  }

  rebuild();
  return () => {
    clearTimeout(searchTimer);
  };
}
