interface ScanRingProps {
  spriteSrc: string | null;
  alt: string;
}

/** Rotating HUD rings around the large detail sprite — the signature Pokédex "scanning" motif. */
export function ScanRing({ spriteSrc, alt }: ScanRingProps) {
  return (
    <div className="relative h-40 w-40 shrink-0 sm:h-44 sm:w-44">
      <style>{`
        @keyframes pokedex-spin { to { transform: rotate(360deg); } }
        @keyframes pokedex-spin-reverse { to { transform: rotate(-360deg); } }
      `}</style>
      <div className="absolute inset-0 rounded-full border border-red-500/30" />
      <div
        className="absolute inset-3 rounded-full border border-dashed border-red-500/40"
        style={{ animation: 'pokedex-spin 14s linear infinite' }}
      />
      <div
        className="absolute inset-6 rounded-full border border-amber-400/30"
        style={{ animation: 'pokedex-spin-reverse 20s linear infinite' }}
      />
      {spriteSrc && (
        <img
          src={spriteSrc}
          alt={alt}
          className="absolute inset-0 m-auto h-28 w-28 [image-rendering:pixelated] drop-shadow-[0_10px_16px_rgba(0,0,0,0.6)] sm:h-32 sm:w-32"
        />
      )}
    </div>
  );
}
