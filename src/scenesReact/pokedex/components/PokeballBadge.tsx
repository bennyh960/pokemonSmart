import React from 'react';

interface PokeballBadgeProps {
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  size?: number;
}

/** Small red/white pokeball marker shown on caught cards. Doubles as a toggle button. */
export function PokeballBadge({ onClick, title = 'Caught', size = 22 }: PokeballBadgeProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded-full border-2 border-black shadow-[0_0_10px_rgba(239,68,68,0.6)] transition hover:scale-110"
      style={{
        width: size,
        height: size,
        background:
          'linear-gradient(180deg, #ef4444 0%, #ef4444 49%, #0a0a0a 49%, #0a0a0a 51%, #f4f4f5 51%, #f4f4f5 100%)',
      }}
    >
      <span
        className="block rounded-full border border-zinc-300 bg-zinc-900"
        style={{ width: size * 0.28, height: size * 0.28 }}
      />
    </button>
  );
}
