export interface CaptureChanceInput {
  ballRate: number;
  speciesCatchRate: number;
  currentHp: number;
  maxHp: number;
  playerLevel: number;
  wildLevel: number;
  turnNumber: number;
  status?: string | null;
}

const GUARANTEED_CAPTURE_RATE = 255;
const MAX_TURN_BONUS = 0.10;
const MAX_LEVEL_DELTA_BONUS = 0.20;
const LEVEL_DELTA_STEP = 0.02;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getStatusCatchMultiplier(status?: string | null): number {
  switch (status) {
    case 'sleep':
    case 'freeze':
      return 1.5;
    case 'paralysis':
    case 'burn':
    case 'poison':
      return 1.2;
    default:
      return 1;
  }
}

export function getTurnCatchBonus(turnNumber: number): number {
  if (turnNumber <= 1) return 0;
  return Math.min(MAX_TURN_BONUS, turnNumber / 100);
}

export function getLevelDifferenceCatchMultiplier(playerLevel: number, wildLevel: number): number {
  const rawBonus = (playerLevel - wildLevel) * LEVEL_DELTA_STEP;
  return 1 + clamp(rawBonus, -MAX_LEVEL_DELTA_BONUS, MAX_LEVEL_DELTA_BONUS);
}

export function calculateCaptureChance(input: CaptureChanceInput): number {
  if (input.ballRate >= GUARANTEED_CAPTURE_RATE) return 1;

  const maxHp = Math.max(1, input.maxHp);
  const currentHp = clamp(input.currentHp, 0, maxHp);
  const speciesFactor = clamp(input.speciesCatchRate / 255, 0, 1);
  const hpFactor = 1 - ((currentHp / maxHp) * 0.5);
  const statusMultiplier = getStatusCatchMultiplier(input.status);
  const levelMultiplier = getLevelDifferenceCatchMultiplier(input.playerLevel, input.wildLevel);
  const turnBonus = getTurnCatchBonus(input.turnNumber);

  const baseChance = speciesFactor * input.ballRate * hpFactor * statusMultiplier * levelMultiplier;
  return clamp(baseChance + turnBonus, 0, 1);
}
