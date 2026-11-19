import type { ReactNode } from 'react';

/** Centered dialog over a dimmed backdrop; a click outside closes it. */
export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-[#020805]/75 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100%-2rem)] w-full max-w-[460px] overflow-auto rounded-2xl border-2 border-[#1f4a33] bg-[#0f2219] p-5 text-[#eaf5ee]"
      >
        {children}
      </div>
    </div>
  );
}
