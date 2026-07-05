import { useState } from 'react';
import { TYPE_BADGE } from '../../../../data/type-constants';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import { type MoveData } from '../../../../services/pokemon-data';
import type { Move, PokemonType } from '../../../../types';
import { TypeBadge } from '../../../../ui-react/componenets/Typebadge';
import { MoveMetaPanel } from '../../../party/components/InspectorPanel/tabs/MovesetTab';

interface MovesTabProps {
  learnset: { move: MoveData; level: number }[];
  tmLearnset: { move: MoveData }[];
}

type MoveSub = 'level' | 'tm';

export function MovesTab({ learnset, tmLearnset }: MovesTabProps) {
  const { t, locale, isRTL } = useI18n();
  const [sub, setSub] = useState<MoveSub>('level');

  const [selectedMove, setSelectedMove] = useState<Move | null>(null);

  function MoveRow({
    move,
    badgeText,
    isSelected,
    onSelect,
    showBadgeComponent = false,
  }: {
    move: MoveData;
    badgeText: string;
    isSelected: boolean;
    onSelect: () => void;
    showBadgeComponent?: boolean;
  }) {
    return (
      <tr
        onClick={onSelect}
        className={`cursor-pointer transition-colors duration-150 ${
          isSelected ? 'bg-zinc-800' : 'border-b border-zinc-900 last:border-none hover:bg-zinc-900/50'
        }`}
      >
        {/* עמודה 1: רמה או TM */}
        <td className="py-2.5 pe-2 font-mono text-xs text-zinc-500">{badgeText}</td>

        {/* עמודה 2: שם המהלך + נקודה זוהרת */}
        <td className="py-2.5 pe-2 text-zinc-200">
          <div className="flex items-center">
            <span
              className="me-2 inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: TYPE_BADGE[move.type as PokemonType].bg || TYPE_BADGE[move.type as PokemonType].color,
                boxShadow: `0 0 6px ${TYPE_BADGE[move.type as PokemonType].color}`,
              }}
            />
            <span>{move.name[locale]}</span>
          </div>
        </td>

        {/* עמודה 3: סוג המהלך (אלמנט) */}
        <td className="py-2.5">
          {showBadgeComponent ? (
            <TypeBadge type={move.type as PokemonType} locale={locale} />
          ) : (
            <span
              className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black/80"
              style={{ backgroundColor: TYPE_BADGE[move.type as PokemonType].color }}
            >
              {move.type}
            </span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setSub('level')}
            className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
              sub === 'level'
                ? 'border-red-500/60 bg-red-950/40 text-red-300'
                : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('pokedex.moves.byLevel')}
          </button>
          <button
            type="button"
            onClick={() => setSub('tm')}
            className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
              sub === 'tm'
                ? 'border-red-500/60 bg-red-950/40 text-red-300'
                : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('pokedex.moves.canLearn')}
          </button>
        </div>

        <table dir={isRTL ? 'rtl' : 'ltr'} className="w-full border-collapse text-sm">
          <thead>
            <tr
              className={`border-b border-zinc-800 font-mono text-[10px] uppercase tracking-wide text-zinc-500 ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <th className="pb-2 pe-2 font-normal">
                {sub === 'level' ? (isRTL ? 'רמה' : 'Learned') : isRTL ? 'מקור' : 'Source'}
              </th>
              <th className="pb-2 pe-2 font-normal">{isRTL ? 'מהלך' : 'Move'}</th>
              <th className="pb-2 font-normal">{isRTL ? 'סוג' : 'Type'}</th>
            </tr>
          </thead>
          <tbody>
            {sub === 'level'
              ? learnset.map((m) => (
                  <MoveRow
                    key={m.move.id}
                    move={m.move}
                    badgeText={isRTL ? `רמה ${m.level}` : `Lv. ${m.level}`}
                    isSelected={selectedMove?.id === m.move.id}
                    onSelect={() => setSelectedMove(m.move as any)}
                    showBadgeComponent={true} // מציג את קומפוננטת ה-TypeBadge
                  />
                ))
              : tmLearnset.map((m) => (
                  <MoveRow
                    key={m.move.id}
                    move={m.move}
                    badgeText="TM"
                    isSelected={selectedMove?.id === m.move.id}
                    onSelect={() => setSelectedMove(m.move as any)}
                    showBadgeComponent={false} // מציג את ה-span הפשוט של ה-TM
                  />
                ))}
          </tbody>
        </table>
      </div>
      {selectedMove && (
        <div
          onClick={() => setSelectedMove(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue/70"
        >
          <div className="relative w-full max-w-md rounded-lg bg-zinc-900 p-6">
            <MoveMetaPanel move={selectedMove} />
          </div>
        </div>
      )}
    </>
  );
}
