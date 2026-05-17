import type { PokemonType } from './index.ts';

export type MajorStatusId = 'poison' | 'burn' | 'paralyze' | 'sleep' | 'freeze';

export type WeatherConditionId = 'sandstorm' | 'rain' | 'hail' | 'sun';

export type BattleStatId = 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | 'accuracy' | 'evasion';

export type MoveBattleTarget =
  | 'selected-pokemon'
  | 'user'
  | 'all-opponents'
  | 'users-field'
  | 'entire-field'
  | 'ally'
  | 'user-or-ally'
  | 'random-opponent'
  | 'all-other-pokemon'
  | 'specific-move';

export type MoveBattleBehaviorTag =
  | 'fails-if-target-not-attacking'
  | 'must-recharge'
  | 'requires-charge-turn'
  | 'leave-user-at-1-hp'
  | 'rest'
  | 'focus-energy'
  | 'burning-jealousy'
  | 'focus-punch'
  | 'facade-boost'
  | 'foul-play'
  | 'dream-eater'
  | 'ohko'
  | 'protect'
  | 'endure'
  | 'stealth-rock'
  | 'spikes'
  | 'toxic-spikes'
  | 'brick-break'
  | 'defog'
  | 'rapid-spin-clear'
  | 'substitute'
  | 'baton-pass'
  | 'counter'
  | 'mirror-coat'
  | 'magic-coat'
  | 'destiny-bond'
  | 'future-sight'
  | 'weight-target'
  | 'weight-ratio'
  | 'sandstorm'
  | 'rain'
  | 'hail'
  | 'sun'
  | 'sleep-talk'
  | 'metronome'
  | 'assist'
  | 'copycat'
  | 'mirror-move'
  | 'disable'
  | 'belly-drum'
  | 'magnitude';

export type MoveBattleEffectId = 'confusion' | 'leech-seed' | 'trap';

export type MoveBattleSideEffectId = 'reflect' | 'light-screen' | 'mist' | 'safeguard';

export interface MoveStatusEffect {
  status: MajorStatusId;
  chance: number;
  target: 'user' | 'target';
  badlyPoisoned?: boolean;
  minTurns?: number | null;
  maxTurns?: number | null;
}

export interface MoveStatChange {
  stat: BattleStatId;
  stages: number;
  target: 'user' | 'target';
  chance: number;
}

export interface MoveBattleEffect {
  id: MoveBattleEffectId;
  target: 'user' | 'target';
  chance: number;
  minTurns?: number | null;
  maxTurns?: number | null;
  damagePercent?: number | null;
}

export interface MoveBattleSideEffect {
  id: MoveBattleSideEffectId;
  target: 'user' | 'target';
  turns?: number | null;
}

export interface MoveBattleMetadata {
  priority: number;
  target: MoveBattleTarget;
  ailment: MoveStatusEffect | null;
  statChanges: MoveStatChange[];
  chargeStatChanges: MoveStatChange[];
  effects: MoveBattleEffect[];
  sideEffects: MoveBattleSideEffect[];
  critRate: number;
  flinchChance: number | null;
  drainPercent: number | null;
  recoilPercent: number | null;
  healingPercent: number | null;
  minHits: number | null;
  maxHits: number | null;
  minTurns: number | null;
  maxTurns: number | null;
  category: string | null;
  flags: string[];
  behaviorTags: MoveBattleBehaviorTag[];
  minimumDamage: number | null;
  groupedStatChance: number | null;
}

export type AbilityBattleEffect =
  | {
      kind: 'damageTakenMultiplier';
      moveTypes: PokemonType[];
      multiplier: number;
      messageKey?: string;
      messageCooldown?: number;
    }
  | {
      // Triggers when HP% is below/at-or-above a threshold. Use for Multiscale-style abilities.
      kind: 'hpConditionalDamageMultiplier';
      hpBelowPercent?: number;
      hpAtOrAbovePercent?: number;
      multiplier: number;
      messageKey?: string;
      messageCooldown?: number;
    }
  | {
      kind: 'statusImmunity';
      statuses: MajorStatusId[];
    }
  | {
      kind: 'preventCriticalHits';
    }
  | {
      kind: 'typeAbsorbHeal';
      moveTypes: PokemonType[];
      healPercent: number;
    }
  | {
      kind: 'contactStatusChance';
      status: MajorStatusId;
      chance: number;
    }
  | {
      kind: 'contraryStatChanges';
    }
  | {
      // Attacker takes % of their own max HP when they make physical contact (Rough Skin, Iron Barbs).
      kind: 'contactRecoilDamage';
      damagePercent: number;
    }
  | {
      // Fires when this Pokémon enters battle. 'opponent' lowers/raises the foe; 'self' affects the user.
      kind: 'onSwitchInStatChange';
      target: 'opponent' | 'self';
      stat: BattleStatId;
      stages: number;
      messageKey?: string;
    }
  | {
      kind: 'weatherSummon';
      weather: WeatherConditionId;
    }
  | {
      kind: 'weatherEvasionBoost';
      weather: WeatherConditionId;
    }
  | {
      kind: 'weatherSpeedBoost';
      weather: WeatherConditionId;
    }
  | {
      kind: 'weatherHealInstead';
      weather: WeatherConditionId;
    }
  | {
      kind: 'weatherImmunity';
    };

export function createDefaultMoveBattleMetadata(): MoveBattleMetadata {
  return {
    priority: 0,
    target: 'selected-pokemon',
    ailment: null,
    statChanges: [],
    chargeStatChanges: [],
    effects: [],
    sideEffects: [],
    critRate: 0,
    flinchChance: null,
    drainPercent: null,
    recoilPercent: null,
    healingPercent: null,
    minHits: null,
    maxHits: null,
    minTurns: null,
    maxTurns: null,
    category: null,
    flags: [],
    behaviorTags: [],
    minimumDamage: null,
    groupedStatChance: null,
  };
}

export function normalizeMajorStatusId(status: string | null | undefined): MajorStatusId | null {
  switch (status) {
    case 'poison':
      return 'poison';
    case 'burn':
      return 'burn';
    case 'paralysis':
    case 'paralyze':
      return 'paralyze';
    case 'sleep':
      return 'sleep';
    case 'freeze':
      return 'freeze';
    default:
      return null;
  }
}
