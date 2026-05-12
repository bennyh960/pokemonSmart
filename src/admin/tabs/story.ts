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
  let searchFrom = 0;
  while (true) {
    const callIdx = source.indexOf(`${fnName}(`, searchFrom);
    if (callIdx === -1) break;
    const chunk = source.slice(callIdx, callIdx + 800);
    const match = chunk.match(/\bid:\s*['"`]([^'"`]+)['"`]/);
    if (match) ids.push(match[1]);
    searchFrom = callIdx + 1;
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
    const actN = actNum.replace('act', '');
    const questName = fileName.replace('quest-', '').replace('.ts', '');
    list.push({
      path,
      fileName,
      actNum,
      label: `Act ${actN} — ${questName}`,
      source,
      description: parseDocComment(source),
      questIds:    parseIds(source, 'registerQuest'),
      gateIds:     parseIds(source, 'registerGate'),
      eventIds:    parseIds(source, 'registerStoryEvent'),
      cutsceneIds: parseIds(source, 'registerCutscene'),
      flagEnumKeys: parseFlagEnumKeys(source),
    });
  }
  list.sort((a, b) =>
    a.actNum !== b.actNum ? a.actNum.localeCompare(b.actNum) : a.fileName.localeCompare(b.fileName),
  );
  return list;
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
      if (step.type === 'dialogue' && step.speakerId)
        ids.add(step.speakerId);
      if (step.type === 'if-flag') {
        walk(step.thenSteps);
        if (step.elseSteps) walk(step.elseSteps);
      }
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
      const mapId = deriveMapId(path);
      result.set(mapId, [...(result.get(mapId) ?? []), ...matching]);
    }
  }

  for (const mapId of extraMapIds) {
    if (!result.has(mapId)) {
      const key = `../../data/maps/${mapId}.json`;
      const npcs = (MAP_DATA[key] as { npcs?: NpcEntry[] } | undefined)?.npcs ?? [];
      result.set(mapId, npcs);
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
  const table = document.createElement('table');
  table.className = 'si-table';
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    tr.appendChild(th);
  }
  thead.appendChild(tr);
  table.appendChild(thead);
  table.appendChild(document.createElement('tbody'));
  return table;
}

function addRow(table: HTMLTableElement, cells: (string | HTMLElement)[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const c of cells) {
    const td = document.createElement('td');
    if (typeof c === 'string') td.textContent = c;
    else td.appendChild(c);
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

// ── Main renderer ─────────────────────────────────────────────────────────────

export function renderStoryTab(container: HTMLElement): (() => void) | void {
  const acts = buildActInfoList();
  let selectedAct: ActInfo | null = acts[0] ?? null;
  let slots = loadAllSlots();
  let selectedSlot: number | null = slots[0]?.slot ?? null;
  let playerData: PlayerData | null = selectedSlot !== null ? loadPd(selectedSlot) : null;
  let extraMapIds: string[] = [];

  // ── Root ──
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'si-root';
  container.appendChild(root);

  // ── Persistent top bar: act + slot selectors ──
  const topBar = document.createElement('div');
  topBar.className = 'si-topbar';
  root.appendChild(topBar);

  // Act selector
  const actLabel = document.createElement('span');
  actLabel.className = 'si-topbar-label';
  actLabel.textContent = 'Act:';
  topBar.appendChild(actLabel);

  const actSelect = document.createElement('select');
  actSelect.className = 'form-select';
  actSelect.style.minWidth = '240px';
  for (const act of acts) {
    const opt = document.createElement('option');
    opt.value = act.path;
    opt.textContent = act.label;
    actSelect.appendChild(opt);
  }
  topBar.appendChild(actSelect);

  // Divider
  const divider = document.createElement('span');
  divider.style.cssText = 'width:1px;height:20px;background:#30363d;flex-shrink:0;';
  topBar.appendChild(divider);

  // Slot selector
  const slotLabel = document.createElement('span');
  slotLabel.className = 'si-topbar-label';
  slotLabel.textContent = 'Save Slot:';
  topBar.appendChild(slotLabel);

  const slotSelect = document.createElement('select');
  slotSelect.className = 'form-select';
  slotSelect.style.minWidth = '260px';
  topBar.appendChild(slotSelect);

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'btn btn-sm';
  reloadBtn.textContent = '↺';
  reloadBtn.title = 'Reload save from localStorage';
  topBar.appendChild(reloadBtn);

  function rebuildSlotSelect() {
    slotSelect.innerHTML = '';
    if (slots.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No saves found';
      opt.disabled = true;
      slotSelect.appendChild(opt);
    } else {
      for (const s of slots) {
        const opt = document.createElement('option');
        opt.value = String(s.slot);
        opt.textContent = `Slot ${s.slot} — ${s.playerName} (${new Date(s.savedAt).toLocaleDateString()})`;
        if (s.slot === selectedSlot) opt.selected = true;
        slotSelect.appendChild(opt);
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

  // ── Content area (rebuilt on act/slot change) ──
  const content = document.createElement('div');
  root.appendChild(content);

  // ── Flag cell helper (used in both Flags section and NPC table) ──
  function makeFlagCell(flagVal: string | undefined, onToggle: () => void): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'si-npc-flag-cell';

    if (!flagVal) {
      wrap.textContent = '—';
      wrap.style.color = '#484f58';
      return wrap;
    }

    const code = document.createElement('code');
    code.className = 'si-flag-code';
    code.textContent = flagVal;
    wrap.appendChild(code);

    if (!playerData) return wrap;

    const pd = playerData;
    const isSet = !!(pd.flags as Record<string, boolean | undefined>)[flagVal];

    const badge = document.createElement('span');
    badge.className = `si-flag-state ${isSet ? 'si-flag-set' : 'si-flag-unset'}`;
    badge.textContent = isSet ? '✓' : '—';
    wrap.appendChild(badge);

    const btn = document.createElement('button');
    btn.className = `btn btn-sm${isSet ? '' : ' btn-primary'}`;
    btn.textContent = isSet ? 'Clear' : 'Set';
    btn.addEventListener('click', () => {
      if (selectedSlot === null || !playerData) return;
      if (isSet) delete (playerData.flags as Record<string, unknown>)[flagVal];
      else (playerData.flags as Record<string, boolean>)[flagVal] = true;
      savePd(selectedSlot, playerData);
      onToggle();
    });
    wrap.appendChild(btn);

    return wrap;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function render() {
    content.innerHTML = '';
    if (!selectedAct) return;
    const act = selectedAct;

    const cutscenes = getAllCutscenes().filter(c => act.cutsceneIds.includes(c.id));
    const evts      = getStoryEvents().filter(e => act.eventIds.includes(e.id));

    // ── 1. Description ──
    if (act.description) {
      const s = section('Description');
      const pre = document.createElement('pre');
      pre.className = 'si-description';
      pre.textContent = act.description;
      s.body.appendChild(pre);
      content.appendChild(s.el);
    }

    // ── 2. Flags ──
    const flagSec = section('Flags');

    if (slots.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'text-muted';
      msg.textContent = 'No save slots found. Create a save in the game first.';
      flagSec.body.appendChild(msg);
    } else {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-sm si-reset-btn';
      resetBtn.textContent = 'Reset all act flags';
      resetBtn.title = 'Clear every flag in this act from the selected save';
      resetBtn.addEventListener('click', () => {
        if (!playerData || selectedSlot === null) return;
        const count = act.flagEnumKeys.filter(k => (FLAGS as Record<string, string>)[k]).length;
        if (!confirm(`Clear ${count} flags for "${act.label}" from Slot ${selectedSlot}?`)) return;
        for (const key of act.flagEnumKeys) {
          const val = (FLAGS as Record<string, string>)[key];
          if (val) delete (playerData!.flags as Record<string, unknown>)[val];
        }
        savePd(selectedSlot, playerData!);
        render();
      });
      flagSec.body.appendChild(resetBtn);

      if (!playerData) {
        const msg = document.createElement('p');
        msg.className = 'text-muted';
        msg.style.marginTop = '8px';
        msg.textContent = 'No save data for this slot.';
        flagSec.body.appendChild(msg);
      } else {
        const pd = playerData;
        const flagsObj = pd.flags as Record<string, boolean | undefined>;
        const t = makeTable(['Enum key', 'Flag value', 'Description', 'State', '']);

        let hasAny = false;
        for (const key of act.flagEnumKeys) {
          const val = (FLAGS as Record<string, string>)[key];
          if (!val) continue;
          hasAny = true;
          const isSet = !!flagsObj[val];
          const desc = FLAG_DESCRIPTIONS[val] ?? '—';

          const stateEl = document.createElement('span');
          stateEl.className = `si-flag-state ${isSet ? 'si-flag-set' : 'si-flag-unset'}`;
          stateEl.textContent = isSet ? '✓ set' : '— not set';

          const actionBtn = document.createElement('button');
          actionBtn.className = `btn btn-sm${isSet ? '' : ' btn-primary'}`;
          actionBtn.textContent = isSet ? 'Clear' : 'Set';
          actionBtn.addEventListener('click', () => {
            if (selectedSlot === null || !playerData) return;
            if (isSet) delete (playerData.flags as Record<string, unknown>)[val];
            else (playerData.flags as Record<string, boolean>)[val] = true;
            savePd(selectedSlot, playerData);
            render();
          });

          const tr = addRow(t, [key, val, desc, stateEl, actionBtn]);
          if (isSet) tr.classList.add('si-row-set');
        }

        if (!hasAny) {
          const msg = document.createElement('p');
          msg.className = 'text-muted';
          msg.style.marginTop = '8px';
          msg.textContent = 'No FLAGS.* references found in this act file.';
          flagSec.body.appendChild(msg);
        } else {
          flagSec.body.appendChild(t);
        }
      }
    }

    content.appendChild(flagSec.el);

    // ── 3. Summary ──
    const sumSec = section('Summary');

    const quests = act.questIds.map(id => getQuest(id)).filter(Boolean) as QuestDef[];
    if (quests.length) {
      sumSec.body.appendChild(subHeader(`Quests (${quests.length})`));
      const t = makeTable(['ID', 'Title', 'Objective']);
      for (const q of quests)
        addRow(t, [q.id, q.title.en, q.objective.en]);
      sumSec.body.appendChild(t);
    }

    const gates = act.gateIds.map(id => GATES[id]).filter(Boolean);
    if (gates.length) {
      sumSec.body.appendChild(subHeader(`Gates (${gates.length})`));
      const t = makeTable(['ID', 'Type', 'Qs required', 'Bonus', 'Penalty']);
      for (const g of gates) {
        const sc = g.sessionConfig;
        addRow(t, [
          g.id,
          g.triggerType,
          String(sc.questionsRequired),
          sc.bonusEnabled ? `×${sc.bonusMultiplier}` : '—',
          sc.penaltyAmount ? `${sc.penaltyAmount} ₽ <${sc.penaltyThreshold * 100}%` : '—',
        ]);
      }
      sumSec.body.appendChild(t);
    }

    if (evts.length) {
      sumSec.body.appendChild(subHeader(`Story Events (${evts.length})`));
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

    // Collect NPC IDs from cutscene steps + npc-interact triggers
    const cutsceneNpcIds = new Set<string>();
    for (const c of cutscenes) collectNpcIds(c).forEach(id => cutsceneNpcIds.add(id));
    for (const e of evts)
      if (e.trigger.type === 'npc-interact') cutsceneNpcIds.add(e.trigger.npcId);

    // Extra map chips + add-map input
    if (extraMapIds.length) {
      const chips = document.createElement('div');
      chips.className = 'si-chips';
      for (const mid of extraMapIds) {
        const chip = document.createElement('span');
        chip.className = 'si-chip';
        chip.textContent = mid;
        const remove = document.createElement('button');
        remove.className = 'si-chip-remove';
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          extraMapIds = extraMapIds.filter(m => m !== mid);
          render();
        });
        chip.appendChild(remove);
        chips.appendChild(chip);
      }
      npcSec.body.appendChild(chips);
    }

    const addMapRow = document.createElement('div');
    addMapRow.className = 'si-addmap-row';
    const mapInput = document.createElement('input');
    mapInput.type = 'text';
    mapInput.className = 'form-input';
    mapInput.placeholder = 'Add extra map, e.g. fractalis/beach';
    mapInput.style.flex = '1';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-sm';
    addBtn.textContent = '+ Add Map';
    addBtn.addEventListener('click', () => {
      const val = mapInput.value.trim();
      if (val && !extraMapIds.includes(val)) {
        extraMapIds.push(val);
        mapInput.value = '';
        render();
      }
    });
    mapInput.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
    addMapRow.appendChild(mapInput);
    addMapRow.appendChild(addBtn);
    npcSec.body.appendChild(addMapRow);

    // Build NPC map and render tables
    const npcMap = findNpcsAcrossMaps([...cutsceneNpcIds], extraMapIds);

    if (npcMap.size > 0) {
      for (const [mapId, npcs] of npcMap) {
        npcSec.body.appendChild(subHeader(`Map: ${mapId}`));
        if (npcs.length === 0) {
          const p = document.createElement('p');
          p.className = 'text-muted';
          p.style.padding = '4px 0 8px';
          p.textContent = 'No NPCs found in this map.';
          npcSec.body.appendChild(p);
          continue;
        }
        const t = makeTable(['NPC ID', 'Name', 'Type', 'Sprite', 'spawnAfter', 'despawnAfter', 'Coords']);
        for (const n of npcs) {
          addRow(t, [
            n.id,
            npcNameStr(n),
            n.type ?? '—',
            n.spriteType ?? '—',
            makeFlagCell(n.spawnAfter, render),
            makeFlagCell(n.despawnAfter, render),
            n.x !== undefined ? `(${n.x}, ${n.y})` : '?',
          ]);
        }
        npcSec.body.appendChild(t);
      }

      // List NPC IDs referenced in cutscenes but not found in any map
      const foundIds = new Set([...npcMap.values()].flat().map(n => n.id));
      const missing = [...cutsceneNpcIds].filter(id => !foundIds.has(id));
      if (missing.length) {
        npcSec.body.appendChild(subHeader('Not found in any map'));
        const ul = document.createElement('ul');
        ul.className = 'si-missing-list';
        for (const id of missing) {
          const li = document.createElement('li');
          li.className = 'si-missing-item';
          li.textContent = id;
          ul.appendChild(li);
        }
        npcSec.body.appendChild(ul);
      }
    } else if (cutsceneNpcIds.size === 0) {
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent = 'No NPC references found in this act\'s cutscenes.';
      npcSec.body.appendChild(p);
    } else {
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent = 'NPC IDs found in cutscenes but not located in any map JSON:';
      npcSec.body.appendChild(p);
      const ul = document.createElement('ul');
      ul.className = 'si-missing-list';
      for (const id of cutsceneNpcIds) {
        const li = document.createElement('li');
        li.className = 'si-missing-item';
        li.textContent = id;
        ul.appendChild(li);
      }
      npcSec.body.appendChild(ul);
    }

    content.appendChild(npcSec.el);
  }

  render();
}
