import type { ReactNode } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import { categoryLabelKey } from '../../data/bag-pockets.js';
import type { ItemCategory } from '../../data/item-defs.js';
import type { ItemEntry, ItemSort } from './item-list';
import type { ItemBrowser } from './useItemBrowser';
import { PocketNav } from './PocketNav';

function Kbd({ children }: { children: string }) {
  return (
    <kbd dir="ltr" className="rounded border border-[#1f4a33] bg-[#0a1912] px-1.5 font-mono text-[10px] text-[#cfe6d7]">
      {children}
    </kbd>
  );
}

/**
 * The layout every item screen shares (bag, shop): header with search / sort / money,
 * pockets, the list in the middle, the screen's detail panel, key hints and a toast.
 */
export function ItemsFrame<T extends ItemEntry>({
  title,
  icon,
  browser: b,
  sorts,
  money,
  hideEmptyPockets,
  emptyText,
  list,
  detail,
  keyHints,
  toast,
  onToastClick,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  browser: ItemBrowser<T>;
  sorts: ItemSort[];
  money: number;
  /** Hide pockets that have nothing in them (selling, battle, a small shop) */
  hideEmptyPockets: boolean;
  emptyText: string;
  /** The list itself, shown when the filter matches something */
  list: ReactNode;
  detail: ReactNode;
  /** [key, i18n label] — Esc / back is added at the end */
  keyHints: [string, string][];
  toast: string | null;
  onToastClick: () => void;
  onClose: () => void;
  /** Dialogs */
  children?: ReactNode;
}) {
  const { t, locale, setLocale } = useI18n();
  const { filter, searching } = b;
  const allHints: [string, string][] = [
    ['←↑→↓', 'bag.key.move'],
    ['Q E', 'bag.key.pocket'],
    ['F', 'bag.key.search'],
    ...keyHints,
    ['L', 'bag.key.locale'],
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#08130e] font-sans text-[#eaf5ee] select-none">
      <div className="mx-auto flex h-full max-w-[1200px] flex-col sm:py-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-[#1f4a33] bg-[#0f2219] sm:rounded-2xl sm:border-2">
          <header className="flex flex-wrap items-center gap-2 border-b-2 border-[#1f4a33] bg-[#0b1b13] px-3 py-2 lg:gap-2.5 lg:px-3.5 lg:py-2.5">
            <h1 className="m-0 flex items-center gap-2 text-lg font-extrabold">
              {icon}
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
                ref={b.searchRef}
                type="search"
                value={filter.query}
                placeholder={t('bag.search.placeholder')}
                onChange={(e) => b.setQuery(e.target.value)}
                onFocus={() => b.setSearchFocused(true)}
                onBlur={() => b.setSearchFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (filter.query) b.setQuery('');
                    else b.searchRef.current?.blur();
                    e.stopPropagation();
                  } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                    b.searchRef.current?.blur();
                    e.preventDefault();
                  }
                }}
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#eaf5ee] outline-none placeholder:text-[#7f9f8b] [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button
                  type="button"
                  aria-label={t('bag.search.clear')}
                  onClick={() => b.setQuery('')}
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
              className="hidden gap-1 rounded-xl border border-[#1f4a33] bg-[#132c20] p-1 lg:flex"
            >
              {sorts.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={filter.sort === s}
                  onClick={() => b.setSort(s)}
                  className={`h-8 cursor-pointer rounded-lg px-2.5 text-[13px] ${filter.sort === s ? 'bg-[#1a5a35] text-white' : 'text-[#8fb19c] hover:text-white'}`}
                >
                  {t(`bag.sort.${s}`)}
                </button>
              ))}
            </div>

            <span className="flex h-11 items-center gap-2 rounded-xl border border-[#1f4a33] bg-[#132c20] px-3 text-sm">
              <span className="hidden text-[#8fb19c] sm:inline">{t('bag.money')}</span>
              <b dir="ltr" className="font-mono text-[#f8d030]">
                ₽{money.toLocaleString('en-US')}
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
              counts={b.counts}
              searching={searching}
              hideEmpty={hideEmptyPockets}
              onPick={b.pickPocket}
            />

            <section
              aria-label={t('bag.items')}
              className="flex min-h-[280px] flex-col gap-2.5 rounded-2xl border border-[#1f4a33] bg-[#10251a] p-2.5 sm:min-h-0"
            >
              {b.subCats.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[null, ...b.subCats].map((c: ItemCategory | null) => {
                    const on = filter.category === c;
                    return (
                      <button
                        key={c ?? 'all'}
                        type="button"
                        aria-pressed={on}
                        onClick={() => b.setCategory(c)}
                        className={`h-8 cursor-pointer rounded-full border px-3.5 text-[13px] ${on ? 'border-[#20d860] bg-[#20d860] text-[#06210f]' : 'border-[#2a5a3a] text-[#cfe6d7] hover:border-[#20d860]'}`}
                      >
                        {c ? t(categoryLabelKey(c)) : t('bag.pocket.all')}
                      </button>
                    );
                  })}
                </div>
              )}
              {searching && b.list.length > 0 && (
                <div className="text-[13px] text-[#8fb19c]">{t('bag.search.results', { count: b.list.length })}</div>
              )}
              {b.list.length > 0 ? (
                list
              ) : (
                <div className="grid flex-1 place-items-center px-4 text-center text-[15px] leading-relaxed text-[#8fb19c]">
                  {searching ? (
                    <div>
                      {t('bag.search.none', { query: filter.query })}
                      <br />
                      <span className="text-[13px]">{t('bag.search.noneHint')}</span>
                    </div>
                  ) : (
                    emptyText
                  )}
                </div>
              )}
            </section>

            {detail}
          </div>

          <footer className="hidden flex-wrap gap-x-4 gap-y-1.5 border-t-2 border-[#1f4a33] bg-[#0b1b13] px-3.5 py-2.5 text-xs text-[#8fb19c] lg:flex [@media(pointer:coarse)]:hidden">
            {allHints.map(([k, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Kbd>{k}</Kbd>
                {t(label)}
              </span>
            ))}
            <span className="ms-auto inline-flex items-center gap-1.5">
              <Kbd>Esc</Kbd>
              {t('bag.close')}
            </span>
          </footer>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-5 z-20 mx-auto w-fit max-w-[90vw] rounded-xl border border-[#2a8a60] bg-[#0f2a1c] px-4 py-2.5 text-[15px] shadow-lg"
          onClick={onToastClick}
        >
          {toast}
        </div>
      )}

      {children}
    </div>
  );
}
