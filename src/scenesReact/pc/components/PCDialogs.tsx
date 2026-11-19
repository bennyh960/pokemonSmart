import { useEffect, useRef } from 'react';
import type { Pokemon } from '../../../types/index.js';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { useInputLayer, getInput } from '../../../engine/input';
import { getPokemonDisplayName } from '../../../services/pokemon-data.js';
import { PCSprite } from './PCSprite';
import { Modal } from '../../../ui-react/componenets/Modal';

const HOLD_MS = 900;
const CLOSE_KEYS = [{ code: 'Escape', action: 'close' }] as const;
const HELP_KEYS = [
  { code: 'Escape', action: 'close' },
  { code: 'Enter', action: 'close' },
] as const;

/**
 * Release needs a 0.9 s hold (mouse, touch, or holding Enter / Space) so a child can't
 * release by a stray click. "Keep it" is the default; Esc keeps too.
 */
export function ReleaseDialog({
  pokemon,
  onKeep,
  onRelease,
}: {
  pokemon: Pokemon;
  onKeep: () => void;
  onRelease: () => void;
}) {
  const { t } = useI18n();
  const barRef = useRef<HTMLSpanElement>(null);
  const pointerHeld = useRef(false);
  const doneRef = useRef(false);
  // Read through a ref: a new callback each render must not restart the hold
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  useInputLayer({
    id: 'pc-release-dialog',
    name: 'PC release dialog',
    blocksLowerLayers: true,
    keyBindings: CLOSE_KEYS,
    onAction: () => onKeep(),
  });

  // One loop drives the bar from either the pointer or a held Enter / Space key
  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const tick = (now: number) => {
      const input = getInput();
      const held = pointerHeld.current || input.isKeyDown('Enter') || input.isKeyDown('Space');
      if (held) {
        start ??= now;
        const k = Math.min(1, (now - start) / HOLD_MS);
        if (barRef.current) barRef.current.style.width = `${k * 100}%`;
        if (k >= 1 && !doneRef.current) {
          doneRef.current = true;
          onReleaseRef.current();
          return;
        }
      } else if (start !== null) {
        start = null;
        if (barRef.current) barRef.current.style.width = '0%';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const name = getPokemonDisplayName(pokemon.id);
  return (
    <Modal onClose={onKeep}>
      <div className="mb-2 grid place-items-center">
        <PCSprite id={pokemon.id} className="h-32 w-32 drop-shadow-[0_6px_0_rgba(0,0,0,.35)]" />
      </div>
      <h3 className="m-0 mb-1.5 text-lg font-bold">{t('pc.releaseTitle', { name })}</h3>
      <p className="m-0 mb-4 text-sm leading-relaxed text-[#8fb19c]">{t('pc.releaseText')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          autoFocus
          onClick={onKeep}
          className="flex-1 cursor-pointer rounded-xl border-2 border-[#f8d030] px-3 py-2.5 text-sm font-bold"
        >
          {t('pc.keep')}
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            pointerHeld.current = true;
          }}
          onPointerUp={() => (pointerHeld.current = false)}
          onPointerLeave={() => (pointerHeld.current = false)}
          onPointerCancel={() => (pointerHeld.current = false)}
          onContextMenu={(e) => e.preventDefault()}
          className="relative flex-1 cursor-pointer touch-none overflow-hidden rounded-xl border border-[#ef5b5b]/50 px-3 py-2.5 text-sm font-bold text-[#ef5b5b] select-none"
        >
          <span ref={barRef} className="absolute inset-y-0 start-0 w-0 bg-[#ef5b5b]/30" />
          <span className="relative">🍃 {t('pc.hold')}</span>
        </button>
      </div>
    </Modal>
  );
}

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  useInputLayer({
    id: 'pc-help-dialog',
    name: 'PC help dialog',
    blocksLowerLayers: true,
    keyBindings: HELP_KEYS,
    onAction: () => onClose(),
  });

  const rows = [
    { icon: '📦', bg: 'bg-[#5b8cff]', title: 'pc.help1', text: 'pc.help1Text' },
    { icon: '＋', bg: 'bg-[#20d860]', title: 'pc.help2', text: 'pc.help2Text' },
    { icon: '🍃', bg: 'bg-[#ef5b5b]/25', title: 'pc.help3', text: 'pc.help3Text' },
    { icon: '⌕', bg: 'bg-[#132c20]', title: 'pc.help4', text: 'pc.help4Text' },
  ];
  const keys: [string, string][] = [
    ['← ↑ → ↓', 'pc.key.move'],
    ['Tab', 'pc.key.zone'],
    ['Q / E', 'pc.key.box'],
    ['Enter', 'pc.key.act'],
    ['R', 'pc.key.release'],
    ['F', 'pc.key.search'],
  ];

  return (
    <Modal onClose={onClose}>
      <h3 className="m-0 mb-1.5 text-lg font-bold">{t('pc.helpTitle')}</h3>
      <p className="m-0 mb-4 text-sm leading-relaxed text-[#8fb19c]">{t('pc.helpIntro')}</p>
      <ul className="m-0 mb-4 grid list-none gap-3 p-0">
        {rows.map((r) => (
          <li key={r.title} className="grid grid-cols-[38px_1fr] items-start gap-2.5">
            <span className={`grid h-[38px] w-[38px] place-items-center rounded-xl text-lg ${r.bg}`}>{r.icon}</span>
            <span>
              <b className="mb-0.5 block">{t(r.title)}</b>
              <span className="text-[13px] leading-relaxed text-[#8fb19c]">{t(r.text)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mb-4 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 rounded-xl bg-[#0b1b13] p-2.5 text-[13px] text-[#8fb19c]">
        {keys.map(([k, label]) => (
          <span key={k} className="contents">
            <kbd
              className="rounded border border-[#1f4a33] bg-[#0a1912] px-1.5 text-center font-mono text-[10px]"
              dir="ltr"
            >
              {k}
            </kbd>
            <span>{t(label)}</span>
          </span>
        ))}
      </div>
      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="w-full cursor-pointer rounded-xl bg-[#20d860] px-3 py-2.5 text-sm font-bold text-[#04150b] hover:brightness-110"
      >
        {t('pc.gotIt')}
      </button>
    </Modal>
  );
}

export function PCToast({ text, error, onUndo }: { text: string; error: boolean; onUndo?: () => void }) {
  const { t } = useI18n();
  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3.5 rounded-xl border bg-[#0b1b13] py-2.5 ps-4 pe-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,.5)] ${
        error ? 'border-[#ef5b5b]' : 'border-[#20d860]'
      }`}
    >
      <span>{text}</span>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="cursor-pointer rounded-lg border border-[#1f4a33] bg-[#132c20] px-2.5 py-1 font-bold text-[#f8d030]"
        >
          ↶ {t('pc.undo')}
        </button>
      )}
    </div>
  );
}
