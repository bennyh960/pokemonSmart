import { getTypeColor } from '../data/type-constants.js';
import type { PokemonType } from '../types/index.js';
import type { LocalizedName, MoveData } from '../services/pokemon-data.js';

export type AttackAnimationFamily = 'lunge' | 'projectile' | 'beam' | 'pulse' | 'burst';

export interface AttackAnimationProfile {
  family: AttackAnimationFamily;
  color: string;
  accentColor: string;
  duration: number;
  impactTime: number;
  selfTarget: boolean;
  shakeIntensity: number;
  flashColor: string;
}

type MoveLike = Pick<MoveData, 'name' | 'type' | 'power' | 'damageClass'>;

const WHITE = '#f8f8ff';

const SELF_STATUS_KEYWORDS = [
  'agility', 'amnesia', 'barrier', 'calm mind', 'defense curl', 'double team', 'focus energy',
  'growth', 'harden', 'meditate', 'minimize', 'recover', 'rest', 'sharpen', 'splash',
  'string shot', 'swords dance', 'transform', 'withdraw',
];

const TARGET_STATUS_KEYWORDS = [
  'confuse', 'growl', 'leer', 'poison', 'powder', 'roar', 'sand-attack', 'screech',
  'sing', 'sleep', 'smoke', 'spore', 'stun', 'supersonic', 'tail whip', 'thunder wave',
  'toxic', 'whirlwind',
];

const BEAM_KEYWORDS = [
  'aurora beam', 'beam', 'bubblebeam', 'flamethrower', 'hydro pump', 'hyper beam', 'ice beam',
  'psybeam', 'psywave', 'solarbeam', 'thunder', 'thunderbolt', 'tri attack',
];

const PROJECTILE_KEYWORDS = [
  'acid', 'ball', 'bomb', 'bubble', 'egg', 'ember', 'gun', 'leaf', 'needle', 'pin missile',
  'rock throw', 'seed', 'shot', 'sludge', 'star', 'sting', 'swift', 'water gun',
];

const BURST_KEYWORDS = [
  'bonemerang', 'dig', 'earthquake', 'explosion', 'fissure', 'magnitude', 'rock slide',
  'self-destruct', 'skull bash',
];

function normalizeName(name: string | LocalizedName): string {
  const value = typeof name === 'string' ? name : name.en;
  return value.toLowerCase().trim();
}

function hasKeyword(name: string, keywords: string[]): boolean {
  return keywords.some(keyword => name.includes(keyword));
}

function getFlashColor(type: PokemonType, color: string): string {
  if (type === 'normal') return '#ffffff';
  if (type === 'dark' || type === 'ghost') return '#c9b6ff';
  if (type === 'ground' || type === 'rock') return '#f0d090';
  return color;
}

export function getAttackAnimationProfile(move: MoveLike): AttackAnimationProfile {
  const moveName = normalizeName(move.name);
  const type = move.type as PokemonType;
  const color = getTypeColor(type);
  const flashColor = getFlashColor(type, color);

  if (move.damageClass === 'status') {
    const selfTarget = hasKeyword(moveName, SELF_STATUS_KEYWORDS) && !hasKeyword(moveName, TARGET_STATUS_KEYWORDS);
    return {
      family: 'pulse',
      color,
      accentColor: WHITE,
      duration: 0.34,
      impactTime: 0.18,
      selfTarget,
      shakeIntensity: 0,
      flashColor,
    };
  }

  if (hasKeyword(moveName, BURST_KEYWORDS) || (move.damageClass === 'physical' && type === 'ground' && (move.power ?? 0) >= 60)) {
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

  if (move.damageClass === 'special' && (hasKeyword(moveName, BEAM_KEYWORDS) || ['electric', 'ice', 'psychic', 'dragon'].includes(type))) {
    return {
      family: 'beam',
      color,
      accentColor: WHITE,
      duration: 0.28,
      impactTime: 0.14,
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
