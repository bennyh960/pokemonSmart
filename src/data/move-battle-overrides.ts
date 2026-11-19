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

/** Roar / Whirlwind: sure stat drops on the target + 30% chance of Speed −1. */
function debuffWithSpeedChance(...changes: Array<[BattleStatId, number]>): MoveOverride {
  const base = targetStages(...changes);
  return { ...base, statChanges: [...base.statChanges!, stageChange('speed', -1, 'target', 30)] };
}

function multiHit2to5(): MoveOverride {
  return { minHits: 2, maxHits: 5 };
}

/** All five battle stats +1 on the user, rolled together (Ancient Power family). */
const ANCIENT_POWER_ALL_STATS: MoveOverride = {
  statChanges: (['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const).map((stat) =>
    stageChange(stat, 1, 'user', 100),
  ),
};

export const MOVE_BATTLE_OVERRIDES: Record<string, MoveOverride> = {
  Struggle: { recoilPercent: 25 },
  'Dragon Rage': { minimumDamage: 40 },
  'Quick Attack': { priority: 1 },
  'Extreme Speed': { priority: 2 },
  Spite: { behaviorTags: ['cut-pp'], effects: [{ bayPassImuunity: true, chance: 100, target: 'target', id: 'other' }] },
  'Hyper Beam': { behaviorTags: ['must-recharge'] },
  'Giga Impact': { behaviorTags: ['must-recharge'] },
  'Self Destruct': { behaviorTags: ['leave-user-at-1-hp'] },
  Explosion: { behaviorTags: ['leave-user-at-1-hp'] },
  'Solar Beam': chargingMove(),
  'Skull Bash': chargingMove(stageChange('defense', 1, 'user')),
  'Sky Attack': chargingMove(),
  'Razor Wind': chargingMove(),
  Fly: { behaviorTags: ['requires-charge-turn', 'two-turn-fly'] },
  Dig: { behaviorTags: ['requires-charge-turn', 'two-turn-dig'] },
  'Future Sight': { behaviorTags: ['future-sight'] },
  Sandstorm: { behaviorTags: ['sandstorm'], target: 'entire-field' },
  'Rain Dance': { behaviorTags: ['rain'], target: 'entire-field' },
  'Sunny Day': { behaviorTags: ['sun'], target: 'entire-field' },
  Hail: { behaviorTags: ['hail'], target: 'entire-field' },
  Reflect: usersFieldEffect('reflect'),
  'Light Screen': usersFieldEffect('light-screen'),
  Mist: usersFieldEffect('mist'),
  Haze: { target: 'entire-field', behaviorTags: ['haze'] },
  'Night Shade': { behaviorTags: ['night-shade'] },
  'Super Fang': { behaviorTags: ['super-fang'] },
  'Hyper Fang': { behaviorTags: ['super-fang'], flinchChance: 10 },
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
  'Poison Gas': statusEffect('poison', 100, { badlyPoisoned: true }),
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

  'Confuse Ray': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5, bayPassImuunity: true }),
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
  'Bone Club': { flinchChance: 10 },

  Absorb: { drainPercent: 50 },
  'Mega Drain': { drainPercent: 50 },
  'Giga Drain': { drainPercent: 50 },
  'Leech Life': { drainPercent: 50 },
  'Draining Kiss': { drainPercent: 50 },
  'Volt Tackle': { recoilPercent: 25, ...statusEffect('paralyze', 10) },
  'Wild Charge': { recoilPercent: 25, ...statusEffect('paralyze', 10) },
  'Wood Hammer': { recoilPercent: 25 },
  'Take Down': { recoilPercent: 25 },
  'Double Edge': { recoilPercent: 25 },
  Submission: { recoilPercent: 25 },
  'Baby Doll Eyes': { statChanges: [stageChange('attack', -1, 'target', 100)], priority: 1 },
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
  Barrier: userStages(['defense', 2]),
  'Defense Curl': userStages(['defense', 1]),
  Meditate: userStages(['attack', 1]),
  'Swords Dance': userStages(['attack', 2]),
  Agility: userStages(['speed', 2]),
  'Double Team': userStages(['evasion', 1]),
  Minimize: userStages(['evasion', 1]),
  Amnesia: userStages(['specialDefense', 2]),
  'Rapid Spin': { behaviorTags: ['rapid-spin-clear'], statChanges: [stageChange('speed', 1, 'user', 100)] },
  'Bulk Up': userStages(['attack', 1], ['defense', 1]),

  // Entry hazards (target opponent's field)
  'Stealth Rock': { behaviorTags: ['stealth-rock'], target: 'selected-pokemon' },
  Spikes: { behaviorTags: ['spikes'], target: 'selected-pokemon' },
  'Toxic Spikes': { behaviorTags: ['toxic-spikes'], target: 'selected-pokemon' },

  // Hazard/screen interactions
  'Brick Break': { behaviorTags: ['brick-break'] },
  Reversal: { behaviorTags: ['reversal'] },
  Defog: { behaviorTags: ['defog'], statChanges: [stageChange('evasion', -1, 'target', 100)] },

  // Healing moves
  Rest: { behaviorTags: ['rest'], target: 'user' },
  Recover: { healingPercent: 50, target: 'user' },
  'Life Dew': { healingPercent: 25, target: 'user' },
  Roost: { healingPercent: 50, target: 'user' },
  Moonlight: {
    healingPercent: 75,
    target: 'user',
    behaviorTags: ['moonlight'],
  },
  'Morning Sun': {
    healingPercent: 75,
    target: 'user',
    behaviorTags: ['morning-sun'],
  },
  Synthesis: {
    healingPercent: 75,
    target: 'user',
    behaviorTags: ['synthesis'],
  },
  'Milk Drink': { healingPercent: 50, target: 'user' },
  'Soft Boiled': { healingPercent: 50, target: 'user' },

  // Sweet Scent: lower target evasion by 2
  'Sweet Scent': targetStages(['evasion', -2]),

  // --- Self stat-drop after attacking ---
  'Psycho Boost': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  Overheat: { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Draco Meteor': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Leaf Storm': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  Superpower: { statChanges: [stageChange('attack', -1, 'user', 100), stageChange('defense', -1, 'user', 100)] },
  'Hammer Arm': { statChanges: [stageChange('speed', -1, 'user', 100)] },
  'Close Combat': {
    statChanges: [stageChange('defense', -1, 'user', 100), stageChange('specialDefense', -1, 'user', 100)],
  },

  // --- Recoil moves ---
  'Flare Blitz': { recoilPercent: 33, ...statusEffect('burn', 10) },
  'Brave Bird': { recoilPercent: 33 },
  'Wave Crash': { recoilPercent: 33 },
  'Belly Drum': { behaviorTags: ['belly-drum'], statChanges: [stageChange('attack', +6, 'user', 100)] },
  Magnitude: { behaviorTags: ['magnitude'] },

  // --- Target stat-down on hit (always) ---
  'Icy Wind': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  'Mud Shot': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  Electroweb: { statChanges: [stageChange('speed', -1, 'target', 100)] },
  Lunge: { statChanges: [stageChange('attack', -1, 'target', 100)] },
  'Mystical Fire': { statChanges: [stageChange('specialAttack', -1, 'target', 100)] },
  'Breaking Swipe': targetStages(['attack', -1]),
  'Skitter Smack': { statChanges: [stageChange('specialAttack', -1, 'target', 100)] },
  Psychic: { statChanges: [stageChange('specialDefense', -1, 'target', 20)] },
  'Shadow Ball': { statChanges: [stageChange('specialDefense', -1, 'target', 20)] },
  'Energy Ball': { statChanges: [stageChange('specialDefense', -1, 'target', 10)] },
  Crunch: { statChanges: [stageChange('defense', -1, 'target', 20)] },
  Moonblast: { statChanges: [stageChange('specialAttack', -1, 'target', 30)] },
  'Low Sweep': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  'High Horsepower': { statChanges: [stageChange('speed', -1, 'target', 100)] },

  // --- Status on hit ---
  'Zap Cannon': statusEffect('paralyze', 100),
  'Will O Wisp': statusEffect('burn', 100),
  'Lava Plume': statusEffect('burn', 30),
  Inferno: statusEffect('burn', 100),
  'Iron Head': { flinchChance: 30 },
  'Dragon Rush': { flinchChance: 20 },
  'Air Slash': { flinchChance: 30 },
  'Zen Headbutt': { flinchChance: 20 },
  Extrasensory: { flinchChance: 10 },
  'Dark Pulse': { flinchChance: 20 },
  'Icicle Crash': { flinchChance: 30 },
  'Force Palm': { ...statusEffect('paralyze', 30), flinchChance: 10 },
  'Fire Fang': { ...statusEffect('burn', 10), flinchChance: 10 },
  'Ice Fang': { ...statusEffect('freeze', 10, { minTurns: 2, maxTurns: 5 }), flinchChance: 10 },
  'Thunder Fang': { ...statusEffect('paralyze', 10), flinchChance: 10 },
  'Gunk Shot': statusEffect('poison', 30),
  'Poison Fang': statusEffect('poison', 50, { badlyPoisoned: true }),

  // --- Confusion on hit ---
  'Alluring Voice': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  Hurricane: volatileEffect('confusion', 30, { minTurns: 2, maxTurns: 5 }),

  // --- Protect-family moves ---
  Protect: { behaviorTags: ['protect'], priority: 4, target: 'user' },
  Detect: { behaviorTags: ['protect'], priority: 4, target: 'user' },
  Endure: { behaviorTags: ['endure'], priority: 4, target: 'user' },

  // --- Destiny Bond: mark the foe; if foe kills user, foe also faints ---
  'Destiny Bond': { behaviorTags: ['destiny-bond'], target: 'user' },

  // --- Counter / Mirror Coat: deal 2× received damage, always go last ---
  Counter: { behaviorTags: ['counter'], priority: -5, target: 'selected-pokemon' },
  'Mirror Coat': { behaviorTags: ['mirror-coat'], priority: -5, target: 'selected-pokemon' },

  // --- Magic Coat: reflect status moves back at the attacker ---
  'Magic Coat': { behaviorTags: ['magic-coat'], priority: 4, target: 'user' },

  // --- One-hit KO moves ---
  Guillotine: { behaviorTags: ['ohko'] },
  'Horn Drill': { behaviorTags: ['ohko'] },
  Fissure: { behaviorTags: ['ohko'] },
  'Sheer Cold': { behaviorTags: ['ohko'] },

  // --- Special behavior moves ---
  'Focus Punch': { behaviorTags: ['focus-punch'] },
  Substitute: { behaviorTags: ['substitute'], target: 'user' },
  'Baton Pass': { behaviorTags: ['baton-pass'], target: 'user' },
  Facade: { behaviorTags: ['facade-boost'] },
  'Foul Play': { behaviorTags: ['foul-play'] },
  'Dream Eater': { behaviorTags: ['dream-eater'], drainPercent: 50 },
  'Burning Jealousy': { behaviorTags: ['burning-jealousy'] },

  // --- Confusion + stat (status moves) ---
  Swagger: {
    target: 'selected-pokemon',
    statChanges: [stageChange('attack', 2, 'target', 100)],
    effects: [{ id: 'confusion' as const, target: 'target' as const, chance: 100, minTurns: 2, maxTurns: 5 }],
  },
  Flatter: {
    target: 'selected-pokemon',
    statChanges: [stageChange('specialAttack', 1, 'target', 100)],
    effects: [{ id: 'confusion' as const, target: 'target' as const, chance: 100, minTurns: 2, maxTurns: 5 }],
  },

  // --- Self-boost on hit ---
  'Flame Charge': { statChanges: [stageChange('speed', 1, 'user', 100)] },
  Trailblaze: { statChanges: [stageChange('speed', 1, 'user', 100)] },
  'Power Up Punch': { statChanges: [stageChange('attack', 1, 'user', 100)] },
  'Drain Punch': { drainPercent: 50 },
  'Meteor Beam': chargingMove(stageChange('specialAttack', 1, 'user', 100)),
  'Psych Up': { behaviorTags: ['psych-up'], target: 'user' },

  // --- Status move self-boosts ---
  Growth: userStages(['specialAttack', 1]),
  'Calm Mind': userStages(['specialAttack', 1], ['specialDefense', 1]),
  Sharpen: userStages(['attack', 1]),
  'Acid Armor': userStages(['defense', 2]),
  Coil: userStages(['attack', 1], ['defense', 1], ['accuracy', 1]),
  'Dragon Dance': userStages(['attack', 1], ['speed', 1]),
  // Curse2: userStages(['attack', 1], ['defense', 1], ['speed', -1]), // todo : for ghost type its should have other
  Curse: {
    effects: [{ bayPassImuunity: true, chance: 100, id: 'curse', target: 'user' }],
    statChanges: [
      stageChange('attack', 1, 'user', 100),
      stageChange('defense', 1, 'user', 100),
      stageChange('speed', -1, 'user', 100),
    ],
    behaviorTags: ['curse'],
    target: 'user',
  },
  'Focus Energy': { behaviorTags: ['focus-energy'], target: 'user' },

  // --- Weight-based power ---
  'Low Kick': { behaviorTags: ['weight-target'] },
  'Grass Knot': { behaviorTags: ['weight-target'] },
  'Heavy Slam': { behaviorTags: ['weight-ratio'] },
  'Heat Crash': { behaviorTags: ['weight-ratio'] },

  // --- High crit rate ---
  'Psycho Cut': { critRate: 1 },
  'Night Slash': { critRate: 1 },
  'Shadow Claw': { critRate: 1 },
  'Leaf Blade': { critRate: 1 },
  'Stone Edge': { critRate: 1 },

  // --- Lock-in rampage moves (2-3 turns, guaranteed confusion at end) ---
  Thrash: { behaviorTags: ['lock-in-outrage'] },
  Outrage: { behaviorTags: ['lock-in-outrage'] },
  'Petal Dance': { behaviorTags: ['lock-in-outrage'] },

  // --- Rollout/Ice Ball: lock up to 5 turns, power doubles each turn ---
  Rollout: { behaviorTags: ['lock-in-rollout'] },
  'Ice Ball': { behaviorTags: ['lock-in-rollout'] },

  // --- Rage: lock-in indefinitely, Attack +1 each time hit ---
  Rage: { behaviorTags: ['lock-in-rage'] },

  // --- Uproar: lock 3-5 turns ---
  Uproar: { behaviorTags: ['lock-in-uproar'] },

  // --- Sleep-usable moves ---
  Snore: { flinchChance: 30 },
  'Sleep Talk': { behaviorTags: ['sleep-talk'], target: 'user' },

  // --- Random-call moves ---
  Metronome: { behaviorTags: ['metronome'], target: 'user' },
  Assist: { behaviorTags: ['assist'], target: 'user' },
  Copycat: { behaviorTags: ['copycat'], target: 'user' },

  // Mimic: copies the foe's last move for the rest of the battle (until switch-out); the saved moveset is untouched
  Mimic: { behaviorTags: ['mimic'], target: 'user' },
  'Mirror Move': { behaviorTags: ['mirror-move'], target: 'selected-pokemon' },

  // --- Disable: disables target's last used move for 3-6 turns ---
  Disable: { behaviorTags: ['disable'], target: 'selected-pokemon' },

  // --- Foresight: raise user accuracy by 2 stages ---
  Foresight: { statChanges: [stageChange('accuracy', 2, 'user', 100)], target: 'user' },

  // --- Ancient Power: 20% chance to raise all stats by 1 stage (all-or-nothing roll) ---
  'Ancient Power': { ...ANCIENT_POWER_ALL_STATS, groupedStatChance: 20 },

  // --- Multi-hit ---
  Bonemerang: { minHits: 2, maxHits: 2 },
  'Dual Chop': { minHits: 2, maxHits: 2 },
  'Double Hit': { minHits: 2, maxHits: 2 },
  'Dual Wingbeat': { minHits: 2, maxHits: 2 },
  'Twin Beam': { minHits: 2, maxHits: 2 },
  Twineedle: { minHits: 2, maxHits: 2, ...statusEffect('poison', 20) },
  'Triple Kick': { minHits: 3, maxHits: 3 },
  'Double Kick': { minHits: 2, maxHits: 2 },
  'Fury Attack': multiHit2to5(),
  'Fury Swipes': multiHit2to5(),
  'Double Slap': multiHit2to5(),
  'Comet Punch': multiHit2to5(),
  'Pin Missile': multiHit2to5(),
  'Spike Cannon': multiHit2to5(),
  Barrage: multiHit2to5(),
  'Bone Rush': multiHit2to5(),
  'Arm Thrust': multiHit2to5(),
  'Bullet Seed': multiHit2to5(),
  'Icicle Spear': multiHit2to5(),
  'Rock Blast': multiHit2to5(),
  'Tail Slap': multiHit2to5(),

  // --- Fixed / level damage ---
  'Seismic Toss': { behaviorTags: ['night-shade'] },
  'Sonic Boom': { fixedDamage: 20 },

  // --- Status on hit (calibration batch 1) ---
  'Ice Punch': statusEffect('freeze', 10, { minTurns: 2, maxTurns: 5 }),
  'Fire Punch': statusEffect('burn', 10),
  'Thunder Punch': statusEffect('paralyze', 10),
  'Heat Wave': statusEffect('burn', 10),
  'Scorching Sands': statusEffect('burn', 30),
  Scald: statusEffect('burn', 30),
  'Poison Jab': statusEffect('poison', 30),
  Sludge: statusEffect('poison', 30),
  'Sludge Wave': statusEffect('poison', 10),
  'Poison Tail': { critRate: 1, ...statusEffect('poison', 10) },
  'Cross Poison': { critRate: 1, ...statusEffect('poison', 10) },
  Discharge: statusEffect('paralyze', 30),
  Nuzzle: statusEffect('paralyze', 100),
  'Dizzy Punch': volatileEffect('confusion', 20, { minTurns: 2, maxTurns: 5 }),
  'Rock Climb': volatileEffect('confusion', 20, { minTurns: 2, maxTurns: 5 }),
  'Signal Beam': volatileEffect('confusion', 10, { minTurns: 2, maxTurns: 5 }),
  'Sand Tomb': trappingEffect(),
  Infestation: trappingEffect(),

  // --- Flinch on hit ---
  Waterfall: { flinchChance: 20 },
  Twister: { flinchChance: 20 },
  Astonish: { flinchChance: 30 },
  'Heart Stamp': { flinchChance: 30 },
  Steamroller: { flinchChance: 30 },

  // --- Target stat-down on hit ---
  'Mud Slap': { statChanges: [stageChange('accuracy', -1, 'target', 100)] },
  Octazooka: { statChanges: [stageChange('accuracy', -1, 'target', 50)] },
  'Leaf Tornado': { statChanges: [stageChange('accuracy', -1, 'target', 50)] },
  'Muddy Water': { statChanges: [stageChange('accuracy', -1, 'target', 30)] },
  'Mirror Shot': { statChanges: [stageChange('accuracy', -1, 'target', 30)] },
  'Mud Bomb': { statChanges: [stageChange('accuracy', -1, 'target', 30)] },
  'Rock Smash': { statChanges: [stageChange('defense', -1, 'target', 50)] },
  'Crush Claw': { statChanges: [stageChange('defense', -1, 'target', 50)] },
  'Razor Shell': { statChanges: [stageChange('defense', -1, 'target', 50)] },
  'Iron Tail': { statChanges: [stageChange('defense', -1, 'target', 30)] },
  Liquidation: { statChanges: [stageChange('defense', -1, 'target', 20)] },
  Acid: { statChanges: [stageChange('defense', -1, 'target', 10)] },
  'Bubble Beam': { statChanges: [stageChange('speed', -1, 'target', 10)] },
  Bubble: { statChanges: [stageChange('speed', -1, 'target', 10)] },
  Constrict: { statChanges: [stageChange('speed', -1, 'target', 10)] },
  'Rock Tomb': { statChanges: [stageChange('speed', -1, 'target', 100)] },
  Bulldoze: { statChanges: [stageChange('speed', -1, 'target', 100)] },
  Pounce: { statChanges: [stageChange('speed', -1, 'target', 100)] },
  'Aurora Beam': { statChanges: [stageChange('attack', -1, 'target', 10)] },
  'Play Rough': { statChanges: [stageChange('attack', -1, 'target', 10)] },
  'Chilling Water': { statChanges: [stageChange('attack', -1, 'target', 100)] },
  Snarl: { statChanges: [stageChange('specialAttack', -1, 'target', 100)] },
  'Struggle Bug': { statChanges: [stageChange('specialAttack', -1, 'target', 100)] },
  'Earth Power': { statChanges: [stageChange('specialDefense', -1, 'target', 10)] },
  'Focus Blast': { statChanges: [stageChange('specialDefense', -1, 'target', 10)] },
  'Flash Cannon': { statChanges: [stageChange('specialDefense', -1, 'target', 10)] },
  'Bug Buzz': { statChanges: [stageChange('specialDefense', -1, 'target', 10)] },
  'Acid Spray': { statChanges: [stageChange('specialDefense', -2, 'target', 100)] },

  // --- Self-boost on hit ---
  'Steel Wing': { statChanges: [stageChange('defense', 1, 'user', 10)] },
  'Metal Claw': { statChanges: [stageChange('attack', 1, 'user', 10)] },
  'Meteor Mash': { statChanges: [stageChange('attack', 1, 'user', 20)] },
  'Charge Beam': { statChanges: [stageChange('specialAttack', 1, 'user', 70)] },
  'Psyshield Bash': {
    statChanges: [stageChange('defense', 1, 'user', 100), stageChange('specialDefense', 1, 'user', 100)],
  },
  'Silver Wind': { ...ANCIENT_POWER_ALL_STATS, groupedStatChance: 10 },
  'Ominous Wind': { ...ANCIENT_POWER_ALL_STATS, groupedStatChance: 10 },

  // --- Crit / recharge / recoil / charge ---
  'Air Cutter': { critRate: 1 },
  'Drill Run': { critRate: 1 },
  'Blast Burn': { behaviorTags: ['must-recharge'] },
  'Hydro Cannon': { behaviorTags: ['must-recharge'] },
  'Frenzy Plant': { behaviorTags: ['must-recharge'] },
  'Head Smash': { recoilPercent: 50 },
  'Solar Blade': chargingMove(),

  // --- Status moves: self boosts ---
  'Iron Defense': userStages(['defense', 2]),
  'Nasty Plot': userStages(['specialAttack', 2]),
  'Rock Polish': userStages(['speed', 2]),
  Autotomize: userStages(['speed', 2]),
  'Cotton Guard': userStages(['defense', 3]),
  Howl: userStages(['attack', 1]),
  'Hone Claws': userStages(['attack', 1], ['accuracy', 1]),
  'Work Up': userStages(['attack', 1], ['specialAttack', 1]),
  'Cosmic Power': userStages(['defense', 1], ['specialDefense', 1]),
  'Quiver Dance': userStages(['specialAttack', 1], ['specialDefense', 1], ['speed', 1]),
  'Shell Smash': userStages(
    ['attack', 2],
    ['specialAttack', 2],
    ['speed', 2],
    ['defense', -1],
    ['specialDefense', -1],
  ),
  'Slack Off': { healingPercent: 50, target: 'user' },

  // --- Status moves: target debuffs / status ---
  'Feather Dance': targetStages(['attack', -2]),
  'Fake Tears': targetStages(['specialDefense', -2]),
  'Eerie Impulse': targetStages(['specialAttack', -2]),
  Tickle: targetStages(['attack', -1], ['defense', -1]),
  'Play Nice': targetStages(['attack', -1]),
  'Tearful Look': targetStages(['attack', -1], ['specialAttack', -1]),
  Confide: targetStages(['specialAttack', -1]),
  Kinesis: targetStages(['accuracy', -1]),
  'Grass Whistle': statusEffect('sleep', 100, { minTurns: 2, maxTurns: 5 }),
  'Teeter Dance': volatileEffect('confusion', 100, { minTurns: 2, maxTurns: 5 }),
  // Thief: does not steal — knocks the target's held item out of use for this battle, ×1.5 power if it has one
  Thief: { behaviorTags: ['thief'] },
  // Teleport: no escape from battle (by design) — the user gets much harder to hit and faster instead
  Teleport: userStages(['evasion', 1], ['speed', 1]),
  Nightmare: volatileEffect('nightmare', 100),
  'Fury Cutter': { behaviorTags: ['fury-cutter'] },
  Psywave: { behaviorTags: ['psywave'] },
  'Tri Attack': { behaviorTags: ['tri-attack'] },
  // Secret Power: varies by location in the original — here always the plain-ground effect (30% paralysis)
  'Secret Power': statusEffect('paralyze', 30),
  // Pursuit: ×2 against a Pokémon that switched in by choice this turn
  Pursuit: { behaviorTags: ['pursuit'] },
  // Bide: store 2 turns, then hit back 2× the damage taken (target 'user' so Protect doesn't block storing)
  Bide: { behaviorTags: ['bide'], target: 'user' },
  // Roar / Whirlwind: no forced switch (would let legendaries flee / break battle flow) — big debuffs instead
  Roar: debuffWithSpeedChance(['attack', -2], ['specialAttack', -2]),
  Whirlwind: debuffWithSpeedChance(['defense', -2], ['specialDefense', -2]),
  'Hidden Power': { behaviorTags: ['hidden-power'] },
  Attract: volatileEffect('infatuation', 100),
  'Toxic Thread': { ...targetStages(['speed', -1]), ...statusEffect('poison', 100) },
};

// console.log(Object.keys(MOVE_BATTLE_OVERRIDES));
