/**
 * Find the Pokémon — question generator (pure). "Find the BIG, SLOW WATER Pokémon": the clues are word-bank
 * words, checked against real Pokémon data (height, weight, speed, types), and exactly one option fits them all.
 */

import type { WordStats } from '../../english/learning.js';
import { wordWeight } from '../../english/learning.js';
import { pick, shuffle, type Rng } from '../../english/random.js';
import { getWord, wordsFor, type Word, type WordTier } from '../../english/words.js';
import type { HebrewHelp } from '../../english/help.js';
import { getAllPokemon } from '../../../services/pokemon-data.js';
import type { PokemonType } from '../../../types/index.js';

export type ClueKind = 'type' | 'adjective';

export interface FindConfig {
  questions: number;
  options: number;
  /** One entry per clue; adjectives always come from different traits (size / weight / speed). */
  clues: ClueKind[];
  maxTier: WordTier;
  hebrewHelp: HebrewHelp;
  /** Clue words the player may ask to translate, per question (unset = none). */
  hints?: number;
}

export interface FindPokemon {
  id: number;
  types: readonly PokemonType[];
  /** Height in decimetres, weight in hectograms (PokeAPI units). */
  height: number;
  weight: number;
  speed: number;
  attack: number;
}

/** The game's Pokémon with the data the clues need (skips any without height / weight). */
export function findPool(): FindPokemon[] {
  return getAllPokemon().flatMap((p) =>
    p.height === undefined || p.weight === undefined
      ? []
      : [{ id: p.id, types: p.types, height: p.height, weight: p.weight, speed: p.stats.speed, attack: p.stats.attack }],
  );
}

export type TraitGroup = 'size' | 'weight' | 'speed' | 'attack';

/**
 * An adjective clue: a bank word and the data test it stands for. The cards show the numbers,
 * so a wrong option must be clearly off (`miss`), not just under the line.
 */
interface Trait {
  wordId: string;
  group: TraitGroup;
  test: (p: FindPokemon) => boolean;
  miss: (p: FindPokemon) => boolean;
}

export const TRAITS: readonly Trait[] = [
  { wordId: 'big', group: 'size', test: (p) => p.height >= 15, miss: (p) => p.height <= 10 },
  { wordId: 'small', group: 'size', test: (p) => p.height <= 5, miss: (p) => p.height >= 9 },
  { wordId: 'heavy', group: 'weight', test: (p) => p.weight >= 1000, miss: (p) => p.weight <= 500 },
  { wordId: 'light', group: 'weight', test: (p) => p.weight <= 100, miss: (p) => p.weight >= 250 },
  { wordId: 'fast', group: 'speed', test: (p) => p.speed >= 90, miss: (p) => p.speed <= 65 },
  { wordId: 'slow', group: 'speed', test: (p) => p.speed <= 40, miss: (p) => p.speed >= 65 },
  { wordId: 'strong', group: 'attack', test: (p) => p.attack >= 100, miss: (p) => p.attack <= 70 },
];

/** The stats a level's cards show — every trait group its clues can use, so the clue word must be read. */
export function shownGroups(cfg: FindConfig): TraitGroup[] {
  if (!cfg.clues.includes('adjective')) return [];
  const groups = TRAITS.filter((t) => getWord(t.wordId)!.tier <= cfg.maxTier).map((t) => t.group);
  return [...new Set(groups)];
}

export interface Clue {
  word: Word;
  test: (p: FindPokemon) => boolean;
  /** Clearly does not fit (a wrong option must fail one clue this way). */
  miss: (p: FindPokemon) => boolean;
}

export interface FindQuestion {
  /** Adjectives first, then the type — English word order. */
  clues: Clue[];
  options: FindPokemon[];
  answer: number;
}

const MAX_TRIES = 200;

function typeClue(w: Word): Clue {
  const test = (p: FindPokemon) => p.types.includes(w.typeId!);
  return { word: w, test, miss: (p) => !test(p) };
}

function traitClue(t: Trait): Clue {
  return { word: getWord(t.wordId)!, test: t.test, miss: t.miss };
}

/** Clues for one target, or null if it has too few traits for this level. */
function cluesFor(
  rng: Rng,
  target: FindPokemon,
  kinds: readonly ClueKind[],
  typeWords: readonly Word[],
  traits: readonly Trait[],
): Clue[] | null {
  const adjectives: Clue[] = [];
  const usedGroups = new Set<string>();
  const fits = shuffle(
    rng,
    traits.filter((t) => t.test(target)),
  );
  let type: Clue | null = null;
  for (const kind of kinds) {
    if (kind === 'type') {
      const words = typeWords.filter((w) => target.types.includes(w.typeId!));
      if (words.length === 0) return null;
      type = typeClue(pick(rng, words));
    } else {
      const t = fits.find((x) => !usedGroups.has(x.group));
      if (!t) return null;
      usedGroups.add(t.group);
      adjectives.push(traitClue(t));
    }
  }
  return type ? [...adjectives, type] : adjectives;
}

export function generateFind(
  cfg: FindConfig,
  rng: Rng,
  pokemon: readonly FindPokemon[],
  stats: WordStats,
  today: string,
): FindQuestion[] {
  const typeWords = wordsFor(['types'], cfg.maxTier);
  const traits = TRAITS.filter((t) => getWord(t.wordId)!.tier <= cfg.maxTier);
  const out: FindQuestion[] = [];
  const usedTargets = new Set<number>();
  for (let tries = 0; out.length < cfg.questions && tries < MAX_TRIES * cfg.questions; tries++) {
    const target = pick(rng, pokemon);
    if (usedTargets.has(target.id)) continue;
    const clues = cluesFor(rng, target, cfg.clues, typeWords, traits);
    if (!clues) continue;
    // Words the player needs to practise make a question more likely to be kept
    const need = Math.max(...clues.map((c) => wordWeight(stats[c.word.id], today)));
    if (rng() * 5 > need + 1) continue;
    const others = shuffle(
      rng,
      pokemon.filter((p) => p.id !== target.id && clues.some((c) => c.miss(p))),
    ).slice(0, cfg.options - 1);
    if (others.length < cfg.options - 1) continue;
    const options = shuffle(rng, [target, ...others]);
    usedTargets.add(target.id);
    out.push({ clues, options, answer: options.indexOf(target) });
  }
  return out;
}
