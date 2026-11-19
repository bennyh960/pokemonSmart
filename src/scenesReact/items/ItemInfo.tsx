import type { ReactNode } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import { TypeBadge } from '../../ui-react/componenets/Typebadge';
import { categoryLabelKey } from '../../data/bag-pockets.js';
import { getTMEffect } from '../../data/item-defs.js';
import type { ItemDef } from '../../data/items.js';
import { getDamageClassLabel } from '../../data/type-constants.js';
import { getMove } from '../../services/pokemon-data.js';
import type { PokemonType } from '../../types/index.js';
import { entryName } from './item-list';
import { ItemSprite } from './ItemSprite';

/**
 * The detail panel of an item screen: picture, name, category, move info for a TM,
 * the description — and the screen's own controls (children) at the bottom.
 */
export function ItemInfo({
  def,
  badge,
  note,
  description,
  children,
}: {
  def: ItemDef | null;
  /** Next to the name, e.g. "×3" */
  badge?: ReactNode;
  /** After the category line, e.g. "✓ Used" */
  note?: ReactNode;
  /** Overrides the item's description (e.g. a key item after it was used) */
  description?: string;
  children?: ReactNode;
}) {
  const { t, locale } = useI18n();

  if (!def) {
    return (
      <aside className="rounded-2xl border border-[#1f4a33] bg-[#132c20] px-4 py-10 text-center text-sm text-[#8fb19c]">
        {t('bag.pickItem')}
      </aside>
    );
  }

  const tm = getTMEffect(def.id);
  const move = tm ? getMove(tm.moveId) : undefined;
  const dmg = move ? getDamageClassLabel(move.damageClass) : null;

  return (
    <aside
      aria-label={t('bag.details')}
      className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#1f4a33] bg-[#132c20] p-3.5 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:p-2.5"
    >
      <div className="grid h-28 shrink-0 place-items-center rounded-xl bg-[radial-gradient(circle_at_50%_62%,#1f4a33_0,#0b1b13_72%)] [@media(max-height:500px)]:h-14">
        <ItemSprite def={def} size={72} />
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-baseline justify-between gap-2 text-xl font-bold">
          <span dir="auto" className="min-w-0 truncate">
            {entryName(def, locale)}
          </span>
          {badge && (
            <span dir="ltr" className="shrink-0 font-mono text-sm text-[#cfe6d7]">
              {badge}
            </span>
          )}
        </h2>
        <div className="text-[13px] text-[#8fb19c]">
          {t(categoryLabelKey(def.category))}
          {note}
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
        {move ? move.description[locale] : (description ?? def.description[locale])}
      </p>

      <div className="mt-auto flex flex-col gap-2">{children}</div>
    </aside>
  );
}

/** − n + [All] with 44 px buttons. */
export function QtyStepper({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const { t } = useI18n();
  const set = (n: number) => onChange(Math.max(1, Math.min(max, n)));
  const btn =
    'h-11 cursor-pointer rounded-xl border border-[#2a5a3a] bg-[#0b1b13] disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm text-[#8fb19c]">{t('bag.qty')}</span>
      <button
        type="button"
        aria-label="−"
        disabled={value <= 1}
        onClick={() => set(value - 1)}
        className={`${btn} w-11 text-xl`}
      >
        −
      </button>
      <span dir="ltr" className="min-w-10 text-center font-mono text-xl">
        {value}
      </span>
      <button
        type="button"
        aria-label="+"
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className={`${btn} w-11 text-xl`}
      >
        +
      </button>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => set(max)}
        className={`${btn} px-3 text-[13px] text-[#cfe6d7]`}
      >
        {t('bag.qtyMax')}
      </button>
    </div>
  );
}

/** A full-width action with its keyboard key. */
export function ActionButton({
  label,
  keyHint,
  tone = 'primary',
  disabled,
  onClick,
}: {
  label: ReactNode;
  keyHint?: string;
  tone?: 'primary' | 'danger' | 'quiet';
  disabled?: boolean;
  onClick: () => void;
}) {
  const tones = {
    primary: 'min-h-12 border-[#2a9a6a] bg-[#1a7a55] text-base font-bold text-white',
    danger: 'min-h-11 border-[#6a2a2a] bg-[#0b1b13] text-[15px] text-[#ff9a8a]',
    quiet: 'min-h-11 border-[#2a5a3a] bg-[#0b1b13] text-[15px] text-[#cfe6d7]',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-start hover:enabled:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      <span className="flex-1">{label}</span>
      {keyHint && (
        <kbd dir="ltr" className="rounded border border-current/40 px-1.5 font-mono text-[10px] opacity-75">
          {keyHint}
        </kbd>
      )}
    </button>
  );
}
