import { getItem, type ItemDef } from '../../../../../data/items';
import type { PlayerData, Pokemon } from '../../../../../types';
import { useI18n } from '../../../../../ui-react/context/i18n-context';

function getEquipAbleItems(pd: PlayerData): Array<{ id: string; quantity: number; itemDef: ItemDef | undefined }> {
  return Object.entries(pd.items)
    .map(([id, quantity]) => ({ id, quantity, itemDef: getItem(id) }))
    .filter((item) => item.itemDef?.category === 'held');
}

const HeldItemsTab = ({
  pd,
  pokemon,
  onEquipItem,
}: {
  pokemon: Pokemon;
  pd: PlayerData;
  /** uuid of the mon + the item clicked; parent applies the equip/unequip through the funnel. */
  onEquipItem: (uuid: string, itemId: string) => void;
}) => {
  const { t, locale, isRTL } = useI18n();

  const items = getEquipAbleItems(pd);

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-8">
        <div className="text-center">
          <div className="mb-3 text-5xl opacity-40">🎒</div>
          <div className="text-sm font-medium text-slate-300">{t('party.heldItem.bagEmpty')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800/40 bg-slate-900/30 p-4">
      <div className="flex flex-col gap-3 overflow-y-auto game-scrollbar pr-1">
        {items.map((entry) => {
          const itemDef = entry.itemDef;
          const itemName = itemDef?.name?.[locale] ?? entry.id;
          const itemDesc = itemDef?.description?.[locale] ?? '';

          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onEquipItem(pokemon.uuid, entry.id)}
              className={`cursor-pointer group flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-800/50 p-3 transition-all duration-200 hover:border-sky-500/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-sky-900/20 active:scale-[0.98] ${
                isRTL ? 'flex-row-reverse text-right' : 'text-left'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 flex-shrink-0">
                <img src={itemDef?.sprite} alt={itemName} className="h-10 w-10 object-contain pixelated" />
              </div>
              <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`truncate font-semibold text-slate-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {itemName}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-slate-400">{itemDesc}</div>
              </div>
              <div className="rounded-full bg-slate-950 border border-slate-700 px-3 py-1 text-sm font-bold text-slate-200">
                ×{entry.quantity}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HeldItemsTab;
