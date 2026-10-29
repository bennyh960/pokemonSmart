/**
 * Prize pills: `PrizeChip` (icon + name + quantity, used on the Word Board and the dex) and `PrizeIcon`
 * (a small tile — icon, quantity badge, short name — for the intro card's prize lists).
 */

import type { Locale } from '../../i18n/i18n.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { MiniGamePrizeDef } from '../types.js';
import { describeReward } from './prize-display.js';
import { RARITY_STYLE } from './ui.js';

interface Props {
  prize: MiniGamePrizeDef;
  /** Shown before the prize name ("First win prize!: …"). */
  label?: string;
  /** Icon for a random choice (e.g. a Pokémon sprite); a fixed prize uses its own icon. */
  icon?: string;
}

/**
 * How a prize looks: a fixed prize shows its own item; a random choice shows its label, with the first option's
 * icon and quantity (every option of a choice shares its quantity, e.g. "Status cure ×3").
 */
function prizeLook(
  prize: MiniGamePrizeDef,
  locale: Locale,
  mystery: string,
): { name: string; img?: string; emoji: string; qty?: string } {
  const first = 'reward' in prize ? prize.reward : prize.oneOf[0];
  const line = first ? describeReward(first, locale)[0] : undefined;
  const name = 'reward' in prize ? (line?.label ?? mystery) : (prize.label?.[locale] ?? mystery);
  const shown = 'reward' in prize || prize.label;
  return {
    name,
    img: shown ? (line?.icon ?? undefined) : undefined,
    emoji: shown ? (line?.emoji ?? '🎁') : '🎁',
    qty: line?.qty,
  };
}

export function PrizeChip({ label, prize, icon }: Props) {
  const { t, locale } = useI18n();
  const style = RARITY_STYLE[prize.rarity];
  const look = prizeLook(prize, locale, t('minigames.prize.mystery'));
  const img = look.img ?? icon;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full py-1 ps-1 pe-3 text-sm font-black shadow"
      style={{ background: style.bg, color: style.text, border: `2px solid ${style.border}` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70">
        {img ? <img src={img} alt="" className="h-7 w-7 object-contain" /> : look.emoji}
      </span>
      <span>
        {label && `${label}: `}
        {look.name}
        {look.qty && <span dir="ltr"> {look.qty}</span>}
      </span>
    </span>
  );
}

export function PrizeIcon({ prize }: { prize: MiniGamePrizeDef }) {
  const { t, locale } = useI18n();
  const style = RARITY_STYLE[prize.rarity];
  const look = prizeLook(prize, locale, t('minigames.prize.mystery'));
  return (
    <span className="flex w-16 flex-col items-center gap-1" title={look.name}>
      <span
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl shadow"
        style={{ background: style.bg, border: `2px solid ${style.border}` }}
      >
        {look.img ? (
          <img src={look.img} alt="" className="h-9 w-9 object-contain" />
        ) : (
          <span className="text-2xl">{look.emoji}</span>
        )}
        {look.qty && (
          <span
            className="absolute -bottom-1.5 -end-1.5 rounded-full bg-slate-900 px-1.5 text-[11px] font-black leading-5 text-white"
            dir="ltr"
          >
            {look.qty}
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-white">{look.name}</span>
    </span>
  );
}
