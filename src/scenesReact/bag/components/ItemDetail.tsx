import { useI18n } from '../../../ui-react/context/i18n-context';
import { usePlayerData } from '../../../ui-react/hooks/usePlayerData';
import type { ItemEntry } from '../../items/item-list';
import { ActionButton, ItemInfo, QtyStepper } from '../../items/ItemInfo';
import { canToss, isStoryKeyItem, primaryAction, sellPrice } from '../bag-helpers';
import type { BagMode } from '../bag-mode';

const ACTION_LABEL = {
  use: 'bag.action.use',
  teach: 'bag.action.teach',
  give: 'bag.action.give',
  pick: 'bag.action.use',
  sell: 'bag.action.sell',
} as const;

/** The bag's detail panel: the item, then what can be done with it here. */
export function ItemDetail({
  entry,
  mode,
  qty,
  onQty,
  onPrimary,
  onToss,
}: {
  entry: ItemEntry | null;
  mode: BagMode;
  /** Sell mode: how many to sell */
  qty: number;
  onQty: (n: number) => void;
  onPrimary: () => void;
  onToss: () => void;
}) {
  const { t, locale } = useI18n();
  const [pd] = usePlayerData();
  if (!entry) return <ItemInfo def={null} />;

  const { def } = entry;
  const action = primaryAction(def, mode);
  const storyKey = isStoryKeyItem(def);
  const used = storyKey && !!(def.usedFlag && pd.flags[def.usedFlag]);

  return (
    <ItemInfo
      def={def}
      badge={storyKey ? undefined : `×${entry.qty}`}
      note={used && <span className="ms-2 text-[#44cc88]">{t('bag.used')}</span>}
      description={used && def.usedDescription ? def.usedDescription[locale] : undefined}
    >
      {mode === 'sell-item' && <QtyStepper value={qty} max={entry.qty} onChange={onQty} />}

      {action.kind === 'none' ? (
        <p className="m-0 rounded-xl border border-[#1f4a33] bg-[#0b1b13] px-3 py-2.5 text-sm text-[#8fb19c]">
          {t(action.reasonKey)}
        </p>
      ) : (
        <ActionButton
          keyHint="Enter"
          onClick={onPrimary}
          label={
            action.kind === 'sell'
              ? t('bag.action.sellFor', { count: qty, price: (sellPrice(def) * qty).toLocaleString('en-US') })
              : t(ACTION_LABEL[action.kind])
          }
        />
      )}

      {canToss(def, mode) && <ActionButton tone="danger" keyHint="Del" label={t('bag.action.toss')} onClick={onToss} />}
    </ItemInfo>
  );
}
