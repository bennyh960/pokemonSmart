import { useState } from 'react';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { useInputLayer } from '../../../engine/input';
import { Modal } from '../../../ui-react/componenets/Modal';

const KEYS = [{ code: 'Escape', action: 'cancel' }] as const;
const btn = 'min-h-11 flex-1 cursor-pointer rounded-xl border px-4 text-[15px] font-bold hover:brightness-110';
const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The visit's discount challenge: work out the price after the discount.
 * Right → buy at the discount. Wrong → see the right price, then buy at full price or cancel.
 */
export function DiscountDialog({
  itemName,
  count,
  total,
  percent,
  answer,
  onRight,
  onBuyFull,
  onCancel,
}: {
  itemName: string;
  count: number;
  /** Full price */
  total: number;
  percent: number;
  /** The right answer */
  answer: number;
  onRight: () => void;
  onBuyFull: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  useInputLayer({
    id: 'shop-discount',
    name: 'Shop discount challenge',
    blocksLowerLayers: true,
    keyBindings: KEYS,
    onAction: () => onCancel(),
  });

  const check = () => {
    if (!value) return;
    if (Number(value) === answer) onRight();
    else setWrong(true);
  };

  return (
    <Modal onClose={onCancel}>
      <h2 className="m-0 mb-2 text-lg font-bold text-[#f8d030]">{t('shop.discount.title')}</h2>
      <p className="m-0 mb-4 text-base leading-relaxed">
        {t('shop.discount.question', { count, item: itemName, total: fmt(total), percent })}
      </p>
      {!wrong ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-[#2a8a60] bg-[#0b1b13] px-3">
            <span className="sr-only">{t('shop.discount.answer')}</span>
            <span dir="ltr" className="font-mono text-[#f8d030]">
              ₽
            </span>
            <input
              autoFocus
              dir="ltr"
              inputMode="numeric"
              value={value}
              maxLength={6}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                // The game's key handler swallows Enter, so the form never submits by itself
                if (e.key === 'Enter') {
                  e.preventDefault();
                  check();
                } else if (e.key === 'Escape') onCancel();
              }}
              className="min-w-0 flex-1 border-0 bg-transparent font-mono text-xl text-white outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!value}
            className={`${btn} flex-none border-[#2a9a6a] bg-[#1a7a55] text-white disabled:opacity-50`}
          >
            {t('shop.discount.check')}
          </button>
        </form>
      ) : (
        <>
          <p
            role="status"
            className="m-0 mb-4 rounded-xl border border-[#5a4a1a] bg-[#1c1a0c] px-3 py-2.5 text-[15px] text-[#f8d870]"
          >
            {t('shop.discount.wrong', { price: fmt(answer) })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={onBuyFull}
              className={`${btn} border-[#2a9a6a] bg-[#1a7a55] text-white`}
            >
              {t('shop.discount.buyFull', { total: fmt(total) })}
            </button>
            <button type="button" onClick={onCancel} className={`${btn} border-[#2a5a3a] bg-[#0b1b13] text-[#cfe6d7]`}>
              {t('bag.cancel')}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
