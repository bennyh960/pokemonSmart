/**
 * Overworld HUD — HTML overlay that sits on top of the game canvas.
 * Three tabs (map / leader / quest), clickable + keyboard 1/2/3.
 * Positioned dynamically so it always aligns with the canvas top-left corner.
 */

import { getLocale } from '../i18n/i18n.js';
import { getQuest } from '../data/story/quests.js';
import { getPokemonDisplayName } from '../services/pokemon-data.js';

export interface HUDData {
  mapName?: string | { en: string; he: string };
  lead?: { id: number; level: number; hp: number; maxHp: number } | null;
  questId?: string | null;
}

const TAB_META = [
  { sym: '◉', num: '1', activeClass: 'hud-tab--map' },
  { sym: '◆', num: '2', activeClass: 'hud-tab--lead' },
  { sym: '★', num: '3', activeClass: 'hud-tab--quest' },
];

let hudEl: HTMLDivElement | null = null;
let tabsEl: HTMLDivElement | null = null;
let contentEl: HTMLDivElement | null = null;
let activeTab = 0;
let lastData: HUDData = {};
let lastTab = -1;

// ── DOM helpers ────────────────────────────────────────────────────────────

function getCanvas(): HTMLCanvasElement | null {
  return document.querySelector('#app canvas') as HTMLCanvasElement | null;
}

/** Re-align the overlay with the canvas inside #app. */
function positionHUD(): void {
  if (!hudEl) return;
  const canvas = getCanvas();
  const app = document.getElementById('app');
  if (!canvas || !app) return;

  const cr = canvas.getBoundingClientRect();
  const ar = app.getBoundingClientRect();
  const scale = cr.width / 240;

  hudEl.style.left = `${cr.left - ar.left}px`;
  hudEl.style.top = `${cr.top - ar.top}px`;
  hudEl.style.setProperty('--s', String(scale));
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Create the overlay once and attach it to #app. No-op if already created. */
export function initHUD(): void {
  if (hudEl) return;

  const app = document.getElementById('app');
  if (!app) return;

  hudEl = document.createElement('div');
  hudEl.id = 'overworld-hud';
  hudEl.style.display = 'none';

  // Tab bar
  tabsEl = document.createElement('div');
  tabsEl.id = 'hud-tabs';

  TAB_META.forEach(({ sym, num }, i) => {
    const btn = document.createElement('button');
    btn.className = 'hud-tab' + (i === 0 ? ' hud-tab--active hud-tab--map' : '');
    btn.dataset.tab = String(i);
    btn.innerHTML = `<span class="hud-sym">${sym}</span><span class="hud-num">${num}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setHUDTab(i);
    });
    tabsEl!.appendChild(btn);
  });

  // Content panel
  contentEl = document.createElement('div');
  contentEl.id = 'hud-content';

  hudEl.appendChild(tabsEl);
  hudEl.appendChild(contentEl);
  app.appendChild(hudEl);

  positionHUD();
  window.addEventListener('resize', positionHUD);
}

export function showHUD(): void {
  positionHUD();
  if (hudEl) hudEl.style.display = '';
}

export function hideHUD(): void {
  if (hudEl) hudEl.style.display = 'none';
}

/** Switch active tab (0/1/2) and refresh content. */
export function setHUDTab(i: number): void {
  activeTab = i;
  lastTab = -1; // force redraw
  syncTabButtons();
  renderContent(lastData);
}

export function getHUDTab(): number {
  return activeTab;
}

/** Feed updated data; only re-renders when something changed. */
export function updateHUD(data: HUDData): void {
  const changed =
    data.mapName !== lastData.mapName ||
    data.questId !== lastData.questId ||
    data.lead?.hp !== lastData.lead?.hp ||
    data.lead?.level !== lastData.lead?.level ||
    activeTab !== lastTab;

  if (!changed) return;

  lastData = data;
  lastTab = activeTab;
  renderContent(data);
}

// ── Internal ───────────────────────────────────────────────────────────────

function syncTabButtons(): void {
  tabsEl?.querySelectorAll<HTMLButtonElement>('.hud-tab').forEach((btn, i) => {
    const active = i === activeTab;
    btn.classList.toggle('hud-tab--active', active);
    // remove all colour classes then re-add active one
    TAB_META.forEach((m) => btn.classList.remove(m.activeClass));
    if (active) btn.classList.add(TAB_META[i].activeClass);
  });
}

function renderContent(data: HUDData): void {
  if (!contentEl) return;
  const isHe = getLocale() === 'he';

  if (activeTab === 0) {
    // ── MAP ──────────────────────────────────────────────────────────────
    const raw = data.mapName;
    const name = !raw
      ? isHe
        ? 'לא ידוע'
        : 'Unknown'
      : typeof raw === 'object'
        ? isHe
          ? (raw as { en: string; he: string }).he
          : (raw as { en: string; he: string }).en
        : String(raw);
    contentEl.innerHTML = `<div class="hud-line hud-map">${escHtml(name)}</div>`;
  } else if (activeTab === 1) {
    // ── LEADER ───────────────────────────────────────────────────────────
    if (data.lead) {
      const { id, level, hp, maxHp } = data.lead;
      const name = getPokemonDisplayName(id);
      const pct = Math.max(0, hp / maxHp) * 100;
      const hpCls = pct > 50 ? 'hp-high' : pct > 25 ? 'hp-mid' : 'hp-low';
      contentEl.innerHTML = `
        <div class="hud-line hud-lead-name">
          ${escHtml(name)} <span class="hud-lv">Lv.${level}</span>
        </div>
        <div class="hud-bar-wrap">
          <div class="hud-bar ${hpCls}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="hud-line hud-hp-num">${hp}/${maxHp} HP</div>`;
    } else {
      contentEl.innerHTML = `<div class="hud-line hud-empty">${isHe ? 'אין פוקמון' : 'No Pokemon'}</div>`;
    }
  } else {
    // ── QUEST ────────────────────────────────────────────────────────────
    const quest = data.questId ? getQuest(data.questId) : null;
    console.log('Updating HUD quest:', data.questId, quest);
    if (quest) {
      const title = isHe ? quest.title.he : quest.title.en;
      const obj = isHe ? quest.objective.he : quest.objective.en;
      contentEl.innerHTML = `
        <div class="hud-line hud-quest-title">${escHtml(title)}</div>
        <div class="hud-line hud-quest-obj">${escHtml(obj)}</div>`;
    } else {
      contentEl.innerHTML = `<div class="hud-line hud-empty">${isHe ? 'אין משימה' : 'No quest'}</div>`;
    }
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
