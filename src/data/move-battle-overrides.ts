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

export const MOVE_BATTLE_OVERRIDES: Record<string, MoveOverride> = {
  Struggle: { recoilPercent: 25 },
  'Dragon Rage': { minimumDamage: 40 },
  'Quick Attack': { priority: 1 },
  'Extreme Speed': { priority: 2 },
  'Hyper Beam': { behaviorTags: ['must-recharge'] },
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
  'Soft-Boiled': { healingPercent: 50, target: 'user' },

  // Sweet Scent: lower target evasion by 2
  'Sweet Scent': targetStages(['evasion', -2]),

  // --- Self stat-drop after attacking ---
  'Psycho Boost': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  Overheat: { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Draco Meteor': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  'Leaf Storm': { statChanges: [stageChange('specialAttack', -2, 'user', 100)] },
  Superpower: { statChanges: [stageChange('attack', -1, 'user', 100), stageChange('defense', -1, 'user', 100)] },
  'Hammer Arm': { statChanges: [stageChange('speed', -1, 'user', 100)] },

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

  'Mirror Move': { behaviorTags: ['mirror-move'], target: 'selected-pokemon' },

  // --- Disable: disables target's last used move for 3-6 turns ---
  Disable: { behaviorTags: ['disable'], target: 'selected-pokemon' },

  // --- Foresight: raise user accuracy by 2 stages ---
  Foresight: { statChanges: [stageChange('accuracy', 2, 'user', 100)], target: 'user' },

  // --- Ancient Power: 20% chance to raise all stats by 1 stage (all-or-nothing roll) ---
  'Ancient Power': {
    groupedStatChance: 20,
    statChanges: [
      stageChange('attack', 1, 'user', 100),
      stageChange('defense', 1, 'user', 100),
      stageChange('specialAttack', 1, 'user', 100),
      stageChange('specialDefense', 1, 'user', 100),
      stageChange('speed', 1, 'user', 100),
    ],
  },

  // --- Multi-hit ---
  Bonemerang: { minHits: 2, maxHits: 2 },
  'Dual Chop': { minHits: 2, maxHits: 2 },
  'Double Hit': { minHits: 2, maxHits: 2 },
  'Dual Wingbeat': { minHits: 2, maxHits: 2 },
  'Twin Beam': { minHits: 2, maxHits: 2 },
  Twineedle: { minHits: 2, maxHits: 2, ...statusEffect('poison', 20) },
  'Triple Kick': { minHits: 3, maxHits: 3 },
};
