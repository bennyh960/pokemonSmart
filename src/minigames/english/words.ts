/**
 * The English word bank (`src/data/english-words.json`) — kid-level words for 8–10 year olds, close to the
 * Pokémon world. Type and move words take their English / Hebrew from game data (TYPE_BADGE, moves.json);
 * the rest is teaching content (an agreed exception to "no hand-made lists").
 */

import rawWords from '../../data/english-words.json';
import { getItem } from '../../data/items.js';
import { TYPE_BADGE } from '../../data/type-constants.js';
import { getAllMoves } from '../../services/pokemon-data.js';
import type { PokemonType } from '../../types/index.js';
import type { Bilingual } from '../types.js';

export type WordTheme =
  | 'types'
  | 'moves'
  | 'world'
  | 'actions'
  | 'describe'
  | 'colors'
  | 'nature'
  | 'animals'
  | 'body'
  | 'food'
  | 'people'
  | 'numbers';

/** Theme names — the Hebrew is the category hint next to a board ("צבעים"). */
export const THEME_NAMES: Record<WordTheme, Bilingual> = {
  types: { en: 'Types', he: 'סוגים' },
  moves: { en: 'Moves', he: 'מהלכים' },
  world: { en: 'Pokémon world', he: 'עולם הפוקימון' },
  actions: { en: 'Actions', he: 'פעולות' },
  describe: { en: 'Describing words', he: 'מילים מתארות' },
  colors: { en: 'Colors & shapes', he: 'צבעים וצורות' },
  nature: { en: 'Nature', he: 'טבע' },
  animals: { en: 'Animals', he: 'חיות' },
  body: { en: 'Body', he: 'גוף' },
  food: { en: 'Food', he: 'אוכל' },
  people: { en: 'People', he: 'אנשים' },
  numbers: { en: 'Numbers', he: 'מספרים' },
};

/** 1 = first words, 3 = still easy but longer / less common. */
export type WordTier = 1 | 2 | 3;

/** What to show for a word: an item sprite, an emoji, or a colour swatch (colour words). */
export type WordPicture =
  { kind: 'item'; src: string } | { kind: 'emoji'; emoji: string } | { kind: 'swatch'; color: string };

export interface Word {
  id: string;
  /** Lower-case English (what is spoken and spelled). */
  en: string;
  he: string;
  /** How the English sounds, in Hebrew letters with niqqud (red → רֶד) — for kids who don't read English yet. */
  say: string;
  theme: WordTheme;
  tier: WordTier;
  picture: WordPicture;
  /** Set for type words (the Pokémon type it names). */
  typeId?: PokemonType;
}

interface RawWord {
  id: string;
  theme: string;
  tier: number;
  en?: string;
  he?: string;
  say?: string;
  emoji?: string;
  swatch?: string;
  item?: string;
  typeId?: string;
  move?: string;
}

/** Longest word used in spelling tasks (tier 1–2 words stay within it). */
export const MAX_SPELL_LENGTH = 8;

function resolve(raw: RawWord): Word {
  let en = raw.en;
  let he = raw.he;
  if (raw.typeId) {
    const badge = TYPE_BADGE[raw.typeId as PokemonType];
    if (!badge) throw new Error(`english-words: unknown type "${raw.typeId}"`);
    en = badge.en;
    he = badge.he;
  }
  if (raw.move) {
    const move = getAllMoves().find((m) => m.name.en.toLowerCase() === raw.move!.toLowerCase());
    if (!move) throw new Error(`english-words: unknown move "${raw.move}"`);
    en = move.name.en;
    he = move.name.he;
  }
  let picture: WordPicture | undefined;
  if (raw.item) {
    const item = getItem(raw.item);
    if (!item?.sprite) throw new Error(`english-words: item "${raw.item}" has no sprite`);
    picture = { kind: 'item', src: item.sprite };
  } else if (raw.swatch) {
    picture = { kind: 'swatch', color: raw.swatch };
  } else if (raw.emoji) {
    picture = { kind: 'emoji', emoji: raw.emoji };
  }
  if (!en || !he || !raw.say || !picture) throw new Error(`english-words: "${raw.id}" needs en, he, say and a picture`);
  return {
    id: raw.id,
    en: en.toLowerCase(),
    he,
    say: raw.say,
    theme: raw.theme as WordTheme,
    tier: raw.tier as WordTier,
    picture,
    typeId: raw.typeId as PokemonType | undefined,
  };
}

let cached: Word[] | null = null;

/** Every word, resolved once per session. */
export function getWords(): Word[] {
  return (cached ??= (rawWords as RawWord[]).map(resolve));
}

export function getWord(id: string): Word | undefined {
  return getWords().find((w) => w.id === id);
}

/** Words of these themes up to a tier. */
export function wordsFor(themes: readonly WordTheme[] | 'all', maxTier: WordTier): Word[] {
  return getWords().filter((w) => w.tier <= maxTier && (themes === 'all' || themes.includes(w.theme)));
}

/** Words that can be spelled letter by letter (one word, letters only, not too long). */
export function isSpellable(w: Word): boolean {
  return /^[a-z]+$/.test(w.en) && w.en.length <= MAX_SPELL_LENGTH;
}
