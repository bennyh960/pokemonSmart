import { useState } from 'react';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { useInputLayer } from '../../../engine/input';
import { Modal } from '../../../ui-react/componenets/Modal';

const DIALOG_KEYS = [
  { code: 'Escape', action: 'cancel' },
  { code: 'Enter', action: 'confirm' },
  { code: 'ArrowLeft', action: 'less' },
  { code: 'ArrowRight', action: 'more' },
  { code: 'ArrowDown', action: 'less' },
  { code: 'ArrowUp', action: 'more' },
] as const;

const btn = 'min-h-11 flex-1 cursor-pointer rounded-xl border px-4 text-[15px] font-bold hover:brightness-110';

/** "It will learn this move by itself at Lv. N — keep the TM?" Keeping is the default (Enter / Esc). */
export function TMQuestionDialog({ text, onKeep, onTeach }: { text: string; onKeep: () => void; onTeach: () => void }) {
  const { t } = useI18n();
  useInputLayer({
    id: 'bag-tm-question',
    name: 'Bag TM question',
    blocksLowerLayers: true,
    keyBindings: DIALOG_KEYS,
    onAction: (a) => (a === 'cancel' || a === 'confirm' ? onKeep() : undefined),
  });
  return (
    <Modal onClose={onKeep}>
      <p className="m-0 mb-4 text-base leading-relaxed">{text}</p>
      <div className="flex gap-2">
        <button type="button" autoFocus onClick={onKeep} className={`${btn} border-[#2a9a6a] bg-[#1a7a55] text-white`}>
          {t('bag.tm.keep')}
        </button>
        <button type="button" onClick={onTeach} className={`${btn} border-[#2a5a3a] bg-[#0b1b13] text-[#cfe6d7]`}>
          {t('bag.tm.teachAnyway')}
        </button>
      </div>
    </Modal>
  );
}

/** How many to throw away (arrows change it), then confirm. */
export function TossDialog({
  itemName,
  max,
  onCancel,
  onToss,
}: {
  itemName: string;
  max: number;
  onCancel: () => void;
  onToss: (n: number) => void;
}) {
  const { t } = useI18n();
  const [n, setN] = useState(1);
  const clamp = (v: number) => Math.max(1, Math.min(max, v));
  useInputLayer({
    id: 'bag-toss-dialog',
    name: 'Bag toss dialog',
    blocksLowerLayers: true,
    keyBindings: DIALOG_KEYS,
    onAction: (a) => {
      if (a === 'cancel') return onCancel();
      if (a === 'confirm') return onToss(n);
      setN((v) => clamp(v + (a === 'more' ? 1 : -1)));
    },
  });
  return (
    <Modal onClose={onCancel}>
      <h2 className="m-0 mb-3 text-lg font-bold">{t('bag.toss.title', { itemName })}</h2>
      {max > 1 && (
        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="−"
            onClick={() => setN((v) => clamp(v - 1))}
            className="h-11 w-11 cursor-pointer rounded-xl border border-[#2a5a3a] bg-[#0b1b13] text-xl"
          >
            −
          </button>
          <span dir="ltr" className="min-w-12 text-center font-mono text-2xl">
            {n}
          </span>
          <button
            type="button"
            aria-label="+"
            onClick={() => setN((v) => clamp(v + 1))}
            className="h-11 w-11 cursor-pointer rounded-xl border border-[#2a5a3a] bg-[#0b1b13] text-xl"
          >
            +
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={`${btn} border-[#2a5a3a] bg-[#0b1b13] text-[#cfe6d7]`}>
          {t('bag.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onToss(n)}
          className={`${btn} border-[#8a3a3a] bg-[#5a1f1f] text-[#ffd0c8]`}
        >
          {t('bag.toss.confirm', { count: n })}
        </button>
      </div>
    </Modal>
  );
}
