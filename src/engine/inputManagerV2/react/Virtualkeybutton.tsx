import { useEffect, useRef } from 'react';
import { attachVirtualButton } from '../adapters/virtualButtonAdapter';

export interface VirtualKeyButtonProps {
  code: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Thin React wrapper around attachVirtualButton — all the actual
 * press/release/cleanup logic lives in one place (the adapter), shared
 * with the plain-DOM control pad in dom/VirtualControlPad.ts.
 */
export function VirtualKeyButton({ code, children, className }: VirtualKeyButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachVirtualButton(el, code);
  }, [code]);

  return (
    <button type="button" ref={ref} className={className}>
      {children}
    </button>
  );
}
