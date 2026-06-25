import { useEffect, useState } from 'react';
import type { Pokemon } from '../../types/index.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { getCachedImage, loadImage } from '../../engine/sprite-loader.js';
import { TYPE_BADGE } from '../../data/type-constants.js';
import { STATUS_LABEL, hpColor } from './utils.js';
import { getPokemonDisplayName } from '../../services/pokemon-data.js';

export interface CardProps {
  pokemon: Pokemon;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  dragHandlers: any;
  onClick: () => void;
}

// ─── Glow CSS vars derived from the primary type colour ───────────────────────
function glowStyle(hex: string): React.CSSProperties {
  return {
    '--glow': hex,
    '--glow-dim': hex + '60',
    '--glow-inner': hex + '22',
    '--glow-blob': hex + '55',
  } as React.CSSProperties;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PokemonCard({ pokemon, index, isSelected, isDragging, dragHandlers, onClick }: CardProps) {
  const { locale } = useI18n();
  const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
  const [sprite, setSprite] = useState<string | null>(getCachedImage(spriteUrl)?.src ?? null);

  useEffect(() => {
    let dead = false;
    loadImage(spriteUrl)
      .then((img) => {
        if (!dead) setSprite(img.src);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [pokemon.id, spriteUrl]);

  const isFainted = pokemon.hp === 0;
  const hpPct = Math.max(0, pokemon.hp / pokemon.maxHp);
  const xpPct = Math.min(1, pokemon.xp / pokemon.xpToNext);
  const primaryType = TYPE_BADGE[pokemon.types[0]];

  // TODO: wire up real gender from the pokemon object when available
  const isMale = true;

  return (
    <div
      draggable
      onDragStart={() => dragHandlers.onDragStart(index)}
      onDragOver={(e) => dragHandlers.onDragOver(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      onClick={onClick}
      className={[
        'relative flex flex-col rounded-[10px] cursor-pointer select-none',
        'bg-[#12141f] border-2 overflow-hidden',
        'px-[12px] pt-[10px] pb-[8px]',
        'w-full',
        isFainted ? 'grayscale opacity-60 border-[#2a2d42]' : 'border-[#2a2d42]',
        isDragging ? 'opacity-50 scale-95' : '',
        isSelected && !isFainted ? 'border-[var(--glow)]' : '',
      ].join(' ')}
      style={{
        // direction: 'ltr',
        ...(isSelected && !isFainted ? glowStyle(primaryType.color) : {}),
        ...(isSelected && !isFainted
          ? {
              boxShadow: '0 0 0 1px var(--glow-dim), inset 0 0 28px var(--glow-inner)',
            }
          : {}),
      }}
    >
      {/* Radial wash anchored to the left (sprite side) */}
      {isSelected && !isFainted && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[8px]"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 28% 50%, var(--glow-inner) 0%, transparent 70%)',
          }}
        />
      )}

      {/* ── Top meta row ── */}
      <div className="flex flex-row items-center justify-between mb-[6px] relative z-10">
        <span className="font-mono text-[9px] text-[#4a4f6e]">#{String(pokemon.id).padStart(3, '0')}</span>
        <span className="font-mono text-[9px] text-[#7880a8]">Lv. {pokemon.level}</span>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-row items-center gap-[8px] relative z-10">
        {/* Sprite — always left */}
        <div className="w-[90px] h-[90px] shrink-0 flex items-center justify-center relative">
          {isSelected && !isFainted && (
            <div
              className="absolute w-[80px] h-[80px] rounded-full z-0"
              style={{ background: 'var(--glow-blob)', filter: 'blur(18px)' }}
            />
          )}
          {sprite ? (
            <img
              src={sprite}
              alt={pokemon.name}
              className="w-[90px] h-[90px] object-contain relative z-10"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-[64px] h-[64px] bg-[#1a1d2e] animate-pulse" />
          )}
        </div>

        {/* Info panel — always right */}
        <div className="flex-1 flex flex-col gap-[5px] min-w-0">
          {/* Name + gender */}
          <div className="flex flex-row items-center gap-[5px]">
            <h3 className="font-mono text-[13px] text-[#e8eaf6] whitespace-nowrap overflow-hidden text-ellipsis">
              {getPokemonDisplayName(pokemon.id)}
            </h3>
            <span className={`font-mono text-[11px] ${isMale ? 'text-blue-400' : 'text-pink-400'}`}>
              {isMale ? '♂' : '♀'}
            </span>
          </div>

          {/* Types — own line */}
          <div className="flex flex-row items-center gap-[4px] flex-wrap">
            {pokemon.types.map((t) => {
              const b = TYPE_BADGE[t];
              return (
                <span
                  key={t}
                  className="font-mono text-[9px] px-[6px] py-[2px] rounded-[3px] text-white uppercase tracking-[0.3px]"
                  style={{ backgroundColor: b.bg, border: `1px solid ${b.border}`, color: b.color }}
                >
                  {b[locale]}
                </span>
              );
            })}
          </div>

          {/* HP bar */}
          <div className="flex flex-col gap-[3px]">
            <div className="flex flex-row items-center gap-[5px]">
              <span className="font-mono text-[9px] text-[#546478] shrink-0">HP</span>
              <div className="flex-1 h-[6px] bg-[#0c0e18] rounded-[3px] overflow-hidden border border-[#1e2130]">
                <div
                  className="h-full rounded-[3px] transition-all"
                  style={{
                    width: `${hpPct * 100}%`,
                    backgroundColor: hpColor(pokemon.hp, pokemon.maxHp),
                    marginLeft: 0,
                  }}
                />
              </div>
            </div>
            <span className="font-mono text-[10px] text-[#c8d0f0]" style={{ textAlign: 'right' }}>
              {pokemon.hp} / {pokemon.maxHp}
            </span>
          </div>

          {/* Status tags — solid filled, same style as type badges */}
          {pokemon.status && (
            <div className="flex flex-row items-center gap-[4px] flex-wrap">
              <span
                className="font-mono text-[9px] px-[6px] py-[2px] rounded-[3px] text-white uppercase tracking-[0.5px]"
                style={{
                  backgroundColor: STATUS_LABEL[pokemon.status].color,
                }}
              >
                {STATUS_LABEL[pokemon.status][locale]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── EXP bar — always fills left→right ── */}
      <div className="w-full h-[3px] bg-[#0c0e18] rounded-[2px] overflow-hidden mt-[8px] relative z-10">
        <div className="h-full bg-[#3d6bce] rounded-[2px]" style={{ width: `${xpPct * 100}%` }} />
      </div>
    </div>
  );
}
