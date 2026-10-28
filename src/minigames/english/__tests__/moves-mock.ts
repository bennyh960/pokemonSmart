/**
 * Moves are heavy data, fetched at game start (`initHeavyData`). Tests that resolve the word bank feed
 * `getAllMoves()` straight from the JSON instead:
 *
 *   vi.mock('<path>/services/pokemon-data.js', async (orig) =>
 *     (await import('<path>/english/__tests__/moves-mock.js')).withMoves(orig));
 */

export async function withMoves(importOriginal: () => Promise<unknown>) {
  const mod = (await importOriginal()) as Record<string, unknown>;
  const moves = (await import('../../../data/moves.json')).default;
  return { ...mod, getAllMoves: () => moves };
}
