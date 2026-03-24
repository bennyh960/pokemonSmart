# Feature: Level-Based Move Learning & Move Management

## Overview

Pokemon moves should be determined by their learnset (which moves they learn at which levels), not hardcoded fallbacks. This applies to wild Pokemon, NPC trainer Pokemon, and the player's own Pokemon. Additionally, the player can hold more moves than the battle limit and manage them.

---

## Story 1: Learnset Data Pipeline

**Goal:** Fetch and store per-Pokemon learnsets from PokeAPI so the game knows which moves each Pokemon learns at which level.

### Requirements
- Extend `pokemon.json` (or create `learnsets.json`) with learnset data for all 251 Pokemon
- Each entry: `{ pokemonId, moves: [{ moveId, levelLearned }] }` sorted by levelLearned ascending
- Source: PokeAPI `pokemon/{id}` → `moves[].version_group_details` (use Gold/Silver version group for authenticity)
- Include only level-up moves (not TM/HM/egg moves) in the base learnset
- Create fetch script: `scripts/fetch-learnsets.ts`
- Update `PokemonData` interface in `src/services/pokemon-data.ts` to include learnset

### Acceptance Criteria
- [ ] Learnset data exists for all 251 Pokemon
- [ ] Each move entry has `moveId` and `levelLearned`
- [ ] Data is available via `getLearnset(pokemonId): { moveId: number; levelLearned: number }[]`

---

## Story 2: Wild Pokemon Moves Based on Level

**Goal:** When a wild Pokemon is generated, its moves should be the moves it would naturally know at that level — not hardcoded type defaults.

### Requirements
- When creating a wild Pokemon at level N, look up its learnset
- Collect all moves where `levelLearned <= N`
- Take the **most recent 4 moves** (highest levelLearned values) — wild Pokemon use 4 battle moves
- Fall back to current `defaultMovesByType` only if learnset data is missing or yields 0 moves
- Update `createPokemonFromData()` in `src/systems/encounter.ts` — when no `moveIds` are explicitly passed, auto-derive from learnset + level

### Example
- Bulbasaur at level 5: knows Tackle (lv 1) — only 1 move
- Bulbasaur at level 13: knows Tackle (1), Growl (1), Leech Seed (7), Vine Whip (13) — 4 moves
- Bulbasaur at level 22: knows Vine Whip (13), Poison Powder (15), Sleep Powder (17), Razor Leaf (20) — most recent 4

### Acceptance Criteria
- [ ] Wild Pokemon have level-appropriate moves
- [ ] No more hardcoded `defaultMovesByType` for Pokemon with learnset data
- [ ] Encountering the same species at different levels yields different movesets

---

## Story 3: NPC Trainer Pokemon Moves Based on Level

**Goal:** NPC trainer Pokemon should also use level-appropriate moves from their learnset, not hardcoded lists.

### Requirements
- Trainer Pokemon defined in map JSON `npcs[].party[].moves` field is currently optional
- When `moves` is not specified (or empty), auto-derive moves from learnset at the trainer Pokemon's level
- Same logic as wild Pokemon: most recent 4 moves at that level
- Trainers can optionally still specify explicit `moves` array in JSON to override (for gym leaders, bosses, etc.)
- NPC trainers use max **4 battle moves** (like wild Pokemon)

### Acceptance Criteria
- [ ] Trainer Pokemon without explicit moves get learnset-based moves
- [ ] Trainers with explicit moves keep those moves (override)
- [ ] Gym leaders and bosses can have custom movesets

---

## Story 4: Player Pokemon — 8 Battle Moves, 16 Total Storage

**Goal:** The player's Pokemon can know up to 8 moves for use in battle, with additional moves stored for swapping.

### Rules
- **Battle slots:** 8 moves max — these are the moves available during battle
- **Storage slots:** 8 additional moves (total 16 per Pokemon) — stored but not usable in battle until swapped in
- **Learning a new move:**
  - If battle slots < 8: new move goes directly into battle slots
  - If battle slots = 8 but total < 16: new move goes to storage, player is notified
  - If total = 16: player must choose a move to permanently delete to make room
- **Move swapping:** In the party management screen, player can swap moves between battle slots and storage freely (outside of battle only)
- **TM/HM moves:** When learned, follow the same slot rules as level-up moves

### Data Model Changes
- `Pokemon.moves` (existing) — battle moves array, max 8
- `Pokemon.storedMoves` (new) — stored moves array, max 8
- Total across both: max 16

### UI Changes (Party Screen)
- Show battle moves (8 slots) and stored moves (8 slots) separately
- Allow drag/tap to swap between sections
- When at 16 total and learning a new move, show selection screen to permanently delete one

### Acceptance Criteria
- [ ] Player Pokemon can have up to 8 battle moves
- [ ] Additional moves (up to 8 more) stored in `storedMoves`
- [ ] Learning a new move when at 16 total prompts deletion choice
- [ ] Party screen shows both battle and stored moves
- [ ] Player can swap moves between battle and storage outside of battle

---

## Story 5: Wild/NPC Move Selection Strategy (4 moves, smart selection)

**Goal:** When wild or NPC trainer Pokemon have access to more than 4 moves from their learnset, select the best 4 rather than just the most recent.

### Requirements
- For wild Pokemon and NPC trainers, max battle moves = 4
- When learnset yields more than 4 eligible moves, pick the best 4 using this priority:
  1. At least 1 STAB move (Same Type Attack Bonus — move type matches Pokemon type) if available
  2. At least 1 status move if available (for variety)
  3. Prefer higher power moves
  4. Prefer type diversity (don't pick 3 normal-type moves)
- This is a "smart NPC" heuristic — can be simple for now and improved later
- Gym leaders and bosses bypass this — they have hand-picked movesets

### Acceptance Criteria
- [ ] Wild Pokemon at high levels have reasonable 4-move sets (not just the last 4 learned)
- [ ] STAB moves are prioritized
- [ ] Move diversity exists (not all same type)

---

## Story 6: Level-Up Move Learning (Player)

**Goal:** When a player's Pokemon levels up, check if it should learn a new move at that level.

### Requirements
- After XP gain and level-up in `checkAndApplyLevelUp()`, check learnset for moves at the new level
- If a new move is available:
  - If battle slots < 8: learn automatically, show notification
  - If battle slots = 8 and total < 16: move goes to storage, show "X learned Y! (stored)"
  - If total = 16: prompt player to forget a move or skip learning
- Show appropriate UI during/after battle for move learning

### Acceptance Criteria
- [ ] Level-up triggers move learning check
- [ ] New moves auto-slot when space is available
- [ ] Overflow goes to storage
- [ ] At capacity, player chooses what to delete
- [ ] UI shows move learning notification

---

## Implementation Order

1. **Story 1** (data pipeline) — prerequisite for everything
2. **Story 2** (wild moves) — immediate gameplay improvement
3. **Story 3** (trainer moves) — parallel with Story 2
4. **Story 4** (player 8+8 model) — data model change
5. **Story 6** (level-up learning) — depends on Story 1 + 4
6. **Story 5** (smart NPC selection) — polish, can come later

## Agents Involved

| Story | Primary Agent | Supporting |
|-------|--------------|------------|
| 1 | asset-manager | game-engine-developer |
| 2 | game-engine-developer | — |
| 3 | game-engine-developer | — |
| 4 | game-engine-developer | frontend-developer (UI) |
| 5 | game-engine-developer | game-designer (balance) |
| 6 | game-engine-developer | frontend-developer (UI) |
