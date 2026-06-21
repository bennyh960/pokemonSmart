import { getTypeColor } from '../data/type-constants.js';
import type { PokemonType } from '../types/index.js';
import type { LocalizedName, MoveData } from '../services/pokemon-data.js';
import type { AttackEffectKind } from '../ui/battle-animations';

export interface AttackAnimationProfile {
  family: AttackEffectKind;
  color: string;
  accentColor: string;
  duration: number;
  impactTime: number;
  selfTarget: boolean;
  shakeIntensity: number;
  flashColor: string;
  variant?: string;
  soundEffect?: string;
}

type MoveLike = Pick<MoveData, 'name' | 'type' | 'power' | 'damageClass'> & { speciesId?: number };

const WHITE = '#f8f8ff';

// Pokemon lines with unique animation variants
const CHARMANDER_LINE = new Set([4, 5, 6]);
const DRATINI_LINE = new Set([147, 148, 149]);

// Vine Whip whip-count variants — more vines for species that make sense
// vine-3: Ivysaur, Bayleef, Meganium, Chikorita, Snivy line, Leafeon etc.
const VINE_WHIP_3 = new Set([2, 152, 153, 154, 495, 496, 470]);
// vine-4: Venusaur (many thick vines), Tangela (body of vines), Lombre, Ludicolo
const VINE_WHIP_4 = new Set([3, 114, 270, 271, 286]);
// vine-5: Tangrowth — literally giant wads of vines
const VINE_WHIP_5 = new Set([465]);

const SELF_STATUS_KEYWORDS = [
  'agility',
  'amnesia',
  'barrier',
  'calm mind',
  'defense curl',
  'double team',
  'focus energy',
  'growth',
  'harden',
  'meditate',
  'minimize',
  'recover',
  'rest',
  'sharpen',
  'splash',
  'string shot',
  'swords dance',
  'transform',
  'withdraw',
];

const TARGET_STATUS_KEYWORDS = [
  'confuse',
  'growl',
  'leer',
  'poison',
  'powder',
  'roar',
  'sand-attack',
  'screech',
  'sing',
  'sleep',
  'smoke',
  'spore',
  'stun',
  'supersonic',
  'tail whip',
  'thunder wave',
  'toxic',
  'whirlwind',
];

// --- Specific move name overrides (checked before generic detection) ---

const PROTECT_SHIELD_MOVES = ['protect', 'detect', 'endure'];

// Sleep-usable & random-call moves: self-targeting pulse
const SLEEP_TALK_MOVES = ['snore', 'sleep talk'];
const RANDOM_CALL_MOVES = ['metronome', 'assist', 'copycat', 'mirror move'];

const SELF_BOOST_MOVES = [
  'harden',
  'defense curl',
  'withdraw',
  'iron defense',
  'barrier',
  'acid armor',
  'amnesia',
  'growth',
  'minimize',
  'stockpile',
];

const COOL_BOOST_MOVES = [
  'dragon dance',
  'quiver dance',
  'shell smash',
  'swords dance',
  'nasty plot',
  'calm mind',
  'bulk up',
  'agility',
  'rock polish',
  'coil',
  'no retreat',
  'victory dance',
];

// 'morning sun',
// 'moonlight',
// 'synthesis',
const HEAL_PULSE_MOVES = ['rest', 'recover', 'roost', 'soft-boiled', 'milk drink'];

const DRAGON_AURA_MOVES = [
  'dragon rage',
  'dragon breath',
  'dragon pulse',
  'dragon claw',
  'dragon rush',
  'outrage',
  'draco meteor',
  'dragon tail',
];

const FLAMETHROWER_MOVES = ['flamethrower', 'fire spin', 'heat wave', 'blast burn', 'inferno'];

const LEAF_SPRAY_MOVES = [
  'razor leaf',
  'leaf blade',
  'petal dance',
  'magic leaf',
  'leaf tornado',
  'petal blizzard',
  'leaf storm',
];

const WATER_FLOW_MOVES = ['water gun', 'waterfall', 'aqua tail', 'whirlpool'];
const SURF_WAVE_MOVES = ['surf', 'hydro pump', 'hydro cannon'];

const PSYCHIC_WAVE_MOVES = ['psychic', 'psywave', 'confusion', 'future sight', 'extrasensory', 'luster purge'];

const ROCK_THROW_MOVES = ['rock throw', 'stone edge', 'rock blast', 'rock wrecker'];

const ROCK_SLIDE_MOVES = ['rock slide', 'ancient power', 'power gem'];

const FIRE_BLAST_MOVES = ['fire blast', 'sacred fire', 'v-create'];

const VINE_WHIP_MOVES = ['vine whip'];

const GIGA_DRAIN_MOVES = ['giga drain', 'mega drain', 'absorb', 'leech life', 'draining kiss'];

const SOLAR_BEAM_MOVES = ['solar beam'];
const RAPID_SPIN_MOVES = ['rapid spin'];
const TWISTER_MOVES = ['twister'];
const DOUBLE_TEAM_MOVES = ['double team'];
const ICY_WIND_MOVES = ['icy wind', 'powder snow'];
const ELECTROWEB_MOVES = ['electroweb'];

const LIGHTNING_MOVES = ['thunderbolt', 'thunder', 'discharge', 'charge beam', 'zap cannon', 'supercell slam'];

const EARTHQUAKE_MOVES = ['earthquake', 'magnitude'];

const SMOKE_SCREEN_MOVES = ['smokescreen', 'smoke screen'];
const MIST_MOVES = ['mist'];
const HAZE_MOVES = ['haze'];
const PUNCH_MOVES = [
  'thunder punch',
  'fire punch',
  'ice punch',
  'mach punch',
  'mega punch',
  'dynamic punch',
  'focus punch',
  'shadow punch',
  'drain punch',
  'hammer arm',
  'sky uppercut',
  'dizzy punch',
  'comet punch',
  'bullet punch',
  'sucker punch',
  'vacuum wave',
  'superpower',
];
const POWDER_MOVES = [
  'sleep powder',
  'poison powder',
  'stun spore',
  'cotton spore',
  'spore',
  'rage powder',
  'magic powder',
  'powder',
];
const CELESTIAL_MOVES = ['moonlight', 'morning sun', 'sunny day', 'moonblast', 'sunblast', 'synthesis'];

const SHADOW_BALL_MOVES = ['shadow ball', 'shadow force'];
const NIGHT_SHADE_MOVES = ['night shade', 'spite', 'shadow sneak', 'ominous wind'];
const BITE_MOVES = [
  'bite',
  'crunch',
  'hyper fang',
  'super fang',
  'ice fang',
  'thunder fang',
  'fire fang',
  'poison fang',
];

// Generic fallback keyword lists (for moves not matched above)
const BURST_KEYWORDS = ['bonemerang', 'dig', 'explosion', 'fissure', 'self-destruct', 'skull bash'];

const BEAM_KEYWORDS = [
  'aurora beam',
  'beam',
  'bubblebeam',
  'hyper beam',
  'ice beam',
  'psybeam',
  'solarbeam',
  'tri attack',
];

const PROJECTILE_KEYWORDS = [
  'acid',
  'ball',
  'bomb',
  'bubble',
  'egg',
  'ember',
  'gun',
  'leaf',
  'needle',
  'pin missile',
  'seed',
  'shot',
  'sludge',
  'star',
  'sting',
  'swift',
];

function normalizeName(name: string | LocalizedName): string {
  const value = typeof name === 'string' ? name : name.en;
  return value.toLowerCase().trim();
}

function matchesAny(moveName: string, list: string[]): boolean {
  return list.some((entry) => moveName.includes(entry));
}

function hasKeyword(name: string, keywords: string[]): boolean {
  return keywords.some((keyword) => name.includes(keyword));
}

function getFlashColor(type: PokemonType, color: string): string {
  if (type === 'normal') return '#ffffff';
  if (type === 'dark' || type === 'ghost') return '#c9b6ff';
  if (type === 'ground' || type === 'rock') return '#f0d090';
  return color;
}

function getVariant(moveName: string, speciesId: number | undefined): string | undefined {
  if (!speciesId) return undefined;

  if (CHARMANDER_LINE.has(speciesId)) {
    if (matchesAny(moveName, DRAGON_AURA_MOVES)) return 'char-dragon';
    if (matchesAny(moveName, FLAMETHROWER_MOVES)) return 'char-fire';
    if (moveName.includes('fire blast')) return 'char-blast';
  }

  if (DRATINI_LINE.has(speciesId)) {
    if (matchesAny(moveName, DRAGON_AURA_MOVES)) return 'dra-dragon';
    if (matchesAny(moveName, LIGHTNING_MOVES)) return 'dra-lightning';
    if (moveName.includes('hyper beam')) return 'dra-hyper';
  }

  // Vine Whip: whip count encoded as 'vine-N'
  if (matchesAny(moveName, VINE_WHIP_MOVES)) {
    if (VINE_WHIP_5.has(speciesId)) return 'vine-5';
    if (VINE_WHIP_4.has(speciesId)) return 'vine-4';
    if (VINE_WHIP_3.has(speciesId)) return 'vine-3';
    return 'vine-2';
  }

  // Non-species variants
  if (moveName === 'thunder') return 'thunder';

  return undefined;
}

export function getAttackAnimationProfile(move: MoveLike): AttackAnimationProfile {
  const moveName = normalizeName(move.name);
  const type = move.type as PokemonType;
  const color = getTypeColor(type);
  const flashColor = getFlashColor(type, color);
  const variant = getVariant(moveName, move.speciesId);

  // --- Specific move overrides (highest priority) ---

  if (matchesAny(moveName, SLEEP_TALK_MOVES)) {
    return {
      family: 'heal-pulse',
      color: '#b088ff',
      accentColor: '#e0c8ff',
      duration: 0.45,
      impactTime: 0.15,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: '#b088ff',
      variant,
    };
  }

  if (matchesAny(moveName, RANDOM_CALL_MOVES)) {
    return {
      family: 'pulse',
      color: '#ff80ff',
      accentColor: '#ffffff',
      duration: 0.4,
      impactTime: 0.18,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: '#ff80ff',
      variant,
    };
  }

  if (matchesAny(moveName, PROTECT_SHIELD_MOVES)) {
    const isEndure = moveName === 'endure';
    return {
      family: 'protect-shield',
      color: isEndure ? '#ff8840' : '#40c8ff',
      accentColor: isEndure ? '#ffffff' : '#c8f0ff',
      duration: 0.7,
      impactTime: 0.0,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: isEndure ? '#ff8840' : '#40c8ff',
      variant: isEndure ? 'endure' : 'protect',
    };
  }

  if (matchesAny(moveName, HEAL_PULSE_MOVES)) {
    return {
      family: 'heal-pulse',
      color: '#48d870',
      accentColor: '#b8ffe8',
      duration: 0.6,
      impactTime: 0.15,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: '#48d870',
      variant,
    };
  }

  if (matchesAny(moveName, SOLAR_BEAM_MOVES)) {
    return {
      family: 'solar-beam',
      color: '#f8d030',
      accentColor: '#ffffff',
      duration: 3.52,
      impactTime: 2.58,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor: '#ffffa0',
      variant,
    };
  }

  if (matchesAny(moveName, RAPID_SPIN_MOVES)) {
    return {
      family: 'rapid-spin',
      color: '#c8c8c8',
      accentColor: '#ffffff',
      duration: 0.45,
      impactTime: 0.28,
      selfTarget: false,
      shakeIntensity: 2.0,
      flashColor: '#ffffff',
      variant,
    };
  }

  if (matchesAny(moveName, TWISTER_MOVES)) {
    return {
      family: 'twister-spin',
      color: '#9060e0',
      accentColor: '#c8a0ff',
      duration: 0.5,
      impactTime: 0.22,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor: '#c8a0ff',
      variant,
    };
  }

  if (matchesAny(moveName, ICY_WIND_MOVES)) {
    return {
      family: 'icy-wind',
      color: '#9fd8ff',
      accentColor: '#ffffff',
      duration: 0.55,
      impactTime: 0.22,
      selfTarget: false,
      shakeIntensity: 1.5,
      flashColor: '#c8f0ff',
      variant,
    };
  }

  if (matchesAny(moveName, ELECTROWEB_MOVES)) {
    return {
      family: 'electroweb',
      color: '#f8d030',
      accentColor: '#ffffff',
      duration: 0.5,
      impactTime: 0.15,
      selfTarget: false,
      shakeIntensity: 1.5,
      flashColor: '#ffffa0',
      variant,
    };
  }

  if (matchesAny(moveName, DOUBLE_TEAM_MOVES)) {
    return {
      family: 'double-team',
      color: '#f0f0f0',
      accentColor: '#a8c8ff',
      duration: 0.55,
      impactTime: 0.1,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: '#ffffff',
      variant,
    };
  }

  if (matchesAny(moveName, DRAGON_AURA_MOVES)) {
    return {
      family: 'dragon-aura',
      color,
      accentColor: WHITE,
      duration: 1.75,
      impactTime: 0.86,
      selfTarget: false,
      shakeIntensity: 3.0,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, FIRE_BLAST_MOVES)) {
    return {
      family: 'fire-blast',
      color,
      accentColor: WHITE,
      duration: 0.52,
      impactTime: 0.21,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, FLAMETHROWER_MOVES)) {
    return {
      family: 'flamethrower',
      color,
      accentColor: WHITE,
      duration: 0.5,
      impactTime: 0.38,
      selfTarget: false,
      shakeIntensity: 2.0,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, PUNCH_MOVES) || moveName.includes('punch')) {
    return {
      family: 'punch',
      color,
      accentColor: WHITE,
      duration: 0.45,
      impactTime: 0.22,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor,
      variant: type,
    };
  }

  if (matchesAny(moveName, LIGHTNING_MOVES)) {
    return {
      family: 'lightning',
      color,
      accentColor: WHITE,
      duration: 2.42,
      impactTime: 1.18,
      selfTarget: false,
      shakeIntensity: 3.0,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, PSYCHIC_WAVE_MOVES)) {
    return {
      family: 'psychic-wave',
      color,
      accentColor: WHITE,
      duration: 1,
      impactTime: 1,
      selfTarget: false,
      shakeIntensity: 2.0,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, GIGA_DRAIN_MOVES)) {
    return {
      family: 'giga-drain',
      color,
      accentColor: WHITE,
      duration: 1,
      impactTime: 1.3,
      selfTarget: false,
      shakeIntensity: 1.5,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, ROCK_SLIDE_MOVES)) {
    return {
      family: 'rock-slide',
      color,
      accentColor: WHITE,
      duration: 0.6,
      impactTime: 0.36,
      selfTarget: false,
      shakeIntensity: 3.5,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, ROCK_THROW_MOVES)) {
    return {
      family: 'rock-throw',
      color,
      accentColor: WHITE,
      duration: 0.46,
      impactTime: 0.34,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, WATER_FLOW_MOVES)) {
    return {
      family: 'water-flow',
      color,
      accentColor: WHITE,
      duration: 0.45,
      impactTime: 0.32,
      selfTarget: false,
      shakeIntensity: 2.0,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, VINE_WHIP_MOVES)) {
    return {
      family: 'vine-whip',
      color: '#2ecc40',
      accentColor: '#a8ff6a',
      duration: 0.55,
      impactTime: 0.38,
      selfTarget: false,
      shakeIntensity: 2.0,
      flashColor: '#a8ff6a',
      variant,
    };
  }

  if (matchesAny(moveName, LEAF_SPRAY_MOVES)) {
    return {
      family: 'leaf-spray',
      color,
      accentColor: WHITE,
      duration: 0.46,
      impactTime: 0.35,
      selfTarget: false,
      shakeIntensity: 2.0,
      flashColor,
      variant,
    };
  }

  if (matchesAny(moveName, SMOKE_SCREEN_MOVES)) {
    return {
      family: 'smoke-screen',
      color: '#404040',
      accentColor: '#909090',
      duration: 0.65,
      impactTime: 0.1,
      selfTarget: false,
      shakeIntensity: 0,
      flashColor: '#606060',
      variant: 'smoke',
    };
  }

  if (matchesAny(moveName, MIST_MOVES)) {
    return {
      family: 'mist-veil',
      color: '#c0e8ff',
      accentColor: '#ffffff',
      duration: 0.65,
      impactTime: 0.1,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: '#d8f0ff',
      variant: 'mist',
    };
  }

  if (matchesAny(moveName, HAZE_MOVES)) {
    return {
      family: 'haze-clear',
      color: '#508860',
      accentColor: '#a0d888',
      duration: 0.7,
      impactTime: 0.1,
      selfTarget: false,
      shakeIntensity: 0,
      flashColor: '#80c880',
      variant: 'haze',
    };
  }

  if (matchesAny(moveName, BITE_MOVES)) {
    const isCrunch = moveName.includes('crunch');
    let typeVar = isCrunch ? 'crunch' : 'bite';
    if (moveName.includes('ice fang')) typeVar = 'ice';
    else if (moveName.includes('thunder fang')) typeVar = 'electric';
    else if (moveName.includes('fire fang')) typeVar = 'fire';
    else if (moveName.includes('poison fang')) typeVar = 'poison';
    return {
      family: 'bite',
      color,
      accentColor: WHITE,
      duration: 0.45,
      impactTime: 0.28,
      selfTarget: false,
      shakeIntensity: isCrunch ? 3.0 : 2.0,
      flashColor,
      variant: typeVar,
    };
  }

  if (matchesAny(moveName, NIGHT_SHADE_MOVES)) {
    return {
      family: 'night-shade',
      color,
      accentColor: '#8840d0',
      duration: 1.5,
      impactTime: 1.22,
      selfTarget: false,
      shakeIntensity: 1.5,
      flashColor: '#6020a8',
      variant: moveName,
    };
  }

  if (matchesAny(moveName, SHADOW_BALL_MOVES)) {
    return {
      family: 'shadow-ball',
      color: '#7038c8',
      accentColor: '#c090ff',
      duration: 0.55,
      impactTime: 0.28,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor: '#9050e0',
      variant,
    };
  }

  if (matchesAny(moveName, POWDER_MOVES)) {
    return {
      family: 'powder',
      color,
      accentColor: WHITE,
      duration: 0.55,
      impactTime: 0.25,
      selfTarget: false,
      shakeIntensity: 0,
      flashColor,
      variant,
    };
  }
  if (matchesAny(moveName, CELESTIAL_MOVES)) {
    return {
      family: 'celestial',
      color,
      accentColor: WHITE,
      duration: 2.55,
      impactTime: 1.25,
      selfTarget: ['sunlight', 'moonlight'].includes(moveName) ? true : false,
      shakeIntensity: 0,
      flashColor,
      variant: moveName,
    };
  }

  if (matchesAny(moveName, SURF_WAVE_MOVES)) {
    const isHydro = moveName.includes('hydro');
    return {
      family: 'surf-wave',
      color: '#2870e8',
      accentColor: '#90d8ff',
      duration: isHydro ? 0.55 : 0.65,
      impactTime: isHydro ? 0.2 : 0.28,
      selfTarget: false,
      shakeIntensity: isHydro ? 3.0 : 3.5,
      flashColor: '#60b8ff',
      variant: isHydro ? 'hydro-pump' : 'surf',
    };
  }

  if (matchesAny(moveName, EARTHQUAKE_MOVES)) {
    return {
      family: 'earthquake',
      color: '#c89050',
      accentColor: '#e8d090',
      duration: 5,
      impactTime: 1,
      selfTarget: false,
      shakeIntensity: 10.5,
      flashColor: '#c8a060',
      variant,
    };
  }

  if (matchesAny(moveName, SELF_BOOST_MOVES)) {
    return {
      family: 'self-boost',
      color: '#c8d8ff',
      accentColor: '#ffffff',
      duration: 0.66,
      impactTime: 0.1,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: '#ffffff',
      variant,
    };
  }

  if (matchesAny(moveName, COOL_BOOST_MOVES)) {
    return {
      family: 'self-boost-cooler',
      color: getTypeColor(type), // use the move's type color
      accentColor: '#ffffff',
      duration: 1.2,
      impactTime: 0.28,
      selfTarget: true,
      shakeIntensity: 0,
      flashColor: getFlashColor(type, getTypeColor(type)),
      variant,
    };
  }

  // --- Generic detection (existing logic, lower priority) ---

  if (move.damageClass === 'status') {
    const selfTarget = hasKeyword(moveName, SELF_STATUS_KEYWORDS) && !hasKeyword(moveName, TARGET_STATUS_KEYWORDS);
    return {
      family: 'pulse',
      color,
      accentColor: WHITE,
      duration: 0.64,
      impactTime: 0.28,
      selfTarget,
      shakeIntensity: 0,
      flashColor,
    };
  }

  if (
    hasKeyword(moveName, BURST_KEYWORDS) ||
    (move.damageClass === 'physical' && type === 'ground' && (move.power ?? 0) >= 60)
  ) {
    return {
      family: 'burst',
      color,
      accentColor: WHITE,
      duration: 0.34,
      impactTime: 0.2,
      selfTarget: false,
      shakeIntensity: 3.5,
      flashColor,
    };
  }

  if (
    move.damageClass === 'special' &&
    (hasKeyword(moveName, BEAM_KEYWORDS) || ['electric', 'ice', 'dragon'].includes(type))
  ) {
    return {
      family: 'beam',
      color,
      accentColor: WHITE,
      duration: 0.68,
      impactTime: 0.34,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor,
    };
  }

  if (hasKeyword(moveName, PROJECTILE_KEYWORDS) || move.damageClass === 'special') {
    return {
      family: 'projectile',
      color,
      accentColor: WHITE,
      duration: 0.34,
      impactTime: 0.2,
      selfTarget: false,
      shakeIntensity: 2.5,
      flashColor,
    };
  }

  return {
    family: 'lunge',
    color,
    accentColor: WHITE,
    duration: 0.26,
    impactTime: 0.11,
    selfTarget: false,
    shakeIntensity: 2,
    flashColor,
  };
}
