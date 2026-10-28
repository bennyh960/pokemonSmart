import { describe, expect, it } from 'vitest';
import { pathToFace } from '../grid-path.js';

/** '#' wall, 'B' target, 'S' start, '.' floor. */
function grid(rows: string[]) {
  const at = (ch: string) => {
    const out: { x: number; y: number }[] = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => c === ch && out.push({ x, y })));
    return out;
  };
  const canStand = (x: number, y: number) => rows[y]?.[x] !== undefined && rows[y][x] !== '#';
  return { start: at('S')[0], targets: at('B'), canStand };
}

describe('pathToFace', () => {
  it('walks around walls to the nearest side of the target and faces it', () => {
    const g = grid(['S.#..', '..#B.', '.....']);
    const res = pathToFace(g.start, g.targets, g.canStand)!;
    expect(res.path).toEqual(['down', 'down', 'right', 'right', 'right']);
    expect(res.face).toBe('up');
  });

  it('already next to the target → no steps', () => {
    const g = grid(['SB']);
    expect(pathToFace(g.start, g.targets, g.canStand)).toEqual({ path: [], face: 'right' });
  });

  it('unreachable → null', () => {
    const g = grid(['S#B']);
    expect(pathToFace(g.start, g.targets, g.canStand)).toBeNull();
  });
});
