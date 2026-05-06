/**
 * Admin Map Teleport — dev-only overlay.
 * Opens a searchable map list so the admin can jump to any map instantly.
 * This file is only imported inside `if (import.meta.env.DEV)` in overworld.ts,
 * so it is dead-code-eliminated from production builds.
 */

import { getAllMapIds, getCurrentMapId } from '../systems/map-manager';

type TeleportFn = (mapId: string) => void;

let overlay: HTMLDivElement | null = null;
let listEl: HTMLDivElement | null = null;
let searchEl: HTMLInputElement | null = null;
let teleportCb: TeleportFn | null = null;
let filteredIds: string[] = [];
let selectedIndex = 0;

export function openAdminMapTeleport(teleportFn: TeleportFn): void {
  if (overlay) return;
  teleportCb = teleportFn;
  buildOverlay();
  refresh('');
  searchEl?.focus();
}

function close(): void {
  overlay?.remove();
  overlay = null;
  listEl = null;
  searchEl = null;
}

function doTeleport(mapId: string): void {
  close();
  teleportCb?.(mapId);
}

function refresh(filter: string): void {
  const all = getAllMapIds();
  const q = filter.toLowerCase();
  filteredIds = q ? all.filter(id => id.toLowerCase().includes(q)) : all;
  selectedIndex = 0;
  renderList();
}

function renderList(): void {
  if (!listEl) return;
  const el = listEl;
  const currentMap = getCurrentMapId();
  el.innerHTML = '';

  let lastGroup = '';
  filteredIds.forEach((id, i) => {
    const slash = id.indexOf('/');
    const group = slash >= 0 ? id.slice(0, slash) : '';
    const leaf = slash >= 0 ? id.slice(slash + 1) : id;

    if (group !== lastGroup) {
      lastGroup = group;
      const header = document.createElement('div');
      header.textContent = group || 'root';
      header.style.cssText =
        'padding:3px 10px 2px;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:1px;' +
        'border-top:1px solid #2a2a3a;margin-top:2px;user-select:none';
      el.appendChild(header);
    }

    const isCurrent = id === currentMap;
    const isSelected = i === selectedIndex;

    const row = document.createElement('div');
    row.dataset.idx = String(i);
    row.style.cssText =
      `padding:5px 14px;cursor:pointer;border-radius:3px;font-family:monospace;font-size:12px;` +
      `color:${isCurrent ? '#88ffaa' : '#ccc'};` +
      `background:${isSelected ? '#2a2a5e' : 'transparent'};`;
    row.title = id;

    const labelEl = document.createElement('span');
    labelEl.textContent = leaf + (isCurrent ? ' ✦' : '');
    row.appendChild(labelEl);

    if (isCurrent) {
      const tag = document.createElement('span');
      tag.textContent = ' current';
      tag.style.cssText = 'color:#558844;font-size:10px;margin-left:4px';
      row.appendChild(tag);
    }

    row.addEventListener('mouseenter', () => {
      selectedIndex = i;
      renderList();
    });
    row.addEventListener('click', () => doTeleport(id));
    el.appendChild(row);
  });

  // Scroll selected row into view
  requestAnimationFrame(() => {
    const sel = el.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    sel?.scrollIntoView({ block: 'nearest' });
  });
}

function buildOverlay(): void {
  overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);' +
    'display:flex;align-items:center;justify-content:center;font-family:monospace';

  const card = document.createElement('div');
  card.style.cssText =
    'background:#0d0d1a;border:1.5px solid #3a3aaa;border-radius:8px;padding:14px;' +
    'width:380px;max-height:520px;display:flex;flex-direction:column;box-shadow:0 8px 32px #000a';

  // Title row
  const title = document.createElement('div');
  title.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px';
  const h = document.createElement('span');
  h.textContent = 'Admin Map Teleport';
  h.style.cssText = 'color:#8888ff;font-size:13px;font-weight:bold;letter-spacing:0.5px';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText =
    'background:none;border:none;color:#666;font-size:14px;cursor:pointer;padding:0 4px;line-height:1';
  closeBtn.addEventListener('click', close);
  title.appendChild(h);
  title.appendChild(closeBtn);

  // Search input
  searchEl = document.createElement('input');
  searchEl.type = 'text';
  searchEl.placeholder = 'Filter maps…';
  searchEl.style.cssText =
    'background:#1a1a2e;border:1px solid #3a3a5e;border-radius:4px;color:#eee;' +
    'padding:6px 10px;font-family:monospace;font-size:12px;outline:none;margin-bottom:8px';
  searchEl.addEventListener('input', () => refresh(searchEl!.value));
  searchEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredIds.length - 1);
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredIds[selectedIndex]) doTeleport(filteredIds[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  // List container
  listEl = document.createElement('div');
  listEl.style.cssText = 'overflow-y:auto;flex:1;min-height:0';

  // Footer hint
  const hint = document.createElement('div');
  hint.textContent = '↑↓ navigate  Enter teleport  Esc close';
  hint.style.cssText = 'color:#444;font-size:10px;text-align:center;margin-top:8px;user-select:none';

  card.appendChild(title);
  card.appendChild(searchEl);
  card.appendChild(listEl);
  card.appendChild(hint);

  // Block all key events from bubbling to the game's window-level input handler.
  // Without this, typing 'p' would open the party screen, Enter would open the menu, etc.
  overlay.addEventListener('keydown', (e) => e.stopPropagation());

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
