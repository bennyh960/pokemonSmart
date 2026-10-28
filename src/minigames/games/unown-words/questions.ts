/**
 * Question generation for all 7 levels — pure (seeded rng + content in, questions out).
 *
 *   choice — one right answer among N options (L1 Letter Pop, L2 Big & Small, L3 First Sound, L5 Word Match)
 *   spell  — fill the word letter by letter (L4 Type Speller: full keyboard, L6 Scramble: only its tiles)
 *   order  — tap the words in sentence order (L7 Sentence Builder)
 */

import type { UnownTask, UnownWordsConfig } from './config.js';
import { ALPHABET, type PictureItem, type UnownContent, type WordPokemon } from './content.js';
import { firstSound, lookalikes, rhymesWith, soundsClash } from './phonics.js';
import { pick, sample, shuffle, type Rng } from './random.js';
import { buildSentence } from './sentences.js';

export interface Speech {
  kind: 'letter' | 'word';
  text: string;
}

export interface ChoiceOption {
  /** Compared against typed keys for letter options. */
  key: string;
  /** English label (letter glyph, word). */
  en: string;
  he?: string;
  pokemonId?: number;
  sprite?: string;
}

/** What a finished question teaches — saved into pd.miniGames['unown-words'].data.seen. */
export interface Learned {
  letters: string[];
  words: string[];
}

interface QuestionBase {
  task: UnownTask;
  /** Played when the question appears, on 🔊 and again after the answer. */
  speech: Speech;
  learned: Learned;
  /** Pokémon whose cry plays when it is the answer. */
  cryId?: number;
  /** Hebrew meaning of the answer (shown as Hebrew help). */
  helpHe?: string;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  /** A big glyph to look at (Big & Small). */
  show?: string;
  /** Options are letter glyphs, Pokémon or item pictures. */
  optionKind: 'letter' | 'pokemon' | 'item';
  options: ChoiceOption[];
  answer: number;
}

export interface SpellQuestion extends QuestionBase {
  kind: 'spell';
  /** Upper-case target word. */
  word: string;
  /** Scramble tiles (shuffled letters of `word`), or null → full A–Z keyboard. */
  tiles: string[] | null;
  /** Hint sprites with Hebrew names. */
  hints: { id: number; he: string }[];
  /** Type Speller speaks the next letter after each step (the original english-learning mechanic). */
  speakNextLetter: boolean;
}

export interface OrderQuestion extends QuestionBase {
  kind: 'order';
  words: string[];
  /** The same words, shuffled (never already in order). */
  tiles: string[];
  pokemonId?: number;
  item?: PictureItem;
}

export type Question = ChoiceQuestion | SpellQuestion | OrderQuestion;

const DEFAULT_CHOICES: Record<UnownTask, number> = {
  'letter-pop': 4,
  'big-small': 4,
  'first-sound': 3,
  'type-speller': 0,
  'word-match': 4,
  scramble: 0,
  sentence: 0,
};

const lower = (s: string) => s.toLowerCase();

/** Shuffles `answer` in among `distractors`; returns options + the answer's index. */
function placeAnswer<T>(rng: Rng, answer: T, distractors: T[]): { options: T[]; answer: number } {
  const options = shuffle(rng, [answer, ...distractors]);
  return { options, answer: options.indexOf(answer) };
}

/** Shuffle until the order differs from the original (when that is possible). */
function scramble<T>(rng: Rng, list: readonly T[], same: (a: T[], b: readonly T[]) => boolean): T[] {
  let out = shuffle(rng, list);
  for (let i = 0; i < 30 && same(out, list); i++) out = shuffle(rng, list);
  return out;
}
const sameSeq = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// ── L1 Letter Pop ───────────────────────────────────────────────────────────

function letterPop(rng: Rng, count: number, choices: number): ChoiceQuestion[] {
  return sample(rng, ALPHABET, count).map((letter) => {
    const others = sample(
      rng,
      ALPHABET.filter((l) => !rhymesWith(l, letter)),
      choices - 1,
    );
    const placed = placeAnswer(rng, letter, others);
    return {
      kind: 'choice',
      task: 'letter-pop',
      optionKind: 'letter',
      speech: { kind: 'letter', text: letter },
      learned: { letters: [letter], words: [] },
      options: placed.options.map((l) => ({ key: l, en: l.toUpperCase() })),
      answer: placed.answer,
    };
  });
}

// ── L2 Big & Small ──────────────────────────────────────────────────────────

function bigSmall(rng: Rng, count: number, choices: number): ChoiceQuestion[] {
  return sample(rng, ALPHABET, count).map((letter, i) => {
    const showCapital = i % 2 === 0; // alternate: B → b, then b → B
    // never offer i and l together — capital I and small l look the same
    const allowed = (l: string) => l !== letter && !('il'.includes(l) && 'il'.includes(letter));
    const look = shuffle(rng, lookalikes(letter).filter(allowed)).slice(0, Math.min(2, choices - 1));
    const rest = sample(
      rng,
      ALPHABET.filter((l) => allowed(l) && !look.includes(l)),
      choices - 1 - look.length,
    );
    const placed = placeAnswer(rng, letter, [...look, ...rest]);
    const glyph = (l: string) => (showCapital ? l : l.toUpperCase());
    return {
      kind: 'choice',
      task: 'big-small',
      optionKind: 'letter',
      show: showCapital ? letter.toUpperCase() : letter,
      speech: { kind: 'letter', text: letter },
      learned: { letters: [letter], words: [] },
      options: placed.options.map((l) => ({ key: l, en: glyph(l) })),
      answer: placed.answer,
    };
  });
}

// ── L3 First Sound ──────────────────────────────────────────────────────────

/** Pokémon grouped by a clear first sound (ambiguous starts — vowels, Ch/Sh/Ph… — are left out). */
export function pokemonBySound(pokemon: readonly WordPokemon[]): Map<string, WordPokemon[]> {
  const groups = new Map<string, WordPokemon[]>();
  for (const p of pokemon) {
    const s = firstSound(p.en);
    if (!s) continue;
    const g = groups.get(s);
    if (g) g.push(p);
    else groups.set(s, [p]);
  }
  return groups;
}

function firstSoundQuestions(rng: Rng, content: UnownContent, count: number, choices: number): ChoiceQuestion[] {
  const groups = pokemonBySound(content.pokemon);
  const sounds = [...groups.keys()];
  return sample(rng, sounds, count).map((sound) => {
    const answer = pick(rng, groups.get(sound)!);
    const distractorSounds: string[] = [];
    for (const s of shuffle(rng, sounds)) {
      if (distractorSounds.length >= choices - 1) break;
      if (soundsClash(s, sound) || distractorSounds.some((d) => soundsClash(d, s))) continue;
      distractorSounds.push(s);
    }
    const distractors = distractorSounds.map((s) => pick(rng, groups.get(s)!));
    const placed = placeAnswer(rng, answer, distractors);
    return {
      kind: 'choice',
      task: 'first-sound',
      optionKind: 'pokemon',
      speech: { kind: 'letter', text: sound },
      learned: { letters: [sound], words: [lower(answer.en)] },
      cryId: answer.id,
      options: placed.options.map((p) => ({ key: p.en, en: p.en, he: p.he, pokemonId: p.id })),
      answer: placed.answer,
    };
  });
}

// ── L4 Type Speller ─────────────────────────────────────────────────────────

function typeSpeller(rng: Rng, content: UnownContent, count: number): SpellQuestion[] {
  return sample(rng, content.types, count).map((t) => {
    const mono = t.pokemon.filter((p) => p.types.length === 1);
    const hints = mono.length >= 3 ? sample(rng, mono, 3) : sample(rng, t.pokemon, 3);
    const word = t.en.toUpperCase();
    return {
      kind: 'spell',
      task: 'type-speller',
      word,
      tiles: null,
      hints: hints.map((p) => ({ id: p.id, he: p.he })),
      speakNextLetter: true,
      speech: { kind: 'letter', text: lower(word[0]) },
      learned: { letters: [...new Set(lower(word).split(''))], words: [lower(t.en)] },
      helpHe: t.he,
    };
  });
}

// ── L5 Word Match ───────────────────────────────────────────────────────────

/** Every 4th question is a Pokémon picture, the rest are items. */
function wordMatch(rng: Rng, content: UnownContent, count: number, choices: number): ChoiceQuestion[] {
  const pokemonSlots = Array.from({ length: count }, (_, i) => i % 4 === 3);
  const itemAnswers = sample(rng, content.items, pokemonSlots.filter((p) => !p).length);
  const shortMons = content.pokemon.filter((p) => p.en.length <= 7);
  const monAnswers = sample(rng, shortMons, pokemonSlots.filter(Boolean).length);
  let ii = 0;
  let mi = 0;
  return pokemonSlots.map((isMon): ChoiceQuestion => {
    if (isMon && monAnswers[mi]) {
      const answer = monAnswers[mi++];
      const others = sample(
        rng,
        shortMons.filter((p) => p.en[0] !== answer.en[0]),
        choices - 1,
      );
      const placed = placeAnswer(rng, answer, others);
      return {
        kind: 'choice',
        task: 'word-match',
        optionKind: 'pokemon',
        speech: { kind: 'word', text: answer.en },
        learned: { letters: [], words: [lower(answer.en)] },
        cryId: answer.id,
        helpHe: answer.he,
        options: placed.options.map((p) => ({ key: p.en, en: p.en, he: p.he, pokemonId: p.id })),
        answer: placed.answer,
      };
    }
    const answer = itemAnswers[ii++ % itemAnswers.length];
    const answerWords = lower(answer.en).split(' ');
    // distractors share no word with the answer ("Potion" vs "Max Potion" look the same)
    const others = sample(
      rng,
      content.items.filter(
        (it) =>
          !lower(it.en)
            .split(' ')
            .some((w) => answerWords.includes(w)),
      ),
      choices - 1,
    );
    const placed = placeAnswer(rng, answer, others);
    return {
      kind: 'choice',
      task: 'word-match',
      optionKind: 'item',
      speech: { kind: 'word', text: answer.en },
      learned: { letters: [], words: [lower(answer.en)] },
      helpHe: answer.he,
      options: placed.options.map((it) => ({ key: it.id, en: it.en, he: it.he, sprite: it.sprite })),
      answer: placed.answer,
    };
  });
}

// ── L6 Unown Scramble ───────────────────────────────────────────────────────

export const SCRAMBLE_MAX_LETTERS = 6;

/** Short names first: 3 of ≤4 letters, 3 of 5, the rest of 6, ordered by length. */
function scrambleQuestions(rng: Rng, content: UnownContent, count: number): SpellQuestion[] {
  const pool = content.pokemon.filter((p) => p.en.length >= 3 && p.en.length <= SCRAMBLE_MAX_LETTERS);
  const short = Math.round((count * 3) / 8);
  const mid = Math.round((count * 3) / 8);
  const picked: WordPokemon[] = [
    ...sample(
      rng,
      pool.filter((p) => p.en.length <= 4),
      short,
    ),
    ...sample(
      rng,
      pool.filter((p) => p.en.length === 5),
      mid,
    ),
  ];
  const rest = pool.filter((p) => !picked.includes(p));
  const longFirst = [
    ...shuffle(
      rng,
      rest.filter((p) => p.en.length === 6),
    ),
    ...shuffle(rng, rest),
  ];
  for (const p of longFirst) {
    if (picked.length >= count) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked
    .sort((a, b) => a.en.length - b.en.length)
    .map((p) => {
      const word = p.en.toUpperCase();
      return {
        kind: 'spell',
        task: 'scramble',
        word,
        tiles: scramble(rng, word.split(''), sameSeq),
        hints: [{ id: p.id, he: p.he }],
        speakNextLetter: false,
        speech: { kind: 'word', text: p.en },
        learned: { letters: [...new Set(lower(word).split(''))], words: [lower(p.en)] },
        cryId: p.id,
      };
    });
}

// ── L7 Sentence Builder ─────────────────────────────────────────────────────

/** Sentence length plan: 3 words for the first 3/8 of the round, then 4, then 5. */
export function sentenceLength(index: number, count: number): number {
  const f = index / count;
  return f < 3 / 8 ? 3 : f < 6 / 8 ? 4 : 5;
}

function sentenceQuestions(rng: Rng, content: UnownContent, count: number): OrderQuestion[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => {
    const s = buildSentence(rng, content, sentenceLength(i, count), used);
    const text = s.words.join(' ');
    used.add(text);
    return {
      kind: 'order',
      task: 'sentence',
      words: s.words,
      tiles: scramble(rng, s.words, sameSeq),
      pokemonId: s.pokemonId,
      item: s.item,
      speech: { kind: 'word', text },
      learned: { letters: [], words: [...new Set(s.words.map(lower))] },
      cryId: s.pokemonId,
    };
  });
}

// ── Entry ───────────────────────────────────────────────────────────────────

export function generateQuestions(config: UnownWordsConfig, rng: Rng, content: UnownContent): Question[] {
  const n = config.questions;
  const choices = config.choices ?? DEFAULT_CHOICES[config.task];
  switch (config.task) {
    case 'letter-pop':
      return letterPop(rng, n, choices);
    case 'big-small':
      return bigSmall(rng, n, choices);
    case 'first-sound':
      return firstSoundQuestions(rng, content, n, choices);
    case 'type-speller':
      return typeSpeller(rng, content, n);
    case 'word-match':
      return wordMatch(rng, content, n, choices);
    case 'scramble':
      return scrambleQuestions(rng, content, n);
    case 'sentence':
      return sentenceQuestions(rng, content, n);
  }
}
