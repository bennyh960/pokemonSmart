# Pokemon RPG Canvas Coordinates — PC Storage Screen (מחשב) 240×160

## Screen Layout Overview

```
┌──────────────────────────────────────────────────┐ y=0
│  [שחרור][הפקדה][משיכה]                    מחשב  │ Title bar (h=10)
├──────────────────────────────────────────────────┤ y=10
│        ◀  תיבה 1  3/30  ▶                       │ Box header (h=10)
├───────┬──────────────────────────────────────────┤ y=22
│קבוצה  │  [mon] [mon] [   ] [   ] [   ] [mon]    │
│       │  [   ] [   ] [   ] [   ] [   ] [   ]    │
│ [mon] │  [   ] [   ] [   ] [   ] [   ] [   ]    │
│ [ — ] │  [   ] [   ] [   ] [   ] [   ] [   ]    │
│ [ — ] │  [   ] [   ] [   ] [   ] [   ] [   ]    │ Box grid
│ [ — ] │                                          │ 6×5 = 30 cells
│ [ — ] │                                          │
│ [ — ] │                                          │
├───────┴──────────────────────────────────────────┤ y=124
│  [sprite] חרמנדר Lv.8 [אש] HP ████ 22/29 [משיכה]│ Detail strip (h=22)
├──────────────────────────────────────────────────┤ y=150
│ [ESC]חזרה [Enter]בחירה [◀▶]תיבה [Tab]מצב        │ Bottom bar (h=10)
└──────────────────────────────────────────────────┘ y=160
```

---

## TITLE BAR (y=0, h=10)

| Element          |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text   | align  |
|------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|--------|--------|
| Bar bg           |   0 |  0 | 240 | 10 |        — | —       | #0a1a10 | —           | —      | —      |
| Title text       | 200 |  1 |  36 | — |        8 | #ffffff | —       | —           | מחשב   | right  |
| Mode pill track  |   4 |  1 | 120 |  8 |        — | —       | #0a2a1a | #1a4a30     | —      | —      |
| Active mode bg   |  84 |  1 |  38 |  8 |        — | —       | #1a5a35 | #1a4a30     | —      | —      |
| Mode: משיכה      |  84 |  2 |  38 | — |        6 | #20d860 | —       | —           | משיכה  | center |
| Mode: הפקדה      |  44 |  2 |  38 | — |        6 | #445544 | —       | —           | הפקדה  | center |
| Mode: שחרור      |   6 |  2 |  36 | — |        6 | #445544 | —       | —           | שחרור  | center |

### Mode Tab Positions (for dynamic active state)

| Index | Mode   | text   | x  | w  | activeColor |
|------:|--------|--------|---:|---:|-------------|
|     0 | withdraw | משיכה | 84 | 38 | #20d860     |
|     1 | deposit  | הפקדה | 44 | 38 | #5080ff     |
|     2 | release  | שחרור |  6 | 36 | #d84040     |

Active bg per mode: withdraw=#1a5a35, deposit=#1a3a5a, release=#3a1a1a

---

## BOX HEADER (y=10, h=10)

| Element          |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text     | align  |
|------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|----------|--------|
| Arrow left bg    |  64 | 11 |  10 |  8 |        — | —       | #0f2a1a | #1a4a30     | —        | —      |
| Arrow left text  |  64 | 12 |  10 | — |        6 | #667766 | —       | —           | ◀        | center |
| Box name         |  78 | 11 |  80 | — |        7 | #ffffff | —       | —           | תיבה 1   | center |
| Box count        | 160 | 12 |  — | — |        5 | #445544 | —       | —           | 3/30     | left   |
| Arrow right bg   | 176 | 11 |  10 |  8 |        — | —       | #0f2a1a | #1a4a30     | —        | —      |
| Arrow right text | 176 | 12 |  10 | — |        6 | #667766 | —       | —           | ▶        | center |

---

## PARTY SIDEBAR (x=4, w=56, y=22 to y=138)

### Party Header

| Element          |   x |  y |   w | fontSize | color   | text   | align  |
|------------------|----:|---:|----:|---------:|---------|--------|--------|
| Label            |   4 | 22 |  56 |        6 | #445544 | קבוצה  | right  |
| Count            |   4 | 22 |  — |        5 | #445544 | 1/6    | left   |

### Party Slot Layout

| Slot | Type   | y   | h  |
|------|--------|----:|---:|
| 1    | filled |  30 | 16 |
| 2    | empty  |  48 | 16 |
| 3    | empty  |  66 | 16 |
| 4    | empty  |  84 | 16 |
| 5    | empty  | 102 | 16 |
| 6    | empty  | 120 | 16 |

Stride = 18 (16 + 2px gap)

### Filled Party Slot Template (x=4, w=56, h=16)

| Sub-element    | x   | relY |   w |  h | fontSize | color   | bgColor | notes                        |
|----------------|----:|-----:|----:|---:|---------:|---------|---------|------------------------------|
| Card bg        |   4 |    0 |  56 | 16 |        — | —       | #0f2a1a | border 1px #1a4a30, radius=2 |
| Sprite box     |  44 |   +1 |  14 | 14 |        — | —       | #0a2a1a | border 1px #1a4a30, radius=2 |
| Sprite area    |  46 |   +3 |  10 | 10 |        — | —       | —       | draw 10×10 mini sprite       |
| Name           |   6 |   +2 |  36 | — |        5 | #ffffff | —       | align=right, direction=rtl   |
| HP bar track   |   6 |  +10 |  34 |  2 |        — | —       | #1a3a2a | radius=1                     |
| HP bar fill    |   6 |  +10 |   * |  2 |        — | —       | #20d860 | w = (curHP/maxHP) × 34       |

### Empty Party Slot Template

| Sub-element    | x   | relY |   w |  h | fontSize | color   | bgColor | notes               |
|----------------|----:|-----:|----:|---:|---------:|---------|---------|---------------------|
| Card bg        |   4 |    0 |  56 | 16 |        — | —       | #0f2a1a | border 1px #1a4a30  |
| Empty text     |   4 |   +5 |  56 | — |        5 | #1a2a1a | —       | "—", align=center   |

---

## BOX GRID (6 columns × 5 rows = 30 cells)

### Grid Geometry

| Property        | Value |
|-----------------|------:|
| Grid origin X   |    64 |
| Grid origin Y   |    22 |
| Cell width      |    28 |
| Cell height     |    19 |
| Column stride   |    29 |
| Row stride      |    20 |
| Columns         |     6 |
| Rows            |     5 |
| Total cells     |    30 |

### Cell Position Formula

```
cellX = 64 + col × 29    (col = 0..5)
cellY = 22 + row × 20    (row = 0..4)
```

### All 30 Cell Positions

| Cell  | col | row |   x |   y |
|-------|----:|----:|----:|----:|
| (0,0) |   0 |   0 |  64 |  22 |
| (1,0) |   1 |   0 |  93 |  22 |
| (2,0) |   2 |   0 | 122 |  22 |
| (3,0) |   3 |   0 | 151 |  22 |
| (4,0) |   4 |   0 | 180 |  22 |
| (5,0) |   5 |   0 | 209 |  22 |
| (0,1) |   0 |   1 |  64 |  42 |
| (1,1) |   1 |   1 |  93 |  42 |
| (2,1) |   2 |   1 | 122 |  42 |
| (3,1) |   3 |   1 | 151 |  42 |
| (4,1) |   4 |   1 | 180 |  42 |
| (5,1) |   5 |   1 | 209 |  42 |
| (0,2) |   0 |   2 |  64 |  62 |
| (1,2) |   1 |   2 |  93 |  62 |
| (2,2) |   2 |   2 | 122 |  62 |
| (3,2) |   3 |   2 | 151 |  62 |
| (4,2) |   4 |   2 | 180 |  62 |
| (5,2) |   5 |   2 | 209 |  62 |
| (0,3) |   0 |   3 |  64 |  82 |
| (1,3) |   1 |   3 |  93 |  82 |
| (2,3) |   2 |   3 | 122 |  82 |
| (3,3) |   3 |   3 | 151 |  82 |
| (4,3) |   4 |   3 | 180 |  82 |
| (5,3) |   5 |   3 | 209 |  82 |
| (0,4) |   0 |   4 |  64 | 102 |
| (1,4) |   1 |   4 |  93 | 102 |
| (2,4) |   2 |   4 | 122 | 102 |
| (3,4) |   3 |   4 | 151 | 102 |
| (4,4) |   4 |   4 | 180 | 102 |
| (5,4) |   5 |   4 | 209 | 102 |

### Cell Rendering

**Empty cell:**
- bg: `#0a1a10`, border: 1px `#1a3a2a`, radius=2
- Center dot: 4×4 circle at (cellX+12, cellY+7), fill `#0f2a1a`

**Filled cell (has Pokemon):**
- bg: `#0f2a1a`, border: 1px `#1a4a30`, radius=2
- Sprite: 12×12 centered at (cellX+8, cellY+2)

**Selected cell (cursor is here):**
- bg: `#1a3a2a`, border: 1px `#2a6a40`, radius=2
- Corner marks (4 green L-shaped brackets):
  - Top-left: 3×1 at (cellX+1, cellY+1) + 1×3 at (cellX+1, cellY+1)
  - Top-right: 3×1 at (cellX+24, cellY+1) + 1×3 at (cellX+26, cellY+1)
  - Bottom-left: 3×1 at (cellX+1, cellY+17) + 1×3 at (cellX+1, cellY+15)
  - Bottom-right: 3×1 at (cellX+24, cellY+17) + 1×3 at (cellX+26, cellY+15)
  - Color: `#20d860`

---

## DETAIL STRIP (y=124, h=22)

| Element            |   x |   y |   w |  h | fontSize | color   | bgColor | borderColor | text     | align  |
|--------------------|----:|----:|----:|---:|---------:|---------|---------|-------------|----------|--------|
| Strip bg           |   4 | 124 | 232 | 22 |        — | —       | #0a2a1a | #1a4a30     | —        | —      |
| Sprite box         | 216 | 126 |  18 | 18 |        — | —       | #0f2a1a | #1a4a30     | —        | —      |
| Sprite area        | 218 | 128 |  14 | 14 |        — | —       | —       | —           | (sprite) | —      |
| Pokemon name       | 140 | 126 |  72 | — |        7 | #20d860 | —       | —           | חרמנדר   | right  |
| Level              | 126 | 126 |  14 | — |        5 | #667766 | —       | —           | Lv.8     | left   |
| Type badge bg      | 182 | 134 |  16 |  6 |        — | —       | (type)  | —           | —        | —      |
| Type badge text    | 182 | 134 |  16 | — |        5 | #ffffff | —       | —           | אש       | center |
| HP label           | 100 | 135 |  — | — |        5 | #667766 | —       | —           | HP       | left   |
| HP bar track       |  44 | 137 |  52 |  2 |        — | —       | #1a3a2a | —           | —        | —      |
| HP bar fill        |  44 | 137 |   * |  2 |        — | —       | #20d860 | —           | —        | —      |
| HP value           |  10 | 135 |  — | — |        5 | #aaccaa | —       | —           | 22/29    | left   |
| Action btn bg      | 116 | 134 |  28 |  8 |        — | —       | #1a5a35 | #2a6a40     | —        | —      |
| Action btn text    | 116 | 135 |  28 | — |        5 | #20d860 | —       | —           | משיכה    | center |

### Action Button Text Per Mode

| Mode     | text   | btnBg   | btnBorder | textColor |
|----------|--------|---------|-----------|-----------|
| withdraw | משיכה  | #1a5a35 | #2a6a40   | #20d860   |
| deposit  | הפקדה  | #1a3a5a | #2a4a6a   | #5080ff   |
| release  | שחרור  | #3a1a1a | #5a2a2a   | #d84040   |

---

## BOTTOM BAR (y=150, h=10)

| Element          |   x |   y |  w |  h | fontSize | color   | bgColor | borderColor | text   | align  |
|------------------|----:|----:|---:|---:|---------:|---------|---------|-------------|--------|--------|
| Bar bg           |   0 | 150 | 240 | 10 |        — | —       | #0a1a10 | —           | —      | —      |
| ESC pill bg      |   4 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| ESC pill text    |   4 | 152 |  18 | — |        5 | #aaccaa | —       | —           | ESC    | center |
| ESC hint         |  24 | 153 |  — | — |        5 | #667766 | —       | —           | חזרה   | left   |
| Enter pill bg    |  52 | 151 |  24 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| Enter pill text  |  52 | 152 |  24 | — |        5 | #aaccaa | —       | —           | Enter  | center |
| Enter hint       |  78 | 153 |  — | — |        5 | #667766 | —       | —           | בחירה  | left   |
| ◀▶ pill bg       | 108 | 151 |  14 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| ◀▶ pill text     | 108 | 152 |  14 | — |        5 | #aaccaa | —       | —           | ◀▶     | center |
| ◀▶ hint          | 124 | 153 |  — | — |        5 | #667766 | —       | —           | תיבה   | left   |
| Tab pill bg      | 152 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| Tab pill text    | 152 | 152 |  18 | — |        5 | #aaccaa | —       | —           | Tab    | center |
| Tab hint         | 172 | 153 |  — | — |        5 | #667766 | —       | —           | מצב    | left   |

---

## CANVAS HELPER — Quick Reference Constants

```javascript
// === PC SCREEN LAYOUT CONSTANTS ===
const PC = {
  // Title bar
  TITLE_BAR:    { x:0,   y:0,  w:240, h:10 },
  TITLE_TEXT:   { x:236, y:7,  fs:8  },           // right anchor

  // Mode pills
  MODE_TRACK:   { x:4,   y:1,  w:120, h:8  },
  MODES: [
    { x:84, w:38, text:'משיכה',  activeColor:'#20d860', activeBg:'#1a5a35' },
    { x:44, w:38, text:'הפקדה',  activeColor:'#5080ff', activeBg:'#1a3a5a' },
    { x:6,  w:36, text:'שחרור',  activeColor:'#d84040', activeBg:'#3a1a1a' },
  ],
  MODE_TEXT_Y:   2,
  MODE_TEXT_FS:  6,
  MODE_INACTIVE: '#445544',

  // Box header
  BOX_HDR_Y:     10,
  BOX_NAME:      { x:78, y:11, w:80, fs:7 },      // center
  BOX_COUNT:     { x:160, y:12, fs:5 },            // left
  ARROW_L:       { x:64, y:11, w:10, h:8 },
  ARROW_R:       { x:176, y:11, w:10, h:8 },

  // === PARTY SIDEBAR ===
  PARTY_LABEL:   { x:60, y:28, fs:6 },             // right anchor
  PARTY_COUNT:   { x:4,  y:28, fs:5 },             // left anchor
  PARTY_X:       4,
  PARTY_W:       56,
  PARTY_SLOT_H:  16,
  PARTY_STRIDE:  18,
  PARTY_Y0:      30,
  PARTY_SLOTS_Y: [30, 48, 66, 84, 102, 120],

  // Filled party slot offsets
  PARTY_SPRITE_BOX: { dx:40, dy:1, w:14, h:14 },   // x = 44
  PARTY_SPRITE:     { dx:42, dy:3, w:10, h:10 },    // x = 46
  PARTY_NAME:       { dx:2,  dy:2, w:36, fs:5 },    // x = 6, align=right
  PARTY_HP_TRACK:   { dx:2,  dy:10, w:34, h:2 },    // x = 6
  PARTY_HP_MAX_W:   34,

  // === BOX GRID ===
  GRID_X:        64,
  GRID_Y:        22,
  CELL_W:        28,
  CELL_H:        19,
  COL_STRIDE:    29,     // 28 + 1px gap
  ROW_STRIDE:    20,     // 19 + 1px gap
  COLS:          6,
  ROWS:          5,
  CELLS_TOTAL:   30,

  // Cell contents
  SPRITE_IN_CELL: { dx:8, dy:2, w:12, h:12 },
  EMPTY_DOT:      { dx:12, dy:7, w:4, h:4 },
  // Selection cursor corner marks: color=#20d860, each 3×1 + 1×3

  // === DETAIL STRIP ===
  DETAIL:        { x:4, y:124, w:232, h:22 },
  DET_SPRITE_BOX:{ x:216, y:126, w:18, h:18 },
  DET_SPRITE:    { x:218, y:128, w:14, h:14 },
  DET_NAME:      { x:212, y:132, fs:7 },           // right anchor at x=140+72
  DET_LEVEL:     { x:126, y:132, fs:5 },           // left
  DET_BADGE:     { x:182, y:134, w:16, h:6, fs:5 },
  DET_HP_LABEL:  { x:100, y:141, fs:5 },
  DET_HP_TRACK:  { x:44,  y:137, w:52, h:2 },
  DET_HP_MAX_W:  52,
  DET_HP_VALUE:  { x:10,  y:141, fs:5 },
  DET_ACTION_BTN:{ x:116, y:134, w:28, h:8 },
  DET_ACTION_TXT:{ x:130, y:139, fs:5 },           // center anchor

  // === BOTTOM BAR ===
  BTM_BAR:       { x:0, y:150, w:240, h:10 },
  BTM_KEYS: [
    { pillX:4,   pillW:18, pillText:'ESC',   hintX:24,  hintText:'חזרה'  },
    { pillX:52,  pillW:24, pillText:'Enter', hintX:78,  hintText:'בחירה' },
    { pillX:108, pillW:14, pillText:'◀▶',    hintX:124, hintText:'תיבה'  },
    { pillX:152, pillW:18, pillText:'Tab',   hintX:172, hintText:'מצב'   },
  ],
  BTM_PILL_Y:    151,
  BTM_PILL_H:    8,
  BTM_TEXT_Y:    152,
  BTM_HINT_Y:    153,
  BTM_FS:        5,
};

// === GRID CELL POSITION HELPER ===
function getCellPos(col, row) {
  return {
    x: PC.GRID_X + col * PC.COL_STRIDE,
    y: PC.GRID_Y + row * PC.ROW_STRIDE,
  };
}

// === GRID CELL RENDERING ===
function drawBoxCell(ctx, col, row, pokemon, isSelected) {
  const { x, y } = getCellPos(col, row);
  const w = PC.CELL_W;
  const h = PC.CELL_H;

  if (pokemon) {
    // Filled cell
    ctx.fillStyle = isSelected ? '#1a3a2a' : '#0f2a1a';
    fillRoundRect(ctx, x, y, w, h, 2);
    ctx.strokeStyle = isSelected ? '#2a6a40' : '#1a4a30';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, x, y, w, h, 2);
    // Draw sprite at (x+8, y+2, 12, 12)
    drawMiniSprite(ctx, pokemon.spriteId, x + 8, y + 2, 12, 12);
  } else {
    // Empty cell
    ctx.fillStyle = '#0a1a10';
    fillRoundRect(ctx, x, y, w, h, 2);
    ctx.strokeStyle = '#1a3a2a';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, x, y, w, h, 2);
    // Dot
    ctx.fillStyle = '#0f2a1a';
    fillCircle(ctx, x + 14, y + 9, 2);
  }

  // Selection cursor
  if (isSelected) {
    ctx.fillStyle = '#20d860';
    // Top-left corner
    ctx.fillRect(x + 1, y + 1, 3, 1);
    ctx.fillRect(x + 1, y + 1, 1, 3);
    // Top-right corner
    ctx.fillRect(x + w - 4, y + 1, 3, 1);
    ctx.fillRect(x + w - 2, y + 1, 1, 3);
    // Bottom-left corner
    ctx.fillRect(x + 1, y + h - 2, 3, 1);
    ctx.fillRect(x + 1, y + h - 4, 1, 3);
    // Bottom-right corner
    ctx.fillRect(x + w - 4, y + h - 2, 3, 1);
    ctx.fillRect(x + w - 2, y + h - 4, 1, 3);
  }
}

// === NAVIGATION STATE ===
// The cursor can be in two zones:
// 1. BOX GRID: col=0..5, row=0..4 (30 positions)
// 2. PARTY LIST: partyIndex=0..5
// Press left from col=0 → enter party list
// Press right from party → enter grid col=0
// ◀▶ keys (or L/R shoulder) → change box number
// Tab → cycle mode: withdraw → deposit → release → withdraw
```
