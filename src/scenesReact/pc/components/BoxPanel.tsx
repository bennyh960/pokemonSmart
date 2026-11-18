import { forwardRef, type KeyboardEvent } from 'react';
import type { PCBox, Pokemon, PokemonType } from '../../../types/index.js';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge';
import { BOX_SIZE } from '../../../systems/pc-storage.js';
import { PCSprite } from './PCSprite';
import type { DragHandlers } from './dnd';
import { isFiltering, matchesFilter, type PCFilter } from '../pc-helpers';

interface Props {
  boxes: PCBox[];
  box: number;
  selectedIdx: number | null;
  /** Keyboard focus on an empty cell (selection only covers occupied ones) */
  cursorIdx: number | null;
  filter: PCFilter;
  types: PokemonType[];
  dragOver: string | null;
  onBox: (b: number) => void;
  onPick: (idx: number) => void;
  onActivate: (idx: number) => void;
  onFilter: (f: PCFilter) => void;
  /** Enter in the search box: jump to the first box with a match */
  onSearchSubmit: () => void;
  onSearchFocus: (focused: boolean) => void;
  dnd: DragHandlers;
}

const countIn = (box: PCBox) => box.pokemon.filter(Boolean).length;

export const BoxPanel = forwardRef<HTMLInputElement, Props>(function BoxPanel(
  {
    boxes,
    box,
    selectedIdx,
    cursorIdx,
    filter,
    types,
    dragOver,
    onBox,
    onPick,
    onActivate,
    onFilter,
    onSearchSubmit,
    onSearchFocus,
    dnd,
  },
  searchRef,
) {
  const { t, isRTL, locale } = useI18n();
  const filtering = isFiltering(filter);
  const matchCount = (b: PCBox) => b.pokemon.filter((p): p is Pokemon => !!p && matchesFilter(p, filter)).length;
  const totalFound = filtering ? boxes.reduce((n, b) => n + matchCount(b), 0) : 0;
  const slots = boxes[box]?.pokemon ?? [];

  // Typing stays in the field: stop the game's key handler (box keys, Enter = action, Space blocked)
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onFilter({ ...filter, query: '' });
      e.currentTarget.blur();
    } else if (e.key === 'Enter') {
      onSearchSubmit();
      e.currentTarget.blur();
    }
  };

  return (
    <section className="min-w-0">
      {/* Search + type filter */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-[#5d7d69]">
            ⌕
          </span>
          <input
            ref={searchRef}
            id="pc-search"
            type="search"
            value={filter.query}
            placeholder={t('pc.search')}
            onChange={(e) => onFilter({ ...filter, query: e.target.value })}
            onKeyDown={onSearchKey}
            onFocus={() => onSearchFocus(true)}
            onBlur={() => onSearchFocus(false)}
            className="h-9 w-full rounded-lg border border-[#1f4a33] bg-[#0b1b13] ps-8 pe-3 text-sm text-[#eaf5ee] outline-none placeholder:text-[#5d7d69] focus:border-[#20d860]"
          />
        </div>
        {filtering && (
          <>
            <span className="text-xs text-[#f8d030]">
              {totalFound > 0 ? t('pc.found', { n: totalFound }) : t('pc.noneFound')}
            </span>
            <button
              type="button"
              onClick={() => onFilter({ query: '', type: null })}
              className="cursor-pointer rounded-full border border-[#1f4a33] px-3 py-1 text-xs hover:border-[#20d860]"
            >
              {t('pc.clear')}
            </button>
          </>
        )}
      </div>
      {types.length > 1 && (
        <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onFilter({ ...filter, type: null })}
            className={`shrink-0 cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              filter.type === null ? 'bg-[#20d860] text-[#04150b]' : 'border border-[#1f4a33] text-[#8fb19c]'
            }`}
          >
            {t('pc.allTypes')}
          </button>
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onFilter({ ...filter, type: filter.type === type ? null : type })}
              className={`shrink-0 cursor-pointer rounded-full transition-opacity ${
                filter.type === type ? 'ring-2 ring-[#f8d030]' : filter.type ? 'opacity-40 hover:opacity-80' : ''
              }`}
            >
              <TypeBadge type={type} locale={locale} />
            </button>
          ))}
        </div>
      )}

      {/* Box name + arrows */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={t('pc.prevBox')}
          onClick={() => onBox(box - 1)}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#1f4a33] bg-[#132c20] text-lg hover:border-[#20d860]"
        >
          {isRTL ? '›' : '‹'}
        </button>
        <div className="min-w-0 flex-1 rounded-lg border border-[#1f4a33] bg-[#0b1b13] py-1 text-center">
          <b className="block text-[15px]">{t('pc.box', { n: box + 1 })}</b>
          <span className="font-mono text-[10px] text-[#5d7d69]">
            {countIn(boxes[box])}/{BOX_SIZE}
          </span>
        </div>
        <button
          type="button"
          aria-label={t('pc.nextBox')}
          onClick={() => onBox(box + 1)}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#1f4a33] bg-[#132c20] text-lg hover:border-[#20d860]"
        >
          {isRTL ? '‹' : '›'}
        </button>
      </div>

      {/* Box tabs: fill bar, or how many matches while searching */}
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
        {boxes.map((b, i) => {
          const key = `tab:${i}`;
          const on = i === box;
          const found = filtering ? matchCount(b) : 0;
          return (
            <button
              key={key}
              type="button"
              {...dnd.target(key)}
              onClick={() => onBox(i)}
              className={`relative min-w-[34px] shrink-0 cursor-pointer rounded-md border px-1.5 py-1 font-mono text-[10px] ${
                dragOver === key
                  ? 'border-[#f8d030] text-[#f8d030]'
                  : on
                    ? 'border-[#20d860] bg-[#20d860] text-[#04150b]'
                    : 'border-[#173826] text-[#5d7d69] hover:border-[#20d860] hover:text-[#eaf5ee]'
              } ${filtering && !found ? 'opacity-40' : ''}`}
            >
              {i + 1}
              <span className="mt-0.5 block h-[3px] overflow-hidden rounded bg-[#0a1912]">
                <span
                  className="block h-full bg-current opacity-70"
                  style={{ width: `${(countIn(b) / BOX_SIZE) * 100}%` }}
                />
              </span>
              {found > 0 && (
                <span className="absolute -top-1.5 -end-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#f8d030] px-1 text-[9px] font-bold text-[#1b1600]">
                  {found}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 6 × 5 grid */}
      <div className="grid grid-cols-6 gap-1.5 rounded-xl border border-[#1f4a33] bg-[#0b1b13] bg-[radial-gradient(#173826_1px,transparent_1px)] bg-[length:14px_14px] p-2">
        {slots.map((p, i) => {
          const key = `box:${i}`;
          const over = dragOver === key;
          const cursor = cursorIdx === i;
          if (!p) {
            return (
              <div
                key={key}
                {...dnd.target(key)}
                onClick={() => onPick(i)}
                className={`aspect-square rounded-lg border bg-[#0a1912]/60 ${
                  over
                    ? 'border-[#f8d030] bg-[#2a2a12]'
                    : cursor
                      ? 'border-2 border-dashed border-[#f8d030]'
                      : 'border-[#173826]'
                }`}
              />
            );
          }
          const sel = selectedIdx === i;
          const hidden = filtering && !matchesFilter(p, filter);
          return (
            <button
              key={p.uuid}
              type="button"
              draggable
              title={getPokemonDisplayName(p.id)}
              {...dnd.source(key)}
              {...dnd.target(key)}
              onClick={() => onPick(i)}
              onDoubleClick={() => onActivate(i)}
              className={`relative grid aspect-square cursor-pointer place-items-center rounded-lg border bg-[#0f2219] transition-transform hover:-translate-y-px ${
                over
                  ? 'border-[#f8d030] bg-[#2a2a12]'
                  : sel
                    ? 'border-2 border-[#20d860] bg-[#183a28]'
                    : 'border-[#173826] hover:border-[#20d860]'
              } ${hidden ? 'opacity-20' : ''}`}
            >
              <PCSprite id={p.id} className="h-full w-full" />
              <span className="absolute bottom-0.5 end-1 font-mono text-[9px] text-[#8fb19c]" dir="ltr">
                {p.level}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
