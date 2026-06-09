import type { AbilityBattleEffect } from '../types/battle-metadata.js';

export const ABILITY_BATTLE_EFFECTS: Record<string, AbilityBattleEffect[]> = {
  // Custom: activates when HP is below 67% (original activates at full HP).
  Multiscale: [
    {
      kind: 'hpConditionalDamageMultiplier',
      hpBelowPercent: 67,
      multiplier: 0.5,
      messageKey: 'ability.multiscaleActivation',
      messageCooldown: 3,
    },
  ],

  // --- Damage reduction ---
  'Thick Fat': [
    {
      kind: 'damageTakenMultiplier',
      moveTypes: ['fire', 'ice'],
      multiplier: 0.5,
      messageKey: 'ability.thickFatActivation',
      messageCooldown: 3,
    },
  ],
  Heatproof: [
    {
      kind: 'damageTakenMultiplier',
      moveTypes: ['fire'],
      multiplier: 0.5,
      messageKey: 'ability.heatproofActivation',
      messageCooldown: 3,
    },
  ],
  // Dry Skin: heals from water, takes extra fire damage
  'Dry Skin': [
    { kind: 'typeAbsorbHeal', moveTypes: ['water'], healPercent: 25 },
    { kind: 'damageTakenMultiplier', moveTypes: ['fire'], multiplier: 1.25 },
  ],

  // --- Type immunities (absorb with no heal) ---
  Levitate: [{ kind: 'typeAbsorbHeal', moveTypes: ['ground'], healPercent: 0 }],
  'Flash Fire': [{ kind: 'typeAbsorbHeal', moveTypes: ['fire'], healPercent: 0 }],
  'Sap Sipper': [{ kind: 'typeAbsorbHeal', moveTypes: ['grass'], healPercent: 0 }],
  'Lightning Rod': [{ kind: 'typeAbsorbHeal', moveTypes: ['electric'], healPercent: 0 }],
  'Storm Drain': [{ kind: 'typeAbsorbHeal', moveTypes: ['water'], healPercent: 0 }],

  // --- Contact recoil (attacker loses % of their own max HP) ---
  'Rough Skin': [{ kind: 'contactRecoilDamage', damagePercent: 12.5 }],
  'Iron Barbs': [{ kind: 'contactRecoilDamage', damagePercent: 12.5 }],

  // --- On switch-in stat changes ---
  Intimidate: [
    {
      kind: 'onSwitchInStatChange',
      target: 'opponent',
      stat: 'attack',
      stages: -1,
      messageKey: 'ability.intimidateActivation',
    },
  ],
  'Battle Armor': [{ kind: 'preventCriticalHits' }],
  'Shell Armor': [{ kind: 'preventCriticalHits' }],
  Limber: [{ kind: 'statusImmunity', statuses: ['paralyze'] }],
  Immunity: [{ kind: 'statusImmunity', statuses: ['poison'] }],
  'Water Veil': [{ kind: 'statusImmunity', statuses: ['burn'] }],
  'Magma Armor': [{ kind: 'statusImmunity', statuses: ['freeze'] }],
  Insomnia: [{ kind: 'statusImmunity', statuses: ['sleep'] }],
  'Vital Spirit': [{ kind: 'statusImmunity', statuses: ['sleep'] }],
  'Volt Absorb': [{ kind: 'typeAbsorbHeal', moveTypes: ['electric'], healPercent: 25 }],
  'Water Absorb': [{ kind: 'typeAbsorbHeal', moveTypes: ['water'], healPercent: 25 }],
  Static: [{ kind: 'contactStatusChance', status: 'paralyze', chance: 30 }],
  'Poison Point': [{ kind: 'contactStatusChance', status: 'poison', chance: 30 }],
  'Flame Body': [{ kind: 'contactStatusChance', status: 'burn', chance: 30 }],
  Contrary: [{ kind: 'contraryStatChanges' }],
  'Sand Stream': [{ kind: 'weatherSummon', weather: 'sandstorm' }],
  Drizzle: [{ kind: 'weatherSummon', weather: 'rain' }],
  Drought: [{ kind: 'weatherSummon', weather: 'sun' }],
  'Snow Warning': [{ kind: 'weatherSummon', weather: 'hail' }],
  'Sand Veil': [{ kind: 'weatherEvasionBoost', weather: 'sandstorm' }],
  'Snow Cloak': [{ kind: 'weatherEvasionBoost', weather: 'hail' }],
  'Sand Rush': [{ kind: 'weatherSpeedBoost', weather: 'sandstorm' }],
  'Swift Swim': [{ kind: 'weatherSpeedBoost', weather: 'rain' }],
  Chlorophyll: [{ kind: 'weatherSpeedBoost', weather: 'sun' }],
  'Ice Body': [{ kind: 'weatherHealInstead', weather: 'hail' }],
  'Rain Dish': [{ kind: 'weatherHealInstead', weather: 'rain' }],
  Overcoat: [{ kind: 'weatherImmunity' }],
};

// export const ABILITY_SWITCHING_OUT_EFFECTS: Record<string, AbilityBattleEffect[]> = {
//   Regenerator: [{ kind: 'onSwitchOutChange', messageKey: 'ability.regeneratorActivation', target: 'self' }],
//   'Natural Cure': [{ kind: 'onSwitchOutChange', messageKey: 'ability.naturalCure', target: 'self', }],
// };
