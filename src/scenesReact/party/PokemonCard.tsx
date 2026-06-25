import { useEffect, useState } from 'react';
import type { Pokemon } from '../../types';
import type { MajorStatusId } from '../../types/battle-metadata';
import { useI18n } from '../../ui-react/context/i18n-context';
import { getCachedImage, loadImage } from '../../engine/sprite-loader';
import { TYPE_BADGE } from '../../data/type-constants';

export const STATUS_LABEL: Record<MajorStatusId, { en: string; he: string; color: string }> = {
  poison: { en: 'PSN', he: 'רעל', color: '#a040a0' },
  //   tox:  { en: 'TOX',  he: 'רעל+',  color: '#6a006a' },
  paralyze: { en: 'PAR', he: 'שיתוק', color: '#f8d030' },
  sleep: { en: 'SLP', he: 'שינה', color: '#7038f8' },
  burn: { en: 'BRN', he: 'כוויה', color: '#f08030' },
  freeze: { en: 'FRZ', he: 'קפוא', color: '#98d8d8' },
  //   faint:  { en: 'FNT',  he: 'עלפון', color: '#e83030' },
};

export function hpColor(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.5) return '#4ade80'; // green
  if (pct > 0.2) return '#facc15'; // yellow
  return '#f87171'; // red
}

export interface CardProps {
  pokemon: Pokemon;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  dragHandlers: {
    onDragStart: (i: number) => void;
    onDragOver: (e: React.DragEvent, i: number) => void;
    onDragEnd: () => void;
  };
  onClick: (p: Pokemon) => void;
}

export function PokemonCard({ pokemon, index, isSelected, isDragging, dragHandlers, onClick }: CardProps) {
  const { locale } = useI18n();
  const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
  const ballUrl = pokemon.caughtBall ? `/sprites/items/${pokemon.caughtBall}.png` : null;

  const [sprite, setSprite] = useState<string | null>(getCachedImage(spriteUrl)?.src ?? null);
  const [ballImg, setBallImg] = useState<string | null>(ballUrl ? (getCachedImage(ballUrl)?.src ?? null) : null);

  useEffect(() => {
    let dead = false;
    loadImage(spriteUrl)
      .then((img) => {
        if (!dead) setSprite(img.src);
      })
      .catch(() => {});
    if (ballUrl)
      loadImage(ballUrl)
        .then((img) => {
          if (!dead) setBallImg(img.src);
        })
        .catch(() => {});
    return () => {
      dead = true;
    };
  }, [pokemon.id, ballUrl, spriteUrl]);

  const isFainted = pokemon.hp === 0;
  const hpPct = Math.max(0, pokemon.hp / pokemon.maxHp);
  const xpPct = Math.min(1, pokemon.xp / pokemon.xpToNext);
  const typeColor = TYPE_BADGE[pokemon.types[0]].color;
  const primaryBadge = TYPE_BADGE[pokemon.types[0]];

  return (
    <div
      draggable
      onDragStart={() => dragHandlers.onDragStart(index)}
      onDragOver={(e) => dragHandlers.onDragOver(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      onClick={() => onClick(pokemon)}
      className={[
        'relative flex items-center gap-3 rounded-xl p-3 cursor-pointer select-none',
        'border transition-all duration-150 overflow-hidden animate-fade-in-up',
        isFainted
          ? 'bg-red-950/20 border-red-900/30 grayscale opacity-50'
          : isSelected
            ? 'border-slate-400/60 bg-slate-800'
            : 'bg-slate-800/70 border-slate-700/40 hover:bg-slate-700/70 hover:border-slate-600/60',
        isDragging ? 'opacity-30 scale-95' : '',
      ].join(' ')}
      style={{
        touchAction: 'none',
        animationDelay: `${index * 55}ms`,
        boxShadow: isSelected ? `0 0 0 1px ${typeColor}55, 0 0 20px ${typeColor}18` : undefined,
      }}
    >
      {/* type-color accent bar on the leading edge */}
      <div className="absolute start-0 top-0 bottom-0 w-1 rounded-s-xl" style={{ background: typeColor }} />

      {/* drag handle */}
      <span className="text-slate-600 cursor-grab active:cursor-grabbing text-base shrink-0 ms-1">⠿</span>

      {/* sprite */}
      <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
        {sprite ? (
          <img
            src={sprite}
            alt={pokemon.name}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
        )}
        {ballImg && (
          <img
            src={ballImg}
            alt=""
            className="absolute bottom-0 end-0 w-3.5 h-3.5 object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>

      {/* info */}
      <div className="flex-1 min-w-0">
        {/* name + level + status */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-white font-semibold text-sm truncate">{pokemon.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            {pokemon.status && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{
                  background: STATUS_LABEL[pokemon.status].color + '25',
                  color: STATUS_LABEL[pokemon.status].color,
                }}
              >
                {locale === 'he' ? STATUS_LABEL[pokemon.status].he : STATUS_LABEL[pokemon.status].en}
              </span>
            )}
            <span className="text-slate-400 text-xs">Lv.{pokemon.level}</span>
          </div>
        </div>

        {/* HP bar */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] text-slate-500 shrink-0 w-4">HP</span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hpPct * 100}%`,
                backgroundColor: hpColor(pokemon.hp, pokemon.maxHp),
                boxShadow: `0 0 6px ${hpColor(pokemon.hp, pokemon.maxHp)}88`,
              }}
            />
          </div>
          <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
            {pokemon.hp}/{pokemon.maxHp}
          </span>
        </div>

        {/* EXP bar */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] text-slate-500 shrink-0 w-4">XP</span>
          <div className="flex-1 h-0.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${xpPct * 100}%`, backgroundColor: '#818cf8' }}
            />
          </div>
        </div>

        {/* types */}
        <div className="flex gap-1 flex-wrap">
          {pokemon.types.map((type) => {
            const b = TYPE_BADGE[type];
            return (
              <span
                key={type}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: b.bg, border: `1px solid ${b.border}`, color: b.color }}
              >
                {locale === 'he' ? b.he : b.en}
              </span>
            );
          })}
        </div>
      </div>

      {/* selected glow overlay */}
      {isSelected && !isFainted && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 80% 50%, ${primaryBadge.color}12, transparent 70%)` }}
        />
      )}
    </div>
  );
}
