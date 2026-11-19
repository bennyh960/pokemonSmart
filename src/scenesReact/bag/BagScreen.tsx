// src/scenesReact/bag/BagScreen.tsx
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ItemCategory } from '../../data/item-defs.js';
import { categoryLabelKey } from '../../data/bag-pockets.js';
import { useI18n } from '../../ui-react/context/i18n-context';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { useInputLayer } from '../../engine/input';
import { getLocalizedName } from '../../services/pokemon-data.js';
import type { BagController } from './index';
import type { BagMode } from './bag-mode';
import {
  bagEntries,
  canToss,
  filterEntries,
  inPocket,
  matchesQuery,
  presentCategories,
  type BagFilter,
} from './bag-helpers';
import { POCKET_ORDER, PocketNav } from './components/PocketNav';
import { ItemList } from './components/ItemList';
import { ItemDetail } from './components/ItemDetail';
import { TMQuestionDialog, TossDialog } from './components/BagDialogs';

const TOAST_MS = 4000;

/** What the scene keeps while the screen is unmounted (party / evolution on top). */
export interface BagView extends BagFilter {
  selected: string | null;
}

export interface TMQuestion {
  itemId: string;
  pokemonName: string;
  moveName: string;
  level: number;
}

const KEYS = [
  { code: 'ArrowUp', action: 'up' },
  { code: 'ArrowDown', action: 'down' },
  { code: 'ArrowLeft', action: 'left' },
  { code: 'ArrowRight', action: 'right' },
  { code: 'KeyQ', action: 'prev-pocket' },
  { code: 'KeyE', action: 'next-pocket' },
  { code: 'Enter', action: 'primary' },
  { code: 'Space', action: 'primary' },
  { code: 'Delete', action: 'toss' },
  { code: 'KeyF', action: 'search' },
  { code: 'Slash', action: 'search' },
  { code: 'KeyL', action: 'locale' },
  { code: 'Escape', action: 'escape' },
] as const;

const SORTS: BagFilter['sort'][] = ['default', 'name', 'qty'];

// The list is 2 columns from the `sm` breakpoint on — arrow keys step by row there
const TWO_COLS = '(min-width: 640px)';
const subscribeCols = (cb: () => void) => {
  const m = window.matchMedia(TWO_COLS);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const useColumns = () => useSyncExternalStore(subscribeCols, () => (window.matchMedia(TWO_COLS).matches ? 2 : 1));

export function BagScreen({
  mode,
  initialView,
  onViewChange,
  initialMessage,
  tmQuestion,
  controller,
  onClose,
}: {
  mode: BagMode;
  initialView: BagView;
  onViewChange: (v: BagView) => void;
  initialMessage: string | null;
  tmQuestion: Omit<TMQuestion, 'itemId'> | null;
  controller: BagController;
  onClose: () => void;
}) {
  const { t, locale, setLocale, isRTL } = useI18n();
  const [pd, , version] = usePlayerData();
  const cols = useColumns();

  const [filter, setFilter] = useState<BagFilter>(initialView);
  const [selected, setSelected] = useState<string | null>(initialView.selected);
  const [toast, setToast] = useState<string | null>(initialMessage);
  const [question, setQuestion] = useState(tmQuestion);
  const [tossing, setTossing] = useState(false);
  const [sellQty, setSellQty] = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => bagEntries(pd.items, mode), [version, mode]);
  const list = filterEntries(all, filter);
  const entry = list.find((e) => e.id === selected) ?? list[0] ?? null;
  const searching = filter.query.trim() !== '';
  const subCats = searching ? [] : presentCategories(all, filter.pocket);

  const counts = Object.fromEntries(
    POCKET_ORDER.map((p) => [p.id, all.filter((e) => inPocket(e, p.id) && matchesQuery(e, filter.query)).length]),
  );

  useEffect(() => onViewChange({ ...filter, selected: entry?.id ?? null }), [filter, entry?.id, onViewChange]);
  useEffect(() => setSellQty(1), [entry?.id]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const say = (msg: string | void) => {
    if (msg) setToast(msg);
  };
  const pickPocket = (pocket: BagFilter['pocket']) => {
    setFilter((f) => ({ ...f, pocket, category: null, query: '' }));
    setSelected(null);
  };
  const stepPocket = (d: 1 | -1) => {
    const i = POCKET_ORDER.findIndex((p) => p.id === filter.pocket);
    pickPocket(POCKET_ORDER[(i + d + POCKET_ORDER.length) % POCKET_ORDER.length].id);
  };
  const moveBy = (d: number) => {
    if (!list.length) return;
    const i = entry ? list.indexOf(entry) : 0;
    setSelected(list[Math.max(0, Math.min(list.length - 1, i + d))].id);
  };

  function primary(id = entry?.id) {
    if (!id) return;
    say(mode === 'sell-item' ? controller.sell(id, sellQty) : controller.activate(id));
  }
  const askToss = () => entry && canToss(entry.def, mode) && setTossing(true);

  useInputLayer({
    id: 'bag-screen',
    name: 'Bag',
    blocksLowerLayers: true,
    keyBindings: KEYS,
    active: !searchFocused && !question && !tossing,
    onAction: (action) => {
      switch (action) {
        case 'up':
          return moveBy(-cols);
        case 'down':
          return moveBy(cols);
        case 'left':
          return moveBy(isRTL ? 1 : -1);
        case 'right':
          return moveBy(isRTL ? -1 : 1);
        case 'prev-pocket':
          return stepPocket(-1);
        case 'next-pocket':
          return stepPocket(1);
        case 'primary':
          return primary();
        case 'toss':
          return askToss();
        case 'search':
          return searchRef.current?.focus();
        case 'locale':
          return setLocale(locale === 'en' ? 'he' : 'en');
        case 'escape':
          return searching ? setFilter((f) => ({ ...f, query: '' })) : onClose();
      }
    },
  });

  const title = mode === 'sell-item' ? t('bag.title.sell') : mode === 'battle' ? t('bag.title.battle') : t('bag.title');
  const keyHints: [string, string][] = [
    ['←↑→↓', 'bag.key.move'],
    ['Q E', 'bag.key.pocket'],
    ['F', 'bag.key.search'],
    ['Enter', mode === 'sell-item' ? 'bag.action.sell' : 'bag.key.use'],
    ...(mode === 'overworld' ? ([['Del', 'bag.action.toss']] as [string, string][]) : []),
    ['L', 'bag.key.locale'],
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#08130e] font-sans text-[#eaf5ee] select-none">
      <div className="mx-auto flex h-full max-w-[1200px] flex-col sm:py-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-[#1f4a33] bg-[#0f2219] sm:rounded-2xl sm:border-2">
          {/* Header */}
          <header className="flex flex-wrap items-center gap-2 border-b-2 border-[#1f4a33] bg-[#0b1b13] px-3 py-2 lg:gap-2.5 lg:px-3.5 lg:py-2.5">
            <h1 className="m-0 flex items-center gap-2 text-lg font-extrabold">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#20d860"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 8h12l1 12H5z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              {title}
            </h1>

            <label
              className={`order-last flex h-11 min-w-0 basis-full items-center gap-2 rounded-xl border bg-[#132c20] px-3 md:order-none md:basis-auto md:flex-1 ${searching ? 'border-[#20d860]' : 'border-[#1f4a33]'}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8fb19c"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <span className="sr-only">{t('bag.search.label')}</span>
              <input
                ref={searchRef}
                type="search"
                value={filter.query}
                placeholder={t('bag.search.placeholder')}
                onChange={(e) => {
                  const query = e.target.value;
                  setFilter((f) => ({ ...f, query }));
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (filter.query) setFilter((f) => ({ ...f, query: '' }));
                    else searchRef.current?.blur();
                    e.stopPropagation();
                  } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    searchRef.current?.blur();
                    e.preventDefault();
                  }
                }}
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#eaf5ee] outline-none placeholder:text-[#7f9f8b] [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button
                  type="button"
                  aria-label={t('bag.search.clear')}
                  onClick={() => setFilter((f) => ({ ...f, query: '' }))}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#8fb19c] hover:bg-[#1a3a2a] hover:text-white"
                >
                  ✕
                </button>
              )}
              <kbd className="rounded border border-[#2a5a3a] px-1.5 font-mono text-[10px] text-[#8fb19c]">F</kbd>
            </label>

            <span className="flex-1 md:hidden" />

            <div
              role="group"
              aria-label={t('bag.sort.label')}
              className="hidden gap-1 lg:flex rounded-xl border border-[#1f4a33] bg-[#132c20] p-1"
            >
              {SORTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={filter.sort === s}
                  onClick={() => setFilter((f) => ({ ...f, sort: s }))}
                  className={`h-8 cursor-pointer rounded-lg px-2.5 text-[13px] ${filter.sort === s ? 'bg-[#1a5a35] text-white' : 'text-[#8fb19c] hover:text-white'}`}
                >
                  {t(`bag.sort.${s}`)}
                </button>
              ))}
            </div>

            <span className="flex h-11 items-center gap-2 rounded-xl border border-[#1f4a33] bg-[#132c20] px-3 text-sm">
              <span className="hidden text-[#8fb19c] sm:inline">{t('bag.money')}</span>
              <b dir="ltr" className="font-mono text-[#f8d030]">
                ₽{pd.money.toLocaleString('en-US')}
              </b>
            </span>
            <button
              type="button"
              onClick={() => setLocale(locale === 'en' ? 'he' : 'en')}
              className="h-11 cursor-pointer rounded-xl border border-[#1f4a33] bg-[#132c20] px-3 text-[13px] hover:border-[#20d860]"
            >
              {locale === 'en' ? 'עברית' : 'English'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[#1f4a33] bg-[#132c20] px-3 text-[13px] hover:border-[#20d860]"
            >
              <kbd className="font-mono text-[10px] text-[#8fb19c]">Esc</kbd>
              <span className="hidden sm:inline">{t('bag.close')}</span>
            </button>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-y-auto p-2.5 sm:grid-cols-[minmax(0,1fr)_260px] sm:grid-rows-[auto_minmax(0,1fr)] sm:overflow-hidden lg:grid-cols-[210px_minmax(0,1fr)_300px] lg:grid-rows-1 lg:gap-3 lg:p-3">
            <PocketNav
              active={filter.pocket}
              counts={counts}
              searching={searching}
              // Selling / in battle a pocket with nothing usable is just noise
              hideEmpty={mode !== 'overworld'}
              onPick={pickPocket}
            />

            <section
              aria-label={t('bag.items')}
              className="flex min-h-[280px] flex-col gap-2.5 rounded-2xl border border-[#1f4a33] bg-[#10251a] p-2.5 sm:min-h-0"
            >
              {subCats.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[null, ...subCats].map((c: ItemCategory | null) => {
                    const on = filter.category === c;
                    return (
                      <button
                        key={c ?? 'all'}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setFilter((f) => ({ ...f, category: c }));
                          setSelected(null);
                        }}
                        className={`h-8 cursor-pointer rounded-full border px-3.5 text-[13px] ${on ? 'border-[#20d860] bg-[#20d860] text-[#06210f]' : 'border-[#2a5a3a] text-[#cfe6d7] hover:border-[#20d860]'}`}
                      >
                        {c ? t(categoryLabelKey(c)) : t('bag.pocket.all')}
                      </button>
                    );
                  })}
                </div>
              )}
              {searching && list.length > 0 && (
                <div className="text-[13px] text-[#8fb19c]">{t('bag.search.results', { count: list.length })}</div>
              )}
              {list.length > 0 ? (
                <ItemList
                  entries={list}
                  selectedId={entry?.id ?? null}
                  mode={mode}
                  onPick={setSelected}
                  onActivate={primary}
                />
              ) : (
                <div className="grid flex-1 place-items-center px-4 text-center text-[15px] leading-relaxed text-[#8fb19c]">
                  {searching ? (
                    <div>
                      {t('bag.search.none', { query: filter.query })}
                      <br />
                      <span className="text-[13px]">{t('bag.search.noneHint')}</span>
                    </div>
                  ) : (
                    t('bag.noItems')
                  )}
                </div>
              )}
            </section>

            <ItemDetail
              entry={entry}
              mode={mode}
              qty={sellQty}
              onQty={(n) => setSellQty(Math.max(1, Math.min(entry?.qty ?? 1, n)))}
              onPrimary={() => primary()}
              onToss={askToss}
            />
          </div>

          <footer className="hidden flex-wrap gap-x-4 gap-y-1.5 border-t-2 border-[#1f4a33] bg-[#0b1b13] px-3.5 py-2.5 text-xs text-[#8fb19c] lg:flex [@media(pointer:coarse)]:hidden">
            {keyHints.map(([k, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <kbd
                  dir="ltr"
                  className="rounded border border-[#1f4a33] bg-[#0a1912] px-1.5 font-mono text-[10px] text-[#cfe6d7]"
                >
                  {k}
                </kbd>
                {t(label)}
              </span>
            ))}
            <span className="ms-auto inline-flex items-center gap-1.5">
              <kbd className="rounded border border-[#1f4a33] bg-[#0a1912] px-1.5 font-mono text-[10px] text-[#cfe6d7]">
                Esc
              </kbd>
              {t('bag.close')}
            </span>
          </footer>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-5 z-20 mx-auto w-fit max-w-[90vw] rounded-xl border border-[#2a8a60] bg-[#0f2a1c] px-4 py-2.5 text-[15px] shadow-lg"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

      {question && (
        <TMQuestionDialog
          text={t('bag.tm.naturalWarn', { name: question.pokemonName, move: question.moveName, level: question.level })}
          onKeep={() => {
            setQuestion(null);
            controller.answerTM(false);
          }}
          onTeach={() => {
            setQuestion(null);
            say(controller.answerTM(true));
          }}
        />
      )}

      {tossing && entry && (
        <TossDialog
          itemName={getLocalizedName(entry.def.name)}
          max={entry.qty}
          onCancel={() => setTossing(false)}
          onToss={(n) => {
            setTossing(false);
            say(controller.toss(entry.id, n));
          }}
        />
      )}
    </div>
  );
}
