import type { Pokemon, PokemonType } from '../types/index.js';
import type { AbilityBattleEffect } from '../types/battle-metadata.js';
import type { BattlePokemonRuntimeState } from './battle-state.js';
import { t } from '../i18n/i18n.js';

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

/**
 * Returns a flavor message if one of the defender's damage-reduction abilities activated this hit,
 * respecting the per-ability messageCooldown (show on activation 1, then every N). Returns null if
 * the ability didn't trigger or it's a cooldown turn.
 */
export function getDefenderAbilityActivationMsg(
  def: Pokemon,
  defState: BattlePokemonRuntimeState,
  effects: AbilityBattleEffect[],
  moveType: PokemonType,
  defName: string,
): string | null {
  for (const effect of effects) {
    let triggered = false;
    let messageKey: string | undefined;
    let messageCooldown: number | undefined;

    if (effect.kind === 'damageTakenMultiplier' && effect.messageKey) {
      triggered = effect.moveTypes.includes(moveType);
      messageKey = effect.messageKey;
      messageCooldown = effect.messageCooldown;
    } else if (effect.kind === 'hpConditionalDamageMultiplier' && effect.messageKey) {
      const hpPct = def.maxHp > 0 ? (def.hp / def.maxHp) * 100 : 100;
      triggered =
        (effect.hpBelowPercent !== undefined && hpPct < effect.hpBelowPercent) ||
        (effect.hpAtOrAbovePercent !== undefined && hpPct >= effect.hpAtOrAbovePercent);
      messageKey = effect.messageKey;
      messageCooldown = effect.messageCooldown;
    }

    if (!triggered || !messageKey) continue;

    defState.abilityActivationCount++;
    const cooldown = messageCooldown ?? 1;
    // Show on the 1st activation, then every Nth (1, N+1, 2N+1, ...)
    if ((defState.abilityActivationCount - 1) % cooldown !== 0) return null;

    return t(messageKey, { name: defName });
  }
  return null;
}
