import type { Pokemon, PokemonType } from '../types/index.js';
import type { AbilityBattleEffect } from '../types/battle-metadata.js';

/**
 * Returns the combined damage-taken multiplier from a defender's ability effects.
 * Handles unconditional type-based reductions (e.g. Thick Fat) and HP-conditional
 * reductions (e.g. Multiscale).
 */
export function calcAbilityDamageTakenMultiplier(
  def: Pokemon,
  effects: AbilityBattleEffect[],
  moveType: PokemonType,
): number {
  let multiplier = 1;

  for (const effect of effects) {
    switch (effect.kind) {
      case 'damageTakenMultiplier':
        if (effect.moveTypes.includes(moveType)) {
          multiplier *= effect.multiplier;
        }
        break;

      case 'hpConditionalDamageMultiplier': {
        const hpPct = def.maxHp > 0 ? (def.hp / def.maxHp) * 100 : 100;
        if (effect.hpBelowPercent !== undefined && hpPct < effect.hpBelowPercent) {
          multiplier *= effect.multiplier;
        }
        if (effect.hpAtOrAbovePercent !== undefined && hpPct >= effect.hpAtOrAbovePercent) {
          multiplier *= effect.multiplier;
        }
        break;
      }
    }
  }

  return multiplier;
}
