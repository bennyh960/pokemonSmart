Read your agent spec at `.claude/agents/world-map-builder.md` — focus on **Task 1: Tile Extraction from PNG Tileset**.

## Your Task

Extract tiles from a tileset PNG image and add them to the manifest JSON.

## Steps

1. **Read the tileset PNG** — Use the Read tool on the PNG file. You are multimodal and can see the image. Study it carefully.
2. **Read the existing manifest** at `src/data/tilesets/{name}.json` (if it exists). Note which tiles are already extracted.
3. **Scan the tileset systematically** — The tileset is organized on a 16×16 pixel grid. Go row by row, column by column, identifying each tile.
4. **For each unextracted tile**, determine:
   - `key` — unique short identifier following naming convention (see agent spec)
   - `sx`, `sy` — pixel coordinates on the PNG (must be multiples of 16 for standard tiles)
   - `w`, `h` — dimensions (16×16 for standard, larger for buildings)
   - `walkable` — can the player walk here?
   - `encounter` — do Pokemon spawn here?
   - `destroy` — can this be removed with an HM? (null, "cut", or "strength")
   - `above` — does this render on top of base tiles?
   - `category` — semantic grouping
5. **Add all new tiles** to the manifest JSON, organized by category
6. **Report** a summary table of what was added, grouped by category

## Tips for Hard Tilesets

- If the tileset is large or complex, process it in quadrants (top-left, top-right, bottom-left, bottom-right)
- Look for patterns: terrain tiles are usually in the top rows, buildings in the middle, items/furniture at the bottom
- Multi-tile objects (buildings): identify the full bounding box — count how many 16×16 cells it spans
- Water/shore tiles often come in sets of 8+ for all edge/corner combinations
- Edge/transition tiles connect two terrain types (grass→sand, water→land) — look for color gradients
- Some tiles may be animation frames (e.g., 3 frames of water) — extract all frames as separate tiles
- If unsure about a tile, add it with a descriptive key and conservative properties (walkable=false, above=false)

## IMPORTANT

- **Do NOT guess coordinates** — count carefully on the 16px grid
- **Do NOT skip tiles** — extract everything visible, even if you're unsure what it is
- **Do NOT duplicate keys** — check existing manifest before adding
- **Every row in the tileset should be accounted for** — if you see 16 rows × 16 columns = 256 potential tiles, document why each cell was extracted or skipped
