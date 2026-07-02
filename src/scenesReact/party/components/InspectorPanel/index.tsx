import { useState } from 'react';
import { InspectorHeader } from './Header.js';
import { InspectorStatsTab } from './tabs/StatsTab.js';
import type { Move, PlayerData, Pokemon } from '../../../../types/index.js';
import HeldItemsTab from './tabs/HeldItemsTab.js';
import { MovesetTab } from './tabs/MovesetTab.js';
import { TYPE_BADGE } from '../../../../data/type-constants.js';
import type { PartyMode } from '../../index.js';
import { getPokemonDisplayName } from '../../../../services/pokemon-data.js';
import { getItem } from '../../../../data/items.js';
import { useI18n } from '../../../../ui-react/context/i18n-context.js';
import type { GameNotificationProps } from '../../../../ui-react/context/GameNotifications-context.js';
import { useInputLayer } from '../../../../engine/inputManagerV2/index.js';

interface IInspectorPanelProps {
  mode: PartyMode;
  pokemon: Pokemon;
  pd: PlayerData;
  editPlayerData: (callback: (pd: PlayerData) => void) => void;
  isPokedexMode?: boolean;
  defaultTab?: 'stats' | 'moveset' | 'items';
  showNotification: (options: GameNotificationProps) => void;
  setSelectedMoveToDelete: (move: Move | null) => void;
  selectedMoveToDelete: Move | null;
}

export function InspectorPanel({
  mode,
  pokemon,
  pd,
  editPlayerData,
  isPokedexMode = false,
  defaultTab = 'stats',
  showNotification,
  setSelectedMoveToDelete,
  selectedMoveToDelete,
}: Readonly<IInspectorPanelProps>) {
  const { t, locale, isRTL } = useI18n();
  const [activeTab, setActiveTab] = useState<'stats' | 'moveset' | 'items'>(
    mode.kind === 'move-learning' ? 'moveset' : defaultTab,
  );

  const tabs = [
    { key: 'stats', text: t('party.baseStats'), conditions: mode.kind !== 'move-learning' },
    { key: 'moveset', text: t('party.moves.title'), conditions: true },
    {
      key: 'items',
      text: t('party.heldItem.bagItems'),
      conditions: mode.kind !== 'battle' && mode.kind !== 'move-learning',
    },
  ];

  const primaryType = TYPE_BADGE[pokemon.types[0]];
  const secondaryType = TYPE_BADGE[pokemon.types[1]] ?? primaryType;

  const baseTabClass = 'flex-1 pb-3 text-sm font-semibold transition-colors border-b-2';
  const inactiveTabClass = `${baseTabClass} text-slate-500 border-transparent hover:text-slate-300 cursor-pointer`;

  const getTabClass = (tab: string) => (activeTab === tab ? baseTabClass : inactiveTabClass);

  const getTabStyle = (tab: string): React.CSSProperties =>
    activeTab === tab
      ? { color: primaryType.color, borderColor: secondaryType.color, boxShadow: `0 2px 8px ${primaryType.bg}` }
      : {};

  useInputLayer({
    id: 'inspector-panel',
    name: 'Inspector Panel',
    blocksLowerLayers: false,
    keyBindings: [
      { code: 'ArrowLeft', action: 'prev-tab' },
      { code: 'ArrowRight', action: 'next-tab' },
    ],
    onAction: (action) => {
      if (action === 'prev-tab') {
        handleTabChange(isRTL ? 'next' : 'prev');
      } else if (action === 'next-tab') {
        handleTabChange(isRTL ? 'prev' : 'next');
      }
    },
  });

  const handleTabChange = (direction: 'prev' | 'next') => {
    const tabsKeys = tabs.filter((tab) => tab.conditions).map((tab) => tab.key);
    const currentIndex = tabsKeys.indexOf(activeTab);
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % tabsKeys.length
        : (currentIndex - 1 + tabsKeys.length) % tabsKeys.length;
    setActiveTab(tabsKeys[nextIndex] as 'stats' | 'moveset' | 'items');
  };

  // ------------------------ component callbacks ------------------------

  function onMoveReorder(moves: Move[]) {
    editPlayerData((pd) => {
      const mon = pd.party.find((p) => p.uuid === pokemon.uuid);
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
        showNotification({
          text: t('bag.heldItem.unequipped', {
            item: getItem(itemId)?.name[locale] ?? '???',
            name: getPokemonDisplayName(mon.id),
          }),
          type: 'danger',
          position: 'top-center',
          id: `unequip-${uuid}-${itemId}`,
        });
      } else {
        // return any currently-held item, then equip the new one
        if (mon.heldItemId) pd.items[mon.heldItemId] = (pd.items[mon.heldItemId] ?? 0) + 1;
        mon.heldItemId = itemId;
        pd.items[itemId] = (pd.items[itemId] ?? 0) - 1;
        showNotification({
          position: 'top-center',
          text: t('bag.heldItem.equipped', {
            item: getItem(itemId)?.name[locale] ?? '???',
            name: getPokemonDisplayName(mon.id),
          }),
          type: 'success',
          id: `equip-${uuid}-${itemId}`,
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
          {tabs
            .filter((tab) => tab.conditions)
            .map((tab) => {
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'stats' | 'moveset' | 'items')}
                  className={getTabClass(tab.key)}
                  style={getTabStyle(tab.key)}
                >
                  {tab.text}
                </button>
              );
            })}
        </div>

        <div className="flex-1 overflow-y-auto game-scrollbar">
          {activeTab === 'stats' && <InspectorStatsTab pokemon={pokemon} party={pd.party} />}
          {activeTab === 'moveset' && (
            <MovesetTab
              mode={mode}
              setSelectedMoveToDelete={setSelectedMoveToDelete}
              selectedMoveToDelete={selectedMoveToDelete}
              pokemon={pokemon}
              onMoveReorder={onMoveReorder}
            />
          )}
          {mode.kind !== 'battle' && activeTab === 'items' && (
            <HeldItemsTab pd={pd} pokemon={pokemon} onEquipItem={onEquipItem} />
          )}
        </div>
      </div>
    </div>
  );
}
