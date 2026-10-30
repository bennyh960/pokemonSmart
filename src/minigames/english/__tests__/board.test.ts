import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../services/pokemon-data.js', async (orig) => (await import('./moves-mock.js')).withMoves(orig));

import { getItem } from '../../../data/items.js';
import { getPokemon } from '../../../services/pokemon-data.js';
import type { DialogueReward, MiniGamesSave } from '../../types.js';
import { BOARD_CITIES } from '../board-cities.js';
import {
  badgesFor,
  BOARD_LEAVE_LOCK_MS,
  BOARD_POKEMON,
  boardLockLeft,
  boardPool,
  boardPrizes,
  boardStep,
  clearBoardLock,
  DRAWN_RARITIES,
  epicOdds,
  finishBoardRound,
  isBoardRoundOpen,
  leaveBoardRound,
  openBoardRound,
  PREMIUM_BADGES,
  RARITY_ODDS_BY_STARS,
  rarePokemonPrize,
  unlockedStep,
} from '../board.js';
import { ENGLISH_LADDER } from '../ladder.js';
import { createRng } from '../random.js';

const RIOLU = 447;
const LUCARIO = 448;
const none = new Set<number>();
const ALL_BADGES = 8;

function rewardsOf(step: (typeof ENGLISH_LADDER)[number]): DialogueReward[] {
  return boardPool(step, none).flatMap((p) => ('oneOf' in p ? p.oneOf : [p.reward]));
}

describe('Word Board prizes', () => {
  it('every level has prizes that exist, always a common one, and the top level a rare Pokémon', () => {
    for (const step of ENGLISH_LADDER) {
      expect(step.prizes.some((p) => p.rarity === 'common'), step.name.en).toBe(true);
      for (const r of rewardsOf(step)) {
        for (const i of r.items ?? []) expect(getItem(i.itemId), i.itemId).toBeDefined();
        if (r.pokemon) expect(getPokemon(r.pokemon.id)).toBeDefined();
      }
    }
    expect(ENGLISH_LADDER[ENGLISH_LADDER.length - 1].rarePokemon?.ids).toBe('all');
  });

  it('the Master Ball is only on the top level, and only in Percentile and Algebria', () => {
    const hasMasterBall = (step: (typeof ENGLISH_LADDER)[number]) =>
      rewardsOf(step).some((r) => r.items?.some((i) => i.itemId === 'master-ball'));
    const top = ENGLISH_LADDER.length - 1;
    for (const city of [undefined, ...Object.keys(BOARD_CITIES)]) {
      const withBall = city === 'percentile' || city === 'algebria';
      ENGLISH_LADDER.forEach((step, i) =>
        expect(hasMasterBall(boardStep(i, city)), `${city} ${step.name.en}`).toBe(withBall && i === top),
      );
    }
  });

  it('every library adds its specialty and offers its own rare Pokémon (all board Pokémon)', () => {
    for (const [city, flavor] of Object.entries(BOARD_CITIES)) {
      ENGLISH_LADDER.forEach((step, i) => {
        const cityStep = boardStep(i, city);
        expect(cityStep.prizes, city).toContain(flavor.specialty);
        if (step.rarePokemon) expect(cityStep.rarePokemon?.ids, city).toBe(flavor.rarePokemon);
        else expect(cityStep.rarePokemon, city).toBeUndefined();
      });
      if (flavor.rarePokemon !== 'all') {
        for (const id of flavor.rarePokemon) expect(BOARD_POKEMON, `${city} #${id}`).toContain(id);
      }
    }
  });

  it('odds sum to 1 and more stars never lower the chance of a rare prize', () => {
    let prevRare = -1;
    for (const n of [1, 2, 3] as const) {
      const odds = RARITY_ODDS_BY_STARS[n];
      expect(DRAWN_RARITIES.reduce((s, r) => s + odds[r], 0)).toBeCloseTo(1);
      expect(odds.rare).toBeGreaterThanOrEqual(prevRare);
      prevRare = odds.rare;
    }
  });

  it('epic: never below 3 stars, at most one per round, Master Ball ≤ 2% and a rare Pokémon ≤ 5% of 3★ rounds', () => {
    const top = ENGLISH_LADDER.length - 1;
    for (const step of ENGLISH_LADDER)
      expect(epicOdds(step, none).reduce((s, e) => s + e.chance, 0), step.name.en).toBeLessThan(1);
    const rng = createRng(7);
    const ROUNDS = 40000;
    let masterBalls = 0;
    let pokemon = 0;
    for (let n = 0; n < ROUNDS; n++) {
      for (const stars of [1, 2] as const)
        expect(boardPrizes(top, stars, none, ALL_BADGES, rng, 'percentile').some((p) => p.rarity === 'epic')).toBe(false);
      const prizes = boardPrizes(top, 3, none, ALL_BADGES, rng, 'percentile');
      expect(prizes.filter((p) => p.rarity === 'epic').length).toBeLessThanOrEqual(1);
      if (prizes.some((p) => p.reward.items?.some((i) => i.itemId === 'master-ball'))) masterBalls++;
      if (prizes.some((p) => p.reward.pokemon)) pokemon++;
    }
    expect(masterBalls / ROUNDS).toBeLessThan(0.023);
    expect(masterBalls / ROUNDS).toBeGreaterThan(0.017);
    expect(pokemon / ROUNDS).toBeLessThan(0.055);
    expect(pokemon / ROUNDS).toBeGreaterThan(0.045);
  }, 30_000); // 120k simulated rounds

  it('one prize per star, none without a clear, rarities only from the level pool', () => {
    for (let i = 0; i < ENGLISH_LADDER.length; i++) {
      const rarities = new Set(boardPool(ENGLISH_LADDER[i], none).map((p) => p.rarity));
      for (const stars of [0, 1, 2, 3] as const) {
        for (let seed = 1; seed <= 20; seed++) {
          const prizes = boardPrizes(i, stars, none, ALL_BADGES, createRng(seed));
          expect(prizes).toHaveLength(stars);
          for (const p of prizes) {
            expect(p.kind).toBe('board');
            expect(rarities.has(p.rarity)).toBe(true);
          }
        }
      }
    }
  });

  it('board Pokémon: first stages from later generations, never one the player owns', () => {
    expect(BOARD_POKEMON).toContain(RIOLU);
    expect(BOARD_POKEMON).not.toContain(LUCARIO);
    expect(BOARD_POKEMON.every((id) => id > 251)).toBe(true);

    const top = ENGLISH_LADDER[ENGLISH_LADDER.length - 1];
    const ids = (owned: Set<number>) => rarePokemonPrize(top, owned)?.oneOf.map((r) => r.pokemon!.id) ?? [];
    expect(ids(new Set([RIOLU]))).not.toContain(RIOLU);
    expect(rarePokemonPrize(top, new Set(BOARD_POKEMON))).toBeNull();
    expect(rarePokemonPrize(ENGLISH_LADDER[0], none)).toBeNull();
  });
});

describe('Word Board premium prizes', () => {
  const isVitamin = (r: DialogueReward) => !!r.items?.some((i) => getItem(i.itemId)?.effect.type === 'vitamin');
  const premiumOf = (r: DialogueReward): keyof typeof PREMIUM_BADGES | null =>
    r.items?.some((i) => i.itemId === 'master-ball')
      ? 'masterBall'
      : r.pokemon
        ? 'rarePokemon'
        : r.items?.some((i) => i.itemId === 'rare-candy')
          ? 'rareCandy'
          : isVitamin(r)
            ? 'vitamin'
            : null;

  it('each premium prize needs its badges; others need none', () => {
    for (const city of [undefined, ...Object.keys(BOARD_CITIES)])
      ENGLISH_LADDER.forEach((_, i) => {
        for (const p of boardPool(boardStep(i, city), none)) {
          const kinds = ('oneOf' in p ? p.oneOf : [p.reward]).map(premiumOf);
          const need = Math.max(0, ...kinds.map((k) => (k ? PREMIUM_BADGES[k] : 0)));
          expect(badgesFor(p), `${city} step ${i}`).toBe(need);
        }
      });
  });

  it('a player never wins a premium prize before having its badges', () => {
    const top = ENGLISH_LADDER.length - 1;
    for (let badges = 0; badges <= ALL_BADGES; badges++) {
      const pool = boardPool(unlockedStep(boardStep(top, 'percentile'), badges), none);
      expect(pool.every((p) => badgesFor(p) <= badges)).toBe(true);
      const rng = createRng(badges + 1);
      for (let n = 0; n < 2000; n++)
        for (const p of boardPrizes(top, 3, none, badges, rng, 'percentile')) {
          const kind = premiumOf(p.reward);
          if (kind) expect(PREMIUM_BADGES[kind], kind).toBeLessThanOrEqual(badges);
        }
    }
  });

  it('a new player still gets one prize per star on every level', () => {
    for (let i = 0; i < ENGLISH_LADDER.length; i++)
      for (let seed = 1; seed <= 20; seed++)
        expect(boardPrizes(i, 3, none, 0, createRng(seed), 'algebria')).toHaveLength(3);
  });

  it('all badges keep the Master Ball at its chance', () => {
    const top = ENGLISH_LADDER.length - 1;
    const step = boardStep(top, 'percentile');
    expect(unlockedStep(step, ALL_BADGES)).toEqual(step);
  });
});

describe('Word Board leave lock', () => {
  const NOW = 1_000_000;

  it('leaving an open round closes the board for BOARD_LEAVE_LOCK_MS', () => {
    const save: MiniGamesSave = {};
    openBoardRound(save);
    expect(isBoardRoundOpen(save)).toBe(true);
    leaveBoardRound(save, NOW);
    expect(isBoardRoundOpen(save)).toBe(false);
    expect(boardLockLeft(save, NOW)).toBe(BOARD_LEAVE_LOCK_MS);
    expect(boardLockLeft(save, NOW + BOARD_LEAVE_LOCK_MS)).toBe(0);
  });

  it('a finished round never locks', () => {
    const save: MiniGamesSave = {};
    openBoardRound(save);
    finishBoardRound(save);
    leaveBoardRound(save, NOW);
    expect(boardLockLeft(save, NOW)).toBe(0);
  });

  it('clearBoardLock opens a closed board', () => {
    const save: MiniGamesSave = {};
    openBoardRound(save);
    leaveBoardRound(save, NOW);
    clearBoardLock(save);
    expect(boardLockLeft(save, NOW)).toBe(0);
    expect(isBoardRoundOpen(save)).toBe(false);
  });

  it('no round, no lock', () => {
    const save: MiniGamesSave = {};
    leaveBoardRound(save, NOW);
    expect(boardLockLeft(save, NOW)).toBe(0);
  });
});

describe('Rare Candy', () => {
  const RARE_CANDY_FROM_STEP = 5; // "Level 6"
  const hasCandy = (p: { reward?: DialogueReward; oneOf?: DialogueReward[] }) =>
    [p.reward, ...(p.oneOf ?? [])].some((r) => r?.items?.some((i) => i.itemId === 'rare-candy'));

  it('no board (any city) gives it below level 6', () => {
    for (const city of [undefined, ...Object.keys(BOARD_CITIES)])
      for (let i = 0; i < RARE_CANDY_FROM_STEP; i++)
        expect(boardPool(boardStep(i, city), new Set()).some(hasCandy), `step ${i} ${city ?? ''}`).toBe(false);
  });
});
