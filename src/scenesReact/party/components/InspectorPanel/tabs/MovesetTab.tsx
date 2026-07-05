import { useState } from 'react';
import type { Move, Pokemon } from '../../../../../types/index.js';
import { TYPE_BADGE } from '../../../../../data/type-constants.js';
import { useDragSort } from '../../../../../ui-react/hooks/useDragSort.js';
import { useI18n } from '../../../../../ui-react/context/i18n-context.js';
import { getMove, getMoveDisplayName } from '../../../../../services/pokemon-data.js';
import { DAMAGE_CLASS_ICON } from '../../../../../utils/util.js';
import type { PartyMode } from '../../../index.js';
import { TypeBadge } from '../../../../../ui-react/componenets/Typebadge.js';

// ── Empty slot ───────────────────────────────────────────────────────────────
function EmptyMoveSlot() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-800/50 bg-slate-900/20 flex items-center justify-center min-h-[72px] opacity-40">
      <span className="text-slate-600 text-xs">—</span>
    </div>
  );
}

interface MoveCardProps {
  move: Move;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  dragHandlers: null | {
    onDragStart: (i: number) => void;
    onDragOver: (e: React.DragEvent, i: number) => void;
    onDragEnd: () => void;
  };
  onClick?: () => void;
  isMoveToDelete?: boolean;
}

export function MoveCard({
  move,
  index,
  isSelected,
  isDragging,
  dragHandlers,
  isMoveToDelete,
  onClick,
}: MoveCardProps) {
  const { locale } = useI18n();
  const badge = TYPE_BADGE[move.type] ?? TYPE_BADGE['normal'];
  const ppPct = move.pp > 0 ? move.currentPp / move.pp : 0;
  const ppColor = ppPct > 0.5 ? '#4ade80' : ppPct > 0.25 ? '#facc15' : '#f87171';

  // badge.bg is rgba(..., 0.15) — too subtle for a background.
  // Use badge.color (the solid hue) at controlled opacity instead.
  const solidColor = badge.color; // e.g. '#a8a878'

  const isDeleteSelected = isMoveToDelete && isSelected;

  return (
    <button
      draggable
      onDragStart={() => dragHandlers?.onDragStart(index)}
      onDragOver={(e) => dragHandlers?.onDragOver(e, index)}
      onDragEnd={dragHandlers?.onDragEnd}
      onClick={onClick}
      className={[
        'relative rounded-xl cursor-pointer select-none overflow-hidden',
        'flex flex-col justify-between min-h-[60px] px-3 pt-2.5 pb-2',
        'border-2 transition-all duration-150',
        isDragging ? 'opacity-40 scale-95' : '',
        isSelected ? 'scale-[1.02]' : 'hover:brightness-110',
        isDeleteSelected ? 'bg-stripes-red brightness-75 animate-pulse' : '',
      ].join(' ')}
      style={{
        borderColor: isDeleteSelected ? '#ef4444' : isSelected ? solidColor : `${solidColor}44`,
        boxShadow: isDeleteSelected
          ? '0 0 16px rgba(239, 68, 68, 0.6)'
          : isSelected
            ? `0 0 12px ${solidColor}44`
            : 'none',
        backgroundColor: isDeleteSelected
          ? 'rgba(239, 68, 68, 0.15)'
          : `linear-gradient(135deg, ${solidColor}55 0%, ${solidColor}22 100%)`,
      }}
    >
      {/* Top row: name + type badge — matches image 1 layout */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-white font-bold text-[13px] leading-tight drop-shadow-sm line-clamp-2 flex-1">
          {getMoveDisplayName(move.id)}
        </span>
        <TypeBadge type={move.type} dim={false} locale={locale} color="black" />
      </div>

      {/* Bottom row: PP bar + PP text — matches image 1 */}
      <div className="flex flex-col gap-1 mt-1.5">
        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${ppPct * 100}%`, backgroundColor: ppColor }}
          />
        </div>
        <span className="text-white/60 text-[10px] font-mono">
          PP: {move.currentPp}/{move.pp}
        </span>
      </div>
    </button>
  );
}

// ── Metadata panel ────────────────────────────────────────────────────────────
export function MoveMetaPanel({ move, deleteMode }: { deleteMode?: boolean; move: Move | null }) {
  const { locale, t } = useI18n();

  if (!move) {
    const dict = {
      normalMode: {
        en: 'Select a move to see details',
        he: 'בחר מהלך כדי לראות פרטים',
      },
      deleteMode: {
        en: 'Select a move to delete',
        he: 'בחר מהלך למחיקה',
      },
    };
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800/50 bg-slate-900/20">
        <span className="text-slate-600 text-xs text-center px-4">
          {dict[deleteMode ? 'deleteMode' : 'normalMode'][locale]}
        </span>
      </div>
    );
  }

  const badge = TYPE_BADGE[move.type] ?? TYPE_BADGE['normal'];
  const data = getMove(move.id);
  const dmgData = DAMAGE_CLASS_ICON[data?.damageClass ?? 'status'];

  return (
    <div
      className="flex flex-col h-full rounded-2xl border-2 overflow-hidden"
      style={{
        borderColor: badge.border,
        background: `linear-gradient(160deg, ${badge.bg}22 0%, transparent 60%)`,
      }}
    >
      {/* Header strip */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ background: `linear-gradient(90deg, ${badge.bg}cc, ${badge.bg}44)` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-white font-bold text-sm drop-shadow-sm truncate">{getMoveDisplayName(move.id)}</span>
          <TypeBadge type={move.type} dim={false} locale={locale} color="white" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 pb-2 shrink-0">
        {/* Power */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{t('party.moves.header.pow')}</span>
          <span className="text-white font-mono font-bold text-sm mt-0.5">{data?.power ?? '—'}</span>
        </div>
        {/* PP */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{t('party.moves.header.pp')}</span>
          <span className="text-white font-mono font-bold text-sm mt-0.5">
            {move.currentPp}/{move.pp}
          </span>
        </div>
        {/* Accuracy */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">{t('party.moves.header.acc')}</span>
          <span className="text-white font-mono font-bold text-sm mt-0.5">
            {data?.accuracy != null ? `${data.accuracy}%` : '—'}
          </span>
        </div>
        {/* Damage class */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">
            {t('party.moves.header.class')} {dmgData.icon}
          </span>
          <span className="font-bold text-white text-sm mt-0.5">{dmgData.label[locale]}</span>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 min-h-0">
        {data?.description ? (
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {data.description[locale] ?? data.description.en}
          </p>
        ) : (
          <p className="text-slate-600 text-[11px] italic">No description available.</p>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
interface Props {
  pokemon: Pokemon;
  onMoveReorder: (moves: Move[]) => void;
  setSelectedMoveToDelete: (move: Move | null) => void;
  selectedMoveToDelete: Move | null;
  mode: PartyMode;
}

export function MovesetTab({ pokemon, onMoveReorder, setSelectedMoveToDelete, selectedMoveToDelete, mode }: Props) {
  const moves = pokemon.moves;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleReorder = (next: Move[]) => {
    setDraggingIndex(null);
    // keep selection on the same move after reorder
    if (selectedIdx !== null) {
      const movedUuid = moves[selectedIdx]?.id;
      const newIdx = next.findIndex((m) => m.id === movedUuid);
      setSelectedIdx(newIdx !== -1 ? newIdx : 0);
    }
    onMoveReorder(next);
  };

  const { onDragStart, onDragOver, onDragEnd } = useDragSort(moves, handleReorder);

  const wrappedDragStart = (i: number) => {
    setDraggingIndex(i);
    onDragStart(i);
  };
  const wrappedDragEnd = () => {
    setDraggingIndex(null);
    onDragEnd();
  };

  // Pad to 8 slots
  const slots = Array.from({ length: 8 }, (_, i) => moves[i] ?? null);
  const selectedMove = selectedIdx !== null ? (moves[selectedIdx] ?? null) : null;

  return (
    <div className="flex gap-4 p-4 h-full overflow-hidden">
      {/* LEFT: 2×4 move grid */}
      <div className="flex-[5] grid grid-cols-2 grid-rows-4 gap-2 content-start">
        {slots.map((move, i) => {
          if (!move) return <EmptyMoveSlot key={`empty-${i}`} />;
          return (
            <MoveCard
              key={`${move.id}-${i}`}
              move={move}
              index={i}
              isMoveToDelete={
                selectedMoveToDelete?.id === move.id && mode.kind === 'move-learning' && !mode.session.learned
              }
              isSelected={selectedIdx === i}
              isDragging={mode.kind !== 'overworld' && draggingIndex === i}
              dragHandlers={
                mode.kind !== 'overworld'
                  ? null
                  : {
                      onDragStart: wrappedDragStart,
                      onDragOver,
                      onDragEnd: wrappedDragEnd,
                    }
              }
              onClick={() => {
                setSelectedIdx(selectedIdx === i ? null : i);
                setSelectedMoveToDelete?.(selectedIdx === i ? null : move);
              }}
            />
          );
        })}
      </div>

      {/* RIGHT: metadata panel */}
      <div className="flex-[4] min-h-0">
        <MoveMetaPanel move={selectedMove} />
      </div>
    </div>
  );
}
