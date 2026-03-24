/**
 * Pokeball data registry — defines all pokeball types with their properties.
 * Reusable for: party screen icons, catch mechanics, shop display, etc.
 */

export interface PokeballDef {
  id: string;
  name: { en: string; he: string };
  description: { en: string; he: string };
  catchRate: number;       // multiplier (1 = normal, 1.5 = great, 2 = ultra)
  price: number;           // 0 = not purchasable
  topColor: string;        // top half color for drawing
}

export const POKEBALLS: Record<string, PokeballDef> = {
  'poke-ball': {
    id: 'poke-ball',
    name: { en: 'Poké Ball', he: 'כדור פוקימון' },
    description: { en: 'A standard ball for catching Pokemon.', he: 'כדור רגיל ללכידת פוקימונים.' },
    catchRate: 1,
    price: 200,
    topColor: '#e03030',
  },
  'great-ball': {
    id: 'great-ball',
    name: { en: 'Great Ball', he: 'כדור מעולה' },
    description: { en: 'A good ball with a higher catch rate.', he: 'כדור טוב עם סיכוי לכידה גבוה יותר.' },
    catchRate: 1.5,
    price: 600,
    topColor: '#3060e0',
  },
  'ultra-ball': {
    id: 'ultra-ball',
    name: { en: 'Ultra Ball', he: 'כדור אולטרה' },
    description: { en: 'A high-performance ball with excellent catch rate.', he: 'כדור עילית עם סיכוי לכידה מצוין.' },
    catchRate: 2,
    price: 1200,
    topColor: '#e0c020',
  },
  'master-ball': {
    id: 'master-ball',
    name: { en: 'Master Ball', he: 'כדור אב' },
    description: { en: 'The ultimate ball that never fails.', he: 'הכדור המושלם שלעולם לא מפספס.' },
    catchRate: 255,
    price: 0,
    topColor: '#8040c0',
  },
};

/** Get a pokeball definition by ID. */
export function getPokeball(id: string): PokeballDef | undefined {
  return POKEBALLS[id];
}

/** Get the default pokeball (poke-ball). */
export function getDefaultPokeball(): PokeballDef {
  return POKEBALLS['poke-ball'];
}
