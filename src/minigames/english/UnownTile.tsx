/** An Unown-style living letter: round badge, bold glyph, a blinking eye and a little tail. */

import type { CSSProperties, MouseEvent } from 'react';

export type TileState = 'idle' | 'wrong' | 'correct' | 'dim' | 'used' | 'hint';

const SIZES = { xs: '2.6rem', sm: '3rem', md: '3.8rem', lg: '4.6rem', xl: '7.5rem' } as const;
export type TileSize = keyof typeof SIZES;

/** A stable, bright hue per letter so each Unown has its own colour. */
export function letterHue(glyph: string): number {
  const code = glyph.toLowerCase().charCodeAt(0) - 97;
  return ((code < 0 ? 0 : code) * 47 + 250) % 360;
}

interface Props {
  glyph: string;
  size?: TileSize;
  state?: TileState;
  /** Entrance delay (stagger). */
  delay?: number;
  /** Bump to replay the shake on a repeated wrong tap. */
  shakeKey?: number;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
}

export function UnownTile({ glyph, size = 'lg', state = 'idle', delay = 0, shakeKey = 0, onClick, ariaLabel }: Props) {
  const style = {
    '--uw-size': SIZES[size],
    '--uw-hue': letterHue(glyph),
    '--uw-blink': `${(letterHue(glyph) % 7) * 0.6}s`,
  } as CSSProperties;
  const className = `mg-en-tile ${state === 'idle' ? '' : `is-${state}`}`;
  const face = (
    <>
      <span aria-hidden>{glyph}</span>
      <span className="mg-en-eye" aria-hidden />
    </>
  );
  return (
    <span className="mg-en-pop" style={{ '--uw-delay': `${delay}ms` } as CSSProperties}>
      {onClick ? (
        <button
          key={state === 'wrong' ? `w${shakeKey}` : 'i'}
          type="button"
          tabIndex={-1}
          aria-label={ariaLabel ?? glyph}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          className={className}
          style={style}
        >
          {face}
        </button>
      ) : (
        <span className={className} style={style} role="img" aria-label={ariaLabel ?? glyph}>
          {face}
        </span>
      )}
    </span>
  );
}
