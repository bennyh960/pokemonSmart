/**
 * Rank-up call — Prof. Algorithma phones the player when a new trainer rank is reached.
 *
 * Every line is generated from the rank data (`src/data/trainer-ranks.ts`), the items'
 * and abilities' own descriptions, and the maps (where the Ability Tutors stand).
 * One call covers all ranks reached since the last call.
 */

import { registerCutscene } from '../data/story/cutscenes.js';
import {
  RANK_FEATURES,
  TRAINER_RANKS,
  type BilingualLabel,
  type RankConfig,
  type RankFeatureId,
} from '../data/trainer-ranks.js';
import { tBoth } from '../i18n/i18n.js';
import { getAbility, getPokemon } from '../services/pokemon-data.js';
import type { PlayerData } from '../types/index.js';
import { findNpcsInAllMaps } from './map-manager.js';
import { queueCutscene } from './story-engine.js';
import {
  describeGrowTips,
  describeRankGoals,
  getRankIndex,
  sayRankPerks,
  takeUnannouncedRanks,
} from './trainer-rank.js';

const RANK_UP_CALL_ID = 'rank-up-call';
/** How many party Pokémon the professor uses to explain abilities (kept low so the call stays short). */
const ABILITY_EXAMPLES = 1;

let _lines: BilingualLabel[] = [];

registerCutscene({
  id: RANK_UP_CALL_ID,
  phoneCaller: { en: 'Prof. Algorithma', he: "פרופ' אלגוריתמה" },
  steps: [{ type: 'dialogue', speakerId: 'Prof.Algorithma', lines: () => _lines }],
});

let _preparing = false;

/** Build the call for every unannounced rank and queue it. No-op while a call is being built. */
export async function startRankUpCall(pd: PlayerData): Promise<void> {
  if (_preparing) return;
  const ranks = takeUnannouncedRanks();
  if (ranks.length === 0) return;
  _preparing = true;
  try {
    _lines = await buildCallLines(pd, ranks);
    queueCutscene(RANK_UP_CALL_ID);
  } finally {
    _preparing = false;
  }
}

/**
 * Kept short: greeting → (first promotion) how to grow → the NEW rank's perks, spoken →
 * feature explanation → next goal → goodbye. No numbers or points.
 * When several ranks were reached at once (e.g. an old save), only the highest one is explained —
 * the Trainer Card lists everything that is active.
 */
async function buildCallLines(pd: PlayerData, ranks: RankConfig[]): Promise<BilingualLabel[]> {
  const top = ranks[ranks.length - 1];
  const lines: BilingualLabel[] = [tBoth('rank.call.greeting', { player: pd.name, rank: top.label })];

  if (getRankIndex(ranks[0].id) === 1) lines.push(tBoth('rank.call.howTo', { tips: describeGrowTips() }));

  lines.push(...sayRankPerks(top));
  for (const feature of top.perks.features ?? []) lines.push(...(await explainFeature(pd, feature)));

  const next = TRAINER_RANKS[getRankIndex(top.id) + 1];
  const goals = next && describeRankGoals(next);
  lines.push(
    !next
      ? tBoth('rank.call.top')
      : goals
        ? tBoth('rank.call.next', { rank: next.label, goals })
        : tBoth('rank.call.nextTraining', { rank: next.label }),
    tBoth('rank.call.bye', { player: pd.name }),
  );
  return lines;
}

async function explainFeature(pd: PlayerData, feature: RankFeatureId): Promise<BilingualLabel[]> {
  const def = RANK_FEATURES[feature];
  const lines = [...def.explain];
  if (feature === 'ability-swap') {
    lines.push(...explainPartyAbilities(pd), ...(await abilityTutorLocations()));
  }
  if (def.hint) lines.push(def.hint);
  return lines;
}

/** "Charmander has Blaze: Powers up FIRE moves in a pinch." for the first party Pokémon. */
function explainPartyAbilities(pd: PlayerData): BilingualLabel[] {
  return pd.party.slice(0, ABILITY_EXAMPLES).flatMap((p) => {
    const ability = p.abilityId != null ? getAbility(p.abilityId) : undefined;
    const species = getPokemon(p.id);
    if (!ability || !species) return [];
    return [tBoth('rank.call.ability', { pokemon: species.name, ability: ability.name, desc: ability.description })];
  });
}

/** Names the places with an Ability Tutor (a shared interior is named by the cities it serves). */
async function abilityTutorLocations(): Promise<BilingualLabel[]> {
  const { hits, labelOf } = await findNpcsInAllMaps((npc) => npc.type === 'abilities-swap');
  const placeIds = [...new Set(hits.flatMap(({ npc, mapId }) => npc.enteredFrom ?? [mapId]))];
  if (placeIds.length === 0) return [];
  const places = placeIds.map(labelOf);
  return [
    tBoth('rank.call.where', {
      places: { en: places.map((p) => p.en).join(', '), he: places.map((p) => p.he).join(', ') },
    }),
  ];
}
