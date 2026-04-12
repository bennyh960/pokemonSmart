# Pokemon RPG Canvas Coordinates — Battle Screen v2 (מסך קרב) 240×160

## Screen Layout Overview

```
┌──────────────────────────────────────────────────┐ y=0
│           ┌──────┐                                │
│           │תור 3 │   ┌────────────────┐           │
│           └──────┘   │ סולגליאו Lv.74 │           │ BATTLE
│  ┌──────────┐        │ HP ████████ 70% │           │ FIELD
│  │ Player   │        └────────────────┘           │ (y=0..83)
│  │ Sprite   │     ┌──────────┐                    │
│  │ 56×56    │     │ Opponent │                    │
│  └──────────┘     │ 48×46    │                    │
│ ┌──────────────────┐ └────────┘                   │
│ │סלמנס Lv.77      │                              │
│ │HP ██████ 156/273 │                              │
│ │[הת×1.5] [מבולבל] │ ← bar expands for status    │
│ └──────────────────┘                              │
│ ●●●●●●                                  ●●○●●    │ party balls
├──────────────────────────────────────────────────┤ y=94 divider
│  HP 156/273                 ?מה יעשה סלמנס       │ y=95 prompt
├──────────────────────────────────────────────────┤ y=96
│     בריחה     תיק      החלפה      [התקפה]       │ y=104 tabs
│                                                  │ y=113 gap
├─────────────────────┬────────────────────────────┤ y=116
│ [דרקון]       זעם  │▌[תעופה]         מנוחה      │ type=TL name=TR
│ כוח: 120    15/16  │  כוח: —          8/8       │ power=BL pp=BR
├─────────────────────┼────────────────────────────┤ y=138
│ [תעופה] מכת כנף כפולה│ [דרקון]    ריקוד דרקון    │
│ כוח: 40×2   16/16  │  כוח: —        32/32       │
├─────────────────────┴────────────────────────────┤ y=160

```

---

## ZONE MAP

| Zone         | y start | y end | height | notes                          |
| ------------ | ------: | ----: | -----: | ------------------------------ |
| Battle field |       0 |    93 |     84 | Background + sprites + info UI |
| Divider      |      94 |   105 |      1 | #1a4a30                        |
| Prompt bar   |      95 |   102 |      8 | Prompt + HP value              |
| Action tabs  |     104 |   111 |      8 | 4 mode tabs (gap y=93 1px)     |
| Gap          |     112 |   115 |      4 | Breathing room                 |
| Move grid    |     116 |   157 |     42 | 2×2 grid (20h + 2gap + 20h)    |
| Spacer       |     158 |   159 |      2 | —                              |

---

## BATTLE FIELD (y=0 to y=83)

### Background

Draw imported background image at `(0, 0, 240, 84)`.
Fallback gradient layers:

| Layer       |   x |   y |   w |   h | gradient                                              |
| ----------- | --: | --: | --: | --: | ----------------------------------------------------- |
| Sky         |   0 |   0 | 240 |  34 | linear(180deg, #4a7a5a → #5a9a6a → #7aaa70)           |
| Ground      |   0 |  34 | 240 |  50 | linear(180deg, #8ab87a → #c8d8a0 → #d8c890 → #b8a870) |
| Ground line |   0 |  52 | 240 |   1 | rgba(100,80,50,0.12)                                  |
| Ground line |   0 |  60 | 240 |   1 | rgba(100,80,50,0.08)                                  |
| Ground line |   0 |  68 | 240 |   1 | rgba(100,80,50,0.06)                                  |

### Turn Badge

| Element   |   x |   y |   w |   h |  fs | color   | bgColor            | borderColor           |
| --------- | --: | --: | --: | --: | --: | ------- | ------------------ | --------------------- |
| Badge bg  | 102 |   2 |  36 |   8 |   — | —       | rgba(10,20,14,0.8) | rgba(77,255,180,0.25) |
| Badge txt | 102 |   3 |  36 |   — |   6 | #4dffb4 | —                  | —                     |

Text: `"תור " + turnNumber` — turnNumber in `#ffffff`

### Sprite Placeholders

| Sprite   |   x |   y |   w |   h | notes                           |
| -------- | --: | --: | --: | --: | ------------------------------- |
| Opponent | 150 |  16 |  46 |  46 | Draw opponent front sprite here |
| Player   |  18 |  24 |  56 |  56 | Draw player back sprite here    |

### Opponent Info Bar (fixed h=18, no status)

| Element      |   x |   y |   w |   h |  fs | color   | text      | align |
| ------------ | --: | --: | --: | --: | --: | ------- | --------- | ----- |
| Bar bg       | 136 |  12 | 100 |  18 |   — | —       | —         | —     |
| Name         | 188 |  13 |  46 |   — |   6 | #ffffff | (dynamic) | right |
| Level        | 140 |  14 |   — |   — |   5 | #667766 | Lv.XX     | left  |
| HP label     | 228 |  21 |   — |   — |   5 | #445544 | HP        | right |
| HP bar track | 140 |  22 |  42 |   3 |   — | #1a3a2a | —         | —     |
| HP bar fill  | 140 |  22 |  \* |   3 |   — | (by %)  | —         | —     |
| HP pct       | 196 |  21 |   — |   — |   5 | #667766 | XX%       | left  |

`oppHpFillW = Math.round((oppHP / oppMaxHP) * 42)`

### Player Info Bar (DYNAMIC HEIGHT)

The player bar expands vertically to fit status effects:

| Status count | Bar height | Bar y | Notes                    |
| -----------: | ---------: | ----: | ------------------------ |
|            0 |         18 |    62 | Name + HP only           |
|          1-2 |         24 |    58 | + 1 row of status pills  |
|          3-4 |         30 |    54 | + 2 rows of status pills |

**Formula:** `barH = 18 + Math.ceil(statusCount / 2) * 6`
**Bar y:** `barY = 82 - barH` (anchored to bottom of field at y=82)

### Player Info Bar Elements (relative to barY)

| Element      |   x | relY |   w |  fs | color   | text      | align |
| ------------ | --: | ---: | --: | --: | ------- | --------- | ----- |
| Bar bg       |   4 |    0 | 114 |   — | —       | —         | —     |
| Name         |  70 |   +1 |  46 |   6 | #ffffff | (dynamic) | right |
| Level        |   8 |   +2 |   — |   5 | #667766 | Lv.XX     | left  |
| HP label     | 108 |   +8 |   — |   5 | #445544 | HP        | right |
| HP bar track |   8 |  +10 |  54 |   3 | #1a3a2a | —         | —     |
| HP bar fill  |   8 |  +10 |  \* |   3 | (by %)  | —         | —     |
| HP val text  |  66 |   +8 |   — |   5 | #aaccaa | 156/273   | left  |

`playerHpFillW = Math.round((playerHP / playerMaxHP) * 54)`

### Status Pills (inside player bar, relative to barY)

| Row | relY | Max pills | Layout                   |
| --: | ---: | --------: | ------------------------ |
|   0 |  +16 |         2 | Right-to-left from x=114 |
|   1 |  +22 |         2 | Right-to-left from x=114 |

Each pill: w=30, h=6, gap=4 between pills.

- Pill 0: x = barX + barW - 4 - 30 = 84
- Pill 1: x = 84 - 4 - 28 = 52
- Pill 2 (row 1): x = 84
- Pill 3 (row 1): x = 52

### Status Pill Colors

| Status   | Hebrew | bgColor                | borderColor            | textColor |  fs |
| -------- | ------ | ---------------------- | ---------------------- | --------- | --: |
| poison   | הרעלה  | rgba(160,64,160,0.15)  | rgba(160,64,160,0.25)  | #c070c0   |   4 |
| burn     | שריפה  | rgba(240,128,48,0.15)  | rgba(240,128,48,0.25)  | #f09050   |   4 |
| paralyze | שיתוק  | rgba(248,208,48,0.15)  | rgba(248,208,48,0.25)  | #d8b830   |   4 |
| sleep    | שינה   | rgba(100,100,140,0.15) | rgba(100,100,140,0.25) | #8888b0   |   4 |
| freeze   | קפאון  | rgba(152,216,216,0.15) | rgba(152,216,216,0.25) | #80c8c8   |   4 |
| confuse  | מבולבל | rgba(248,88,136,0.15)  | rgba(248,88,136,0.25)  | #f07090   |   4 |
| boost    | (var)  | rgba(77,255,180,0.1)   | rgba(77,255,180,0.2)   | #4dffb4   |   4 |
| debuff   | (var)  | rgba(232,88,88,0.1)    | rgba(232,88,88,0.2)    | #e85858   |   4 |

### Party Ball Indicators

| Set      |   y | x positions             | size | gap |
| -------- | --: | ----------------------- | ---: | --: |
| Player   |  79 | 4, 10, 16, 22, 28, 34   |  4×4 |   6 |
| Opponent |  79 | 208, 214, 220, 226, 232 |  4×4 |   6 |

Ball states: alive=#20d860/#2a8a4a, fainted=#d84040/#8a2a2a, empty=rgba(255,255,255,0.05)/rgba(255,255,255,0.08)

---

## PROMPT BAR (y=85, h=8)

| Element     |   x |   y |   w |  fs | color   | bgColor | text            | align |
| ----------- | --: | --: | --: | --: | ------- | ------- | --------------- | ----- |
| Bar bg      |   0 |  85 | 240 |   8 | —       | #0a1a10 | —               | —     |
| Prompt text | 176 |  86 |  60 |   6 | #aaccaa | —       | ?מה יעשה (name) | right |
| Prompt name |   — |   — |   — |   6 | #ffffff | —       | (dynamic)       | —     |
| HP display  |  44 |  87 |   — |   5 | #667766 | —       | HP XXX/XXX      | left  |

---

## ACTION TABS (y=94, h=8)

| Element    |   x |   y |   w |   h |  fs | color   | notes                             |
| ---------- | --: | --: | --: | --: | --: | ------- | --------------------------------- |
| Tab bar bg |   0 |  94 | 240 |   8 |   — | —       | bg=#0d1a14, border-bottom #1a3a2a |
| Tab: התקפה | 188 |  94 |  48 |   8 |   6 | #20d860 | active: border-bottom 2px         |
| Tab: החלפה | 136 |  95 |  48 |   — |   6 | #445544 | inactive                          |
| Tab: תיק   |  92 |  95 |  40 |   — |   6 | #445544 | inactive                          |
| Tab: בריחה |  48 |  95 |  40 |   — |   6 | #445544 | inactive                          |

### Tab Data

| Idx | id     | text  |   x |   w | activeColor |
| --: | ------ | ----- | --: | --: | ----------- |
|   0 | fight  | התקפה | 188 |  48 | #20d860     |
|   1 | switch | החלפה | 136 |  48 | #5080ff     |
|   2 | bag    | תיק   |  92 |  40 | #f8d030     |
|   3 | run    | בריחה |  48 |  40 | #e85858     |

---

## FIGHT MODE: MOVE GRID (y=106)

### Grid Geometry

```
Cell width:   114
Cell height:  20
Column gap:   4    (between col 0 and col 1)
Row gap:      2    (between row 0 and row 1)

Col 0 (left):  x = 4
Col 1 (right): x = 122
Row 0 (top):   y = 106
Row 1 (bottom): y = 128
```

### Move Cell Layout (w=114, h=20)

```
┌──────────────────────────────────────────┐ cellY
│  [type badge]              move name  ← │ +2 (top row)
│                                          │
│  כוח: XXX                      PP/PP  → │ +12 (bottom row, aligned)
│  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │ +17 (1px pp bar)
└──────────────────────────────────────────┘ cellY+20
```

| Sub-element    | Position     | relX      | relY |   w |  fs | color   | align  |
| -------------- | ------------ | --------- | ---: | --: | --: | ------- | ------ |
| Cell bg        | full         | 0         |    0 | 114 |   — | —       | —      |
| Select bar     | left edge    | 0         |    0 |   2 |   — | #20d860 | —      |
| Type badge bg  | TOP-LEFT     | +4        |   +2 |  22 |   — | (type)  | —      |
| Type badge txt | TOP-LEFT     | +4        |   +2 |  22 |   5 | (type)  | center |
| Move name      | TOP-RIGHT    | +30       |   +2 |  80 |   7 | #ffffff | right  |
| Power text     | BOTTOM-LEFT  | +4        |  +12 |   — |   5 | #445544 | left   |
| PP text        | BOTTOM-RIGHT | +cellW-4  |  +12 |  22 |   5 | #667766 | right  |
| PP bar track   | BOTTOM       | +cellW-38 |  +17 |  38 |   — | #1a3a2a | —      |
| PP bar fill    | BOTTOM       | +cellW-38 |  +17 |  \* |   — | #20a0d8 | —      |

PP bar: h=1, `fillW = Math.round((ppCur / ppMax) * 38)`

### Move Index → Cell Position

| Move | gridPos | cellX | cellY |
| ---- | ------- | ----: | ----: |
| 0    | (1,0)   |   122 |   106 |
| 1    | (0,0)   |     4 |   106 |
| 2    | (1,1)   |   122 |   128 |
| 3    | (0,1)   |     4 |   128 |

### Absolute Coordinates for All 4 Moves

| Move | cellX | cellY | badgeX | badgeY | nameX(right-anchor) | nameY | powerX | powerY | ppX(right-anchor) | ppY | ppBarX | ppBarY |
| ---- | ----: | ----: | -----: | -----: | ------------------: | ----: | -----: | -----: | ----------------: | --: | -----: | -----: |
| 0    |   122 |   106 |    126 |    108 |                 232 |   108 |    126 |    118 |               232 | 118 |    196 |    123 |
| 1    |     4 |   106 |      8 |    108 |                 114 |   108 |      8 |    118 |               114 | 118 |     78 |    123 |
| 2    |   122 |   128 |    126 |    130 |                 232 |   130 |    126 |    140 |               232 | 140 |    196 |    145 |
| 3    |     4 |   128 |      8 |    130 |                 114 |   130 |      8 |    140 |               114 | 140 |     78 |    145 |

**Name right-anchor** = cellX + cellW - 4 = cellX + 110
**PP right-anchor** = cellX + cellW - 4 = cellX + 110

### Move Cursor Navigation

```
[1] [0]     ← move 0 = top-right (usually first/default)
[3] [2]     ← ▲▼ = row, ◀▶ = column
```

---

## SWITCH MODE: PARTY GRID (replaces move grid at y=106)

### Grid: 3 columns × 2 rows

| Property    | Value |
| ----------- | ----: |
| Cell width  |    76 |
| Cell height |    20 |
| Col stride  |    78 |
| Row stride  |    22 |
| Col 0 x     |     4 |
| Col 1 x     |    82 |
| Col 2 x     |   160 |
| Row 0 y     |   106 |
| Row 1 y     |   128 |

### Party Slot Template (w=76, h=20)

| Sub-element  |   relX | relY |   w |  fs | color   | notes              |
| ------------ | -----: | ---: | --: | --: | ------- | ------------------ |
| Slot bg      |      0 |    0 |  76 |   — | —       | #0f2a1a / #1a4a30  |
| Active bg    |      0 |    0 |  76 |   — | —       | #1a3a2a / #2a6a40  |
| Mini sprite  |     56 |   +2 |  16 |   — | —       | 16×16 sprite area  |
| Name         |     +4 |   +3 |  48 |   6 | #ffffff | right, dir=rtl     |
| HP bar track |     +4 |  +12 |  48 |   — | #1a3a2a | h=2, radius=1      |
| HP bar fill  |     +4 |  +12 |  \* |   — | (by %)  | w = (hp/max) × 48  |
| Fainted text | center |   +8 |   — |   6 | #d84040 | "מתעלף" if fainted |

---

## BOTTOM BAR (y=150, h=10) — NO Tab KEY

| Element         |   x |   y |   w |   h |  fs | color   | bgColor | borderColor | text  | align  |
| --------------- | --: | --: | --: | --: | --: | ------- | ------- | ----------- | ----- | ------ |
| Bar bg          |   0 | 150 | 240 |  10 |   — | —       | #0a1a10 | —           | —     | —      |
| ESC pill bg     |   8 | 151 |  18 |   8 |   — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| ESC pill text   |   8 | 152 |  18 |   — |   5 | #aaccaa | —       | —           | ESC   | center |
| ESC hint        |  28 | 153 |   — |   — |   5 | #667766 | —       | —           | בריחה | left   |
| Enter pill bg   |  66 | 151 |  24 |   8 |   — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| Enter pill text |  66 | 152 |  24 |   — |   5 | #aaccaa | —       | —           | Enter | center |
| Enter hint      |  92 | 153 |   — |   — |   5 | #667766 | —       | —           | בחירה | left   |
| ▲▼◀▶ pill bg    | 132 | 151 |  24 |   8 |   — | —       | #1a3a2a | #2a5a3a     | —     | —      |
| ▲▼◀▶ pill text  | 132 | 152 |  24 |   — |   5 | #aaccaa | —       | —           | ▲▼◀▶  | center |
| ▲▼◀▶ hint       | 158 | 153 |   — |   — |   5 | #667766 | —       | —           | ניווט | left   |

---

## CANVAS HELPER — Quick Reference Constants

```javascript
const BTL = {
  // ===== ZONES =====
  FIELD_H: 84,
  DIVIDER_Y: 84,
  PROMPT_Y: 85,  PROMPT_H: 8,
  TABS_Y: 94,    TABS_H: 8,
  CONTENT_Y: 106,
  BTM_Y: 150,    BTM_H: 10,

  // ===== TURN BADGE =====
  TURN: { x:102, y:2, w:36, h:8, fs:6 },

  // ===== SPRITES =====
  OPP_SPRITE: { x:150, y:16, w:46, h:46 },
  PLY_SPRITE: { x:18,  y:24, w:56, h:56 },

  // ===== OPPONENT INFO =====
  OPP_BAR:      { x:136, y:12, w:100, h:18 },
  OPP_NAME:     { x:234, y:19, fs:6 },       // right anchor (x=188+46)
  OPP_LEVEL:    { x:140, y:19, fs:5 },       // left
  OPP_HP_LABEL: { x:228, y:27, fs:5 },       // right
  OPP_HP_TRACK: { x:140, y:22, w:42, h:3 },
  OPP_HP_PCT:   { x:196, y:27, fs:5 },       // "70%"

  // ===== PLAYER INFO (DYNAMIC) =====
  PLY_BAR_X: 4,
  PLY_BAR_W: 114,
  PLY_BAR_BOTTOM: 82,  // bar bottom anchored here
  // barH = 18 + Math.ceil(statusCount / 2) * 6
  // barY = PLY_BAR_BOTTOM - barH

  // Offsets relative to barY:
  PLY_NAME_DY:     1,  PLY_NAME_DX: 66, PLY_NAME_W: 46, PLY_NAME_FS: 6,
  PLY_LEVEL_DY:    2,  PLY_LEVEL_DX: 4, PLY_LEVEL_FS: 5,
  PLY_HP_LABEL_DY: 8,  PLY_HP_LABEL_DX: 104, PLY_HP_LABEL_FS: 5,
  PLY_HP_TRACK_DY: 10, PLY_HP_TRACK_DX: 4, PLY_HP_TRACK_W: 54, PLY_HP_H: 3,
  PLY_HP_VAL_DY:   8,  PLY_HP_VAL_DX: 62, PLY_HP_VAL_FS: 5,

  // Status pills: relative to barY
  STATUS_ROW0_DY: 16,
  STATUS_ROW1_DY: 22,
  STATUS_PILL_H: 6,
  STATUS_PILL_W: 30,
  STATUS_GAP: 4,
  // pill0.x = barX + barW - 4 - 30 = 84
  // pill1.x = 84 - 4 - 28 = 52
  STATUS_X0: 84,  // rightmost pill
  STATUS_X1: 52,  // second pill

  // ===== PARTY BALLS =====
  BALL_SIZE: 4,
  BALL_Y: 79,
  BALL_GAP: 6,
  PLY_BALLS_X0: 4,
  OPP_BALLS_X0: 208,

  // ===== PROMPT BAR =====
  PROMPT_BG:   { x:0, y:85, w:240, h:8 },
  PROMPT_TEXT:  { x:236, y:91, fs:6 },     // right anchor
  PROMPT_HP:   { x:44,  y:92, fs:5 },      // left

  // ===== ACTION TABS =====
  TABS_BG: { x:0, y:94, w:240, h:8 },
  TABS: [
    { id:'fight',  text:'התקפה', x:188, w:48, color:'#20d860' },
    { id:'switch', text:'החלפה', x:136, w:48, color:'#5080ff' },
    { id:'bag',    text:'תיק',   x:92,  w:40, color:'#f8d030' },
    { id:'run',    text:'בריחה', x:48,  w:40, color:'#e85858' },
  ],
  TAB_TEXT_DY: 1,
  TAB_INACTIVE_C: '#445544',

  // ===== MOVE GRID =====
  MOVE: {
    cells: [
      { col:1, row:0, x:122, y:106 },  // move 0 top-right
      { col:0, row:0, x:4,   y:106 },  // move 1 top-left
      { col:1, row:1, x:122, y:128 },  // move 2 bottom-right
      { col:0, row:1, x:4,   y:128 },  // move 3 bottom-left
    ],
    W: 114,
    H: 20,
    SEL_BAR_W: 2,

    // Inside cell (relative to cellX, cellY):
    TYPE_DX: 4,     TYPE_DY: 2,     TYPE_W: 22, TYPE_H: 7, TYPE_FS: 5,
    NAME_DX: 30,    NAME_DY: 2,     NAME_W: 80, NAME_FS: 7,   // right-aligned at cellX+110
    POWER_DX: 4,    POWER_DY: 12,   POWER_FS: 5,               // left-aligned
    PP_DX: 110,     PP_DY: 12,      PP_W: 22, PP_FS: 5,        // right-aligned at cellX+110
    PP_BAR_DX: 76,  PP_BAR_DY: 17,  PP_BAR_W: 38, PP_BAR_H: 1, // 1px bar
  },

  // ===== SWITCH GRID =====
  SWITCH: {
    cells: [
      { col:2, row:0, x:160, y:106 },
      { col:1, row:0, x:82,  y:106 },
      { col:0, row:0, x:4,   y:106 },
      { col:2, row:1, x:160, y:128 },
      { col:1, row:1, x:82,  y:128 },
      { col:0, row:1, x:4,   y:128 },
    ],
    W: 76,
    H: 20,
    SPRITE_DX: 56, SPRITE_DY: 2, SPRITE_SZ: 16,
    NAME_DX: 4, NAME_DY: 3, NAME_W: 48, NAME_FS: 6,
    HP_DX: 4, HP_DY: 12, HP_W: 48, HP_H: 2,
  },


// ===== PLAYER BAR HEIGHT CALCULATOR =====
function getPlayerBarHeight(statusEffects) {
  // statusEffects = array of {type, label}
  const count = statusEffects.length;
  if (count === 0) return 18;
  return 18 + Math.ceil(count / 2) * 6;
}

function getPlayerBarY(statusEffects) {
  return BTL.PLY_BAR_BOTTOM - getPlayerBarHeight(statusEffects);
}

// ===== DRAW MOVE CELL =====
function drawMoveCell(ctx, moveIndex, move, isSelected) {
  const cell = BTL.MOVE.cells[moveIndex];
  const cx = cell.x, cy = cell.y;
  const cw = BTL.MOVE.W, ch = BTL.MOVE.H;
  const M = BTL.MOVE;

  // Background
  ctx.fillStyle = isSelected ? '#1a3a2a' : '#0f2a1a';
  fillRoundRect(ctx, cx, cy, cw, ch, 2);
  ctx.strokeStyle = isSelected ? '#2a6a40' : '#1a4a30';
  strokeRoundRect(ctx, cx, cy, cw, ch, 2);

  // Selection bar
  if (isSelected) {
    ctx.fillStyle = '#20d860';
    ctx.fillRect(cx, cy, M.SEL_BAR_W, ch);
  }

  // Type badge (TOP-LEFT)
  const badge = TYPE_BADGE[move.type];
  ctx.fillStyle = badge.bg;
  fillRoundRect(ctx, cx + M.TYPE_DX, cy + M.TYPE_DY, M.TYPE_W, M.TYPE_H, 2);
  ctx.strokeStyle = badge.border;
  strokeRoundRect(ctx, cx + M.TYPE_DX, cy + M.TYPE_DY, M.TYPE_W, M.TYPE_H, 2);
  ctx.fillStyle = badge.color;
  ctx.font = M.TYPE_FS + 'px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(badge.text, cx + M.TYPE_DX + M.TYPE_W / 2, cy + M.TYPE_DY + 6);

  // Move name (TOP-RIGHT)
  ctx.fillStyle = '#ffffff';
  ctx.font = M.NAME_FS + 'px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(move.name, cx + cw - 4, cy + M.NAME_DY + 7);

  // Power (BOTTOM-LEFT)
  ctx.fillStyle = '#445544';
  ctx.font = M.POWER_FS + 'px monospace';
  ctx.textAlign = 'left';
  const powerStr = move.power ? 'כוח: ' + move.power : 'כוח: —';
  ctx.fillText(powerStr, cx + M.POWER_DX, cy + M.POWER_DY + 5);

  // PP (BOTTOM-RIGHT, same y as power)
  ctx.fillStyle = '#667766';
  ctx.font = M.PP_FS + 'px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(move.ppCur + '/' + move.ppMax, cx + cw - 4, cy + M.POWER_DY + 5);

  // 1px PP bar at bottom
  const barX = cx + M.PP_BAR_DX;
  const barY = cy + M.PP_BAR_DY;
  ctx.fillStyle = '#1a3a2a';
  ctx.fillRect(barX, barY, M.PP_BAR_W, M.PP_BAR_H);
  const ppFillW = Math.round((move.ppCur / move.ppMax) * M.PP_BAR_W);
  ctx.fillStyle = '#20a0d8';
  ctx.fillRect(barX, barY, ppFillW, M.PP_BAR_H);
}

// ===== TYPE BADGE COLORS =====
const TYPE_BADGE = {
  normal:   { text:'רגיל',   bg:'rgba(168,168,120,0.15)', border:'rgba(168,168,120,0.25)', color:'#a8a878' },
  grass:    { text:'דשא',    bg:'rgba(120,200,80,0.12)',   border:'rgba(120,200,80,0.2)',   color:'#78c850' },
  poison:   { text:'רעל',    bg:'rgba(160,64,160,0.12)',   border:'rgba(160,64,160,0.2)',   color:'#a040a0' },
  fire:     { text:'אש',     bg:'rgba(240,128,48,0.12)',   border:'rgba(240,128,48,0.2)',   color:'#f08030' },
  water:    { text:'מים',    bg:'rgba(104,144,240,0.12)',  border:'rgba(104,144,240,0.2)',  color:'#6890f0' },
  electric: { text:'חשמל',   bg:'rgba(248,208,48,0.12)',   border:'rgba(248,208,48,0.2)',   color:'#f8d030' },
  ice:      { text:'קרח',    bg:'rgba(152,216,216,0.12)',  border:'rgba(152,216,216,0.2)',  color:'#98d8d8' },
  fighting: { text:'לחימה',  bg:'rgba(192,48,40,0.12)',    border:'rgba(192,48,40,0.2)',    color:'#c03028' },
  ground:   { text:'אדמה',   bg:'rgba(224,192,104,0.12)',  border:'rgba(224,192,104,0.2)',  color:'#e0c068' },
  flying:   { text:'תעופה',  bg:'rgba(168,144,240,0.12)',  border:'rgba(168,144,240,0.2)',  color:'#a890f0' },
  psychic:  { text:'על חושי',  bg:'rgba(248,88,136,0.12)',   border:'rgba(248,88,136,0.2)',   color:'#f85888' },
  bug:      { text:'חרק',    bg:'rgba(168,184,32,0.12)',   border:'rgba(168,184,32,0.2)',   color:'#a8b820' },
  rock:     { text:'סלע',    bg:'rgba(184,160,56,0.12)',   border:'rgba(184,160,56,0.2)',   color:'#b8a038' },
  ghost:    { text:'רוח',    bg:'rgba(112,88,152,0.12)',   border:'rgba(112,88,152,0.2)',   color:'#705898' },
  dragon:   { text:'דרקון',  bg:'rgba(112,56,248,0.12)',   border:'rgba(112,56,248,0.2)',   color:'#7038f8' },
  dark:     { text:'חושך',   bg:'rgba(112,88,72,0.12)',    border:'rgba(112,88,72,0.2)',    color:'#705848' },
  steel:    { text:'פלדה',   bg:'rgba(184,184,208,0.12)',  border:'rgba(184,184,208,0.2)',  color:'#b8b8d0' },
  fairy:    { text:'פיה',    bg:'rgba(238,153,172,0.12)',  border:'rgba(238,153,172,0.2)',  color:'#ee99ac' },
};
```
