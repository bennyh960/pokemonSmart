import { ADMIN_NAME } from '../engine/config';
import { getAllMoves, type MoveData } from '../services/pokemon-data';
import { getPlayerData } from '../systems/game-state';
import type { PokemonType } from '../types';

// ─── Guard ───────────────────────────────────────────────────────────────────

function isAdminMewSession(): boolean {
  if (!import.meta.env.DEV) return false;
  const pd = getPlayerData();
  if (pd.name !== ADMIN_NAME) return false;
  if (pd.party[0]?.id !== 151) return false;
  return true;
}

// ─── Move replacement (stub — wire up your own logic here) ───────────────────

function applyMoveReplacement(slotIndex: number, newMove: MoveData): void {
  console.debug('[ADMIN HACK] Replace slot', slotIndex, 'with', newMove.name, `(id=${newMove.id})`);
  getPlayerData().party[0].moves[slotIndex] = {
    id: newMove.id,
    name: newMove.name['en'],
    accuracy: newMove.accuracy ?? 100,
    power: newMove.power ?? 0,
    pp: newMove.pp,
    type: newMove.type as PokemonType,
    currentPp: newMove.pp,
  };
}

// ─── State ───────────────────────────────────────────────────────────────────

let overlayEl: HTMLDivElement | null = null;
let currentSlotIndex = -1;

// ─── Open / Close ─────────────────────────────────────────────────────────────

export function openMoveHacker(slotIndex: number): void {
  if (!isAdminMewSession()) return;
  if (overlayEl) return; // already open

  currentSlotIndex = slotIndex;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'move-hacker-backdrop';
  Object.assign(backdrop.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.65)',
    zIndex: '9998',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeMoveHacker();
  });

  // Modal panel
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    background: '#1a1a2e',
    border: '2px solid #e94560',
    borderRadius: '8px',
    padding: '16px',
    width: '320px',
    maxHeight: '480px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    fontFamily: 'monospace',
    color: '#eee',
    boxShadow: '0 0 24px #e9456088',
    zIndex: '9999',
  });

  // Header
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });
  const title = document.createElement('span');
  title.textContent = `🛠 MOVE HACKER — slot ${slotIndex + 1}`;
  Object.assign(title.style, { fontSize: '13px', color: '#e94560', fontWeight: 'bold' });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '14px',
  });
  closeBtn.addEventListener('click', closeMoveHacker);

  header.append(title, closeBtn);

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search move name…';
  Object.assign(searchInput.style, {
    background: '#0f0f1a',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '6px 8px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  });

  // Results list
  const list = document.createElement('div');
  Object.assign(list.style, {
    overflowY: 'auto',
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '340px',
  });

  // Populate / filter
  function renderResults(query: string): void {
    list.innerHTML = '';
    const q = query.toLowerCase().trim();
    const allMoves = getAllMoves();
    const filtered = q
      ? allMoves.filter((m) => m.name['en'].toLowerCase().includes(q)).slice(0, 60)
      : allMoves.slice(0, 60);

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No moves found';
      Object.assign(empty.style, { color: '#666', fontSize: '11px', padding: '8px' });
      list.appendChild(empty);
      return;
    }

    for (const move of filtered) {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        background: '#0f0f1a',
        border: '1px solid #2a2a3e',
        transition: 'background 0.1s',
      });
      row.addEventListener('mouseenter', () => {
        row.style.background = '#2a2a4e';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = '#0f0f1a';
      });

      const nameEl = document.createElement('span');
      nameEl.textContent = move.name['en'];
      Object.assign(nameEl.style, { color: '#fff', fontWeight: 'bold' });

      const meta = document.createElement('span');
      const power = move.power ?? '—';
      const acc = move.accuracy ?? '—';
      meta.textContent = `${move.type} · Pow:${power} · Acc:${acc}`;
      Object.assign(meta.style, { color: '#888', fontSize: '10px' });

      row.append(nameEl, meta);
      row.addEventListener('click', () => {
        applyMoveReplacement(currentSlotIndex, move);
        closeMoveHacker();
      });

      list.appendChild(row);
    }
  }

  searchInput.addEventListener('input', () => renderResults(searchInput.value));
  renderResults(''); // initial population

  panel.append(header, searchInput, list);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  overlayEl = backdrop as unknown as HTMLDivElement;

  // Auto-focus search
  requestAnimationFrame(() => searchInput.focus());
}

export function closeMoveHacker(): void {
  overlayEl?.remove();
  overlayEl = null;
  currentSlotIndex = -1;
}

export function isMoveHackerOpen(): boolean {
  return overlayEl !== null;
}

// ─── Key handler — call this from your battle scene keydown listener ──────────

export function handleMoveHackerKey(e: KeyboardEvent, focusedSlotIndex: number): boolean {
  if (e.key === '9' || e.code === 'Digit9' || e.code === 'Numpad9') {
    if (isAdminMewSession()) {
      e.stopPropagation();
      e.preventDefault();
      openMoveHacker(focusedSlotIndex);
      return true;
    }
  }

  if (e.key === 'Escape' && isMoveHackerOpen()) {
    e.stopPropagation();
    e.preventDefault();
    closeMoveHacker();
    return true;
  }

  return false;
}
