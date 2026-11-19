import { useI18n } from '../../../ui-react/context/i18n-context';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge';
import { categoryLabelKey } from '../../../data/bag-pockets.js';
import { getTMEffect } from '../../../data/item-defs.js';
import { getDamageClassLabel } from '../../../data/type-constants.js';
import { getMove } from '../../../services/pokemon-data.js';
import type { PokemonType } from '../../../types/index.js';
import { canToss, entryName, isStoryKeyItem, primaryAction, sellPrice, type BagEntry } from '../bag-helpers';
import type { BagMode } from '../bag-mode';
import { ItemSprite } from './ItemSprite';

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-current/40 px-1.5 font-mono text-[10px] opacity-75" dir="ltr">
      {children}
    </kbd>
  );
}

const ACTION_LABEL = {
  use: 'bag.action.use',
  teach: 'bag.action.teach',
  give: 'bag.action.give',
  pick: 'bag.action.use',
  sell: 'bag.action.sell',
} as const;

export function ItemDetail({
  entry,
  mode,
  qty,
  onQty,
  onPrimary,
  onToss,
}: {
  entry: BagEntry | null;
  mode: BagMode;
  /** Sell mode: how many to sell */
  qty: number;
  onQty: (n: number) => void;
  onPrimary: () => void;
  onToss: () => void;
}) {
  const { t, locale } = useI18n();
  const [pd] = usePlayerData();

  if (!entry) {
    return (
      <aside className="rounded-2xl border border-[#1f4a33] bg-[#132c20] px-4 py-10 text-center text-sm text-[#8fb19c]">
        {t('bag.pickItem')}
      </aside>
    );
  }

  const { def } = entry;
  const action = primaryAction(def, mode);
  const used = isStoryKeyItem(def) && !!(def.usedFlag && pd.flags[def.usedFlag]);
  const desc = used && def.usedDescription ? def.usedDescription[locale] : def.description[locale];
  const tm = getTMEffect(def.id);
  const move = tm ? getMove(tm.moveId) : undefined;
  const dmg = move ? getDamageClassLabel(move.damageClass) : null;

  return (
    <aside
      aria-label={t('bag.details')}
      className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#1f4a33] bg-[#132c20] p-3.5 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-2.5"
    >
      <div className="grid h-28 shrink-0 place-items-center [@media(max-height:500px)]:h-14 rounded-xl bg-[radial-gradient(circle_at_50%_62%,#1f4a33_0,#0b1b13_72%)]">
        <ItemSprite def={def} size={72} />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-baseline justify-between gap-2 text-xl font-bold">
          <span dir="auto" className="min-w-0 truncate">
            {entryName(def, locale)}
          </span>
          {!isStoryKeyItem(def) && (
            <span dir="ltr" className="shrink-0 font-mono text-sm text-[#cfe6d7]">
              ×{entry.qty}
            </span>
          )}
        </h2>
        <div className="text-[13px] text-[#8fb19c]">
          {t(categoryLabelKey(def.category))}
          {used && <span className="ms-2 text-[#44cc88]">{t('bag.used')}</span>}
        </div>
      </div>

      {move && dmg && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <TypeBadge type={move.type as PokemonType} locale={locale} />
          <span className="rounded-full border border-[#2a5a3a] px-2 py-0.5" style={{ color: dmg.color }}>
            {dmg.label}
          </span>
          <span dir="ltr" className="rounded-full border border-[#2a5a3a] px-2 py-0.5 font-mono text-[#cfe6d7]">
            {t('bag.tm.power')} {move.power || '—'} · {t('bag.tm.accuracy')} {move.accuracy ? `${move.accuracy}%` : '—'}{' '}
            · PP {move.pp}
          </span>
          {tm?.isHM && (
            <span className="rounded-full bg-[#0b1b13] px-2 py-0.5 text-[#cfe6d7]">{t('bag.tm.reusable')}</span>
          )}
        </div>
      )}

      <p dir="auto" className="m-0 text-sm leading-relaxed text-[#cfe6d7]">
        {move ? move.description[locale] : desc}
      </p>

      <div className="mt-auto flex flex-col gap-2">
        {mode === 'sell-item' && (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-[#8fb19c]">{t('bag.qty')}</span>
            <button
              type="button"
              aria-label="−"
              onClick={() => onQty(qty - 1)}
              className="h-11 w-11 cursor-pointer rounded-xl border border-[#2a5a3a] bg-[#0b1b13] text-xl"
            >
              −
            </button>
            <span dir="ltr" className="min-w-10 text-center font-mono text-xl">
              {qty}
            </span>
            <button
              type="button"
              aria-label="+"
              onClick={() => onQty(qty + 1)}
              className="h-11 w-11 cursor-pointer rounded-xl border border-[#2a5a3a] bg-[#0b1b13] text-xl"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onQty(entry.qty)}
              className="h-11 cursor-pointer rounded-xl border border-[#2a5a3a] bg-[#0b1b13] px-3 text-[13px] text-[#cfe6d7]"
            >
              {t('bag.qtyMax')}
            </button>
          </div>
        )}

        {action.kind === 'none' ? (
          <p className="m-0 rounded-xl border border-[#1f4a33] bg-[#0b1b13] px-3 py-2.5 text-sm text-[#8fb19c]">
            {t(action.reasonKey)}
          </p>
        ) : (
          <button
            type="button"
            onClick={onPrimary}
            className="flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-[#2a9a6a] bg-[#1a7a55] px-4 text-start text-base font-bold text-white hover:brightness-110"
          >
            <span className="flex-1">
              {action.kind === 'sell'
                ? t('bag.action.sellFor', { count: qty, price: (sellPrice(def) * qty).toLocaleString('en-US') })
                : t(ACTION_LABEL[action.kind])}
            </span>
            <Kbd>Enter</Kbd>
          </button>
        )}

        {canToss(def, mode) && (
          <button
            type="button"
            onClick={onToss}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[#6a2a2a] bg-[#0b1b13] px-4 text-start text-[15px] text-[#ff9a8a] hover:brightness-110"
          >
            <span className="flex-1">{t('bag.action.toss')}</span>
            <Kbd>Del</Kbd>
          </button>
        )}
      </div>
    </aside>
  );
}
