import type { Pokemon } from '../../../../types';
import { getNatureStrings, getPokemonSpriteUrl } from '../../../../utils/util';
import { TYPE_BADGE } from '../../../../data/type-constants';
import { getPokemonDisplayName } from '../../../../services/pokemon-data';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import { getItem } from '../../../../data/items';
import { useMemo, type CSSProperties } from 'react';
import type { PartyMode } from '../..';
import useGetPokemonSprite from '../../../../ui-react/hooks/useGetPokemonSprite';

interface InspectorHeaderProps {
  pokemon: Pokemon;
  isPokedexMode: boolean;
  mode: PartyMode;
  onEquipItem: (uuid: string, itemId: string) => void;
}

export function InspectorHeader({ pokemon, isPokedexMode, mode, onEquipItem }: InspectorHeaderProps) {
  const { locale, t } = useI18n();

  const { sprite } = useGetPokemonSprite(pokemon.id, 'front');

  const displayName = getPokemonDisplayName(pokemon.id);

  const types = pokemon.types ?? [];
  const natureString = getNatureStrings(pokemon);

  const primaryColor = types[0] ? (TYPE_BADGE[types[0]]?.color ?? '#a855f7') : '#a855f7';

  const secondaryColor = types[1] ? (TYPE_BADGE[types[1]]?.color ?? primaryColor) : primaryColor;

  const hpPercentage = pokemon.maxHp > 0 ? Math.max(0, Math.min(100, (pokemon.hp / pokemon.maxHp) * 100)) : 0;
  const pulseFrequency = 0.5 + (hpPercentage / 100) * 3;

  const item = pokemon.heldItemId ? getItem(pokemon.heldItemId) : null;

  const itemData = {
    name: item ? item.name?.[locale] : t('party.heldItem.noneHeld'),
    imgUrl: item?.sprite ?? '',
  };

  /**
   * 🌈 AURA (kept strong + breathing)
   */
  const auraStyle: CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      inset: '-60%',
      background: `
      radial-gradient(circle at 20% 40%, ${primaryColor}B3 0%, transparent 45%),
      radial-gradient(circle at 30% 60%, ${secondaryColor}B3 0%, transparent 50%),
      radial-gradient(circle at 25% 50%, ${primaryColor}CC 0%, transparent 70%),
      radial-gradient(circle at 40% 30%, ${secondaryColor}99 0%, transparent 60%),
      radial-gradient(circle at 35% 55%, ${primaryColor}99 0%, transparent 65%)
    `,
      filter: 'blur(28px)',
      mixBlendMode: 'screen' as const,
      opacity: 0.9,
      pointerEvents: 'none',
      animation: `pulse ${pulseFrequency}s ease-in-out infinite`,
      transform: 'scale(1.05)',
      transformOrigin: '25% 50%',
    }),
    [primaryColor, secondaryColor, hpPercentage],
  );

  const renderedTypes = types.map((typeName) => (
    <span
      key={typeName}
      className="
        px-2 py-0.5
        text-xs font-bold
        rounded-sm
        backdrop-blur-md
        bg-slate-950/85
        border
        shadow-sm
      "
      style={{
        color: TYPE_BADGE[typeName]?.color,
        borderColor: `${TYPE_BADGE[typeName]?.border}99`,
      }}
    >
      {TYPE_BADGE[typeName]?.[locale]}
    </span>
  ));

  return (
    <div
      className="
        flex
        flex-col
        lg:flex-row
        bg-slate-900
        border
        border-slate-800
        rounded-2xl
        overflow-hidden
        m-4
        relative
      "
    >
      {/* ================= LEFT ================= */}
      <div className="flex-1 flex flex-col sm:flex-row items-center p-4 relative overflow-visible">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div style={auraStyle} />
        </div>

        {/* 🌫️ SOFT BREATHING MASK (IMPORTANT FIX) */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div
            className="
              w-full h-full
              bg-[radial-gradient(circle_at_20%_50%,rgba(15,23,42,0.15),rgba(15,23,42,0.75)_75%)]
            "
          />
        </div>

        {/* SPRITE */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 relative z-20 flex items-center justify-center">
          {sprite && (
            <img
              src={sprite}
              alt={displayName}
              className="
              w-full h-full
              object-contain
              pixelated
              drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)]
            "
            />
          )}
        </div>

        {/* INFO */}
        <div className="flex-1 sm:ml-6 mt-4 sm:mt-0 relative z-20">
          <h2 className="text-xl font-bold text-white">{displayName}</h2>

          <div className="text-sm text-slate-300 mb-2">Lv. {pokemon.level}</div>

          <div className="flex gap-2 mb-4 flex-wrap">{renderedTypes}</div>

          {/* HP */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">HP</span>

            <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
              <div
                className="
                  h-full
                  bg-green-500
                  shadow-[0_0_10px_rgba(34,197,94,0.6)]
                "
                style={{ width: `${hpPercentage}%` }}
              />
            </div>
          </div>

          <div dir="ltr" className="text-xs text-slate-300 mt-1 text-center">
            {pokemon.hp} / {pokemon.maxHp}
          </div>
        </div>
      </div>

      {/* ================= RIGHT ================= */}
      {!isPokedexMode && (
        <div
          className="
            w-full
            lg:w-64
            border-t lg:border-t-0 lg:border-l
            border-slate-800/60
            bg-slate-900/80
            backdrop-blur-md
            p-4
            flex flex-col gap-3
            text-sm
            relative
            z-20
          "
        >
          <div>
            <div className="text-slate-500 text-xs">{t('party.nature')}</div>

            <div className="text-slate-200">
              <span className="text-green-400">{natureString.localName}</span>
              <span className="text-slate-400 text-xs ml-1">{natureString.natureHint}</span>
            </div>
          </div>

          <div>
            <div className="text-slate-500 text-xs">Pokédex No.</div>
            <div className="text-slate-200">#{pokemon.id}</div>
          </div>

          {item && mode.kind !== 'battle' && (
            <div>
              <div className="text-slate-500 text-xs">{t('party.heldItem.equipHint')}</div>

              <div
                className="
              flex items-center justify-between
              bg-slate-950/60
              border border-slate-800/80
              rounded
              px-2 py-1.5
              mt-1
            "
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    <img src={itemData.imgUrl} />
                  </span>{' '}
                  {/* Replace with actual item icon */}
                  <span className="text-slate-300 text-xs font-medium">{itemData.name}</span>
                </div>

                <button
                  onClick={() => {
                    console.log(pokemon.uuid, item.id);
                    onEquipItem(pokemon.uuid, item.id);
                  }}
                  type="button"
                  className="text-slate-500 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
