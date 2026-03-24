# Pokemon RPG Canvas Coordinates — Bag Screen (תיק) 240×160

## Notes
- All `x,y` are TOP-LEFT corner
- Hebrew text: `ctx.textAlign = "right"`, anchor at `x + width`
- Centered text: `ctx.textAlign = "center"`, anchor at `x + width/2`
- LTR text (ESC, Enter, ×, numbers): `ctx.textAlign = "left"` at `x`
- All fonts: monospace
- Selected item has brighter border (#2a6a40), green left-bar, and green qty color

---

## SCREEN: BAG TAB (תיק)

### Title Bar (y=0, h=12)

| Element            |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text | align  |
|--------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|------|--------|
| Title bar bg       |   0 |  0 | 240 | 12 |        — | —       | #0a1a10 | —           | —    | —      |
| Bag icon box       | 196 |  2 |   8 |  8 |        — | —       | #0f2a1a | #1a4a30     | —    | —      |
| Bag icon inner     | 198 |  4 |   4 |  4 |        — | —       | #1a4a30 | —           | —    | —      |
| Title text         |  12 |  2 | 180 | — |       10 | #ffffff | —       | —           | תיק  | right  |

### Category Tabs (y=14, h=10)

| Element            |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text     | align  |
|--------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|----------|--------|
| Tab track bg       |   4 | 14 | 232 | 10 |        — | —       | #0a2a1a | #1a4a30     | —        | —      |
| Active: תרופות bg  | 188 | 14 |  46 | 10 |        — | —       | #1a5a35 | #1a4a30     | —        | —      |
| Active: תרופות txt | 188 | 15 |  46 | — |        6 | #ffffff | —       | —           | תרופות   | center |
| Tab: כדורים        | 144 | 15 |  40 | — |        6 | #667766 | —       | —           | כדורים   | center |
| Tab: קרב           | 112 | 15 |  30 | — |        6 | #667766 | —       | —           | קרב      | center |
| Tab: ויטמינים      |  64 | 15 |  44 | — |        6 | #667766 | —       | —           | ויטמינים | center |
| Tab: מפתח          |  22 | 15 |  38 | — |        6 | #667766 | —       | —           | מפתח     | center |

### Category Tab Data (for dynamic rendering)

| Index | text     | x   | w   | isActive |
|------:|----------|----:|----:|----------|
|     0 | תרופות   | 188 |  46 | true     |
|     1 | כדורים   | 144 |  40 | false    |
|     2 | קרב      | 112 |  30 | false    |
|     3 | ויטמינים |  64 |  44 | false    |
|     4 | מפתח     |  22 |  38 | false    |

### Item Cards (y=28 to ~112, each h=16, gap=1px, stride=17)

**Card template — every item follows this layout:**

| Sub-element       | relX | relY |   w |  h | fontSize | notes                                            |
|-------------------|-----:|-----:|----:|---:|---------:|--------------------------------------------------|
| Card bg           |    4 |    — | 232 | 16 |        — | normal: bg=#0f2a1a border=#1a4a30                |
| Card bg (selected)|    4 |    — | 232 | 16 |        — | selected: bg=#1a3a2a border=#2a6a40              |
| Select indicator  |    4 |    — |   2 | 16 |        — | only when selected: bg=#20d860                   |
| Icon box          |  210 |   +3 |  10 | 10 |        — | bg=iconBgColor border=iconStrokeColor radius=2   |
| Item name         |   96 |   +2 | 110 | — |        7 | color=#ffffff align=right direction=rtl           |
| Item description  |   96 |  +10 | 110 | — |        5 | color=#445544 (sel: #667766) align=right dir=rtl  |
| Qty × symbol      |    8 |   +2 |  — | — |        6 | color=#667766                                    |
| Qty number        |   14 |   +1 |  — | — |        8 | normal: color=#aaccaa, selected: color=#20d860    |

**Item Card Y Positions and Data:**

| # | cardY | name       | description          | qty | iconBg               | iconStroke | selected |
|---|------:|------------|----------------------|----:|----------------------|------------|----------|
| 1 |    28 | שיקוי      | משחזר 20 נק' חיים    |   5 | rgba(160,64,160,0.2) | #a040a0    | false    |
| 2 |    45 | שיקוי על   | משחזר 50 נק' חיים    |   3 | rgba(104,144,240,0.2)| #6890f0    | true     |
| 3 |    62 | נוגדן      | מרפא הרעלה           |   2 | rgba(248,208,48,0.15)| #f8d030    | false    |
| 4 |    79 | החייאה     | מחייה עם חצי חיים    |   2 | rgba(240,128,48,0.15)| #f08030    | false    |
| 5 |    96 | ריפוי מלא  | מרפא כל מצבי בריאות  |   1 | rgba(32,216,96,0.15) | #20d860    | false    |

**Absolute Y for each sub-element (per card):**

| # | cardBg.y | icon.y | name.y | desc.y | qtyX.y | qtyNum.y |
|---|----------|--------|--------|--------|--------|----------|
| 1 |       28 |     31 |     30 |     38 |     30 |       29 |
| 2 |       45 |     48 |     47 |     55 |     47 |       46 |
| 3 |       62 |     65 |     64 |     72 |     64 |       63 |
| 4 |       79 |     82 |     81 |     89 |     81 |       80 |
| 5 |       96 |     99 |     98 |    106 |     98 |       97 |

### Item Icon Drawing Guide (canvas fillRect / fillCircle)

Each icon sits inside a 10×10 box at (210, cardY+3). Draw these shapes inside:

| Item      | Shape description                                                          |
|-----------|---------------------------------------------------------------------------|
| שיקוי     | Purple bottle: 4×3 cap at (213,iconY-1) + 10×10 box stroke #a040a0        |
| שיקוי על  | Blue bottle: 4×3 cap at (213,iconY-1) + 4×2 chevron at (213,iconY+4) #6890f0 |
| נוגדן     | Yellow capsule: 10×10 box stroke #f8d030 + 2×4 pill at center #f8d030     |
| החייאה    | Orange diamond: 10×10 box stroke #f08030 + 4×4 rotated square at center   |
| ריפוי מלא | Green cross: 10×10 box stroke #20d860 + 2×6 vert + 6×2 horiz at center   |

### Separator

| Element         |  x |   y |   w | h | bgColor |
|-----------------|---:|----:|----:|--:|---------|
| Separator line  |  8 | 115 | 224 | 1 | #1a3a2a |

### Detail Panel (y=118, h=28)

| Element             |   x |   y |   w |  h | fontSize | color   | bgColor | borderColor | text                              | align  |
|---------------------|----:|----:|----:|---:|---------:|---------|---------|-------------|-----------------------------------|--------|
| Panel bg            |   4 | 118 | 232 | 28 |        — | —       | #0a2a1a | #1a4a30     | —                                 | —      |
| Detail icon box     | 210 | 121 |  14 | 14 |        — | —       | (per item) | (per item) | —                              | —      |
| Detail icon cap     | 215 | 120 |   4 |  3 |        — | —       | (per item) | —          | —                              | —      |
| Selected item name  | 100 | 121 | 106 | — |        8 | #20d860 | —       | —           | שיקוי על                          | right  |
| Full description    |  50 | 131 | 156 | — |        6 | #aaccaa | —       | —           | משחזר 50 נקודות חיים לפוקימון שנבחר | right  |
| Use button bg       |   8 | 122 |  34 | 12 |        — | —       | #1a5a35 | #2a6a40     | —                                 | —      |
| Use button text     |   8 | 124 |  34 | — |        7 | #20d860 | —       | —           | שימוש                             | center |

### Bottom Bar (y=150, h=10)

| Element            |   x |   y |   w |  h | fontSize | color   | bgColor | borderColor | text  | align  |
|--------------------|----:|----:|----:|---:|---------:|---------|---------|-------------|-------|--------|
| Bar background     |   0 | 150 | 240 | 10 |        — | —       | #0a1a10 | —           | —     | —      |
| ESC pill bg        |   8 | 151 |  20 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| ESC pill text      |   8 | 152 |  20 | — |        6 | #aaccaa | —       | —           | ESC   | center |
| ESC hint text      |  30 | 153 |  — | — |        6 | #667766 | —       | —           | חזרה  | left   |
| Enter pill bg      |  62 | 151 |  26 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| Enter pill text    |  62 | 152 |  26 | — |        6 | #aaccaa | —       | —           | Enter | center |
| Enter hint text    |  90 | 153 |  — | — |        6 | #667766 | —       | —           | שימוש | left   |
| ◀▶ pill bg         | 126 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| ◀▶ pill text       | 126 | 152 |  18 | — |        6 | #aaccaa | —       | —           | ◀▶    | center |
| ◀▶ hint text       | 146 | 153 |  — | — |        6 | #667766 | —       | —           | ניווט | left   |

---

## CANVAS HELPER — Quick Reference Constants

```javascript
// === BAG SCREEN LAYOUT CONSTANTS ===
const B = {
  // Title bar
  TITLE_BAR:    { x:0,   y:0,  w:240, h:12 },
  BAG_ICON:     { x:196, y:2,  w:8,   h:8  },
  BAG_ICON_IN:  { x:198, y:4,  w:4,   h:4  },
  TITLE_TEXT:   { x:192, y:8,  fs:10 },           // right anchor at x=12+180

  // Category tabs
  TAB_TRACK:    { x:4,   y:14, w:232, h:10 },
  TABS: [
    { x:188, y:14, w:46, text:'תרופות'   },
    { x:144, y:14, w:40, text:'כדורים'   },
    { x:112, y:14, w:30, text:'קרב'      },
    { x:64,  y:14, w:44, text:'ויטמינים' },
    { x:22,  y:14, w:38, text:'מפתח'     },
  ],
  TAB_H:         10,
  TAB_TEXT_DY:   1,    // text y = tab.y + 1
  TAB_TEXT_FS:   6,

  // Item list
  ITEM_X:        4,
  ITEM_W:        232,
  ITEM_H:        16,
  ITEM_STRIDE:   17,   // 16 + 1px gap
  ITEM_Y0:       28,   // first card top

  // Offsets within each item card (from card top-left)
  ICON_DX:       206,  // icon box left = cardX + 206 = 210
  ICON_DY:       3,
  ICON_SZ:       10,
  NAME_DX:       92,   // name area left = cardX + 92 = 96
  NAME_DY:       2,
  NAME_W:        110,
  DESC_DX:       92,
  DESC_DY:       10,
  DESC_W:        110,
  QTY_SYM_DX:    4,    // × symbol, left = cardX + 4 = 8
  QTY_SYM_DY:    2,
  QTY_NUM_DX:    10,   // number, left = cardX + 10 = 14
  QTY_NUM_DY:    1,
  SEL_BAR_W:     2,    // green selection indicator width

  // Separator
  SEP:           { x:8, y:115, w:224, h:1 },

  // Detail panel
  DETAIL_BG:     { x:4,   y:118, w:232, h:28 },
  DETAIL_ICON:   { x:210, y:121, w:14,  h:14 },
  DETAIL_NAME:   { x:206, y:127, fs:8  },         // right anchor at x=100+106
  DETAIL_DESC:   { x:206, y:137, fs:6  },         // right anchor at x=50+156
  USE_BTN_BG:    { x:8,   y:122, w:34,  h:12 },
  USE_BTN_TXT:   { x:25,  y:130, fs:7  },         // center anchor at x=8+34/2

  // Bottom bar
  BTM_BAR:       { x:0, y:150, w:240, h:10 },
  BTM_KEYS: [
    { pillX:8,   pillW:20, pillText:'ESC',   hintX:30,  hintText:'חזרה'  },
    { pillX:62,  pillW:26, pillText:'Enter', hintX:90,  hintText:'שימוש' },
    { pillX:126, pillW:18, pillText:'◀▶',    hintX:146, hintText:'ניווט' },
  ],
  BTM_PILL_Y:    151,
  BTM_PILL_H:    8,
  BTM_TEXT_Y:    152,
  BTM_HINT_Y:    153,
};

// === ITEM DATA ===
const BAG_ITEMS = {
  medicines: [
    {
      name: 'שיקוי',
      desc: 'משחזר 20 נק\' חיים',
      fullDesc: 'משחזר 20 נקודות חיים לפוקימון שנבחר',
      qty: 5,
      iconBg: 'rgba(160,64,160,0.2)',
      iconStroke: '#a040a0',
      iconType: 'potion',
    },
    {
      name: 'שיקוי על',
      desc: 'משחזר 50 נק\' חיים',
      fullDesc: 'משחזר 50 נקודות חיים לפוקימון שנבחר',
      qty: 3,
      iconBg: 'rgba(104,144,240,0.2)',
      iconStroke: '#6890f0',
      iconType: 'super_potion',
    },
    {
      name: 'נוגדן',
      desc: 'מרפא הרעלה',
      fullDesc: 'מרפא הרעלה לפוקימון שנבחר',
      qty: 2,
      iconBg: 'rgba(248,208,48,0.15)',
      iconStroke: '#f8d030',
      iconType: 'antidote',
    },
    {
      name: 'החייאה',
      desc: 'מחייה עם חצי חיים',
      fullDesc: 'מחייה פוקימון שהתעלף עם מחצית נקודות חיים',
      qty: 2,
      iconBg: 'rgba(240,128,48,0.15)',
      iconStroke: '#f08030',
      iconType: 'revive',
    },
    {
      name: 'ריפוי מלא',
      desc: 'מרפא כל מצבי בריאות',
      fullDesc: 'מרפא את כל מצבי הבריאות של פוקימון שנבחר',
      qty: 1,
      iconBg: 'rgba(32,216,96,0.15)',
      iconStroke: '#20d860',
      iconType: 'full_heal',
    },
  ],
};

// === ICON DRAWING FUNCTIONS ===
// Call these inside the icon box (10×10 at iconX, iconY)
function drawItemIcon(ctx, type, ix, iy, strokeColor) {
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  switch(type) {
    case 'potion':
      // Cap
      ctx.fillStyle = strokeColor;
      ctx.fillRect(ix + 3, iy - 1, 4, 3);
      break;
    case 'super_potion':
      // Cap + chevron
      ctx.fillStyle = strokeColor;
      ctx.fillRect(ix + 3, iy - 1, 4, 3);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(ix + 3, iy + 4, 4, 2);
      ctx.globalAlpha = 1;
      break;
    case 'antidote':
      // Pill center
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(ix + 4, iy + 2, 2, 4);
      ctx.globalAlpha = 1;
      break;
    case 'revive':
      // Diamond
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = 0.5;
      // Draw 4×4 rotated square (approximate with small rect)
      ctx.fillRect(ix + 3, iy + 3, 4, 4);
      ctx.globalAlpha = 1;
      break;
    case 'full_heal':
      // Cross
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(ix + 4, iy + 1, 2, 6);  // vertical
      ctx.fillRect(ix + 2, iy + 3, 6, 2);  // horizontal
      ctx.globalAlpha = 1;
      break;
  }
}
```
