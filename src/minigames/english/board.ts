/**
 * The Word Board — the library tile where a child plays the English ladder as often as they like.
 *
 *   round:  one game of the child's ladder step, or of a step below it as practice (`ladderRound()`), never the
 *           trainer rank. Prizes are those of the step played.
 *   prizes: one prize per star. Each prize's rarity is drawn from RARITY_ODDS_BY_STARS (more stars → better odds),
 *           then one prize of that rarity from the step's pool (`LadderStep.prizes`). A rarity the pool lacks
 *           falls back to the next lower one.
 *   epic:   only a 3★ round, and at most one per round: each epic prize of the step (`LadderStep.epic`, and the
 *           rare Pokémon the player doesn't own yet, `LadderStep.rarePokemon`) has its own chance, rolled once.
 *           An epic replaces one of the three prizes.
 *   city:   each library adds its own flavor to the step (`boardStep()`, board-cities.ts).
 *   leave:  a drawn round stays open until it finishes. Leaving it before (back button, or closing the game
 *           mid-round) closes the board for BOARD_LEAVE_LOCK_MS — no re-drawing a round until an easy one comes.
 *
 * Pure logic (no React, no audio, no saving).
 */

import { getAllPokemon, getEvolutionChain } from '../../services/pokemon-data.js';
import type { PlayerData } from '../../types/index.js';
import { giftPokemon } from '../define.js';
import { ensureGameProgress, resolvePrize, type AwardedPrize } from '../progress.js';
import type { Bilingual, MiniGamePrizeChoice, MiniGamePrizeDef, MiniGamesSave, PrizeRarity, Stars } from '../types.js';
import { BOARD_CITIES } from './board-cities.js';
import { ENGLISH_LADDER, MASTER_BALL_EPIC, type EpicPrize, type LadderStep } from './ladder.js';
import { WORDS_HOME } from './useWords.js';

export const RARITIES: readonly PrizeRarity[] = ['common', 'good', 'rare', 'epic'];

/** Rarities drawn per prize; epic prizes have their own once-per-round chance (`epicOdds`). */
export type DrawnRarity = Exclude<PrizeRarity, 'epic'>;
export const DRAWN_RARITIES: readonly DrawnRarity[] = ['common', 'good', 'rare'];

/** Chance (sums to 1) of each rarity for one prize, by the stars of the round. */
export const RARITY_ODDS_BY_STARS: Readonly<Record<Exclude<Stars, 0>, Readonly<Record<DrawnRarity, number>>>> = {
  1: { common: 0.8, good: 0.19, rare: 0.01 },
  2: { common: 0.55, good: 0.35, rare: 0.1 },
  3: { common: 0.3, good: 0.4, rare: 0.3 },
};

/** Only a round with this many stars can give an epic prize. */
export const EPIC_STARS: Stars = 3;

/** Level of a Pokémon won on the board. */
export const BOARD_POKEMON_LEVEL = 10;

export const RARE_POKEMON_LABEL: Bilingual = { en: 'Rare Pokémon', he: 'פוקימון נדיר' };

/** Pokémon only the board gives: the first stage of every line from a later generation than Gold/Silver (Riolu…). */
export const BOARD_POKEMON: readonly number[] = getAllPokemon()
  .filter((p) => p.id > 251 && (getEvolutionChain(p.id)?.stages[0]?.id ?? p.id) === p.id)
  .map((p) => p.id);

/**
 * A ladder step as the board of `city`'s library gives it: + its specialty prize, its own rare Pokémon,
 * and the Master Ball on the top step only where the city has it. No city → the plain step.
 */
export function boardStep(stepIndex: number, city?: string): LadderStep {
  const step = ENGLISH_LADDER[stepIndex];
  const flavor = city ? BOARD_CITIES[city] : undefined;
  if (!flavor) return step;
  const top = stepIndex === ENGLISH_LADDER.length - 1;
  return {
    ...step,
    prizes: [...step.prizes, flavor.specialty],
    epic: top && flavor.masterBall ? [...(step.epic ?? []), MASTER_BALL_EPIC] : step.epic,
    rarePokemon: step.rarePokemon && { ...step.rarePokemon, ids: flavor.rarePokemon },
  };
}

/** Every species the player has in the party or the PC. */
export function ownedSpecies(pd: Pick<PlayerData, 'party' | 'boxes'>): Set<number> {
  const ids = new Set(pd.party.map((p) => p.id));
  for (const box of pd.boxes) for (const p of box.pokemon) if (p) ids.add(p.id);
  return ids;
}

/** The rare-Pokémon prize of a step: one board Pokémon not owned yet (null when the step has none or all are owned). */
export function rarePokemonPrize(step: LadderStep, owned: ReadonlySet<number>): MiniGamePrizeChoice | null {
  if (!step.rarePokemon) return null;
  const offered = step.rarePokemon.ids === 'all' ? BOARD_POKEMON : step.rarePokemon.ids;
  const ids = offered.filter((id) => !owned.has(id));
  if (ids.length === 0) return null;
  return {
    rarity: 'epic',
    oneOf: ids.map((id) => giftPokemon(id, BOARD_POKEMON_LEVEL)),
    label: RARE_POKEMON_LABEL,
  };
}

/** The epic prizes of a step with their chance per 3★ round, the rare Pokémon included (when one is left to win). */
export function epicOdds(step: LadderStep, owned: ReadonlySet<number>): EpicPrize[] {
  const mon = rarePokemonPrize(step, owned);
  const epics = step.epic ?? [];
  return mon ? [...epics, { prize: mon, chance: step.rarePokemon!.chance }] : epics;
}

/** All prizes of a step, epic ones included (for prize lists). */
export function boardPool(step: LadderStep, owned: ReadonlySet<number>): MiniGamePrizeDef[] {
  return [...step.prizes, ...epicOdds(step, owned).map((e) => e.prize)];
}

/** Draws a rarity for one non-epic prize. */
export function rollRarity(stars: Exclude<Stars, 0>, rng: () => number): DrawnRarity {
  const odds = RARITY_ODDS_BY_STARS[stars];
  let r = rng();
  for (const rarity of DRAWN_RARITIES) {
    r -= odds[rarity];
    if (r < 0) return rarity;
  }
  return 'common';
}

/** Rolls once for an epic prize: each one wins with its own chance (null = none this round). */
export function rollEpic(epics: readonly EpicPrize[], rng: () => number): MiniGamePrizeDef | null {
  let r = rng();
  for (const e of epics) {
    r -= e.chance;
    if (r < 0) return e.prize;
  }
  return null;
}

/** Prizes of a finished board round on `stepIndex` in `city`'s library: one per star. Nothing when not cleared. */
export function boardPrizes(
  stepIndex: number,
  stars: Stars,
  owned: ReadonlySet<number>,
  rng: () => number = Math.random,
  city?: string,
): AwardedPrize[] {
  if (stars < 1) return [];
  const step = boardStep(stepIndex, city);
  const prizes: AwardedPrize[] = [];
  const won = stars >= EPIC_STARS ? rollEpic(epicOdds(step, owned), rng) : null;
  if (won) prizes.push({ kind: 'board', ...resolvePrize(won, rng) });
  while (prizes.length < stars) {
    let r = DRAWN_RARITIES.indexOf(rollRarity(stars as Exclude<Stars, 0>, rng));
    let options = step.prizes.filter((p) => p.rarity === DRAWN_RARITIES[r]);
    while (options.length === 0 && r > 0) options = step.prizes.filter((p) => p.rarity === DRAWN_RARITIES[--r]);
    if (options.length === 0) break;
    if (options.length === 0) continue;
    const def = options[Math.min(options.length - 1, Math.floor(rng() * options.length))];
    prizes.push({ kind: 'board', ...resolvePrize(def, rng) });
  }
  return prizes;
}

/** How long the board stays closed after leaving a round before it finished. */
export const BOARD_LEAVE_LOCK_MS = 15 * 60 * 1000;

interface BoardLockData {
  /** A round was drawn and hasn't finished yet. */
  boardRoundOpen?: boolean;
  /** Epoch ms until which the board is closed. */
  boardLockedUntil?: number;
}

function lockData(save: MiniGamesSave): BoardLockData {
  return (save[WORDS_HOME]?.data ?? {}) as BoardLockData;
}

/** Marks a drawn round as open (mutates `save`). */
export function openBoardRound(save: MiniGamesSave): void {
  (ensureGameProgress(save, WORDS_HOME).data ??= {}).boardRoundOpen = true;
}

/** A finished round, whatever its stars, closes cleanly (mutates `save`). */
export function finishBoardRound(save: MiniGamesSave): void {
  const data = save[WORDS_HOME]?.data;
  if (data) delete data.boardRoundOpen;
}

export function isBoardRoundOpen(save: MiniGamesSave): boolean {
  return !!lockData(save).boardRoundOpen;
}

/** Leaving a round that is still open closes the board for BOARD_LEAVE_LOCK_MS (mutates `save`; no open round → no-op). */
export function leaveBoardRound(save: MiniGamesSave, now: number): void {
  if (!isBoardRoundOpen(save)) return;
  const data = ensureGameProgress(save, WORDS_HOME).data!;
  delete data.boardRoundOpen;
  data.boardLockedUntil = now + BOARD_LEAVE_LOCK_MS;
}

/** Opens a closed board and forgets an unfinished round (mutates `save`). */
export function clearBoardLock(save: MiniGamesSave): void {
  const data = save[WORDS_HOME]?.data;
  if (!data) return;
  delete data.boardRoundOpen;
  delete data.boardLockedUntil;
}

/** Milliseconds until the board opens again (0 = open). */
export function boardLockLeft(save: MiniGamesSave, now: number): number {
  const until = lockData(save).boardLockedUntil;
  return typeof until === 'number' ? Math.max(0, until - now) : 0;
}
