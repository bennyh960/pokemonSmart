import { useState } from 'react';
import type { Move, Pokemon } from '../../../../types/index.js';
import { TYPE_BADGE } from '../../../../data/type-constants.js';
import { useDragSort } from '../../../../ui-react/hooks/useDragSort.js';
import { useI18n } from '../../../../ui-react/context/i18n-context.js';
import { getMove } from '../../../../services/pokemon-data.js';

// ── Damage class pill ────────────────────────────────────────────────────────
const DAMAGE_CLASS: Record<string, { label: string; color: string }> = {
  physical: { label: 'Physical', color: '#e07040' },
  special: { label: 'Special', color: '#8060e0' },
  status: { label: 'Status', color: '#5080a0' },
};

// ── Empty slot ───────────────────────────────────────────────────────────────
function EmptyMoveSlot() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-800/50 bg-slate-900/20 flex items-center justify-center min-h-[72px] opacity-40">
      <span className="text-slate-600 text-xs">—</span>
    </div>
  );
}

function MoveCard({
  move,
  index,
  isSelected,
  isDragging,
  dragHandlers,
  onClick,
}: {
  move: Move;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  dragHandlers: {
    onDragStart: (i: number) => void;
    onDragOver: (e: React.DragEvent, i: number) => void;
    onDragEnd: () => void;
  };
  onClick: () => void;
}) {
  const badge = TYPE_BADGE[move.type] ?? TYPE_BADGE['normal'];
  const ppPct = move.pp > 0 ? move.currentPp / move.pp : 0;
  const ppColor = ppPct > 0.5 ? '#4ade80' : ppPct > 0.25 ? '#facc15' : '#f87171';

  // badge.bg is rgba(..., 0.15) — too subtle for a background.
  // Use badge.color (the solid hue) at controlled opacity instead.
  const solidColor = badge.color; // e.g. '#a8a878'

  return (
    <div
      draggable
      onDragStart={() => dragHandlers.onDragStart(index)}
      onDragOver={(e) => dragHandlers.onDragOver(e, index)}
      onDragEnd={dragHandlers.onDragEnd}
      onClick={onClick}
      className={[
        'relative rounded-xl cursor-pointer select-none overflow-hidden',
        'flex flex-col justify-between min-h-[60px] px-3 pt-2.5 pb-2',
        'border-2 transition-all duration-150',
        isDragging ? 'opacity-40 scale-95' : '',
        isSelected ? 'scale-[1.02]' : 'hover:brightness-110',
      ].join(' ')}
      style={{
        // Use the solid color at readable opacity — matches image 1 style
        background: `linear-gradient(135deg, ${solidColor}55 0%, ${solidColor}22 100%)`,
        borderColor: isSelected ? solidColor : `${solidColor}44`,
        boxShadow: isSelected ? `0 0 12px ${solidColor}44` : 'none',
      }}
    >
      {/* Top row: name + type badge — matches image 1 layout */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-white font-bold text-[13px] leading-tight drop-shadow-sm line-clamp-2 flex-1">
          {move.name}
        </span>
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0 mt-0.5"
          style={{
            backgroundColor: `${solidColor}44`,
            border: `1px solid ${solidColor}66`,
            color: '#fff',
          }}
        >
          {badge.en}
        </span>
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
    </div>
  );
}

// ── Metadata panel ────────────────────────────────────────────────────────────
function MoveMetaPanel({ move }: { move: Move | null }) {
  const { locale } = useI18n();

  if (!move) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800/50 bg-slate-900/20">
        <span className="text-slate-600 text-xs text-center px-4">Select a move to see details</span>
      </div>
    );
  }

  const badge = TYPE_BADGE[move.type] ?? TYPE_BADGE['normal'];
  const data = getMove(move.id);
  const dmgData = DAMAGE_CLASS[data?.damageClass ?? 'status'];

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
          <span className="text-white font-bold text-sm drop-shadow-sm truncate">{move.name}</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0 bg-black/30 text-white/90">
            {badge.en}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 pb-2 shrink-0">
        {/* Power */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Power</span>
          <span className="text-white font-mono font-bold text-sm mt-0.5">{data?.power ?? '—'}</span>
        </div>
        {/* PP */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">PP</span>
          <span className="text-white font-mono font-bold text-sm mt-0.5">
            {move.currentPp}/{move.pp}
          </span>
        </div>
        {/* Accuracy */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Accuracy</span>
          <span className="text-white font-mono font-bold text-sm mt-0.5">
            {data?.accuracy != null ? `${data.accuracy}%` : '—'}
          </span>
        </div>
        {/* Damage class */}
        <div className="flex flex-col bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Class</span>
          <span className="font-bold text-sm mt-0.5" style={{ color: dmgData.color }}>
            {dmgData.label}
          </span>
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
}

export function MovesetTab({ pokemon, onMoveReorder }: Props) {
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
              isSelected={selectedIdx === i}
              isDragging={draggingIndex === i}
              dragHandlers={{
                onDragStart: wrappedDragStart,
                onDragOver,
                onDragEnd: wrappedDragEnd,
              }}
              onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
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
