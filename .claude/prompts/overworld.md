Read the sprint file at docs/sprint-1.md section 2 and your agent spec at .claude/agents/game-engine-developer.md.

Run these git commands first:
```
git checkout -b feature/overworld
```

Then implement ALL tasks 2.1-2.6:

1. `src/engine/tilemap.ts` - Load tilemap from JSON, render colored rect tiles (16×16), collision. Tile types: 0=empty, 1=grass(#48A030), 2=path(#C8A870), 3=water(#3080D0,blocked), 4=tree(#206020,blocked), 5=building(#808080,blocked), 6=door(#8B4513,walkable), 7=tall grass(#68C048,walkable+encounters)
2. `src/engine/camera.ts` - Follow player, map bounds, smooth lerp
3. `src/scenes/overworld.ts` - Grid-based movement (16px steps), arrow keys, ~200ms per tile, collision, player as blue 16×16 rect, 10% encounter on tall grass
4. `src/data/maps/test-map.json` - 20×15 tile map with grass, paths, trees, building, tall grass, water, spawn point
5. `src/engine/sprite-loader.ts` - Async image loading with cache
6. Wire Title→Overworld in `src/engine/game.ts`

IMPORTANT: Grid-based movement like real Pokemon. All placeholders as colored rectangles.

When done: run `tsc --noEmit` and `npm run dev` to verify. Then commit all changes to the branch.

After commit, update docs/sprint-1.md - change your tasks status from ⬜ to ✅.
