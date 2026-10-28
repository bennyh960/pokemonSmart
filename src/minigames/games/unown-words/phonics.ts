/**
 * Phonics rules for First Sound (L3) and letter look-alikes for Big & Small (L2).
 * These are facts about English spelling, not word lists.
 */

/** Two letters that make one new sound — a name starting with one of these has no clean "first letter sound". */
const DIGRAPHS = ['ch', 'sh', 'ph', 'th', 'wh', 'kn', 'gn', 'ps', 'wr', 'qu'];

/** Start letters whose sound changes from word to word (vowels, c = k/s, x = z/ks, y = vowel/consonant). */
const AMBIGUOUS_START = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'c', 'q', 'x']);

/** Sound pairs a young listener easily mixes up — never put them in the same question. */
const SIMILAR_SOUNDS: readonly (readonly [string, string])[] = [
  ['b', 'p'],
  ['d', 't'],
  ['f', 'v'],
  ['s', 'z'],
  ['k', 'g'],
  ['m', 'n'],
  ['j', 'g'],
  ['w', 'v'],
];

/**
 * The letter whose sound a name clearly starts with, or null when the start is ambiguous
 * (vowel, digraph like Ch/Sh/Ph, soft c/g…). Such names are left out of First Sound entirely,
 * so a digraph can never sit next to its single-letter look-alike.
 */
export function firstSound(name: string): string | null {
  const w = name.toLowerCase();
  if (!/^[a-z]{2,}/.test(w)) return null;
  if (DIGRAPHS.some((d) => w.startsWith(d))) return null;
  const first = w[0];
  if (AMBIGUOUS_START.has(first)) return null;
  if (first === 'g' && 'eiy'.includes(w[1])) return null; // soft g (Girafarig ≠ Golem)
  return first;
}

/** True when two first sounds are the same or easy to confuse. */
export function soundsClash(a: string, b: string): boolean {
  if (a === b) return true;
  return SIMILAR_SOUNDS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/**
 * Letters whose English *names* rhyme (B/D/E/G/P/T/V/Z all end in "ee"). When a letter is heard
 * (Letter Pop), the other choices never come from the same group.
 */
const LETTER_NAME_RHYMES = ['bcdegptvz', 'ahjk', 'flmnsx', 'iy', 'quw'];

export function rhymesWith(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || LETTER_NAME_RHYMES.some((g) => g.includes(x) && g.includes(y));
}

/** Lower-case letters that look alike — great distractors for Big & Small. */
const LOOKALIKE_GROUPS = ['bdpq', 'mnhu', 'ijl', 'vwy', 'ce', 'ao'];

export function lookalikes(letter: string): string[] {
  const l = letter.toLowerCase();
  const group = LOOKALIKE_GROUPS.find((g) => g.includes(l));
  return group ? group.split('').filter((c) => c !== l) : [];
}
