import { TYPE_BADGE } from '../../data/type-constants';
import type { PokemonType } from '../../types';
import { getContrastTextColor } from '../../utils/util';

interface TypeBadgeProps {
  type: PokemonType;
  dim?: boolean;
  locale?: 'en' | 'he';
  color?: 'white' | 'black';
}

export function TypeBadge({ type, dim, locale, color }: TypeBadgeProps) {
  if (dim) {
    return (
      <span className="rounded-full border border-dashed border-zinc-600 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        ???
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide `}
      style={{ backgroundColor: TYPE_BADGE[type].color, color: color ?? getContrastTextColor(TYPE_BADGE[type].color) }}
    >
      {locale === 'en' ? TYPE_BADGE[type].en : TYPE_BADGE[type].he}
    </span>
  );
}
