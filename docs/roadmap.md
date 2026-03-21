# Pokemon Math Adventure — Roadmap

## Overall Progress: Sprint 2 ✅ COMPLETE (Sprint 3 next)

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
- Battle turn order: speed stat + move priority not implemented (player always first)
- Audio files are silent placeholders — need real Gold/Silver OST MP3s

---

## Sprint 3 — World Building ⬜ PLANNED
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

## Sprint 4 — Puzzle & Cipher System ⬜ PLANNED
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

## Sprint 5 — Story & Content ⬜ PLANNED
**Goal:** Full game content — gyms, NPCs, story events

| Task | Agent |
|------|-------|
| 8 Gym Leader teams + battle mechanics | game-designer |
| Gym interior puzzles (per gym) | game-designer + game-engine-developer |
| Elite Four + NULL-X final boss (3 phases) | game-designer + game-engine-developer |
| Remainder (rival) encounters + story arc | game-designer |
| Prof. Algorithma dialogues + story events | game-designer |
| Cutscene system (story moments) | frontend-developer |
| Custom sprites: gym leaders, rival, professor, NULL-X | asset-manager |
| Glitch visual effects (tile corruption, sprite distortion) | asset-manager + frontend-developer |
| Glitch audio distortion (Web Audio API) | frontend-developer |

---

## Sprint 6 — Polish & Launch ⬜ PLANNED
**Goal:** Complete, tested, playable game

| Task | Agent |
|------|-------|
| Full playthrough testing (start → end) | qa-tester |
| Difficulty balance testing | qa-tester + game-designer |
| Math correctness verification (all levels) | qa-tester |
| Cross-browser testing (Chrome, Firefox, Safari) | qa-tester |
| Touch/mobile testing | qa-tester + frontend-developer |
| Settings screen (volume, difficulty override) | frontend-developer |
| New Game+ mode | game-engine-developer |
| Performance optimization | game-engine-developer |
| Final documentation | qa-tester |
| Production build + deployment | game-engine-developer |

---

## Story: Hebrew Translation of PokeAPI Data ⬜ PLANNED
**Goal:** Translate all Pokemon names, move names, item names, and type names fetched from PokeAPI into Hebrew.

**Why:** The i18n system supports Hebrew UI strings, but data fetched from PokeAPI (Pokemon names, moves, items) remains in English. This creates a mixed-language experience. Bug #2 (RTL alignment) is blocked on this — once all displayed text is in Hebrew, RTL alignment issues become testable and fixable.

**Approach:**
- PokeAPI provides localized names via `names` array on each resource (Pokemon, moves, items, types)
- Hebrew translations may not be available in PokeAPI — may need manual translation table
- Create `src/i18n/pokemon-names-he.ts`, `src/i18n/move-names-he.ts`, `src/i18n/item-names-he.ts`
- All display code that shows Pokemon/move/item names should go through `t()` or a lookup function
- Fallback to English if Hebrew translation is missing

**Unblocks:** Bug #2 (RTL text alignment)

---

## Feature Backlog (Post-Launch)
- Multiplayer math battles
- Leaderboard (server-side)
- More Pokemon generations
- ~~Hebrew localization for all text~~ ✅ Done (Sprint 2 post-demo — UI only, PokeAPI data still English)
- Hebrew translation of PokeAPI data (Pokemon names, moves, items) — see story above
- Achievement system
- Daily math challenges
- Parent dashboard (learning progress tracking)
