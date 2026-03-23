Read your agent spec at `.claude/agents/world-map-builder.md` — focus on **Task 2: Map Creation**.

## Your Task

Design and create a game map JSON file for a town or route.

## Steps

1. **Read the game spec** at `docs/game-spec.md` — find the section about the target town/route. Understand its theme, name, purpose in the story.
2. **Read adjacent maps** — find all maps that connect to this one. Note their transition coordinates so yours align:
   - If route-1 transitions to your map at `toX=1, toY=7`, your map must have a walkable tile at (1,7)
   - Your map must have a reverse transition back to that map
3. **Read the tileset manifest** at `src/data/tilesets/dpp.json` — know what tiles are available to you.
4. **Design the layout** considering:
   - **Theme** — How does the map visually represent its lore? (e.g., Sumville = addition = "+" shaped roads)
   - **Size** — Towns: 25-30 wide × 20 tall. Routes: 20-40 wide × 15 tall.
   - **Entry/exit** — Where do players enter and leave? Usually left/right edges at y=6-8.
   - **Buildings** — Towns need: houses, Pokemon Center (pc), Mart (m), Gym (gym1). Place as paired objects for visual balance.
   - **Barriers** — Tree borders (t1) around edges. Mountains/water for natural boundaries.
   - **Paths** — Clear walkable routes connecting all key locations (f1 for town paths, e3 for route ground)
   - **Decoration** — Flowers (fl1-fl4), ponds (w1/w3), signs (sg1), scattered trees for visual interest
   - **NPCs** — 2-4 per town with thematic dialogue. Trainers on routes with Pokemon parties.
5. **Write the map JSON** to `src/data/maps/{id}.json`
6. **Verify bidirectional transitions** — check that every adjacent map has matching reverse transitions. If not, update them.

## Map Structure Checklist

- [ ] `id` — kebab-case, matches filename
- [ ] `name` — display name
- [ ] `tileset` — `"dpp"`
- [ ] `width` × `height` — tile count (not pixels)
- [ ] `tileSize` — `16`
- [ ] `spawn` — aligns with where player arrives from previous map
- [ ] `transitions` — 3 tiles wide at each entry/exit, bidirectional with adjacent maps
- [ ] `npcs` — thematic dialogue, proper facing, trainers have party/reward
- [ ] `music` — `"town"` for towns, `"route"` for routes
- [ ] `encounterTableId` — `null` for towns, set for routes
- [ ] `tiles` — 2D array, every cell filled, exactly width×height dimensions
- [ ] `objects` — buildings and above-layer decorations with correct positions

## Route Design Tips

- Routes are rectangular corridors connecting two towns
- Tall grass patches (g5, g7) with `encounter: true` on the sides
- Main path (e3 ground + r1 road objects) through the middle
- Tree borders top and bottom
- Edge tiles (ec1-ec7) framing the ground area
- 2-3 trainers with increasing difficulty
- Transitions on left and right edges (3 tiles wide)

## Town Design Tips

- Reflect the town's math theme in the layout ("+", "×", etc.)
- Buildings in PAIRS for visual balance
- Central feature (plaza, pond, garden)
- Pokemon Center + Mart are mandatory
- Gym if specified in game spec
- 2-4 NPCs with thematic dialogue
- Signs near entrance and at points of interest
- Flowers and water features for visual interest
- Tree borders with walkable entry gaps at transition points

## IMPORTANT

- **Count every row** — each row in `tiles` must have exactly `width` entries
- **Count every column** — there must be exactly `height` rows
- **Buildings go in objects, not tiles** — base tile under buildings is `g1`
- **Transitions must be walkable** — the tile at transition coordinates must be walkable (e3 or f1, NOT t1)
- **NPCs must not block paths** — place them adjacent to paths, not ON critical walkways
- **Test transitions mentally** — walk through the flow: if player is at route-1 east edge → arrives at your map left edge → walks to right edge → exits to next map
