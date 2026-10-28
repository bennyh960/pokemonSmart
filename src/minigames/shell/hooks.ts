import { useEffect, useRef, useState } from 'react';
import { useInputLayer } from '../../engine/input/index.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';

/** True when the OS asks for reduced motion (skips confetti / shakes; CSS freezes the rest). */
export function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

const NAV_BINDINGS = [
  { code: 'ArrowLeft', action: 'left' },
  { code: 'ArrowRight', action: 'right' },
  { code: 'ArrowUp', action: 'up' },
  { code: 'ArrowDown', action: 'down' },
  { code: 'Enter', action: 'select' },
  { code: 'NumpadEnter', action: 'select' },
  { code: 'Space', action: 'select' },
  { code: 'Escape', action: 'back' },
  { code: 'Backspace', action: 'back' },
] as const;

export interface MenuNavOptions {
  /** Unique layer id. */
  id: string;
  count: number;
  active?: boolean;
  initial?: number;
  /** Which arrows move the selection. 'x' respects RTL (→ moves back in Hebrew). */
  axis?: 'x' | 'y' | 'both';
  onSelect: (index: number) => void;
  onBack?: () => void;
  /** Skip these indices when moving (e.g. disabled buttons). */
  isDisabled?: (index: number) => boolean;
  /** Controlled mode: the parent owns the index. */
  index?: number;
  onIndexChange?: (index: number) => void;
}

/**
 * Keyboard navigation for a row/column of shell buttons: arrows move, Enter/Space selects,
 * Escape/Backspace goes back. Blocks layers below while active (modal).
 */
export function useMenuNav(options: MenuNavOptions): [number, (i: number) => void] {
  const { isRTL } = useI18n();
  const opts = useRef(options);
  opts.current = options;
  const [ownIndex, setOwnIndex] = useState(options.initial ?? 0);
  const index = options.index ?? ownIndex;
  const setIndex = (i: number) => {
    if (opts.current.onIndexChange) opts.current.onIndexChange(i);
    else setOwnIndex(i);
  };
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (options.index === undefined && ownIndex >= options.count && options.count > 0) setOwnIndex(options.count - 1);
  }, [ownIndex, options.count, options.index]);

  function move(dir: 1 | -1) {
    const { count, isDisabled } = opts.current;
    if (count <= 0) return;
    let i = indexRef.current;
    for (let n = 0; n < count; n++) {
      i = (i + dir + count) % count;
      if (!isDisabled?.(i)) break;
    }
    indexRef.current = i;
    setIndex(i);
  }

  useInputLayer({
    id: options.id,
    name: options.id,
    keyBindings: NAV_BINDINGS,
    blocksLowerLayers: true,
    active: options.active ?? true,
    onAction: (action) => {
      const { axis = 'x', onSelect, onBack, isDisabled } = opts.current;
      const horizontal = axis !== 'y';
      const vertical = axis !== 'x';
      if (action === 'left' && horizontal) move(isRTL ? 1 : -1);
      else if (action === 'right' && horizontal) move(isRTL ? -1 : 1);
      else if (action === 'up' && vertical) move(-1);
      else if (action === 'down' && vertical) move(1);
      else if (action === 'select' && !isDisabled?.(indexRef.current)) onSelect(indexRef.current);
      else if (action === 'back') onBack?.();
    },
  });

  return [index, setIndex];
}

/** Runs `fn` after `ms`, cancelled on unmount or when deps change. */
export function useTimeout(fn: () => void, ms: number | null, deps: unknown[] = []): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (ms == null) return;
    const id = window.setTimeout(() => ref.current(), ms);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
