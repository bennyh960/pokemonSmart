 I added a new map JSON at `src/data/maps/<MAP_ID>.json`.
 
 Please connect it fully to the project using the existing patterns:
 
 1. In `src/systems/map-manager.ts`, add a new `registerMap('<MAP_ID>', () => import('../data/maps/<MAP_ID>.json').catch(() => 
import('../data/maps/test-map.json')));`
 2. In `src/editor/map-io.ts`, add `'<MAP_ID>'` to `getKnownMapIds()` so it appears in the map editor load list and transition dropdowns.
 3. Ensure the JSON file’s internal `id` matches `<MAP_ID>`.
 4. If needed, add/update transitions in the relevant map JSON files so the player can enter/exit this map in-game.
 5. If this map should have wild encounters, add/update its table in `src/data/encounter-tables.json` and wire `encounterTableId`.
 
 Keep changes minimal and consistent with the current codebase.