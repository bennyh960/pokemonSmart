/**
 * Trainer rank — XP calculation, earned-rank flags and perk lookup.
 *
 * A rank is earned once (flag `rank-<id>`) and never lost, so every perk check is a
 * single flag read. `updateTrainerRank()` is the only place that sets those flags; the
 * overworld calls it on a short timer while idle (playtime counts as XP).
 */

import {
  TRAINER_RANKS,
  RANK_XP_SOURCES,
  RANK_STAT_LABELS,
  RANK_FEATURES,
  type RankConfig,
  type RankFeatureId,
  type RankId,
  type RankPerks,
  type RankStats,
  type BilingualLabel,
} from '../data/trainer-ranks.js';
import { BADGES, hasBadge } from '../data/badges.js';
import { getItem, getItemsByCategory, type ItemDef } from '../data/items.js';
import { getCaughtCount } from '../scenesReact/pokedex/utils/helpers.js';
import { tBoth } from '../i18n/i18n.js';
import type { PlayerData } from '../types/index.js';
import { setFlag } from './game-state.js';

export const rankFlag = (id: RankId): string => `rank-${id}`;

const RANK_INDEX = new Map(TRAINER_RANKS.map((r, i) => [r.id, i]));

export function getRankIndex(id: RankId): number {
  return RANK_INDEX.get(id) ?? 0;
}

export function getRank(id: RankId): RankConfig {
  return TRAINER_RANKS[getRankIndex(id)];
}

// ─── XP ──────────────────────────────────────────────────────────────────────

export function getRankStats(pd: PlayerData): RankStats {
  let heldItems = pd.party.filter((p) => p.heldItemId).length;
  for (const box of pd.boxes) heldItems += box.pokemon.filter((p) => p?.heldItemId).length;
  return {
    seen: Object.keys(pd.pokedex).length,
    caught: getCaughtCount(pd),
    badges: BADGES.filter((badge) => hasBadge(pd.badges, badge.id)).length,
    steps: pd.totalSteps,
    playtime: pd.playtime,
    heldItems,
    leagueWins: pd.hallOfFame?.length ?? 0,
  };
}

export function calcRankXp(stats: RankStats): number {
  return RANK_XP_SOURCES.reduce((sum, src) => sum + src.points * Math.floor(stats[src.stat] / (src.per ?? 1)), 0);
}

function meetsRank(rank: RankConfig, xp: number, stats: RankStats): boolean {
  if (xp < rank.minExp) return false;
  return Object.entries(rank.requires ?? {}).every(([stat, min]) => stats[stat as keyof RankStats] >= (min ?? 0));
}

/** Highest rank earned so far (from flags — O(ranks), no XP math). */
export function getEarnedRankIndex(pd: PlayerData): number {
  for (let i = TRAINER_RANKS.length - 1; i > 0; i--) {
    if (pd.flags[rankFlag(TRAINER_RANKS[i].id)]) return i;
  }
  return 0;
}

export function hasRank(pd: PlayerData, id: RankId): boolean {
  return getEarnedRankIndex(pd) >= getRankIndex(id);
}

/** Full rank snapshot for UI: the rank shown is the higher of the live and the earned rank. */
export function getTrainerRank(pd: PlayerData): { rank: RankConfig; index: number; xp: number; stats: RankStats } {
  const stats = getRankStats(pd);
  const xp = calcRankXp(stats);
  let index = getEarnedRankIndex(pd);
  for (let i = TRAINER_RANKS.length - 1; i > index; i--) {
    if (meetsRank(TRAINER_RANKS[i], xp, stats)) {
      index = i;
      break;
    }
  }
  return { rank: TRAINER_RANKS[index], index, xp, stats };
}

/** Ranks reached but not yet announced to the player (drained by the rank-up call). */
let _unannounced: RankConfig[] = [];

/**
 * Set flags for every newly reached rank and queue them for the rank-up call.
 * Safe to call from anywhere (e.g. right before a rank gate check).
 */
export function updateTrainerRank(pd: PlayerData): void {
  const before = getEarnedRankIndex(pd);
  const { index } = getTrainerRank(pd);
  for (const rank of TRAINER_RANKS.slice(before + 1, index + 1)) {
    setFlag(pd, rankFlag(rank.id));
    _unannounced.push(rank);
  }
}

export function hasUnannouncedRanks(): boolean {
  return _unannounced.length > 0;
}

/** Take the queued ranks (lowest first) and clear the queue. */
export function takeUnannouncedRanks(): RankConfig[] {
  const ranks = _unannounced;
  _unannounced = [];
  return ranks;
}

// ─── Perks ───────────────────────────────────────────────────────────────────

type NumericPerk = 'catchBonus' | 'throwSpins' | 'obeyLevel';

function perkValueAt<K extends NumericPerk>(index: number, key: K): number | undefined {
  for (let i = index; i >= 0; i--) {
    const v = TRAINER_RANKS[i].perks[key];
    if (v !== undefined) return v;
  }
  return undefined;
}

/** Value of a numeric perk for the player's earned rank. */
export function getPerkValue(pd: PlayerData, key: NumericPerk): number | undefined {
  return perkValueAt(getEarnedRankIndex(pd), key);
}

/** First rank whose perks include a feature. */
export function getFeatureRank(feature: keyof typeof RANK_FEATURES): RankConfig | undefined {
  return TRAINER_RANKS.find((r) => r.perks.features?.includes(feature));
}

/** First rank at which every Pokémon obeys. */
export function getObeyAllRank(): RankConfig | undefined {
  return TRAINER_RANKS.find((r) => r.perks.obeyLevel === Infinity);
}

/** Items a rank's shop perk unlocks (single items + whole categories). */
export function getRankShopItems(perks: RankPerks): ItemDef[] {
  const items = (perks.shopItems ?? []).map((id) => getItem(id)).filter((i): i is ItemDef => !!i);
  for (const cat of perks.shopCategories ?? []) items.push(...getItemsByCategory(cat).filter((i) => i.price > 0));
  return items;
}

/** Item id → rank that unlocks it in shops. Built once. */
let _itemRank: Map<string, number> | null = null;
function itemRankIndex(itemId: string): number {
  if (!_itemRank) {
    _itemRank = new Map();
    TRAINER_RANKS.forEach((r, i) => getRankShopItems(r.perks).forEach((item) => _itemRank!.set(item.id, i)));
  }
  return _itemRank.get(itemId) ?? 0;
}

export function isShopItemUnlocked(pd: PlayerData, itemId: string): boolean {
  return getEarnedRankIndex(pd) >= itemRankIndex(itemId);
}

// ─── Generated text ──────────────────────────────────────────────────────────

/**
 * One perk a rank adds. `text` id picks the wording ("first" vs "even more"): `rank.perk.<text>` is the short
 * Trainer Card label, `rank.say.<text>` is how the professor says it on the phone.
 */
type PerkLine = { kind: string; text: string };

function rankPerkLines(rank: RankConfig): PerkLine[] {
  const index = getRankIndex(rank.id);
  const { perks } = rank;
  const lines: PerkLine[] = [];
  const before = TRAINER_RANKS.slice(0, index);
  const changed = (key: NumericPerk) => perks[key] !== undefined && perks[key] !== perkValueAt(index - 1, key);

  if (getRankShopItems(perks).length) {
    const first = !before.some((r) => getRankShopItems(r.perks).length);
    lines.push({ kind: 'shop', text: first ? 'shop' : 'shopMore' });
  }
  if (changed('catchBonus') && perks.catchBonus! > 1) {
    const first = (perkValueAt(index - 1, 'catchBonus') ?? 1) <= 1;
    lines.push({ kind: 'catch', text: first ? 'catch' : 'catchMore' });
  }
  if (changed('obeyLevel')) {
    const text =
      perks.obeyLevel === Infinity ? 'obeyAll' : perkValueAt(index - 1, 'obeyLevel') === undefined ? 'obey' : 'obeyMore';
    lines.push({ kind: 'obey', text });
  }
  for (const f of perks.features ?? []) lines.push({ kind: f, text: f });
  return lines;
}

const perkLabel = ({ kind, text }: PerkLine): BilingualLabel =>
  kind in RANK_FEATURES ? RANK_FEATURES[kind as RankFeatureId].label : tBoth(`rank.perk.${text}`);

/** Short perk labels of one rank (Trainer Card, lab advisor). */
export function describeRankPerks(rank: RankConfig): BilingualLabel[] {
  return rankPerkLines(rank).map(perkLabel);
}

/** The professor's spoken lines for a rank's perks. Feature unlocks are left out — the call explains those itself. */
export function sayRankPerks(rank: RankConfig): BilingualLabel[] {
  return rankPerkLines(rank)
    .filter((l) => !(l.kind in RANK_FEATURES))
    .map((l) => tBoth(`rank.say.${l.text}`));
}

/** Perks active at a rank — one line per perk (the latest wording wins). */
export function describeActivePerks(index: number): BilingualLabel[] {
  const byKind = new Map<string, BilingualLabel>();
  for (const rank of TRAINER_RANKS.slice(0, index + 1)) {
    for (const line of rankPerkLines(rank)) byKind.set(line.kind, perkLabel(line));
  }
  return [...byKind.values()];
}

const joinLabels = (labels: BilingualLabel[], sep: string): BilingualLabel => ({
  en: labels.map((l) => l.en).join(sep),
  he: labels.map((l) => l.he).join(sep),
});

/** Trainer points as shown to the player ("8,000 Trainer Points"). */
export function formatTrainerPoints(points: number): BilingualLabel {
  return tBoth('rank.points', { points: points.toLocaleString() });
}

function rankGoalParts(rank: RankConfig): BilingualLabel[] {
  return Object.entries(rank.requires ?? {}).map(([stat, min]) =>
    tBoth('rank.req.stat', { count: min!, stat: RANK_STAT_LABELS[stat as keyof RankStats] }),
  );
}

/** Counter goals of a rank, no points: "31 Pokémon caught, 6 badges" — undefined when it has none. */
export function describeRankGoals(rank: RankConfig): BilingualLabel | undefined {
  const parts = rankGoalParts(rank);
  return parts.length ? joinLabels(parts, ', ') : undefined;
}

/** Full requirement line for the Trainer Card roadmap: "8,000 Trainer Points · 31 Pokémon caught · 6 badges" */
export function describeRankRequirements(rank: RankConfig): BilingualLabel {
  return joinLabels([formatTrainerPoints(rank.minExp), ...rankGoalParts(rank)], ' · ');
}

/** How many trainer-point sources are suggested to the player (highest points first). */
const GROW_TIP_COUNT = 3;

/** "winning the Pokémon League, giving your Pokémon items to hold, earning gym badges" */
export function describeGrowTips(): BilingualLabel {
  const top = [...RANK_XP_SOURCES].sort((a, b) => b.points - a.points).slice(0, GROW_TIP_COUNT);
  return joinLabels(
    top.map((s) => s.tip),
    ', ',
  );
}

/** Rank a flag stands for (`rank-expert` → expert), or undefined for any other flag. */
export function rankFromFlag(flag: string | undefined): RankConfig | undefined {
  return flag ? TRAINER_RANKS.find((r) => rankFlag(r.id) === flag) : undefined;
}

/**
 * Lab rank advisor: the player's rank, what is still missing for the next one (counters only —
 * missing points are "more training"), how to grow, and what the next rank unlocks.
 * Call `updateTrainerRank` first.
 */
export function rankAdviceLines(pd: PlayerData): BilingualLabel[] {
  const { rank, index, xp, stats } = getTrainerRank(pd);
  const lines = [tBoth('rank.advice.status', { rank: rank.label })];
  const next = TRAINER_RANKS[index + 1];
  if (!next) return [...lines, tBoth('rank.advice.top')];

  lines.push(tBoth('rank.advice.missing', { rank: next.label }));
  for (const [stat, min] of Object.entries(next.requires ?? {})) {
    const have = stats[stat as keyof RankStats];
    if (have < min!) {
      lines.push(tBoth('rank.advice.missingStat', { count: min! - have, stat: RANK_STAT_LABELS[stat as keyof RankStats] }));
    }
  }
  if (xp < next.minExp) lines.push(tBoth('rank.advice.missingTraining'));
  lines.push(tBoth('rank.advice.tips', { tips: describeGrowTips() }));
  const perks = describeRankPerks(next);
  if (perks.length) lines.push(tBoth('rank.advice.nextPerks', { rank: next.label }), ...perks);
  lines.push(tBoth('rank.gate.hint'));
  return lines;
}

/** Lines that tell the player a rank is needed (used by any rank-gated NPC). */
export function rankRequiredLines(pd: PlayerData, required: RankId): BilingualLabel[] {
  return [
    tBoth('rank.gate.required', {
      rank: getRank(required).label,
      playerRank: TRAINER_RANKS[getEarnedRankIndex(pd)].label,
    }),
    tBoth('rank.gate.hint'),
  ];
}
