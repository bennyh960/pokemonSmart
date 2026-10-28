import { vi } from 'vitest';
import movesUrl from '../../data/moves.json?url';
import learnsetUrl from '../../data/learnsets.json?url';
import tmLearnsetUrl from '../../data/tm-learnsets.json?url';
import { initHeavyData } from '../pokemon-data.js';

/**
 * Moves and learnsets are fetched at game start (`initHeavyData`). Tests run the real loader with
 * `fetch` answered from the bundled JSON, so lookups go through the same normalization as the game:
 *
 *   beforeAll(loadHeavyData);
 */
export async function loadHeavyData(): Promise<void> {
  const files: Record<string, () => Promise<{ default: unknown }>> = {
    [movesUrl]: () => import('../../data/moves.json'),
    [learnsetUrl]: () => import('../../data/learnsets.json'),
    [tmLearnsetUrl]: () => import('../../data/tm-learnsets.json'),
  };
  vi.stubGlobal('fetch', async (url: string) => {
    const data = (await files[url]()).default;
    return { json: async () => data };
  });
  try {
    await initHeavyData();
  } finally {
    vi.unstubAllGlobals();
  }
}
