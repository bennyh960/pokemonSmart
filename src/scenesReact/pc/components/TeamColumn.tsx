import type { Pokemon } from '../../../types/index.js';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { MAX_PARTY } from '../../../systems/pc-storage.js';
import { PCSprite } from './PCSprite';
import type { DragHandlers } from './dnd';

interface Props {
  party: Pokemon[];
  selectedIdx: number | null;
  /** Choosing who swaps with a boxed Pokémon: every team slot pulses */
  swapping: boolean;
  dimmed: (p: Pokemon) => boolean;
  dragOver: string | null;
  onPick: (idx: number) => void;
  onActivate: (idx: number) => void;
  dnd: DragHandlers;
}

export function TeamColumn({ party, selectedIdx, swapping, dimmed, dragOver, onPick, onActivate, dnd }: Props) {
  const { t } = useI18n();
  const full = party.length >= MAX_PARTY;

  return (
    <section className="min-w-0">
      <h2 className="mb-2 flex items-baseline justify-between text-[13px] font-bold uppercase tracking-wider text-[#8fb19c]">
        {t('pc.team')}
        <span className={`font-mono text-xs tracking-normal ${full ? 'text-[#f8d030]' : 'text-[#5d7d69]'}`}>
          {party.length}/{MAX_PARTY}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
        {Array.from({ length: MAX_PARTY }, (_, i) => {
          const p = party[i];
          const key = `party:${i}`;
          const over = dragOver === key;
          if (!p) {
            return (
              <div
                key={key}
                {...dnd.target(key)}
                className={`grid min-h-[52px] place-items-center rounded-xl border border-dashed text-xs ${
                  over ? 'border-[#f8d030] bg-[#2a2a12]' : 'border-[#173826] text-[#5d7d69]'
                }`}
              >
                {t('pc.freeSpot')}
              </div>
            );
          }
          const sel = selectedIdx === i;
          const hpPct = p.maxHp > 0 ? Math.round((p.hp / p.maxHp) * 100) : 0;
          return (
            <button
              key={p.uuid}
              type="button"
              draggable
              {...dnd.source(key)}
              {...dnd.target(key)}
              onClick={() => onPick(i)}
              onDoubleClick={() => onActivate(i)}
              className={`grid min-h-[52px] cursor-pointer grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-xl border px-2 py-1 text-start transition-colors ${
                over
                  ? 'border-[#f8d030] bg-[#2a2a12]'
                  : sel
                    ? 'border-[#20d860] bg-[#183a28] shadow-[inset_3px_0_0_#20d860] rtl:shadow-[inset_-3px_0_0_#20d860]'
                    : 'border-[#173826] bg-[#132c20] hover:border-[#20d860]'
              } ${swapping ? 'animate-pulse border-[#f8d030]' : ''} ${dimmed(p) ? 'opacity-35' : ''}`}
            >
              <PCSprite id={p.id} className="-m-2 h-16 w-16" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{getPokemonDisplayName(p.id)}</span>
                <span className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#8fb19c]" dir="ltr">
                    Lv{p.level}
                  </span>
                  <span className="h-1 flex-1 overflow-hidden rounded bg-[#0a1912]">
                    <span className="block h-full bg-[#20d860]" style={{ width: `${hpPct}%` }} />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
