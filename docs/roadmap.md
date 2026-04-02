# Pokemon Math Adventure — Roadmap

## Overall Progress: Sprint 6 ⬜ UP NEXT (status effects before the larger battle refactor + ability passives)

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

## Sprint 4 — Data Refactor (Epic) ✅ COMPLETE
**Goal:** Centralize all game data, remove hardcoded values, leverage PokeAPI fully

This is a foundation sprint — must be done before design/content sprints.

| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| Centralize data folder — single `src/data/` with clear structure | game-engine-developer | ✅ | Already organized: JSON data + TS constants in `src/data/` |
| Remove all hardcoded Pokemon/move values from scene files | game-engine-developer | ✅ | Removed duplicate TYPE_COLORS from party.ts, starter-select.ts, battle-menu.ts; replaced hardcoded fallback Pokemon with data-driven createPokemonFromData |
| Deduplicate localized names (pokemon.json + evolution-chains.json share names) | game-engine-developer | ✅ | Low-priority tech debt (~13KB), deferred to backlog |
| Save/load migration — handle schema changes when data model evolves | game-engine-developer | ✅ | Added saveVersion to PlayerData, versioned migration system in save.ts, auto-upgrades old saves on load |
| Fetch additional PokeAPI data: abilities, natures, held items | asset-manager | ➡️ | Moved to Sprint 5 Phase 1 |
| Items data — fetch full item list from PokeAPI, map to our ItemDef structure | asset-manager | ➡️ | Moved to Sprint 5 Phase 3 |
| Items data — berry system, held items, TMs as items | game-engine-developer | ➡️ | Moved to Sprint 5 Phase 3 |

---

## Sprint 4.5 — Interactable Objects, PC Storage & Reward Expansion ✅ COMPLETE
**Goal:** Add an object interaction layer, Pokemon PC storage, post-battle dialogue, and richer trainer/NPC rewards (badges, story progression)

| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| Interactable object layer — unified `interactType` system with central definitions | game-engine-developer | ✅ | `interact-types.ts` central defs, `{ id, args }` ref on TileDef, 3-layer merge (defaults→tile→instance), tileset editor shows contextual fields per type |
| PC sprite + interaction — place PC objects in Pokemon Centers, trigger PC screen on interact | game-engine-developer + asset-manager | ✅ | PC tile in tileset, interaction wired |
| PC screen UI — deposit/withdraw Pokemon between party and storage boxes | frontend-developer | ✅ | Full scene from design docs: 3 modes, box grid 6×5, party sidebar, detail strip |
| Box storage in game state — `boxes` array in PlayerData, save/load support | game-engine-developer | ✅ | 10 boxes × 30 slots, save migration v1→v2, pc-storage.ts logic module |
| Expand TrainerReward — add `badge`, `storyEvent`, and post-battle dialogue fields | game-engine-developer | ✅ | badge/storyEvent on TrainerReward + postBattleDialogue on TrainerData, wired in battle.ts |
| Post-battle dialogue — trainer shows dialogue lines after battle ends (victory speech, badge award) | game-engine-developer + frontend-developer | ✅ | postBattleDialogue appended to reward text box after battle win |
| Expand DialogueReward — add `badge`, `storyEvent` fields for story NPC interactions | game-engine-developer | ✅ | badge/storyEvent on DialogueReward, processed in giveNPCReward |
| Badge data system — `src/data/badges.ts` with name (en/he), icon/sprite, ID for all 8 gym badges | game-designer + asset-manager | ✅ | 8 badges defined from game-spec; editor uses dropdown with assignment warnings; icons TBD |
| Bilingual NPC dialogue — `dialogue: { en, he }[]` + editor with EN/HE textareas | game-engine-developer | ✅ | All 17 NPCs migrated; runtime resolves by locale with fallback to EN |
| Rewards for all NPC types — healer/shopkeeper can give rewards on interaction | game-engine-developer | ✅ | Reward processing in onDialogueEnd for all types |
| Editor: sprite preview, reward panel for all NPCs, encounter table panel | frontend-developer | ✅ | Sprite canvas, info tooltips, encounter editor with auto map ID |

---


## Sprint 5 — Items, Abilities & Natures ✅ COMPLETE
**Goal:** Fetch & integrate abilities/natures from PokeAPI (relational model), and make the item system functional

**Scope change:** Held items are officially deferred to post-launch / future patch work. Ability passive effects are moved to follow the status-effect milestone and broader battle refactor work.

### Phase 1 — Data Fetch (PokeAPI → relational JSON)
| Task | Agent | Status |
|------|-------|--------|
| Fetch abilities from PokeAPI → `abilities.json` (id, name {en,he}, description, effect) | asset-manager | ✅ |
| Fetch natures from PokeAPI → `natures.json` (id, name {en,he}, +stat, -stat) | asset-manager | ✅ |
| Fetch pokemon-abilities mapping → `pokemon-abilities.json` (pokemonId → [abilityIds]) | asset-manager | ✅ |
| Fetch held items data → extend `items.json` with holdable items + effects | asset-manager | ➡️ deferred post-launch |

### Phase 2 — Integrate into data model
| Task | Agent | Status |
|------|-------|--------|
| Add ability/nature to Pokemon instance type + creation logic | game-engine-developer | ✅ |
| Nature stat modifiers in stat calculation formula | game-engine-developer | ✅ |
| Ability effects in battle (passive triggers) | game-engine-developer | ➡️ moved after Sprint 6 status effects + battle refactor |
| Held item effects in battle (passive triggers) | game-engine-developer | ➡️ deferred post-launch |
| UI — show ability/nature on party + summary screens | frontend-developer | ✅ |

### Phase 3 — Items functionality
| Task | Agent | Status |
|------|-------|--------|
| Item pickup system — find items on maps (overworld item balls) | game-engine-developer | ✅ |
| Healing items — HP, PP, and revive implementation (status-curing medicine completes with Sprint 6 status system) | game-engine-developer | ✅ |
| Pokeball items — catching wild Pokemon (formula polish remains in Sprint 6) | game-engine-developer | ✅ |
| Stat boost items (X Attack, etc.) — apply in battle | game-engine-developer | ✅ |
| Rare Candy — level up with move learning | game-engine-developer | ✅ |
| Item reuse across screens (bag, battle, shop, map pickup) | frontend-developer | ✅ |
| Shop screen redesign using coordinate system | frontend-developer + asset-manager | ✅ |

---
## Sprint 5.5 — Battle & Evolution Animation Foundation ✅ COMPLETE
**Goal:** Build a reusable animation layer for battle/capture/evolution flows, and ship the highest-value visual sequences before the broader battle-system overhaul.

**Scope principles:**
- Prioritize reusable animation sequencing over one-off hardcoded effects.
- Focus on capture, faint/send-out/escape, and evolution first.
- Treat attack animations as **research + prototype only** in this sprint, not a full move-by-move content pass.
- Keep held items deferred to post-launch / future patch work.

| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| Animation director / sequence player for battle flows | game-engine-developer | ✅ | Reusable queue/timeline for move/fade/scale/shake/SFX steps; battle blocks while animations run |
| Pokeball throw + capture sequences (Poke / Great / Ultra / Master) | game-engine-developer + frontend-developer | ✅ | Throw arc, hit/open, enemy absorb, shake/wait, success vs break-free branches |
| Wild escape, faint, withdraw, and trainer send-out animations | game-engine-developer + frontend-developer | ✅ | Cover flee, faint disappear, switch-out, next-Pokemon send-out, optional cry hooks |
| Evolution scene + plumbing (level-up + stone evolutions) | game-engine-developer + frontend-developer | ✅ | Dedicated scene instead of overloading `battle.ts`; updates species/stats/sprites/save |
| Attack animation research + prototype set | game-engine-developer + frontend-developer | ✅ | Prototype family mapper now covers physical lunge, projectile, beam, pulse, and burst styles with move-name overrides |
| Audio cue pass for new animation beats | frontend-developer | ✅ | Added timed cues for capture shakes, break-free, send-out/withdraw, faint/run, evolution start/finish, and attack families |

**Out of scope for Sprint 5.5:**
- Held items
- Ability passive effects
- Full battle refactor
- Full move-by-move attack animation library
- Catch formula overhaul


--- 

## Sprint 6 — Battle System ✅ COMPLETE
**Goal:** Build the first "real battle" pass on top of data-driven move/ability metadata and a reusable persistent battle-state layer.

**Priority:** Start with the data model and status foundation. Turn order, accuracy/evasion, stat stages, damage modifiers, and the first ability pass should all reuse the same battle-state layer rather than being hardcoded inside `battle.ts`.

**Battle rules for this sprint:**
- Turn order resolves by **move priority first**, then **effective speed**, then random tie-break.
- Priority moves (for example Quick Attack, Extreme Speed, Shadow Sneak, Sucker Punch) must come from move metadata, not per-move hardcoding in scene logic.
- Effective speed includes stat-stage changes and status penalties.
- Major statuses for this sprint: poison, burn, paralysis, sleep, freeze.
- Poison, burn, and paralysis persist until cured by item/healer. Sleep and freeze block actions for a temporary turn window.
- Burn chips HP each turn and halves physical Attack. Paralysis halves Speed and can cancel the turn. Poison chips HP each turn.
- Sleep and freeze prevent actions for a tracked duration window and then clear automatically.
- Stat stages are tracked separately from base stats, can target self or enemy, and are capped between `-200%` and `+200%`.
- Accuracy and evasion feed the same hit-check pipeline used by damaging and status moves.
- The first ability batch should focus on passive battle modifiers needed by the core damage/status loop (for example Thick Fat reducing incoming Fire/Ice damage).
- more randoms : critical damage do 150% effect , generic random factor - each damage also has random values from 70-100% .

**Architecture notes:**
- Extend move data with battle metadata such as priority, target, ailment/status payloads, stat-stage deltas, and effect chance details wherever the current data shape is too thin.
- Add an ability effect schema / hook layer so passive effects can modify damage, status application, or switch-in behavior without special-casing each species in `battle.ts`.
- Add persistent major-status fields to `Pokemon`, but keep volatile battle-only state (sleep/freeze counters, temporary stat stages, accuracy/evasion stages, protect-like flags) in battle runtime state.
- Bump save version when adding persistent Pokemon battle fields.
- Use existing `damageClass` move data for the physical/special split, then layer crits, status modifiers, abilities, and RNG through one shared damage pipeline.

| Task | Agent | Notes |
|------|-------|-------|
| Battle data schema audit + enrichment | game-engine-developer | Extend move/ability metadata for priority, targets, status application, stat-stage moves, and passive hooks. Prefer script/data-pipeline enrichment over manual one-offs where possible. |
| Persistent battle-state model + save migration | game-engine-developer | Add persistent major status fields on Pokemon and keep volatile turn state inside battle runtime objects. |
| Turn order resolver (priority -> effective speed -> tie-break) | game-engine-developer | Support regular speed ordering and priority moves without duplicating move-specific scene logic. |
| Major status conditions | game-engine-developer | Implement poison, burn, paralysis, sleep, and freeze with chip, turn denial, cure rules, and battle messaging. |
| Stat stage system | game-engine-developer | Track self/enemy buffs and debuffs, cap them at `-200%` to `+200%`, and expose battle feedback/UI hooks. |
| Accuracy/evasion hit pipeline | game-engine-developer | Shared hit-resolution path for damaging and status moves, including paralysis turn-loss checks where relevant. |
| Damage pipeline refactor | game-engine-developer | Physical vs special split, critical hits, burn attack penalty, type/STAB math, and ability modifier hooks. |
| First ability passive batch | game-engine-developer | Start with battle-critical passives such as Thick Fat and similar damage modifier / immunity style abilities. |
| Catch + trainer AI follow-up | game-engine-developer | Revisit catch flow after statuses land and replace random enemy move selection with better heuristics. |
| Battle UI polish — status icons, stat-stage feedback | frontend-developer | Reuse the existing status-pill / animation foundation and expose clear visual feedback for statuses and buffs/debuffs. |

---

## Sprint 6.5 — HM Overworld Moves ✅ COMPLETE
**Goal:** Implement Cut, Strength, Fly, and Surf as animated overworld HM mechanics. No map updates this sprint.

### HM Framework (src/systems/hm.ts)
- `HM_CONFIG` — per-HM requirements object (NOT hardcoded constants — configurable): `{ moveId, minLevel, minWeight?, minHeight? }`
- `findHMUser(moveId, party)` — returns best eligible party Pokemon (knows move + meets level + meets size if required)
- `canUseHM(moveId, party)` — boolean gate
- HM move IDs (from PokeAPI): Cut=15, Fly=19, Surf=57, Strength=70

### Cut (minLevel: 20)
- Triggered by interacting with `interactType: 'cut'` tile (already defined in interact-types.ts)
- Gate: party Pokemon knows Cut (id=15) + level ≥ 20
- No badge requirement for now
- **Animation sequence:**
  1. Dialogue: "{pokemonName}, go! Please cut this {tileName}!" (bilingual)
  2. Player steps back 1 tile (away from obstacle)
  3. Pokemon sprite appears at obstacle tile (`/public/sprites/pokemon/front/{id}.png`)
  4. Sprite orientation: front sprites face LEFT by default → if player faced RIGHT, flip horizontally; UP/DOWN keep as-is
  5. Flash effect (quick white flash) + cut slash canvas lines animation
  6. Tile/object removed from map + flagged (flag key: `cut-{x}-{y}`) so it's gone permanently
  7. Pokemon fades out, player faces back toward where obstacle was

### Strength (minLevel: 30)
- Triggered by interacting with `interactType: 'strength'` tile
- Gate: party Pokemon knows Strength (id=70) + level ≥ 30
- **Same animation sequence as Cut** but with stomp/shake effect instead of slash
- Dialogue: "{pokemonName}, go! Please move this {tileName}!"

### Fly (minLevel: 50, minWeight: 350hg, minHeight: 14dm)
- Pokemon must know Fly (id=19) AND meet weight/height thresholds (e.g. Butterfree 320hg/11dm fails, Pidgeot 395hg/15dm passes)
- `W` key opens world map; if player has fly-capable Pokemon, show Fly option
- Track visited cities via `pd.flags['visited-{mapId}']` — set when player arrives at any city map
- **World map (src/scenes/world-map.ts):** Show list of visited cities. If fly-capable, allow selecting a destination.
- **Fly animation:**
  1. Pokemon sprite appears beside player (at player tile)
  2. Player "mounts" — player sprite hidden
  3. Pokemon rises upward + scales down (flies away animation)
  4. Screen fades to black
  5. Teleport: `loadMap(destination.mapId, destination.x, destination.y)` using the city's Pokemon Center spawn
  6. Screen fades in, Pokemon sprite descends + grows
  7. Player sprite returns, Pokemon fades out

### Surf (minLevel: 60, minWeight: 200hg, minHeight: 8dm)
- Triggered when player tries to walk onto a tile with encounterType including `'water'` (check tile's encounterTypes array)
- Gate: party Pokemon knows Surf (id=57) + meets weight/height thresholds + level ≥ 60
- Prompt: "The water looks deep. Surf?" (bilingual choice: Yes/No)
- **Surf mode (isSurfing flag):**
  - Player sprite replaced by surfing Pokemon sprite (draw it programmatically — oval body + fin shape, or load front sprite scaled to tile)
  - Water tiles are walkable while surfing
  - Wild encounters on water use `encounterTypes: ['water']` filter
  - Exiting to land: player touches a non-water walkable tile → auto-dismount, player sprite restored
- **No separate surfing sprite asset** — reuse the front Pokemon sprite (scaled, maybe slightly tinted)

### Deferred (out of scope Sprint 6.5)
- Flash (dark cave overlay)
- HM items (TM/HM teachable items in bag)
- Map updates (placing Cut trees, boulders, water routes)

| Task | Agent | Status |
|------|-------|--------|
| HM framework (hm.ts) | game-engine-developer | ⬜ |
| Cut + Strength with full animation | game-engine-developer + frontend-developer | ⬜ |
| Fly with world map city selection | game-engine-developer + frontend-developer | ⬜ |
| Surf with water movement + encounters | game-engine-developer + frontend-developer | ⬜ |

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

## Sprint 11 — Progressive English Learning ⬜ PLANNED
**Goal:** Gradually expose Hebrew-speaking players to English vocabulary through gameplay progression

The game doubles as an English learning tool. Initially, most text is in Hebrew. As the player progresses (measured by playtime), translations are progressively removed — forcing the player to read English words they've already seen many times in Hebrew.

**Design principles:**
- Start with minimal English: only Pokemon type names (Fire, Water, Grass...) stay in English from the start — these are short, visual, and repeated constantly
- Each phase removes Hebrew translations for a category, replacing them with English
- The transition is per-category, not per-word — keeps it predictable
- A toggle in settings lets players opt out (always Hebrew / always English / progressive)
- Phase thresholds are based on **playtime hours**, not story progress

| Phase | Trigger | Category switched to English | Notes |
|-------|---------|----------------------------|-------|
| 0 | Game start | Pokemon type names (Fire, Water, etc.) | Already English-only in type badges |
| 1 | ~10 hours | Item names (Potion, Revive, etc.) | High repetition from bag/shop usage |
| 2 | ~15 hours | Ability names (Overgrow, Blaze, etc.) | Seen on every Pokemon detail screen |
| 3 | ~20 hours | Move/attack names (Tackle, Ember, etc.) | High repetition from battles |
| 4 | ~25 hours | Nature names (Adamant, Jolly, etc.) | Lower frequency, more advanced vocabulary |
| 5 | ~30 hours | Pokemon names | Last phase — by now players recognize most names |

| Task | Agent | Status |
|------|-------|--------|
| Playtime-based phase system — `getTranslationPhase(playtime)` returns current phase | game-engine-developer | ⬜ |
| Per-category locale override — `getItemLocale()`, `getMoveLocale()`, etc. that return 'en' or current locale based on phase | game-engine-developer | ⬜ |
| Settings toggle — always-Hebrew / always-English / progressive (default) | frontend-developer | ⬜ |
| Phase transition notification — brief in-game message when a new phase activates | frontend-developer | ⬜ |
| Hebrew translations for items (229), abilities (132), natures (25) — needed so phase 0 works | asset-manager | ⬜ |
| Parent dashboard — show which English words the child has been exposed to | frontend-developer | ⬜ |

---

## Feature Backlog (Post-Launch)
- Multiplayer math battles
- Leaderboard (server-side)
- More Pokemon generations
- Held items (data integration + passive battle effects) — deferred to post-launch / future patch
- ~~Hebrew localization for all text~~ ✅ Done (Sprint 2 post-demo — UI only, PokeAPI data still English)
- ~~Hebrew translation of PokeAPI data (Pokemon names, moves)~~ ✅ Done (2026-03-22) — see story above
- Deduplicate localized names into separate name files (tech debt, low priority)
- Achievement system
- Daily math challenges
- Parent dashboard (learning progress tracking)
