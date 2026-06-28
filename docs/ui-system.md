# UI System & Shared Constants Guide

## Overview

All UI screens render on an HTML5 Canvas at **240×160 logical pixels** (displayed at 3× scale = 720×480). Every element is positioned with absolute x,y coordinates. There is no DOM layout engine — all positioning is manual via `fillRect`, `drawRect`, `drawText`.

## Screen Design Workflow

We use an **external HTML model** to generate pixel-perfect screen mockups at 240×160, then extract exact coordinates into markdown tables. These coordinate files live in `screens_examples_coords/` and drive the canvas rendering code.

### How to create a new screen design:

1. **Describe the screen** to the HTML model with the prompt template in `docs/screen-design-prompt-template.md`
2. The HTML model generates a 240×160px mockup with `transform: scale(3)` for visibility
3. It outputs a **coordinate table** with every element's x, y, w, h, fontSize, color
4. Save the coordinate table to `screens_examples_coords/{screen}_coordinated.md`
5. Save a screenshot to `screens_examples_coords/{screen}.png`
6. Implement in canvas code using the exact coordinates

### Existing screen coordinate files:

- `screens_examples_coords/canvas_coordinates.md` — Party detail (Stats + Moves tabs)
- `screens_examples_coords/bag_coordinated.md` — Bag screen
- `screens_examples_coords/party_coordinated.md` — Party list screen

---

## Color Palette (Dark Green Theme)

All screens use a consistent dark green palette:

| Name       | Hex       | Usage                        |
| ---------- | --------- | ---------------------------- |
| BG         | `#0d1a14` | Main background              |
| CARD_BG    | `#0f2a1a` | Card/panel backgrounds       |
| CARD_SEL   | `#1a3a2a` | Selected card background     |
| BORDER     | `#1a4a30` | Default borders              |
| BORDER_SEL | `#2a6a40` | Selected item borders        |
| SEP        | `#1a3a2a` | Separator lines              |
| TEXT_PRI   | `#ffffff` | Primary text                 |
| TEXT_SEC   | `#aaccaa` | Secondary text (labels)      |
| TEXT_MUT   | `#667766` | Muted text (headers, hints)  |
| TEXT_DIM   | `#445544` | Dim text (counts, sub-info)  |
| TAB_BG     | `#0a2a1a` | Tab track background         |
| TAB_ACT    | `#1a5a35` | Active tab fill              |
| BTM_BG     | `#0a1a10` | Bottom bar / title bar       |
| KEY_BG     | `#1a3a2a` | Key pill background          |
| KEY_BRD    | `#2a5a3a` | Key pill border              |
| SEL_BAR    | `#20d860` | Selection indicator, HP full |
| HP_MID     | `#d8a020` | HP 25-49%                    |
| HP_LOW     | `#d84040` | HP <25%                      |
| BAR_XP     | `#5080ff` | XP bar fill                  |
| BAR_PP     | `#20a0d8` | PP bar fill                  |

---

## Shared Constants & Reusable Modules

### Type System (`src/data/type-constants.ts`)

```ts
TYPE_COLORS: Record<PokemonType, string>     // Color per Pokemon type
TYPE_NAMES: Record<PokemonType, {en, he}>     // Localized type names
DAMAGE_CLASS_LABELS: Record<string, {en, he, symbol, color}>
  // physical: { symbol: '⚔', color: '#f08030' }
  // special:  { symbol: '◆', color: '#6890f0' }
  // status:   { symbol: '☆', color: '#a040a0' }

getTypeName(type): string           // Returns localized name
getDamageClassLabel(dc): {label, symbol, color}  // Returns localized + color
```

### Type Badges (`src/ui/type-badge.ts`)

```ts
drawTypeBadge(ctx, type, x, y, mode, maxWidth?): number
  // mode: 'full' | 'short' (3 chars) | 'auto'
  // Returns badge width
```

### Item Icons (`src/ui/item-icons.ts`)

```ts
drawItemIcon(ctx, itemId, x, y, size)     // Draws programmatic item icon
drawPokeballIcon(ctx, ballId, x, y, size) // Draws pokeball by type
getItemIconStyle(itemId): {bg, stroke}    // Colors for icon boxes
ITEM_ICON_STYLE: Record<string, {bg, stroke}>  // Full lookup
```

### Pokeball Registry (`src/data/pokeballs.ts`)

```ts
POKEBALLS: Record<string, PokeballDef>
  // { id, name:{en,he}, description:{en,he}, catchRate, price, topColor }
getPokeball(id): PokeballDef | undefined
getDefaultPokeball(): PokeballDef
```

### Pokemon Data (`src/services/pokemon-data.ts`)

```ts
getPokemon(id): PokemonData               // stats, types, height, weight, category, description
getPokemonDisplayName(id): string          // Localized name
getPokemonCategory(id): string             // e.g. "Seed Pokémon"
getPokemonDescription(id): string          // English flavor text
getMove(id): MoveData                      // name, type, power, accuracy, pp, damageClass, description
getMoveDisplayName(id): string             // Localized name
getLearnset(pokemonId): {moveId, levelLearned}[]
getSpawnLocations(pokemonId): {mapId, minLevel, maxLevel}[]
getEvolutionChain(pokemonId): EvolutionChainData
getTypeEffectiveness(atk, def): number
```

---

## Font Sizes

Only these sizes are used across all screens:

- **10px** — Large titles, Pokemon names, big HP numbers
- **8px** — Section headers, item names in detail panels
- **7px** — Regular text, stat labels, move names, tab labels
- **6px** — Small labels (HP, XP, PP, type badges, counts, hints)
- **5px** — Sub-text (descriptions, sub-stats in move cards)

All fonts: `monospace`.

---

## Common UI Patterns

### Bottom Hint Bar

Every screen has a bottom bar at y=150, h=10 with key pills:

```
[ESC] חזרה  [Enter] פרטים  [▲▼] ניווט  [Space] החלף
```

Each pill: `KEY_BG` fill + `KEY_BRD` border, 6px text. Hint text in `TEXT_MUT`.

### Tab Bar (Pill-Style)

Centered container at y=2 or y=14, contains pill-shaped tabs. Active tab gets `TAB_ACT` fill. Tab text 6-7px.

### Card Rows

Items/Pokemon rendered as card rows: `CARD_BG` fill, `BORDER` stroke. Selected: `CARD_SEL` + `BORDER_SEL` + green left bar (2px, `#20d860`).

### i18n

All UI chrome text uses `t(key)` from `src/i18n/i18n.ts`. Hebrew (default) + English. Type names use `getTypeName()`. Move names use `getMoveDisplayName()`. Units: `t('party.unit.meter')` = מ', `t('party.unit.kg')` = ק"ג.

---

## Screens Implemented

| Screen               | File                      | Status                                |
| -------------------- | ------------------------- | ------------------------------------- |
| Party List           | `src/scenes/party.ts`     | ✅ Pixel-perfect                      |
| Party Detail — Stats | `src/scenes/party.ts`     | ✅ Pixel-perfect                      |
| Party Detail — Moves | `src/scenes/party.ts`     | ✅ Pixel-perfect                      |
| Bag                  | `src/scenes/bag.ts`       | ✅ Pixel-perfect                      |
| Pokedex              | `src/scenes/pokedex.ts`   | ✅ Functional (needs coordinate pass) |
| Battle               | `src/scenes/battle.ts`    | ✅ Functional                         |
| Overworld            | `src/scenes/overworld.ts` | ✅ Functional                         |

## Screens TODO (need design + coordinate pass)

- Battle UI redesign
- Shop screen redesign
- Settings screen
- Title screen redesign
- Starter select redesign
