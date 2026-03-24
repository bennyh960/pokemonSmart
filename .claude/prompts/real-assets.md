Read CLAUDE.md for project context, then docs/sprint-{N}.md for current tasks, and your agent spec at .claude/agents/pixel-artist.md.

```bash
git checkout main
git pull 2>/dev/null
git checkout -b feature/real-assets
```

## Current Asset System

The game uses a **JSON manifest + PNG spritesheet** approach:

### Tilesets
- **Manifest:** `src/data/tilesets/dpp.json` — array of tile definitions with key, sx, sy, w, h, walkable, encounter, above, category, description
- **Spritesheet:** `public/sprites/overworld/dpp-tileset.png`
- **Engine:** `src/engine/tileset.ts` loads manifest and extracts tiles from PNG

### Character Sprites
- **Manifest:** `src/data/sprites/characters.json` — character definitions with frame coordinates and pose dict
- **Spritesheet:** `public/sprites/characters/characters_overworld.png`
- **Engine:** `src/engine/character-sprites.ts` loads frames by character ID + facing + pose

### Maps
- **Maps:** `src/data/maps/*.json` — tile grid (2D array of tile keys), objects layer, NPCs, transitions
- **Registration:** `src/systems/map-manager.ts` + `src/editor/map-io.ts`

## Visual Style
Modern pixel art — NOT restricted to GBC/retro. Full color palettes, clean sprites. See pixel-artist agent for details.

## Tasks
Replace remaining placeholder assets with real sprites. For new tiles/characters:
1. Add to the spritesheet PNG
2. Update the corresponding JSON manifest with correct coordinates
3. Verify in-game rendering

Pokemon battle sprites are already in `public/sprites/pokemon/front/` and `back/`.

When done: self-verify (tsc, dev), rebase on main, update sprint file, request QA per your agent instructions.
