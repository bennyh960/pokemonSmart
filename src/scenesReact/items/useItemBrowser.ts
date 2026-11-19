import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import { filterEntries, inPocket, matchesQuery, presentCategories, type ItemEntry, type ItemFilter } from './item-list';
import { POCKET_ORDER } from './PocketNav';

/** Keys every item screen shares; screens add their own (Enter, Del…) after these. */
export const BROWSE_KEYS = [
  { code: 'ArrowUp', action: 'up' },
  { code: 'ArrowDown', action: 'down' },
  { code: 'ArrowLeft', action: 'left' },
  { code: 'ArrowRight', action: 'right' },
  { code: 'KeyQ', action: 'prev-pocket' },
  { code: 'KeyE', action: 'next-pocket' },
  { code: 'KeyF', action: 'search' },
  { code: 'Slash', action: 'search' },
  { code: 'KeyL', action: 'locale' },
  { code: 'Escape', action: 'escape' },
] as const;

// The list is 2 columns from the `sm` breakpoint on — arrow keys step by row there
const TWO_COLS = '(min-width: 640px)';
const subscribeCols = (cb: () => void) => {
  const m = window.matchMedia(TWO_COLS);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const useColumns = () => useSyncExternalStore(subscribeCols, () => (window.matchMedia(TWO_COLS).matches ? 2 : 1));

const TOAST_MS = 4000;

/** A message at the bottom that hides itself. `say` ignores empty messages. */
export function useToast(initial: string | null = null) {
  const [toast, setToast] = useState<string | null>(initial);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);
  const say = (msg: string | void | null) => {
    if (msg) setToast(msg);
  };
  return [toast, say, () => setToast(null)] as const;
}

export type ItemBrowser<T extends ItemEntry> = ReturnType<typeof useItemBrowser<T>>;

/**
 * Pocket / category / search / sort state of an item screen, the selected item,
 * and the shared keyboard moves. `handleKey` returns true when it used the action.
 */
export function useItemBrowser<T extends ItemEntry>(
  all: T[],
  initial: ItemFilter,
  initialSelected: string | null = null,
) {
  const { isRTL, locale, setLocale } = useI18n();
  const cols = useColumns();
  const [filter, setFilter] = useState<ItemFilter>(initial);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = filterEntries(all, filter);
  const entry = list.find((e) => e.id === selected) ?? list[0] ?? null;
  const searching = filter.query.trim() !== '';
  const subCats = searching ? [] : presentCategories(all, filter.pocket);
  const counts = Object.fromEntries(
    POCKET_ORDER.map((p) => [p.id, all.filter((e) => inPocket(e, p.id) && matchesQuery(e, filter.query)).length]),
  );

  const pickPocket = (pocket: ItemFilter['pocket']) => {
    setFilter((f) => ({ ...f, pocket, category: null, query: '' }));
    setSelected(null);
  };
  const setCategory = (category: ItemFilter['category']) => {
    setFilter((f) => ({ ...f, category }));
    setSelected(null);
  };
  const setQuery = (query: string) => setFilter((f) => ({ ...f, query }));
  const setSort = (sort: ItemFilter['sort']) => setFilter((f) => ({ ...f, sort }));

  const stepPocket = (d: 1 | -1) => {
    const i = POCKET_ORDER.findIndex((p) => p.id === filter.pocket);
    pickPocket(POCKET_ORDER[(i + d + POCKET_ORDER.length) % POCKET_ORDER.length].id);
  };
  const moveBy = (d: number) => {
    if (!list.length) return;
    const i = entry ? list.indexOf(entry) : 0;
    setSelected(list[Math.max(0, Math.min(list.length - 1, i + d))].id);
  };

  function handleKey(action: string, onClose: () => void): boolean {
    switch (action) {
      case 'up':
        moveBy(-cols);
        return true;
      case 'down':
        moveBy(cols);
        return true;
      case 'left':
        moveBy(isRTL ? 1 : -1);
        return true;
      case 'right':
        moveBy(isRTL ? -1 : 1);
        return true;
      case 'prev-pocket':
        stepPocket(-1);
        return true;
      case 'next-pocket':
        stepPocket(1);
        return true;
      case 'search':
        searchRef.current?.focus();
        return true;
      case 'locale':
        setLocale(locale === 'en' ? 'he' : 'en');
        return true;
      case 'escape':
        if (searching) setQuery('');
        else onClose();
        return true;
    }
    return false;
  }

  return {
    filter,
    list,
    entry,
    searching,
    subCats,
    counts,
    searchRef,
    searchFocused,
    setSearchFocused,
    setSelected,
    pickPocket,
    setCategory,
    setQuery,
    setSort,
    handleKey,
  };
}
