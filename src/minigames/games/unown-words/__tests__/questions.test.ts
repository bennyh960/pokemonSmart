import { describe, expect, it, vi } from 'vitest';

// the def pulls in the React component (player store → game-state / save) — stub window + Supabase for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));

import def from '../index.js';
import { buildContent } from '../content.js';
import { firstSound, rhymesWith, soundsClash } from '../phonics.js';
import { generateQuestions, pokemonBySound, type Question } from '../questions.js';
import { createRng } from '../../../english/random.js';
import type { UnownWordsConfig } from '../config.js';

const content = buildContent();
const configs: UnownWordsConfig[] = def.levels.map((l) => l.config);

function round(config: UnownWordsConfig, seed: number): Question[] {
  return generateQuestions(config, createRng(seed), content);
}

describe('unown-words content', () => {
  it('derives pools from game data', () => {
    expect(content.pokemon.length).toBeGreaterThan(100);
    expect(content.pokemon.every((p) => /^[A-Za-z]+$/.test(p.en))).toBe(true);
  });
});

describe('unown-words phonics', () => {
  it('rejects ambiguous first sounds', () => {
    expect(firstSound('Bulbasaur')).toBe('b');
    expect(firstSound('Charmander')).toBeNull();
    expect(firstSound('Shellder')).toBeNull();
    expect(firstSound('Phanpy')).toBeNull();
    expect(firstSound('Abra')).toBeNull();
    expect(firstSound('Caterpie')).toBeNull();
    expect(firstSound('Girafarig')).toBeNull();
    expect(firstSound('Golem')).toBe('g');
  });
  it('knows look/sound-alikes', () => {
    expect(soundsClash('b', 'p')).toBe(true);
    expect(soundsClash('b', 'm')).toBe(false);
    expect(rhymesWith('b', 'd')).toBe(true);
    expect(rhymesWith('b', 'k')).toBe(false);
  });
});

describe('unown-words questions', () => {
  it.each(configs.map((c) => [c.task, c] as const))('%s: 8 questions, valid answers', (_task, config) => {
    for (let seed = 1; seed <= 25; seed++) {
      const qs = round(config, seed);
      expect(qs).toHaveLength(config.questions);
      for (const q of qs) {
        expect(q.task).toBe(config.task);
        expect(q.speech.text).toBeTruthy();
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(new Set(q.options.map((o) => o.key)).size).toBe(q.options.length);
      }
    }
  });

  it('is reproducible from the seed', () => {
    for (const c of configs) expect(round(c, 42)).toEqual(round(c, 42));
  });

  it('letter pop: 8 different letters, no rhyming choices', () => {
    const qs = round(configs[0], 7);
    const answers = qs.map((q) => (q.kind === 'choice' ? q.options[q.answer].key : ''));
    expect(new Set(answers).size).toBe(8);
    for (const q of qs) {
      if (q.kind !== 'choice') continue;
      const a = q.options[q.answer].key;
      q.options.filter((_, i) => i !== q.answer).forEach((o) => expect(rhymesWith(o.key, a)).toBe(false));
      expect(q.options.every((o) => o.en === o.key.toUpperCase())).toBe(true);
    }
  });

  it('big & small: options are the other case and include the answer', () => {
    for (const q of round(configs[1], 3)) {
      if (q.kind !== 'choice' || !q.show) throw new Error('expected a shown glyph');
      const answer = q.options[q.answer];
      expect(answer.en.toLowerCase()).toBe(q.show.toLowerCase());
      expect(answer.en).not.toBe(q.show);
      const keys = q.options.map((o) => o.key);
      expect(keys.includes('i') && keys.includes('l')).toBe(false);
    }
  });

  it('first sound: answer starts with the sound, distractors never clash', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const q of round(configs[2], seed)) {
        if (q.kind !== 'choice') throw new Error('choice expected');
        const sound = q.speech.text;
        expect(firstSound(q.options[q.answer].en)).toBe(sound);
        const others = q.options.filter((_, i) => i !== q.answer).map((o) => firstSound(o.en)!);
        others.forEach((s) => expect(soundsClash(s, sound)).toBe(false));
        expect(others.length === 2 ? soundsClash(others[0], others[1]) : false).toBe(false);
        expect(q.cryId).toBe(q.options[q.answer].pokemonId);
      }
    }
  });

  it('first sound: groups only clear sounds', () => {
    for (const [sound, mons] of pokemonBySound(content.pokemon)) {
      expect(sound).toMatch(/^[a-z]$/);
      mons.forEach((p) => expect(firstSound(p.en)).toBe(sound));
    }
  });
});
