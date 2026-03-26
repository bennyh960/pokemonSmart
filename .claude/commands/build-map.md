Read your full instructions at `.claude/agents/world-map-builder.md`.

## Input

The user invoked `/build-map $ARGUMENTS`.

- If a city/route name was given and a map file exists for it in `src/data/maps/` → **update** that map
- If a city/route name was given but no map file exists → **create** a new map for it
- If no arguments were given → read `docs/game-spec.md`, list all cities/routes, check which ones already have maps in `src/data/maps/`, and **create the next missing one**

## Steps

1. Read `.claude/agents/world-map-builder.md` for your full role and formats
2. Read `docs/game-spec.md` for the target city/route lore and theme (if requested create map that not in spec)
3. Read `src/data/tilesets/dpp.json` — the **full manifest** — understand every available tile
4. Read adjacent maps in `src/data/maps/` for transition alignment
5. Design and write the map JSON to `src/data/maps/{id}.json`
6. Verify: tile count, bidirectional transitions, walkability at transition points
7. Update adjacent maps if new transitions are needed
