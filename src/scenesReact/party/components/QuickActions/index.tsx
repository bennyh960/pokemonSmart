// -----------------------------
// 3. FOOTER COMPONENT
// quick actions buttons for specifc pokemon
// heal hp , heal pp , heal status , vitamins , revives ,elixer etc.
// rules:
// 1. only show buttons that are relevant to the current pokemon state
// if faint - revive/max revive

import type { PartyMode } from '../..';
import { getItem } from '../../../../data/items';
import { setBagPendingItem } from '../../../../scenes/bag';
import { selectedPartyIndex } from '../../../../scenes/party';
import { getPlayerData } from '../../../../systems/game-state';
import type { PlayerData, Pokemon } from '../../../../types';
import ActionButton from '../../../../ui-react/componenets/ActionButton';

// review mode -> overworld / battle only will show quick actions
// if battle - revive not allowed
// not in battle - if full hp show vitamins buttons (protein / iron / calcium / zinc / hp up / pp up) + description

// first check if the pokemon is fainted, then show revive buttons (revive / max revive) + description
// if not fainted, show heal buttons (potion / super potion / hyper potion / max potion) + description
// if not fainted, show status heal buttons (antidote / paralyze heal / awaken / burn heal / ice heal) + description
// if in battle show also x-items (x attack / x defense / x speed / x special) + description
// if eligble to evelove show evolution stone buttons (fire stone / water stone / thunder stone / leaf stone / moon stone / sun stone) + description

// flow : we using our react pd to read data items.
// we have mode.kind to check if we are in battle or overworld
// we have ready functions for some logics:
// ItemDef - we can use getItem(itemId) to get the item definition and check its properties (category and effect)
// but at the end we probably use the canUseItemOnPokemon(itemId, pokemon) to check if the item is usable on the current pokemon
// or applyItemEffect

interface IQuickActionsProps {
  mode: PartyMode;
  onClose: () => void;
  pd: PlayerData;
  editPlayerData: (fn: (pd: PlayerData) => void) => void;
  selected: Pokemon;
}

// -----------------------------
function PartyQuickActions({ mode, onClose, pd, editPlayerData, selected }: IQuickActionsProps) {
  const test = (itemId: string) => {
    if (mode.kind === 'battle') {
      setBagPendingItem(itemId);
      console.log('battle mode - pending item set to', itemId);
      onClose();
    }
  };

  if (mode.kind === 'battle' && mode.inBattleUUID !== selected.uuid) {
    return null;
  }
  console.log({
    selectedPartyIndex,
    inBattleID: mode.kind === 'battle' ? mode.inBattleUUID : null,
    selected,
    mode,
    pdIndex: pd.party.indexOf(selected),
  });

  return (
    <div className="p-4 border-t border-slate-800 bg-slate-900/80">
      <div className="text-xs text-slate-500 font-bold tracking-wider mb-3">QUICK ACTIONS</div>
      <div className="flex gap-4">
        <button
          onClick={() => test('potion')}
          className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-purple-500/50 px-4 py-2 rounded-lg transition-colors group"
        >
          <kbd className="w-6 h-6 flex items-center justify-center bg-slate-950 border border-purple-500/30 text-purple-400 rounded text-xs font-mono group-hover:bg-purple-500/10 transition-colors">
            E
          </kbd>
          <span className="text-slate-300 text-sm font-medium">Potion</span>
        </button>
        <button
          onClick={() => test('x-defense')}
          className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-purple-500/50 px-4 py-2 rounded-lg transition-colors group"
        >
          <kbd className="w-6 h-6 flex items-center justify-center bg-slate-950 border border-purple-500/30 text-purple-400 rounded text-xs font-mono group-hover:bg-purple-500/10 transition-colors">
            F
          </kbd>
          <span className="text-slate-300 text-sm font-medium">x-defense</span>
        </button>
        <button className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-red-500/50 px-4 py-2 rounded-lg transition-colors group ml-auto">
          <kbd className="w-8 h-6 flex items-center justify-center bg-slate-950 border border-red-500/30 text-red-400 rounded text-xs font-mono group-hover:bg-red-500/10 transition-colors">
            Del
          </kbd>
          <span className="text-slate-300 text-sm font-medium">Send to PC</span>
        </button>
        <ActionButton btn={{ color: 'blue', icon: '', name: 'Potion', desc: 'heal 20hp', qty: 3 }} />
        <ActionButton btn={{ color: 'red', icon: '', name: 'Hyper Potion', desc: 'heal 200hp', qty: 3 }} />
        <ActionButton
          btn={{ color: 'green', icon: '', name: 'Full Restore', desc: 'heal to max HP and heal status', qty: 3 }}
        />
      </div>
    </div>
  );
}

export default PartyQuickActions;
