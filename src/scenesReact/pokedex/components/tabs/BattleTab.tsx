import { useMemo } from 'react';
import type { PokedexPokemon } from '../../types';
import type { PokemonType } from '../../../../types';
import { getAllTypes, getTypeEffectiveness } from '../../../../services/pokemon-data';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import { TYPE_BADGE } from '../../../../data/type-constants';
import { getContrastTextColor } from '../../../../utils/util';

interface BattleTabProps {
  pokemon: PokedexPokemon;
}

interface TypeMult {
  type: PokemonType;
  mult: number;
}

interface MatchupGroups {
  weakTo: TypeMult[];
  resists: TypeMult[];
  immune: PokemonType[];
  strongVs: PokemonType[];
}

function computeBattleMatchups(pokemonTypes: PokemonType[]): MatchupGroups {
  const allTypes = getAllTypes() as PokemonType[];
  const weakTo: TypeMult[] = [];
  const resists: TypeMult[] = [];
  const immune: PokemonType[] = [];
  const strongVs: PokemonType[] = [];

  for (const atkType of allTypes) {
    let mult = 1;
    for (const defType of pokemonTypes) {
      mult *= getTypeEffectiveness(atkType, defType);
    }
    if (mult >= 2) weakTo.push({ type: atkType, mult });
    else if (mult > 0 && mult < 1) resists.push({ type: atkType, mult });
    else if (mult === 0) immune.push(atkType);
  }

  // Sort so the scariest weaknesses / best resists surface first.
  weakTo.sort((a, b) => b.mult - a.mult);
  resists.sort((a, b) => a.mult - b.mult);

  for (const myType of pokemonTypes) {
    for (const defType of allTypes) {
      const eff = getTypeEffectiveness(myType, defType);
      if (eff >= 2 && !strongVs.includes(defType)) {
        strongVs.push(defType);
      }
    }
  }

  return { weakTo, resists, immune, strongVs };
}

function formatMult(mult: number): string {
  if (mult === 4) return '×4';
  if (mult === 2) return '×2';
  if (mult === 0.5) return '×½';
  if (mult === 0.25) return '×¼';
  return `×${mult}`;
}

export function BattleTab({ pokemon }: BattleTabProps) {
  const { t, locale } = useI18n();
  const pokemonTypes = pokemon.types as PokemonType[];

  const { weakTo, resists, immune, strongVs } = useMemo(() => computeBattleMatchups(pokemonTypes), [pokemonTypes]);

  function renderBadge(type: PokemonType, mult?: number) {
    const typeData = TYPE_BADGE[type];
    const color = typeData?.color ?? '#a8a878';
    const label = typeData ? typeData[locale] : type.toUpperCase();
    const textColor = getContrastTextColor(color);

    return (
      <span
        key={type}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
        style={{ backgroundColor: color, color: textColor }}
      >
        {label}
        {mult !== undefined && <span style={{ color: textColor, opacity: 0.7 }}>{formatMult(mult)}</span>}
      </span>
    );
  }

  function renderSection<T extends PokemonType | TypeMult>(
    label: string,
    items: T[],
    accent: string,
    getType: (item: T) => PokemonType,
    getMult: (item: T) => number | undefined,
  ) {
    return (
      <div>
        <h4 className="mb-2.5 font-mono text-xs uppercase tracking-widest" style={{ color: accent }}>
          {label}
        </h4>
        {items.length === 0 ? (
          <span className="font-mono text-xs text-zinc-600">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">{items.map((item) => renderBadge(getType(item), getMult(item)))}</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
      <div className="mb-5 font-mono text-xs uppercase tracking-widest text-zinc-500">{t('pokedex.tabs.battle')}</div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {renderSection(
          t('pokedex.type.weakTo'),
          weakTo,
          '#f87171',
          (i) => i.type,
          (i) => i.mult,
        )}
        {renderSection(
          t('pokedex.type.resists'),
          resists,
          '#34d399',
          (i) => i.type,
          (i) => i.mult,
        )}
        {renderSection(
          t('pokedex.type.immune'),
          immune,
          '#38bdf8',
          (i) => i,
          () => undefined,
        )}
        {renderSection(
          t('pokedex.type.strongVs'),
          strongVs,
          '#fbbf24',
          (i) => i,
          () => undefined,
        )}
      </div>
    </div>
  );
}
