# Pokemon Math Adventure — Copilot Skills & Instructions

## Project Overview
A Pokemon Silver-style RPG where math and logic challenges drive combat. Set in "Numeria" (נומריה).
**Tech:** Vite + TypeScript + HTML5 Canvas (240×160 scaled 3x) + Howler.js
**Target:** Kids ages 8-14, educational math & logic game  
**Reference docs:** `docs/game-spec.md` (full spec), `docs/roadmap.md`, `docs/sprint-1.md`

---

## Skill: Game Engine & Canvas Rendering

When working on game engine code (`src/engine/`):

- **Canvas resolution** is 240×160 native (GBA), scaled 3x to 720×480 display.
- **Tile size** is 16×16 pixels. Grid-based movement — no free movement.
- Movement animation is ~200ms per tile with smooth interpolation.
- Use a **state machine** pattern for scene management (`TITLE`, `OVERWORLD`, `BATTLE`, `MENU`, `DIALOGUE`).
- **Camera** follows the player, clamps to map bounds, uses lerp for smooth scrolling.
- Tilemap is JSON-based with layers: ground, collision, above-player, events.
- Collision tiles: trees, water, buildings are blocked. Doors and tall grass are walkable.
- Tall grass (tile type 7) triggers wild encounters (10% chance per step).
- All rendering is pure Canvas 2D — **no HTML overlays, no DOM elements on the game area**.
- Target 60fps. Only render visible tiles (camera culling).
- Use sprite loader with async image loading and cache (`src/engine/sprite-loader.ts`).

---

## Skill: Math Engine & Problem Generation

When working on math problems (`src/math/`):

- 6 difficulty levels mapped to move power:
  - Level 1 (power 1-40): Addition/subtraction, single-digit (0-9). No negative results. Timer: 15s.
  - Level 2 (power 41-60): Add/sub double-digit (10-99). No negative results. Timer: 18s.
  - Level 3 (power 61-80): Multiplication single-digit (tables 1-9). Timer: 20s.
  - Level 4 (power 81-100): Multiply up to 12×12 + clean division (no remainders). Timer: 22s.
  - Level 5 (power 101-120): Mixed operations + order of operations + parentheses. Timer: 25s.
  - Level 6 (power 121+): Complex expressions + simple fractions (1/2, 1/4, 3/4). Timer: 30s.
- **Adaptive difficulty** within each level:
  - 3 correct in a row → increase complexity (bigger numbers).
  - 2 wrong in a row → decrease complexity (smaller numbers).
- `movePowerToMathDifficulty(power)`: 1-40→1, 41-60→2, 61-80→3, 81-100→4, 101-120→5, 121+→6.
- Problems are generated **dynamically** (never from a static bank).
- All problems must have a **single, unambiguous, correct numeric answer**.
- Use types from `src/types/index.ts`: `MathDifficulty`, `MathProblem`, `MathResult`.

---

## Skill: Battle System

When working on battle code (`src/systems/battle-system.ts`, `src/scenes/battle.ts`):

- **Battle flow:** Player selects move → math problem shown → player answers → result.
- **Damage formula:** `Damage = (AttackPower × TypeMultiplier × SpeedBonus) - DefenderDefense`
  - Min damage = 1. Max damage = 3× attack power.
- **Speed bonus** by answer time:
  - 0-3s → ×1.5 ("Brilliant!"). 3-6s → ×1.25 ("Fast!"). 6-10s → ×1.0.
  - 10-15s → ×0.9 ("Slow..."). 15+ or timeout → ×0 (attack fails).
- **Wrong answer:** Attack fails (0 damage). Player takes 10% of their maxHP as self-damage. Show correct answer for 3 seconds.
- **Type effectiveness** uses real Gen 2 chart + custom Glitch type (neutral vs all except Glitch vs Glitch = ×2).
- Gym leaders and Elite Four cannot be fled from. Double XP reward.
- XP per wild battle: 20-50 (by opponent level). Gym leaders: 200-500. Elite Four: 500-800.
- Pokemon level up → recalculate stats from base stats. Check evolution chain.
- Party max: 6 Pokemon. Max 4 moves per Pokemon.
- Real Gen 1-2 Pokemon (251), real types, real moves, real stats from PokeAPI data.

---

## Skill: UI & Frontend

When working on UI code (`src/ui/`, `src/scenes/`):

- **GBA aesthetic:** Dark borders, cream/white background text boxes at bottom screen. Pixel monospace font ~8px scaled.
- **HP bars**: Color gradient green (>50%) → yellow (25-50%) → red (<25%). Smooth animation.
- **Number pad** (math input): 3×4 grid `[7][8][9] / [4][5][6] / [1][2][3] / [⌫][0][✓]`.
  - Must work with **both mouse clicks AND keyboard** (0-9 keys, Backspace, Enter).
  - Minimum 48px touch targets (for kids on tablets).
  - Green flash for correct answer. Red shake + show correct answer for wrong.
- **Timer bar:** Shrinking horizontal bar, green → yellow → red. No visible numbers.
- **Text boxes:** GBA-style typewriter effect, press ENTER to advance. RTL support for Hebrew.
- **Menus:** Right-aligned selection lists with arrow cursor. Navigate with arrow keys + ENTER.
- **Battle layout:** Player's Pokemon (back sprite) bottom-left. Enemy (front sprite) top-right. HP bars for both.
- **Transitions:** Fade-to-black 0.3s between scenes. Music crossfade 0.5s.
- All UI is rendered on Canvas 2D — no HTML elements in the game area.

---

## Skill: Pokemon Data & PokeAPI Pipeline

When working on data scripts (`scripts/`) or data service (`src/services/pokemon-data.ts`):

- All 251 Gen 1-2 Pokemon from PokeAPI, cached as static JSON at build time.
- **Data files:**
  - `src/data/pokemon.json` — id, name, types, stats, base_experience.
  - `src/data/moves.json` — id, name, type, power, accuracy, pp, mathDifficulty.
  - `src/data/type-chart.json` — 18 types (17 real + Glitch) with damage relations.
  - `src/data/evolution-chains.json` — evolution triggers (level, item, trade).
- **Sprites:** `public/sprites/pokemon/front/{id}.png` and `back/{id}.png` (Gen 2 Gold style).
- Fetch scripts use PokeAPI v2 (`https://pokeapi.co/api/v2/`). Rate limit 100ms between calls.
- `pokemon-data.ts` service provides: `getPokemon(id)`, `getMove(id)`, `getTypeEffectiveness(attacker, defender)`, `getEvolutionChain(pokemonId)`.
- `mathDifficulty` for moves is derived from power: power 1-40→1, 41-60→2, 61-80→3, 81-100→4, 101-120→5, 121+→6. Status moves (power 0) use difficulty 2.

---

## Skill: Type System & Interfaces

When creating or modifying types (`src/types/index.ts`):

- `Scene` interface: `enter()`, `exit()`, `update(dt)`, `render(ctx)`.
- `SceneId`: `'TITLE' | 'OVERWORLD' | 'BATTLE' | 'MENU' | 'DIALOGUE'`.
- `Pokemon`: id(1-251), name, level, hp, maxHp, attack, defense, specialAttack, specialDefense, speed, types(PokemonType[]), moves(Move[4]), xp, xpToNext, isGlitched.
- `PokemonType`: 18 values — `'normal'|'fire'|'water'|'grass'|...|'steel'|'dark'|'glitch'`.
- `Move`: id, name, type(PokemonType), power(0-250), accuracy(0-100), pp, currentPp, mathDifficulty(1-6).
- `MathDifficulty`: `1 | 2 | 3 | 4 | 5 | 6`.
- `MathProblem`: question(string), correctAnswer(number), difficulty, timeLimit, category.
- `MathResult`: correct(boolean), timeTaken, bonusMultiplier, answer.
- `PlayerData`: name, party(Pokemon[]), badges(number), serumParts(number), money, pokedex, position({mapId, x, y}), playtime.

---

## Skill: Audio & Sound

When working on audio (`src/audio/audio-manager.ts`):

- Use **Howler.js** for all audio. Import from `howler` package.
- Music crossfade: 0.5s between scenes (never abrupt cuts).
- Volume channels: Master, Music, SFX, Cries (all independent, 0-100).
- Pokemon cries default OFF. Music + SFX default ON.
- Mobile: unlock audio on first touch event (Howler handles this).
- All background music loops seamlessly.
- **Glitch zone audio:** In areas affected by the Glitch, programmatically distort current music via Web Audio API — pitch shift, bitcrush, stutter effects. Intensity 1-5 based on zone's glitch level.
- Track assignment follows Gold/Silver OST mapping (New Bark Town for home, Route themes for paths, Gym theme inside gyms, etc).

---

## Skill: Puzzle System

When working on puzzles (`src/puzzles/`):

- 4 puzzle categories: **Cipher**, **Logic**, **Visual**, **Number Sequence**.
- Cipher: Caesar shift (Hebrew/English), variable-key shift, substitution, hidden-key.
- Logic: If-then (truth/liar), whodunit elimination, logic grids.
- Visual: Pattern completion (3×3 grid), spot-the-difference, spatial (rotation/reflection).
- Sequence: arithmetic progressions, Fibonacci, squares, multi-rule.
- Each gym uses specific puzzle types (game-spec section 7):
  - Gym 1: visual (sum-target tiles). Gym 2: logic (truth/liar). Gym 3: cipher (mirrors).
  - Gym 4: logic grid. Gym 5: sequences + cipher. Gym 6: visual (symmetry). 
  - Gym 7: all types combined. Gym 8: multi-step chains.
- Puzzles render on Canvas. Hints available (max 3, cost points).
- Difficulty scales 1-5 matching game progression.

---

## Skill: World & Map Design

When creating map files (`src/data/maps/`):

- Maps are JSON tilemaps with layers: `ground`, `collision`, `above`, `events`.
- Tile types: 0=empty, 1=grass(#48A030), 2=path(#C8A870), 3=water(blocked), 4=tree(blocked), 5=building(blocked), 6=door(walkable), 7=tall-grass(walkable+encounters).
- 8 cities connected by 8 routes in a circular layout (game-spec section 2.2).
- Home town: **Zeroville** (אפסיניה). Cities: Sumville, Minusburg, Multiplia, Dividia, Primore, Symmetrika, Integrala, Absoluta.
- Each map has `warps` array: `{ x, y, targetMap, targetX, targetY }` for area transitions.
- Encounter tables per route (game-spec section 6.3): Pokemon species, level ranges, rarity weights.
- NPC data per map: position, sprite, dialogue, type (static/walker/trainer).
- Pokemon Center (free heal) and Poké Mart (shop) in every city.
- Central final area: **NULL-X Tower** (6 floors: entrance + 4 Elite Four + NULL-X).

---

## Skill: Save System

When working on save/load (`src/systems/save.ts`):

- Save to `localStorage` key `"pokemon-math-save"`.
- Auto-save on entering a new area/town.
- Save data: player party, position(mapId, x, y), badges, serum parts, money, pokedex, playtime, defeated trainers, story flags.
- `saveGame(state)` → JSON.stringify → localStorage.
- `loadGame()` → localStorage → JSON.parse → validate → return GameState | null.
- Handle edge cases: corrupted data, missing fields (migration), empty save.
- "Continue" on title screen: grayed out if no save exists.

---

## Skill: Testing

When writing tests (`src/**/__tests__/`):

- Test framework: **Vitest** (must be installed: `npm i -D vitest`).
- Math engine: generate 100+ problems per level, verify all answers correct. No negatives at level 1-2. Clean division at level 4.
- Battle system: damage formula correctness, type effectiveness, XP calculation.
- Save/load: round-trip serialization, corrupted data handling.
- Use mocking for Canvas context, localStorage, audio.
- Tests must be fast and hermetic — no network, no real DOM.
- Coverage target: ≥80% on new/changed code.

---

## Skill: Game Story & NPCs

When implementing story content:

- **Villain:** NULL-X — rogue AI, speaks in binary mixed with philosophy. Catchphrase: "ERROR. RECALCULATE."
- **Rival:** Remainder (ריי-מיינדר) — competitive but good-hearted. Joins player after Badge 5.
- **Mentor:** Prof. Algorithma — guides player via communicator device.
- **Serum system:** 8 components collected from gyms. Thresholds: 1=heal one Pokemon, 2-3=battle item, 4-5=area healing, 6-7=expanded, 8=unlock NULL-X Tower.
- **Glitch progression:** Intensifies through story — pixel corruption, NPC gibberish, world distortion.
- **Elite Four:** Syntax(Electric), Logica(Ice), Entropy(Fighting+Glitch), Quantum(Psychic).
- **Final boss:** NULL-X — 3 phases: Pokemon battle → code-repair puzzle → narrative ending.
- All dialogue rendered in GBA-style text boxes. Hebrew RTL support.

---

## Project Conventions

- **Language:** TypeScript with strict types. Use interfaces from `src/types/index.ts`.
- **Build:** Vite (`npm run dev` to start, `npm run build` for production).
- **No external game frameworks** — pure Canvas 2D + TypeScript.
- **Branch strategy:** `main` = stable. `feature/*` = work branches. QA before merge.
- **File structure:** `src/engine/` (core), `src/scenes/` (game scenes), `src/systems/` (game logic), `src/ui/` (UI components), `src/math/` (math engine), `src/data/` (static JSON), `src/audio/` (sound), `scripts/` (build-time data fetching).
- **Sprites:** Placeholder colored rectangles acceptable until real sprites are loaded.
- **Commands:** `npm run dev` (dev server), `npm run build` (production), `npm test` (vitest), `npm run fetch-data` (download PokeAPI data).
