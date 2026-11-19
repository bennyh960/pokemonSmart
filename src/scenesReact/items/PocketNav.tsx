import { useI18n } from '../../ui-react/context/i18n-context';
import { BAG_POCKETS } from '../../data/bag-pockets.js';
import type { ItemFilter } from './item-list';

export type PocketId = ItemFilter['pocket'];

/** "All" first, then every pocket. On narrow screens this becomes a row of chips. */
export const POCKET_ORDER: { id: PocketId; labelKey: string; color: string }[] = [
  { id: 'all', labelKey: 'bag.pocket.all', color: '#cfe6d7' },
  ...BAG_POCKETS.map((p) => ({ id: p.id, labelKey: p.labelKey, color: p.color })),
];

export function PocketNav({
  active,
  counts,
  searching,
  hideEmpty,
  onPick,
}: {
  active: PocketId;
  counts: Record<string, number>;
  /** While searching every pocket is looked through, so none is highlighted */
  searching: boolean;
  hideEmpty: boolean;
  onPick: (id: PocketId) => void;
}) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('bag.pockets')}
      className="flex gap-1 overflow-x-auto rounded-2xl border border-[#1f4a33] bg-[#132c20] p-1.5 sm:col-span-2 lg:col-span-1 lg:flex-col lg:overflow-visible lg:p-2"
    >
      {POCKET_ORDER.filter((p) => !hideEmpty || p.id === 'all' || (counts[p.id] ?? 0) > 0 || p.id === active).map(
        (p) => {
          const on = !searching && p.id === active;
          const n = counts[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.id)}
              aria-pressed={on}
              className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-start text-[15px] ${
                on ? 'border-[#2a8a60] bg-[#1a5a35] text-white' : 'border-transparent text-[#cfe6d7] hover:bg-[#1a3a2a]'
              } ${n === 0 && !on ? 'opacity-55' : ''}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="flex-1 whitespace-nowrap">{t(p.labelKey)}</span>
              <span className="min-w-[22px] rounded-full bg-[#0b1b13] px-1.5 text-center font-mono text-xs text-[#8fb19c]">
                {n}
              </span>
            </button>
          );
        },
      )}
    </nav>
  );
}
