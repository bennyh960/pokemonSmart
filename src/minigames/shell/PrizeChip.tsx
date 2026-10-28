/** A small rarity-coloured pill for a prize: icon + name (+ quantity). Used on the intro card and the Word Board. */

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

export function PrizeChip({ label, prize, icon }: Props) {
  const { t, locale } = useI18n();
  const style = RARITY_STYLE[prize.rarity];
  const line = 'reward' in prize ? describeReward(prize.reward, locale)[0] : null;
  const name = line ? line.label : 'oneOf' in prize && prize.label ? prize.label[locale] : t('minigames.prize.mystery');
  const img = line?.icon ?? icon;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full py-1 ps-1 pe-3 text-sm font-black shadow"
      style={{ background: style.bg, color: style.text, border: `2px solid ${style.border}` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70">
        {img ? <img src={img} alt="" className="h-7 w-7 object-contain" /> : (line?.emoji ?? '🎁')}
      </span>
      <span>
        {label && `${label}: `}
        {name}
        {line?.qty && <span dir="ltr"> {line.qty}</span>}
      </span>
    </span>
  );
}
