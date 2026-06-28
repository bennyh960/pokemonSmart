import type { PartyMode } from '../..';
import { setBagPendingItem } from '../../../../scenes/bag';
import type { PlayerData, Pokemon } from '../../../../types';
import type { QuickActionItem } from './helpers';
import { useKeyPress, type Key } from '../../../../ui-react/hooks/useKeyboard';
import type { Locale } from '../../../../i18n/i18n';
import { useI18n } from '../../../../ui-react/context/i18n-context';

interface IQuickActionsProps {
  mode: PartyMode;
  onClose: () => void;
  pd: PlayerData;
  editPlayerData: (fn: (pd: PlayerData) => void) => void;
  selected: Pokemon;
  quickActionItems: QuickActionItem[];
  onBagClick: () => void;
}

const CATEGORY_STYLES: Record<string, { border: string; text: string; bg: string; kbd: string }> = {
  healing: {
    border: 'hover:border-emerald-500/50',
    text: 'group-hover:text-emerald-300',
    bg: 'bg-emerald-500/10',
    kbd: 'border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500/20',
  },
  revival: {
    border: 'hover:border-teal-500/50',
    text: 'group-hover:text-teal-300',
    bg: 'bg-teal-500/10',
    kbd: 'border-teal-500/30 text-teal-400 group-hover:bg-teal-500/20',
  },
  'status-cure': {
    border: 'hover:border-amber-500/50',
    text: 'group-hover:text-amber-300',
    bg: 'bg-amber-500/10',
    kbd: 'border-amber-500/30 text-amber-400 group-hover:bg-amber-500/20',
  },
  evolution: {
    border: 'hover:border-purple-500/50',
    text: 'group-hover:text-purple-300',
    bg: 'bg-purple-500/10',
    kbd: 'border-purple-500/30 text-purple-400 group-hover:bg-purple-500/20',
  },
  battle: {
    border: 'hover:border-blue-500/50',
    text: 'group-hover:text-blue-300',
    bg: 'bg-blue-500/10',
    kbd: 'border-blue-500/30 text-blue-400 group-hover:bg-blue-500/20',
  },
  default: {
    border: 'hover:border-slate-500/50',
    text: 'group-hover:text-slate-300',
    bg: 'bg-slate-500/10',
    kbd: 'border-slate-500/30 text-slate-400 group-hover:bg-slate-500/20',
  },
};

const SHORTCUT_KEYS: Key[] = ['1', '2', '3', '4'];

function PartyQuickActions({
  mode,
  onClose,
  pd,
  editPlayerData,
  selected,
  quickActionItems,
  onBagClick,
}: IQuickActionsProps) {
  const { t, isRTL, locale } = useI18n();

  const applyItem = (itemId: string) => {
    if (mode.kind === 'battle') {
      setBagPendingItem(itemId);
      console.log('battle mode - pending item set to', itemId);
      onClose();
    } else if (mode.kind === 'overworld') {
      console.log(`overworld mode - clicked item: ${itemId}`);
    }
  };

  const handleOpenBag = () => {
    onBagClick();
  };

  const filteredItems = quickActionItems
    .filter((entry) => {
      if (!entry.itemDef) return false;
      if (mode.kind === 'battle') return entry.itemDef.usableInBattle;
      if (mode.kind === 'overworld') return entry.itemDef.usableInOverworld;
      return false;
    })
    .slice(0, 4);

  useKeyPress(SHORTCUT_KEYS, (e) => {
    const index = SHORTCUT_KEYS.indexOf(e.key as any);
    const entry = filteredItems[index];

    if (entry) {
      applyItem(entry.itemId);
    }
  });

  useKeyPress('b', () => {
    handleOpenBag();
  });

  if (mode.kind === 'battle' && mode.inBattleUUID !== selected.uuid) {
    return null;
  }

  // Dynamic text alignment configuration variables
  const textAlignment = isRTL ? 'text-right' : 'text-left';

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-900/80 select-none" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`text-xs text-slate-500 font-bold tracking-wider mb-3 ${textAlignment}`}>
        {t?.('quick_actions') ?? 'QUICK ACTIONS'}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch">
        {filteredItems.map((entry, index) => {
          const { itemDef, count, itemId } = entry;
          if (!itemDef) return null;

          const category = itemDef.category ?? 'default';
          const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;
          const shortcutKey = SHORTCUT_KEYS[index];

          return (
            <button
              key={itemId}
              onClick={() => applyItem(itemId)}
              className={`flex items-center gap-2.5 bg-slate-950 border border-slate-800 p-2 rounded-lg group text-left relative overflow-hidden flex-1 hover:flex-[2.5] h-[52px] transition-all duration-300 ease-out min-w-[140px] cursor-pointer active:scale-95 active:bg-slate-900 ${textAlignment} ${style.border}`}
            >
              {/* Shortcut Key */}
              <kbd
                className={`w-6 h-6 flex shrink-0 items-center justify-center bg-slate-900 border rounded text-xs font-mono transition-colors ${style.kbd}`}
              >
                {shortcutKey}
              </kbd>

              {/* Item Sprite */}
              {itemDef.sprite && (
                <img
                  src={itemDef.sprite}
                  alt={itemDef.name.en}
                  className="w-6 h-6 object-contain pixelated shrink-0 group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                />
              )}

              {/* Information Container */}
              <div className="flex flex-col min-w-0 flex-1 h-full justify-center">
                <div className="flex items-baseline justify-between gap-1 leading-none mb-0.5">
                  <span className={`text-slate-200 text-xs font-semibold truncate ${style.text}`}>
                    {itemDef.name[locale] ?? '???'}
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono px-1 rounded shrink-0 text-slate-300 transition-colors ${style.bg}`}
                  >
                    x{count}
                  </span>
                </div>

                {/* Controlled height container for description wrapping */}
                <div className="h-[12px] group-hover:h-[24px] overflow-hidden transition-all duration-300 ease-out leading-tight">
                  <span
                    className={`text-[10px] text-slate-500 block truncate group-hover:whitespace-normal group-hover:text-slate-400 transition-colors duration-300 ${textAlignment}`}
                  >
                    {itemDef.description[locale] ?? '???'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Open Bag Button (Adapts layout using sm:ml-auto or sm:mr-auto cleanly based on condition) */}
        <button
          onClick={handleOpenBag}
          className={`flex items-center gap-2.5 bg-slate-950 border border-slate-800 hover:border-blue-500/50 p-2 rounded-lg transition-all duration-200 group shrink-0 w-full sm:w-[150px] h-[52px] cursor-pointer active:scale-95 active:bg-slate-900 ${textAlignment} ${
            isRTL ? 'sm:mr-auto' : 'sm:ml-auto'
          }`}
        >
          <kbd className="w-6 h-6 flex shrink-0 items-center justify-center bg-slate-900 border border-blue-500/30 text-blue-400 rounded text-xs font-mono group-hover:bg-blue-500/20 transition-colors">
            B
          </kbd>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-slate-200 text-xs font-semibold truncate group-hover:text-blue-300">
              {t?.('open_bag') ?? 'Open Bag'}
            </span>
            <span className="text-[10px] text-slate-500 truncate group-hover:text-slate-400">
              {t?.('view_all_items') ?? 'View all items'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default PartyQuickActions;
