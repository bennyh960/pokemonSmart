export interface BattleBackgroundDef {
  id: string;
  label: string;
  assetName: `bg-${string}`;
  candidates: readonly string[];
}

export const BATTLE_BACKGROUNDS = [
  { id: 'aquacordetown', label: 'Aquacorde Town', assetName: 'bg-aquacordetown', candidates: ['bg-aquacordetown.jpg'] },
  { id: 'beach', label: 'Beach', assetName: 'bg-beach', candidates: ['bg-beach.jpg'] },
  { id: 'city', label: 'City', assetName: 'bg-city', candidates: ['bg-city.jpg'] },
  { id: 'dampcave', label: 'Damp Cave', assetName: 'bg-dampcave', candidates: ['bg-dampcave.jpg'] },
  { id: 'darkbeach', label: 'Dark Beach', assetName: 'bg-darkbeach', candidates: ['bg-darkbeach.jpg'] },
  { id: 'darkcity', label: 'Dark City', assetName: 'bg-darkcity', candidates: ['bg-darkcity.jpg'] },
  { id: 'darkmeadow', label: 'Dark Meadow', assetName: 'bg-darkmeadow', candidates: ['bg-darkmeadow.jpg'] },
  { id: 'deepsea', label: 'Deep Sea', assetName: 'bg-deepsea', candidates: ['bg-deepsea.jpg'] },
  { id: 'desert', label: 'Desert', assetName: 'bg-desert', candidates: ['bg-desert.jpg'] },
  { id: 'earthycave', label: 'Earthy Cave', assetName: 'bg-earthycave', candidates: ['bg-earthycave.jpg'] },
  { id: 'elite4drake', label: 'Elite Four', assetName: 'bg-elite4drake', candidates: ['bg-elite4drake.jpg'] },
  { id: 'forest', label: 'Forest', assetName: 'bg-forest', candidates: ['bg-forest.jpg'] },
  { id: 'icecave', label: 'Ice Cave', assetName: 'bg-icecave', candidates: ['bg-icecave.jpg'] },
  { id: 'leaderwallace', label: 'Leader Battle', assetName: 'bg-leaderwallace', candidates: ['bg-leaderwallace.jpg'] },
  { id: 'library', label: 'Library', assetName: 'bg-library', candidates: ['bg-library.jpg'] },
  { id: 'meadow', label: 'Meadow', assetName: 'bg-meadow', candidates: ['bg-meadow.jpg'] },
  { id: 'orasdesert', label: 'ORAS Desert', assetName: 'bg-orasdesert', candidates: ['bg-orasdesert.jpg'] },
  { id: 'orassea', label: 'ORAS Sea', assetName: 'bg-orassea', candidates: ['bg-orassea.jpg'] },
  { id: 'skypillar', label: 'Sky Pillar', assetName: 'bg-skypillar', candidates: ['bg-skypillar.jpg'] },
] as const satisfies readonly BattleBackgroundDef[];

export type BattleBackgroundId = typeof BATTLE_BACKGROUNDS[number]['id'];

const BATTLE_BACKGROUND_BY_ID = new Map<BattleBackgroundId, BattleBackgroundDef>(
  BATTLE_BACKGROUNDS.map((bg) => [bg.id, bg]),
);

const BATTLE_BACKGROUND_ALIASES: Record<string, BattleBackgroundId> = {
  ocean: 'orassea',
  cave: 'earthycave',
  gym: 'leaderwallace',
  elite4: 'elite4drake',
  route: 'forest',
};

const BATTLE_CONTEXT_TO_BACKGROUND: Record<string, BattleBackgroundId> = {
  grass: 'meadow',
  water: 'orassea',
  cave: 'earthycave',
  city: 'city',
  gym: 'leaderwallace',
  elite: 'elite4drake',
  route: 'forest',
};

export function normalizeBattleBackgroundId(value: string | null | undefined): BattleBackgroundId | null {
  if (!value) return null;
  const normalized = BATTLE_BACKGROUND_BY_ID.has(value as BattleBackgroundId)
    ? value as BattleBackgroundId
    : BATTLE_BACKGROUND_ALIASES[value];
  return normalized ?? null;
}

export function getBattleBackgroundDef(id: string | null | undefined): BattleBackgroundDef | null {
  const normalized = normalizeBattleBackgroundId(id);
  return normalized ? BATTLE_BACKGROUND_BY_ID.get(normalized) ?? null : null;
}

export function getBattleBackgroundPath(id: string | null | undefined): string | null {
  const def = getBattleBackgroundDef(id);
  return def ? `/sprites/backgrounds/${def.assetName}.jpg` : null;
}

export function getBattleBackgroundPathForContext(context: string | null | undefined): string | null {
  if (!context) return null;
  return getBattleBackgroundPath(BATTLE_CONTEXT_TO_BACKGROUND[context] ?? null);
}

export function resolveBattleBackgroundPath(
  overrideId: string | null | undefined,
  context: string | null | undefined,
): string | null {
  return getBattleBackgroundPath(overrideId) ?? getBattleBackgroundPathForContext(context);
}
