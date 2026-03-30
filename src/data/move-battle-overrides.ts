import type {
  MoveBattleEffect,
  BattleStatId,
  MajorStatusId,
  MoveBattleMetadata,
  MoveBattleSideEffectId,
  MoveStatChange,
  MoveStatusEffect,
} from '../types/battle-metadata.js';

type MoveOverride = Partial<MoveBattleMetadata>;
type MoveStatusExtra = Omit<MoveStatusEffect, 'status' | 'chance' | 'target'>;

function volatileEffect(
  id: MoveBattleEffect['id'],
  chance: number,
  extra?: Omit<MoveBattleEffect, 'id' | 'chance' | 'target'>,
): MoveOverride {
  return {
    effects: [{
      id,
      chance,
      target: 'target',
      ...extra,
    }],
  };
}

function statusEffect(status: MajorStatusId, chance: number, extra?: MoveStatusExtra): MoveOverride {
  return {
    ailment: {
      status,
      chance,
      target: 'target',
      ...extra,
    },
  };
}

function stageChange(stat: BattleStatId, stages: number, target: 'user' | 'target', chance = 100): MoveStatChange {
  return { stat, stages, target, chance };
}

function userStages(...changes: Array<[BattleStatId, number]>): MoveOverride {
  return {
    target: 'user',
    statChanges: changes.map(([stat, stages]) => stageChange(stat, stages, 'user')),
  };
}

function targetStages(...changes: Array<[BattleStatId, number]>): MoveOverride {
  return {
    target: 'selected-pokemon',
    statChanges: changes.map(([stat, stages]) => stageChange(stat, stages, 'target')),
  };
}

function trappingEffect(): MoveOverride {
  return volatileEffect('trap', 100, { minTurns: 2, maxTurns: 5, damagePercent: 6.25 });
}

function chargingMove(...chargeStatChanges: MoveStatChange[]): MoveOverride {
  return {
    behaviorTags: ['requires-charge-turn'],
    chargeStatChanges,
  };
}

function usersFieldEffect(id: MoveBattleSideEffectId, turns = 5): MoveOverride {
  return {
    target: 'users-field',
    sideEffects: [{ id, target: 'user', turns }],
  };
}

function leavesUserAtOneHp(): MoveOverride {
  return {
    behaviorTags: ['leave-user-at-1-hp'],
  };
}

export const MOVE_BATTLE_OVERRIDES: Record<string, MoveOverride> = {
  'Quick Attack': { priority: 1 },
  'Extreme Speed': { priority: 2 },
  'Hyper Beam': { behaviorTags: ['must-recharge'] },
  'Self Destruct': leavesUserAtOneHp(),
  Explosion: leavesUserAtOneHp(),
  'Solar Beam': chargingMove(),
  'Skull Bash': chargingMove(stageChange('defense', 1, 'user')),
  'Sky Attack': chargingMove(),
  'Razor Wind': chargingMove(),
  Reflect: usersFieldEffect('reflect'),
  'Light Screen': usersFieldEffect('light-screen'),
  Mist: usersFieldEffect('mist'),
  Safeguard: usersFieldEffect('safeguard'),
  'Mach Punch': { priority: 1 },
  'Aqua Jet': { priority: 1 },
  'Ice Shard': { priority: 1 },
  'Bullet Punch': { priority: 1 },
  'Vacuum Wave': { priority: 1 },
  'Shadow Sneak': { priority: 1 },
  'Sucker Punch': { priority: 1, behaviorTags: ['fails-if-target-not-attacking'] },

  'Karate Chop': { critRate: 1 },
  'Razor Leaf': { critRate: 1 },
  Slash: { critRate: 1 },
  Crabhammer: { critRate: 1 },
  Aeroblast: { critRate: 1 },
  'Cross Chop': { critRate: 1 },
  'Blaze Kick': { critRate: 1 },

  Ember: statusEffect('burn', 10),
  Flamethrower: statusEffect('burn', 10),
  'Fire Blast': statusEffect('burn', 10),
  'Flame Wheel': statusEffect('burn', 10),
  'Sacred Fire': statusEffect('burn', 50),

  'Ice Beam': statusEffect('freeze', 10, { minTurns: 2, maxTurns: 5 }),
  Blizzard: statusEffect('freeze', 10, { minTurns: 2, maxTurns: 5 }),
  'Powder Snow': statusEffect('freeze', 10, { minTurns: 2, maxTurns: 5 }),

  Toxic: statusEffect('poison', 100, { badlyPoisoned: true }),
  'Poison Powder': statusEffect('poison', 100),
  'Poison Sting': statusEffect('poison', 30),
  Smog: statusEffect('poison', 40),
  'Sludge Bomb': statusEffect('poison', 30),

  'Thunder Wave': statusEffect('paralyze', 100),
  'Stun Spore': statusEffect('paralyze', 100),
  Glare: statusEffect('paralyze', 100),
  'Thunder Shock': statusEffect('paralyze', 10),
  Thunderbolt: statusEffect('paralyze', 10),
  Thunder: statusEffect('paralyze', 30),
  'Body Slam': statusEffect('paralyze', 30),
  Lick: statusEffect('paralyze', 30),
  'Dragon Breath': statusEffect('paralyze', 30),
  Spark: statusEffect('paralyze', 30),

  Sing: statusEffect('sleep', 100, { minTurns: 2, maxTurns: 5 }),
  'Sleep Powder': statusEffect('sleep', 100, { minTurns: 2, maxTurns: 5 }),
  Hypnosis: statusEffect('sleep', 100, { minTurns: 2, maxTurns: 5 }),
  Spore: statusEffect('sleep', 100, { minTurns: 2, maxTurns: 5 }),
  'Lovely Kiss': statusEffect('sleep', 100, { minTurns: 2, maxTurns: 5 }),

  'Confuse Ray': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  Supersonic: volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  'Sweet Kiss': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  Confusion: volatileEffect('confusion', 10, { minTurns: 2, maxTurns: 5 }),
  Psybeam: volatileEffect('confusion', 10, { minTurns: 2, maxTurns: 5 }),
  'Water Pulse': volatileEffect('confusion', 20, { minTurns: 2, maxTurns: 5 }),
  'Dynamic Punch': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  'Leech Seed': volatileEffect('leech-seed', 100),
  Wrap: trappingEffect(),
  Bind: trappingEffect(),
  Clamp: trappingEffect(),
  'Fire Spin': trappingEffect(),
  Whirlpool: trappingEffect(),

  Bite: { flinchChance: 30 },
  Headbutt: { flinchChance: 30 },
  Stomp: { flinchChance: 30 },
  'Rock Slide': { flinchChance: 30 },
  'Rolling Kick': { flinchChance: 30 },
  'Hyper Fang': { flinchChance: 10 },
  'Bone Club': { flinchChance: 10 },

  Absorb: { drainPercent: 50 },
  'Mega Drain': { drainPercent: 50 },
  'Giga Drain': { drainPercent: 50 },
  'Leech Life': { drainPercent: 50 },

  'Take Down': { recoilPercent: 25 },
  'Double Edge': { recoilPercent: 25 },
  Submission: { recoilPercent: 25 },

  Growl: targetStages(['attack', -1]),
  'Tail Whip': targetStages(['defense', -1]),
  Leer: targetStages(['defense', -1]),
  'String Shot': targetStages(['speed', -1]),
  Smokescreen: targetStages(['accuracy', -1]),
  'Sand Attack': targetStages(['accuracy', -1]),
  Flash: targetStages(['accuracy', -1]),
  Screech: targetStages(['defense', -2]),
  'Scary Face': targetStages(['speed', -2]),
  'Cotton Spore': targetStages(['speed', -2]),
  'Metal Sound': targetStages(['specialDefense', -2]),
  Charm: targetStages(['attack', -2]),

  Harden: userStages(['defense', 1]),
  Withdraw: userStages(['defense', 1]),
  'Defense Curl': userStages(['defense', 1]),
  Meditate: userStages(['attack', 1]),
  'Swords Dance': userStages(['attack', 2]),
  Agility: userStages(['speed', 2]),
  'Double Team': userStages(['evasion', 1]),
  Minimize: userStages(['evasion', 1]),
  Amnesia: userStages(['specialDefense', 2]),
  'Bulk Up': userStages(['attack', 1], ['defense', 1]),
};
