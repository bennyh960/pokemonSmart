import React, { useEffect, useRef, useState } from 'react';

/* ============================================================================
   FLOATING TEXT NOTIFICATIONS
   Single responsibility: spawn short-lived text at a point on screen that
   drifts in one direction and fades. No frame, no dismiss button — same
   idea as "+1 Potion" combat text in any JRPG.

   No Context/Provider. Mirrors the existing singleton + counter pattern
   (see usePlayerData): a module-level queue, a tiny pub-sub, and a single
   <FloatingTextLayer /> mounted once near the app root.
============================================================================ */

export type FloatType = 'info' | 'success' | 'warning' | 'danger' | 'levelUp';
export type FloatDirection = 'up' | 'down' | 'left' | 'right';

const floatTokens: Record<FloatType, { color: string; glow: string }> = {
  info: { color: '#5ec8f8', glow: 'rgba(94,200,248,0.55)' },
  success: { color: '#6ee7a0', glow: 'rgba(110,231,160,0.55)' },
  warning: { color: '#f8d568', glow: 'rgba(248,213,104,0.55)' },
  danger: { color: '#f87171', glow: 'rgba(248,113,113,0.55)' },
  levelUp: { color: '#ffd24a', glow: 'rgba(255,210,74,0.65)' },
};

const DIRECTION_VECTOR: Record<FloatDirection, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/* ----------------------------------------------------------------------
   Anchor resolution.

   Three ways to call spawnFloatingText:
   1. anchor: { x, y }        — mouse click, e.g. onClick={(e) => spawn({ anchor: { x: e.clientX, y: e.clientY } })}
   2. anchor: someElement     — pass e.currentTarget directly, no math needed
   3. anchor: null            — KEYBOARD CASE. Resolves to document.activeElement's
                                 center. Since the existing zone-aware keyboard nav
                                 already keeps document.activeElement correct for
                                 whatever's focused (item slot, party card, move
                                 row...), this falls out for free: a day-care/TM/
                                 level-up action triggered by Enter/Space on a
                                 focused element floats from that element with no
                                 extra wiring at the call site.
---------------------------------------------------------------------- */

export type FloatAnchor = { x: number; y: number } | HTMLElement | null;

function resolveAnchorPoint(anchor: FloatAnchor): { x: number; y: number } {
  if (anchor && 'x' in anchor && 'y' in anchor) {
    return { x: anchor.x, y: anchor.y };
  }

  const el = anchor instanceof HTMLElement ? anchor : (document.activeElement as HTMLElement | null);

  if (el && el !== document.body && typeof el.getBoundingClientRect === 'function') {
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // Last-resort fallback: nothing focused, no point given.
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

/* ----------------------------------------------------------------------
   Queue + pub-sub (module singleton, same shape as the player-data pattern)
---------------------------------------------------------------------- */

export interface FloatingTextOptions {
  text: string;
  type?: FloatType;
  anchor: FloatAnchor;
  direction?: FloatDirection;
  distance?: number; // px the text travels before fully faded
  duration?: number; // ms
  style?: React.CSSProperties; // optional inline styles for custom styling
}

interface QueuedFloat extends Required<Omit<FloatingTextOptions, 'anchor'>> {
  id: number;
  origin: { x: number; y: number };
}

let nextId = 1;
let queue: QueuedFloat[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function spawnFloatingText(opts: FloatingTextOptions): void {
  const origin = resolveAnchorPoint(opts.anchor);
  const item: QueuedFloat = {
    id: nextId++,
    origin,
    text: opts.text,
    type: opts.type ?? 'info',
    direction: opts.direction ?? 'up',
    distance: opts.distance ?? 48,
    duration: opts.duration ?? 1000,
    style: opts.style ?? {},
  };
  queue = [...queue, item];
  emit();
}

function removeFloat(id: number) {
  queue = queue.filter((f) => f.id !== id);
  emit();
}

/* ----------------------------------------------------------------------
   Layer — mount ONCE near the app root, like #ui-overlay / #popup-host.
---------------------------------------------------------------------- */

export const FloatingTextLayer: React.FC = () => {
  const [items, setItems] = useState<QueuedFloat[]>(queue);

  useEffect(() => {
    const sync = () => setItems(queue);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {items.map((f) => (
        <FloatingTextItem key={f.id} item={f} onDone={() => removeFloat(f.id)} />
      ))}
    </div>
  );
};

const FloatingTextItem: React.FC<{ item: QueuedFloat; onDone: () => void }> = ({ item, onDone }) => {
  const [risen, setRisen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const popTimeout = setTimeout(() => setRisen(true), 180); // <-- was requestAnimationFrame, now delayed
    timeoutRef.current = setTimeout(onDone, item.duration + 180); // push total lifetime out by the same delay
    return () => {
      clearTimeout(popTimeout);
      timeoutRef.current && clearTimeout(timeoutRef.current);
    };
  }, []);

  const vec = DIRECTION_VECTOR[item.direction];
  const tokens = floatTokens[item.type];

  return (
    <span
      className="absolute select-none whitespace-nowrap font-bold uppercase tracking-wide transition-all ease-out"
      style={{
        left: item.origin.x,
        top: item.origin.y,
        transform: risen
          ? `translate(-50%, -100%) translate(${vec.x * item.distance}px, ${vec.y * item.distance}px) scale(1)`
          : 'translate(-50%, -100%) scale(0.6)',
        // first translate(-50%,-100%) centers the text above the origin point;
        // second translate (in real px) applies the direction vector on top of that
        opacity: risen ? 0 : 1,
        transitionDuration: `${item.duration}ms`,
        fontFamily: "'Press Start 2P', ui-monospace, monospace",
        fontSize: 14,
        color: tokens.color,
        textShadow: `0 0 6px ${tokens.glow}, 2px 2px 0 rgba(0,0,0,0.85)`,

        ...item.style,
      }}
    >
      {item.text}
    </span>
  );
};
