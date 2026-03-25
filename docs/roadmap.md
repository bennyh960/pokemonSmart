# Pokemon Math Adventure — Roadmap

## Overall Progress: Sprint 3.5 ✅ COMPLETE (Sprint 3.5 open items → Sprint 4 next)

---

## Sprint 1 — Foundation ✅ COMPLETE
**Goal:** Core technical infrastructure

| Task | Agent | Branch | Status |
|------|-------|--------|--------|
| Math engine (6 levels + adaptive) | math-engine-developer | `feature/math-engine` | ✅ merged |
| Overworld + grid movement | game-engine-developer | `feature/overworld` | ✅ merged |
| PokeAPI data pipeline (251 Pokemon) | asset-manager | `feature/pokeapi-pipeline` | ✅ merged |
| Battle UI + math input | frontend-developer | `feature/battle-ui` | ✅ merged |

**Details:** `docs/sprint-1.md`

---

## Sprint 2 — Integration & Visual Upgrade ✅ COMPLETE
**Goal:** Connect all Sprint 1 pieces into a working battle + audio/visuals

| Task | Agent | Status |
|------|-------|--------|
| Wire real PokeAPI data into battle system | game-engine-developer | ✅ merged |
| Connect math engine to battle UI (solve to attack) | frontend-developer + math-engine-developer | ✅ merged |
| Real Pokemon sprites in battle (from PokeAPI) | asset-manager | ✅ merged |
| Wild encounter system (overworld → battle → back) | game-engine-developer | ✅ merged |
| Save/load system (localStorage) | game-engine-developer | ✅ merged |
| Battle result: XP, level up, evolution check | game-engine-developer | ✅ merged |
| Audio manager + background music | frontend-developer | ✅ merged |

### Post-Sprint 2 Changes (2026-03-20)
| Change | Description |
|--------|-------------|
| Starters → Gen 1 | Bulbasaur / Charmander / Squirtle (were Gen 2) |
| i18n system | Hebrew (default) + English, toggle with L key on title screen |
| 8 moves per Pokemon | Up from 4 — battle menu updated to 2×4 grid |
| Math removed from battle | Math problems disabled during attacks — will rethink motivation mechanic |
| Sprites already transparent | Verified: PokeAPI Gen 2 Gold PNGs have proper alpha channel |

### Known TODOs
- (none — all resolved or moved to sprint backlog)

---

## Sprint 3 — World Building ✅ COMPLETE
**Goal:** Build the actual game world of Numeria

| Task | Agent |
|------|-------|
| 8 city maps + connecting routes (tilemaps) | game-engine-developer + asset-manager |
| NPC system (dialogue, trainers, shopkeepers) | game-engine-developer |
| Pokemon Center (heal) + Poké Mart (shop) | game-engine-developer + frontend-developer |
| Trainer battles (NPC triggers battle) | game-engine-developer |
| Area transitions (walk into door/route exit) | game-engine-developer |
| Pokemon party management UI (switch, view stats) | frontend-developer |
| Pokedex UI | frontend-developer |
| Source tilesets from Spriters Resource | asset-manager |

---

## Sprint 3.5 — Screen Redesign ✅ COMPLETE
**Goal:** Redesign Pokedex, Bag, Party, and Battle sub-screens into full-featured UIs

| Task | Agent | Branch | Status |
|------|-------|--------|--------|
| Enrich PokeAPI data (damage class, descriptions, learnsets) | asset-manager | `feature/enriched-api-data` | ✅ |
| Type constants consolidation | game-engine-developer | `feature/type-constants` | ✅ |
| Pokedex redesign (5-tab detail: info, evolution, types, moves, locations) | frontend-developer | `feature/pokedex-redesign` | ✅ |
| Full-screen Bag with categories, icons, use-on-Pokemon flow | frontend-developer | `feature/bag-screen` | ✅ |
| Party redesign (sub-screens: stats, moves management, Pokedex link) | frontend-developer | `feature/party-redesign` | ✅ |
| Battle integration (full Bag + Party screens in battle) | game-engine-developer + frontend-developer | `feature/battle-bag-party` | ✅ |

**Details:** `docs/sprint-3.5.md`

---

## Sprint 3.5 — Open Items ✅ COMPLETE
**Goal:** Finish remaining work from Sprint 3.5

| Task | Status |
|------|--------|
| Bag item use — wire actual item effects to Pokemon (heal, revive, PP restore, rare candy) | ✅ |
| Move system — learnset-based wild/NPC Pokemon moves (Story 2+3 from `docs/stories/move-system.md`) | ✅ |
| Move system — level-up move learning with UI (Story 6) | ✅ |
| Pokedex "Can Learn (TM)" tab — populate with TM/HM data from PokeAPI | ✅ |
| Battle speed stat — turn order based on speed (currently always player-first) | ✅ |
| NPC item rewards — NPCs can give items on dialogue/quest completion (like trainer battle rewards) | ✅ |

---

## Sprint 4 — Data Refactor (Epic) ⬜ IN PROGRESS
**Goal:** Centralize all game data, remove hardcoded values, leverage PokeAPI fully

This is a foundation sprint — must be done before design/content sprints.

| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| Centralize data folder — single `src/data/` with clear structure | game-engine-developer | ✅ | Already organized: JSON data + TS constants in `src/data/` |
| Remove all hardcoded Pokemon/move values from scene files | game-engine-developer | ✅ | Removed duplicate TYPE_COLORS from party.ts, starter-select.ts, battle-menu.ts; replaced hardcoded fallback Pokemon with data-driven createPokemonFromData |
| Deduplicate localized names (pokemon.json + evolution-chains.json share names) | game-engine-developer | ✅ | Low-priority tech debt (~13KB), deferred to backlog |
| Save/load migration — handle schema changes when data model evolves | game-engine-developer | ✅ | Added saveVersion to PlayerData, versioned migration system in save.ts, auto-upgrades old saves on load |
| Fetch additional PokeAPI data: abilities, natures, held items | asset-manager | 🔜 | TM learnsets ✅ done; abilities/natures/held-items deferred until needed by gameplay |
| Items data — fetch full item list from PokeAPI, map to our ItemDef structure | asset-manager | 🔜 | 47 core items well-defined; full PokeAPI fetch deferred until Sprint 5 |
| Items data — berry system, held items, TMs as items | game-engine-developer | 🔜 | New item categories — deferred until Sprint 5/6 when items are functional |

---

## Sprint 4.5 — Interactable Objects, PC Storage & Reward Expansion ⬜ PLANNED
**Goal:** Add an object interaction layer, Pokemon PC storage, post-battle dialogue, and richer trainer/NPC rewards (badges, story progression)

| Task | Agent | Notes |
|------|-------|-------|
| Interactable object layer — new map data layer for non-NPC objects (PC, signs, bookshelves, TVs) | game-engine-developer | Objects have position, type, and interaction handler; rendered from tileset; collision-aware |
| PC sprite + interaction — place PC objects in Pokemon Centers, trigger PC screen on interact | game-engine-developer + asset-manager | New object type `pc` in map JSON |
| PC screen UI — deposit/withdraw Pokemon between party and storage boxes | frontend-developer | Design: `screens_examples_coords/pc_canvas_coordinates.md` + `screens_examples_coords/pokemon_pc_240x160.html` |
| Box storage in game state — `boxes` array in PlayerData, save/load support | game-engine-developer | Multiple boxes (e.g. 10 boxes × 30 slots), enforce party min 1 |
| Expand TrainerReward — add `badge`, `storyEvent`, and post-battle dialogue fields | game-engine-developer | Gym leaders give badge + TM + set story flag after defeat |
| Post-battle dialogue — trainer shows dialogue lines after battle ends (victory speech, badge award) | game-engine-developer + frontend-developer | New `postBattleDialogue` field on TrainerData |
| Expand DialogueReward — add `badge`, `storyEvent` fields for story NPC interactions | game-engine-developer | Declarative in map JSON, no callbacks needed |

---

## Sprint 5 — Items & Functionality ⬜ PLANNED
**Goal:** Make all items functional, findable on maps, reusable across screens

| Task | Agent |
|------|-------|
| Item pickup system — find items on maps (overworld item balls) | game-engine-developer |
| Healing items — full implementation (HP, PP, status, revive) | game-engine-developer |
| Pokeball items — catching wild Pokemon (see Sprint 6) | game-engine-developer |
| Stat boost items (X Attack, etc.) — apply in battle | game-engine-developer |
| Rare Candy — level up with move learning | game-engine-developer |
| Item reuse across screens (bag, battle, shop, map pickup) | frontend-developer |
| Shop screen redesign using coordinate system | frontend-developer + asset-manager |

---

## Sprint 6 — Battle System ⬜ PLANNED
**Goal:** Realistic Pokemon battle mechanics

| Task | Agent |
|------|-------|
| Turn order based on speed stat + move priority | game-engine-developer |
| Physical vs Special damage split (use damageClass from data) | game-engine-developer |
| Status effects (poison, burn, sleep, paralysis, freeze) | game-engine-developer |
| Dodge/accuracy mechanics | game-engine-developer |
| Critical hits | game-engine-developer |
| Stat stages (raise/lower attack, defense, etc.) | game-engine-developer |
| Wild Pokemon catching — pokeball mechanics, catch rate formula | game-engine-developer |
| Trainer AI improvements (smart move selection) | game-engine-developer |
| Battle UI polish — animations, status icons | frontend-developer |

---

## Sprint 6.5 — HM Overworld Moves ⬜ PLANNED
**Goal:** Implement all HM field moves as overworld mechanics gated by badges/party moves

| Task | Agent | Notes |
|------|-------|-------|
| HM framework — check if party Pokemon knows the move + player has required badge | game-engine-developer | Reusable gate: `canUseHM(moveId)` checks party + badges |
| Cut — destroy cuttable trees/bushes on interact | game-engine-developer | Uses tileset `destroyable` property; prompt "Use Cut?" on interact |
| Strength — push/destroy boulders | game-engine-developer | Uses tileset `destroyable` property; boulder push animation or remove |
| Flash — illuminate dark caves | game-engine-developer + frontend-developer | Dark overlay with circular light radius around player; Flash expands radius |
| Surf — travel on water tiles | game-engine-developer + frontend-developer | Player sprite swaps to surfing sprite; water tiles become walkable; wild encounters change to water Pokemon |
| Fly — fast travel to visited cities | game-engine-developer + frontend-developer | Opens city map selector; teleport to last Pokemon Center of chosen city; requires visited flag per city |
| HM items — TM/HM items in bag that teach moves to compatible Pokemon | game-engine-developer | HMs are reusable (not consumed), TMs are single-use |
| Map updates — place cuttable trees, boulders, dark caves, water routes across existing maps | game-engine-developer + asset-manager | Use existing `destroyable` tileset property for Cut/Strength obstacles |

---

## Sprint 7 — Player & Story ⬜ PLANNED
**Goal:** Player customization, story mode, cutscenes

| Task | Agent |
|------|-------|
| Character selection screen — choose sprite + enter player name (new game flow) | frontend-developer |
| Player name input UI — keyboard/on-screen input, Hebrew + English support | frontend-developer |
| Edit player name/character — accessible from settings screen post-game-start | frontend-developer |
| Story mode intro — cutscene system | frontend-developer |
| Prof. Algorithma dialogues + story events | game-designer |
| Remainder (rival) encounters + story arc | game-designer |
| Cutscene engine (scripted sequences, camera, text) | game-engine-developer + frontend-developer |

---

## Sprint 8 — Puzzle & Cipher System ⬜ PLANNED
**Goal:** Build the non-math puzzle mechanics

| Task | Agent |
|------|-------|
| Caesar cipher puzzle system | math-engine-developer |
| Substitution cipher with decoder UI | frontend-developer |
| Logic puzzles (if-then, who's lying) | math-engine-developer |
| Visual pattern puzzles | frontend-developer |
| Number sequence puzzles | math-engine-developer |
| Puzzle integration into gyms | game-designer + game-engine-developer |
| Serum piece collection system | game-engine-developer |
| Serum tracker UI | frontend-developer |

---

## Sprint 9 — Story & Content ⬜ PLANNED
**Goal:** Full game content — gyms, NPCs, story events

| Task | Agent |
|------|-------|
| 8 Gym Leader teams + battle mechanics | game-designer |
| Gym interior puzzles (per gym) | game-designer + game-engine-developer |
| Elite Four + NULL-X final boss (3 phases) | game-designer + game-engine-developer |
| Custom sprites: gym leaders, rival, professor, NULL-X | asset-manager |
| Glitch visual effects (tile corruption, sprite distortion) | asset-manager + frontend-developer |
| Glitch audio distortion (Web Audio API) | frontend-developer |

---

## Sprint 10 — Polish & Launch ⬜ PLANNED
**Goal:** Complete, tested, playable game

| Task | Agent |
|------|-------|
| Full playthrough testing (start → end) | qa-tester |
| Difficulty balance testing | qa-tester + game-designer |
| Cross-browser testing (Chrome, Firefox, Safari) | qa-tester |
| Touch/mobile testing | qa-tester + frontend-developer |
| Settings screen (volume, difficulty override) | frontend-developer |
| New Game+ mode | game-engine-developer |
| Performance optimization | game-engine-developer |
| Final documentation | qa-tester |
| Production build + deployment | game-engine-developer |

---

## Story: Hebrew Translation of PokeAPI Data ✅ COMPLETE (2026-03-22)
**Goal:** Translate all Pokemon names and move names fetched from PokeAPI into Hebrew.

**What was done:**
- `pokemon.json` and `evolution-chains.json`: `name` changed from `string` to `{ en: "Bulbasaur", he: "בולבזאור" }` — all 251 Pokemon translated
- `moves.json`: same format — all 616 moves translated to Hebrew
- `src/services/pokemon-data.ts`: added `LocalizedName` type, `getPokemonDisplayName(id)`, `getMoveDisplayName(id)` helpers that resolve based on current locale
- All rendering sites (battle, party, pokedex, overworld HUD, HP bar, battle menu, starter select) use the helpers at render time — language switch updates names immediately
- Hebrew locale strings (`he.json`) rewritten from reversed visual order to correct logical order for proper RTL rendering
- Transform scripts: `scripts/add-hebrew-names.ts`, `scripts/add-hebrew-move-names.ts`
- Fetch scripts updated to output `{ en, he }` format

**Also fixed:** Bug #2 (RTL text alignment) — Hebrew strings rewritten in correct logical order

**Tech debt:** Pokemon names are duplicated in `pokemon.json` and `evolution-chains.json` (both store `{ en, he }` name objects). Move names also embed the localized name in `moves.json`. A cleaner approach would be a single `pokemon-names.json` and `move-names.json` keyed by ID, with the data files only referencing IDs. Low priority — ~13KB redundant data, compresses well with gzip.

---

## Feature Backlog (Post-Launch)
- Multiplayer math battles
- Leaderboard (server-side)
- More Pokemon generations
- ~~Hebrew localization for all text~~ ✅ Done (Sprint 2 post-demo — UI only, PokeAPI data still English)
- ~~Hebrew translation of PokeAPI data (Pokemon names, moves)~~ ✅ Done (2026-03-22) — see story above
- Deduplicate localized names into separate name files (tech debt, low priority)
- Achievement system
- Daily math challenges
- Parent dashboard (learning progress tracking)
