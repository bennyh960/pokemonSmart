# Pokemon Math Adventure — Roadmap

## Overall Progress: Sprint 1 of 6

---

## Sprint 1 — Foundation 🔄 IN PROGRESS
**Goal:** Core technical infrastructure

| Task | Agent | Branch | Status |
|------|-------|--------|--------|
| Math engine (6 levels + adaptive) | math-engine-developer | `feature/math-engine` | 🔄 |
| Overworld + grid movement | game-engine-developer | `feature/overworld` | 🔄 |
| PokeAPI data pipeline (251 Pokemon) | asset-manager | `feature/pokeapi-pipeline` | 🔄 |
| Battle UI + math input | frontend-developer | `feature/battle-ui` | 🔄 |

**Details:** `docs/sprint-1.md`

---

## Sprint 2 — Integration ⬜ PLANNED
**Goal:** Connect all Sprint 1 pieces into a working battle

| Task | Agent |
|------|-------|
| Wire real PokeAPI data into battle system | game-engine-developer |
| Connect math engine to battle UI (solve to attack) | frontend-developer + math-engine-developer |
| Real Pokemon sprites in battle (from PokeAPI) | asset-manager |
| Wild encounter system (overworld → battle → back) | game-engine-developer |
| Save/load system (localStorage) | game-engine-developer |
| Battle result: XP, level up, evolution check | game-engine-developer |
| Audio manager + background music | frontend-developer |

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

## Feature Backlog (Post-Launch)
- Multiplayer math battles
- Leaderboard (server-side)
- More Pokemon generations
- Hebrew localization for all text
- Achievement system
- Daily math challenges
- Parent dashboard (learning progress tracking)
