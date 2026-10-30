// Small DOM helpers shared by the admin tabs.

import { initSavesFromCloud } from '../auth/auth-service';
import { getSlotIndex, loadGame } from '../systems/save';
import type { PlayerData } from '../types/index';

export function section(title: string): { el: HTMLElement; body: HTMLElement } {
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

export function makeTable(headers: string[]): HTMLTableElement {
  const t = document.createElement('table');
  t.className = 'si-table';
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  for (const h of headers) { const th = document.createElement('th'); th.textContent = h; tr.appendChild(th); }
  thead.appendChild(tr); t.appendChild(thead); t.appendChild(document.createElement('tbody'));
  return t;
}

export function addRow(table: HTMLTableElement, cells: (string | HTMLElement)[]): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const c of cells) {
    const td = document.createElement('td');
    if (typeof c === 'string') td.textContent = c; else td.appendChild(c);
    tr.appendChild(td);
  }
  table.querySelector('tbody')!.appendChild(tr);
  return tr;
}

/**
 * "Slot: [select] ↺" — picks a save slot; ↺ reloads the saves from the cloud.
 * `onChange` runs after a pick or a reload with the slot and its freshly loaded save.
 */
export function slotPicker(onChange: (slot: number | null, pd: PlayerData | null) => void): {
  nodes: HTMLElement[];
  slot: () => number | null;
} {
  let slots = getSlotIndex();
  let selected: number | null = slots[0]?.slot ?? null;

  const label = document.createElement('span');
  label.className = 'si-topbar-label';
  label.textContent = 'Slot:';

  const select = document.createElement('select');
  select.className = 'form-select';
  select.style.minWidth = '240px';

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'btn btn-sm';
  reloadBtn.textContent = '↺';
  reloadBtn.title = 'Reload saves from the cloud';

  function rebuild() {
    select.innerHTML = '';
    if (!slots.length) {
      const o = document.createElement('option');
      o.textContent = 'No saves found'; o.disabled = true;
      select.appendChild(o);
      return;
    }
    for (const s of slots) {
      const o = document.createElement('option');
      o.value = String(s.slot);
      o.textContent = `Slot ${s.slot} — ${s.playerName} (${new Date(s.savedAt).toLocaleDateString()})`;
      if (s.slot === selected) o.selected = true;
      select.appendChild(o);
    }
  }
  rebuild();

  const changed = () => onChange(selected, selected !== null ? loadGame(selected) : null);
  select.addEventListener('change', () => {
    selected = Number(select.value);
    changed();
  });
  reloadBtn.addEventListener('click', async () => {
    await initSavesFromCloud().catch(() => {});
    slots = getSlotIndex();
    rebuild();
    changed();
  });

  return { nodes: [label, select, reloadBtn], slot: () => selected };
}
