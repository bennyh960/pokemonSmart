import { useEffect, useState } from 'react';
import {
  computePokemonSize,
  getAbilityDisplayName,
  getAbilityDisplayNameAndDescription,
} from '../../../../../services/pokemon-data';
import { calcHappiness, getHappinessLabel } from '../../../../../systems/happiness';
import type { Pokemon } from '../../../../../types';
import { useI18n } from '../../../../../ui-react/context/i18n-context';
import { getStatConfig } from '../../../../../utils/util';
import type { PartyMode } from '../../..';

export function InspectorStatsTab({
  pokemon,
  party,
  openPokedex,
  mode,
}: Readonly<{
  mode: PartyMode;
  pokemon: Pokemon;
  party: Pokemon[];
  openPokedex: (pokemonId: number) => void;
}>) {
  const { t, locale } = useI18n();

  const [happinessLabel, setHappinessLabel] = useState({ label: '', value: 0, color: '' });

  useEffect(() => {
    const happinessValue = calcHappiness(pokemon, party);
    const label = getHappinessLabel(happinessValue);

    setHappinessLabel({ label: label[locale], value: happinessValue, color: label.color });
  }, [pokemon]);

  const { heightM, weightKg } = computePokemonSize(pokemon);
  const statConfig = getStatConfig(pokemon);
  return (
    <div className="grid grid-cols-2 gap-6 p-4 h-full">
      {/* Left Column: Stat Bars */}
      <div className="flex flex-col justify-between bg-slate-900/30 p-5 border border-slate-800/40 rounded-xl">
        {statConfig.map((s) => (
          <div key={s.label} className="flex items-center text-sm">
            <span className="w-20 text-slate-400 font-medium">{t(s.key)}</span>
            <span className="w-10 text-white font-mono text-right mr-3">{s.val}</span>
            <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full ${s.color}`}
                style={{ width: `${Math.min((s.val / 255) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Right Column: Physical Details & Ability */}
      <div className="flex flex-col bg-slate-900/30 p-5 border border-slate-800/40 rounded-xl gap-4">
        <div className="grid grid-cols-2 gap-y-4 text-sm">
          <div>
            <div className="text-slate-500 mb-1">{t('party.weight')}</div>
            <div className="text-slate-200">{weightKg.toFixed(1) + ' ' + t('party.unit.kg')}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">{t('party.height')}</div>
            <div className="text-slate-200">{heightM.toFixed(2) + ' ' + t('party.unit.meter')}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex gap-2 items-baseline mb-2 text-sm">
            <div className="text-slate-500">{t('pokedex.info.abilities')}: </div>
            <div className="text-slate-200 font-medium">
              {pokemon.abilityId ? getAbilityDisplayName(pokemon.abilityId) : t('pokedex.info.noAbilities')}
            </div>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            {pokemon.abilityId
              ? getAbilityDisplayNameAndDescription(pokemon.abilityId)[1]
              : 'This Pokémon has no ability.'}
          </p>
          <div style={{ color: happinessLabel.color }} className="mt-3 text-xs text-slate-500 font-mono">
            {t('party.stats.happiness', { label: happinessLabel.label })}
          </div>
        </div>

        {mode.kind === 'overworld' && (
          <button
            onClick={() => openPokedex(pokemon.id)}
            className="w-full py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            {t('party.info.pokedexHint')}
            <span className="text-[10px]">↗</span>
          </button>
        )}
      </div>
    </div>
  );
}
