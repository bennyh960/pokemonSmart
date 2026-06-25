import { useState, useEffect } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { getCachedImage, loadImage } from '../../engine/sprite-loader.js';
import { TYPE_BADGE } from '../../data/type-constants.js';
import { hpColor } from './utils.js';
import type { Pokemon } from '../../types/index.js';

// Mocks for tabs as requested
import StatsTab from './tabs/StatsTab';
import MovesetTab from './tabs/MovesetTab';
import HeldItemsTab from './tabs/HeldItemsTab';
import { getNature, getPokemonDisplayName } from '../../services/pokemon-data.js';

type Tab = 'stats' | 'moveset' | 'held_items';

interface Props {
  pokemon: Pokemon;
}

export function InspectorPanel({ pokemon }: Props) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('stats');
  const [sprite, setSprite] = useState<string | null>(
    getCachedImage(`/sprites/pokemon/front/${pokemon.id}.png`)?.src ?? null,
  );

  useEffect(() => {
    let dead = false;
    loadImage(`/sprites/pokemon/front/${pokemon.id}.png`)
      .then((img) => {
        if (!dead) setSprite(img.src);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [pokemon.id]);

  const primaryType = TYPE_BADGE[pokemon.types[0]];
  const hpPct = Math.max(0, pokemon.hp / pokemon.maxHp);
  const isMale = true; // Mock gender

  // Resolve Nature info
  const natureDef = pokemon.natureId ? getNature(pokemon.natureId) : null;
  const natureName = natureDef ? (locale === 'he' ? natureDef.name.he : natureDef.name.en) : '---';
  const statShort: Record<string, string> = {
    attack: 'Atk',
    defense: 'Def',
    specialAttack: 'SpA',
    specialDefense: 'SpD',
    speed: 'Spe',
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#111218] rounded-xl border border-slate-800 overflow-hidden">
      {/* --- HEADER BLOCK --- */}
      <div className="relative shrink-0 border-b border-slate-800">
        {/* Background gradient overlay based on type */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle at top left, ${primaryType.color}, transparent 80%)` }}
        />

        <div className="relative p-8 flex items-start gap-8">
          {/* Column 1: Large Sprite */}
          <div className="w-40 h-40 shrink-0 flex items-center justify-center drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            {sprite && (
              <img
                src={sprite}
                alt={pokemon.name}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            )}
          </div>

          {/* Column 2: Core Info */}
          <div className="flex-1 flex flex-col justify-center pt-2">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-3xl font-bold text-white tracking-wide">{getPokemonDisplayName(pokemon.id)}</h2>
              <span className={isMale ? 'text-blue-400 text-xl' : 'text-pink-400 text-xl'}>{isMale ? '♂' : '♀'}</span>
            </div>

            <span className="text-slate-300 text-base font-medium mb-3">Lv. {pokemon.level}</span>

            <div className="flex items-center gap-2 mb-8">
              {pokemon.types.map((t) => {
                const b = TYPE_BADGE[t];
                return (
                  <span
                    key={t}
                    className="px-3 py-1 text-xs font-bold rounded-md text-white"
                    style={{ backgroundColor: b.bg }}
                  >
                    {locale === 'he' ? b.he : b.en}
                  </span>
                );
              })}
            </div>

            {/* Header HP Bar */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold w-6">HP</span>
              <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${hpPct * 100}%`, backgroundColor: hpColor(pokemon.hp, pokemon.maxHp) }}
                />
              </div>
            </div>
            <div className="text-slate-300 text-sm font-mono tabular-nums ml-10 mt-1">
              {pokemon.hp} / {pokemon.maxHp}
            </div>
          </div>

          {/* Column 3: Metadata List */}
          <div className="w-64 shrink-0 flex flex-col gap-4 text-sm pt-2">
            <div>
              <div className="text-slate-400 mb-1">Nature</div>
              <div className="text-slate-200 flex gap-1">
                {natureName}
                {natureDef?.increasedStat && natureDef?.decreasedStat && (
                  <span className="text-slate-400">
                    (<span className="text-green-400">+{statShort[natureDef.increasedStat]}</span>,{' '}
                    <span className="text-red-400">-{statShort[natureDef.decreasedStat]}</span>)
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-slate-400 mb-1">ID No.</div>
              <div className="text-slate-200 font-mono">123456</div>
            </div>

            <div>
              <div className="text-slate-400 mb-1">Held Item</div>
              {pokemon.heldItemId ? (
                <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-1.5 mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🪨</span> {/* Mock icon */}
                    <span className="text-slate-200">{pokemon.heldItemId}</span>
                  </div>
                  <button className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>
              ) : (
                <div className="text-slate-500">None</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- TABS NAV --- */}
      <div className="flex px-8 border-b border-slate-800 shrink-0">
        {[
          { id: 'stats', label: 'Stats' },
          { id: 'moveset', label: 'Moveset' },
          { id: 'held_items', label: 'Held Items' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-8 py-4 text-sm font-semibold transition-colors relative ${
              tab === t.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: primaryType.color }} />
            )}
          </button>
        ))}
      </div>

      {/* --- TAB CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#111218]">
        {tab === 'stats' && <StatsTab pokemon={pokemon} />}
        {tab === 'moveset' && <MovesetTab pokemon={pokemon} />}
        {tab === 'held_items' && <HeldItemsTab pokemon={pokemon} />}
      </div>
    </div>
  );
}
