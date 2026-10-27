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
  it('first promotion is short game text: how to grow, new perks, next goal — no points', async () => {
    const pd = createNewPlayerData();
    pd.name = 'Ash';
    pd.playtime = 1000;
    updateTrainerRank(pd);
    await startRankUpCall(pd);
    const lines = await callLines();
    const text = lines.map((l) => l.en).join('\n');
    expect(text).toContain('Ash');
    expect(text).toContain('Amateur');
    expect(text).toContain('earning gym badges');
    expect(text).toContain('rarer items');
    expect(text).toContain('Your next goal is the Pro rank');
    expect(lines.some((l) => /XP|\d+ ?%/.test(l.en + l.he))).toBe(false);
    expect(lines.length).toBeLessThanOrEqual(6);
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
    const where = lines.find((l) => l.en.startsWith('Ability Tutors are waiting'));
    expect(where?.en).toMatch(/Percentile/);
    expect(where?.he.length).toBeGreaterThan(0);
  }, 60_000); // scans every map (cold transform in vitest is slow)

  it('several ranks at once (old save) explain only the newest one', async () => {
    const pd = createNewPlayerData();
    pd.playtime = 9000;
    pd.badges = 0b1111;
    pd.pokedex = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i + 1, 'caught' as const]));
    updateTrainerRank(pd); // Amateur + Pro in one go
    await startRankUpCall(pd);
    const text = (await callLines()).map((l) => l.en).join('\n');
    expect(text).toContain('you are now a Pro trainer');
    expect(text).toContain('rarest goods'); // Pro's shop line
    expect(text).not.toContain('sell you rarer items'); // Amateur's shop line
  });
});
