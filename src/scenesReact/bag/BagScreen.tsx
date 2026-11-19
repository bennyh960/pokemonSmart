// src/scenesReact/bag/BagScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { useInputLayer } from '../../engine/input';
import { getLocalizedName } from '../../services/pokemon-data.js';
import type { BagController } from './index';
import type { BagMode } from './bag-mode';
import { bagEntries, canToss, isStoryKeyItem, sellPrice } from './bag-helpers';
import type { ItemFilter, ItemSort } from '../items/item-list';
import { BROWSE_KEYS, useItemBrowser, useToast } from '../items/useItemBrowser';
import { ItemsFrame } from '../items/ItemsFrame';
import { ItemGrid } from '../items/ItemGrid';
import { ItemDetail } from './components/ItemDetail';
import { TMQuestionDialog, TossDialog } from './components/BagDialogs';

/** What the scene keeps while the screen is unmounted (party / evolution on top). */
export interface BagView extends ItemFilter {
  selected: string | null;
}

export interface TMQuestion {
  itemId: string;
  pokemonName: string;
  moveName: string;
  level: number;
}

const KEYS = [
  ...BROWSE_KEYS,
  { code: 'Enter', action: 'primary' },
  { code: 'Space', action: 'primary' },
  { code: 'Delete', action: 'toss' },
] as const;

const SORTS: ItemSort[] = ['default', 'name', 'qty'];

const BAG_ICON = (
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
    <path d="M6 8h12l1 12H5z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export function BagScreen({
  mode,
  initialView,
  onViewChange,
  initialMessage,
  tmQuestion,
  controller,
  onClose,
}: {
  mode: BagMode;
  initialView: BagView;
  onViewChange: (v: BagView) => void;
  initialMessage: string | null;
  tmQuestion: Omit<TMQuestion, 'itemId'> | null;
  controller: BagController;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [pd, , version] = usePlayerData();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => bagEntries(pd.items, mode), [version, mode]);
  const b = useItemBrowser(all, initialView, initialView.selected);
  const { entry, filter } = b;

  const [toast, say, hideToast] = useToast(initialMessage);
  const [question, setQuestion] = useState(tmQuestion);
  const [tossing, setTossing] = useState(false);
  const [sellQty, setSellQty] = useState(1);

  useEffect(() => onViewChange({ ...filter, selected: entry?.id ?? null }), [filter, entry?.id, onViewChange]);
  useEffect(() => setSellQty(1), [entry?.id]);

  function primary(id = entry?.id) {
    if (!id) return;
    say(mode === 'sell-item' ? controller.sell(id, sellQty) : controller.activate(id));
  }
  const askToss = () => entry && canToss(entry.def, mode) && setTossing(true);

  useInputLayer({
    id: 'bag-screen',
    name: 'Bag',
    blocksLowerLayers: true,
    keyBindings: KEYS,
    active: !b.searchFocused && !question && !tossing,
    onAction: (action) => {
      if (b.handleKey(action, onClose)) return;
      if (action === 'primary') primary();
      else if (action === 'toss') askToss();
    },
  });

  const title = mode === 'sell-item' ? t('bag.title.sell') : mode === 'battle' ? t('bag.title.battle') : t('bag.title');
  const keyHints: [string, string][] = [
    ['Enter', mode === 'sell-item' ? 'bag.action.sell' : 'bag.key.use'],
    ...(mode === 'overworld' ? ([['Del', 'bag.action.toss']] as [string, string][]) : []),
  ];

  return (
    <ItemsFrame
      title={title}
      icon={BAG_ICON}
      browser={b}
      sorts={SORTS}
      money={pd.money}
      // Selling / in battle a pocket with nothing usable is just noise
      hideEmptyPockets={mode !== 'overworld'}
      emptyText={t('bag.noItems')}
      keyHints={keyHints}
      toast={toast}
      onToastClick={hideToast}
      onClose={onClose}
      list={
        <ItemGrid
          entries={b.list}
          selectedId={entry?.id ?? null}
          onPick={b.setSelected}
          onActivate={primary}
          trailing={(e) =>
            mode === 'sell-item' ? (
              <span dir="ltr" className="shrink-0 text-end font-mono text-[13px] leading-tight">
                <span className="block text-[#f8d030]">₽{sellPrice(e.def).toLocaleString('en-US')}</span>
                <span className="block text-[#8fb19c]">×{e.qty}</span>
              </span>
            ) : isStoryKeyItem(e.def) ? (
              <StoryMark used={!!(e.def.usedFlag && pd.flags[e.def.usedFlag])} />
            ) : (
              <span dir="ltr" className="shrink-0 font-mono text-sm text-[#cfe6d7]">
                ×{e.qty}
              </span>
            )
          }
        />
      }
      detail={
        <ItemDetail
          entry={entry}
          mode={mode}
          qty={sellQty}
          onQty={setSellQty}
          onPrimary={() => primary()}
          onToss={askToss}
        />
      }
    >
      {question && (
        <TMQuestionDialog
          text={t('bag.tm.naturalWarn', { name: question.pokemonName, move: question.moveName, level: question.level })}
          onKeep={() => {
            setQuestion(null);
            controller.answerTM(false);
          }}
          onTeach={() => {
            setQuestion(null);
            say(controller.answerTM(true));
          }}
        />
      )}

      {tossing && entry && (
        <TossDialog
          itemName={getLocalizedName(entry.def.name)}
          max={entry.qty}
          onCancel={() => setTossing(false)}
          onToss={(n) => {
            setTossing(false);
            say(controller.toss(entry.id, n));
          }}
        />
      )}
    </ItemsFrame>
  );
}

/** Story key items show delivered ✓ / not yet □ instead of a count. */
function StoryMark({ used }: { used: boolean }) {
  return <span className={`shrink-0 text-lg ${used ? 'text-[#44cc88]' : 'text-[#8fb19c]'}`}>{used ? '✓' : '□'}</span>;
}
