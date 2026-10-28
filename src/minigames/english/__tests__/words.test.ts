import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../services/pokemon-data.js', async (orig) => (await import('./moves-mock.js')).withMoves(orig));

import { getAllPokemon } from '../../../services/pokemon-data.js';
import { getWord, getWords, MAX_SPELL_LENGTH } from '../words.js';

describe('English word bank', () => {
  const words = getWords();

  it('resolves every word (types / moves / items exist) with English, Hebrew and a picture', () => {
    expect(words.length).toBeGreaterThanOrEqual(200);
    for (const w of words) {
      expect(w.en, w.id).toMatch(/^[a-z][a-z ]*$/);
      expect(w.he, w.id).not.toBe('');
      expect(w.he, w.id).not.toBe(w.en);
      expect(w.he, w.id).toMatch(/[֐-׿]/); // real Hebrew
      expect(w.say, w.id).toMatch(/[ְ-ׇ]/); // pronunciation with niqqud
    }
  });

  it('ids, English words and pictures are unique (no two answers look alike)', () => {
    const unique = (xs: string[]) => expect(new Set(xs).size).toBe(xs.length);
    unique(words.map((w) => w.id));
    unique(words.map((w) => w.en));
    unique(
      words.map((w) =>
        w.picture.kind === 'emoji' ? w.picture.emoji : w.picture.kind === 'swatch' ? w.picture.color : w.picture.src,
      ),
    );
  });

  it('every Pokémon colour is a word (the colours game asks for it)', () => {
    const colors = new Set(getAllPokemon().map((p) => p.color));
    expect(colors.size).toBeGreaterThanOrEqual(10);
    for (const c of colors) expect(getWord(c!)?.theme, c).toBe('colors');
  });

  it('tier 1–2 single words fit spelling tasks', () => {
    for (const w of words.filter((x) => x.tier <= 2 && !x.en.includes(' '))) {
      expect(w.en.length, w.id).toBeLessThanOrEqual(MAX_SPELL_LENGTH);
    }
  });
});
