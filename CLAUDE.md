# Pokemon Math Adventure - Project Context

## What is this?
A Pokemon Silver-style RPG where math and logic challenges drive combat. Set in "Numeria" (נומריה), players solve math and logic puzzles to attack, decode ciphers to find antidotes, and stop a rogue AI called NULL-X.

## Key Files
- **Full game spec:** `docs/game-spec.md` — THE reference for everything (story, world, mechanics, Pokemon, gym leaders)
- **Current sprint:** `docs/sprint-2.md` — Active tasks, who's doing what, QA status
- **Roadmap:** `docs/roadmap.md` — All sprints planned, what's done vs pending
- **Agent definitions:** `.claude/agents/*.md` — 8 agents with detailed roles
- **Agent prompts:** `.claude/prompts/*.md` — Ready-to-run instructions for parallel execution

## Agents
| Agent | File | Role |
|-------|------|------|
| product-manager | Built-in (you) | Sprint planning, coordination, roadmap |
| game-designer | `.claude/agents/game-designer.md` | Mechanics, balance, progression |
| math-engine-developer | `.claude/agents/math-engine-developer.md` | Math & logic problem generation |
| game-engine-developer | `.claude/agents/game-engine-developer.md` | Core game loop, overworld, tilemap |
| frontend-developer | `.claude/agents/frontend-developer.md` | UI, battle screens, audio integration |
| asset-manager | `.claude/agents/pixel-artist.md` | Sourcing sprites/tiles/sounds from APIs |
| world-map-builder | `.claude/agents/world-map-builder.md` | Map design using tileset JSON manifests |
| qa-tester | `.claude/agents/qa-tester.md` | Testing + documentation |

## Tech Stack
- **Runtime:** Vite + TypeScript + HTML5 Canvas (240×160 logical coords, 720×480 physical via `ctx.scale(RES_SCALE=3)` in `src/engine/config.ts`, responsive display)
- **Audio:** Howler.js
- **i18n:** Custom `src/i18n/i18n.ts` — Hebrew (default) + English, `t(key, params)`, L key toggles. **The game is a bilingual learning tool** — see "English Learning" below
- **Data:** PokeAPI (fetched at build time → static JSON)
- **Pokemon:** Real Gen 1-2 (251 Pokemon, real types/moves/evolutions)
- **Starters:** Gen 1 — Bulbasaur, Charmander, Squirtle (8 moves each)
- **Sprites:** PokeAPI (best quality available) for Pokemon battle sprites + DPP-style tileset PNG with JSON manifest (`src/data/tilesets/dpp.json`) for overworld tiles + custom character spritesheets (`src/data/sprites/characters.json`)
- **Maps:** JSON files in `src/data/maps/` — tile grid + objects layer + NPCs + transitions. Registered in `src/systems/map-manager.ts`
- **Interactive tiles:** Tileset tiles can have `category: 'interactive'` with `interactType: { id, args }`. Defaults in `src/data/interact-types.ts`, per-tile overrides in dpp.json, per-instance overrides on PlacedObject. Types: pc, sign, item, cut, strength
- **NPC dialogue:** Bilingual `{ en, he }[]` — resolved at runtime by locale. Legacy `string[]` auto-normalized on map load
- **PC Storage:** 10 boxes × 30 slots in `PlayerData.boxes`. Scene at `src/scenes/pc.ts`, logic at `src/systems/pc-storage.ts`. Save migration v2
- **Badges:** 8 gym badges defined in `src/data/badges.ts` with bilingual names, gym leader, city, type. Stored as bitmask in `pd.badges`
- **Rewards:** `DialogueReward` (any NPC) and `TrainerReward` (post-battle) support items, money, badge, storyEvent. Post-battle dialogue via `postBattleDialogue` on TrainerData
- **Input:** Uses `e.code` (physical key position) for layout-independent controls. `src/engine/input.ts` normalizes legacy key strings
- **Admin:** `ADMIN_NAME` in `src/engine/config.ts` — debug shortcuts (H=heal, N=shop) only for admin player
- **Visual style:** Modern pixel art (not restricted to GBC/retro aesthetics) — full color palettes, clean sprites, performance-first
- **Math in battle:** Currently disabled — will be rethought for a less intrusive mechanic
- **Abilities:** 132 abilities in `src/data/abilities.json`, mapping in `pokemon-abilities.json`. Assigned randomly on Pokemon creation. Displayed on party stats screen
- **Natures:** 25 natures in `src/data/natures.json`. Affect stats (×1.1 boosted / ×0.9 reduced). Assigned randomly on creation. Displayed on party stats screen
- **Items (relational):** `items.json` (229 items from PokeAPI — identity/names/sprites) + `item-defs.ts` (game effects/prices). `items.ts` is a thin adapter combining both. No duplication between data and logic
- **Encounters:** Zone-based wild Pokemon filtering. Tileset tiles have `encounterTypes?: string[]` on `TileDef`. Values: `undefined` = not encounterable, `['*']` = all types, `['*/water,ice']` = all except water & ice, `['water','bug']` = only those types. Map encounter tables (`src/data/encounter-tables.json`) list all Pokemon per map; the tile filters which subset can appear at that grid position. Exclusion logic: Pokemon excluded only if ALL its types are in the exclude list (dual-types with one allowed type still appear). Tileset editor has a visual picker widget with type badges + exception support
- **Save version:** Currently v3. Migration adds abilityId/natureId/heldItemId to Pokemon

## English Learning
The game teaches English vocabulary progressively to Hebrew-speaking players:
- **All data is bilingual** `{ en, he }` — Pokemon names, moves, items, abilities, natures
- **Hebrew is the default locale** — RTL text rendering, right-aligned UI
- **Every new UI element must support both RTL and LTR** — use `isRTL()` checks, `getLocale()` for name resolution
- **Progressive English exposure** (Sprint 11): as playtime increases, Hebrew translations are removed category-by-category, exposing English words the player has already learned through repetition
- **Phase plan:** Types (always English) → Items (~10h) → Abilities (~15h) → Moves (~20h) → Natures (~25h) → Pokemon names (~30h)
- **Hebrew translations for items/abilities/natures are deferred** until Sprint 11 — currently show English names, which is intentional for the learning flow
- **When adding new text/data:** always use `{ en, he }` format for any player-visible string. Even if Hebrew is placeholder (= English copy), the structure must be bilingual from day one

## How to Work
1. Read `docs/roadmap.md` to see overall progress
2. Read `docs/sprint-{N}.md` for current sprint details
3. Each sprint has tasks assigned to agents with branch names
4. Agents work on feature branches → QA tests → merge to main
5. Sprint file gets updated with ✅/❌ status

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm test` — Run vitest tests
- `npm run fetch-data` — Download all PokeAPI data (after pipeline is built)

## Branch Strategy
- `main` — Stable, tested code only
- `feature/*` — Agent work branches (one per sprint task)
- QA tests on feature branch → merge to main if passes
