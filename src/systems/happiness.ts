import type { Pokemon } from '../types/index.js';

export const RETURN_MOVE_ID = 216;
export const FRUSTRATION_MOVE_ID = 218;

const PARTY_BONUS = [24, 20, 16, 12, 8, 0] as const;

/**
 * Derives happiness (0-255) from existing Pokemon + party data — no stored happiness field.
 *
 * Components:
 *   EVs sum      (0-186)  — vitamin investment / battle effort
 *   Party bonus  (0-24)   — reward for being the lead; 6th slot = 0
 *   HP bonus     (0-20)   — full health = well cared for
 *   Level bonus  (0-25)   — time spent growing
 *   Status       (-50)    — unhappy when afflicted
 */
export function calcHappiness(pokemon: Pokemon, party: Pokemon[]): number {
  const partyIndex = party.indexOf(pokemon);
  const partyBonus = partyIndex >= 0 ? (PARTY_BONUS[partyIndex] ?? 0) : 0;

  const evs = pokemon.evs ?? { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 };
  const evsSum = 2 * (evs.hp + evs.atk + evs.def + evs.spe + evs.spa + evs.spd);

  const hpBonus = pokemon.maxHp > 0 ? Math.round((pokemon.hp / pokemon.maxHp) * 20) : 0;

  const levelBonus = Math.min(25, pokemon.level);

  const statusPenalty = pokemon.status != null ? 50 : 0;

  return Math.max(0, Math.min(255, evsSum + partyBonus + hpBonus + levelBonus - statusPenalty));
}

/** Return (move 216): power = happiness × 10/25, min 1, max 102. */
export function getReturnPower(happiness: number): number {
  return Math.max(1, Math.floor((happiness * 10) / 25));
}

/** Frustration (move 218): power = (255 - happiness) × 10/25, min 1, max 102. */
export function getFrustrationPower(happiness: number): number {
  return Math.max(1, Math.floor(((255 - happiness) * 10) / 25));
}

/** Extra crit chance from happiness: 0% at 0 happiness → +3.75% at 255. */
export function getHappinessCritBonus(happiness: number): number {
  return (happiness / 255) * 3.75;
}

/** Threshold for happiness-based evolutions (Espeon, Umbreon). */
export const HAPPINESS_EVOLUTION_THRESHOLD = 220;

export const getHappinessLabel = (happiness: number) => {
  if (happiness >= 220) return { en: 'Delighted', he: 'מאושר מאוד' };
  if (happiness >= 150) return { en: 'Happy', he: 'מאושר' };
  if (happiness >= 75) return { en: 'Neutral', he: 'ניטרלי' };
  if (happiness >= 25) return { en: 'Disappointed', he: 'מאוכזב' };
  return { en: 'Frustrated', he: 'מתוסכל' };
};
