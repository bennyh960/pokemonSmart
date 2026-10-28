/**
 * Mini-game framework — shared types.
 *
 * A mini-game is a `MiniGameDef` (data + one React component). The shell
 * (`shell/MiniGameShell.tsx`) owns everything around the play area: intro,
 * level picker, countdown, HUD, pause, results, prizes. The game component
 * only renders its play area and reports score / combo / finish through props.
 */

import type { ComponentType } from 'react';
import type { DialogueReward } from '../systems/npc.js';
import type { MiniGameCue, MiniGameCueOptions } from '../audio/audio-manager.js';
import type { MajorStatusId } from '../types/battle-metadata.js';

export type { DialogueReward } from '../systems/npc.js';

/** Registered mini-game ids — one folder per id under `src/minigames/games/`. */
export const MINI_GAME_IDS = [
  'unown-words',
  'pokemon-says',
  'find-pokemon',
  'unown-battle',
  'memory-match',
  'word-catcher',
  'poke-doku',
  'snorlax-snack',
  'bulbasaur-sun',
  'charmander-flame',
  'squirtle-swim',
  'pikachu-charge',
] as const;
export type MiniGameId = (typeof MINI_GAME_IDS)[number];

/** What a game trains — buildings and hosts offer games by category (library → english, lab → logic). */
export type MiniGameCategory = 'english' | 'logic' | 'arcade';

/** A set of games, by id and/or category (`resolveMiniGames()` in registry.ts). */
export interface MiniGameChoice {
  gameIds?: MiniGameId[];
  category?: MiniGameCategory;
}

export interface Bilingual {
  en: string;
  he: string;
}

export type Stars = 0 | 1 | 2 | 3;

// ── Prizes ──────────────────────────────────────────────────────────────────

/** Card colour of a prize: common (grey) · good (blue) · rare (purple) · epic (gold). */
export type PrizeRarity = 'common' | 'good' | 'rare' | 'epic';

/** A fixed prize. */
export interface MiniGamePrize {
  rarity: PrizeRarity;
  reward: DialogueReward;
}

/** A prize picked at random from a list each time it is granted (e.g. "a random evolution stone"). */
export interface MiniGamePrizeChoice {
  rarity: PrizeRarity;
  oneOf: DialogueReward[];
}

export type MiniGamePrizeDef = MiniGamePrize | MiniGamePrizeChoice;

export interface MiniGameLevelRewards {
  /** Given once — the first time the level is cleared (≥1★). */
  firstClear: MiniGamePrizeDef;
  /** Given once — the first time the level gets 3★. */
  threeStar: MiniGamePrizeDef;
  /** Small prize for a clear that earned nothing else. Capped per game per day. */
  replay: MiniGamePrizeDef;
}

/** Level prizes, plus the care prizes of a care round (see `MiniGameCare`). */
export type PrizeKind = keyof MiniGameLevelRewards | 'care' | 'bonus';

// ── Care rounds (overworld trigger) ─────────────────────────────────────────

/**
 * A game that a hurt party Pokémon can ask for while walking in the wild (see `care.ts`).
 * Clearing the round restores that Pokémon instead of giving the level prizes.
 */
export interface MiniGameCare {
  /** Every species in this Pokémon's evolution line can trigger the game. */
  lineOf: number;
  /** Tile categories (tileset `category`) the game can start on, e.g. ['grass'] or ['water']. */
  habitat: string[];
  /** Status after the heal: null = cured, 'sleep' = Snorlax naps after eating. */
  statusAfter: MajorStatusId | null;
  /** Overworld prompt, `{name}` = the Pokémon ("Snorlax looks hungry!"). */
  prompt: Bilingual;
  /** Intro card line in care mode, `{name}` = the Pokémon. */
  intro: Bilingual;
  /** Rare extra prize: chance per star earned (0.03 → 9% at 3★). */
  bonus: { chancePerStar: number; prize: MiniGamePrizeDef };
}

// ── Definitions ─────────────────────────────────────────────────────────────

/**
 * One level of a game. `config` is the game's own per-level settings
 * (grid size, speed, word list…) — the shell never reads it.
 */
export interface MiniGameLevel<C = unknown> {
  /** 1-based level number. */
  number: number;
  name: Bilingual;
  /** One short line shown on the intro card under the level name ("Tap the letter you hear!"). */
  goal?: Bilingual;
  rewards: MiniGameLevelRewards;
  config: C;
}

/** Colours for one game — used for gradients, buttons and highlights everywhere in the shell. */
export interface MiniGameTheme {
  /** Gradient start (top-left). */
  from: string;
  /** Gradient end (bottom-right). */
  to: string;
  /** Buttons, highlights, combo flame. */
  accent: string;
  /** Text on top of `accent`. */
  accentText: string;
}

export interface MiniGameDef<C = unknown> {
  id: MiniGameId;
  name: Bilingual;
  tagline: Bilingual;
  category: MiniGameCategory;
  theme: MiniGameTheme;
  /** National dex id of the mascot shown on the intro card / picker. */
  mascotPokemonId: number;
  /** Optional music track key from audio-manager's MUSIC_TRACKS. Omit → keep current music, cues only. */
  music?: string;
  levels: MiniGameLevel<C>[];
  /** Optional overworld care trigger (a hurt party Pokémon asks to play). */
  care?: MiniGameCare;
  Component: ComponentType<MiniGameProps<C>>;
}

/** A def of any config type — what the registry stores. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMiniGameDef = MiniGameDef<any>;

// ── Game ⇄ shell contract ───────────────────────────────────────────────────

/** What a game reports when a round ends. stars 0 = not cleared (no prizes). */
export interface MiniGameResult {
  stars: Stars;
  score: number;
  /** Free-form stats for the results screen / caller (e.g. { mistakes: 2 }). */
  extra?: Record<string, number | string | boolean>;
}

export interface FloatTextOptions {
  /** Viewport position in px (e.g. a pointer event's clientX / clientY). Default: centre of the play area. */
  x?: number;
  y?: number;
  /** Text colour. Default: theme accent. */
  color?: string;
}

/**
 * HUD helpers. The object is stable for the whole round (safe in deps arrays).
 * The HUD only shows what the game has set: score always, combo when ≥2,
 * hearts after setHearts(), timer after startTimer().
 */
export interface MiniGameHud {
  setScore(score: number): void;
  /** Adds to the score and (optionally) floats "+N" text at a spot in the play area. */
  addScore(delta: number, float?: FloatTextOptions): void;
  /** Current combo. The shell plays the milestone cue at 5 / 10 / 15… and shows the flame at ≥2. */
  setCombo(combo: number): void;
  setHearts(current: number, max: number): void;
  /** Starts a countdown in the HUD. Pauses with the game, ticks in the last 5 s, calls onDone at 0. */
  startTimer(seconds: number, onDone: () => void): void;
  stopTimer(): void;
  /** Adds (or removes, if negative) seconds to a running timer. */
  addTime(seconds: number): void;
  getTimeLeft(): number;
  /** Floating text anywhere ("BURP!", "+10", "Combo x3"). */
  floatText(text: string, opts?: FloatTextOptions): void;
  /** Confetti burst over the play area. */
  confetti(): void;
  /** Shakes the play area (wrong answer). */
  shake(): void;
}

/** Sound effects. All synthesized — see `playMiniGameCue` in audio-manager. */
export interface MiniGameSfx {
  tap(): void;
  /** Bright bell; each combo step plays the next note up a pentatonic scale. */
  correct(combo: number): void;
  wrong(): void;
  /** Plays a Pokémon cry by national dex id. */
  cry(pokemonId: number): void;
  /** Speaks a letter (phonics file or speech fallback). */
  letter(letter: string): void;
  /** Speaks an English word (word file or speech fallback). */
  word(word: string): void;
  /** Any other named cue (rarely needed — the shell plays count/star/clear/prize itself). */
  cue(name: MiniGameCue, opts?: MiniGameCueOptions): void;
}

/** Props every game component receives. */
export interface MiniGameProps<C = unknown> {
  level: MiniGameLevel<C>;
  /** Changes on "Play again" — use it as a seed / reset key. */
  runId: number;
  /** True while the pause menu is open: stop timers, animations and input. */
  paused: boolean;
  hud: MiniGameHud;
  sfx: MiniGameSfx;
  theme: MiniGameTheme;
  /** The Pokémon the player plays as: the party Pokémon of a care round, else the mascot. */
  pokemonId: number;
  /** Call exactly once when the round ends. */
  onFinish(result: MiniGameResult): void;
  /** Leave the round without a result (back to the intro card). */
  onQuit(): void;
}

// ── Audio cue names (data table lives in audio-manager) ─────────────────────

export type { MiniGameCue, MiniGameCueOptions } from '../audio/audio-manager.js';
// ── Saved progress (pd.miniGames) ───────────────────────────────────────────

export interface MiniGameLevelProgress {
  stars: Stars;
  best: number;
  clears: number;
}

export interface MiniGameProgress {
  levels: Record<number, MiniGameLevelProgress>;
  /** ISO time of the last finished round. */
  lastPlayed?: string;
  /** Replay-prize daily cap: local date (YYYY-MM-DD) + prizes given that day. */
  replayDay?: { date: string; count: number };
  /** Game-owned data (e.g. unown-words keeps `seen` letters/words here). The shell never reads it. */
  data?: Record<string, unknown>;
}

export type MiniGamesSave = Partial<Record<MiniGameId, MiniGameProgress>>;
