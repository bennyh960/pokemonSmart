// src/scenesReact/shop/ShopScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { useInputLayer } from '../../engine/input';
import { getGlobalAudio } from '../../audio/audio-manager.js';
import { getLocalizedName } from '../../services/pokemon-data.js';
import type { RankConfig } from '../../data/trainer-ranks.js';
import { buyItem, discountedPrice, maxAffordable, shopStock, type ShopConfig } from '../../systems/shop.js';
import type { ItemEntry, ItemFilter, ItemSort } from '../items/item-list';
import { BROWSE_KEYS, useItemBrowser, useToast } from '../items/useItemBrowser';
import { ItemsFrame } from '../items/ItemsFrame';
import { ItemGrid } from '../items/ItemGrid';
import { ActionButton, ItemInfo, QtyStepper } from '../items/ItemInfo';
import { DiscountDialog } from './components/DiscountDialog';

interface ShopEntry extends ItemEntry {
  lockedBy: RankConfig | null;
}

const KEYS = [
  ...BROWSE_KEYS,
  { code: 'Enter', action: 'buy' },
  { code: 'Space', action: 'discount' },
  { code: 'Equal', action: 'more' },
  { code: 'NumpadAdd', action: 'more' },
  { code: 'Minus', action: 'less' },
  { code: 'NumpadSubtract', action: 'less' },
] as const;

const SORTS: ItemSort[] = ['default', 'name', 'price'];
const fmt = (n: number) => n.toLocaleString('en-US');

const SHOP_ICON = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#20d860"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 10h16v10H4z" />
    <path d="M3 10 5 4h14l2 6" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

/** Poké Mart: browse what this shopkeeper sells, pick an amount, buy — or take the discount challenge. */
export function ShopScreen({
  config,
  discount,
  onClose,
}: {
  config: ShopConfig;
  discount: number;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [pd, , version] = usePlayerData();

  const all: ShopEntry[] = useMemo(
    () => shopStock(pd, config).map(({ def, lockedBy }) => ({ id: def.id, def, qty: pd.items[def.id] ?? 0, lockedBy })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, config],
  );
  const initial: ItemFilter = { pocket: 'all', category: null, query: '', sort: 'default' };
  const b = useItemBrowser(all, initial);
  const { entry } = b;

  const [toast, say, hideToast] = useToast();
  const [qty, setQty] = useState(1);
  const [challenge, setChallenge] = useState(false);
  useEffect(() => setQty(1), [entry?.id]);

  const max = entry && !entry.lockedBy ? maxAffordable(entry.def, pd.money) : 0;
  const count = Math.max(1, Math.min(qty, max || 1));
  const total = entry ? entry.def.price * count : 0;
  const canBuy = !!entry && !entry.lockedBy && max > 0;

  function buy(price: number, text: string) {
    if (!entry) return;
    if (buyItem(entry.id, count, price)) {
      getGlobalAudio()?.playSFX('heal');
      say(text);
    } else say(t('shop.cantAfford'));
    setQty(1);
  }
  const bought = () => t('shop.bought', { item: getLocalizedName(entry!.def.name), quantity: count });
  const buyFull = () => canBuy && buy(total, bought());
  const openChallenge = () => canBuy && discount > 0 && setChallenge(true);

  useInputLayer({
    id: 'shop-screen',
    name: 'Shop',
    blocksLowerLayers: true,
    keyBindings: KEYS,
    active: !b.searchFocused && !challenge,
    onAction: (action) => {
      if (b.handleKey(action, onClose)) return;
      if (action === 'buy') buyFull();
      else if (action === 'discount') openChallenge();
      else if (action === 'more') setQty(Math.min(max, count + 1));
      else if (action === 'less') setQty(Math.max(1, count - 1));
    },
  });

  const keyHints: [string, string][] = [
    ['Enter', 'shop.buy'],
    ['+ −', 'shop.key.qty'],
    ...(discount > 0 ? ([['Space', 'shop.key.discount']] as [string, string][]) : []),
  ];

  return (
    <ItemsFrame
      title={t('shop.title')}
      icon={SHOP_ICON}
      browser={b}
      sorts={SORTS}
      money={pd.money}
      hideEmptyPockets
      emptyText={t('shop.empty')}
      keyHints={keyHints}
      toast={toast}
      onToastClick={hideToast}
      onClose={onClose}
      list={
        <ItemGrid
          entries={b.list}
          selectedId={entry?.id ?? null}
          onPick={b.setSelected}
          onActivate={buyFull}
          dimmed={(e) => !!e.lockedBy}
          subtitle={(e) =>
            e.lockedBy ? (
              <span className="text-[#f8d870]">{t('shop.locked', { rank: e.lockedBy.label[locale] })}</span>
            ) : (
              t('shop.owned', { count: e.qty })
            )
          }
          trailing={(e) => (
            <span
              dir="ltr"
              className={`shrink-0 font-mono text-sm ${e.lockedBy ? 'text-[#8fb19c]' : e.def.price > pd.money ? 'text-[#ff9a8a]' : 'text-[#f8d030]'}`}
            >
              ₽{fmt(e.def.price)}
            </span>
          )}
        />
      }
      detail={
        <ItemInfo def={entry?.def ?? null} badge={entry && `×${entry.qty}`}>
          {entry?.lockedBy ? (
            <p className="m-0 rounded-xl border border-[#5a4a1a] bg-[#0b1b13] px-3 py-2.5 text-sm text-[#f8d870]">
              {t('shop.locked', { rank: entry.lockedBy.label[locale] })}
            </p>
          ) : (
            entry && (
              <>
                {max > 0 && <QtyStepper value={count} max={max} onChange={setQty} />}
                <div className="flex items-baseline justify-between rounded-xl border border-[#1f4a33] bg-[#0b1b13] px-3 py-2">
                  <span className="text-sm text-[#8fb19c]">{t('shop.total')}</span>
                  <b dir="ltr" className={`font-mono text-lg ${canBuy ? 'text-[#f8d030]' : 'text-[#ff9a8a]'}`}>
                    ₽{fmt(total)}
                  </b>
                </div>
                {discount > 0 && canBuy && (
                  <ActionButton
                    tone="quiet"
                    keyHint="Space"
                    onClick={openChallenge}
                    label={<span className="text-[#f8d870]">{t('shop.discount.button', { percent: discount })}</span>}
                  />
                )}
                <ActionButton
                  keyHint="Enter"
                  disabled={!canBuy}
                  onClick={buyFull}
                  label={canBuy ? t('shop.buyFor', { count, price: fmt(total) }) : t('shop.cantAfford')}
                />
              </>
            )
          )}
        </ItemInfo>
      }
    >
      {challenge && entry && (
        <DiscountDialog
          itemName={getLocalizedName(entry.def.name)}
          count={count}
          total={total}
          percent={discount}
          answer={discountedPrice(total, discount)}
          onCancel={() => setChallenge(false)}
          onBuyFull={() => {
            setChallenge(false);
            buyFull();
          }}
          onRight={() => {
            setChallenge(false);
            const price = discountedPrice(total, discount);
            buy(price, t('shop.discount.right', { price: fmt(price), total: fmt(total) }));
          }}
        />
      )}
    </ItemsFrame>
  );
}
