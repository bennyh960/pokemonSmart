# Pokemon RPG Canvas Coordinates — Shop Screen (חנות פוקימון) 240×160

## Screen Layout Overview

```
┌──────────────────────────────────────────────────┐ y=0
│  [₪3000]                         חנות פוקימון   │ Header (h=12)
├──────────────────────────────────────────────────┤ y=13
│ [ויטמינים][קרב][כדורים][החייאה][ריפוי מצב][ריפוי]│ Category tabs (h=9)
├──────────────────────────────────────────────────┤ y=24
│ [icon] שיקוי                              ₪300  │ item 0 (h=23)
│        משחזר 20 נק חיים       ברשותך: 5         │
├──────────────────────────────────────────────────┤ y=48
│ [icon] שיקוי על                           ₪700  │ item 1
├──────────────────────────────────────────────────┤ y=72
│▌[icon] שיקוי היפר                        ₪1200  │ item 2 (SELECTED)
│        משחזר 200 נק חיים      [קנייה]           │
├──────────────────────────────────────────────────┤ y=96
│ [icon] שיקוי מקס                         ₪2500  │ item 3
├──────────────────────────────────────────────────┤ y=120
│ [icon] שחזור מלא               (dim)     ₪3000  │ item 4 (can't afford)
├──────────────────────────────────────────────────┤ y=150
│ [ESC]יציאה [Enter]קנייה [◀▶]קטגוריה [▲▼]ניווט  │ Bottom bar (h=10)
└──────────────────────────────────────────────────┘ y=160
```

Max 5 visible items at once. Scroll indicator on far right if >5 items.

---

## HEADER BAR (y=0, h=12)

| Element          |   x |  y |   w |  h | fontSize | color   | bgColor                  | borderColor              | text         | align  |
|------------------|----:|---:|----:|---:|---------:|---------|--------------------------|--------------------------|--------------|--------|
| Bar bg           |   0 |  0 | 240 | 12 |        — | —       | #0a1a10                  | —                        | —            | —      |
| Title text       | 176 |  1 |  60 | — |        8 | #ffffff | —                        | —                        | חנות פוקימון | right  |
| Money badge bg   |   4 |  1 |  52 | 10 |        — | —       | rgba(248,208,48,0.08)    | rgba(248,208,48,0.15)    | —            | —      |
| Money ₪ symbol   |  40 |  2 |  — | — |        7 | #f8d030 | —                        | —                        | ₪            | left   |
| Money value      |   6 |  2 |  32 | — |        7 | #f8d030 | —                        | —                        | 3000         | left   |

---

## CATEGORY TABS (y=13, h=9)

| Element          |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text      | align  |
|------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|-----------|--------|
| Tab track bg     |   4 | 13 | 232 |  9 |        — | —       | #0a2a1a | #1a4a30     | —         | —      |
| Active tab bg    | (varies) | 13 | (varies) | 9 | — | —  | #1a5a35 | #1a4a30     | —         | —      |
| Active tab text  | (varies) | 14 | (varies) | — | 6 | #20d860 | — | —            | (name)    | center |
| Inactive text    | (varies) | 14 | (varies) | — | 5 | #445544 | — | —            | (name)    | center |

### Category Tab Data

| Index | Category   | text      | x   | w  | dotColor | dotX |
|------:|------------|-----------|----:|---:|----------|-----:|
|     0 | healing    | ריפוי     | 198 | 36 | #20d860  |  — (in pill) |
|     1 | status-cure| ריפוי מצב | 142 | 28 | #5080ff  | 172  |
|     2 | revival    | החייאה    | 104 | 20 | #f8d030  | 126  |
|     3 | pokeball   | כדורים    |  66 | 22 | #e85858  |  90  |
|     4 | battle     | קרב       |  38 | 14 | #f08030  |  54  |
|     5 | vitamin    | ויטמינים  |   4 | 18 | #a040a0  |  24  |

Inactive tabs show a small 3×3 colored dot at dotX, y=16. Active tab has no dot (color is in the text).

---

## ITEM CARDS (y=24 to y=143, stride=24, h=23, gap=1px)

### Card Template

| Sub-element      | x    | relY |   w |  h | fontSize | color   | notes                                      |
|------------------|-----:|-----:|----:|---:|---------:|---------|--------------------------------------------|
| Card bg          |    4 |    0 | 232 | 23 |        — | —       | normal: #0f2a1a, border #1a4a30            |
| Card bg (sel)    |    4 |    0 | 232 | 23 |        — | —       | selected: #1a3a2a, border #2a6a40          |
| Select indicator |    4 |    0 |   2 | 23 |        — | #20d860 | only when selected                         |
| Icon box         |  214 |   +2 |  16 | 16 |        — | —       | bg per item, border per item, radius=3     |
| Icon bottle cap  |  219 |   +1 |   6 |  3 |        — | (color) | radius=1, opacity=0.7                      |
| Icon bottle body |  218 |   +4 |   8 | 10 |        — | (color) | bg=color@0.15, border=color@0.4, radius 1,1,3,3 |
| Item name        |  120 |   +3 |  90 | — |        7 | #ffffff | align=right, dir=rtl                       |
| Item description |  120 |  +12 |  90 | — |        5 | #445544 | align=right, dir=rtl (sel: #667766)        |
| Owned text       |  120 |  +18 |  — | — |        5 | #3a4a3a | "ברשותך: N", align=right, dir=rtl          |
| Owned count      |  — |  +18 |  — | — |        5 | #7a9a85 | just the number (brighter)                 |
| ₪ symbol         |    8 |   +3 |  — | — |        6 | #f8d030 | bold                                       |
| Price value      |   14 |   +2 |  — | — |        8 | #f8d030 | dir=ltr                                    |
| Buy btn bg       |    8 |  +12 |  28 |  8 |        — | —       | #1a5a35, border #2a6a40 (selected only)    |
| Buy btn text     |    8 |  +13 |  28 | — |        5 | #20d860 | "קנייה", center (selected only)            |

### Can't Afford Variant

When item price > player money:
- Item name color: `#667766` instead of `#ffffff`
- Description color: `#334433` instead of `#445544`
- ₪ + price color: `#5a4a2a` instead of `#f8d030`
- Buy btn bg: `#1a2a1a`, border `#2a3a2a`, text color `#334433`

### Item Card Y Positions (max 5 visible, scrollable)

| Index | cardY | Item View Window                    |
|------:|------:|-------------------------------------|
|     0 |    24 | Always visible when scroll offset=0 |
|     1 |    48 |                                     |
|     2 |    72 |                                     |
|     3 |    96 |                                     |
|     4 |   120 |                                     |

**Scroll formula:** `cardY = 24 + (index - scrollOffset) × 24`
Only render cards where `cardY >= 24 && cardY <= 120`

### Absolute Y per Sub-element (example: card at y=72, SELECTED)

| Sub-element      | x   | y   |
|------------------|----:|----:|
| Card bg          |   4 |  72 |
| Select bar       |   4 |  72 |
| Icon box         | 214 |  74 |
| Icon cap         | 219 |  73 |
| Icon body        | 218 |  76 |
| Item name        | 120 |  75 |
| Item desc        | 120 |  84 |
| Owned text       | 120 |  90 |
| ₪ symbol         |   8 |  75 |
| Price value      |  14 |  74 |
| Buy btn bg       |   8 |  84 |
| Buy btn text     |   8 |  85 |

---

## SCROLL INDICATOR (optional, when >5 items)

| Element          |   x |  y |   w |  h | bgColor |
|------------------|----:|---:|----:|---:|---------|
| Track            | 237 | 28 |   2 | 110| #0a2a1a |
| Thumb            | 237 |  * |   2 |  * | #1a4a30 |

Thumb position: `thumbY = 28 + (scrollOffset / (totalItems - 5)) × (110 - thumbH)`
Thumb height: `thumbH = Math.max(20, (5 / totalItems) × 110)`

---

## ITEM ICON DRAWING GUIDE

Each icon sits inside a 16×16 box at (214, cardY+2).

| Item        | Bottle color  | Icon details                                            |
|-------------|---------------|---------------------------------------------------------|
| שיקוי       | #a040dc       | Cap(6×3) + Body(8×10) basic bottle                      |
| שיקוי על    | #50a0ff       | Cap + Body + small stripe at (body+4, 4×2) opacity=0.4  |
| שיקוי היפר  | #ff783c       | Cap + Body + chevron stripe at (body+3, 4×3) opacity=0.3|
| שיקוי מקס   | #f8d030       | Cap + Body + "M" letter or star                         |
| שחזור מלא   | #20d860       | Circle(8×8) with cross (2×8 vert + 8×2 horiz)          |
| נוגדן       | #f8d030       | Capsule shape: rect(6×12) with circle centers           |
| החייאה      | #f08030       | Diamond shape: rotated rect(8×8)                        |
| כדור פוקי   | #e85858       | Circle(12×12) with horizontal line and center dot       |
| סופר כדור   | #5080ff       | Same but with blue + stripe pattern                     |

---

## BOTTOM BAR (y=150, h=10)

| Element          |   x |   y |  w |  h | fontSize | color   | bgColor | borderColor | text     | align  |
|------------------|----:|----:|---:|---:|---------:|---------|---------|-------------|----------|--------|
| Bar bg           |   0 | 150 | 240 | 10 |        — | —       | #0a1a10 | —           | —        | —      |
| ESC pill bg      |   4 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —        | —      |
| ESC pill text    |   4 | 152 |  18 | — |        5 | #aaccaa | —       | —           | ESC      | center |
| ESC hint         |  24 | 153 |  — | — |        5 | #667766 | —       | —           | יציאה    | left   |
| Enter pill bg    |  52 | 151 |  24 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —        | —      |
| Enter pill text  |  52 | 152 |  24 | — |        5 | #aaccaa | —       | —           | Enter    | center |
| Enter hint       |  78 | 153 |  — | — |        5 | #667766 | —       | —           | קנייה    | left   |
| ◀▶ pill bg       | 108 | 151 |  14 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —        | —      |
| ◀▶ pill text     | 108 | 152 |  14 | — |        5 | #aaccaa | —       | —           | ◀▶       | center |
| ◀▶ hint          | 124 | 153 |  — | — |        5 | #667766 | —       | —           | קטגוריה  | left   |
| ▲▼ pill bg       | 160 | 151 |  14 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —        | —      |
| ▲▼ pill text     | 160 | 152 |  14 | — |        5 | #aaccaa | —       | —           | ▲▼       | center |
| ▲▼ hint          | 176 | 153 |  — | — |        5 | #667766 | —       | —           | ניווט    | left   |

---

## CANVAS HELPER — Quick Reference Constants

```javascript
// === SHOP SCREEN LAYOUT CONSTANTS ===
const SHOP = {
  // Header
  HEADER_BAR:    { x:0,   y:0,  w:240, h:12 },
  TITLE_TEXT:    { x:236, y:7,  fs:8  },           // right anchor
  MONEY_BADGE:   { x:4,   y:1,  w:52,  h:10 },
  MONEY_SYMBOL:  { x:40,  y:8,  fs:7  },           // "₪"
  MONEY_VALUE:   { x:6,   y:8,  fs:7  },           // left anchor, dir=ltr

  // Category tabs
  TAB_TRACK:     { x:4,   y:13, w:232, h:9  },
  CATEGORIES: [
    { id:'healing',     text:'ריפוי',     x:198, w:36, dotColor:'#20d860' },
    { id:'status-cure', text:'ריפוי מצב', x:142, w:28, dotColor:'#5080ff', dotX:172 },
    { id:'revival',     text:'החייאה',    x:104, w:20, dotColor:'#f8d030', dotX:126 },
    { id:'pokeball',    text:'כדורים',    x:66,  w:22, dotColor:'#e85858', dotX:90  },
    { id:'battle',      text:'קרב',       x:38,  w:14, dotColor:'#f08030', dotX:54  },
    { id:'vitamin',     text:'ויטמינים',  x:4,   w:18, dotColor:'#a040a0', dotX:24  },
  ],
  TAB_ACTIVE_BG:  '#1a5a35',
  TAB_ACTIVE_TXT: '#20d860',
  TAB_ACTIVE_FS:  6,
  TAB_INACT_TXT:  '#445544',
  TAB_INACT_FS:   5,
  TAB_DOT_SIZE:   3,
  TAB_DOT_Y:      16,

  // Item list
  ITEM_X:         4,
  ITEM_W:         232,
  ITEM_H:         23,
  ITEM_STRIDE:    24,      // 23 + 1px gap
  ITEM_Y0:        24,      // first card y
  MAX_VISIBLE:    5,       // 5 items visible at once

  // Item card offsets (from card top-left)
  ICON_BOX:       { dx:210, dy:2, w:16, h:16 },   // x = 214
  ICON_CAP:       { dx:215, dy:1, w:6,  h:3  },   // bottle cap
  ICON_BODY:      { dx:214, dy:4, w:8,  h:10 },   // bottle body
  NAME:           { dx:116, dy:3, w:90, fs:7  },   // x = 120, align=right
  DESC:           { dx:116, dy:12, w:90, fs:5 },   // x = 120
  OWNED:          { dx:116, dy:18, fs:5 },          // x = 120
  CURRENCY_SYM:   { dx:4,   dy:3, fs:6 },           // x = 8, "₪"
  PRICE:          { dx:10,  dy:2, fs:8 },            // x = 14
  BUY_BTN:        { dx:4,   dy:12, w:28, h:8 },     // x = 8 (selected only)
  BUY_BTN_TEXT:   { dx:4,   dy:13, w:28, fs:5 },
  SEL_BAR_W:      2,

  // Scroll indicator
  SCROLL_TRACK:   { x:237, y:28, w:2, h:110 },
  SCROLL_TRACK_C: '#0a2a1a',
  SCROLL_THUMB_C: '#1a4a30',

  // Bottom bar
  BTM_BAR:        { x:0, y:150, w:240, h:10 },
  BTM_KEYS: [
    { pillX:4,   pillW:18, pillText:'ESC',   hintX:24,  hintText:'יציאה'   },
    { pillX:52,  pillW:24, pillText:'Enter', hintX:78,  hintText:'קנייה'   },
    { pillX:108, pillW:14, pillText:'◀▶',    hintX:124, hintText:'קטגוריה' },
    { pillX:160, pillW:14, pillText:'▲▼',    hintX:176, hintText:'ניווט'   },
  ],
  BTM_PILL_Y:     151,
  BTM_PILL_H:     8,
  BTM_TEXT_Y:     152,
  BTM_HINT_Y:     153,
  BTM_FS:         5,
};

// === SHOP ITEM DATA ===
const SHOP_ITEMS = {
  healing: [
    { name:'שיקוי',       desc:'משחזר 20 נק\' חיים',    price:300,  iconColor:'#a040dc' },
    { name:'שיקוי על',    desc:'משחזר 50 נק\' חיים',    price:700,  iconColor:'#50a0ff' },
    { name:'שיקוי היפר',  desc:'משחזר 200 נק\' חיים',   price:1200, iconColor:'#ff783c' },
    { name:'שיקוי מקס',   desc:'משחזר HP במלואו',        price:2500, iconColor:'#f8d030' },
    { name:'שחזור מלא',   desc:'משחזר HP וסטטוס במלואם', price:3000, iconColor:'#20d860', iconType:'cross' },
  ],
  'status-cure': [
    { name:'נוגדן',        desc:'מרפא הרעלה',            price:100,  iconColor:'#f8d030', iconType:'capsule' },
    { name:'נוגד שריפה',   desc:'מרפא שריפה',            price:250,  iconColor:'#f08030', iconType:'capsule' },
    { name:'נוגד קפאון',   desc:'מרפא קפאון',            price:250,  iconColor:'#98d8d8', iconType:'capsule' },
    { name:'ריפוי מלא',    desc:'מרפא כל מצבי בריאות',   price:600,  iconColor:'#20d860', iconType:'cross' },
  ],
  revival: [
    { name:'החייאה',       desc:'מחייה עם חצי חיים',     price:1500, iconColor:'#f08030', iconType:'diamond' },
    { name:'החייאה מקס',   desc:'מחייה עם מלוא החיים',   price:4000, iconColor:'#f8d030', iconType:'diamond' },
  ],
  pokeball: [
    { name:'כדור פוקי',    desc:'כדור לכידה בסיסי',      price:200,  iconColor:'#e85858', iconType:'ball' },
    { name:'סופר כדור',    desc:'כדור לכידה משופר',       price:600,  iconColor:'#5080ff', iconType:'ball' },
    { name:'אולטרה כדור',  desc:'כדור לכידה מתקדם',      price:1200, iconColor:'#f8d030', iconType:'ball' },
  ],
  battle: [
    { name:'הגנה X',       desc:'מעלה הגנה בקרב',        price:500,  iconColor:'#6890f0', iconType:'bottle' },
    { name:'התקפה X',      desc:'מעלה התקפה בקרב',       price:500,  iconColor:'#f08030', iconType:'bottle' },
    { name:'מהירות X',     desc:'מעלה מהירות בקרב',      price:350,  iconColor:'#f85888', iconType:'bottle' },
  ],
  vitamin: [
    { name:'HP Up',        desc:'מעלה HP בסיס',          price:9800, iconColor:'#20d860', iconType:'bottle' },
    { name:'חלבון',        desc:'מעלה התקפה בסיס',       price:9800, iconColor:'#f08030', iconType:'bottle' },
    { name:'ברזל',         desc:'מעלה הגנה בסיס',        price:9800, iconColor:'#6890f0', iconType:'bottle' },
  ],
};

// === ITEM RENDERING ===
function drawShopItem(ctx, cardY, item, playerMoney, ownedCount, isSelected) {
  const canAfford = playerMoney >= item.price;

  // Card background
  ctx.fillStyle = isSelected ? '#1a3a2a' : '#0f2a1a';
  fillRoundRect(ctx, 4, cardY, 232, 23, 2);
  ctx.strokeStyle = isSelected ? '#2a6a40' : '#1a4a30';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, 4, cardY, 232, 23, 2);

  // Selection bar
  if (isSelected) {
    ctx.fillStyle = '#20d860';
    ctx.fillRect(4, cardY, 2, 23);
  }

  // Icon
  drawItemIcon(ctx, item.iconType || 'potion', item.iconColor, 214, cardY + 2);

  // Name
  ctx.fillStyle = canAfford ? '#ffffff' : '#667766';
  ctx.font = '7px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(item.name, 210, cardY + 10);

  // Description
  ctx.fillStyle = isSelected ? '#667766' : '#445544';
  if (!canAfford) ctx.fillStyle = '#334433';
  ctx.font = '5px monospace';
  ctx.fillText(item.desc, 210, cardY + 18);

  // Owned count
  ctx.fillStyle = '#3a4a3a';
  ctx.font = '5px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('ברשותך: ', 210, cardY + 23);
  ctx.fillStyle = '#7a9a85';
  ctx.textAlign = 'left';
  // (position after "ברשותך: " — dynamic based on text width)

  // Price
  ctx.fillStyle = canAfford ? '#f8d030' : '#5a4a2a';
  ctx.textAlign = 'left';
  ctx.font = 'bold 6px monospace';
  ctx.fillText('₪', 8, cardY + 10);
  ctx.font = '8px monospace';
  ctx.fillText(String(item.price), 14, cardY + 9);

  // Buy button (selected only)
  if (isSelected) {
    ctx.fillStyle = canAfford ? '#1a5a35' : '#1a2a1a';
    fillRoundRect(ctx, 8, cardY + 12, 28, 8, 2);
    ctx.strokeStyle = canAfford ? '#2a6a40' : '#2a3a2a';
    strokeRoundRect(ctx, 8, cardY + 12, 28, 8, 2);
    ctx.fillStyle = canAfford ? '#20d860' : '#334433';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('קנייה', 22, cardY + 18);
  }
}

// === ICON DRAWING (inside 16×16 box at iconX, iconY) ===
function drawItemIcon(ctx, type, color, ix, iy) {
  // Box background
  ctx.fillStyle = hexToRGBA(color, 0.1);
  fillRoundRect(ctx, ix, iy, 16, 16, 3);
  ctx.strokeStyle = hexToRGBA(color, 0.3);
  strokeRoundRect(ctx, ix, iy, 16, 16, 3);

  switch(type) {
    case 'potion':
    default:
      // Bottle cap
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      fillRoundRect(ctx, ix + 5, iy - 1, 6, 3, 1);
      ctx.globalAlpha = 1;
      // Bottle body
      ctx.fillStyle = hexToRGBA(color, 0.15);
      fillRoundRect(ctx, ix + 4, iy + 2, 8, 10, [1,1,3,3]);
      ctx.strokeStyle = hexToRGBA(color, 0.4);
      strokeRoundRect(ctx, ix + 4, iy + 2, 8, 10, [1,1,3,3]);
      break;
    case 'cross':
      // Circle with cross
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(ix + 7, iy + 3, 2, 8);  // vert
      ctx.fillRect(ix + 4, iy + 6, 8, 2);  // horiz
      ctx.globalAlpha = 1;
      break;
    case 'capsule':
      // Pill shape
      ctx.fillStyle = hexToRGBA(color, 0.2);
      fillRoundRect(ctx, ix + 5, iy + 2, 6, 12, 3);
      ctx.strokeStyle = hexToRGBA(color, 0.4);
      strokeRoundRect(ctx, ix + 5, iy + 2, 6, 12, 3);
      break;
    case 'diamond':
      // Diamond/crystal
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      // rotated square approximation
      ctx.fillRect(ix + 5, iy + 4, 6, 6);
      ctx.globalAlpha = 1;
      break;
    case 'ball':
      // Pokeball
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      // circle
      ctx.beginPath();
      ctx.arc(ix + 8, iy + 8, 6, 0, Math.PI * 2);
      ctx.stroke();
      // horizontal line
      ctx.fillStyle = color;
      ctx.fillRect(ix + 2, iy + 7, 12, 2);
      // center dot
      ctx.fillRect(ix + 7, iy + 7, 2, 2);
      break;
    case 'bottle':
      // Generic battle item bottle
      ctx.fillStyle = hexToRGBA(color, 0.15);
      fillRoundRect(ctx, ix + 4, iy + 2, 8, 12, 2);
      ctx.strokeStyle = hexToRGBA(color, 0.4);
      strokeRoundRect(ctx, ix + 4, iy + 2, 8, 12, 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(ix + 6, iy + 1, 4, 2);
      ctx.globalAlpha = 1;
      break;
  }
}

// === NAVIGATION STATE ===
// selectedCategory: 0..5 (index into CATEGORIES)
// selectedItem: 0..N-1 (index in current category)
// scrollOffset: 0..max(0, items.length - 5)
//
// ◀▶ or Tab: cycle category
// ▲▼: move selectedItem up/down, auto-scroll
// Enter: buy selected item (if can afford)
// ESC: exit shop
```
