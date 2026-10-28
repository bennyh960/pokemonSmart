/**
 * The English ladder — what a child plays next, driven only by English progress (never the trainer rank).
 * Every ladder round (library gate, Word Board) earns points by stars (STAR_POINTS: 1★ none, 2★ a little, 3★ more);
 * `pointsToNext` points climb to the next step. The librarian opens a game once the child reaches the first step
 * that has it. Each step has its own Word Board prizes (board.ts). Saved in `pd.miniGames['unown-words'].data.ladder`.
 */

import { evolutionStonePrize, item, money, prize, tmPrize, vitaminPrize } from '../define.js';
import { ensureGameProgress, highestUnlockedLevel } from '../progress.js';
import { getMiniGame } from '../registry.js';
import type { Bilingual, MiniGameId, MiniGamePrizeDef, MiniGamesSave, Stars } from '../types.js';
import { pick, type Rng } from './random.js';
import { WORDS_HOME } from './useWords.js';

/** Ladder points a round earns by its stars. */
export const STAR_POINTS: Readonly<Record<Stars, number>> = { 0: 0, 1: 0, 2: 1, 3: 3 };

/** A game to play on a step: a fixed level, or 'best' = the highest level the child has opened. */
export interface LadderPlay {
  gameId: MiniGameId;
  level: number | 'best';
}

export interface LadderStep {
  name: Bilingual;
  play: LadderPlay[];
  /** Points to climb to the next step. Omitted on the last step. */
  pointsToNext?: number;
  /** Word Board prizes of this step (common / good / rare) — the rarity of each is drawn by stars (board.ts). */
  prizes: MiniGamePrizeDef[];
  /** Epic prizes, each with its own chance in a 3★ round (at most one epic per round, never below 3★). */
  epic?: EpicPrize[];
  /** A rare Pokémon the player doesn't own yet: these ids or 'all' of BOARD_POKEMON, with its chance in a 3★ round. */
  rarePokemon?: { ids: readonly number[] | 'all'; chance: number };
}

export interface EpicPrize {
  prize: MiniGamePrizeDef;
  /** Chance per 3★ round (0..1). */
  chance: number;
}

/** Chance per 3★ round of the epic prizes. */
const EPIC_CHANCE = 0.05;
const MASTER_BALL_CHANCE = 0.02;
const RARE_POKEMON_CHANCE = 0.05;

function epic(prize: MiniGamePrizeDef, chance = EPIC_CHANCE): EpicPrize {
  return { prize, chance };
}

// Rare Pokémon offered one level before the top (national dex ids)
const TRAPINCH = 328;
const FEEBAS = 349;
const ABSOL = 359;
const DEINO = 633;

export const ENGLISH_LADDER: readonly LadderStep[] = [
  {
    name: { en: 'Letters', he: 'אותיות' },
    play: [{ gameId: 'unown-words', level: 1 }],
    pointsToNext: 6,
    prizes: [
      prize('common', item('poke-ball', 2)),
      prize('common', item('potion', 2)),
      prize('common', money(100)),
      prize('good', item('great-ball', 2)),
      prize('good', item('super-potion')),
      prize('rare', item('rare-candy')),
    ],
  },
  {
    name: { en: 'Big & small letters', he: 'אותיות גדולות וקטנות' },
    play: [{ gameId: 'unown-words', level: 2 }],
    pointsToNext: 6,
    prizes: [
      prize('common', item('poke-ball', 3)),
      prize('common', item('potion', 3)),
      prize('common', money(150)),
      prize('good', item('great-ball', 5)),
      prize('good', item('super-potion', 5)),
      prize('good', item('revive', 3)),
      prize('rare', item('rare-candy')),
    ],
    epic: [epic(vitaminPrize('epic'))],
  },
  {
    name: { en: 'Colors', he: 'צבעים' },
    play: [{ gameId: 'memory-match', level: 1 }],
    pointsToNext: 9,
    prizes: [
      prize('common', item('great-ball')),
      prize('common', item('super-potion')),
      prize('common', money(200)),
      prize('good', item('great-ball', 3)),
      prize('good', item('revive', 2)),
      prize('good', money(500)),
      prize('rare', item('rare-candy', 2)),
      evolutionStonePrize('rare'),
    ],
  },
  {
    name: { en: 'Pokémon colors', he: 'הצבעים של הפוקימונים' },
    play: [
      { gameId: 'pokemon-colors', level: 1 },
      { gameId: 'pokemon-colors', level: 2 },
    ],
    pointsToNext: 9,
    prizes: [
      prize('common', item('great-ball', 2)),
      prize('common', item('super-potion', 2)),
      prize('common', money(250)),
      prize('good', item('ultra-ball', 2)),
      prize('good', item('hyper-potion')),
      prize('good', item('revive', 2)),
      prize('rare', item('rare-candy', 2)),
      evolutionStonePrize('rare'),
      vitaminPrize('rare', 1),
    ],
    epic: [epic(prize('epic', item('rare-candy', 4)))],
  },
  {
    name: { en: 'Pokémon types', he: 'סוגי פוקימון' },
    play: [{ gameId: 'memory-match', level: 2 }],
    pointsToNext: 12,
    prizes: [
      prize('common', item('great-ball', 3)),
      prize('common', item('super-potion', 2)),
      prize('common', money(300)),
      prize('good', item('ultra-ball', 2)),
      prize('good', item('hyper-potion', 2)),
      prize('good', item('revive', 3)),
      evolutionStonePrize('rare'),
      tmPrize('rare'),
      vitaminPrize('rare', 2),
    ],
    epic: [epic(prize('epic', item('rare-candy', 5)))],
  },
  {
    name: { en: 'Animals & actions', he: 'חיות ופעולות' },
    play: [
      { gameId: 'memory-match', level: 3 },
      { gameId: 'pokemon-says', level: 1 },
    ],
    pointsToNext: 12,
    prizes: [
      prize('common', item('ultra-ball')),
      prize('common', item('hyper-potion')),
      prize('common', money(400)),
      prize('good', item('ultra-ball', 3)),
      prize('good', item('max-revive')),
      prize('good', item('full-heal', 3)),
      evolutionStonePrize('rare'),
      tmPrize('rare'),
      vitaminPrize('rare', 3),
    ],
    epic: [epic(prize('epic', item('rare-candy', 5)))],
  },
  {
    name: { en: 'Sounds & the Pokémon world', he: 'צלילים ועולם הפוקימון' },
    play: [
      { gameId: 'unown-words', level: 3 },
      { gameId: 'memory-match', level: 4 },
      { gameId: 'memory-match', level: 5 },
      { gameId: 'pokemon-colors', level: 3 },
    ],
    pointsToNext: 15,
    prizes: [
      prize('common', item('ultra-ball', 2)),
      prize('common', item('hyper-potion', 2)),
      prize('common', money(500)),
      prize('good', item('ultra-ball', 4)),
      prize('good', item('max-revive', 2)),
      prize('good', item('max-potion')),
      prize('rare', item('rare-candy', 3)),
      evolutionStonePrize('rare'),
      tmPrize('rare'),
      vitaminPrize('rare', 3),
    ],
    epic: [epic(prize('epic', item('rare-candy', 8)))],
    rarePokemon: { ids: [TRAPINCH, FEEBAS, ABSOL, DEINO], chance: RARE_POKEMON_CHANCE },
  },
  {
    name: { en: 'Word explorer', he: 'חוקרי מילים' },
    play: [
      { gameId: 'find-pokemon', level: 'best' },
      { gameId: 'word-catcher', level: 'best' },
      { gameId: 'unown-battle', level: 'best' },
      { gameId: 'pokemon-says', level: 'best' },
      { gameId: 'memory-match', level: 'best' },
    ],
    prizes: [
      prize('common', item('ultra-ball', 3)),
      prize('common', item('max-potion')),
      prize('common', money(800)),
      prize('good', item('max-revive', 2)),
      prize('good', item('full-restore')),
      prize('good', money(1500)),
      prize('rare', item('rare-candy', 3)),
      evolutionStonePrize('rare'),
      tmPrize('rare'),
      vitaminPrize('rare', 3),
    ],
    epic: [epic(prize('epic', item('master-ball')), MASTER_BALL_CHANCE)],
    rarePokemon: { ids: 'all', chance: RARE_POKEMON_CHANCE },
  },
];

export interface LadderState {
  /** Index into ENGLISH_LADDER. */
  step: number;
  /** Points earned on this step. */
  points: number;
}

/** The saved ladder state (missing or broken → the first step). */
export function readLadder(save: MiniGamesSave, ladder: readonly LadderStep[] = ENGLISH_LADDER): LadderState {
  const raw = save[WORDS_HOME]?.data?.ladder as Partial<LadderState> | undefined;
  const step = Number.isInteger(raw?.step) ? Math.max(0, Math.min(ladder.length - 1, raw!.step!)) : 0;
  const points = typeof raw?.points === 'number' && raw.points > 0 ? raw.points : 0;
  return { step, points };
}

/** Index of the step the child stands on. */
export function ladderStep(save: MiniGamesSave, ladder: readonly LadderStep[] = ENGLISH_LADDER): number {
  return readLadder(save, ladder).step;
}

/** Points towards the next step (null on the last step). */
export function ladderProgress(save: MiniGamesSave): { have: number; need: number } | null {
  const { step, points } = readLadder(save);
  const need = ENGLISH_LADDER[step].pointsToNext;
  return need ? { have: Math.min(points, need), need } : null;
}

/**
 * Adds a finished ladder round's points to `save` (mutates it; use inside a mutate() recipe).
 * A full bar climbs one step and starts the next bar from zero.
 */
export function addLadderPoints(
  save: MiniGamesSave,
  stars: Stars,
  ladder: readonly LadderStep[] = ENGLISH_LADDER,
): { gained: number; leveledUp: boolean } {
  const gained = STAR_POINTS[stars];
  const state = readLadder(save, ladder);
  const need = ladder[state.step].pointsToNext;
  let next: LadderState = { step: state.step, points: need ? state.points + gained : 0 };
  const leveledUp = !!need && next.points >= need;
  if (leveledUp) next = { step: state.step + 1, points: 0 };
  (ensureGameProgress(save, WORDS_HOME).data ??= {}).ladder = next;
  return { gained, leveledUp };
}

/** First step that plays this game (-1 = not on the ladder). */
export function firstStepOf(gameId: MiniGameId, ladder: readonly LadderStep[] = ENGLISH_LADDER): number {
  return ladder.findIndex((s) => s.play.some((p) => p.gameId === gameId));
}

/** An English game is open once the child reached the first step that has it (games not on the ladder: always). */
export function isOpenOnLadder(gameId: MiniGameId, save: MiniGamesSave): boolean {
  return firstStepOf(gameId) <= ladderStep(save);
}

/** The round a library gate plays: one game of the current step. */
export function ladderRound(save: MiniGamesSave, rng: Rng): { gameId: MiniGameId; level: number } {
  const play = pick(rng, ENGLISH_LADDER[ladderStep(save)].play);
  const level = play.level === 'best' ? highestUnlockedLevel(save, getMiniGame(play.gameId)) : play.level;
  return { gameId: play.gameId, level };
}
