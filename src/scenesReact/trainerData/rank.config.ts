export interface RankLabel {
  en: string;
  he: string;
}

export interface RankConfig {
  id: string;
  minExp: number;
  label: RankLabel;
  perk: RankLabel;
  badge: string;
  theme: {
    bg: string;
    text: string;
  };
  // Technical predicate for the calculation logic
  checkRequirements?: (data: {
    caughtCount: number;
    badgesEarned: number;
    leagueWon: number;
    seenCount: number;
  }) => boolean;
  // Human-readable requirements for the UI tooltip
  requirementsDesc?: RankLabel;
}

// 1. SINGLE SOURCE OF TRUTH FOR ALL RANK DATA
export const TRAINER_RANKS: RankConfig[] = [
  {
    id: 'rookie',
    minExp: 0,
    badge: '🥈',
    theme: { bg: 'from-slate-800 to-slate-900 border-slate-700', text: 'text-slate-300' },
    label: { en: 'Rookie', he: 'טירון' },
    perk: { en: 'Start your journey!', he: 'תחילת המסע שלך!' },
  },
  {
    id: 'amateur',
    minExp: 1000,
    badge: '🥉',
    theme: { bg: 'from-orange-900/40 to-slate-900 border-orange-800/40', text: 'text-orange-400' },
    label: { en: 'Amateur', he: 'חובבן' },
    perk: { en: 'Unlocks Ultra Balls in shops', he: 'פתיחת אולטרה-בול בחנויות' },
  },
  {
    id: 'pro',
    minExp: 3500,
    badge: '🥈',
    theme: { bg: 'from-cyan-950 to-slate-900 border-cyan-800/50', text: 'text-cyan-400' },
    label: { en: 'Pro', he: 'מקצוען' },
    checkRequirements: (d) => d.caughtCount > 20 && d.badgesEarned >= 4,
    requirementsDesc: { en: 'Caught > 20 & 4+ Badges', he: 'ללכוד מעל 20 וגם 4 תגים לפחות' },
    perk: { en: 'Pokémon up to Lv.40 obey you', he: 'פוקימונים עד רמה 40 יישמעו לך' },
  },
  {
    id: 'expert',
    minExp: 8000,
    badge: '🥇',
    theme: { bg: 'from-emerald-950 to-slate-900 border-emerald-800/50', text: 'text-emerald-400' },
    label: { en: 'Expert', he: 'מומחה' },
    checkRequirements: (d) => d.caughtCount > 30 && d.badgesEarned >= 6,
    requirementsDesc: { en: 'Caught > 30 & 6+ Badges', he: 'ללכוד מעל 30 וגם 6 תגים לפחות' },
    perk: { en: 'Allow switching pokemon abilities', he: 'אפשרות להחליף יכולות של פוקימון' },
  },
  {
    id: 'elite',
    minExp: 15000,
    badge: '💎',
    theme: {
      bg: 'from-purple-950 to-slate-900 border-purple-800/50 shadow-purple-500/5',
      text: 'text-purple-400 animate-pulse',
    },
    label: { en: 'Elite', he: 'עלית' },
    checkRequirements: (d) => d.badgesEarned >= 8 && d.caughtCount > 50,
    requirementsDesc: { en: 'Caught > 50 & 8 Badges', he: 'ללכוד מעל 50 וגם 8 תגים לפחות' },
    perk: { en: 'Allow meeting with mythical Pokémon', he: 'אפשרות לפגוש פוקימונים מיתיים ונדירים ביותר' },
  },
  {
    id: 'master',
    minExp: 30000,
    badge: '👑',
    theme: {
      bg: 'from-amber-950 via-slate-900 to-indigo-950 border-amber-500/40 shadow-amber-500/10',
      text: 'text-amber-400 font-extrabold tracking-widest',
    },
    label: { en: 'Master', he: 'מאסטר' },
    checkRequirements: (d) => d.leagueWon >= 5 && d.caughtCount > 75,
    requirementsDesc: { en: 'Caught > 75 & 5 League Wins', he: 'ללכוד מעל 75 וגם 5 ניצחונות בליגה' },
    perk: { en: 'Unlocks Secret Mewtwo Mythic Island', he: 'גישה לאי המיתולוגי הסודי של מיוטו!' },
  },
  {
    id: 'legendary',
    minExp: 50000, // Fixed mismatched 60,000 in your old code to match 50,000 logic
    badge: '🌌',
    theme: {
      bg: 'bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-cyan-600/20 border-fuchsia-500/50 animate-pulse shadow-xl shadow-fuchsia-500/10',
      text: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-fuchsia-400 to-cyan-400 font-black tracking-wider',
    },
    label: { en: 'Legendary', he: 'אגדי' },
    checkRequirements: (d) => d.seenCount >= 251 && d.leagueWon >= 7 && d.caughtCount > 150,
    requirementsDesc: {
      en: '251 Seen, Caught > 150 & 7 League Wins',
      he: 'ראית 251, לכדת מעל 150 וגם 7 ניצחונות בליגה',
    },
    perk: { en: 'Mew encounter', he: 'מפגש עם מיו האגדי' },
  },
];
