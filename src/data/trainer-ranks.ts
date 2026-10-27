/**
 * Trainer ranks — single source of truth for rank thresholds, requirements and perks.
 *
 * Logic (XP calculation, rank flags, perk lookup, generated perk text) lives in
 * `src/systems/trainer-rank.ts`. Everything player-visible about a perk is derived
 * from the data below — never write perk text by hand.
 */

import type { ItemCategory } from './item-defs.js';

export interface BilingualLabel {
  en: string;
  he: string;
}

export type RankId = 'rookie' | 'amateur' | 'pro' | 'expert' | 'elite' | 'master' | 'legendary';

/** Counters the rank system reads from PlayerData. */
export type RankStatId = 'seen' | 'caught' | 'badges' | 'steps' | 'playtime' | 'heldItems' | 'leagueWins';
export type RankStats = Record<RankStatId, number>;

/** Unlocks that are not a number or an item list — explained by `RANK_FEATURES`. */
export type RankFeatureId = 'ability-swap' | 'legendary-beasts-birds' | 'legendary-mewtwo-lugia-hooh' | 'legendary-mew';

/**
 * What a rank unlocks. Numeric perks are absolute values for that rank (not deltas):
 * the player always gets the value of the highest rank they earned that defines it.
 * List perks (shop, features) add up across all earned ranks.
 */
export interface RankPerks {
  /** Item slugs that shops sell only from this rank. */
  shopItems?: string[];
  /** Whole item categories that shops sell only from this rank. */
  shopCategories?: ItemCategory[];
  /** Multiplier on the wild capture chance. */
  catchBonus?: number;
  /** Full ball rotations during the throw (a skilled throw also flies faster). */
  throwSpins?: number;
  /** Pokémon at or below this level always obey. Infinity = every Pokémon obeys. */
  obeyLevel?: number;
  features?: RankFeatureId[];
}

export interface RankConfig {
  id: RankId;
  minExp: number;
  /** Minimum counters needed on top of the XP. */
  requires?: Partial<RankStats>;
  label: BilingualLabel;
  perks: RankPerks;
  badge: string;
  theme: {
    bg: string;
    text: string;
  };
}

export const TRAINER_RANKS: RankConfig[] = [
  {
    id: 'rookie',
    minExp: 0,
    badge: '🔰',
    theme: { bg: 'from-slate-800 to-slate-900 border-slate-700', text: 'text-slate-300' },
    label: { en: 'Rookie', he: 'טירון' },
    perks: { catchBonus: 1, throwSpins: 0, obeyLevel: 30 },
  },
  {
    id: 'amateur',
    minExp: 1000,
    badge: '🥉',
    theme: { bg: 'from-orange-900/40 to-slate-900 border-orange-800/40', text: 'text-orange-400' },
    label: { en: 'Amateur', he: 'חובבן' },
    perks: { shopItems: ['ultra-ball'], shopCategories: ['status-cure'], catchBonus: 1.03, throwSpins: 1 },
  },
  {
    id: 'pro',
    minExp: 3500,
    requires: { caught: 21, badges: 4 },
    badge: '🥈',
    theme: { bg: 'from-cyan-950 to-slate-900 border-cyan-800/50', text: 'text-cyan-400' },
    label: { en: 'Pro', he: 'מקצוען' },
    perks: { shopCategories: ['battle'], catchBonus: 1.06, throwSpins: 1, obeyLevel: 40 },
  },
  {
    id: 'expert',
    minExp: 8000,
    requires: { caught: 31, badges: 6 },
    badge: '🥇',
    theme: { bg: 'from-emerald-950 to-slate-900 border-emerald-800/50', text: 'text-emerald-400' },
    label: { en: 'Expert', he: 'מומחה' },
    perks: { catchBonus: 1.1, throwSpins: 2, obeyLevel: Infinity, features: ['ability-swap'] },
  },
  {
    id: 'elite',
    minExp: 15000,
    requires: { caught: 51, badges: 8 },
    badge: '💎',
    theme: {
      bg: 'from-purple-950 to-slate-900 border-purple-800/50 shadow-purple-500/5',
      text: 'text-purple-400 animate-pulse',
    },
    label: { en: 'Elite', he: 'עלית' },
    perks: { catchBonus: 1.15, throwSpins: 2, features: ['legendary-beasts-birds'] },
  },
  {
    id: 'master',
    minExp: 30000,
    requires: { caught: 76, leagueWins: 5 },
    badge: '👑',
    theme: {
      bg: 'from-amber-950 via-slate-900 to-indigo-950 border-amber-500/40 shadow-amber-500/10',
      text: 'text-amber-400 font-extrabold tracking-widest',
    },
    label: { en: 'Master', he: 'מאסטר' },
    perks: { catchBonus: 1.2, throwSpins: 3, features: ['legendary-mewtwo-lugia-hooh'] },
  },
  {
    id: 'legendary',
    minExp: 50000,
    requires: { seen: 251, caught: 151, leagueWins: 7 },
    badge: '🌌',
    theme: {
      bg: 'bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 border-fuchsia-500/50 animate-pulse shadow-xl shadow-fuchsia-500/10',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-fuchsia-400 to-cyan-400 font-black tracking-wider',
    },
    label: { en: 'Legendary', he: 'אגדי' },
    perks: { catchBonus: 1.25, throwSpins: 4, features: ['legendary-mew'] },
  },
];

/**
 * Where rank XP comes from: `points` for every `per` units of the stat.
 * `label` names the unit — used by the rank-up call to explain how to rank up.
 */
export const RANK_XP_SOURCES: { stat: RankStatId; points: number; per?: number; label: BilingualLabel }[] = [
  { stat: 'seen', points: 10, label: { en: 'every new Pokémon you see', he: 'כל פוקימון חדש שראית' } },
  { stat: 'caught', points: 20, label: { en: 'every Pokémon you catch', he: 'כל פוקימון שלכדת' } },
  { stat: 'badges', points: 200, label: { en: 'every gym badge', he: 'כל תג של מכון כושר' } },
  { stat: 'heldItems', points: 250, label: { en: 'every Pokémon holding an item', he: 'כל פוקימון שמחזיק חפץ' } },
  { stat: 'leagueWins', points: 500, label: { en: 'every League win', he: 'כל ניצחון בליגה' } },
  { stat: 'steps', points: 1, per: 100, label: { en: 'every 100 steps', he: 'כל 100 צעדים' } },
  { stat: 'playtime', points: 1, label: { en: 'every second you play', he: 'כל שנייה של משחק' } },
];

/** Labels for each counter — used in generated requirement text ("21 Pokémon caught"). */
export const RANK_STAT_LABELS: Record<RankStatId, BilingualLabel> = {
  seen: { en: 'Pokémon seen', he: 'פוקימונים שראית' },
  caught: { en: 'Pokémon caught', he: 'פוקימונים שלכדת' },
  badges: { en: 'badges', he: 'תגים' },
  steps: { en: 'steps', he: 'צעדים' },
  playtime: { en: 'seconds played', he: 'שניות משחק' },
  heldItems: { en: 'Pokémon holding items', he: 'פוקימונים שמחזיקים חפץ' },
  leagueWins: { en: 'League wins', he: 'ניצחונות בליגה' },
};

/** Text for feature unlocks. `explain` is spoken by the professor; `hint` says where to go. */
export const RANK_FEATURES: Record<
  RankFeatureId,
  { label: BilingualLabel; explain: BilingualLabel[]; hint?: BilingualLabel }
> = {
  'ability-swap': {
    label: { en: 'Ability Tutors can change your Pokémon’s ability', he: 'מורי יכולות יכולים להחליף את היכולת של הפוקימון' },
    explain: [
      {
        en: 'Every Pokémon has an ability — a special power that works in battle on its own.',
        he: 'לכל פוקימון יש יכולת — כוח מיוחד שפועל לבד בזמן קרב.',
      },
      {
        en: 'Now that you are an Expert, an Ability Tutor will swap it for another ability your Pokémon can have.',
        he: 'עכשיו כשאתה מומחה, מורה יכולות יחליף אותה ביכולת אחרת שהפוקימון שלך יכול לקבל.',
      },
    ],
  },
  'legendary-beasts-birds': {
    label: { en: 'Meet the legendary birds and beasts', he: 'לפגוש את הציפורים והחיות האגדיות' },
    explain: [
      {
        en: 'Only Elite trainers may face the three legendary birds and the three legendary beasts.',
        he: 'רק מאמני עלית רשאים לפגוש את שלוש הציפורים האגדיות ואת שלוש החיות האגדיות.',
      },
    ],
    // TODO: point to the maps once the legendary encounters are built
    hint: { en: 'I am still searching for where they hide. I will call you when I know more!', he: 'אני עדיין מחפש איפה הם מסתתרים. אתקשר כשאדע יותר!' },
  },
  'legendary-mewtwo-lugia-hooh': {
    label: { en: 'Meet Mewtwo, Lugia and Ho-Oh', he: 'לפגוש את מיוטו, לוגיה והו-או' },
    explain: [
      {
        en: 'Only a Master may enter the caves of Mewtwo, Lugia and Ho-Oh.',
        he: 'רק מאסטר רשאי להיכנס למערות של מיוטו, לוגיה והו-או.',
      },
    ],
    hint: { en: 'Their caves are still a mystery to me. Stay tuned!', he: 'המערות שלהם עדיין תעלומה בשבילי. הישאר זמין!' },
  },
  'legendary-mew': {
    label: { en: 'Meet the mythical Mew', he: 'לפגוש את מיו המיתי' },
    explain: [
      {
        en: 'Only a Legendary trainer can find Mew, the rarest Pokémon of all.',
        he: 'רק מאמן אגדי יכול למצוא את מיו, הפוקימון הנדיר מכולם.',
      },
    ],
    hint: { en: 'Nobody knows where Mew lives… yet.', he: 'אף אחד לא יודע איפה מיו גר… עדיין.' },
  },
};

/** Obedience tuning — see `src/systems/obedience.ts`. */
export const OBEDIENCE = {
  /** Owning this many Pokémon at or above `trustedLevel` (ever) ends disobedience for good. */
  trustedCount: 2,
  trustedLevel: 40,
  /** Level gap (as a share of the strongest other Pokémon) at which a Pokémon always disobeys. */
  fullDisobeyGap: 0.5,
};

/** Hall of Fame keeps the last N League wins. */
export const HALL_OF_FAME_MAX = 99;
