import { useEffect, useRef } from 'react';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData';
import { categoryLabelKey } from '../../../data/bag-pockets.js';
import { entryName, isStoryKeyItem, sellPrice, type BagEntry } from '../bag-helpers';
import type { BagMode } from '../bag-mode';
import { ItemSprite } from './ItemSprite';

export function ItemList({
  entries,
  selectedId,
  mode,
  onPick,
  onActivate,
}: {
  entries: BagEntry[];
  selectedId: string | null;
  mode: BagMode;
  onPick: (id: string) => void;
  /** A click / tap on the row that is already selected (so a double click = use) */
  onActivate: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [pd] = usePlayerData();
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
        const used = isStoryKeyItem(e.def) && !!(e.def.usedFlag && pd.flags[e.def.usedFlag]);
        return (
          <button
            key={e.id}
            type="button"
            role="option"
            aria-selected={on}
            onClick={() => (on ? onActivate(e.id) : onPick(e.id))}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-1.5 text-start ${
              on ? 'border-[#20d860] bg-[#1a3a2a]' : 'border-[#1f4a33] bg-[#132c20] hover:border-[#2a6a40]'
            }`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0b1b13]">
              <ItemSprite def={e.def} size={32} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span dir="auto" className="truncate text-[15px] font-medium">
                {entryName(e.def, locale)}
              </span>
              <span className="truncate text-xs text-[#8fb19c]">{t(categoryLabelKey(e.def.category))}</span>
            </span>
            {mode === 'sell-item' ? (
              <span dir="ltr" className="shrink-0 text-end font-mono text-[13px] leading-tight">
                <span className="block text-[#f8d030]">₽{sellPrice(e.def).toLocaleString('en-US')}</span>
                <span className="block text-[#8fb19c]">×{e.qty}</span>
              </span>
            ) : isStoryKeyItem(e.def) ? (
              <span className={`shrink-0 text-lg ${used ? 'text-[#44cc88]' : 'text-[#8fb19c]'}`}>
                {used ? '✓' : '□'}
              </span>
            ) : (
              <span dir="ltr" className="shrink-0 font-mono text-sm text-[#cfe6d7]">
                ×{e.qty}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
