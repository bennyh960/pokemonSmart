import { useCallback, useState } from 'react';
import { getQuest } from '../../../../data/story/quests';
import { countBadges } from '../../../../data/badges';
import type { PlayerData, Pokemon } from '../../../../types';
import { createPartyReactScene, type PartyMode } from '../..';
import { getPokemonSpriteUrl } from '../../../../utils/util';
import { AwayPokemonModal } from './AwayPokemon';
import { useInputLayer } from '../../../../engine/inputManagerV2';
import type { StateMachine } from '../../../../engine/state-machine';
import { setPokedexMapContext } from '../../../../scenes/world-map';

interface PartyHeaderProps {
  onClose: () => void;
  t: (key: string, options?: Record<string, any>) => string;
  pd: PlayerData;
  mode: PartyMode;
  onDoubleClick: (pokemon: Pokemon) => void;
  stateMachine: StateMachine;
}

const PartyHeader = ({ onClose, t, pd, mode, onDoubleClick, stateMachine }: PartyHeaderProps) => {
  const badgeCount = countBadges(pd.badges);
  const [isAwayModalOpen, setIsAwayModalOpen] = useState(false);
  const hasAwayPokemon = Object.keys(pd.awayPokemon).length > 0;

  const renderCenterContent = () => {
    if (mode.kind === 'battle' && mode.roster) {
      return renderRosterContent();
    }
    const quest = getQuest(pd.story?.activeQuestId ?? '');
    if (quest) {
      return (
        <div className="hidden md:flex items-center gap-1.5 min-w-0 flex-1 justify-center">
          <span className="text-[11px] text-slate-300 font-medium">{quest.title.he}: </span>
          <span className="text-[11px] text-slate-500 font-medium truncate">{quest.objective.he}</span>
        </div>
      );
    }
  };

  // Lifetime: "this feature exists on this screen at all." KeyD is always
  // safe to claim under this condition — nothing else on the screen wants KeyD.
  useInputLayer({
    id: 'party-header-toggle',
    name: 'Party Header — Away Toggle',
    active: hasAwayPokemon,
    blocksLowerLayers: false, // doesn't need to block anything, it owns a key nothing else wants
    keyBindings: [{ code: 'KeyD', action: 'toggle-away-modal' }],
    onAction: (action) => {
      if (action === 'toggle-away-modal') setIsAwayModalOpen((open) => !open);
    },
  });

  // Lifetime: "the modal is actually on screen right now." Escape is only
  // EVER bound while this is true — so it's structurally impossible for it
  // to swallow party-screen's Escape while the modal is closed.
  useInputLayer({
    id: 'away-modal',
    name: 'Away Modal',
    active: isAwayModalOpen,
    blocksLowerLayers: true, // correctly opaque, but ONLY while it exists
    keyBindings: [
      { code: 'Escape', action: 'close-away-modal' },
      { code: 'KeyD', action: 'toggle-away-modal' },
    ],
    onAction: (action) => {
      if (action === 'close-away-modal') setIsAwayModalOpen(false);
      if (action === 'toggle-away-modal') setIsAwayModalOpen((open) => !open);
    },
  });

  const renderRosterContent = useCallback(() => {
    if (mode.kind === 'battle' && mode.roster) {
      const maxSize = mode.maxSize;
      const rosterIndices = Array.from(mode.roster);
      return (
        <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
          {Array.from({ length: maxSize }).map((_, slotIndex) => {
            // בדיקה האם יש פוקימון במשבצת הנוכחית של הרוסטר
            const partyIndex = rosterIndices[slotIndex];
            const pokemon = partyIndex !== undefined ? pd.party[partyIndex] : null;

            // משבצת ריקה (אין פוקימון או שהרוסטר קטן מהמקסימום) -> רינדור פוקדור
            if (!pokemon) {
              return (
                <div
                  key={slotIndex}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 border-dashed"
                >
                  <span className="text-lg opacity-40">🔴</span>
                </div>
              );
            }

            const spriteUrl = getPokemonSpriteUrl(pokemon.id);
            const isFainted = pokemon.hp === 0;

            // משבצת מלאה -> רינדור הפוקימון (חי או מעולף)
            return (
              <button
                key={slotIndex}
                className={`relative w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-500 overflow-hidden flex items-center justify-center ${isFainted ? '' : 'cursor-pointer hover:border-purple-500/50 transition-colors'}`}
                onDoubleClick={() => !isFainted && onDoubleClick(pokemon)}
              >
                <img
                  src={spriteUrl}
                  alt={pokemon.name || 'Pokemon'}
                  className={`w-8 h-8 object-contain select-none ${isFainted ? 'grayscale contrast-75 brightness-75' : ''}`}
                />

                {isFainted && (
                  <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                    <span className="text-red-500 font-black text-xl leading-none select-none">✕</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      );
    }
    return null;
  }, [mode, pd]);

  return (
    <>
      <header className="shrink-0 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md z-10">
        <div className="flex items-center justify-between px-4 h-12 gap-4">
          {/* LEFT: back + title + count */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Money */}
            <span className="text-slate-300 text-xs font-mono font-bold">₽{pd.money.toLocaleString()}</span>
            <div className="h-4 w-px bg-slate-800 shrink-0" />
            <h1 className="text-white font-bold text-sm tracking-wide shrink-0">{t('party.title')}</h1>
            <span className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-md font-medium shrink-0">
              {pd.party.length}/6
            </span>
            {/* AWAY POKEMON BUTTON */}
            {hasAwayPokemon && (
              <button
                onClick={() => setIsAwayModalOpen(true)}
                className="relative flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all text-xs font-medium cursor-pointer"
              >
                {/* Soft visual attention anchor */}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                <span>{t('party.away.title')}</span>
                <kbd className="w-6 h-6 flex shrink-0 items-center justify-center bg-slate-900 border border-blue-500/30 text-blue-400 rounded text-xs font-mono group-hover:bg-blue-500/20 transition-colors">
                  D
                </kbd>
              </button>
            )}
          </div>

          {/* CENTRE: active quest/battle roster — only when present */}
          {renderCenterContent()}

          {/* RIGHT: badges + money */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Badge pips */}
            <div title={t('saveSlots.badges', { count: badgeCount })} className="hidden sm:flex items-center gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full border transition-colors ${
                    i < badgeCount ? 'bg-yellow-400 border-yellow-500' : 'bg-slate-800 border-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <button
              onClick={onClose}
              className="text-slate-400 cursor-pointer hover:text-white transition-colors flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider shrink-0"
            >
              {/* <kbd className="text-lg leading-none">←</kbd> */}
              <kbd className="w-6 h-6 flex shrink-0 items-center justify-center bg-slate-900 border border-blue-500/30 text-blue-400 rounded text-xs font-mono group-hover:bg-blue-500/20 transition-colors">
                ESC
              </kbd>
              <span className="hidden sm:inline">{t('party.hint.back')}</span>
            </button>
          </div>
        </div>
      </header>
      <AwayPokemonModal
        onNavigateToMap={(mapId, pokemonId) => {
          onClose();
          setPokedexMapContext(pokemonId, () => {
            const newPartyScene = createPartyReactScene(stateMachine, { kind: 'overworld' });
            stateMachine.pushDirect('PARTY', newPartyScene);
          }, [{ mapId, mapLabel: 'not-important', maxLevel: 3, minLevel: 2, methods: [] }]);
          stateMachine.push('WORLD_MAP');
        }}
        pd={pd}
        onClose={() => setIsAwayModalOpen(false)}
        isOpen={isAwayModalOpen && hasAwayPokemon}
      />
    </>
  );
};

export default PartyHeader;
