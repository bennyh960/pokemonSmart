/**
 * InspectorPanel.tsx
 * Right-side (or bottom-sheet) detail panel for a selected Pokémon.
 *
 * Tabs: Moves (drag-drop 2×4 grid) | Stats (bars) | Held Item
 *
 * Top section always visible: large sprite, name, level, types, ball, status, nature/ability line.
 */
import { useState, useEffect } from 'react';
import { loadImage, getCachedImage } from '../../engine/sprite-loader.js';
import { useDragSort } from '../../ui-react/hooks/useDragSort.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { STATUS_LABEL, hpColor } from './PokemonCard.js';
import type { Pokemon, Move } from '../../types/index.js';
import { TYPE_BADGE } from '../../data/type-constants.js';

// ─── move category icons (unicode stand-ins) ─────────────────────────────────
const CATEGORY_ICON: Record<string, string> = {
  physical: '⚔️',
  special: '✨',
  status: '○',
};

// ─── stat config ─────────────────────────────────────────────────────────────
const STATS = [
  { key: 'hp', label: 'HP', color: '#4ade80' },
  { key: 'attack', label: 'ATK', color: '#f87171' },
  { key: 'defense', label: 'DEF', color: '#fb923c' },
  { key: 'specialAttack', label: 'SPA', color: '#818cf8' },
  { key: 'specialDefense', label: 'SPD', color: '#34d399' },
  { key: 'speed', label: 'SPE', color: '#facc15' },
] as const;

const MAX_STAT = 400; // visual ceiling for bar width

// ─── tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'moves' | 'stats' | 'item';

interface Props {
  pokemon: Pokemon;
  party: Pokemon[];
  onMoveReorder: (moves: Move[]) => void;
}

export function InspectorPanel({ pokemon, onMoveReorder }: Props) {
  const { t, locale, isRTL } = useI18n();
  const [tab, setTab] = useState<Tab>('moves');
  const [moves, setMoves] = useState<Move[]>([...pokemon.moves]);
  const [sprite, setSprite] = useState<string | null>(
    getCachedImage(`/sprites/pokemon/front/${pokemon.id}.png`)?.src ?? null,
  );

  const loadMoveData = () => {};

  // reset when selected pokémon changes
  useEffect(() => {
    setMoves([...pokemon.moves]);
    setTab('moves');
    let dead = false;
    loadImage(`/sprites/pokemon/front/${pokemon.id}.png`)
      .then((img) => {
        if (!dead) setSprite(img.src);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [pokemon.uuid, pokemon.id]);

  // move drag-drop
  const handleMoveReorder = (next: Move[]) => {
    setMoves(next);
    onMoveReorder(next);
  };
  const { onDragStart, onDragOver, onDragEnd } = useDragSort(moves, handleMoveReorder);

  const isFainted = pokemon.hp === 0;
  const primaryType = TYPE_BADGE[pokemon.types[0]];

  return (
    <div className="flex flex-col w-full h-full bg-slate-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── TOP: always-visible header ────────────────────────────────── */}
      <div className="shrink-0 p-5 relative overflow-hidden">
        {/* type glow bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 60% 0%, ${primaryType.color}18, transparent 70%)` }}
        />

        <div className="relative flex items-start gap-4">
          {/* large sprite */}
          <div
            className={`w-24 h-24 shrink-0 flex items-center justify-center
                           rounded-xl bg-slate-800/60 border border-slate-700/40
                           ${isFainted ? 'grayscale opacity-50' : ''}`}
          >
            {sprite ? (
              <img
                src={sprite}
                alt={pokemon.name}
                className="w-full h-full object-contain p-1"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-700 animate-pulse" />
            )}
          </div>

          {/* name / level / types */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-white text-xl font-bold truncate">{pokemon.name}</h2>
              <span className="text-slate-400 text-sm shrink-0">Lv.{pokemon.level}</span>
            </div>

            {/* types */}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {pokemon.types.map((type) => {
                const b = TYPE_BADGE[type];
                return (
                  <span
                    key={type}
                    className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: b.bg, border: `1px solid ${b.border}`, color: b.color }}
                  >
                    {locale === 'he' ? b.he : b.en}
                  </span>
                );
              })}
              {pokemon.status && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{
                    background: STATUS_LABEL[pokemon.status].color + '22',
                    border: `1px solid ${STATUS_LABEL[pokemon.status].color}55`,
                    color: STATUS_LABEL[pokemon.status].color,
                  }}
                >
                  {locale === 'he' ? STATUS_LABEL[pokemon.status].he : STATUS_LABEL[pokemon.status].en}
                </span>
              )}
            </div>

            {/* HP bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(0, pokemon.hp / pokemon.maxHp) * 100}%`,
                    backgroundColor: hpColor(pokemon.hp, pokemon.maxHp),
                    boxShadow: `0 0 8px ${hpColor(pokemon.hp, pokemon.maxHp)}88`,
                  }}
                />
              </div>
              <span className="text-slate-400 text-xs tabular-nums shrink-0">
                {pokemon.hp}/{pokemon.maxHp}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-slate-700/50 px-4">
        {(['moves', 'stats', 'item'] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
              tab === tabId
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {t(`party.tab.${tabId}`)}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* MOVES TAB — 2×4 drag-drop grid */}
        {tab === 'moves' && (
          <div className="grid grid-cols-2 gap-2">
            {moves.map((move, i) => {
              const moveType = move.type ? TYPE_BADGE[move.type as keyof typeof TYPE_BADGE] : null;
              return (
                <div
                  key={`${move.id}-${i}`}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDragEnd={onDragEnd}
                  className="flex flex-col gap-1 rounded-lg p-3 border border-slate-700/50
                             bg-slate-800/60 cursor-grab active:cursor-grabbing
                             hover:border-slate-600/60 transition-all select-none"
                  style={{
                    touchAction: 'none',
                    borderColor: moveType ? `${moveType.color}44` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-white text-sm font-semibold leading-tight truncate">{move.name}</span>
                    <span className="text-base shrink-0 leading-none">
                      {/* @ts-ignore */}
                      {move.category ? (CATEGORY_ICON[move.category] ?? '○') : '○'}
                    </span>
                  </div>
                  {moveType && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full self-start font-medium"
                      style={{ background: moveType.bg, border: `1px solid ${moveType.border}`, color: moveType.color }}
                    >
                      {locale === 'he' ? moveType.he : moveType.en}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(move.currentPp / move.pp) * 100}%`,
                          backgroundColor: moveType?.color ?? '#64748b',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                      {move.currentPp}/{move.pp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <div className="flex flex-col gap-3">
            {STATS.map(({ key, label, color }) => {
              const val = (pokemon[key as keyof Pokemon] as number) ?? 0;
              const pct = Math.min(1, val / MAX_STAT);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-8 shrink-0 text-end">{label}</span>
                  <div className="flex-1 h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct * 100}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}66`,
                      }}
                    />
                  </div>
                  <span className="text-white text-sm tabular-nums w-8 shrink-0">{val}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* HELD ITEM TAB */}
        {tab === 'item' && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            {pokemon.heldItemId ? (
              <>
                <div
                  className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700
                                flex items-center justify-center text-3xl"
                >
                  🎒
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">{pokemon.heldItemId}</p>
                  <p className="text-slate-500 text-sm mt-1">{t('party.item.equipped')}</p>
                </div>
                <button
                  className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-700/40
                                   text-red-300 text-sm hover:bg-red-800/40 transition-colors"
                >
                  {t('party.item.remove')}
                </button>
              </>
            ) : (
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700/40
                                flex items-center justify-center text-slate-600 text-3xl mx-auto mb-3"
                >
                  ○
                </div>
                <p className="text-slate-500 text-sm">{t('party.item.empty')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
