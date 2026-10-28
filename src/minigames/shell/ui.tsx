/** Small shared pieces of the mini-game shell UI. */

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import useGetPokemonSprite from '../../ui-react/hooks/useGetPokemonSprite.js';
import type { MiniGameTheme, PrizeRarity } from '../types.js';
import { miniGameSfx } from './sfx.js';

export function themeBackground(theme: MiniGameTheme): CSSProperties {
  return {
    background: `radial-gradient(circle at 20% 10%, rgba(255,255,255,0.28), transparent 45%),
      radial-gradient(circle at 85% 90%, rgba(255,255,255,0.18), transparent 40%),
      linear-gradient(135deg, ${theme.from}, ${theme.to})`,
  };
}

interface MgButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'soft' | 'dark';
  theme: MiniGameTheme;
  selected?: boolean;
  disabled?: boolean;
  glow?: boolean;
  className?: string;
  ariaLabel?: string;
  onHover?: () => void;
}

/**
 * Chunky 48px+ button. Never takes focus on click (keyboard goes through the input layers),
 * so Enter/Space can't double-fire.
 */
export function MgButton({
  children,
  onClick,
  variant = 'soft',
  theme,
  selected,
  disabled,
  glow,
  className = '',
  ariaLabel,
  onHover,
}: MgButtonProps) {
  const style: CSSProperties =
    variant === 'primary'
      ? { background: theme.accent, color: theme.accentText }
      : variant === 'dark'
        ? { background: 'rgba(15,23,42,0.45)', color: '#fff' }
        : { background: 'rgba(255,255,255,0.22)', color: '#fff' };
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={() => {
        miniGameSfx.tap();
        onClick();
      }}
      className={`mg-btn ${selected ? 'mg-selected' : ''} ${glow && !disabled ? 'mg-glow' : ''} ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

export function StarRow({
  stars,
  size = 'text-xl',
  dim = 'opacity-25',
}: {
  stars: number;
  size?: string;
  dim?: string;
}) {
  return (
    <span className={`inline-flex gap-0.5 ${size}`} aria-label={`${stars}/3`} dir="ltr">
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < stars ? 'text-yellow-300 drop-shadow' : `text-white ${dim}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export function PokemonSprite({ id, className = '', alt = '' }: { id: number; className?: string; alt?: string }) {
  const { sprite } = useGetPokemonSprite(id);
  if (!sprite) return <div className={className} />;
  return <img src={sprite} alt={alt} draggable={false} className={className} style={{ imageRendering: 'pixelated' }} />;
}

const CONFETTI_COLORS = ['#facc15', '#f472b6', '#60a5fa', '#34d399', '#f97316', '#a78bfa', '#ffffff'];

/** One confetti burst. Remount (change `key`) to burst again. */
export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        style: {
          '--mg-dx': `${(Math.random() - 0.5) * 240}px`,
          '--mg-rot': `${(Math.random() - 0.5) * 1440}deg`,
          '--mg-dur': `${1.4 + Math.random() * 1.2}s`,
          '--mg-delay': `${Math.random() * 0.25}s`,
        } as CSSProperties,
        round: i % 3 === 0,
      })),
    [pieces],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="mg-confetti-piece"
          style={{ ...p.style, left: `${p.left}%`, background: p.color, borderRadius: p.round ? '50%' : undefined }}
        />
      ))}
    </div>
  );
}

/** Card colours per prize rarity. */
export const RARITY_STYLE: Record<PrizeRarity, { bg: string; border: string; text: string; glow: string }> = {
  common: {
    bg: 'linear-gradient(160deg,#f8fafc,#cbd5e1)',
    border: '#94a3b8',
    text: '#334155',
    glow: 'rgba(148,163,184,0.7)',
  },
  good: {
    bg: 'linear-gradient(160deg,#dbeafe,#60a5fa)',
    border: '#2563eb',
    text: '#1e3a8a',
    glow: 'rgba(59,130,246,0.8)',
  },
  rare: {
    bg: 'linear-gradient(160deg,#f3e8ff,#a855f7)',
    border: '#7e22ce',
    text: '#3b0764',
    glow: 'rgba(168,85,247,0.85)',
  },
  epic: {
    bg: 'linear-gradient(160deg,#fef9c3,#facc15 55%,#f59e0b)',
    border: '#b45309',
    text: '#451a03',
    glow: 'rgba(250,204,21,0.95)',
  },
};
