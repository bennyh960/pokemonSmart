# Sprint 3.5 — Screen Redesign

**Goal:** Redesign all existing UI screens (Pokedex, Bag, Party, Battle-Bag/Battle-Party) into full-featured, polished interfaces.

**Prerequisite:** Move System Story 1 (learnset data pipeline) should be done first or in parallel — several screens depend on it.

---

## Overview of Changes

| Screen | Current State | Target |
|--------|--------------|--------|
| Pokedex | Basic list + detail (sprite, types, stats) | Multi-tab detail: stats, evolution chain, spawn routes, type matchups, learnset |
| Bag | Only exists inside battle as 2-item list | Full-screen bag with categories, icons, descriptions, amounts; use-on-Pokemon flow |
| Party | Compact list + basic detail (stats, moves) | Redesigned list + rich detail with sub-screens: stats, moves management (8 battle + 10 stored), Pokedex link |
| Battle Bag | Inline battle bag (2-line view) | Opens the full Bag screen filtered to battle-usable items |
| Battle Party | Doesn't exist | Opens Party screen in "battle mode" — view-only + switch active Pokemon |

---

## Task 1: Data Pipeline — Enrich PokeAPI Data

**Agent:** asset-manager
**Branch:** `feature/enriched-api-data`

### 1A: Add damage class to moves.json
- Extend `fetch-moves-data.ts` to fetch `damage_class` from PokeAPI (`physical` / `special` / `status`)
- Add `damageClass` field to `MoveData` interface and `moves.json`
- Add `description` (English only) from PokeAPI `flavor_text_entries` (use Gold/Silver entry)

### 1B: Add move descriptions
- Fetch `flavor_text_entries` for each move from PokeAPI (English, Gold/Silver version)
- Add `description` field to moves.json — English only (API source)

### 1C: Fetch learnsets
- Create `scripts/fetch-learnsets.ts` → produces `src/data/learnsets.json`
- Format: `{ [pokemonId]: [{ moveId, levelLearned }] }` sorted by level ascending
- Use Gold/Silver version group, level-up moves only
- Add `getLearnset(pokemonId)` helper to `pokemon-data.ts`

### 1D: Build spawn location index
- Parse `encounter-tables.json` to build a reverse index: `pokemonId → [mapId, mapId, ...]`
- Create helper `getSpawnLocations(pokemonId): string[]` in `pokemon-data.ts`
- Map IDs resolve to display names using i18n keys (e.g., `map.route-1.name`)

### Acceptance Criteria
- [ ] `moves.json` has `damageClass` and `description` fields for all 616 moves
- [ ] `learnsets.json` exists with data for all 251 Pokemon
- [ ] `getLearnset(id)` and `getSpawnLocations(id)` helpers work
- [ ] Existing game still compiles and runs after data changes

---

## Task 2: Pokedex Redesign

**Agent:** frontend-developer
**Branch:** `feature/pokedex-redesign`
**Depends on:** Task 1

### 2A: Multi-tab detail view
Replace the single detail view with tabbed navigation (Left/Right arrows or number keys):

**Tab 1 — INFO (default):**
- Large sprite, name, number, types
- Base stats with bar chart (current implementation, keep)
- Height/weight if available from API

**Tab 2 — EVOLUTION:**
- Show full evolution chain with sprites and arrows
- Show evolution trigger (level N, item, trade)
- Highlight current Pokemon in chain
- Data source: `evolution-chains.json` — already has `stages[].minLevel`, `trigger`, `item`

**Tab 3 — TYPE MATCHUPS:**
- "Strong against" (types this Pokemon's STAB moves are super-effective against)
- "Weak against" (types that are super-effective against this Pokemon)
- "Resistant to" (types this Pokemon resists)
- "Immune to" (types this Pokemon is immune to)
- Use `type-chart.json` data — render as colored type badges
- Data driven from `type-chart.json` effectiveness matrix

**Tab 4 — MOVES (Learnset):**
- Scrollable list of all moves this Pokemon learns by level-up
- Each row: level, move name, type badge, power, PP, damage class icon (physical/special/status)
- Move names from API = English only (OK per requirements)
- Data source: `learnsets.json`

**Tab 5 — LOCATIONS:**
- List of routes/maps where this Pokemon spawns
- Show level range per location
- Data source: reverse-indexed `encounter-tables.json`
- Map names use i18n (Hebrew/English based on selected language)

### 2B: Navigation
- Tab indicators at top of detail view (dots or labels)
- Left/Right arrows switch tabs
- Up/Down scroll within scrollable tabs (moves, locations)
- ESC returns to list view
- Bottom bar shows context-sensitive controls

### Acceptance Criteria
- [ ] All 5 tabs render correctly for any seen Pokemon
- [ ] Evolution chain shows sprites with arrows
- [ ] Type matchups accurately reflect type chart
- [ ] Learnset shows all level-up moves with metadata
- [ ] Spawn locations shown with level ranges
- [ ] Navigation between tabs is smooth
- [ ] API-sourced data displays in English; UI chrome follows selected language

---

## Task 3: Bag Screen (Full-Screen)

**Agent:** frontend-developer
**Branch:** `feature/bag-screen`

### 3A: New Bag scene
- Create `src/scenes/bag.ts` — full-screen bag UI
- Open from overworld with B key (register in overworld scene)
- Also callable from battle (filtered mode) and party screen

### 3B: Layout & Design
- **Left panel:** Category tabs (vertical) — Healing, Status, Revival, Balls, Battle, Vitamins, Key Items
- **Right panel:** Scrollable item list for selected category
- Each item row:
  - Icon (draw 16x16 pixel art icon per item — simple potion bottle, pokeball, candy, etc.)
  - Item name (from i18n)
  - Quantity badge (x5)
  - Description text (from i18n) below or on selection
- Selected item highlights with border
- Bottom bar: controls hint

### 3C: Item icons
- Draw simple 16x16 pixel art icons for each item programmatically (canvas drawing)
- Potion = red bottle, Super Potion = orange bottle, Pokeball = red/white circle, etc.
- Create `src/ui/item-icons.ts` with `drawItemIcon(ctx, itemId, x, y)` function
- Prefer drawing over external sprites for offline reliability

### 3D: Use-on-Pokemon flow
- When player selects an item with `usableInOverworld: true` and effect targets a Pokemon:
  - Healing items → push Party scene in "select-target" mode
  - Player picks a Pokemon → apply effect → return to bag
  - Show confirmation text ("Used Potion on Bulbasaur! HP restored by 20")
- Items like Rare Candy → same flow, apply level-up logic
- PP items → select Pokemon, then select move to restore

### 3E: Register in overworld
- B key in overworld pushes BAG scene
- Add 'BAG' to SceneId type
- Wire up in state machine

### Acceptance Criteria
- [ ] Full-screen bag opens from overworld (B key)
- [ ] Items organized by category tabs
- [ ] Each item shows icon, name, quantity, description
- [ ] Healing/PP/vitamin items can be used on party Pokemon
- [ ] Item icons drawn programmatically (no external sprite dependency)
- [ ] Empty categories show "No items" message
- [ ] ESC returns to overworld

---

## Task 4: Party Screen Redesign

**Agent:** frontend-developer
**Branch:** `feature/party-redesign`
**Depends on:** Task 1 (learnset data), Task 3 (bag screen for item use)

### 4A: Main list redesign
- Larger slots with more info per Pokemon
- Each slot shows: sprite (32x32), name, level, HP bar + numbers, type badges, held item icon (future)
- Selected slot has highlighted border
- S key still initiates swap mode (drag-and-drop feel: select source → select target)
- Empty slots show dashed outline

### 4B: Detail view — sub-screen navigation
Replace single detail view with sub-screens (Left/Right to switch):

**Sub-screen 1 — STATS (default):**
- Large sprite (64x64), name, level, types
- All 6 stats with bars
- HP bar, XP bar with numbers
- Nature (future), ability (future) placeholders

**Sub-screen 2 — MOVES:**
- Battle moves section (up to 8, labeled "Battle Moves"):
  - Each move: type color bar, name, power, PP, damage class (Physical/Special/Status)
  - Cursor can select individual moves
- Stored moves section (up to 10, labeled "Stored Moves"):
  - Same format, grayed out slightly
- **Swap:** Press Enter on a battle move, then Enter on a stored move → they swap
- **Delete:** Press Delete/D on a selected move → confirmation prompt "Permanently forget [move]?" → Yes/No
- **Move detail:** On hover/select, show move description at bottom

**Sub-screen 3 — POKEDEX:**
- Button/key (P) to jump to this Pokemon's Pokedex entry
- Push Pokedex scene with cursor pre-set to this Pokemon's ID

### 4C: Move data display
Per move row, show:
- Type color indicator (small rectangle)
- Move name
- Power (number, or "—" for status moves)
- PP (current/max)
- Damage class icon: ⚔️ physical, 🔮 special, ☆ status (render as small text labels: PHY/SPC/STA)
- On selection: description text at bottom of screen

### 4D: Move management rules
- Max 8 battle moves, max 10 stored moves (18 total per Pokemon)
- Swap between battle/stored freely (outside battle)
- Delete permanently with confirmation
- Cannot delete if Pokemon would have 0 battle moves

### Acceptance Criteria
- [ ] Redesigned party list with larger, more informative slots
- [ ] Sub-screen navigation (Stats / Moves / Pokedex link)
- [ ] Move management: view all 18 slots, swap between battle/stored, delete with confirm
- [ ] Each move shows type, power, PP, damage class, description
- [ ] Pokedex link opens Pokedex at selected Pokemon
- [ ] Swap party order still works
- [ ] All text follows i18n (UI chrome in selected language, move data in English if from API)

---

## Task 5: Battle Integration — Bag & Party

**Agent:** game-engine-developer + frontend-developer
**Branch:** `feature/battle-bag-party`
**Depends on:** Task 3 (bag), Task 4 (party)

### 5A: Battle Bag
- When player selects "BAG" in battle menu:
  - Push the full Bag scene in `battle` mode
  - Filter: only show items where `usableInBattle: true`
  - On item selection: if item targets a Pokemon (heal, revive, PP restore), show party select
  - After using item, return to battle → enemy turn
  - ESC/back returns to battle action menu (no item used, no turn lost)
- Remove the old inline `renderBagMenu` / `SELECT_ITEM` phase from battle.ts
- Replace with scene push/pop

### 5B: Battle Party
- When player selects "POKEMON" in battle menu (add this option if not present):
  - Push Party scene in `battle` mode
  - Shows party list (read-only stats, can't manage moves)
  - Player can select a Pokemon to switch in:
    - Can't switch to fainted Pokemon
    - Can't switch to the already-active Pokemon
    - Switching costs a turn (enemy attacks after)
  - ESC returns to battle menu without switching
- Add "POKEMON" as 4th battle menu option (FIGHT / BAG / POKEMON / RUN)

### 5C: Communication between scenes
- Add context/mode parameter to Bag and Party scenes:
  - `BagMode: 'overworld' | 'battle'`
  - `PartyMode: 'overworld' | 'battle' | 'select-target'`
- Bag in battle mode: filters to `usableInBattle` items only
- Party in battle mode: allows switch, no move management
- Party in select-target mode: pick Pokemon for item use → callback
- Use a shared state or callback pattern to return the result to the calling scene

### Acceptance Criteria
- [ ] "BAG" in battle opens full bag screen (battle-filtered)
- [ ] Using a battle item works and costs a turn
- [ ] "POKEMON" in battle opens party screen (battle mode)
- [ ] Switching Pokemon costs a turn
- [ ] Can't switch to fainted/active Pokemon
- [ ] ESC from both returns to battle action menu without cost
- [ ] Old inline bag rendering removed from battle.ts

---

## Task 6: Type List & Shared Constants

**Agent:** game-engine-developer
**Branch:** `feature/type-constants`

### 6A: Consolidate type colors/data
- Currently `TYPE_COLORS` is duplicated in `pokedex.ts` and `party.ts`
- Create `src/data/type-constants.ts`:
  - `TYPE_COLORS: Record<PokemonType, string>`
  - `TYPE_NAMES: Record<PokemonType, { en: string; he: string }>` (for display)
  - `DAMAGE_CLASS_LABELS: Record<string, { en: string; he: string; symbol: string }>`
    - physical → { en: "Physical", he: "פיזי", symbol: "⚔" }
    - special → { en: "Special", he: "מיוחד", symbol: "◆" }
    - status → { en: "Status", he: "סטטוס", symbol: "☆" }
- All screens import from this shared module

### Acceptance Criteria
- [ ] No duplicated type color maps
- [ ] Type display names available in both languages
- [ ] Damage class labels/symbols defined

---

## Agent Assignments Summary

| Task | Primary Agent | Supporting Agent |
|------|--------------|-----------------|
| 1 — Data Pipeline | asset-manager | game-engine-developer |
| 2 — Pokedex Redesign | frontend-developer | — |
| 3 — Bag Screen | frontend-developer | game-engine-developer (overworld wiring) |
| 4 — Party Redesign | frontend-developer | game-engine-developer (move data) |
| 5 — Battle Integration | game-engine-developer | frontend-developer |
| 6 — Type Constants | game-engine-developer | — |

## Execution Order

```
Phase 1 (parallel):
  ├── Task 1: Data Pipeline (asset-manager)
  └── Task 6: Type Constants (game-engine-developer)

Phase 2 (parallel, after Phase 1):
  ├── Task 2: Pokedex Redesign (frontend-developer)
  └── Task 3: Bag Screen (frontend-developer — separate branch)

Phase 3 (after Task 3):
  └── Task 4: Party Redesign (frontend-developer)

Phase 4 (after Tasks 3+4):
  └── Task 5: Battle Integration (game-engine-developer + frontend-developer)
```

## Notes
- All API-sourced data (move names, descriptions, Pokemon names from PokeAPI) renders in English. Don't mix Hebrew and English within the same data display.
- UI chrome (labels, buttons, section headers) follows the selected language via i18n.
- Item icons should be drawn programmatically via canvas — avoid external sprite dependencies for items.
- The move system doc (`docs/stories/move-system.md`) defines the 8 battle + storage model. Sprint 3.5 implements the UI side; the data model changes (Story 4 of move-system) should be done in parallel or just before.
