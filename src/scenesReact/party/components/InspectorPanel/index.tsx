import { useState } from 'react';
import { InspectorHeader } from './Header.js';
import { InspectorStatsTab } from './tabs/StatsTab.js';
import type { Move, PlayerData, Pokemon } from '../../../../types/index.js';
import HeldItemsTab from './tabs/HeldItemsTab.js';
import { MovesetTab } from './tabs/MovesetTab.js';
import { TYPE_BADGE } from '../../../../data/type-constants.js';
import type { PartyMode } from '../../index.js';
import { useKeyPress } from '../../../../ui-react/hooks/useKeyboard.js';
import { getPokemonDisplayName } from '../../../../services/pokemon-data.js';
import type { GameNotificationProps } from '../../../../ui-react/componenets/GameNotification.js';
import { getItem } from '../../../../data/items.js';
import { useI18n } from '../../../../ui-react/context/i18n-context.js';

interface Props {
  mode: PartyMode;
  pokemon: Pokemon;
  pd: PlayerData;
  editPlayerData: (callback: (pd: PlayerData) => void) => void;
  isPokedexMode?: boolean;
  defaultTab?: 'stats' | 'moveset' | 'items';
  setNotification: (notification: GameNotificationProps | null) => void;
}

export function InspectorPanel({
  mode,
  pokemon,
  pd,
  editPlayerData,
  isPokedexMode = false,
  defaultTab = 'stats',
  setNotification,
}: Props) {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'stats' | 'moveset' | 'items'>(defaultTab);

  const primaryType = TYPE_BADGE[pokemon.types[0]];
  const secondaryType = TYPE_BADGE[pokemon.types[1]] ?? primaryType;

  const baseTabClass = 'flex-1 pb-3 text-sm font-semibold transition-colors border-b-2';
  const inactiveTabClass = `${baseTabClass} text-slate-500 border-transparent hover:text-slate-300 cursor-pointer`;

  const getTabClass = (tab: string) => (activeTab === tab ? baseTabClass : inactiveTabClass);

  const getTabStyle = (tab: string): React.CSSProperties =>
    activeTab === tab
      ? { color: primaryType.color, borderColor: secondaryType.color, boxShadow: `0 2px 8px ${primaryType.bg}` }
      : {};

  // inspector pannel
  useKeyPress(['ArrowLeft', 'ArrowRight'], (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const tabs = ['stats', 'moveset', 'items'].filter((tab) => mode.kind !== 'battle' || tab !== 'items');
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex =
        e.key === 'ArrowRight' ? (currentIndex - 1 + tabs.length) % tabs.length : (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex] as 'stats' | 'moveset' | 'items');
    }
  });

  // ------------------------ component callbacks ------------------------

  function onMoveReorder(uuid: string, moves: Move[]) {
    editPlayerData((pd) => {
      const mon = pd.party.find((p) => p.uuid === uuid);
      if (mon) mon.moves = moves;
    });
  }

  // Held Items only
  function onEquipItem(uuid: string, itemId: string) {
    editPlayerData((pd) => {
      const mon = pd.party.find((p) => p.uuid === uuid);
      if (!mon) return;

      if (mon.heldItemId === itemId) {
        // unequip: return the item to the bag
        pd.items[itemId] = (pd.items[itemId] ?? 0) + 1;
        mon.heldItemId = null;
        setNotification({
          position: 'top-center',
          text: t('bag.heldItem.unequipped', {
            item: getItem(itemId)?.name[locale] ?? '???',
            name: getPokemonDisplayName(mon.id),
          }),
          type: 'danger',
        });
      } else {
        // return any currently-held item, then equip the new one
        if (mon.heldItemId) pd.items[mon.heldItemId] = (pd.items[mon.heldItemId] ?? 0) + 1;
        mon.heldItemId = itemId;
        pd.items[itemId] = (pd.items[itemId] ?? 0) - 1;
        setNotification({
          position: 'top-center',
          text: t('bag.heldItem.equipped', {
            item: getItem(itemId)?.name[locale] ?? '???',
            name: getPokemonDisplayName(mon.id),
          }),
          type: 'success',
        });
      }
      if (pd.items[itemId] !== undefined && pd.items[itemId] <= 0) delete pd.items[itemId];
    });
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase">{t('party.inspector')}</h3>
      </div>

      <InspectorHeader pokemon={pokemon} isPokedexMode={isPokedexMode} mode={mode} onEquipItem={onEquipItem} />

      <div className="flex-1 outline-none flex flex-col min-h-0">
        <div className="flex px-4 border-b border-slate-800">
          <button onClick={() => setActiveTab('stats')} className={getTabClass('stats')} style={getTabStyle('stats')}>
            {t('party.baseStats')}
          </button>
          <button
            onClick={() => setActiveTab('moveset')}
            className={getTabClass('moveset')}
            style={getTabStyle('moveset')}
          >
            {t('party.moves.title')}
          </button>
          {mode.kind !== 'battle' && (
            <button onClick={() => setActiveTab('items')} className={getTabClass('items')} style={getTabStyle('items')}>
              {t('party.heldItem.bagItems')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto game-scrollbar">
          {activeTab === 'stats' && <InspectorStatsTab pokemon={pokemon} party={pd.party} />}
          {activeTab === 'moveset' && <MovesetTab pokemon={pokemon} onMoveReorder={onMoveReorder} />}
          {mode.kind !== 'battle' && activeTab === 'items' && (
            <HeldItemsTab pd={pd} pokemon={pokemon} onEquipItem={onEquipItem} />
          )}
        </div>
      </div>
    </div>
  );
}
