import { beforeEach, describe, expect, it } from 'vitest';
import '../../data/story/global-gate-config.js';
import '../../data/story/content/act4/quest-percentile-mart.js';
import { getCutscene } from '../../data/story/cutscenes.js';
import { FLAGS } from '../../data/story/flags.js';
import { MapId } from '../../data/maps/map-ids.js';
import martInterior from '../../data/maps/shared/mart-interior.json';
import { createNewPlayerData, getPlayerData, startSandboxGame } from '../game-state.js';
import { isNPCVisible, setNpcEntryOrigin, type NPCData } from '../npc.js';
import { SHARED_XP_CONFIG } from '../shared-xp.js';
import {
  consumePendingCutscene,
  fireStoryTrigger,
  getAutoGateId,
  getAutoGateIdForMap,
  unlockGateTimed,
} from '../story-engine.js';

const MART = MapId.SHARED_MART_INTERIOR;
const PERCENTILE = MapId.PERCENTILE_PERCENTILE;
const MART_GATE = getAutoGateId('pokemarket', MART);
const INTRO = 'cutscene-pct-mart-intro';
const shopkeepers = (martInterior.npcs as unknown as NPCData[]).filter((n) => n.type === 'shopkeeper');

/** Fire without awaiting (it waits for the cutscene to end) and report which cutscene got queued. */
async function queuedCutsceneFor(trigger: Parameters<typeof fireStoryTrigger>[0]): Promise<string | null> {
  void fireStoryTrigger(trigger);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return consumePendingCutscene();
}

beforeEach(() => {
  startSandboxGame(createNewPlayerData());
  consumePendingCutscene();
});

describe('Percentile mart shopkeeper', () => {
  it('only the Percentile shopkeeper sells held items, and only for players coming from Percentile', () => {
    const visibleFrom = (origin: string) => {
      setNpcEntryOrigin(origin);
      return shopkeepers.filter((n) => isNPCVisible(n, {}));
    };
    const fromPercentile = visibleFrom(PERCENTILE);
    expect(fromPercentile.map((n) => n.id)).toEqual(['npc-pct-mart-keeper']);
    expect(fromPercentile[0].categoriesToExclude).not.toContain('held');

    const fromSumville = visibleFrom('sumville/sumville');
    expect(fromSumville).toHaveLength(1);
    expect(fromSumville[0].categoriesToExclude).toContain('held');
  });
});

describe('Percentile mart intro cutscene', () => {
  it('uses the mart’s real auto gate', () => {
    expect(getAutoGateIdForMap(MART)).toBe(MART_GATE);
  });

  it('starts after the shop questions when entered from Percentile', async () => {
    setNpcEntryOrigin(PERCENTILE);
    expect(await queuedCutsceneFor({ type: 'gate-cleared', gateId: MART_GATE })).toBe(INTRO);
  });

  it('does not start in other cities’ marts', async () => {
    setNpcEntryOrigin('sumville/sumville');
    expect(await queuedCutsceneFor({ type: 'gate-cleared', gateId: MART_GATE })).toBeNull();
  });

  it('on entry, waits for the questions unless the player already has a shop pass', async () => {
    setNpcEntryOrigin(PERCENTILE);
    expect(await queuedCutsceneFor({ type: 'map-enter', mapId: MART })).toBeNull();
    unlockGateTimed(MART_GATE, 60_000);
    expect(await queuedCutsceneFor({ type: 'map-enter', mapId: MART })).toBe(INTRO);
  });

  it('plays only once', async () => {
    setNpcEntryOrigin(PERCENTILE);
    getPlayerData().flags[FLAGS.PERCENTILE_MART_INTRO] = true;
    expect(await queuedCutsceneFor({ type: 'gate-cleared', gateId: MART_GATE })).toBeNull();
  });

  it('explains the Exp Share with the real numbers', () => {
    const text = getCutscene(INTRO)!
      .steps.flatMap((s) => (s.type === 'dialogue' ? (typeof s.lines === 'function' ? s.lines() : s.lines) : []))
      .map((l) => `${l.en} ${l.he}`)
      .join('\n');
    expect(text).toContain(`${Math.round(SHARED_XP_CONFIG.watcherShare * 100)}%`);
    expect(text).toContain(`${SHARED_XP_CONFIG.watcherLevelGap}`);
  });
});
