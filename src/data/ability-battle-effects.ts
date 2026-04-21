import type { AbilityBattleEffect } from '../types/battle-metadata.js';

export const ABILITY_BATTLE_EFFECTS: Record<string, AbilityBattleEffect[]> = {
  'Thick Fat': [
    { kind: 'damageTakenMultiplier', moveTypes: ['fire', 'ice'], multiplier: 0.5 },
  ],
  'Battle Armor': [
    { kind: 'preventCriticalHits' },
  ],
  'Shell Armor': [
    { kind: 'preventCriticalHits' },
  ],
  Limber: [
    { kind: 'statusImmunity', statuses: ['paralyze'] },
  ],
  Immunity: [
    { kind: 'statusImmunity', statuses: ['poison'] },
  ],
  'Water Veil': [
    { kind: 'statusImmunity', statuses: ['burn'] },
  ],
  'Magma Armor': [
    { kind: 'statusImmunity', statuses: ['freeze'] },
  ],
  Insomnia: [
    { kind: 'statusImmunity', statuses: ['sleep'] },
  ],
  'Vital Spirit': [
    { kind: 'statusImmunity', statuses: ['sleep'] },
  ],
  'Volt Absorb': [
    { kind: 'typeAbsorbHeal', moveTypes: ['electric'], healPercent: 25 },
  ],
  'Water Absorb': [
    { kind: 'typeAbsorbHeal', moveTypes: ['water'], healPercent: 25 },
  ],
  Static: [
    { kind: 'contactStatusChance', status: 'paralyze', chance: 30 },
  ],
  'Poison Point': [
    { kind: 'contactStatusChance', status: 'poison', chance: 30 },
  ],
  'Flame Body': [
    { kind: 'contactStatusChance', status: 'burn', chance: 30 },
  ],
  Contrary: [
    { kind: 'contraryStatChanges' },
  ],
};
