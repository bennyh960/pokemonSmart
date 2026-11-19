import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import { categoryLabelKey } from '../../data/bag-pockets.js';
import { entryName, type ItemEntry } from './item-list';
import { ItemSprite } from './ItemSprite';

/** Item rows (2 columns from `sm`). The screen draws the right-hand side of each row. */
export function ItemGrid<T extends ItemEntry>({
  entries,
  selectedId,
  onPick,
  onActivate,
  trailing,
  subtitle,
  dimmed,
}: {
  entries: T[];
  selectedId: string | null;
  onPick: (id: string) => void;
  /** A click / tap on the row that is already selected (so a double click = use) */
  onActivate: (id: string) => void;
  trailing: (e: T) => ReactNode;
  /** Second line; defaults to the item's category */
  subtitle?: (e: T) => ReactNode;
  dimmed?: (e: T) => boolean;
}) {
  const { t, locale } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the keyboard selection in view
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={t('bag.items')}
      className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-1.5 overflow-y-auto pe-1 sm:grid-cols-2"
    >
      {entries.map((e) => {
        const on = e.id === selectedId;
        return (
          <button
            key={e.id}
            type="button"
            role="option"
            aria-selected={on}
            onClick={() => (on ? onActivate(e.id) : onPick(e.id))}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-1.5 text-start ${
              on ? 'border-[#20d860] bg-[#1a3a2a]' : 'border-[#1f4a33] bg-[#132c20] hover:border-[#2a6a40]'
            } ${dimmed?.(e) ? 'opacity-60' : ''}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0b1b13]">
              <ItemSprite def={e.def} size={32} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span dir="auto" className="truncate text-[15px] font-medium">
                {entryName(e.def, locale)}
              </span>
              <span className="truncate text-xs text-[#8fb19c]">
                {subtitle ? subtitle(e) : t(categoryLabelKey(e.def.category))}
              </span>
            </span>
            {trailing(e)}
          </button>
        );
      })}
    </div>
  );
}
