// Registers all quests/gates/cutscenes/events so runtime lookups work
import '../../data/story/content/index';

import { SAVE_KEY_PREFIX, SLOT_INDEX_KEY } from '../constants';
import type { PlayerData } from '../../types/index';
import { GATES } from '../../data/story/gates';
import { getAllCutscenes } from '../../data/story/cutscenes';
import { getStoryEvents } from '../../data/story/events';
import { getQuest } from '../../data/story/quests';
import { FLAGS, FLAG_DESCRIPTIONS } from '../../data/story/flags';
import type { CutsceneDef, CutsceneStep } from '../../data/story/cutscenes';
import type { QuestDef } from '../../data/story/quests';

// ── Vite glob imports ─────────────────────────────────────────────────────────

const ACT_SOURCES = import.meta.glob(
  '../../data/story/content/act*/quest-*.ts',
  { query: '?raw', eager: true },
) as Record<string, { default: string }>;

const MAP_DATA = import.meta.glob(
  '../../data/maps/**/*.json',
  { eager: true },
) as Record<string, { npcs?: NpcEntry[] }>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface NpcEntry {
  id: string;
  name?: string | { en: string; he: string };
  type?: string;
  spriteType?: string;
  x?: number;
  y?: number;
  spawnAfter?: string;
  despawnAfter?: string;
  facing?: string;
}

interface SaveMeta {
  slot: number;
  playerName: string;
  savedAt: string;
}

interface ActInfo {
  path: string;
  fileName: string;
  actNum: string;
  label: string;
  source: string;
  description: string;
  questIds: string[];
  gateIds: string[];
  eventIds: string[];
  cutsceneIds: string[];
  flagEnumKeys: string[];
}

type FlagType = 'story' | 'event-done' | 'trainer' | 'map-clear' | 'badge' | 'npc-reward' | 'item' | 'world' | 'other';

interface FlagItem {
  val: string;
  isSet: boolean;
  type: FlagType;
  isActRelevant: boolean;
  enumKey?: string;
  description: string;
}

// ── Reverse FLAGS lookup ──────────────────────────────────────────────────────

const FLAG_VALUE_TO_KEY: Record<string, string> = {};
for (const [k, v] of Object.entries(FLAGS as Record<string, string>))
  FLAG_VALUE_TO_KEY[v] = k;

// ── Source parsing ────────────────────────────────────────────────────────────

function parseDocComment(source: string): string {
  const match = source.match(/^\/\*\*([\s\S]*?)\*\//);
  if (!match) return '';
  return match[1]
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
    .join('\n');
}

function parseIds(source: string, fnName: string): string[] {
  const ids: string[] = [];
  let from = 0;
  while (true) {
    const idx = source.indexOf(`${fnName}(`, from);
    if (idx === -1) break;
    const m = source.slice(idx, idx + 800).match(/\bid:\s*['"`]([^'"`]+)['"`]/);
    if (m) ids.push(m[1]);
    from = idx + 1;
  }
  return ids;
}

function parseFlagEnumKeys(source: string): string[] {
  const re = /FLAGS\.([A-Z0-9_]+)/g;
  const keys = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) keys.add(m[1]);
  return [...keys];
}

function buildActInfoList(): ActInfo[] {
  const list: ActInfo[] = [];
  for (const [path, mod] of Object.entries(ACT_SOURCES)) {
    const source = mod.default;
    const parts = path.split('/');
    const fileName = parts[parts.length - 1]!;
    const actNum = parts[parts.length - 2] ?? 'unknown';
    list.push({
      path, fileName, actNum,
      label: `Act ${actNum.replace('act', '')} — ${fileName.replace('quest-', '').replace('.ts', '')}`,
      source,
      description:  parseDocComment(source),
      questIds:     parseIds(source, 'registerQuest'),
      gateIds:      parseIds(source, 'registerGate'),
      eventIds:     parseIds(source, 'registerStoryEvent'),
      cutsceneIds:  parseIds(source, 'registerCutscene'),
      flagEnumKeys: parseFlagEnumKeys(source),
    });
  }
  list.sort((a, b) =>
    a.actNum !== b.actNum ? a.actNum.localeCompare(b.actNum) : a.fileName.localeCompare(b.fileName),
  );
  return list;
}

// ── Flag helpers ──────────────────────────────────────────────────────────────

function detectFlagType(val: string): FlagType {
  if (val in FLAG_VALUE_TO_KEY)               return 'story';
  if (val.startsWith('__event-done-'))         return 'event-done';
  if (/^trainer-.+-defeated$/.test(val))       return 'trainer';
  if (val.startsWith('all-trainers-defeated-'))return 'map-clear';
  if (val.startsWith('story-badge-'))          return 'badge';
  if (/^npc-.+-rewarded$/.test(val))           return 'npc-reward';
  if (val.startsWith('obj-') || val.startsWith('gate-pass-')) return 'item';
  if (val.startsWith('cut-') || val.startsWith('strength-')) return 'world';
  return 'other';
}

const TYPE_ORDER: Record<FlagType, number> = {
  'story': 0, 'event-done': 1, 'trainer': 2, 'map-clear': 3,
  'badge': 4, 'npc-reward': 5, 'item': 6, 'world': 7, 'other': 8,
};

const TYPE_LABEL: Record<FlagType, string> = {
  'story':      'story',
  'event-done': 'event-done',
  'trainer':    'trainer',
  'map-clear':  'map-clear',
  'badge':      'badge',
  'npc-reward': 'npc-reward',
  'item':       'item',
  'world':      'world',
  'other':      'other',
};

function buildFlagItems(
  pd: PlayerData,
  actRelevant: Set<string>,
): FlagItem[] {
  const items = new Map<string, FlagItem>();

  // All flags currently in pd.flags
  for (const [val, raw] of Object.entries(pd.flags as Record<string, unknown>)) {
    const isSet = raw === true || raw === 1;
    const enumKey = FLAG_VALUE_TO_KEY[val];
    items.set(val, {
      val, isSet,
      type: detectFlagType(val),
      isActRelevant: actRelevant.has(val),
      enumKey,
      description: FLAG_DESCRIPTIONS[val] ?? '',
    });
  }

  // Act-relevant flags not yet in save (so they're visible even when unset)
  for (const val of actRelevant) {
    if (!items.has(val)) {
      const enumKey = FLAG_VALUE_TO_KEY[val];
      items.set(val, {
        val, isSet: false,
        type: detectFlagType(val),
        isActRelevant: true,
        enumKey,
        description: FLAG_DESCRIPTIONS[val] ?? '',
      });
    }
  }

  return [...items.values()].sort((a, b) => {
    if (a.isActRelevant !== b.isActRelevant) return a.isActRelevant ? -1 : 1;
    if (a.isSet !== b.isSet) return a.isSet ? -1 : 1;
    if (a.type !== b.type) return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
    return a.val.localeCompare(b.val);
  });
}

function computeActRelevant(act: ActInfo, eventIds: string[]): Set<string> {
  const s = new Set<string>();
  for (const key of act.flagEnumKeys) {
    const v = (FLAGS as Record<string, string>)[key];
    if (v) s.add(v);
  }
  for (const id of eventIds) s.add(`__event-done-${id}`);
  return s;
}

// ── NPC helpers ───────────────────────────────────────────────────────────────

function deriveMapId(path: string): string {
  return path.replace('../../data/maps/', '').replace('.json', '');
}

function npcNameStr(npc: NpcEntry): string {
  if (!npc.name) return '';
  return typeof npc.name === 'string' ? npc.name : npc.name.en;
}

function collectNpcIds(cutscene: CutsceneDef): string[] {
  const ids = new Set<string>();
  function walk(steps: CutsceneStep[]) {
    for (const step of steps) {
      if ('npcId' in step && typeof (step as { npcId: string }).npcId === 'string')
        ids.add((step as { npcId: string }).npcId);
      if (step.type === 'dialogue' && step.speakerId) ids.add(step.speakerId);
      if (step.type === 'if-flag') { walk(step.thenSteps); if (step.elseSteps) walk(step.elseSteps); }
    }
  }
  walk(cutscene.steps);
  return [...ids];
}

function findNpcsAcrossMaps(npcIds: string[], extraMapIds: string[]): Map<string, NpcEntry[]> {
  const result = new Map<string, NpcEntry[]>();
  const npcSet = new Set(npcIds);
  for (const [path, data] of Object.entries(MAP_DATA)) {
    const npcs = (data as { npcs?: NpcEntry[] }).npcs ?? [];
    const matching = npcs.filter(n => npcSet.has(n.id));
    if (matching.length > 0) {
      const mid = deriveMapId(path);
      result.set(mid, [...(result.get(mid) ?? []), ...matching]);
    }
  }
  for (const mid of extraMapIds) {
    if (!result.has(mid)) {
      const npcs = (MAP_DATA[`../../data/maps/${mid}.json`] as { npcs?: NpcEntry[] } | undefined)?.npcs ?? [];
      result.set(mid, npcs);
    }
  }
  return result;
}

// ── Save helpers ──────────────────────────────────────────────────────────────

function loadAllSlots(): SaveMeta[] {
  const raw = localStorage.getItem(SLOT_INDEX_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as SaveMeta[]; } catch { return []; }
}

function loadPd(slot: number): PlayerData | null {
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as PlayerData; } catch { return null; }
}

function savePd(slot: number, pd: PlayerData): void {
  localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(pd));
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function section(title: string): { el: HTMLElement; body: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'si-section';
  const h = document.createElement('h3');
  h.className = 'si-section-title';
  h.textContent = title;
  el.appendChild(h);
  const body = document.createElement('div');
  body.className = 'si-section-body';
  el.appendChild(body);
  return { el, body };
}

function subHeader(text: string): HTMLElement {
  const h = document.createElement('h4');
  h.className = 'si-sub-header';
  h.textContent = text;
  return h;
}

function makeTable(headers: string[]): HTMLTableElement {
  const t = document.createElement('table');
  t.className = 'si-table';
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  for (const h of headers) { const th = document.createElement('th'); th.textContent = h; tr.appendChild(th); }
  thead.appendChild(tr); t.appendChild(thead); t.appendChild(document.createElement('tbody'));
  return t;
}

function addRow(table: HTMLTableElement, cells: (string | HTMLElement)[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const c of cells) {
    const td = document.createElement('td');
    if (typeof c === 'string') td.textContent = c; else td.appendChild(c);
    tr.appendChild(td);
  }
  table.querySelector('tbody')!.appendChild(tr);
  return tr;
}

function fmtTrigger(t: { type: string; [k: string]: unknown }): string {
  switch (t.type) {
    case 'map-enter':        return `enter ${t['mapId']}`;
    case 'map-exit':         return `exit ${t['mapId']}`;
    case 'npc-interact':     return `talk → ${t['npcId']}`;
    case 'trainer-defeated': return `defeated ${t['trainerId']}`;
    case 'flag-set':         return `flag set: ${t['flag']}`;
    case 'badge-earned':     return `badge ${t['badge']}`;
    case 'gate-cleared':     return `gate: ${t['gateId']}`;
    default:                 return t.type;
  }
}

function fmtConditions(conds: { type: string; [k: string]: unknown }[]): string {
  if (!conds.length) return '—';
  return conds.map(c => {
    switch (c.type) {
      case 'flag':           return `flag:${c['flag']}`;
      case 'flag-not':       return `!${c['flag']}`;
      case 'quest-active':   return `quest?${c['questId']}`;
      case 'quest-complete': return `quest✓${c['questId']}`;
      case 'badge-count':    return `badges≥${c['min']}`;
      default:               return c.type;
    }
  }).join(', ');
}

function typeBadge(type: FlagType): HTMLElement {
  const s = document.createElement('span');
  s.className = `si-type-badge si-type-${type}`;
  s.textContent = TYPE_LABEL[type];
  return s;
}

// ── Flag section renderer ─────────────────────────────────────────────────────

function renderFlagSection(
  body: HTMLElement,
  act: ActInfo,
  actRelevant: Set<string>,
  getPlayerData: () => PlayerData | null,
  getSelectedSlot: () => number | null,
  onSave: (pd: PlayerData) => void,
) {
  let searchQuery = '';
  let typeFilter: FlagType | 'all' | 'act' = 'all';
  let showUnset = true;

  // ── Controls row ──
  const controls = document.createElement('div');
  controls.className = 'si-flag-controls';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'form-input';
  searchInput.placeholder = 'Search flags...';
  searchInput.style.flex = '1';
  searchInput.style.minWidth = '160px';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'form-select';
  const typeOptions: { value: string; label: string }[] = [
    { value: 'all',        label: 'All types' },
    { value: 'act',        label: '★ Act only' },
    { value: 'story',      label: 'story' },
    { value: 'event-done', label: 'event-done' },
    { value: 'trainer',    label: 'trainer' },
    { value: 'map-clear',  label: 'map-clear' },
    { value: 'badge',      label: 'badge' },
    { value: 'npc-reward', label: 'npc-reward' },
    { value: 'item',       label: 'item' },
    { value: 'world',      label: 'world' },
    { value: 'other',      label: 'other' },
  ];
  for (const o of typeOptions) {
    const opt = document.createElement('option');
    opt.value = o.value; opt.textContent = o.label;
    typeSelect.appendChild(opt);
  }

  const unsetToggle = document.createElement('button');
  unsetToggle.className = 'btn btn-sm';
  unsetToggle.textContent = 'Hide unset';
  unsetToggle.title = 'Toggle showing act-relevant flags that are not yet set';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-sm si-reset-btn';
  resetBtn.textContent = 'Reset act';
  resetBtn.title = 'Clear all act-relevant flags from this save';

  controls.appendChild(searchInput);
  controls.appendChild(typeSelect);
  controls.appendChild(unsetToggle);
  controls.appendChild(resetBtn);
  body.appendChild(controls);

  // ── Add-flag row ──
  const addRow_ = document.createElement('div');
  addRow_.className = 'si-addmap-row';
  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.className = 'form-input';
  addInput.placeholder = 'Set flag by value, e.g. __event-done-evt-wife-talked';
  addInput.style.flex = '1';
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-sm btn-primary';
  addBtn.textContent = 'Set flag';
  addRow_.appendChild(addInput);
  addRow_.appendChild(addBtn);
  body.appendChild(addRow_);

  // ── Table container ──
  const tableWrap = document.createElement('div');
  tableWrap.className = 'si-flag-table-wrap';
  body.appendChild(tableWrap);

  // ── Counter ──
  const counter = document.createElement('div');
  counter.className = 'si-flag-counter';
  body.appendChild(counter);

  function rebuild() {
    tableWrap.innerHTML = '';
    const pd = getPlayerData();
    if (!pd) {
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent = 'No save data for this slot.';
      tableWrap.appendChild(p);
      counter.textContent = '';
      return;
    }

    const allItems = buildFlagItems(pd, actRelevant);
    const q = searchQuery.toLowerCase();
    const filtered = allItems.filter(item => {
      if (!showUnset && !item.isSet) return false;
      if (typeFilter === 'act' && !item.isActRelevant) return false;
      if (typeFilter !== 'all' && typeFilter !== 'act' && item.type !== typeFilter) return false;
      if (q && !item.val.toLowerCase().includes(q) && !(item.description ?? '').toLowerCase().includes(q)) return false;
      return true;
    });

    const setCount  = allItems.filter(i => i.isSet).length;
    const total     = Object.keys((pd.flags as Record<string, unknown>)).length;
    counter.textContent = `${setCount} set in save · ${allItems.filter(i => i.isActRelevant && i.isSet).length} act flags set · showing ${filtered.length}`;

    if (filtered.length === 0) {
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.style.padding = '12px 0';
      p.textContent = 'No flags match the current filter.';
      tableWrap.appendChild(p);
      return;
    }

    const t = makeTable(['Flag value', 'Type', '', 'Description', '']);
    for (const item of filtered) {
      const valEl = document.createElement('div');
      valEl.className = 'si-flag-val-cell';

      const code = document.createElement('code');
      code.className = `si-flag-code${item.isSet ? '' : ' si-flag-code--unset'}`;
      code.textContent = item.val;
      valEl.appendChild(code);

      if (item.enumKey) {
        const key = document.createElement('span');
        key.className = 'si-flag-enumkey';
        key.textContent = item.enumKey;
        valEl.appendChild(key);
      }

      const actEl = document.createElement('span');
      actEl.className = `si-act-star${item.isActRelevant ? ' si-act-star--on' : ''}`;
      actEl.title = item.isActRelevant ? 'Relevant to this act' : '';
      actEl.textContent = item.isActRelevant ? '★' : '';

      const descEl = document.createElement('span');
      descEl.className = 'text-muted';
      descEl.style.fontSize = '11px';
      descEl.textContent = item.description || '—';

      const btn = document.createElement('button');
      btn.className = `btn btn-sm${item.isSet ? '' : ' btn-primary'}`;
      btn.textContent = item.isSet ? 'Clear' : 'Set';
      btn.addEventListener('click', () => {
        const slot = getSelectedSlot();
        const pd2 = getPlayerData();
        if (slot === null || !pd2) return;
        if (item.isSet) delete (pd2.flags as Record<string, unknown>)[item.val];
        else (pd2.flags as Record<string, boolean>)[item.val] = true;
        onSave(pd2);
        rebuild();
      });

      const tr = addRow(t, [valEl, typeBadge(item.type), actEl, descEl, btn]);
      if (!item.isSet) tr.classList.add('si-row-unset');
      else if (item.isActRelevant) tr.classList.add('si-row-act');
      void total; // used in counter
    }

    tableWrap.appendChild(t);
  }

  // ── Wire controls ──
  searchInput.addEventListener('input', () => { searchQuery = searchInput.value; rebuild(); });
  typeSelect.addEventListener('change', () => { typeFilter = typeSelect.value as typeof typeFilter; rebuild(); });
  unsetToggle.addEventListener('click', () => {
    showUnset = !showUnset;
    unsetToggle.textContent = showUnset ? 'Hide unset' : 'Show unset';
    rebuild();
  });
  resetBtn.addEventListener('click', () => {
    const slot = getSelectedSlot();
    const pd = getPlayerData();
    if (!pd || slot === null) return;
    const toClear = [...actRelevant].filter(v => (pd.flags as Record<string, unknown>)[v] !== undefined);
    if (!toClear.length) { alert('No act flags are currently set.'); return; }
    if (!confirm(`Clear ${toClear.length} act flags from Slot ${slot}?`)) return;
    for (const v of toClear) delete (pd.flags as Record<string, unknown>)[v];
    onSave(pd);
    rebuild();
  });
  addBtn.addEventListener('click', () => {
    const slot = getSelectedSlot();
    const pd = getPlayerData();
    const val = addInput.value.trim();
    if (!val || !pd || slot === null) return;
    (pd.flags as Record<string, boolean>)[val] = true;
    onSave(pd);
    addInput.value = '';
    rebuild();
  });
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });

  rebuild();
  return { rebuild };
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderStoryTab(container: HTMLElement): (() => void) | void {
  const acts = buildActInfoList();
  let selectedAct: ActInfo | null = acts[0] ?? null;
  let slots = loadAllSlots();
  let selectedSlot: number | null = slots[0]?.slot ?? null;
  let playerData: PlayerData | null = selectedSlot !== null ? loadPd(selectedSlot) : null;
  let extraMapIds: string[] = [];

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'si-root';
  container.appendChild(root);

  // ── Persistent top bar ──
  const topBar = document.createElement('div');
  topBar.className = 'si-topbar';
  root.appendChild(topBar);

  const actLabel = document.createElement('span');
  actLabel.className = 'si-topbar-label';
  actLabel.textContent = 'Act:';
  topBar.appendChild(actLabel);

  const actSelect = document.createElement('select');
  actSelect.className = 'form-select';
  actSelect.style.minWidth = '240px';
  for (const act of acts) {
    const opt = document.createElement('option');
    opt.value = act.path; opt.textContent = act.label;
    actSelect.appendChild(opt);
  }
  topBar.appendChild(actSelect);

  const div1 = document.createElement('span');
  div1.style.cssText = 'width:1px;height:20px;background:#30363d;flex-shrink:0;';
  topBar.appendChild(div1);

  const slotLabel = document.createElement('span');
  slotLabel.className = 'si-topbar-label';
  slotLabel.textContent = 'Slot:';
  topBar.appendChild(slotLabel);

  const slotSelect = document.createElement('select');
  slotSelect.className = 'form-select';
  slotSelect.style.minWidth = '240px';
  topBar.appendChild(slotSelect);

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'btn btn-sm';
  reloadBtn.textContent = '↺';
  reloadBtn.title = 'Reload save';
  topBar.appendChild(reloadBtn);

  function rebuildSlotSelect() {
    slotSelect.innerHTML = '';
    if (!slots.length) {
      const o = document.createElement('option');
      o.textContent = 'No saves found'; o.disabled = true;
      slotSelect.appendChild(o);
    } else {
      for (const s of slots) {
        const o = document.createElement('option');
        o.value = String(s.slot);
        o.textContent = `Slot ${s.slot} — ${s.playerName} (${new Date(s.savedAt).toLocaleDateString()})`;
        if (s.slot === selectedSlot) o.selected = true;
        slotSelect.appendChild(o);
      }
    }
  }
  rebuildSlotSelect();

  slotSelect.addEventListener('change', () => {
    selectedSlot = Number(slotSelect.value);
    playerData = loadPd(selectedSlot);
    render();
  });
  reloadBtn.addEventListener('click', () => {
    slots = loadAllSlots();
    if (selectedSlot !== null) playerData = loadPd(selectedSlot);
    rebuildSlotSelect();
    render();
  });
  actSelect.addEventListener('change', () => {
    selectedAct = acts.find(a => a.path === actSelect.value) ?? null;
    extraMapIds = [];
    render();
  });

  const content = document.createElement('div');
  root.appendChild(content);

  function render() {
    content.innerHTML = '';
    if (!selectedAct) return;
    const act = selectedAct;

    const cutscenes = getAllCutscenes().filter(c => act.cutsceneIds.includes(c.id));
    const evts      = getStoryEvents().filter(e => act.eventIds.includes(e.id));
    const actRelevant = computeActRelevant(act, evts.map(e => e.id));

    // ── 1. Description ──
    if (act.description) {
      const s = section('Description');
      const pre = document.createElement('pre');
      pre.className = 'si-description';
      pre.textContent = act.description;
      s.body.appendChild(pre);
      content.appendChild(s.el);
    }

    // ── 2. Flags (full save state) ──
    const flagSec = section('Flags');
    renderFlagSection(
      flagSec.body, act, actRelevant,
      () => playerData,
      () => selectedSlot,
      (pd) => {
        playerData = pd;
        if (selectedSlot !== null) savePd(selectedSlot, pd);
      },
    );
    content.appendChild(flagSec.el);

    // ── 3. Summary ──
    const sumSec = section('Summary');
    const quests = act.questIds.map(id => getQuest(id)).filter(Boolean) as QuestDef[];
    if (quests.length) {
      sumSec.body.appendChild(subHeader(`Quests (${quests.length})`));
      const t = makeTable(['ID', 'Title', 'Objective']);
      for (const q of quests) addRow(t, [q.id, q.title.en, q.objective.en]);
      sumSec.body.appendChild(t);
    }
    const gates = act.gateIds.map(id => GATES[id]).filter(Boolean);
    if (gates.length) {
      sumSec.body.appendChild(subHeader(`Gates (${gates.length})`));
      const t = makeTable(['ID', 'Type', 'Qs', 'Bonus', 'Penalty']);
      for (const g of gates) {
        const sc = g.sessionConfig;
        addRow(t, [
          g.id, g.triggerType, String(sc.questionsRequired),
          sc.bonusEnabled ? `×${sc.bonusMultiplier}` : '—',
          sc.penaltyAmount ? `${sc.penaltyAmount} ₽ <${sc.penaltyThreshold * 100}%` : '—',
        ]);
      }
      sumSec.body.appendChild(t);
    }
    if (evts.length) {
      sumSec.body.appendChild(subHeader(`Events (${evts.length})`));
      const t = makeTable(['ID', 'Trigger', 'Conditions']);
      for (const e of evts)
        addRow(t, [
          e.id,
          fmtTrigger(e.trigger as { type: string; [k: string]: unknown }),
          fmtConditions((e.conditions ?? []) as { type: string; [k: string]: unknown }[]),
        ]);
      sumSec.body.appendChild(t);
    }
    if (cutscenes.length) {
      sumSec.body.appendChild(subHeader(`Cutscenes (${cutscenes.length})`));
      const t = makeTable(['ID', 'Steps', 'Phone caller', 'Skippable']);
      for (const c of cutscenes)
        addRow(t, [c.id, String(c.steps.length), c.phoneCaller?.en ?? '—', c.skippable ? 'Yes' : 'No']);
      sumSec.body.appendChild(t);
    }
    content.appendChild(sumSec.el);

    // ── 4. NPCs ──
    const npcSec = section('NPCs');

    const cutsceneNpcIds = new Set<string>();
    for (const c of cutscenes) collectNpcIds(c).forEach(id => cutsceneNpcIds.add(id));
    for (const e of evts)
      if (e.trigger.type === 'npc-interact') cutsceneNpcIds.add(e.trigger.npcId);

    if (extraMapIds.length) {
      const chips = document.createElement('div');
      chips.className = 'si-chips';
      for (const mid of extraMapIds) {
        const chip = document.createElement('span');
        chip.className = 'si-chip';
        chip.textContent = mid;
        const rm = document.createElement('button');
        rm.className = 'si-chip-remove'; rm.textContent = '×';
        rm.addEventListener('click', () => { extraMapIds = extraMapIds.filter(m => m !== mid); render(); });
        chip.appendChild(rm);
        chips.appendChild(chip);
      }
      npcSec.body.appendChild(chips);
    }

    const addMapRow = document.createElement('div');
    addMapRow.className = 'si-addmap-row';
    const mapInput = document.createElement('input');
    mapInput.type = 'text'; mapInput.className = 'form-input';
    mapInput.placeholder = 'Add extra map, e.g. fractalis/beach';
    mapInput.style.flex = '1';
    const addMapBtn = document.createElement('button');
    addMapBtn.className = 'btn btn-sm'; addMapBtn.textContent = '+ Add Map';
    addMapBtn.addEventListener('click', () => {
      const v = mapInput.value.trim();
      if (v && !extraMapIds.includes(v)) { extraMapIds.push(v); mapInput.value = ''; render(); }
    });
    mapInput.addEventListener('keydown', e => { if (e.key === 'Enter') addMapBtn.click(); });
    addMapRow.appendChild(mapInput);
    addMapRow.appendChild(addMapBtn);
    npcSec.body.appendChild(addMapRow);

    const npcMap = findNpcsAcrossMaps([...cutsceneNpcIds], extraMapIds);

    if (npcMap.size > 0) {
      for (const [mapId, npcs] of npcMap) {
        npcSec.body.appendChild(subHeader(`Map: ${mapId}`));
        if (!npcs.length) {
          const p = document.createElement('p'); p.className = 'text-muted'; p.style.padding = '4px 0 8px';
          p.textContent = 'No NPCs found.'; npcSec.body.appendChild(p); continue;
        }
        const t = makeTable(['NPC ID', 'Name', 'Type', 'Sprite', 'spawnAfter', 'despawnAfter', 'Coords']);
        for (const n of npcs) {
          addRow(t, [
            n.id, npcNameStr(n), n.type ?? '—', n.spriteType ?? '—',
            makeFlagCell(n.spawnAfter, getPlayerData, getSelectedSlot, render),
            makeFlagCell(n.despawnAfter, getPlayerData, getSelectedSlot, render),
            n.x !== undefined ? `(${n.x}, ${n.y})` : '?',
          ]);
        }
        npcSec.body.appendChild(t);
      }
      const foundIds = new Set([...npcMap.values()].flat().map(n => n.id));
      const missing = [...cutsceneNpcIds].filter(id => !foundIds.has(id));
      if (missing.length) {
        npcSec.body.appendChild(subHeader('Not found in any map'));
        const ul = document.createElement('ul'); ul.className = 'si-missing-list';
        for (const id of missing) {
          const li = document.createElement('li'); li.className = 'si-missing-item'; li.textContent = id;
          ul.appendChild(li);
        }
        npcSec.body.appendChild(ul);
      }
    } else if (!cutsceneNpcIds.size) {
      const p = document.createElement('p'); p.className = 'text-muted';
      p.textContent = 'No NPC references found.'; npcSec.body.appendChild(p);
    } else {
      const p = document.createElement('p'); p.className = 'text-muted';
      p.textContent = 'NPC IDs found in cutscenes but not in any map JSON:'; npcSec.body.appendChild(p);
      const ul = document.createElement('ul'); ul.className = 'si-missing-list';
      for (const id of cutsceneNpcIds) {
        const li = document.createElement('li'); li.className = 'si-missing-item'; li.textContent = id;
        ul.appendChild(li);
      }
      npcSec.body.appendChild(ul);
    }

    content.appendChild(npcSec.el);
  }

  function getPlayerData() { return playerData; }
  function getSelectedSlot() { return selectedSlot; }

  render();
}

function makeFlagCell(
  flagVal: string | undefined,
  getPlayerData: () => PlayerData | null,
  getSelectedSlot: () => number | null,
  onToggle: () => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'si-npc-flag-cell';
  if (!flagVal) { wrap.textContent = '—'; wrap.style.color = '#484f58'; return wrap; }

  const code = document.createElement('code');
  code.className = 'si-flag-code'; code.textContent = flagVal;
  wrap.appendChild(code);

  const pd = getPlayerData();
  if (!pd) return wrap;

  const isSet = !!(pd.flags as Record<string, boolean | undefined>)[flagVal];
  const badge = document.createElement('span');
  badge.className = `si-flag-state ${isSet ? 'si-flag-set' : 'si-flag-unset'}`;
  badge.textContent = isSet ? '✓' : '—';
  wrap.appendChild(badge);

  const btn = document.createElement('button');
  btn.className = `btn btn-sm${isSet ? '' : ' btn-primary'}`;
  btn.textContent = isSet ? 'Clear' : 'Set';
  btn.addEventListener('click', () => {
    const slot = getSelectedSlot(); const pd2 = getPlayerData();
    if (slot === null || !pd2) return;
    if (isSet) delete (pd2.flags as Record<string, unknown>)[flagVal];
    else (pd2.flags as Record<string, boolean>)[flagVal] = true;
    localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(pd2));
    onToggle();
  });
  wrap.appendChild(btn);
  return wrap;
}
