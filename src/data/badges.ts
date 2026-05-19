/**
 * Badge definitions — the 8 gym badges of Numeria.
 *
 * Each badge has an ID (1-8), bilingual name, the gym city,
 * gym leader name, and associated Pokemon type.
 * Badge ownership is stored as a bitmask in PlayerData.badges:
 *   badge 1 = bit 0 (0x01), badge 2 = bit 1 (0x02), etc.
 *
 * Sprites/icons are not yet defined — will be added when asset pipeline supports them.
 */

export interface BadgeDef {
  id: number; // 1-8
  name: { en: string; he: string };
  city: { en: string; he: string };
  leader: { en: string; he: string };
  type: string; // Pokemon type of the gym
  mathTopic: { en: string; he: string };
}

export const BADGES: BadgeDef[] = [
  {
    id: 1,
    name: { en: 'Sum Badge', he: 'תג הסכום' },
    city: { en: 'Sumville', he: 'סאמוויל' },
    leader: { en: 'Adder', he: 'אדר' },
    type: 'normal',
    mathTopic: { en: 'Addition', he: 'חיבור' },
  },
  {
    id: 2,
    name: { en: 'Difference Badge', he: 'תג ההפרש' },
    city: { en: 'Algebria', he: 'אלגבריה' },
    leader: { en: 'Minusan', he: 'מינוסאן' },
    type: 'poison',
    mathTopic: { en: 'Subtraction', he: 'חיסור' },
  },
  {
    id: 3,
    name: { en: 'Product Badge', he: 'תג המכפלה' },
    city: { en: 'Multitown', he: 'מולטיטאון' },
    leader: { en: 'Multina', he: 'מולטינה' },
    type: 'fire',
    mathTopic: { en: 'Multiplication', he: 'כפל' },
  },
  {
    id: 4,
    name: { en: 'Quotient Badge', he: 'תג המנה' },
    city: { en: 'Divideburg', he: 'דיווידבורג' },
    leader: { en: 'Divider', he: 'מורטי דיבון' },
    type: 'psychic',
    mathTopic: { en: 'Division', he: 'חילוק' },
  },
  {
    id: 5,
    name: { en: 'Fraction Badge', he: 'תג השבר' },
    city: { en: 'Fractalis City', he: 'עיר השבר' },
    leader: { en: 'Sir Fract', he: 'דון שבריז' },
    type: 'steel',
    mathTopic: { en: 'Fractions', he: 'שברים' },
  },
  {
    id: 6,
    name: { en: 'Symmetry Badge', he: 'תג הסימטריה' },
    city: { en: 'Fractalis', he: 'פרקטליס' },
    leader: { en: 'Mirror', he: 'מירור' },
    type: 'ghost',
    mathTopic: { en: 'Mixed Operations', he: 'פעולות מעורבות' },
  },
  {
    id: 7,
    name: { en: 'Formula Badge', he: 'תג הנוסחה' },
    city: { en: 'Logica Heights', he: 'לוגיקה הייטס' },
    leader: { en: 'Formula', he: 'פורמולה' },
    type: 'dragon',
    mathTopic: { en: 'Order of Operations', he: 'סדר פעולות' },
  },
  {
    id: 8,
    name: { en: 'Absolute Badge', he: 'תג הערך המוחלט' },
    city: { en: 'Infinity Plateau', he: 'רמת האינסוף' },
    leader: { en: 'Absolut', he: 'אבסולוט' },
    type: 'dark',
    mathTopic: { en: 'All Operations (Advanced)', he: 'כל הפעולות (מתקדם)' },
  },
];

/** Get a badge definition by ID (1-8). */
export function getBadge(id: number): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

/** Check if a player has a specific badge (from bitmask). */
export function hasBadge(badgesBitmask: number, badgeId: number): boolean {
  return (badgesBitmask & (1 << (badgeId - 1))) !== 0;
}

/** Get all badges a player has earned (from bitmask). */
export function getEarnedBadges(badgesBitmask: number): BadgeDef[] {
  return BADGES.filter((b) => hasBadge(badgesBitmask, b.id));
}

/** Count how many badges a player has earned. */
export function countBadges(badgesBitmask: number): number {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    if (badgesBitmask & (1 << i)) count++;
  }
  return count;
}
