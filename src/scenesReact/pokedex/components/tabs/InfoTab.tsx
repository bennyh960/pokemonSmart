import type { PokedexPokemon } from '../../types';
import { getStatConfig } from '../../../../utils/util';
import type { Pokemon } from '../../../../types';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import type { PokemonAbilityDetail } from '../../../../services/pokemon-data';

const MAX_STAT = 150;

interface InfoTabProps {
  pokemon: PokedexPokemon;
  abilities: PokemonAbilityDetail[];
}

export function InfoTab({ pokemon, abilities }: InfoTabProps) {
  const { t, locale } = useI18n();
  const statConfig = getStatConfig({
    maxHp: pokemon.stats.hp,
    attack: pokemon.stats.attack,
    defense: pokemon.stats.defense,
    specialAttack: pokemon.stats.specialAttack,
    specialDefense: pokemon.stats.specialDefense,
    speed: pokemon.stats.speed,
  } as Pokemon);
  const statEntries = Object.entries(pokemon.stats) as [keyof PokedexPokemon['stats'], number][];
  const total = statEntries.reduce((sum, [, v]) => sum + v, 0);
  console.log(pokemon);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
        <div className="mb-4 font-mono font-bold text-xs uppercase tracking-widest text-zinc-500">
          {t('party.baseStats')}
        </div>
        {statConfig.map((s) => (
          <div key={s.key} className="mb-2.5 grid grid-cols-[54px_1fr_36px] items-center gap-3">
            <span className="font-mono text-[11px] text-zinc-500">{t(s.key)}</span>
            <div className="h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-400"
                style={{ width: `${Math.min(100, (s.val / MAX_STAT) * 100)}%` }}
              />
            </div>
            <span className="text-right font-mono text-xs text-zinc-300">{s.val}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-dashed border-zinc-800 pt-3 font-mono text-xs text-amber-400">
          <span>{t('common.total')}</span>
          <span>{total}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500 font-bold">
          {t('pokedex.info.abilities')}
        </div>
        {abilities.map((a) => (
          <div key={a.id} className="mb-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              {a.name[locale]}
              {a.isHidden && (
                <span className="rounded-full border border-amber-400/40 px-2 py-0.5 font-mono text-[9px] text-amber-400">
                  {t('pokedex.info.hiddenAbility')}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{a.description[locale]}</p>
          </div>
        ))}

        <div className="mt-5 border-t border-dashed border-zinc-800 pt-4 font-mono text-xs uppercase tracking-widest text-zinc-100 font-bold">
          {t('pokedex.info.physicalDetails')}
        </div>
        <div className="mt-2 text-xs leading-relaxed text-zinc-500">
          {locale === 'en' ? pokemon.description : 'בגרסה הבאה אוסיף'}
        </div>
      </div>
    </div>
  );
}
