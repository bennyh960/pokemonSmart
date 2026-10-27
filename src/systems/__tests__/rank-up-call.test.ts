import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import { createNewPlayerData } from '../game-state.js';
import { startRankUpCall } from '../rank-up-call.js';
import { consumePendingCutscene } from '../story-engine.js';
import { getCutscene } from '../../data/story/cutscenes.js';
import { rankFlag, updateTrainerRank } from '../trainer-rank.js';
import type { BilingualText } from '../npc.js';

async function callLines(): Promise<BilingualText[]> {
  const id = consumePendingCutscene();
  expect(id).toBe('rank-up-call');
  const step = getCutscene(id!)!.steps[0];
  if (step.type !== 'dialogue' || typeof step.lines !== 'function') throw new Error('expected generated lines');
  return step.lines();
}

describe('rank-up call', () => {
  it('first promotion explains rank XP and the new shop items', async () => {
    const pd = createNewPlayerData();
    pd.name = 'Ash';
    pd.playtime = 1000;
    updateTrainerRank(pd);
    await startRankUpCall(pd);
    const text = (await callLines()).map((l) => l.en).join('\n');
    expect(text).toContain('Ash');
    expect(text).toContain('Amateur');
    expect(text).toContain('every gym badge');
    expect(text).toContain('Ultra Ball');
    expect(text).toContain('To become Pro');
  });

  it('Expert call names the Ability Tutor places from the maps', async () => {
    const pd = createNewPlayerData();
    pd.flags[rankFlag('amateur')] = true;
    pd.flags[rankFlag('pro')] = true;
    pd.playtime = 8000;
    pd.badges = 0b111111;
    pd.pokedex = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 1, 'caught' as const]));
    updateTrainerRank(pd);
    await startRankUpCall(pd);
    const lines = await callLines();
    const where = lines.find((l) => l.en.startsWith('You can find them here'));
    expect(where?.en).toMatch(/Percentile/);
    expect(where?.he.length).toBeGreaterThan(0);
  }, 60_000); // scans every map (cold transform in vitest is slow)
});
