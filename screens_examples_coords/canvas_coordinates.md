# Pokemon RPG Canvas Coordinates — 240×160

## Notes for Canvas Implementation
- All `x,y` values are the TOP-LEFT corner of the element
- For Hebrew text: use `ctx.textAlign = "right"` and anchor at `x + width`
- For centered text: use `ctx.textAlign = "center"` and anchor at `x + width/2`
- For LTR text (numbers, ESC, Tab): use `ctx.textAlign = "left"` at `x`
- Bar fill width formula: `(statValue / maxStat) * maxBarWidth` where maxStat ≈ 150, maxBarWidth = 124
- All fonts: monospace
- All border-radius values are for reference — use fillRoundRect helper in canvas

---

## SCREEN 1: STATS TAB (סטטיסטיקות)

### Tab Bar

| Element              |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text          | align  |
|----------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|---------------|--------|
| Tab container bg     |  44 |  2 | 152 | 10 |        — | —       | #0a2a1a | #1a4a30     | —             | —      |
| Active pill bg       | 118 |  2 |  76 | 10 |        — | —       | #1a5a35 | #1a4a30     | —             | —      |
| Active pill text     | 118 |  3 |  76 | — |        7 | #ffffff | —       | —           | סטטיסטיקות    | center |
| Inactive pill text   |  46 |  3 |  70 | — |        7 | #667766 | —       | —           | מהלכים        | center |

### Pokemon Info Section

| Element              |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text                          | align  |
|----------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|-------------------------------|--------|
| Sprite container     | 184 | 18 |  44 | 44 |        — | —       | #0a2a1a | #1a4a30     | —                             | —      |
| Sprite area          | 186 | 20 |  40 | 40 |        — | —       | #0d1a14 | —           | (draw sprite here)            | —      |
| Pokemon name         |  12 | 22 | 168 | — |       10 | #ffffff | —       | —           | בולבזאור                      | center |
| Level                |  12 | 34 | 168 | — |        7 | #667766 | —       | —           | רמה 5                         | center |
| Type badge: Grass bg | 104 | 44 |  28 |  9 |        — | —       | #78c850 | —           | —                             | —      |
| Type badge: Grass tx | 104 | 45 |  28 | — |        7 | #ffffff | —       | —           | דשא                           | center |
| Type badge: Poison bg|  62 | 44 |  28 |  9 |        — | —       | #a040a0 | —           | —                             | —      |
| Type badge: Poison tx|  62 | 45 |  28 | — |        7 | #ffffff | —       | —           | רעל                           | center |
| Physical info        |  12 | 56 | 168 | — |        6 | #667766 | —       | —           | גובה: 0.7 מ'  ·  משקל: 6.9 ק"ג | center |

### HP / XP Section

| Element              |   x |  y |   w |  h | fontSize | color   | bgColor | text     | align  |
|----------------------|----:|---:|----:|---:|---------:|---------|---------|----------|--------|
| Separator line       |   8 | 64 | 224 |  1 |        — | —       | #1a3a2a | —        | —      |
| HP label             | 204 | 68 |  — | — |        7 | #aaccaa | —       | HP       | right  |
| HP value             |  12 | 67 |  — | — |       10 | #ffffff | —       | 19       | left   |
| HP fraction          |  — | 67 |  — | — |        7 | #667766 | —       | / 19     | left   |
| HP bar track         |  12 | 78 | 216 |  3 |        — | —       | #1a3a2a | —        | —      |
| HP bar fill          |  12 | 78 | 216 |  3 |        — | —       | #20d860 | —        | —      |
| XP label             | 186 | 84 |  42 | — |        6 | #445544 | —       | ניסיון   | right  |
| XP value             |  12 | 84 |  — | — |        6 | #445544 | —       | 0 / 500  | left   |
| Separator line       |   8 | 91 | 224 |  1 |        — | —       | #1a3a2a | —        | —      |

### Base Stats Section

| Element                |   x |   y |   w |  h | fontSize | color   | bgColor | text           | align  |
|------------------------|----:|----:|----:|---:|---------:|---------|---------|----------------|--------|
| Section header         |  12 |  94 | 216 | — |        7 | #667766 | —       | נתונים בסיסיים | right  |

#### Stat Rows (repeating pattern, 8px vertical spacing)

| Stat        | nameX | nameY | nameW | valX | valY | valW | barX | barY | trackW | fillW | fillColor |
|-------------|------:|------:|------:|-----:|-----:|-----:|-----:|-----:|-------:|------:|-----------|
| נק' חיים    |   170 |   103 |    58 |  142 |  103 |   24 |   12 |  105 |    124 |    18 | #20d860   |
| התקפה       |   170 |   111 |    58 |  142 |  111 |   24 |   12 |  113 |    124 |     9 | #f08030   |
| הגנה        |   170 |   119 |    58 |  142 |  119 |   24 |   12 |  121 |    124 |     9 | #6890f0   |
| הת. מיוחדת  |   170 |   127 |    58 |  142 |  127 |   24 |   12 |  129 |    124 |    11 | #a040a0   |
| הג. מיוחדת  |   170 |   135 |    58 |  142 |  135 |   24 |   12 |  137 |    124 |    11 | #f8d030   |
| מהירות      |   170 |   143 |    58 |  142 |  143 |   24 |   12 |  145 |    124 |     9 | #f85888   |

Stat name: fontSize=7, color=#aaccaa, align=right
Stat value: fontSize=7, color=#ffffff, align=center
Bar track: height=3, color=#1a3a2a, border-radius=1
Bar fill: height=3, border-radius=1

**Bar width formula:** `fillWidth = Math.round((statValue / 150) * 124)`
- 19 → 18px, 9 → 9px, 11 → 11px (approximate for Lv.5 Bulbasaur)

### Bottom Bar

| Element          |   x |   y |  w |  h | fontSize | color   | bgColor | borderColor | text  | align  |
|------------------|----:|----:|---:|---:|---------:|---------|---------|-------------|-------|--------|
| Bar background   |   0 | 150 | 240 | 10 |        — | —       | #0a1a10 | —           | —     | —      |
| ESC pill bg      |   8 | 151 |  20 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| ESC pill text    |   8 | 152 |  20 | — |        6 | #aaccaa | —       | —           | ESC   | center |
| ESC hint text    |  30 | 153 |  — | — |        6 | #667766 | —       | —           | חזרה  | left   |
| Tab pill bg      |  62 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| Tab pill text    |  62 | 152 |  18 | — |        6 | #aaccaa | —       | —           | Tab   | center |
| Tab hint text    |  82 | 153 |  — | — |        6 | #667766 | —       | —           | מעבר  | left   |

---

## SCREEN 2: MOVES TAB (מהלכים)

### Tab Bar

| Element              |   x |  y |   w |  h | fontSize | color   | bgColor | borderColor | text          | align  |
|----------------------|----:|---:|----:|---:|---------:|---------|---------|-------------|---------------|--------|
| Tab container bg     |  44 |  2 | 152 | 10 |        — | —       | #0a2a1a | #1a4a30     | —             | —      |
| Active pill bg       |  46 |  2 |  70 | 10 |        — | —       | #1a5a35 | #1a4a30     | —             | —      |
| Active pill text     |  46 |  3 |  70 | — |        7 | #ffffff | —       | —           | מהלכים        | center |
| Inactive pill text   | 118 |  3 |  76 | — |        7 | #667766 | —       | —           | סטטיסטיקות    | center |

### Sub-Header

| Element              |   x |  y |   w |  h | fontSize | color   | text           | align |
|----------------------|----:|---:|----:|---:|---------:|---------|----------------|-------|
| List title           |  12 | 16 | 216 | — |        7 | #667766 | רשימת מהלכים   | right |
| Move count           |  12 | 16 |  — | — |        6 | #445544 | 8 מהלכים       | left  |

### Move Cards (8 cards, each 14px tall, 1px gap)

**Card template — every card follows this layout:**

| Sub-element      | relX | relY | w   | h  | fontSize | notes                                    |
|------------------|-----:|-----:|----:|---:|---------:|------------------------------------------|
| Card bg          |    4 |    — | 232 | 14 |        — | bg=#0f2a1a, border=1px #1a4a30, radius=2 |
| Class dot        |  221 |   +4 |   5 |  5 |        — | Physical=#f08030, Status=#6890f0, Special=#a040a0 |
| Move name        |  120 |   +1 |  98 | — |        7 | color=#ffffff, align=right, direction=rtl |
| Type badge bg    |   93 |   +2 |  22 |  7 |        — | color per type (see palette)             |
| Type badge text  |   93 |   +2 |  22 | — |        5 | color=#ffffff, align=center               |
| Sub-stats        |  120 |   +9 |  98 | — |        5 | color=#445544, align=right, direction=rtl |
| PP text          |    8 |   +2 |  — | — |        6 | color=#aaccaa, align=left                |
| PP bar track     |    8 |  +10 |  30 |  2 |        — | color=#1a3a2a                             |
| PP bar fill      |    8 |  +10 |  30 |  2 |        — | color=#20a0d8, width proportional to PP   |

**Card Y positions and data:**

| # | cardY | Name        | Type    | typeBg  | Class   | classDotColor | Power | Acc | PP    | subStatsText            |
|---|------:|-------------|---------|---------|---------|---------------|------:|----:|-------|-------------------------|
| 1 |    26 | התנגשות     | רגיל    | #a8a878 | physical| #f08030       |    40 | 100 | 35/35 | דיוק: 100  כוח: 40     |
| 2 |    41 | מכת גפן     | דשא     | #78c850 | physical| #f08030       |    45 | 100 | 25/25 | דיוק: 100  כוח: 45     |
| 3 |    56 | נהמה        | רגיל    | #a8a878 | status  | #6890f0       |     — | 100 | 40/40 | דיוק: 100  כוח: —      |
| 4 |    71 | שאיבת זרע   | דשא     | #78c850 | status  | #6890f0       |     — |  90 | 10/10 | דיוק: 90  כוח: —       |
| 5 |    86 | אבקת רעל    | רעל     | #a040a0 | status  | #6890f0       |     — |  75 | 35/35 | דיוק: 75  כוח: —       |
| 6 |   101 | עלה תער     | דשא     | #78c850 | physical| #f08030       |    55 |  95 | 25/25 | דיוק: 95  כוח: 55      |
| 7 |   116 | ניקוז מגה   | דשא     | #78c850 | special | #a040a0       |    40 | 100 | 15/15 | דיוק: 100  כוח: 40     |
| 8 |   131 | הסתערות     | רגיל    | #a8a878 | physical| #f08030       |    90 |  85 | 20/20 | דיוק: 85  כוח: 90      |

**Absolute Y for each sub-element (per card):**

| # | cardBg.y | dot.y | name.y | badge.y | sub.y | pp.y | ppBar.y |
|---|----------|-------|--------|---------|-------|------|---------|
| 1 |       26 |    30 |     27 |      28 |    35 |   28 |      36 |
| 2 |       41 |    45 |     42 |      43 |    50 |   43 |      51 |
| 3 |       56 |    60 |     57 |      58 |    65 |   58 |      66 |
| 4 |       71 |    75 |     72 |      73 |    80 |   73 |      81 |
| 5 |       86 |    90 |     87 |      88 |    95 |   88 |      96 |
| 6 |      101 |   105 |    102 |     103 |   110 |  103 |     111 |
| 7 |      116 |   120 |    117 |     118 |   125 |  118 |     126 |
| 8 |      131 |   135 |    132 |     133 |   140 |  133 |     141 |

### Bottom Bar

| Element          |   x |   y |  w |  h | fontSize | color   | bgColor | borderColor | text   | align  |
|------------------|----:|----:|---:|---:|---------:|---------|---------|-------------|--------|--------|
| Bar background   |   0 | 150 | 240 | 10 |        — | —       | #0a1a10 | —           | —      | —      |
| ESC pill bg      |   8 | 151 |  20 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| ESC pill text    |   8 | 152 |  20 | — |        6 | #aaccaa | —       | —           | ESC    | center |
| ESC hint text    |  30 | 153 |  — | — |        6 | #667766 | —       | —           | חזרה   | left   |
| Tab pill bg      |  62 | 151 |  18 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| Tab pill text    |  62 | 152 |  18 | — |        6 | #aaccaa | —       | —           | Tab    | center |
| Tab hint text    |  82 | 153 |  — | — |        6 | #667766 | —       | —           | מעבר   | left   |
| Enter pill bg    | 114 | 151 |  26 |  8 |        — | —       | #1a3a2a | #2a5a3a     | —      | —      |
| Enter pill text  | 114 | 152 |  26 | — |        6 | #aaccaa | —       | —           | Enter  | center |
| Enter hint text  | 142 | 153 |  — | — |        6 | #667766 | —       | —           | פעולה  | left   |

---

## CANVAS HELPER — Quick Reference Constants

```javascript
// === COLORS ===
const C = {
  BG:         '#0d1a14',
  CARD_BG:    '#0f2a1a',
  CARD_SEL:   '#1a3a2a',
  BORDER:     '#1a4a30',
  SEP:        '#1a3a2a',
  TEXT_PRI:   '#ffffff',
  TEXT_SEC:   '#aaccaa',
  TEXT_MUT:   '#667766',
  TEXT_DIM:   '#445544',
  BAR_HP:     '#20d860',
  BAR_TRACK:  '#1a3a2a',
  BAR_XP:     '#5080ff',
  BAR_PP:     '#20a0d8',
  TAB_BG:     '#0a2a1a',
  TAB_ACT:    '#1a5a35',
  BTM_BG:     '#0a1a10',
  KEY_BG:     '#1a3a2a',
  KEY_BRD:    '#2a5a3a',
};

// === TYPE COLORS ===
const TYPE_CLR = {
  normal:   '#a8a878',
  grass:    '#78c850',
  poison:   '#a040a0',
  fire:     '#f08030',
  water:    '#6890f0',
  electric: '#f8d030',
};

// === STAT BAR COLORS ===
const STAT_CLR = {
  hp:    '#20d860',
  atk:   '#f08030',
  def:   '#6890f0',
  spa:   '#a040a0',
  spd:   '#f8d030',
  spe:   '#f85888',
};

// === DAMAGE CLASS DOT COLORS ===
const CLASS_CLR = {
  physical: '#f08030',
  status:   '#6890f0',
  special:  '#a040a0',
};

// === LAYOUT CONSTANTS — STATS SCREEN ===
const S = {
  // Tab bar
  TAB_CONT:   { x:44,  y:2,  w:152, h:10 },
  TAB_RIGHT:  { x:118, y:2,  w:76,  h:10 },  // active on stats
  TAB_LEFT:   { x:46,  y:2,  w:70,  h:10 },
  TAB_R_TXT:  { x:156, y:9,  fs:7 },          // center anchor
  TAB_L_TXT:  { x:81,  y:9,  fs:7 },          // center anchor

  // Pokemon info
  SPRITE_BOX: { x:184, y:18, w:44, h:44 },
  SPRITE:     { x:186, y:20, w:40, h:40 },
  NAME:       { x:96,  y:28, fs:10 },          // center of 168px area
  LEVEL:      { x:96,  y:40, fs:7 },           // center
  BADGE_GRS:  { x:104, y:44, w:28, h:9 },
  BADGE_PSN:  { x:62,  y:44, w:28, h:9 },
  BADGE_TXT_GRS: { x:118, y:50, fs:7 },        // center anchor
  BADGE_TXT_PSN: { x:76,  y:50, fs:7 },        // center anchor
  PHYS_INFO:  { x:96,  y:62, fs:6 },           // center

  // HP
  SEP1:       { x:8,   y:64, w:224, h:1 },
  HP_LABEL:   { x:228, y:74, fs:7 },           // right anchor
  HP_VAL:     { x:12,  y:73, fs:10 },          // left anchor
  HP_FRAC:    { x:30,  y:73, fs:7 },           // left anchor, after "19"
  HP_TRACK:   { x:12,  y:78, w:216, h:3 },
  HP_FILL:    { x:12,  y:78, w:216, h:3 },     // w = (curHP/maxHP)*216

  // XP
  XP_LABEL:   { x:228, y:90, fs:6 },           // right anchor
  XP_VAL:     { x:12,  y:90, fs:6 },           // left anchor

  // Stats
  SEP2:       { x:8,   y:91, w:224, h:1 },
  STAT_HDR:   { x:228, y:100, fs:7 },          // right anchor
  // Each stat row: [nameX=228(right), valX=154(center), barX=12, barY]
  STAT_ROWS_Y: [103, 111, 119, 127, 135, 143],
  STAT_NAME_X: 228,   // right anchor
  STAT_VAL_X:  154,   // center anchor of 24px zone
  STAT_BAR_X:  12,
  STAT_BAR_W:  124,
  STAT_BAR_H:  3,
  STAT_BAR_DY: 2,     // bar is 2px below text y

  // Bottom
  BTM_BAR:    { x:0,  y:150, w:240, h:10 },
};

// === LAYOUT CONSTANTS — MOVES SCREEN ===
const M = {
  // Sub-header
  LIST_TITLE: { x:228, y:22, fs:7 },           // right anchor
  MOVE_COUNT: { x:12,  y:22, fs:6 },           // left anchor

  // Card template
  CARD_X: 4,
  CARD_W: 232,
  CARD_H: 14,
  CARD_STRIDE: 15,    // 14 + 1px gap
  CARD_Y0: 26,        // first card y
  // offsets from card top:
  DOT_DX: 217,  DOT_DY: 4,  DOT_SZ: 5,
  NAME_DX: 120, NAME_DY: 1, NAME_W: 98,
  BADGE_DX: 93, BADGE_DY: 2, BADGE_W: 22, BADGE_H: 7,
  SUB_DX: 120,  SUB_DY: 9,  SUB_W: 98,
  PP_DX: 8,     PP_DY: 2,
  PPBAR_DX: 8,  PPBAR_DY: 10, PPBAR_W: 30, PPBAR_H: 2,
};
```
