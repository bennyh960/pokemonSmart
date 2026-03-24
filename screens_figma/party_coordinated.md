# Pokemon RPG Canvas Coordinates — Party Screen (קבוצה) 240×160

## Design Notes
- 6 party slots: slot 1 is a **filled slot** (h=24, shows pokemon details), slots 2-6 are **empty slots** (h=18)
- Filled slots show: sprite, name, level, type badges, HP bar + value
- Empty slots show: slot number + "— — —" centered
- Selected slot gets green left-bar (#20d860), brighter border (#2a6a40), bg=#1a3a2a
- Unselected filled slots use standard card bg (#0f2a1a, border #1a4a30)
- HP bar color changes: >=50% = #20d860, 25-49% = #d8a020, <25% = #d84040

---

## SCREEN: PARTY (קבוצה)

### Title Bar (y=0, h=12)

| Element          |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text   | align  |
|------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|--------|--------|
| Title bar bg     |   0 |  0 | 240 | 12 |        — | —       | #0a1a10 | —           | —      | —      |
| Title text       |  12 |  2 | 100 | — |       10 | #ffffff | —       | —           | קבוצה  | right  |
| Party count      | 200 |  4 |  — | — |        6 | #445544 | —       | —           | 1 / 6  | left   |

### Slot Layout Overview

| Slot | Type   | y   | h  | stride (to next) |
|------|--------|----:|---:|------------------:|
| 1    | filled |  14 | 24 |                26 |
| 2    | empty  |  40 | 18 |                20 |
| 3    | empty  |  60 | 18 |                20 |
| 4    | empty  |  80 | 18 |                20 |
| 5    | empty  | 100 | 18 |                20 |
| 6    | empty  | 120 | 18 |                — |

**General formula:**
- Slot 1 (filled): y = 14, h = 24
- Slots 2-6 (empty): y = 14 + 24 + 2 + (slotIndex - 2) × 20, h = 18
- Or simply: slot2.y=40, slot3.y=60, slot4.y=80, slot5.y=100, slot6.y=120

### Filled Slot Template (h=24, used when Pokemon present)

| Sub-element       | x    | relY |   w |  h | fontSize | color   | bgColor          | notes                              |
|-------------------|-----:|-----:|----:|---:|---------:|---------|------------------|------------------------------------|
| Card bg           |    4 |    0 | 232 | 24 |        — | —       | #0f2a1a          | border 1px #1a4a30, radius=3       |
| Card bg (selected)|    4 |    0 | 232 | 24 |        — | —       | #1a3a2a          | border 1px #2a6a40, radius=3       |
| Select indicator  |    4 |    0 |   2 | 24 |        — | —       | #20d860          | only when selected, radius=1 0 0 1 |
| Slot num box      |  222 |   +1 |  10 | 10 |        — | —       | rgba(255,255,255,0.03) | selected: rgba(32,216,96,0.15) |
| Slot num text     |  222 |   +2 |  10 | — |        6 | #2a3a2a | —                | selected: #20d860                  |
| Sprite box        |  194 |   +1 |  22 | 22 |        — | —       | #0f2a1a          | border 1px #1a4a30, radius=3       |
| Sprite area       |  196 |   +3 |  18 | 18 |        — | —       | —                | draw sprite here                   |
| Pokemon name      |   90 |   +2 | 100 | — |        7 | #ffffff | —                | align=right, direction=rtl         |
| Level text        |   68 |   +2 |  20 | — |        6 | #667766 | —                | align=center, "Lv.X"              |
| Type badge 1 bg   |  162 |  +12 |  18 |  7 |        — | —       | (type color)     | radius=2                           |
| Type badge 1 text |  162 |  +12 |  18 | — |        5 | #ffffff | —                | align=center                       |
| Type badge 2 bg   |  142 |  +12 |  18 |  7 |        — | —       | (type color)     | radius=2                           |
| Type badge 2 text |  142 |  +12 |  18 | — |        5 | #ffffff | —                | align=center                       |
| HP label          |   86 |  +12 |  — | — |        5 | #667766 | —                | "HP"                               |
| HP bar track      |   26 |  +14 |  56 |  3 |        — | —       | #1a3a2a          | radius=1                           |
| HP bar fill       |   26 |  +14 |  * |  3 |        — | —       | #20d860          | w = (curHP/maxHP) × 56             |
| HP value text     |    8 |  +12 |  — | — |        5 | #aaccaa | —                | "19/19", align=left, dir=ltr       |

### Filled Slot — Absolute Y for Slot 1 (cardY=14)

| Sub-element      | x   | y   |
|------------------|----:|----:|
| Card bg          |   4 |  14 |
| Select indicator |   4 |  14 |
| Slot num box     | 222 |  15 |
| Slot num text    | 222 |  16 |
| Sprite box       | 194 |  15 |
| Sprite area      | 196 |  17 |
| Pokemon name     |  90 |  16 |
| Level text       |  68 |  16 |
| Type badge 1 bg  | 162 |  26 |
| Type badge 1 txt | 162 |  26 |
| Type badge 2 bg  | 142 |  26 |
| Type badge 2 txt | 142 |  26 |
| HP label         |  86 |  26 |
| HP bar track     |  26 |  28 |
| HP bar fill      |  26 |  28 |
| HP value         |   8 |  26 |

### Empty Slot Template (h=18, used when no Pokemon)

| Sub-element       | x    | relY |   w |  h | fontSize | color          | bgColor              | notes                  |
|-------------------|-----:|-----:|----:|---:|---------:|----------------|----------------------|------------------------|
| Card bg           |    4 |    0 | 232 | 18 |        — | —              | #0f2a1a              | border 1px #1a4a30     |
| Card bg (selected)|    4 |    0 | 232 | 18 |        — | —              | #1a3a2a              | border 1px #2a6a40     |
| Select indicator  |    4 |    0 |   2 | 18 |        — | —              | #20d860              | only when selected     |
| Slot num box      |  222 |   +2 |  10 | 10 |        — | —              | rgba(255,255,255,0.03)| radius=3               |
| Slot num text     |  222 |   +3 |  10 | — |        6 | #2a3a2a        | —                    | center                 |
| Empty label       |    8 |   +6 | 208 | — |        7 | #2a3a2a        | —                    | "— — —", center        |

### Empty Slots — Absolute Y Positions

| Slot | cardY | numBox.y | numTxt.y | label.y |
|------|------:|---------:|---------:|--------:|
| 2    |    40 |       42 |       43 |      46 |
| 3    |    60 |       62 |       63 |      66 |
| 4    |    80 |       82 |       83 |      86 |
| 5    |   100 |      102 |      103 |     106 |
| 6    |   120 |      122 |      123 |     126 |

### Bottom Bar (y=150, h=10)

| Element          |   x |   y |   w |  h | fontSize | color   | bgColor | borderColor | text   | align  |
|------------------|----:|----:|----:|---:|---------:|---------|---------|-------------|--------|--------|
| Bar background   |   0 | 150 | 240 | 10 |        — | —       | #0a1a10 | —           | —      | —      |
| ESC pill bg      |   8 | 151 |  20 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| ESC pill text    |   8 | 152 |  20 | — |        6 | #aaccaa | —       | —           | ESC    | center |
| ESC hint text    |  30 | 153 |  — | — |        6 | #667766 | —       | —           | חזרה   | left   |
| Enter pill bg    |  62 | 151 |  26 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| Enter pill text  |  62 | 152 |  26 | — |        6 | #aaccaa | —       | —           | Enter  | center |
| Enter hint text  |  90 | 153 |  — | — |        6 | #667766 | —       | —           | פרטים  | left   |
| ▲▼ pill bg       | 126 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| ▲▼ pill text     | 126 | 152 |  18 | — |        6 | #aaccaa | —       | —           | ▲▼     | center |
| ▲▼ hint text     | 146 | 153 |  — | — |        6 | #667766 | —       | —           | ניווט  | left   |

---

## CANVAS HELPER — Quick Reference Constants

```javascript
// === PARTY SCREEN LAYOUT CONSTANTS ===
const P = {
  // Title bar
  TITLE_BAR:    { x:0,   y:0,  w:240, h:12 },
  TITLE_TEXT:   { x:112, y:8,  fs:10 },           // right anchor at x=12+100
  PARTY_COUNT:  { x:200, y:10, fs:6  },           // left anchor, "{n} / 6"

  // Slot geometry
  SLOT_X:        4,
  SLOT_W:        232,
  FILLED_H:      24,
  EMPTY_H:       18,
  FILLED_Y0:     14,    // first filled slot y
  EMPTY_Y0:      40,    // first empty slot y (if slot 1 filled)
  EMPTY_STRIDE:  20,    // 18 + 2px gap

  // Compute slot Y dynamically:
  // For a party of N pokemon:
  //   filled slots: y = 14 + i * (FILLED_H + 2), i = 0..N-1
  //   empty slots start after last filled
  //   But in practice only 1 mon, so hardcode:
  SLOT_YS: [14, 40, 60, 80, 100, 120],
  SLOT_HS: [24, 18, 18, 18, 18, 18],  // first is filled, rest empty

  // === Filled slot offsets (from cardY) ===
  SEL_BAR_W:     2,

  // Slot number
  NUM_BOX:       { dx:218, dy:1, w:10, h:10 },   // x = slotX + dx = 222
  NUM_TXT_DY:    2,                                // text y = numBox.y + 1

  // Sprite
  SPRITE_BOX:    { dx:190, dy:1, w:22, h:22 },   // x = slotX + dx = 194
  SPRITE_AREA:   { dx:192, dy:3, w:18, h:18 },   // x = 196

  // Name + Level
  NAME:          { dx:86, dy:2, w:100, fs:7 },    // x = 90, align=right
  LEVEL:         { dx:64, dy:2, w:20,  fs:6 },    // x = 68, align=center

  // Type badges (row below name)
  BADGE1:        { dx:158, dy:12, w:18, h:7 },    // x = 162
  BADGE2:        { dx:138, dy:12, w:18, h:7 },    // x = 142
  BADGE_FS:      5,

  // HP
  HP_LABEL:      { dx:82, dy:12, fs:5 },          // x = 86
  HP_BAR_TRACK:  { dx:22, dy:14, w:56, h:3 },     // x = 26
  HP_BAR_MAX_W:  56,
  HP_VALUE:      { dx:4,  dy:12, fs:5 },          // x = 8, "19/19"

  // === Empty slot offsets (from cardY) ===
  EMPTY_NUM_DY:  2,
  EMPTY_LABEL_DY: 6,

  // Bottom bar (identical to other screens)
  BTM_BAR:       { x:0, y:150, w:240, h:10 },
  BTM_KEYS: [
    { pillX:8,   pillW:20, pillText:'ESC',   hintX:30,  hintText:'חזרה'  },
    { pillX:62,  pillW:26, pillText:'Enter', hintX:90,  hintText:'פרטים' },
    { pillX:126, pillW:18, pillText:'▲▼',    hintX:146, hintText:'ניווט' },
  ],
  BTM_PILL_Y:    151,
  BTM_PILL_H:    8,
  BTM_TEXT_Y:    152,
  BTM_HINT_Y:    153,
};

// === HP BAR COLOR LOGIC ===
function getHPBarColor(curHP, maxHP) {
  const ratio = curHP / maxHP;
  if (ratio >= 0.5) return '#20d860';  // green
  if (ratio >= 0.25) return '#d8a020'; // yellow
  return '#d84040';                     // red
}

// === RENDER HELPERS ===

// Draw a filled pokemon slot
function drawFilledSlot(ctx, slotY, pokemon, isSelected) {
  const sx = P.SLOT_X;
  const sw = P.SLOT_W;
  const sh = P.FILLED_H;

  // Card bg
  ctx.fillStyle = isSelected ? '#1a3a2a' : '#0f2a1a';
  fillRoundRect(ctx, sx, slotY, sw, sh, 3);
  ctx.strokeStyle = isSelected ? '#2a6a40' : '#1a4a30';
  strokeRoundRect(ctx, sx, slotY, sw, sh, 3);

  // Selection indicator
  if (isSelected) {
    ctx.fillStyle = '#20d860';
    ctx.fillRect(sx, slotY, 2, sh);
  }

  // Slot number
  const numX = 222, numY = slotY + 1;
  ctx.fillStyle = isSelected ? 'rgba(32,216,96,0.15)' : 'rgba(255,255,255,0.03)';
  fillRoundRect(ctx, numX, numY, 10, 10, 3);
  ctx.fillStyle = isSelected ? '#20d860' : '#2a3a2a';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(pokemon.slotNum, numX + 5, numY + 7);

  // Sprite box
  ctx.fillStyle = '#0f2a1a';
  fillRoundRect(ctx, 194, slotY + 1, 22, 22, 3);
  ctx.strokeStyle = '#1a4a30';
  strokeRoundRect(ctx, 194, slotY + 1, 22, 22, 3);
  // Draw sprite at (196, slotY+3, 18x18)

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '7px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(pokemon.name, 190, slotY + 9);

  // Level
  ctx.fillStyle = '#667766';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Lv.' + pokemon.level, 78, slotY + 9);

  // Type badges
  pokemon.types.forEach((type, i) => {
    const bx = i === 0 ? 162 : 142;
    const by = slotY + 12;
    ctx.fillStyle = TYPE_CLR[type.id];
    fillRoundRect(ctx, bx, by, 18, 7, 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(type.nameHe, bx + 9, by + 5);
  });

  // HP
  ctx.fillStyle = '#667766';
  ctx.font = '5px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HP', 86, slotY + 18);

  // HP bar
  const barY = slotY + 14;
  ctx.fillStyle = '#1a3a2a';
  fillRoundRect(ctx, 26, barY, 56, 3, 1);
  const hpW = Math.round((pokemon.curHP / pokemon.maxHP) * 56);
  ctx.fillStyle = getHPBarColor(pokemon.curHP, pokemon.maxHP);
  fillRoundRect(ctx, 26, barY, hpW, 3, 1);

  // HP value
  ctx.fillStyle = '#aaccaa';
  ctx.font = '5px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(pokemon.curHP + '/' + pokemon.maxHP, 8, slotY + 18);
}

// Draw an empty slot
function drawEmptySlot(ctx, slotY, slotNum, isSelected) {
  const sx = P.SLOT_X;
  const sw = P.SLOT_W;
  const sh = P.EMPTY_H;

  ctx.fillStyle = isSelected ? '#1a3a2a' : '#0f2a1a';
  fillRoundRect(ctx, sx, slotY, sw, sh, 2);
  ctx.strokeStyle = isSelected ? '#2a6a40' : '#1a4a30';
  strokeRoundRect(ctx, sx, slotY, sw, sh, 2);

  if (isSelected) {
    ctx.fillStyle = '#20d860';
    ctx.fillRect(sx, slotY, 2, sh);
  }

  // Slot number
  const numX = 222, numY = slotY + 2;
  ctx.fillStyle = isSelected ? 'rgba(32,216,96,0.15)' : 'rgba(255,255,255,0.03)';
  fillRoundRect(ctx, numX, numY, 10, 10, 3);
  ctx.fillStyle = isSelected ? '#20d860' : '#2a3a2a';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(slotNum), numX + 5, numY + 7);

  // Empty label
  ctx.fillStyle = '#2a3a2a';
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('— — —', 112, slotY + 12);
}
```
