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
    effects: [
      {
        id,
        chance,
        target: 'target',
        ...extra,
      },
    ],
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
  'Dragon Rage': { minimumDamage: 40 },
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
  'Rapid Spin': userStages(['speed', 1]),
  'Bulk Up': userStages(['attack', 1], ['defense', 1]),

  // Healing moves
  Rest: { behaviorTags: ['rest'], target: 'user' },
  Recover: { healingPercent: 50, target: 'user' },
  Roost: { healingPercent: 50, target: 'user' },
  'Milk Drink': { healingPercent: 50, target: 'user' },
  'Soft-Boiled': { healingPercent: 50, target: 'user' },

  // Sweet Scent: lower target evasion by 2
  'Sweet Scent': targetStages(['evasion', -2]),

  // --- Self stat-drop after attacking ---
  'Psycho Boost': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Overheat': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Draco Meteor': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Leaf Storm': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Superpower': { statChanges: [stageChange('attack', -1, 'user', 100), stageChange('defense', -1, 'user', 100)] },
  'Hammer Arm': { statChanges: [stageChange('speed', -1, 'user', 100)] },

  // --- Recoil moves ---
  'Flare Blitz': { recoilPercent: 33, ...statusEffect('burn', 10) },
  'Brave Bird': { recoilPercent: 33 },
  'Wave Crash': { recoilPercent: 33 },

  // --- Target stat-down on hit (always) ---
  'Icy Wind': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  'Mud Shot': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  'Electroweb': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  'Lunge': { statChanges: [stageChange('attack', -1, 'target', 100)] },
  'Mystical Fire': { statChanges: [stageChange('specialAttack', -1, 'target', 100)] },
  'Breaking Swipe': targetStages(['attack', -1]),
  'Skitter Smack': { statChanges: [stageChange('specialAttack', -1, 'target', 100)] },

  // --- Status on hit ---
  'Zap Cannon': statusEffect('paralyze', 100),
  'Lava Plume': statusEffect('burn', 30),
  'Inferno': statusEffect('burn', 100),
  'Iron Head': { flinchChance: 30 },
  'Dragon Rush': { flinchChance: 20 },
  'Air Slash': { flinchChance: 30 },
  'Zen Headbutt': { flinchChance: 20 },
  'Extrasensory': { flinchChance: 10 },
  'Dark Pulse': { flinchChance: 20 },
  'Icicle Crash': { flinchChance: 30 },
  'Fire Fang': { ...statusEffect('burn', 10), flinchChance: 10 },
  'Ice Fang': { ...statusEffect('freeze', 10, { minTurns: 2, maxTurns: 5 }), flinchChance: 10 },
  'Thunder Fang': { ...statusEffect('paralyze', 10), flinchChance: 10 },
  'Gunk Shot': statusEffect('poison', 30),
  'Poison Fang': statusEffect('poison', 50, { badlyPoisoned: true }),

  // --- Confusion on hit ---
  'Alluring Voice': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  'Hurricane': volatileEffect('confusion', 30, { minTurns: 2, maxTurns: 5 }),

  // --- Special behavior moves ---
  'Focus Punch': { behaviorTags: ['focus-punch'] },
  'Facade': { behaviorTags: ['facade-boost'] },
  'Foul Play': { behaviorTags: ['foul-play'] },
  'Dream Eater': { behaviorTags: ['dream-eater'], drainPercent: 50 },
  'Burning Jealousy': { behaviorTags: ['burning-jealousy'] },

  // --- Confusion + stat (status moves) ---
  'Swagger': {
    target: 'selected-pokemon',
    statChanges: [stageChange('attack', 2, 'target', 100)],
    effects: [{ id: 'confusion' as const, target: 'target' as const, chance: 100, minTurns: 2, maxTurns: 5 }],
  },
  'Flatter': {
    target: 'selected-pokemon',
    statChanges: [stageChange('specialAttack', 1, 'target', 100)],
    effects: [{ id: 'confusion' as const, target: 'target' as const, chance: 100, minTurns: 2, maxTurns: 5 }],
  },

  // --- Self-boost on hit ---
  'Flame Charge': { statChanges: [stageChange('speed', 1, 'user', 100)] },
  'Trailblaze': { statChanges: [stageChange('speed', 1, 'user', 100)] },
  'Power Up Punch': { statChanges: [stageChange('attack', 1, 'user', 100)] },
  'Drain Punch': { drainPercent: 50 },
  'Meteor Beam': chargingMove(stageChange('specialAttack', 1, 'user', 100)),

  // --- Status move self-boosts ---
  'Growth': userStages(['specialAttack', 1]),
  'Sharpen': userStages(['attack', 1]),
  'Acid Armor': userStages(['defense', 2]),
  'Coil': userStages(['attack', 1], ['defense', 1], ['accuracy', 1]),
  'Focus Energy': { behaviorTags: ['focus-energy'], target: 'user' },

  // --- High crit rate ---
  'Psycho Cut': { critRate: 1 },
  'Night Slash': { critRate: 1 },
  'Shadow Claw': { critRate: 1 },
  'Leaf Blade': { critRate: 1 },
  'Stone Edge': { critRate: 1 },

  // --- Thrash/Outrage/Petal Dance: 30% self-confusion post-use, no lock-in ---
  'Thrash': { effects: [{ id: 'confusion' as const, target: 'user' as const, chance: 30, minTurns: 1, maxTurns: 2 }] },
  'Outrage': { effects: [{ id: 'confusion' as const, target: 'user' as const, chance: 30, minTurns: 1, maxTurns: 2 }] },
  'Petal Dance': { effects: [{ id: 'confusion' as const, target: 'user' as const, chance: 30, minTurns: 1, maxTurns: 2 }] },

  // --- Multi-hit ---
  'Bonemerang': { minHits: 2, maxHits: 2 },
  'Dual Chop': { minHits: 2, maxHits: 2 },
  'Double Hit': { minHits: 2, maxHits: 2 },
  'Dual Wingbeat': { minHits: 2, maxHits: 2 },
  'Twin Beam': { minHits: 2, maxHits: 2 },
  'Twineedle': { minHits: 2, maxHits: 2, ...statusEffect('poison', 20) },
  'Triple Kick': { minHits: 3, maxHits: 3 },
};
