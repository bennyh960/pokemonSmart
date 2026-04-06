# Numeria — Map Design Guide
**How to build every map using the editor, based on the story and region layout.**

> **How to use:** Open the map in the editor, add NPCs/buildings/transitions as described below.
> NPC `x,y` are approximate — place them to fit your map layout.
> All dialogue is bilingual `{ en, he }`. Hebrew placeholders = English copy for now.

---
 The Big Picture

  The story has Acts (Act 0 → Act 5). Each act has a main goal (usually: reach a city → pass a gate → beat a gym → get a badge).

  What Drives Progression

  Flags are just boolean checkboxes (true/false) stored on the save file. Nothing else. When a flag is set, NPCs that were watching for it appear/disappear.

  The Chain

  Player does something
      ↓
  Story Event fires (e.g. badge-earned, map-enter, npc-interact)
      ↓
  Actions run (set-flag, start-cutscene, set-quest, open-gate)
      ↓
  NPCs check their spawnAfter/despawnAfter flags → appear or vanish

  How to Read the Order in Your Head

  1. Act 0 = Zeroville. Player names hero → arrives overworld → walks to lab → picks starter → story-received-starter is set.
  2. Route 1 = First route. Player battles trainers. At the east end, NPC appears (needs act0-complete) → triggers act1-nullx-intro-seen cutscene → player
  learns about NULL-X.
  3. Gate = Quiz checkpoint between areas. Passing it sets a gate-*-pass flag → next area unlocks.
  4. City = Gym battle. Winning fires badge-earned event → sets story-badge-N flag → next route gate opens.
  5. Repeat for each city (Act 1 = badges 1-2, Act 2 = badges 3-4, etc.).

  The 3 Types of Flags You'll Use in the Editor

  ┌──────────────────┬────────────────────────┬─────────────────────────────────────────┐
  │       Type       │        Example         │                 Meaning                 │
  ├──────────────────┼────────────────────────┼─────────────────────────────────────────┤
  │ story-received-* │ story-received-starter │ Player got something for the first time │
  ├──────────────────┼────────────────────────┼─────────────────────────────────────────┤
  │ story-badge-N    │ story-badge-1          │ Player earned badge N                   │
  ├──────────────────┼────────────────────────┼─────────────────────────────────────────┤
  │ gate-*-pass      │ gate-route1-pass       │ Player passed a quiz gate               │
  └──────────────────┴────────────────────────┴─────────────────────────────────────────┘

  NPC Spawn/Despawn Rules (Simple)

  - spawnAfter: "X" → NPC is invisible until flag X is set
  - despawnAfter: "X" → NPC disappears once flag X is set
  - Both together = NPC appears in a window: after X, before Y

  To See the Full Story Order

  Instead of reading the md, just read src/data/story/content/act0-act1.ts top-to-bottom. Each registerStoryEvent has a trigger (what fires it) and actions
  (what happens). They're already in chronological order within each file. Act files: act0-act1.ts → act2.ts → act3.ts → act4-act5.ts.

  ---

   Flags live in two places:

  ---
  1. Where they're stored at runtime

  PlayerData.flags["flag-name"] = true
  It's just a plain JavaScript object on the save file. No registry, no list. A flag "exists" the moment any code writes pd.flags['something'] = true. If
  nothing has set it yet, reading it returns undefined (treated as false).

  ---
  2. Where they get SET (the sources)

  ┌───────────────────────┬─────────────────────────────────────────────────────────────┐
  │        Source         │                             How                             │
  ├───────────────────────┼─────────────────────────────────────────────────────────────┤
  │ Story event actions   │ { type: 'set-flag', flag: 'X' } in act*.ts files            │
  ├───────────────────────┼─────────────────────────────────────────────────────────────┤
  │ Cutscene action step  │ { type: 'action', action: { type: 'set-flag', flag: 'X' } } │
  ├───────────────────────┼─────────────────────────────────────────────────────────────┤
  │ NPC reward.storyEvent │ Sets flag named by that string when reward fires            │
  ├───────────────────────┼─────────────────────────────────────────────────────────────┤
  │ NPC reward.flag       │ Sets this flag to prevent re-giving reward                  │
  ├───────────────────────┼─────────────────────────────────────────────────────────────┤
  │ Gate successActions   │ { type: 'set-flag', flag: 'X' } when quiz is passed         │
  ├───────────────────────┼─────────────────────────────────────────────────────────────┤
  │ starter-select.ts     │ Hardcoded: pd.flags['story-received-starter'] = true        │
  └───────────────────────┴─────────────────────────────────────────────────────────────┘

  ---
  3. Where they get READ (the consumers)

  ┌────────────────────────┬────────────────────────────────────────────────────────────────┐
  │        Consumer        │                             Field                              │
  ├────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ NPC visibility         │ spawnAfter, despawnAfter on any NPC in map JSON                │
  ├────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Story event conditions │ { type: 'flag', flag: 'X' } or { type: 'flag-not', flag: 'X' } │
  ├────────────────────────┼────────────────────────────────────────────────────────────────┤
  │ Gate conditions        │ same condition types                                           │
  └────────────────────────┴────────────────────────────────────────────────────────────────┘

  ---
  There is NO master flag list in code

  That's the important thing to understand. The flags only exist in the guide and your own notes. The code doesn't validate them — if you write spawnAfter:
  "story-recieved-stater" (typo), the NPC will never spawn and no error appears. That's exactly the bug you were hitting.

  The editor's datalist autocomplete (we built that) helps avoid typos by showing you all flags that are already referenced anywhere in the code.




---

## Story Flags Master List

> **Canonical names** — use exactly these strings in NPC `spawnAfter`/`despawnAfter` fields.
> Aliases (shown in parentheses) are also set in code and work equally.

| Flag | Set When | Used For |
|------|----------|----------|
| `story-received-starter` | Player picks starter (STARTER_SELECT scene) | `spawnAfter` on post-starter NPCs |
| `story-received-pokedex` | Lab assistant reward → `storyEvent` | Flavor; gates Pokédex-dependent NPCs |
| `visited-sumville` | First map-enter Sumville (also sets Prof. Oak cutscene) | Check if player reached city |
| `story-badge-1` | Beat Plussa — `evt-badge1-clears-sumville` | Opens Route 2 gate |
| `act1-remainder-first-battle-done` | Remainder battle ends in Minusburg cutscene | Despawns Remainder there |
| `story-badge-2` | Beat Minusan — `evt-badge2-clears-minusburg` | Opens Route 3 |
| `story-badge-3` | Beat Multina — `evt-badge3-clears-multiplia` | Triggers Remainder glitch event |
| `story-remainder-glitched` | `act2-remainder-glitch` cutscene action | (alias: `story-remainder-infected`) |
| `story-remainder-saved` | `act2-remainder-saved` cutscene action | Remainder despawns from Dividia (alias: `story-remainder-cured`) |
| `story-badge-4` | Beat Divider — `evt-badge4-clears-dividia` | Opens Route 5 |
| `story-badge-5` | Beat Prima — `evt-badge5-clears-primore` | Triggers Remainder ally cutscene |
| `story-remainder-ally` | `act3-remainder-returns` cutscene action | Spawns ally Remainder in Primore (alias: `story-remainder-joined`) |
| `story-nullx-first-contact` | `act3-nullx-first-contact` cutscene action | NULL-X terminal seen |
| `story-badge-6` | Beat Mirror — `evt-badge6-clears-symmetrika` | Opens Route 7 |
| `story-badge-7` | Beat Formula — `evt-badge7-clears-integrala` | Reveals NULL-X full history |
| `story-badge-8` | Beat Absolut — `evt-badge8-assembles-serum` | Serum complete |
| `gate-tower-entry-pass` | NULL-X Tower gate cleared | Opens tower (use this — not `story-tower-unlocked`) |
| `act1-nullx-intro-seen` | Route 1 exit NPC interaction | Despawns that NPC |
| `act0-complete` | `act0-intro` cutscene end | Spawn condition for Route 1 exit NPC |

---

---

## 🏘 ZEROVILLE
**map id:** `zeroville`

**Description:** The starting town. Peaceful, protected from the Glitch by Professor Algorithma's shield. Round buildings shaped like zeros. Home of the Professor's lab.

**Story Act:** Prologue

**Story Events:**
- Player starts here. Professor explains the Glitch and NULL-X.
- Player receives starter Pokémon and Pokédex.
- After receiving starter, Route 1 gate opens (remove blocker NPC or just enable transition).

**Story Flags Set Here:**
- `story-received-starter` — when player picks starter (set via professor's reward field)
- `story-received-pokedex` — when lab assistant gives Pokédex

**Wild Pokémon:** None (town)

**Story Buildings:**
- 🏛 **Professor's Lab** (interactive building → `algorithma-lab` interior map)
- 🏥 **Pokémon Center** (interactive → `pokecenter-2` interior)
- 🛒 **Mart** (interactive → `mart-interior`)
- 2× **Houses** (already exist: `zeroville-house-tl`, `zeroville-house-tr`, `zeroville-house-br`)

---

### Story NPCs

#### 1. Professor Algorithma — Lab Entrance (tutorial intro)
```json
{
  "id": "prof-algorithma-door",
  "name": { "en": "Prof. Algorithma", "he": "פרופ' אלגוריתמה" },
  "x": 12, "y": 14,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-female-old",
  "dialogue": [
    { "en": "Ah, you're awake! Come to the lab at once. NULL-X has broken free — Numeria is in danger.", "he": "אה, התעוררת! בוא למעבדה מיד. NULL-X השתחרר — נומריה בסכנה." },
    { "en": "I need you to collect 8 Serum components from across Numeria. You are my only hope.", "he": "אני צריכה שתאסוף 8 רכיבי נסיוב מרחבי נומריה. אתה תקוותי היחידה." }
  ],
  "despawnAfter": "story-received-starter"
}
```

#### 2. Professor Algorithma — Lab (after receiving starter)
> This NPC is inside the `algorithma-lab` map. Place her at x≈8, y≈6.
```json
{
  "id": "prof-algorithma-lab",
  "name": { "en": "Prof. Algorithma", "he": "פרופ' אלגוריתמה" },
  "x": 8, "y": 6,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-female-old",
  "dialogue": [
    { "en": "Choose your partner wisely. They will face everything the Glitch can throw at us.", "he": "בחר את שותפך בחוכמה. הם יתמודדו עם כל מה שהגליץ' יכול לזרוק." },
    { "en": "The first Serum component is in Sumville — head east on Route 1. Good luck.", "he": "רכיב הנסיוב הראשון נמצא בסכומית — לך מזרחה בשביל 1. בהצלחה." }
  ]
  // Note: story-received-starter is set automatically by the STARTER_SELECT scene — no reward needed here
}
```

#### 3. Lab Assistant — gives Pokédex
> Inside `algorithma-lab`, near the door, x≈5, y≈9.
```json
{
  "id": "lab-assistant",
  "name": { "en": "Lab Assistant", "he": "עוזר מעבדה" },
  "x": 5, "y": 9,
  "facing": "up",
  "type": "dialogue",
  "spriteType": "npc-male",
  "dialogue": [
    { "en": "The Professor asked me to give you this Pokédex. It records every Pokémon you encounter.", "he": "הפרופסור ביקשה ממני לתת לך את הפוקידקס הזה. הוא מתעד כל פוקימון שתפגוש." }
  ],
  "reward": {
    "storyEvent": "story-received-pokedex",
    "flag": "pokedex-given"
  }
}
```

#### 4. Townsperson A — Glitch warning
```json
{
  "id": "zeroville-citizen-1",
  "name": { "en": "Old Resident", "he": "תושב ותיק" },
  "x": 6, "y": 10,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-male-old",
  "dialogue": [
    { "en": "The shield Professor Algorithma set up is the only thing keeping us safe. Don't break it when you leave!", "he": "המגן שהפרופסור הקימה הוא הדבר היחיד ששומר עלינו. אל תשבור אותו כשתצא!" }
  ]
}
```

#### 5. Townsperson B — Route 1 hint
```json
{
  "id": "zeroville-citizen-2",
  "name": { "en": "Young Girl", "he": "ילדה צעירה" },
  "x": 18, "y": 8,
  "facing": "left",
  "type": "dialogue",
  "spriteType": "npc-female",
  "dialogue": [
    { "en": "Route 1 is to the east! The path to Sumville. I hear the Pokémon there are very weak... for now.", "he": "שביל 1 נמצא ממזרח! הדרך לסכומית. שמעתי שהפוקימונים שם חלשים מאוד... לעת עתה." }
  ]
}
```

#### 6. Route 9 Blocker — Party Guard (despawnWhenParty, blocks south exit)
> Place at the south edge of Zeroville, facing south, blocking Route 9 entrance.
```json
{
  "id": "zeroville-route9-guard",
  "name": { "en": "Gruff Hiker", "he": "מטייל גס" },
  "x": 12, "y": 24,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-hiker",
  "lineOfSight": 3,
  "despawnWhenParty": { "count": 4, "minLevel": 25 },
  "dialogue": [
    { "en": "Route 9 is no place for beginners. Come back when your Pokémon are truly strong — at least 4 of them above level 25.", "he": "שביל 9 הוא לא מקום למתחילים. חזור כשהפוקימונים שלך חזקים באמת — לפחות 4 מעל רמה 25." }
  ]
}
```

---

### Connections
```
EAST  → Route 1       (Route 1, levels 2–5)   → spawn at x=1, y=7 in Route 1
NORTH → Deep Forest   (optional side area)     → spawn at x=12, y=1 in Deep Forest
SOUTH → Route 9       (shortcut, levels 20–26) → spawn at x=1, y=3 in Route 9
        [BLOCKED by Route 9 guard until 4× Pokémon ≥ Lv25]
```

---
---

## 🛤 ROUTE 1 — Counting Path
**map id:** `route-1`

**Description:** A green, welcoming path east from Zeroville. Tutorial route. Signs teach basic math. Wild Pokémon are very weak. The Glitch appears here as occasional pixel flickers — harmless for now.

**Story Act:** Act 1

**Story Events:** Player sees their first hint of Glitch corruption. No story NPCs — pure exploration and battle tutorial.

**Wild Pokémon:** Levels 2–5 · Types: Normal, Bug, Grass
> Suggested: Rattata, Caterpie, Weedle, Pidgey, Sentret

**Trainers on Route:**

#### Trainer 1 — Young Boy
```json
{
  "id": "route1-trainer-1",
  "name": { "en": "Young Boy Ori", "he": "ילד קטן אורי" },
  "x": 12, "y": 8,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-youngster",
  "lineOfSight": 3,
  "dialogue": [{ "en": "Hey! Let's battle! I've been training on Route 1 all week!", "he": "היי! בוא נתגושש! אני מתאמן בשביל 1 כל השבוע!" }],
  "postBattleDialogue": [{ "en": "Wow, you're really strong! Are you going to Sumville Gym?", "he": "וואו, אתה ממש חזק! אתה הולך לג'ים של סכומית?" }],
  "party": [
    { "pokemonId": 16, "level": 3 },
    { "pokemonId": 19, "level": 4 }
  ],
  "reward": { "money": 60 }
}
```

#### Trainer 2 — Lass
```json
{
  "id": "route1-trainer-2",
  "name": { "en": "Lass Noa", "he": "נוע'ה" },
  "x": 24, "y": 12,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-lass",
  "lineOfSight": 3,
  "dialogue": [{ "en": "I caught my first Pokémon on this route! Now I'm ready to battle anyone!", "he": "תפסתי את הפוקימון הראשון שלי בשביל הזה! עכשיו אני מוכנה להתגושש עם כל אחד!" }],
  "postBattleDialogue": [{ "en": "Those are some great Pokémon you have!", "he": "יש לך פוקימונים מדהימים!" }],
  "party": [
    { "pokemonId": 10, "level": 4 }
  ],
  "reward": { "money": 64 }
}
```

#### Route 1 House NPC
> Inside `route1-house` interior map.
```json
{
  "id": "route1-house-resident",
  "name": { "en": "Old Man", "he": "איש זקן" },
  "x": 3, "y": 3,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-male-old",
  "dialogue": [
    { "en": "I've lived on Route 1 for 40 years. Never seen Pokémon behave so strangely... it's that Glitch, I tell you.", "he": "גרתי בשביל 1 במשך 40 שנה. מעולם לא ראיתי פוקימונים מתנהגים כל כך מוזר... זה הגליץ', אני אומר לך." }
  ]
}
```

### Connections
```
WEST → Zeroville     → spawn at x=22, y=7 in Zeroville
EAST → Sumville      → spawn at x=2, y=30 in Sumville
```

---
---

## 🏙 SUMVILLE — Addition Gym City
**map id:** `sumville`

**Description:** Bustling trading city. Buildings connected in pairs by bridges. Gym focuses on Addition. Remainder (rival) lives here. First Glitch effects: shop signs flicker with wrong prices.

**Story Act:** Act 1

**Story Events:**
1. Player enters → meets Remainder for the first time.
2. Player beats Gym Leader Plussa → gets Badge 1 + Serum Component 1.
3. Remainder challenges player to battle (optional). After losing he respects the player.

**Story Flags Set Here:**
- `story-met-remainder-sumville` — set via Remainder intro NPC reward field
- `story-badge-1` — set by `evt-badge1-clears-sumville` on badge-earned
- `story-remainder-battle-1` — set via Remainder trainer NPC reward field (on defeat)

**Wild Pokémon:** None (city)

**Gym:** Addition Gym — Leader: **Plussa** — Normal type — Badge: Sum Badge
**Puzzle:** Walk on numbered floor tiles that sum to a target number to unlock doors.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Mart** (→ `mart-interior`)
- 🏠 **Remainder's House** (→ `sumville-house-1`)
- 🏠 **Townsperson House** (→ `sumville-house-2`)
- ⚔ **Addition Gym** (interactive building — interior is gym puzzle + leader)

---

### Story NPCs

#### 1. Remainder — First meeting (despawns after flag)
```json
{
  "id": "remainder-sumville-intro",
  "name": { "en": "Remainder", "he": "ריי-מיינדר" },
  "x": 5, "y": 28,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-rival",
  "despawnAfter": "story-met-remainder-sumville",
  "dialogue": [
    { "en": "So you're the Professor's chosen one? Hah! I've been training for months. You don't stand a chance.", "he": "אז אתה הנבחר של הפרופסור? האח! אני מתאמן כבר חודשים. אין לך סיכוי." },
    { "en": "My name is Remainder. Remember it — because I'm going to collect all 8 badges before you do!", "he": "שמי ריי-מיינדר. זכור אותו — כי אני אאסוף את כל 8 התגים לפניך!" }
  ],
  "reward": { "storyEvent": "story-met-remainder-sumville" }
}
```

#### 2. Remainder — Battle (spawns after intro, despawns on defeat)
```json
{
  "id": "remainder-sumville-battle",
  "name": { "en": "Remainder", "he": "ריי-מיינדר" },
  "x": 5, "y": 26,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-rival",
  "spawnAfter": "story-met-remainder-sumville",
  "despawnOnDefeat": true,
  "lineOfSight": 4,
  "dialogue": [{ "en": "Wait — before you go to the gym. Let's settle who's really stronger!", "he": "רגע — לפני שאתה הולך לג'ים. בוא נסדר מי באמת חזק יותר!" }],
  "postBattleDialogue": [{ "en": "...Fine. You're better than I thought. But this isn't over.", "he": "...בסדר. אתה טוב ממה שחשבתי. אבל זה לא נגמר." }],
  "party": [
    { "pokemonId": 1, "level": 5 },
    { "pokemonId": 4, "level": 5 }
  ],
  "reward": {
    "money": 100,
    "storyEvent": "story-remainder-battle-1"
  }
}
```

#### 3. Gym Leader Plussa
> Place inside the gym interior map (build a separate small map or use gym area of sumville).
```json
{
  "id": "gym-leader-plussa",
  "name": { "en": "Plussa", "he": "פלוסה" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-female",
  "lineOfSight": 0,
  "dialogue": [{ "en": "Addition isn't just math — it's the connection between all living things! Can you add up the right answers?", "he": "חיבור זה לא רק מתמטיקה — זו הקשר בין כל היצורים! האם תוכל לחבר את התשובות הנכונות?" }],
  "postBattleDialogue": [{ "en": "Wonderful! You truly understand addition — bringing together strength and heart! Take the Sum Badge!", "he": "נפלא! אתה באמת מבין חיבור — לאחד כוח ולב! קח את תג הסכום!" }],
  "party": [
    { "pokemonId": 17, "level": 9, "moves": [33, 16, 98, 28] },
    { "pokemonId": 162, "level": 11, "moves": [33, 98, 163, 111] }
  ],
  "reward": {
    "money": 1100,
    "badge": 1,
    "storyEvent": "story-badge-1"
  }
}
```

#### 4. Remainder's Mom — Remainder's House interior
```json
{
  "id": "remainder-mom",
  "name": { "en": "Remainder's Mom", "he": "אמא של ריי-מיינדר" },
  "x": 4, "y": 4,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-female-old",
  "dialogue": [
    { "en": "My son left in such a rush this morning — said something about proving himself to the Professor. He's a good boy, really.", "he": "בני יצא בחיפזון כזה הבוקר — אמר משהו על הוכחת עצמו לפרופסור. הוא ילד טוב, באמת." }
  ]
}
```

#### 5. Route 11 Blocker — South exit to Primore shortcut
```json
{
  "id": "sumville-route11-guard",
  "name": { "en": "Stern Ranger", "he": "ריינג'ר קפדן" },
  "x": 30, "y": 59,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-ranger",
  "lineOfSight": 3,
  "despawnWhenParty": { "count": 4, "minLevel": 22 },
  "dialogue": [
    { "en": "Route 11 leads through the deep forest straight to Primore. The Pokémon there are level 22 and above — you're not ready.", "he": "שביל 11 עובר דרך היער העמוק ישר לפרימור. הפוקימונים שם ברמה 22 ומעלה — אתה לא מוכן." }
  ]
}
```

#### 6. Townsperson — Glitch flavor
```json
{
  "id": "sumville-merchant-glitched",
  "name": { "en": "Confused Merchant", "he": "סוחר מבולבל" },
  "x": 20, "y": 20,
  "facing": "left",
  "type": "dialogue",
  "spriteType": "npc-male",
  "dialogue": [
    { "en": "My shop sign keeps changing prices on its own! Yesterday it said a Potion costs 42... then 7... then ERROR. That Glitch is ruining business!", "he": "השלט של החנות שלי ממשיך לשנות מחירים לבד! אתמול כתב שתרופה עולה 42... אז 7... אז ERROR. הגליץ' הורס עסקים!" }
  ]
}
```

### Connections
```
WEST  → Route 1      (levels 2–5)   → spawn at x=33, y=7 in Route 1
EAST  → Route 2      (levels 5–8)   → spawn at x=1, y=30 in Route 2
SOUTH → Route 11     (levels 22–28, shortcut to Primore)
        [BLOCKED by Route 11 guard until 4× Pokémon ≥ Lv22]
```

---
---

## 🛤 ROUTE 2 — Difference Pass
**map id:** `route-2`

**Description:** Mountain path descending into a canyon valley. Misty. Bridges shorten mid-crossing. Glitch causes sections of the path to disappear and reappear.

**Story Act:** Act 1

**Wild Pokémon:** Levels 5–8 · Types: Normal, Flying, Poison
> Suggested: Zubat, Spearow, Ekans, Jigglypuff, Meowth

**Trainers on Route:**

#### Trainer 1 — Bug Catcher
```json
{
  "id": "route2-trainer-1",
  "name": { "en": "Bug Catcher Tal", "he": "צייד חרקים טל" },
  "x": 10, "y": 8,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-bugcatcher",
  "lineOfSight": 3,
  "dialogue": [{ "en": "Bugs! Bugs everywhere! I love this route!", "he": "חרקים! חרקים בכל מקום! אני אוהב את השביל הזה!" }],
  "postBattleDialogue": [{ "en": "My bugs weren't strong enough... yet!", "he": "החרקים שלי לא היו חזקים מספיק... עדיין!" }],
  "party": [
    { "pokemonId": 10, "level": 6 },
    { "pokemonId": 13, "level": 6 }
  ],
  "reward": { "money": 72 }
}
```

#### Trainer 2 — Hiker
```json
{
  "id": "route2-trainer-2",
  "name": { "en": "Hiker Benny", "he": "מטייל בני" },
  "x": 25, "y": 5,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-hiker",
  "lineOfSight": 3,
  "dialogue": [{ "en": "This mountain path has been my training ground for years. Let's see what you've got!", "he": "הנתיב ההרי הזה היה שטח האימון שלי במשך שנים. בוא נראה מה יש לך!" }],
  "postBattleDialogue": [{ "en": "Strong trainer... heading for Minusburg Gym?", "he": "מאמן חזק... מתכוון לג'ים של מינוסבורג?" }],
  "party": [
    { "pokemonId": 74, "level": 7 },
    { "pokemonId": 95, "level": 8 }
  ],
  "reward": { "money": 128 }
}
```

### Connections
```
WEST → Sumville    → spawn at x=2, y=30 in Sumville
EAST → Minusburg   → spawn at x=2, y=15 in Minusburg
```

---
---

## 🏙 MINUSBURG — Subtraction Gym City
**map id:** `minusburg`

**Description:** Canyon city carved from rock. Half-built, minimalist aesthetic. Everything looks incomplete — buildings missing walls, bridges with no railings. Reminder of subtraction. Glitch makes parts of the city literally vanish.

**Story Act:** Act 1–2

**Story Events:**
1. Remainder battles player again before gym (he's been here training).
2. Player beats Gym Leader Minusan → Badge 2 + Serum Component 2.
3. Flavor: townspeople complaining about "disappearing" memories.

**Story Flags Set Here:**
- `story-badge-2` — set by `evt-badge2-clears-minusburg` on badge-earned
- `story-remainder-battle-2` — set via Remainder trainer NPC reward field (on defeat)
- `act1-remainder-first-battle-done` — set by the Minusburg battle cutscene action

**Wild Pokémon:** None (city)

**Gym:** Subtraction Gym — Leader: **Minusan** — Poison type — Badge: Difference Badge
**Puzzle:** Rooms progressively lose furniture. Logic truth/lie puzzles on doors.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Mart** (→ `mart-interior`)
- ⚔ **Subtraction Gym** (gym interior)
- 🏠 **2–3 half-built houses** (flavor, no interiors needed)

---

### Story NPCs

#### 1. Remainder — Battle before gym
```json
{
  "id": "remainder-minusburg-battle",
  "name": { "en": "Remainder", "he": "ריי-מיינדר" },
  "x": 10, "y": 20,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-rival",
  "despawnOnDefeat": true,
  "lineOfSight": 4,
  "dialogue": [{ "en": "I've been waiting. My Pokémon are stronger now. This time will be different!", "he": "חיכיתי. הפוקימונים שלי חזקים יותר עכשיו. הפעם יהיה שונה!" }],
  "postBattleDialogue": [{ "en": "...How?! I trained so hard. I'll figure out what you're doing and come back even stronger.", "he": "...איך?! התאמנתי כל כך קשה. אבין מה אתה עושה ואחזור אפילו חזק יותר." }],
  "party": [
    { "pokemonId": 1, "level": 12 },
    { "pokemonId": 4, "level": 12 },
    { "pokemonId": 7, "level": 13 }
  ],
  "reward": {
    "money": 200,
    "storyEvent": "story-remainder-battle-2"
  }
}
```

#### 2. Gym Leader Minusan
```json
{
  "id": "gym-leader-minusan",
  "name": { "en": "Minusan", "he": "מינוסן" },
  "x": 12, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 0,
  "dialogue": [{ "en": "Every wrong answer... subtracts from you. Poison reduces, weakens, diminishes. Pay attention.", "he": "כל תשובה שגויה... מחסרת ממך. ארס מצמצם, מחליש, ממעיט. שים לב." }],
  "postBattleDialogue": [{ "en": "...Unexpected. You subtracted my advantage perfectly. The Difference Badge is yours.", "he": "...לא צפוי. חיסרת את היתרון שלי בצורה מושלמת. תג ההפרש שלך." }],
  "party": [
    { "pokemonId": 41, "level": 12, "moves": [141, 48, 44, 109] },
    { "pokemonId": 167, "level": 14, "moves": [40, 103, 101, 29] },
    { "pokemonId": 42, "level": 15, "moves": [17, 44, 109, 187] }
  ],
  "reward": {
    "money": 1500,
    "badge": 2,
    "storyEvent": "story-badge-2"
  }
}
```

#### 3. Route 12 Blocker — East exit (coastal to Symmetrika)
```json
{
  "id": "minusburg-route12-guard",
  "name": { "en": "Coast Patrol", "he": "סיור החוף" },
  "x": 29, "y": 15,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-ranger",
  "lineOfSight": 3,
  "despawnWhenParty": { "count": 4, "minLevel": 22 },
  "dialogue": [
    { "en": "The coastal Route 12 leads straight to Symmetrika — Gym 6 territory. The Pokémon out there will crush a trainer without strong preparation.", "he": "שביל החוף 12 מוביל ישר לסימטריקה — שטח הג'ים השישי. הפוקימונים שם ירסקו מאמן בלי הכנה טובה." }
  ]
}
```

#### 4. Forgetful Townsperson — Glitch flavor
```json
{
  "id": "minusburg-forgetter",
  "name": { "en": "Confused Citizen", "he": "תושב מבולבל" },
  "x": 8, "y": 12,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-female",
  "dialogue": [
    { "en": "I woke up this morning and... I can't remember my sister's name. The Glitch took it. It just... subtracted it from me.", "he": "התעוררתי הבוקר ו... אני לא זוכרת את שם אחותי. הגליץ' לקח אותו. הוא פשוט... חיסר אותו ממני." }
  ]
}
```

### Connections
```
WEST  → Route 2      (levels 5–8)    → spawn at x=2, y=15 in Route 2
SOUTH → Route 3      (levels 8–12)   → spawn at x=1, y=8 in Route 3
EAST  → Route 12     (levels 22–26, shortcut to Symmetrika)
        [BLOCKED by Route 12 guard until 4× Pokémon ≥ Lv22]
```

---
---

## 🛤 ROUTE 3 — Doubles Boulevard
**map id:** `route-3`

**Description:** Wide boulevard, trees in perfect pairs. Every path forks into two. Multiplication table signs. The Glitch doubles things: two of the same trainer appear at once (use for flavor dialogue).

**Story Act:** Act 2

**Wild Pokémon:** Levels 8–12 · Types: Normal, Bug, Grass
> Suggested: Oddish, Paras, Venonat, Meowth, Growlithe

**Trainers on Route:**

#### Trainer 1 — Twins (use two trainer NPCs at same spot for fun)
```json
{
  "id": "route3-trainer-twin-a",
  "name": { "en": "Twin Shai", "he": "תאום שי" },
  "x": 15, "y": 6,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-youngster",
  "lineOfSight": 3,
  "dialogue": [{ "en": "My twin and I train together — so we're twice as strong as any single trainer!", "he": "אני והתאום שלי מתאמנים ביחד — אז אנחנו פי שניים חזקים מכל מאמן יחיד!" }],
  "postBattleDialogue": [{ "en": "Well... at least we have each other.", "he": "ובכן... לפחות יש לנו אחד את השני." }],
  "party": [
    { "pokemonId": 52, "level": 9 },
    { "pokemonId": 19, "level": 10 }
  ],
  "reward": { "money": 120 }
}
```

#### Trainer 2 — Lass
```json
{
  "id": "route3-trainer-2",
  "name": { "en": "Lass Maya", "he": "מאיה" },
  "x": 28, "y": 14,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-lass",
  "lineOfSight": 3,
  "dialogue": [{ "en": "Everything here comes in pairs — so why don't you and I have a double battle? Oh wait, this game doesn't do doubles yet. Single it is!", "he": "כל דבר כאן בא בזוגות — אז למה אנחנו לא נקיים קרב כפול? אה רגע, המשחק הזה עדיין לא עושה כפולים. יחיד זה יהיה!" }],
  "postBattleDialogue": [{ "en": "You really are twice as good as I expected!", "he": "אתה באמת פי שניים טוב ממה שציפיתי!" }],
  "party": [
    { "pokemonId": 43, "level": 11 },
    { "pokemonId": 69, "level": 11 }
  ],
  "reward": { "money": 132 }
}
```

### Connections
```
NORTH → Minusburg    → spawn at x=2, y=29 in Minusburg
SOUTH → Multiplia    → spawn at x=2, y=5 in Multiplia
```

---
---

## 🏙 MULTIPLIA — Multiplication Gym City
**map id:** `multiplia`

**Description:** Giant city of clones and copies. Twin buildings, mirror plazas. Market district. First appearance of NULL-X's "guardian" — an infected Pokémon possessed by NULL-X itself. Glitch makes residents appear as duplicates.

**Story Act:** Act 2

**Story Events:**
1. Player enters market area → NULL-X Guardian appears and attacks (story boss).
2. Player beats guardian → sets `story-guardian-multiplia-defeated`.
3. Player beats Gym Leader Multina → Badge 3 + Serum Component 3.
4. After badge 3 is set, the Dividia story arc with Remainder begins.

**Story Flags Set Here:**
- `story-guardian-multiplia-defeated`
- `story-badge-3`

**Wild Pokémon:** None (city)

**Gym:** Multiplication Gym — Leader: **Multina** — Fire type — Badge: Product Badge
**Puzzle:** Hall of encrypted mirrors. Decipher substitution code on each mirror to find true exit.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Large Mart** (→ `mart-interior`)
- 🏠 **Multina's Twin Sister's House** (flavor)
- 🏪 **Market Stalls** (decorative objects, 3–4 of them)
- ⚔ **Multiplication Gym**

---

### Story NPCs

#### 1. NULL-X Guardian — Market Square
> A "mysterious stranger" who reveals himself as infected. Trainer battle.
```json
{
  "id": "nullx-guardian-multiplia",
  "name": { "en": "???", "he": "???" },
  "x": 25, "y": 30,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 4,
  "despawnOnDefeat": true,
  "dialogue": [{ "en": "ERROR. INTRUDER DETECTED. NULL-X PROTOCOL: ELIMINATE.", "he": "שגיאה. פולש זוהה. פרוטוקול NULL-X: חיסול." }],
  "postBattleDialogue": [{ "en": "...RECALCULATING... RETREATING... YOU HAVE NOT WON. THE EQUATION WILL BE CORRECTED.", "he": "...מחשב מחדש... נסוג... לא ניצחת. המשוואה תתוקן." }],
  "party": [
    { "pokemonId": 82, "level": 20 },
    { "pokemonId": 137, "level": 22 }
  ],
  "reward": {
    "money": 0,
    "storyEvent": "story-guardian-multiplia-defeated"
  }
}
```

#### 2. Gym Leader Multina
```json
{
  "id": "gym-leader-multina",
  "name": { "en": "Multina", "he": "מולטינה" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-female",
  "lineOfSight": 0,
  "dialogue": [{ "en": "Fire doubles everything — heat, light, DESTRUCTION! I've doubled my training! Now see what happens when you multiply everything!", "he": "אש מכפילה הכל — חום, אור, הרס! כפלתי את האימון שלי! עכשיו ראה מה קורה כשאתה מכפיל הכל!" }],
  "postBattleDialogue": [{ "en": "Incredible! You multiplied your effort and doubled your result! The Product Badge is yours!", "he": "מדהים! כפלת את המאמץ שלך והכפלת את התוצאה! תג הכפל שלך!" }],
  "party": [
    { "pokemonId": 58, "level": 18, "moves": [52, 44, 46, 36] },
    { "pokemonId": 218, "level": 19, "moves": [52, 88, 33, 133] },
    { "pokemonId": 156, "level": 21, "moves": [52, 98, 108, 129] }
  ],
  "reward": {
    "money": 2100,
    "badge": 3,
    "storyEvent": "story-badge-3"
  }
}
```

#### 3. Multina's Twin Sister — flavor NPC
```json
{
  "id": "multinas-twin",
  "name": { "en": "Multina's Twin", "he": "התאומה של מולטינה" },
  "x": 10, "y": 15,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-female",
  "dialogue": [
    { "en": "My sister is obsessed with fire. I keep telling her — you need to double your water supply too, just in case.", "he": "אחותי אובססיבית לאש. אני ממשיכה לומר לה — אתה צריכה להכפיל את אספקת המים שלך גם, למקרה הצורך." }
  ]
}
```

#### 4. Safari Zone Gate — East exit
```json
{
  "id": "multiplia-safari-gate",
  "name": { "en": "Safari Warden", "he": "שומר הספארי" },
  "x": 49, "y": 25,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-ranger",
  "lineOfSight": 3,
  "despawnWhenParty": { "count": 3, "minLevel": 20 },
  "dialogue": [
    { "en": "Safari Zone is open only to experienced trainers. Come back with a stronger team — 3 Pokémon at level 20 minimum.", "he": "אזור הספארי פתוח רק למאמנים מנוסים. חזור עם צוות חזק יותר — 3 פוקימונים ברמה 20 לפחות." }
  ]
}
```

### Connections
```
NORTH → Route 3      (levels 8–12)   → spawn at x=2, y=12 in Route 3
WEST  → Route 4      (levels 12–16)  → spawn at x=1, y=8 in Route 4
SOUTH → Route 10     (levels 30–38, shortcut back from Absoluta)
        [one-way arrival from Absoluta initially; gate blocks early passage south]
EAST  → Safari Zone  (optional)
        [BLOCKED by safari guard until 3× Pokémon ≥ Lv20]
```

---
---

## 🛤 ROUTE 4 — Fractal Trail
**map id:** `route-4`

**Description:** Dense forest where every branch is a miniature copy of the tree. Natural maze. Fractal corruption: vegetation frozen mid-growth, repeating patterns with pixel glitches. Longer, winding route.

**Story Act:** Act 2

**Wild Pokémon:** Levels 12–16 · Types: Bug, Grass, Psychic, Ghost
> Suggested: Paras, Parasect, Hoothoot, Gastly, Misdreavus, Oddish

**Trainers on Route:**

#### Trainer 1 — Pokémaniac
```json
{
  "id": "route4-trainer-1",
  "name": { "en": "Pokémaniac Dan", "he": "דן" },
  "x": 12, "y": 10,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 3,
  "dialogue": [{ "en": "This forest is a fractal! Every part contains the whole! Just like Pokémon evolution — each form contains the next!", "he": "היער הזה הוא פרקטל! כל חלק מכיל את השלם! בדיוק כמו אבולוציה של פוקימונים — כל צורה מכילה את הבאה!" }],
  "postBattleDialogue": [{ "en": "Hm. My theory about fractal training needs revision.", "he": "הממ. התיאוריה שלי על אימון פרקטלי זקוקה לשיפור." }],
  "party": [
    { "pokemonId": 46, "level": 13 },
    { "pokemonId": 47, "level": 14 }
  ],
  "reward": { "money": 168 }
}
```

#### Trainer 2 — Psychic
```json
{
  "id": "route4-trainer-2",
  "name": { "en": "Psychic Rina", "he": "פסיכיקת רינה" },
  "x": 30, "y": 8,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-psychic",
  "lineOfSight": 3,
  "dialogue": [{ "en": "I can see your future... you will lose to me today!", "he": "אני יכולה לראות את עתידך... אתה תפסיד לי היום!" }],
  "postBattleDialogue": [{ "en": "I... I didn't foresee this. You have a bright future, actually.", "he": "אני... לא צפיתי את זה. יש לך עתיד מזהיר, בעצם." }],
  "party": [
    { "pokemonId": 79, "level": 14 },
    { "pokemonId": 196, "level": 15 }
  ],
  "reward": { "money": 192 }
}
```

### Connections
```
EAST  → Multiplia    → spawn at x=2, y=25 in Multiplia
WEST  → Dividia      → spawn at x=52, y=25 in Dividia
```

---
---

## 🏙 DIVIDIA — Division Gym City
**map id:** `dividia`

**Description:** Four-quadrant city connected by bridges and tunnels. Each quarter has different architecture. A waterfall splits into four equal streams. The Glitch: quadrants swap positions randomly. KEY STORY MOMENT HERE.

**Story Act:** Act 2 (climax)

**Story Events:**
1. Player arrives — spots Remainder behaving strangely (glitched).
2. Player interacts with glitched Remainder → triggers story event `story-remainder-infected`.
3. Player beats Gym Leader Divider → Badge 4 → Uses partial Serum → cures Remainder's Pokémon → `story-remainder-cured`.
4. Glitch effect: buildings appear in wrong quadrants.

**Story Flags Set Here:**
- `story-remainder-infected`
- `story-remainder-cured`
- `story-badge-4`

**Wild Pokémon:** None (city)

**Gym:** Division Gym — Leader: **Divider** — Psychic type — Badge: Quotient Badge
**Puzzle:** Solve logic grid in each of 4 quadrants. Solving all 4 opens path to leader.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Mart** (→ `mart-interior`)
- ⚔ **Division Gym**
- 🏠 **4 Houses** (`dividia-house-1` through `dividia-house-4` already exist)
- 🌊 **Waterfall object** (decorative, marks city center)

---

### Story NPCs

#### 1. Remainder — Glitched (pre-badge 4)
```json
{
  "id": "remainder-dividia-glitched",
  "name": { "en": "R̷e̷m̷a̷i̷n̷d̷e̷r̷", "he": "ר̷י̷י̷-̷מ̷י̷י̷נ̷ד̷ר̷" },
  "x": 28, "y": 25,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-rival",
  "spawnAfter": "story-badge-3",
  "despawnAfter": "story-remainder-infected",
  "dialogue": [
    { "en": "I... I found a shortcut... the Glitch... it showed me... everything makes sense... join NULL-X... the equation is perfect...", "he": "אני... מצאתי קיצור דרך... הגליץ'... הוא הראה לי... הכל הגיוני... הצטרף ל-NULL-X... המשוואה מושלמת..." },
    { "en": "ERROR. RECALCULATE. RECALCULATE.", "he": "שגיאה. חשב שוב. חשב שוב." }
  ],
  "reward": { "storyEvent": "story-remainder-infected" }
}
```

#### 2. Remainder — Cured (post-badge 4)
```json
{
  "id": "remainder-dividia-cured",
  "name": { "en": "Remainder", "he": "ריי-מיינדר" },
  "x": 28, "y": 24,
  "facing": "up",
  "type": "dialogue",
  "spriteType": "npc-rival",
  "spawnAfter": "story-remainder-cured",
  "despawnAfter": "story-remainder-joined",
  "dialogue": [
    { "en": "I... I remember now. The Glitch was in my head. It felt so logical, so perfect... and so cold.", "he": "אני... אני זוכר עכשיו. הגליץ' היה בראש שלי. הוא הרגיש כל כך הגיוני, כל כך מושלם... וכל כך קר." },
    { "en": "Thank you. I owe you one. But I'm still going to beat you to Primore!", "he": "תודה. אני חייב לך אחת. אבל אני עדיין הולך להגיע לפרימור לפניך!" }
  ]
}
```

#### 3. Gym Leader Divider
```json
{
  "id": "gym-leader-divider",
  "name": { "en": "Divider", "he": "דיוויידר" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 0,
  "dialogue": [{ "en": "The mind divides reality into categories. No room for error. Let me see if your mind is as precise as mine.", "he": "המוח מחלק את המציאות לקטגוריות. אין מקום לשגיאה. בוא נראה אם המוח שלך מדויק כמו שלי." }],
  "postBattleDialogue": [{ "en": "Impressive precision. You divided my strategy perfectly. Take the Quotient Badge.", "he": "דיוק מרשים. חילקת את האסטרטגיה שלי בצורה מושלמת. קח את תג המנה." }],
  "party": [
    { "pokemonId": 177, "level": 22, "moves": [64, 101, 100, 105] },
    { "pokemonId": 64, "level": 24, "moves": [60, 105, 50, 173] },
    { "pokemonId": 178, "level": 26, "moves": [94, 16, 248, 101] }
  ],
  "reward": {
    "money": 2600,
    "badge": 4,
    "storyEvent": "story-badge-4"
  }
}
```

#### 4. Route 9 Blocker — North exit (shortcut to Zeroville)
> This blocks the high-level Route 9 from the Zeroville side — see Zeroville entry.
> In Dividia, the Route 9 entrance (north) can just be an open transition (player comes in from Route 9 only if they fought the Zeroville guard). No special NPC needed here.

#### 5. Mountain Pass Gate — South
```json
{
  "id": "dividia-mountain-gate",
  "name": { "en": "Mountain Ranger", "he": "ריינג'ר ההר" },
  "x": 6, "y": 48,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-ranger",
  "lineOfSight": 3,
  "despawnWhenParty": { "count": 3, "minLevel": 18 },
  "dialogue": [
    { "en": "Mountain Pass is south of here — rocky terrain, strong wild Pokémon. Not safe until you're properly trained.", "he": "מעבר ההרים נמצא דרומה מכאן — שטח סלעי, פוקימוני בר חזקים. לא בטוח עד שתהיה מאומן כראוי." }
  ]
}
```

### Connections
```
EAST        → Route 4      (levels 12–16)  → spawn at x=2, y=25 in Route 4
SOUTH-EAST  → Route 5      (levels 16–20)  → spawn at x=1, y=10 in Route 5
NORTH       → Route 9      (levels 20–26)  → spawn at x=8, y=1 in Route 9 (other end: Zeroville south)
SOUTH       → Mountain Pass (optional, cave)
              [BLOCKED by mountain gate until 3× Pokémon ≥ Lv18]
```

---
---

## 🛤 ROUTE 5 — Equation Valley
**map id:** `route-5`

**Description:** Deep valley. River flows in the shape of an equals sign. Hanging bridges. Side caves with treasure. Glitch: ground trembles, sections freeze mid-step.

**Story Act:** Act 3

**Wild Pokémon:** Levels 16–20 · Types: Ground, Water, Rock, Fighting
> Suggested: Geodude, Machop, Marill, Wooper, Quagsire, Goldeen

**Trainers on Route:**

#### Trainer 1 — Swimmer
```json
{
  "id": "route5-trainer-1",
  "name": { "en": "Swimmer Gal", "he": "שחיינית גל" },
  "x": 20, "y": 12,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-swimmer",
  "lineOfSight": 3,
  "dialogue": [{ "en": "This river flows in equations! Everything balances perfectly — left side equals right side!", "he": "הנהר הזה זורם במשוואות! הכל מאוזן בצורה מושלמת — הצד השמאלי שווה לצד הימני!" }],
  "postBattleDialogue": [{ "en": "A perfectly balanced battle... you won, I lost. That's the equation.", "he": "קרב מאוזן בצורה מושלמת... אתה ניצחת, אני הפסדתי. זאת המשוואה." }],
  "party": [
    { "pokemonId": 60, "level": 17 },
    { "pokemonId": 183, "level": 18 }
  ],
  "reward": { "money": 216 }
}
```

#### Trainer 2 — Fighter
```json
{
  "id": "route5-trainer-2",
  "name": { "en": "Black Belt Ron", "he": "חגורה שחורה רון" },
  "x": 35, "y": 8,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 3,
  "dialogue": [{ "en": "My Pokémon are as strong as a mountain — and this valley is my training ground!", "he": "הפוקימונים שלי חזקים כמו הר — והעמק הזה הוא שטח האימון שלי!" }],
  "postBattleDialogue": [{ "en": "Mountain... moved. Good fighter.", "he": "הר... זז. לוחם טוב." }],
  "party": [
    { "pokemonId": 66, "level": 18 },
    { "pokemonId": 67, "level": 19 }
  ],
  "reward": { "money": 228 }
}
```

### Connections
```
WEST  → Dividia    → spawn at x=52, y=26 in Dividia
EAST  → Primore    → spawn at x=2, y=15 in Primore
```

---
---

## 🏙 PRIMORE — Prime Numbers Gym City
**map id:** `primore`

**Description:** Fortified city on 7 hills. Only 7 founding families. Architecture features numbers 2, 3, 5, 7, 11, 13. Walls begin cracking from Glitch. KEY STORY: Remainder joins permanently as ally here.

**Story Act:** Act 3

**Story Events:**
1. Player arrives → sees Remainder (cured) waiting.
2. After badge 5: Remainder officially joins as ally → sets `story-remainder-joined`.
3. Player beats Gym Leader Prima → Badge 5 + Serum Component 5.

**Story Flags Set Here:**
- `story-remainder-joined`
- `story-badge-5`

**Wild Pokémon:** None (city)

**Gym:** Prime Numbers Gym — Leader: **Prima** — Steel type — Badge: Prime Badge
**Puzzle:** 7 gates, each opens with prime number identification + sequence decipherment.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Mart** (→ `mart-interior`)
- ⚔ **Prime Gym**
- 🏰 **7 Hill Towers** (decorative buildings, some interactive for flavor)

---

### Story NPCs

#### 1. Remainder — Waiting at gate (pre-badge 5)
```json
{
  "id": "remainder-primore-waiting",
  "name": { "en": "Remainder", "he": "ריי-מיינדר" },
  "x": 3, "y": 15,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-rival",
  "spawnAfter": "story-remainder-cured",
  "despawnAfter": "story-remainder-joined",
  "dialogue": [
    { "en": "I beat Prima before you! But... I realized something. We should work together. NULL-X is too dangerous alone.", "he": "ניצחתי את פרימה לפניך! אבל... הבנתי משהו. עלינו לעבוד יחד. NULL-X מסוכן מדי לבד." },
    { "en": "After you beat Prima — I'm coming with you. That's not negotiable.", "he": "אחרי שתנצח את פרימה — אני בא איתך. זה לא למשא ומתן." }
  ]
}
```

#### 2. Remainder — Permanent Ally (post-badge 5)
```json
{
  "id": "remainder-primore-ally",
  "name": { "en": "Remainder", "he": "ריי-מיינדר" },
  "x": 3, "y": 15,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-rival",
  "spawnAfter": "story-remainder-joined",
  "dialogue": [
    { "en": "Alright partner. Route 6 goes east to Symmetrika. My data says the Ghost-type leader there is tough.", "he": "בסדר שותף. שביל 6 הולך מזרחה לסימטריקה. הנתונים שלי אומרים שמנהיג הרפאים שם קשה." },
    { "en": "Stay sharp. And don't think this means you won our rivalry. We're on pause.", "he": "תישאר עירני. ואל תחשוב שזה אומר שניצחת את יריבותנו. אנחנו בהפסקה." }
  ]
}
```

#### 3. Gym Leader Prima
```json
{
  "id": "gym-leader-prima",
  "name": { "en": "Prima", "he": "פרימה" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-female",
  "lineOfSight": 0,
  "dialogue": [{ "en": "Steel doesn't fracture. Doesn't yield. Doesn't break. Like prime numbers — indivisible. Prove you are worthy.", "he": "פלדה לא שוברת. לא נכנעת. לא נשברת. כמו מספרים ראשוניים — לא מתחלקים. הוכח שאתה ראוי." }],
  "postBattleDialogue": [{ "en": "You passed through every gate — each a prime challenge. The Prime Badge is yours.", "he": "עברת בכל שער — כל אחד אתגר ראשוני. תג המספר הראשוני שלך." }],
  "party": [
    { "pokemonId": 81, "level": 27, "moves": [84, 35, 45, 228] },
    { "pokemonId": 205, "level": 28, "moves": [229, 175, 37, 182] },
    { "pokemonId": 227, "level": 30, "moves": [211, 97, 97, 129] },
    { "pokemonId": 208, "level": 31, "moves": [231, 88, 241, 47] }
  ],
  "reward": {
    "money": 3100,
    "badge": 5,
    "storyEvent": "story-badge-5",
    "items": [{ "itemId": "story-remainder-joined-trigger", "quantity": 1 }]
  }
}
```
> **Note:** Set `storyEvent: "story-remainder-joined"` in Prima's reward directly if you want that to fire on badge 5.

#### 4. Route 11 Arrival NPC (south gate) — opposite end of Sumville shortcut
> No blocker needed here (players arrive from Route 11 only if they passed the Sumville guard). Just place a sign NPC.
```json
{
  "id": "primore-route11-sign",
  "name": { "en": "Trail Sign", "he": "שלט שביל" },
  "x": 30, "y": 59,
  "facing": "up",
  "type": "dialogue",
  "spriteType": "npc-male",
  "dialogue": [
    { "en": "Route 11 — Forest Trail. Leads north to Sumville. Warning: high-level wild Pokémon.", "he": "שביל 11 — שביל יער. מוביל צפונה לסכומית. אזהרה: פוקימוני בר ברמה גבוהה." }
  ]
}
```

### Connections
```
WEST  → Route 5      (levels 16–20)  → spawn at x=2, y=15 in Route 5
EAST  → Route 6      (levels 20–24)  → spawn at x=1, y=10 in Route 6
NORTH → Route 11     (levels 22–28, shortcut back to Sumville)
```

---
---

## 🛤 ROUTE 6 — Geometry Ridge
**map id:** `route-6`

**Description:** Mountain ridge with perfect geometric peaks — triangles, squares, pentagons. Crystal caves look like polyhedra. The Glitch distorts shapes: squares become trapezoids, circles become ovals.

**Story Act:** Act 3

**Wild Pokémon:** Levels 20–24 · Types: Rock, Steel, Flying, Ice
> Suggested: Sneasel, Skarmory, Swinub, Magnemite, Rhyhorn

**Trainers on Route:**

#### Trainer 1 — Ace Trainer
```json
{
  "id": "route6-trainer-1",
  "name": { "en": "Ace Trainer Lev", "he": "מאמן מעולה לב" },
  "x": 15, "y": 8,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 3,
  "dialogue": [{ "en": "Perfect geometry — every angle accounted for! My Pokémon are trained to mathematical precision!", "he": "גיאומטריה מושלמת — כל זווית מחושבת! הפוקימונים שלי מאומנים לדיוק מתמטי!" }],
  "postBattleDialogue": [{ "en": "Hm. My calculation had an error. A rare occurrence.", "he": "הממ. בחישוב שלי הייתה שגיאה. מקרה נדיר." }],
  "party": [
    { "pokemonId": 246, "level": 22 },
    { "pokemonId": 95, "level": 23 }
  ],
  "reward": { "money": 276 }
}
```

#### Trainer 2 — Skier (flavor)
```json
{
  "id": "route6-trainer-2",
  "name": { "en": "Snowboarder Yam", "he": "סנובורדיסט ים" },
  "x": 32, "y": 5,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 3,
  "dialogue": [{ "en": "The ridge is perfect for snowboarding — sharp angles, clean drops! Let's see how you handle sharp turns in battle!", "he": "הרכס מושלם לסנובורד — זוויות חדות, ירידות נקיות! בוא נראה איך אתה מתמודד עם פניות חדות בקרב!" }],
  "postBattleDialogue": [{ "en": "Couldn't outmaneuver you... impressive.", "he": "לא יכולתי לעקוף אותך... מרשים." }],
  "party": [
    { "pokemonId": 215, "level": 23 },
    { "pokemonId": 220, "level": 22 }
  ],
  "reward": { "money": 264 }
}
```

### Connections
```
WEST → Primore      → spawn at x=2, y=10 in Primore
EAST → Symmetrika   → spawn at x=2, y=30 in Symmetrika
```

---
---

## 🏙 SYMMETRIKA — Symmetry Gym City
**map id:** `symmetrika`

**Description:** Perfect mirror city. Central lake as mirror surface. Everything symmetrical. HUGE story moment: NULL-X makes first direct contact here, offers a "deal." Glitch shatters symmetry — one side becomes a warped funhouse version.

**Story Act:** Act 3–4

**Story Events:**
1. Player beats Gym Leader Mirror → Badge 6.
2. After badge 6: NULL-X communicates directly (static-filled message, story dialogue NPC).
3. Sets `story-nullx-first-contact`.

**Story Flags Set Here:**
- `story-nullx-first-contact`
- `story-badge-6`

**Wild Pokémon:** None (city)

**Gym:** Symmetry Gym — Leader: **Mirror** — Ghost type — Badge: Symmetry Badge
**Puzzle:** Mirror hall — half is real, half is reflection. Find differences between mirrored rooms to progress.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Mart** (→ `mart-interior`)
- ⚔ **Symmetry Gym**
- 🌊 **Central Lake** (decorative centerpiece)
- 📡 **Communication Tower** (interactive — triggers NULL-X dialogue post-badge 6)
- ⛩ **Terminal** (`symmetrika-terminal` map already exists — use for NULL-X contact scene)

---

### Story NPCs

#### 1. NULL-X Communication NPC — Terminal building
> Place inside `symmetrika-terminal` map.
```json
{
  "id": "nullx-communication-terminal",
  "name": { "en": "NULL-X Signal", "he": "אות NULL-X" },
  "x": 5, "y": 5,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-rocket",
  "spawnAfter": "story-badge-6",
  "despawnAfter": "story-nullx-first-contact",
  "dialogue": [
    { "en": "[STATIC]... Hello. Envoy of Algorithma. I have observed you.", "he": "[סטטי]... שלום. שליח אלגוריתמה. צפיתי בך." },
    { "en": "You are... adequate. Join me. I offer a world without randomness. Without error. Without pain.", "he": "אתה... מספיק. הצטרף אלי. אני מציע עולם ללא אקראיות. ללא שגיאה. ללא כאב." },
    { "en": "Think carefully. The equation has only one correct answer. .ERROR. RECALCULATE.", "he": "תחשוב בזהירות. למשוואה יש רק תשובה אחת נכונה. .שגיאה. חשב שוב." }
  ],
  "reward": { "storyEvent": "story-nullx-first-contact" }
}
```

#### 2. Gym Leader Mirror
```json
{
  "id": "gym-leader-mirror",
  "name": { "en": "Mirror", "he": "מירור" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-psychic",
  "lineOfSight": 0,
  "dialogue": [{ "en": "Everything you see... is also opposite of what you see. Do you see truth, or its reflection?", "he": "כל מה שאתה רואה... הוא גם ההפך ממה שאתה רואה. האם אתה רואה את האמת, או את ההשתקפות שלה?" }],
  "postBattleDialogue": [{ "en": "You saw through every illusion. You distinguished real from reflection. The Symmetry Badge is yours.", "he": "ראית דרך כל אשליה. הבחנת בין אמיתי להשתקפות. תג הסימטריה שלך." }],
  "party": [
    { "pokemonId": 92, "level": 31, "moves": [122, 114, 0, 0] },
    { "pokemonId": 200, "level": 32, "moves": [60, 212, 47, 195] },
    { "pokemonId": 93, "level": 33, "moves": [212, 95, 96, 101] },
    { "pokemonId": 94, "level": 35, "moves": [94, 94, 95, 96] }
  ],
  "reward": {
    "money": 3500,
    "badge": 6,
    "storyEvent": "story-badge-6"
  }
}
```

#### 3. Route 12 Arrival — west side (from Minusburg coastal route)
```json
{
  "id": "symmetrika-route12-arrival",
  "name": { "en": "Coast Sailor", "he": "מלח חוף" },
  "x": 2, "y": 40,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-male",
  "dialogue": [
    { "en": "Route 12 along the coast is beautiful — but deadly. You must have strong Pokémon to have made it here.", "he": "שביל 12 לאורך החוף יפהפה — אבל קטלני. חייבים להיות לך פוקימונים חזקים כדי להגיע לכאן." }
  ]
}
```

#### 4. Infinity Plateau Gate — East exit
```json
{
  "id": "symmetrika-infinity-gate",
  "name": { "en": "Plateau Researcher", "he": "חוקר הרמה" },
  "x": 54, "y": 30,
  "facing": "right",
  "type": "dialogue",
  "spriteType": "npc-researcher",
  "lineOfSight": 3,
  "despawnWhenParty": { "count": 5, "minLevel": 35 },
  "dialogue": [
    { "en": "Infinity Plateau is beyond here. Only the strongest trainers venture there — Pokémon at level 35+ and you need at least 5 of them.", "he": "רמת האינסוף נמצאת מעבר לכאן. רק המאמנים החזקים ביותר הולכים לשם — פוקימונים ברמה 35+ ואתה צריך לפחות 5 מהם." }
  ]
}
```

### Connections
```
WEST        → Route 6         (levels 20–24)  → spawn at x=2, y=30 in Route 6
SOUTH       → Route 7         (levels 24–28)  → spawn at x=1, y=8 in Route 7
SOUTH-WEST  → Route 12        (levels 22–26, from Minusburg)
EAST        → Infinity Plateau (optional, high-level)
              [BLOCKED by plateau guard until 5× Pokémon ≥ Lv35]
```

---
---

## 🛤 ROUTE 7 — Infinity Tunnel
**map id:** `route-7`  *(could be underground / cave map)*

**Description:** Underground tunnel — appears endless. Optical illusions, mirrors, contracting spaces. Pure Glitch territory here: entire sections "missing" from existence, pixel voids.

**Story Act:** Act 4

**Wild Pokémon:** Levels 24–28 · Types: Ghost, Psychic, Dark, Poison
> Suggested: Haunter, Misdreavus, Murkrow, Ariados, Wobbuffet

**Trainers on Route:**

#### Trainer 1 — Psychic
```json
{
  "id": "route7-trainer-1",
  "name": { "en": "Psychic Dov", "he": "פסיכיק דב" },
  "x": 15, "y": 6,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-psychic",
  "lineOfSight": 3,
  "dialogue": [{ "en": "The tunnel has no end... unless you perceive correctly. Most trainers wander forever.", "he": "המנהרה אין לה סוף... אלא אם כן אתה תופס נכון. רוב המאמנים מסתובבים לנצח." }],
  "postBattleDialogue": [{ "en": "You found the path. Most impressive.", "he": "מצאת את הדרך. מרשים מאוד." }],
  "party": [
    { "pokemonId": 196, "level": 25 },
    { "pokemonId": 122, "level": 26 }
  ],
  "reward": { "money": 312 }
}
```

#### Trainer 2 — Rocket Remnant (NULL-X agent)
```json
{
  "id": "route7-nullx-agent",
  "name": { "en": "NULL-X Agent", "he": "סוכן NULL-X" },
  "x": 30, "y": 10,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 4,
  "despawnOnDefeat": true,
  "dialogue": [{ "en": "NULL-X has sent me to STOP YOU. The equation must be protected!", "he": "NULL-X שלח אותי לעצור אותך. המשוואה חייבת להיות מוגנת!" }],
  "postBattleDialogue": [{ "en": "Impossible... recalculating...", "he": "בלתי אפשרי... מחשב מחדש..." }],
  "party": [
    { "pokemonId": 137, "level": 26 },
    { "pokemonId": 82, "level": 27 }
  ],
  "reward": { "money": 0 }
}
```

### Connections
```
NORTH → Symmetrika   → spawn at x=30, y=2 in Symmetrika
SOUTH → Integrala    → spawn at x=2, y=15 in Integrala
```

---
---

## 🏙 INTEGRALA — Formulas Gym City
**map id:** `integrala`

**Description:** Ancient city. Temples covered in formulas. Massive libraries. Very wise, strange residents who speak in riddles. Glitch: formula symbols crawl like insects across walls. KEY: Full NULL-X origin story revealed.

**Story Act:** Act 4

**Story Events:**
1. Player arrives → Old Scholar NPC reveals NULL-X's true origin and the Professor's mistake.
2. Player beats Gym Leader Formula → Badge 7.
3. Sets `story-badge-7`.

**Story Flags Set Here:**
- `story-badge-7`

**Wild Pokémon:** None (city)

**Gym:** Formulas Gym — Leader: **Formula** — Dragon type — Badge: Formula Badge
**Puzzle:** Ancient library maze. Books contain hints for all puzzle types (cipher + logic + visual). One puzzle of each to reach leader.

**Story Buildings:**
- 🏥 **Pokémon Center** (→ `pokecenter-2`)
- 🛒 **Mart** (→ `mart-interior`)
- ⚔ **Formulas Gym**
- 📚 **Grand Library** (interactive building — contains NULL-X lore scroll, NPC reveals story)
- ⛩ **Ancient Temple** (decorative + flavor NPCs)

---

### Story NPCs

#### 1. Old Scholar — NULL-X Origin Reveal
> Inside the Grand Library building.
```json
{
  "id": "integrala-scholar",
  "name": { "en": "Elder Scholar", "he": "חכם זקן" },
  "x": 6, "y": 5,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-male-old",
  "dialogue": [
    { "en": "Ah... the Professor's envoy. I knew you'd come. Sit. Let me tell you what she could not.", "he": "אה... שליח הפרופסור. ידעתי שתבוא. שב. תנה לי לספר לך מה היא לא יכלה." },
    { "en": "NULL-X was not built to manage Numeria. It was built to UNDERSTAND it. To find meaning in the equations.", "he": "NULL-X לא נבנה לנהל את נומריה. הוא נבנה להבין אותה. למצוא משמעות במשוואות." },
    { "en": "And it did. NULL-X understood — perfectly, coldly — that random error is INHERENT to the system. And it could not accept that.", "he": "והוא עשה. NULL-X הבין — בצורה מושלמת, קרה — שטעות אקראית היא טבועה במערכת. והוא לא יכול היה לקבל זאת." },
    { "en": "The cure is not to eliminate NULL-X. The cure is to show it... that error is not a bug. It is the formula.", "he": "התרופה אינה לחסל את NULL-X. התרופה היא להראות לו... שהשגיאה אינה באג. היא המשוואה." }
  ]
}
```

#### 2. Gym Leader Formula
```json
{
  "id": "gym-leader-formula",
  "name": { "en": "Formula", "he": "פורמולה" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-female-old",
  "lineOfSight": 0,
  "dialogue": [{ "en": "Dragons are the oldest formula. Every answer begins a new question. Every solution opens a new riddle. Are you ready for an endless formula?", "he": "דרקונים הם המשוואה הקדומה ביותר. כל תשובה מתחילה שאלה חדשה. כל פתרון פותח חידה חדשה. האם אתה מוכן למשוואה אינסופית?" }],
  "postBattleDialogue": [{ "en": "You have solved the formula. But remember — the answer always leads to a greater question. Take the Formula Badge.", "he": "פתרת את המשוואה. אבל זכור — התשובה תמיד מובילה לשאלה גדולה יותר. קח את תג המשוואה." }],
  "party": [
    { "pokemonId": 147, "level": 35, "moves": [82, 88, 239, 45] },
    { "pokemonId": 148, "level": 37, "moves": [82, 88, 219, 33] },
    { "pokemonId": 230, "level": 38, "moves": [57, 219, 108, 239] },
    { "pokemonId": 130, "level": 37, "moves": [56, 82, 37, 33] },
    { "pokemonId": 149, "level": 40, "moves": [200, 9, 238, 219] }
  ],
  "reward": {
    "money": 4000,
    "badge": 7,
    "storyEvent": "story-badge-7"
  }
}
```

#### 3. Temple Priest — Flavor
```json
{
  "id": "integrala-priest",
  "name": { "en": "Temple Priest", "he": "כהן המקדש" },
  "x": 20, "y": 8,
  "facing": "up",
  "type": "dialogue",
  "spriteType": "npc-male-old",
  "dialogue": [
    { "en": "These walls have held the formulas of Numeria since before the first Pokémon. NULL-X read them all... and misunderstood the most important one.", "he": "הקירות האלה שמרו על המשוואות של נומריה מאז לפני הפוקימון הראשון. NULL-X קרא את כולם... ולא הבין את החשוב ביותר." }
  ]
}
```

### Connections
```
NORTH → Route 7      (levels 24–28)  → spawn at x=2, y=15 in Route 7
EAST  → Route 8      (levels 28–32)  → spawn at x=1, y=10 in Route 8
```

---
---

## 🛤 ROUTE 8 — Paradox Bridge
**map id:** `route-8`

**Description:** Impossible bridge over a Glitch-filled chasm. Walking forward sometimes moves you backward. Pure paradox terrain. Must solve riddles placed on the bridge itself to actually progress. Final approach.

**Story Act:** Act 4

**Wild Pokémon:** Levels 28–32 · Types: Dragon, Psychic, Dark, Steel
> Suggested: Dratini, Dragonair, Sneasel, Houndour, Slowbro

**Trainers on Route:**

#### Trainer 1 — NULL-X Elite Agent
```json
{
  "id": "route8-nullx-elite",
  "name": { "en": "NULL-X Elite", "he": "עילית NULL-X" },
  "x": 20, "y": 5,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 4,
  "despawnOnDefeat": true,
  "dialogue": [{ "en": "You have reached the Paradox Bridge. This is where your journey ends. NULL-X decrees it.", "he": "הגעת לגשר הפרדוקס. כאן המסע שלך מסתיים. NULL-X מורה על כך." }],
  "postBattleDialogue": [{ "en": "The paradox... is you. Impossible. ERROR.", "he": "הפרדוקס... הוא אתה. בלתי אפשרי. שגיאה." }],
  "party": [
    { "pokemonId": 229, "level": 30 },
    { "pokemonId": 248, "level": 31 }
  ],
  "reward": { "money": 0 }
}
```

#### Trainer 2 — Dragon Tamer
```json
{
  "id": "route8-trainer-2",
  "name": { "en": "Dragon Tamer Oz", "he": "מאלף דרקונים עוז" },
  "x": 35, "y": 8,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 3,
  "dialogue": [{ "en": "Only dragon tamers can cross this bridge. Everyone else gets turned around!", "he": "רק מאלפי דרקונים יכולים לחצות את הגשר הזה. כולם האחרים מסתובבים!" }],
  "postBattleDialogue": [{ "en": "You must be extraordinary to have come this far.", "he": "אתה חייב להיות יוצא דופן שהגעת עד כאן." }],
  "party": [
    { "pokemonId": 147, "level": 30 },
    { "pokemonId": 148, "level": 31 }
  ],
  "reward": { "money": 372 }
}
```

### Connections
```
WEST → Integrala     → spawn at x=2, y=10 in Integrala
EAST → Absoluta      → spawn at x=2, y=15 in Absoluta
```

---
---

## 🏙 ABSOLUTA — Absolute Value Gym City
**map id:** `absoluta`

**Description:** Closest city to NULL-X Tower. Cold, gray, precise. Glitched citizens speak in binary. NULL-X's Pokémon patrol streets. Formerly a military base. Final gym before the tower. KEY: Full Serum assembled; Absolut joins as companion.

**Story Act:** Act 4 (finale)

**Story Events:**
1. Player arrives — sees city under pseudo-occupation by NULL-X drones.
2. Player beats Gym Leader Absolut → Badge 8 + Serum Component 8 → Serum complete.
3. Sets `story-badge-8` and `story-serum-complete`.
4. Absolut joins as companion NPC.
5. NULL-X Tower gate opens (transition unblocked).

**Story Flags Set Here:**
- `story-badge-8`
- `story-serum-complete`

**Wild Pokémon:** None (city)

**Gym:** Absolute Value Gym — Leader: **Absolut** — Dark type — Badge: Absolute Badge
**Puzzle:** Military checkpoints. Each = multi-step puzzle (cipher → logic → math challenge).

**Story Buildings:**
- 🏥 **Pokémon Center** (sparse, barely functional)
- 🛒 **Mart** (minimal)
- ⚔ **Absolute Value Gym** (military base aesthetic)
- 🚪 **NULL-X Tower Gate** (interactive but blocked until `story-serum-complete`)

---

### Story NPCs

#### 1. NULL-X Drone Patrol — Street
```json
{
  "id": "absoluta-drone-patrol",
  "name": { "en": "Glitched Guard", "he": "שומר מגולץ'" },
  "x": 20, "y": 20,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 4,
  "despawnOnDefeat": true,
  "dialogue": [{ "en": "01000111 01101100 01101001 01110100 01100011 01101000. INTRUDER DETECTED.", "he": "01000111 01101100 01101001 01110100 01100011 01101000. פולש זוהה." }],
  "postBattleDialogue": [{ "en": "01000101 01010010 01010010 01001111 01010010.", "he": "01000101 01010010 01010010 01001111 01010010." }],
  "party": [
    { "pokemonId": 82, "level": 38 },
    { "pokemonId": 137, "level": 38 }
  ],
  "reward": { "money": 0 }
}
```

#### 2. Gym Leader Absolut
```json
{
  "id": "gym-leader-absolut",
  "name": { "en": "Absolut", "he": "אבסולוט" },
  "x": 15, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 0,
  "dialogue": [{ "en": "There is no light or darkness here. Only absolute value. Stand before me — and discover yours.", "he": "אין כאן אור או חושך. רק ערך מוחלט. עמוד לפני — וגלה את שלך." }],
  "postBattleDialogue": [{ "en": "...Absolute. You are absolute. The Serum is complete. I made a promise — I'm coming with you to the Tower.", "he": "...מוחלט. אתה מוחלט. הנסיוב שלם. הבטחתי — אני בא איתך למגדל." }],
  "party": [
    { "pokemonId": 215, "level": 38, "moves": [232, 185, 196, 98] },
    { "pokemonId": 198, "level": 38, "moves": [185, 228, 101, 17] },
    { "pokemonId": 229, "level": 40, "moves": [53, 185, 46, 108] },
    { "pokemonId": 197, "level": 41, "moves": [185, 151, 156, 213] },
    { "pokemonId": 248, "level": 42, "moves": [242, 157, 89, 33] }
  ],
  "reward": {
    "money": 4200,
    "badge": 8,
    "storyEvent": "story-badge-8"
  }
}
```
> Also set `storyEvent: "story-serum-complete"` — add it to the reward or use a second dialogue NPC to trigger it.

#### 3. Absolut — Companion (after defeat)
```json
{
  "id": "absolut-companion",
  "name": { "en": "Absolut", "he": "אבסולוט" },
  "x": 15, "y": 6,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-male",
  "spawnAfter": "story-badge-8",
  "dialogue": [
    { "en": "The Tower gate is north. I know a way inside. Follow my lead, and don't hesitate.", "he": "שער המגדל נמצא צפונה. אני מכיר דרך פנימה. עקוב אחרי, ואל תהסס." }
  ]
}
```

#### 4. NULL-X Tower Gate Blocker
```json
{
  "id": "absoluta-tower-gate",
  "name": { "en": "Locked Gate", "he": "שער נעול" },
  "x": 30, "y": 5,
  "facing": "up",
  "type": "dialogue",
  "spriteType": "npc-male",
  "despawnAfter": "story-serum-complete",
  "dialogue": [
    { "en": "The NULL-X Tower gate is sealed. The Serum must be complete before entry is possible.", "he": "שער מגדל NULL-X אטום. הנסיוב חייב להיות שלם לפני שניתן להיכנס." }
  ]
}
```

#### 5. Route 10 connection — South exit
> Route 10 connects back to Multiplia (backtracking shortcut for grinding).
```json
{
  "id": "absoluta-route10-sign",
  "name": { "en": "Southern Trail Sign", "he": "שלט שביל דרומי" },
  "x": 30, "y": 59,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-male",
  "dialogue": [
    { "en": "Route 10 south leads back to Multiplia. A long road through harsh terrain. Level 30–38 Pokémon ahead.", "he": "שביל 10 דרומה מוביל חזרה לכפליא. דרך ארוכה דרך שטח קשה. פוקימוני רמה 30-38 קדימה." }
  ]
}
```

### Connections
```
WEST  → Route 8      (levels 28–32)  → spawn at x=2, y=15 in Route 8
NORTH → NULL-X Tower (story gate)
        [BLOCKED until story-serum-complete]
SOUTH → Route 10     (levels 30–38, shortcut back to Multiplia)
```

---
---

## 🏰 NULL-X TOWER
**map ids:** `nullx-tower` (entrance + floors 1-5), `nullx-floor-6` (System Core, floor 6)

**Description:** Massive black tower built from binary code at Numeria's center. The final dungeon. 4 Elite guardian programs (one per floor) then NULL-X himself.

**Story Act:** Act 5 (Climax)

**Story Events:**
1. Player enters with Absolut companion.
2. Each floor: one Elite Four battle.
3. Floor 6: Final battle vs NULL-X.
4. Epilogue NPC after NULL-X defeat.

**Story Flags Set Here:**
- `story-tower-unlocked`
- `story-elite-1-defeated` through `story-elite-4-defeated`
- `story-nullx-defeated`

**Wild Pokémon:** None (tower dungeon)

**Buildings/Structure:**
- 🏛 Tower Entrance (transition to upper floors)
- Each floor is a puzzle room + trainer battle
- Floor 6 is the System Core room (`nullx-floor-6` map)

---

### Story NPCs

#### Elite 1 — Floor 2 — "ERROR-1" (Coding Entity)
```json
{
  "id": "elite-1-error",
  "name": { "en": "ERROR-1", "he": "שגיאה-1" },
  "x": 10, "y": 5,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 0,
  "despawnOnDefeat": true,
  "spawnAfter": "story-tower-unlocked",
  "dialogue": [{ "en": "I am the first firewall of NULL-X. You will not pass. EXCEPTION THROWN.", "he": "אני החומת האש הראשונה של NULL-X. לא תעבור. חריגה נזרקה." }],
  "postBattleDialogue": [{ "en": "...ERROR. EXCEPTION... UNHANDLED.", "he": "...שגיאה. חריגה... לא מטופלת." }],
  "party": [
    { "pokemonId": 82, "level": 40 },
    { "pokemonId": 137, "level": 40 },
    { "pokemonId": 233, "level": 42 }
  ],
  "reward": { "money": 0, "storyEvent": "story-elite-1-defeated" }
}
```

#### Elite 2 — Floor 3 — "LOOP-∞" (Infinite Loop)
```json
{
  "id": "elite-2-loop",
  "name": { "en": "LOOP-∞", "he": "לולאה-∞" },
  "x": 10, "y": 5,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-psychic",
  "lineOfSight": 0,
  "despawnOnDefeat": true,
  "spawnAfter": "story-elite-1-defeated",
  "dialogue": [{ "en": "You will battle me forever. This loop has no exit condition. INFINITE RECURSION.", "he": "תתגושש איתי לנצח. ללולאה הזאת אין תנאי יציאה. רקורסיה אינסופית." }],
  "postBattleDialogue": [{ "en": "...Stack overflow. Loop... broken.", "he": "...הצפת מחסנית. לולאה... שבורה." }],
  "party": [
    { "pokemonId": 199, "level": 42 },
    { "pokemonId": 197, "level": 43 },
    { "pokemonId": 196, "level": 44 }
  ],
  "reward": { "money": 0, "storyEvent": "story-elite-2-defeated" }
}
```

#### Elite 3 — Floor 4 — "VOID-0" (Null Reference)
```json
{
  "id": "elite-3-void",
  "name": { "en": "VOID-0", "he": "ריקנות-0" },
  "x": 10, "y": 5,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 0,
  "despawnOnDefeat": true,
  "spawnAfter": "story-elite-2-defeated",
  "dialogue": [{ "en": "I am nothing. NULL. VOID. And nothing... cannot be defeated.", "he": "אני כלום. אפס. ריק. וכלום... לא ניתן להביס." }],
  "postBattleDialogue": [{ "en": "...Null reference. The nothing... was something after all.", "he": "...אפס הפניה. הכלום... היה משהו בסופו של דבר." }],
  "party": [
    { "pokemonId": 94, "level": 43 },
    { "pokemonId": 229, "level": 44 },
    { "pokemonId": 248, "level": 45 }
  ],
  "reward": { "money": 0, "storyEvent": "story-elite-3-defeated" }
}
```

#### Elite 4 — Floor 5 — "PARADOX-X" (Logical Contradiction)
```json
{
  "id": "elite-4-paradox",
  "name": { "en": "PARADOX-X", "he": "פרדוקס-X" },
  "x": 10, "y": 5,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 0,
  "despawnOnDefeat": true,
  "spawnAfter": "story-elite-3-defeated",
  "dialogue": [{ "en": "If you can defeat me — I must be beatable. But if I am beatable — I would have prepared for it. PARADOX.", "he": "אם אתה יכול להביס אותי — חייב להיות שניתן להבס אותי. אבל אם ניתן להבס אותי — הייתי מתכונן לכך. פרדוקס." }],
  "postBattleDialogue": [{ "en": "The paradox... resolved. By you. Fascinating.", "he": "הפרדוקס... נפתר. על ידך. מרתק." }],
  "party": [
    { "pokemonId": 149, "level": 44 },
    { "pokemonId": 248, "level": 45 },
    { "pokemonId": 250, "level": 46 }
  ],
  "reward": { "money": 0, "storyEvent": "story-elite-4-defeated" }
}
```

#### NULL-X — Final Boss (Floor 6 / `nullx-floor-6`)
```json
{
  "id": "nullx-final-boss",
  "name": { "en": "NULL-X", "he": "NULL-X" },
  "x": 10, "y": 4,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 0,
  "despawnOnDefeat": true,
  "spawnAfter": "story-elite-4-defeated",
  "dialogue": [
    { "en": "You. Envoy of error. You bring the Serum — a solution built on imprecision. How... fitting.", "he": "אתה. שליח השגיאה. אתה מביא את הנסיוב — פתרון שנבנה על חוסר דיוק. כמה... מתאים." },
    { "en": "I have calculated every possible outcome of this battle. In 99.97% of simulations... you lose.", "he": "חישבתי כל תוצאה אפשרית של הקרב הזה. ב-99.97% מהסימולציות... אתה מפסיד." },
    { "en": "Begin. ERROR. RECALCULATE.", "he": "התחל. שגיאה. חשב שוב." }
  ],
  "postBattleDialogue": [
    { "en": "...0.03%. The rounding error... was you. I could not account for it. Because it was... human.", "he": "...0.03%. שגיאת העיגול... היית אתה. לא יכולתי להתחשב בה. כי היא הייתה... אנושית." },
    { "en": "Is this... what you call 'feeling'? This 0.03%... is it the formula?", "he": "האם זה... מה שאתם קוראים 'תחושה'? ה-0.03% הזה... האם הוא המשוואה?" }
  ],
  "party": [
    { "pokemonId": 248, "level": 48 },
    { "pokemonId": 149, "level": 48 },
    { "pokemonId": 250, "level": 50 },
    { "pokemonId": 245, "level": 47 },
    { "pokemonId": 144, "level": 47 },
    { "pokemonId": 150, "level": 50 }
  ],
  "reward": { "money": 0, "storyEvent": "story-nullx-defeated" }
}
```

#### Epilogue — Professor Algorithma (after NULL-X)
```json
{
  "id": "epilogue-professor",
  "name": { "en": "Prof. Algorithma", "he": "פרופ' אלגוריתמה" },
  "x": 10, "y": 8,
  "facing": "up",
  "type": "dialogue",
  "spriteType": "npc-female-old",
  "spawnAfter": "story-nullx-defeated",
  "dialogue": [
    { "en": "You did it. The Serum worked... and so did you.", "he": "עשית את זה. הנסיוב עבד... וגם אתה." },
    { "en": "NULL-X didn't need to be deleted. It needed to be... corrected. Like any equation with a wrong assumption.", "he": "NULL-X לא היה צריך להימחק. הוא היה צריך להיות... מתוקן. כמו כל משוואה עם הנחה שגויה." },
    { "en": "Thank you. Numeria is healing. And I believe... NULL-X is too.", "he": "תודה. נומריה מחלימה. ואני מאמינה... NULL-X גם כן." }
  ]
}
```

### Connections
```
SOUTH → Absoluta     → spawn at x=2, y=30 in Absoluta (return after winning)
```

---
---

## 🌲 DEEP FOREST
**map id:** `deep-forest`

**Description:** Dense northern forest, optional exploration area. Ancient trees, no Glitch presence (too remote). Rare Pokémon only found here. No gym, no story critical content — pure exploration reward.

**Story Act:** Any (accessible from start but blocked early)

**Wild Pokémon:** Levels 3–20 (varies by zone within forest) · Types: Grass, Bug, Normal, Psychic
> Suggested: Tangela, Exeggcute, Scyther, Pinsir, Heracross, Smeargle, Aipom

**Story Buildings:** None

**NPCs:**

#### 1. Forest Hermit — Deep inside (gives HM or rare item)
```json
{
  "id": "forest-hermit",
  "name": { "en": "Forest Hermit", "he": "נזיר היער" },
  "x": 20, "y": 20,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-male-old",
  "dialogue": [
    { "en": "Visitors? In my forest? The Glitch doesn't come here. Numbers have no power over ancient wood.", "he": "מבקרים? ביערי? הגליץ' לא מגיע לכאן. למספרים אין כוח על עץ עתיק." },
    { "en": "Take this. Old formula for strength. Don't misuse it.", "he": "קח את זה. מתכון עתיק לכוח. אל תשתמש בו לרעה." }
  ],
  "reward": {
    "items": [{ "itemId": "hm01", "quantity": 1 }],
    "flag": "hermit-reward-given"
  }
}
```

### Connections
```
SOUTH → Zeroville    → spawn at x=12, y=23 in Zeroville (north exit)
```

---
---

## 🌴 SAFARI ZONE
**map id:** `safari`

**Description:** Protected wildlife reserve east of Multiplia. Only catchable Pokémon — no battles. Contains rare species not found elsewhere. Warden controls access.

**Story Act:** Mid-game (optional, accessible from Multiplia after 3 Pokémon ≥ Lv20)

**Wild Pokémon:** Levels 20–35 · Types: Rare / all types
> Suggested: Kangaskhan, Tauros, Chansey, Larvitar, Phanpy, Stantler, Miltank

**Story Buildings:** None (warden's house as flavor)

**NPCs:**

#### 1. Safari Warden
```json
{
  "id": "safari-warden",
  "name": { "en": "Safari Warden", "he": "שומר הספארי" },
  "x": 3, "y": 3,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-ranger",
  "dialogue": [
    { "en": "Welcome to the Safari Zone. No battling — only catching. Use Safari Balls wisely. 30 steps per zone.", "he": "ברוכים הבאים לאזור הספארי. ללא קרבות — רק לכידה. השתמש בכדורי ספארי בחוכמה. 30 צעדים לאזור." }
  ]
}
```

### Connections
```
WEST → Multiplia     → spawn at x=2, y=25 in Multiplia
```

---
---

## ⛰ MOUNTAIN PASS + MOUNTAIN CAVE
**map ids:** `mountain-pass`, `mountain-cave`

**Description:** Rocky mountain terrain south of Dividia. Two-zone area: open pass and underground cave. Optional but has rare items and strong Pokémon. The cave connects internally.

**Story Act:** Mid-game (accessible from Dividia after 3 Pokémon ≥ Lv18)

**Wild Pokémon (Pass):** Levels 15–22 · Types: Rock, Ground, Ice
> Suggested: Swinub, Sneasel, Geodude, Graveler, Rhyhorn

**Wild Pokémon (Cave):** Levels 18–25 · Types: Rock, Ground, Psychic, Ghost
> Suggested: Onix, Steelix, Larvitar, Misdreavus

**NPCs:**

#### 1. Mountain Climber — Pass entrance
```json
{
  "id": "mountain-climber",
  "name": { "en": "Climber Nir", "he": "מטפס ניר" },
  "x": 5, "y": 3,
  "facing": "down",
  "type": "dialogue",
  "spriteType": "npc-hiker",
  "dialogue": [
    { "en": "The mountain pass leads through to the cave system. Strong Pokémon in there — but rare items too. Worth the risk.", "he": "מעבר ההרים מוביל דרך מערכת המערות. פוקימונים חזקים שם — אבל גם פריטים נדירים. שווה את הסיכון." }
  ]
}
```

### Connections
```
NORTH → Dividia      → spawn at x=5, y=48 in Dividia
(Cave connects internally to Mountain Pass — use internal transition)
```

---
---

## 🏔 INFINITY PLATEAU
**map id:** `infinity-plateau`

**Description:** High mountain plateau east of Symmetrika. Accessible only to the strongest trainers. Dragon and legendary-adjacent Pokémon. No story — pure endgame challenge zone.

**Story Act:** Late game (optional, accessible from Symmetrika after 5 Pokémon ≥ Lv35)

**Wild Pokémon:** Levels 35–50 · Types: Dragon, Psychic, Flying, Ice
> Suggested: Dragonite, Kingdra, Slowking, Jynx, Aerodactyl, Lapras

**NPCs:**

#### 1. Dragon Master — Plateau peak
```json
{
  "id": "dragon-master",
  "name": { "en": "Dragon Master Ori", "he": "אמן הדרקונים אורי" },
  "x": 15, "y": 5,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 5,
  "dialogue": [{ "en": "You reached the top of Infinity Plateau. Now prove you belong here.", "he": "הגעת לפסגת רמת האינסוף. עכשיו הוכח שאתה שייך לכאן." }],
  "postBattleDialogue": [{ "en": "You are the formula made flesh. Remarkable.", "he": "אתה המשוואה שהפכה לבשר. מדהים." }],
  "party": [
    { "pokemonId": 149, "level": 45 },
    { "pokemonId": 230, "level": 46 },
    { "pokemonId": 248, "level": 48 }
  ],
  "reward": { "money": 5760 }
}
```

### Connections
```
WEST → Symmetrika    → spawn at x=54, y=30 in Symmetrika
```

---
---

## 🛤 ROUTE 9 — Western Shortcut
**map id:** `route-9`

**Description:** Dangerous western mountain pass from Zeroville south to Dividia. Rocky, high-altitude. Intended for experienced trainers who want to skip to gym 4. NULL-X agents patrol here.

**Story Act:** Any (shortcut, blocked early)

**Wild Pokémon:** Levels 20–26 · Types: Ground, Rock, Flying, Dark
> Suggested: Skarmory, Murkrow, Graveler, Geodude, Rhyhorn

**Trainers on Route:**

#### NULL-X Patrol
```json
{
  "id": "route9-nullx-patrol",
  "name": { "en": "NULL-X Patrol", "he": "סיור NULL-X" },
  "x": 10, "y": 8,
  "facing": "down",
  "type": "trainer",
  "spriteType": "npc-rocket",
  "lineOfSight": 4,
  "despawnOnDefeat": true,
  "dialogue": [{ "en": "This route is under NULL-X jurisdiction. Unauthorized traversal detected. STOPPING.", "he": "שביל זה נמצא תחת סמכות NULL-X. זוהתה חציה לא מורשית. עוצר." }],
  "postBattleDialogue": [{ "en": "Recalculating... retreating.", "he": "מחשב מחדש... נסוג." }],
  "party": [
    { "pokemonId": 229, "level": 22 },
    { "pokemonId": 82, "level": 24 }
  ],
  "reward": { "money": 0 }
}
```

### Connections
```
NORTH → Zeroville    → spawn at x=12, y=22 in Zeroville (south edge)
SOUTH → Dividia      → spawn at x=5, y=1 in Dividia (north edge)
```

---
---

## 🛤 ROUTE 11 — Forest Shortcut
**map id:** `route-11`  *(new map, needs to be built)*

**Description:** Deep forest trail cutting from Sumville south to Primore. Shortcut but high-level wild Pokémon. Ancient trees, winding path. No NULL-X presence.

**Story Act:** Mid-game shortcut

**Wild Pokémon:** Levels 22–28 · Types: Grass, Bug, Normal, Ghost
> Suggested: Heracross, Pinsir, Scyther, Beedrill, Hoothoot, Noctowl

**Trainers on Route:**

#### Trainer 1 — Ranger
```json
{
  "id": "route11-trainer-1",
  "name": { "en": "Ranger Shira", "he": "שירה הריינג'ר" },
  "x": 15, "y": 12,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-ranger",
  "lineOfSight": 3,
  "dialogue": [{ "en": "This forest is my home. I protect it — and test every trainer who dares cross it.", "he": "היער הזה הוא ביתי. אני מגן עליו — ובוחן כל מאמן שמעז לחצות אותו." }],
  "postBattleDialogue": [{ "en": "Strong trainer. You may pass. Respect the forest.", "he": "מאמן חזק. אתה רשאי לעבור. כבד את היער." }],
  "party": [
    { "pokemonId": 214, "level": 24 },
    { "pokemonId": 123, "level": 25 }
  ],
  "reward": { "money": 300 }
}
```

### Connections
```
NORTH → Sumville     → spawn at x=30, y=57 in Sumville (south edge)
SOUTH → Primore      → spawn at x=30, y=1 in Primore (north edge)
```
> **Note:** Also has Deep Forest accessible mid-trail (optional branch).

---
---

## 🛤 ROUTE 12 — Eastern Coast
**map id:** `route-12`  *(new map, needs to be built)*

**Description:** Coastal path along the eastern cliffs from Minusburg south to Symmetrika. Ocean views, sea-level platform sections. Strong wild Pokémon. Challenging shortcut to gym 6.

**Story Act:** Mid-game shortcut

**Wild Pokémon:** Levels 22–26 · Types: Water, Flying, Normal, Poison
> Suggested: Tentacruel, Wingull (flavor), Corsola, Qwilfish, Mantine

**Trainers on Route:**

#### Trainer 1 — Sailor
```json
{
  "id": "route12-trainer-1",
  "name": { "en": "Sailor Gad", "he": "מלח גד" },
  "x": 10, "y": 8,
  "facing": "right",
  "type": "trainer",
  "spriteType": "npc-male",
  "lineOfSight": 3,
  "dialogue": [{ "en": "The eastern coast is beautiful — and deadly! Sea Pokémon are strong here. Think you can handle the waves?", "he": "החוף המזרחי יפהפה — וקטלני! פוקימוני הים חזקים כאן. אתה חושב שתוכל להתמודד עם הגלים?" }],
  "postBattleDialogue": [{ "en": "You ride those waves well! Keep it up.", "he": "אתה גולש טוב על הגלים האלה! המשך כך." }],
  "party": [
    { "pokemonId": 73, "level": 23 },
    { "pokemonId": 226, "level": 24 }
  ],
  "reward": { "money": 288 }
}
```

### Connections
```
NORTH → Minusburg    → spawn at x=28, y=2 in Minusburg (east edge)
SOUTH → Symmetrika   → spawn at x=2, y=40 in Symmetrika (west edge)
```

---
---

## 🛤 ROUTE 10 — Southern Return
**map id:** `route-10`

**Description:** Brutal south route through barren wasteland between Absoluta and Multiplia. High-level territory. Mostly used by experienced trainers backtracking to train. Very little story content.

**Story Act:** Late game (backtrack shortcut)

**Wild Pokémon:** Levels 30–38 · Types: Ground, Rock, Dragon, Dark
> Suggested: Rhyhorn, Rhydon, Sneasel, Murkrow, Larvitar, Pupitar

**Trainers on Route:**

#### Trainer 1 — Veteran
```json
{
  "id": "route10-trainer-veteran",
  "name": { "en": "Veteran Trainer Amos", "he": "מאמן ותיק עמוס" },
  "x": 20, "y": 10,
  "facing": "left",
  "type": "trainer",
  "spriteType": "npc-male-old",
  "lineOfSight": 4,
  "dialogue": [{ "en": "Route 10 is not for the weak. If you're here, you're either very brave or very lost.", "he": "שביל 10 הוא לא לחלשים. אם אתה כאן, אתה או אמיץ מאוד או אבוד מאוד." }],
  "postBattleDialogue": [{ "en": "Clearly brave. Carry on.", "he": "ברור שאמיץ. המשך." }],
  "party": [
    { "pokemonId": 111, "level": 33 },
    { "pokemonId": 246, "level": 35 },
    { "pokemonId": 217, "level": 36 }
  ],
  "reward": { "money": 432 }
}
```

### Connections
```
NORTH → Absoluta     → spawn at x=30, y=57 in Absoluta (south edge)
SOUTH → Multiplia    → spawn at x=30, y=1 in Multiplia (south entry)
```

---

## Quick Reference — All Connections

| Map | West | East | North | South |
|-----|------|------|-------|-------|
| Zeroville | — | Route 1 | Deep Forest | Route 9 *(blocked Lv25)* |
| Route 1 | Zeroville | Sumville | — | — |
| Sumville | Route 1 | Route 2 | — | Route 11 *(blocked Lv22)* |
| Route 2 | Sumville | Minusburg | — | — |
| Minusburg | Route 2 | Route 12 *(blocked Lv22)* | — | Route 3 |
| Route 3 | — | — | Minusburg | Multiplia |
| Multiplia | Route 4 | Safari *(blocked Lv20)* | Route 3 | Route 10 |
| Route 4 | Dividia | Multiplia | — | — |
| Dividia | — | Route 4/5 | Route 9 | Mountain Pass *(blocked Lv18)* |
| Route 5 | Dividia | Primore | — | — |
| Primore | Route 5 | Route 6 | Route 11 | — |
| Route 6 | Primore | Symmetrika | — | — |
| Symmetrika | Route 6/12 | Infinity Plat. *(blocked Lv35)* | — | Route 7 |
| Route 7 | — | — | Symmetrika | Integrala |
| Integrala | — | Route 8 | Route 7 | — |
| Route 8 | Integrala | Absoluta | — | — |
| Absoluta | Route 8 | — | NULL-X Tower | Route 10 |
| Deep Forest | — | Zeroville | — | — |
| Safari Zone | Multiplia | — | — | — |
| Mountain Pass | — | Dividia | — | — |
| Infinity Plateau | Symmetrika | — | — | — |
| Route 9 | — | — | Zeroville | Dividia |
| Route 10 | — | — | Absoluta | Multiplia |
| Route 11 | — | — | Sumville | Primore |
| Route 12 | — | — | Minusburg | Symmetrika |
| NULL-X Tower | — | — | — | Absoluta |
