// src/scenesReact/pc/PCScreen.tsx
import { useEffect, useRef, useState } from 'react';
import type { Pokemon } from '../../types/index.js';
import { useI18n } from '../../ui-react/context/i18n-context';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { useInputLayer } from '../../engine/input';
import { getGlobalAudio } from '../../audio/audio-manager';
import { getPokemonDisplayName } from '../../services/pokemon-data.js';
import {
  BOX_SIZE,
  MAX_PARTY,
  MIN_PARTY_FOR_RELEASE,
  depositPokemon,
  withdrawPokemon,
  swapPartyAndBox,
  moveBoxPokemon,
  releaseFromBox,
  releaseFromParty,
  takeStorageSnapshot,
  restoreStorageSnapshot,
  type StorageSnapshot,
} from '../../systems/pc-storage.js';
import { TeamColumn } from './components/TeamColumn';
import { BoxPanel } from './components/BoxPanel';
import { Inspector, type InspectorAction } from './components/Inspector';
import { HelpDialog, PCToast, ReleaseDialog } from './components/PCDialogs';
import { useDragHandlers } from './components/dnd';
import { isFiltering, matchesFilter, ownedTypes, stepInGrid, type PCFilter, type Spot } from './pc-helpers';

const TOAST_MS = 5000;

const KEYS = [
  { code: 'ArrowUp', action: 'up' },
  { code: 'ArrowDown', action: 'down' },
  { code: 'ArrowLeft', action: 'left' },
  { code: 'ArrowRight', action: 'right' },
  { code: 'Tab', action: 'zone' },
  { code: 'KeyQ', action: 'prev-box' },
  { code: 'KeyE', action: 'next-box' },
  { code: 'Enter', action: 'primary' },
  { code: 'Space', action: 'primary' },
  { code: 'KeyR', action: 'release' },
  { code: 'Delete', action: 'release' },
  { code: 'KeyF', action: 'search' },
  { code: 'KeyH', action: 'help' },
  { code: 'Slash', shift: true, action: 'help' },
  { code: 'KeyL', action: 'locale' },
  { code: 'Escape', action: 'escape' },
] as const;

interface Toast {
  text: string;
  error: boolean;
  undo?: { snap: StorageSnapshot; box: number; cursor: Spot };
}

/**
 * PC storage. No modes: pick a Pokémon and its actions appear (send to box / add to team /
 * swap when the team is full / release). Every action can be undone from its toast.
 */
export function PCScreen({ onClose }: { onClose: () => void }) {
  const { t, isRTL, locale, setLocale } = useI18n();
  const [pd, mutate] = usePlayerData();

  const [box, setBoxState] = useState(0);
  // Keyboard cursor and selection are one thing: the inspector shows whatever sits here
  const [cursor, setCursor] = useState<Spot>({ zone: 'party', idx: 0 });
  // A boxed Pokémon waiting to swap into a full team (box slot index)
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [modal, setModal] = useState<'help' | 'release' | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [filter, setFilter] = useState<PCFilter>({ query: '', type: null });
  const [searchFocused, setSearchFocused] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const party = pd.party;
  const slots = pd.boxes[box].pokemon;
  const at = (s: Spot) => (s.zone === 'party' ? party[s.idx] : slots[s.idx]) ?? null;
  const shown = swapFrom !== null ? slots[swapFrom] : at(cursor);
  const shownZone = swapFrom !== null ? 'box' : cursor.zone;
  const types = ownedTypes([...party, ...pd.boxes.flatMap((b) => b.pokemon)]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const say = (text: string, error = false) => setToast({ text, error });
  const name = (id: number) => getPokemonDisplayName(id);

  /** Runs a storage change; on success shows its toast with Undo. */
  function act(change: () => boolean, text: string, next?: Spot) {
    const snap = takeStorageSnapshot();
    const before = { box, cursor };
    let ok = false;
    mutate(() => {
      ok = change();
    });
    if (!ok) return false;
    setSwapFrom(null);
    if (next) setCursor(next);
    setToast({ text, error: false, undo: { snap, ...before } });
    return true;
  }

  function undo() {
    const u = toast?.undo;
    if (!u) return;
    mutate(() => restoreStorageSnapshot(u.snap));
    setBoxState(u.box);
    setCursor(u.cursor);
    setSwapFrom(null);
    setToast(null);
  }

  // ── Actions ───────────────────────────────────────────────────────

  function deposit(partyIdx: number, toBox = box, toSlot: number | null = null) {
    const p = party[partyIdx];
    if (!p) return;
    if (party.length <= 1) return say(t('pc.lastOne'), true);
    const slot = toSlot ?? pd.boxes[toBox].pokemon.indexOf(null);
    if (slot < 0) return say(t('pc.boxFull', { n: toBox + 1 }), true);
    if (act(() => depositPokemon(partyIdx, toBox, slot), t('pc.toast.deposited', { name: name(p.id), n: toBox + 1 }))) {
      setBoxState(toBox);
      setCursor({ zone: 'box', idx: slot });
    }
  }

  function withdraw(slot: number) {
    const p = slots[slot];
    if (!p) return;
    if (party.length >= MAX_PARTY) {
      // Team full: the team pulses and the next team pick swaps
      setSwapFrom(slot);
      setCursor({ zone: 'party', idx: 0 });
      return;
    }
    if (
      act(() => withdrawPokemon(box, slot), t('pc.toast.withdrawn', { name: name(p.id) }), {
        zone: 'party',
        idx: party.length,
      })
    ) {
      getGlobalAudio()?.playCry(p.id);
    }
  }

  function swap(partyIdx: number, slot: number) {
    const a = party[partyIdx];
    const b = slots[slot];
    if (!a || !b) return;
    act(() => swapPartyAndBox(partyIdx, box, slot), t('pc.toast.swapped', { a: name(b.id), b: name(a.id) }), {
      zone: 'party',
      idx: partyIdx,
    });
  }

  function moveInBoxes(slot: number, toBox: number, toSlot: number | null) {
    const p = slots[slot];
    if (!p) return;
    const target = toSlot ?? pd.boxes[toBox].pokemon.indexOf(null);
    if (target < 0) return say(t('pc.boxFull', { n: toBox + 1 }), true);
    act(
      () => moveBoxPokemon(box, slot, toBox, target),
      t('pc.toast.moved', { name: name(p.id), n: toBox + 1 }),
      toBox === box ? { zone: 'box', idx: target } : cursor,
    );
  }

  const releaseBlock = (): string | null =>
    cursor.zone === 'party' && party.length <= MIN_PARTY_FOR_RELEASE
      ? t('pc.releaseMin', { n: MIN_PARTY_FOR_RELEASE + 1 })
      : null;

  function askRelease() {
    if (!shown || swapFrom !== null) return;
    const block = releaseBlock();
    if (block) return say(block, true);
    setModal('release');
  }

  function release() {
    const p = at(cursor);
    setModal(null);
    if (!p) return;
    const idx = cursor.idx;
    act(
      () => (cursor.zone === 'party' ? releaseFromParty(idx) : releaseFromBox(box, idx)) !== null,
      t('pc.toast.released', { name: name(p.id) }),
      cursor.zone === 'party' ? { zone: 'party', idx: Math.max(0, Math.min(idx, party.length - 2)) } : cursor,
    );
  }

  function primary() {
    if (swapFrom !== null) {
      if (cursor.zone === 'party' && party[cursor.idx]) swap(cursor.idx, swapFrom);
      return;
    }
    if (!at(cursor)) return;
    if (cursor.zone === 'party') deposit(cursor.idx);
    else withdraw(cursor.idx);
  }

  // ── Picking, boxes, drag & drop ──────────────────────────────────

  function pick(zone: Spot['zone'], idx: number) {
    if (swapFrom !== null) {
      if (zone === 'party' && party[idx]) return swap(idx, swapFrom);
      setSwapFrom(null);
    }
    setCursor({ zone, idx });
  }

  function activate(zone: Spot['zone'], idx: number) {
    if (swapFrom !== null) return;
    setCursor({ zone, idx });
    if (zone === 'party') deposit(idx);
    else withdraw(idx);
  }

  function setBox(b: number) {
    setBoxState((b + pd.boxes.length) % pd.boxes.length);
    setSwapFrom(null);
  }

  /** Enter in the search box: open the first box (from this one on) that has a match. */
  function jumpToMatch() {
    if (!isFiltering(filter)) return;
    for (let k = 0; k < pd.boxes.length; k++) {
      const b = (box + k) % pd.boxes.length;
      const idx = pd.boxes[b].pokemon.findIndex((p) => !!p && matchesFilter(p, filter));
      if (idx >= 0) {
        setBox(b);
        setCursor({ zone: 'box', idx });
        return;
      }
    }
  }

  const dnd = useDragHandlers(setDragOver, (from, to) => {
    const [fz, fi] = from.split(':');
    const [tz, ti] = to.split(':');
    const f = Number(fi);
    const target = Number(ti);
    setSwapFrom(null);
    if (fz === 'party' && tz === 'box') return slots[target] ? swap(f, target) : deposit(f, box, target);
    if (fz === 'party' && tz === 'tab') return deposit(f, target);
    if (fz === 'box' && tz === 'party') return party[target] ? swap(target, f) : withdraw(f);
    if (fz === 'box' && tz === 'box') return moveInBoxes(f, box, target);
    if (fz === 'box' && tz === 'tab' && target !== box) return moveInBoxes(f, target, null);
  });

  // ── Keyboard ─────────────────────────────────────────────────────

  useInputLayer({
    id: 'pc-screen',
    name: 'PC storage',
    blocksLowerLayers: true,
    keyBindings: KEYS,
    active: modal === null && !searchFocused,
    onAction: (action) => {
      switch (action) {
        case 'up':
        case 'down':
        case 'left':
        case 'right': {
          if (cursor.zone === 'party') {
            if (action === 'left' || action === 'right') return;
            const n = Math.max(1, party.length);
            const step = action === 'down' ? 1 : -1;
            return setCursor({ zone: 'party', idx: (cursor.idx + step + n) % n });
          }
          return setCursor({ zone: 'box', idx: stepInGrid(cursor.idx, action, isRTL, BOX_SIZE) });
        }
        case 'zone':
          return setCursor(cursor.zone === 'party' ? { zone: 'box', idx: 0 } : { zone: 'party', idx: 0 });
        case 'prev-box':
          return setBox(box - 1);
        case 'next-box':
          return setBox(box + 1);
        case 'primary':
          return primary();
        case 'release':
          return askRelease();
        case 'search':
          return searchRef.current?.focus();
        case 'help':
          return setModal('help');
        case 'locale':
          return setLocale(locale === 'en' ? 'he' : 'en');
        case 'escape':
          return swapFrom !== null ? setSwapFrom(null) : onClose();
      }
    },
  });

  // ── Inspector state ──────────────────────────────────────────────

  let action: InspectorAction | null = null;
  let hint: string | null = null;
  if (shown && swapFrom === null) {
    if (shownZone === 'party') {
      const boxFull = !pd.boxes[box].pokemon.includes(null);
      action = { kind: 'deposit', disabled: party.length <= 1 || boxFull };
      hint = party.length <= 1 ? t('pc.lastOne') : boxFull ? t('pc.boxFull', { n: box + 1 }) : releaseBlock();
    } else {
      action = { kind: party.length >= MAX_PARTY ? 'swap' : 'withdraw', disabled: false };
    }
  }

  const dimmed = (p: Pokemon) => isFiltering(filter) && !matchesFilter(p, filter);
  const keyHints: [string, string][] = [
    ['←↑→↓', 'pc.key.move'],
    ['Tab', 'pc.key.zone'],
    ['Q E', 'pc.key.box'],
    ['Enter', 'pc.key.act'],
    ['R', 'pc.key.release'],
    ['F', 'pc.key.search'],
    ['H', 'pc.key.help'],
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#08130e] font-sans text-[#eaf5ee] select-none">
      <div className="mx-auto my-0 max-w-[1100px] sm:my-4">
        <div className="overflow-hidden border-[#1f4a33] bg-[#0f2219] sm:rounded-2xl sm:border-2">
          {/* Header */}
          <header className="flex items-center gap-2.5 border-b-2 border-[#1f4a33] bg-[#0b1b13] px-3.5 py-2.5">
            <h1 className="m-0 flex items-center gap-2 text-lg font-extrabold">
              <span className="relative h-[18px] w-[22px] rounded-[3px] border-2 border-[#20d860] after:absolute after:inset-x-1 after:-bottom-1.5 after:h-[3px] after:rounded after:bg-[#20d860]" />
              {t('pc.title')}
            </h1>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setModal('help')}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#f8d030] px-3 py-1.5 text-[13px] font-bold text-[#1b1600] hover:brightness-110"
            >
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[#1b1600] text-xs font-extrabold text-[#f8d030]">
                ?
              </span>
              <span className="hidden sm:inline">{t('pc.help')}</span>
            </button>
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
              className="cursor-pointer rounded-full border border-[#1f4a33] bg-[#132c20] px-3 py-1.5 text-[13px] hover:border-[#20d860]"
            >
              {locale === 'en' ? 'עברית' : 'English'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#1f4a33] bg-[#132c20] px-3 py-1.5 text-[13px] hover:border-[#20d860]"
            >
              <kbd className="font-mono text-[10px] text-[#8fb19c]">Esc</kbd>
              <span className="hidden sm:inline">{t('pc.close')}</span>
            </button>
          </header>

          {swapFrom !== null && slots[swapFrom] && (
            <div className="mx-3.5 mt-3 flex items-center gap-2.5 rounded-xl border border-[#f8d030] bg-[#2a2a12] px-3 py-2 text-[13px] font-medium text-[#f8d030]">
              ⇄ {t('pc.swapBanner', { name: name(slots[swapFrom]!.id) })}
              <button
                type="button"
                onClick={() => setSwapFrom(null)}
                className="ms-auto cursor-pointer rounded-full border border-[#1f4a33] bg-[#132c20] px-3 py-1 text-xs text-[#eaf5ee]"
              >
                {t('pc.cancel')}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 p-3.5 lg:grid-cols-[210px_minmax(0,1fr)_270px]">
            <TeamColumn
              party={party}
              selectedIdx={cursor.zone === 'party' ? cursor.idx : null}
              swapping={swapFrom !== null}
              dimmed={dimmed}
              dragOver={dragOver}
              onPick={(i) => pick('party', i)}
              onActivate={(i) => activate('party', i)}
              dnd={dnd}
            />
            <BoxPanel
              ref={searchRef}
              boxes={pd.boxes}
              box={box}
              selectedIdx={swapFrom ?? (cursor.zone === 'box' && slots[cursor.idx] ? cursor.idx : null)}
              cursorIdx={cursor.zone === 'box' && !slots[cursor.idx] ? cursor.idx : null}
              filter={filter}
              types={types}
              dragOver={dragOver}
              onBox={setBox}
              onPick={(i) => pick('box', i)}
              onActivate={(i) => activate('box', i)}
              onFilter={setFilter}
              onSearchSubmit={jumpToMatch}
              onSearchFocus={setSearchFocused}
              dnd={dnd}
            />
            <Inspector
              pokemon={shown}
              where={shownZone === 'party' ? t('pc.inTeam') : t('pc.inBox', { n: box + 1 })}
              action={action}
              canRelease={!releaseBlock()}
              hint={hint}
              boxNumber={box + 1}
              onAction={primary}
              onRelease={askRelease}
            />
          </div>

          <footer className="hidden flex-wrap gap-x-4 gap-y-1.5 border-t-2 border-[#1f4a33] bg-[#0b1b13] px-3.5 py-2.5 text-xs text-[#5d7d69] sm:flex">
            {keyHints.map(([k, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <kbd
                  className="rounded border border-[#1f4a33] bg-[#0a1912] px-1.5 font-mono text-[10px] text-[#8fb19c]"
                  dir="ltr"
                >
                  {k}
                </kbd>
                {t(label)}
              </span>
            ))}
          </footer>
        </div>
      </div>

      {toast && <PCToast text={toast.text} error={toast.error} onUndo={toast.undo ? undo : undefined} />}
      {modal === 'help' && <HelpDialog onClose={() => setModal(null)} />}
      {modal === 'release' && shown && (
        <ReleaseDialog pokemon={shown} onKeep={() => setModal(null)} onRelease={release} />
      )}
    </div>
  );
}
