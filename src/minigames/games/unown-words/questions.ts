/**
 * Question generation — pure (seeded rng + content in, questions out). Every question is one right answer
 * among N options: L1 Letter Pop (hear a letter), L2 Big & Small (match the case), L3 First Sound (a Pokémon).
 * Words are spelled in Unown Battle and the other English modes.
 */

import type { UnownTask, UnownWordsConfig } from './config.js';
import { ALPHABET, type UnownContent, type WordPokemon } from './content.js';
import { firstSound, lookalikes, rhymesWith, soundsClash } from './phonics.js';
import { pick, sample, shuffle, type Rng } from '../../english/random.js';

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
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  /** A big glyph to look at (Big & Small). */
  show?: string;
  /** Options are letter glyphs or Pokémon pictures. */
  optionKind: 'letter' | 'pokemon';
  options: ChoiceOption[];
  answer: number;
}

export type Question = ChoiceQuestion;

const DEFAULT_CHOICES: Record<UnownTask, number> = {
  'letter-pop': 4,
  'big-small': 4,
  'first-sound': 3,
};

const lower = (s: string) => s.toLowerCase();

/** Shuffles `answer` in among `distractors`; returns options + the answer's index. */
function placeAnswer<T>(rng: Rng, answer: T, distractors: T[]): { options: T[]; answer: number } {
  const options = shuffle(rng, [answer, ...distractors]);
  return { options, answer: options.indexOf(answer) };
}

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
  }
}
