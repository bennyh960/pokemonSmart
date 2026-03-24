Read the sprint file at docs/sprint-{N}.md and your agent spec at .claude/agents/game-engine-developer.md.

```bash
git checkout -b feature/overworld
```

## Current Overworld System

The overworld is already built with:

### Tileset System
- `src/engine/tileset.ts` — loads JSON manifest (`src/data/tilesets/dpp.json`) + PNG spritesheet (`public/sprites/overworld/dpp-tileset.png`)
- Each tile: key, sx, sy, w, h, walkable, encounter, above, destroy, category

### Map System
- `src/data/maps/*.json` — 13+ maps with `tiles` (2D grid), `objects` (above-layer), `npcs`, `transitions`
- `src/systems/map-manager.ts` — map registration and dynamic loading
- `src/engine/tilemap.ts` — rendering with ground → objects → Y-sorted body sprites → above overlays

### Character Sprites
- `src/data/sprites/characters.json` — manifest with frame coordinates per character
- `src/engine/character-sprites.ts` — frame lookup by character ID, facing, pose

### Rendering Pipeline (in `src/scenes/overworld.ts`)
1. Ground tiles (camera-culled from tileset)
2. Ground objects (walkable decorations)
3. Y-sorted body renderables (player, NPCs, buildings, trees)
4. Above overlays (tall grass, roof overhangs)
5. HUD + UI overlays

### Movement
- Grid-based (16px tiles), smooth ~200ms transitions
- `src/engine/camera.ts` — follows player, map bounds
- Canvas: 240×160 logical, 720×480 physical (3x scale)

Implement tasks from the sprint file. When done: run `tsc --noEmit` and `npm run dev` to verify, then commit.
