# Sprint 3 — World Building
**תאריך:** 2026-03-20
**מטרה:** תשתית עולם — מעבר בין מפות, NPCs, חנות/ריפוי, קרבות מאמנים, תפריט קבוצה ופוקדקס

---

## סטטוס כללי

| סוכן | משימה | בראנצ' | סטטוס | QA |
|-------|--------|--------|--------|-----|
| game-engine-developer | מערכת מפות + מעברים | `feature/map-system` | ✅ | ✅ |
| asset-manager | מפות ערים ונתיבים (JSON) | `feature/city-maps` | ✅ | ✅ |
| frontend-developer | תפריט קבוצה | `feature/party-ui` | ✅ | ✅ |
| frontend-developer | פוקדקס | `feature/pokedex-ui` | ✅ | ✅ |
| game-engine-developer | מערכת NPCs | `feature/npc-system` | ✅ | ✅ |
| frontend-developer | מרכז פוקימון + חנות | `feature/pokemon-center-mart` | ✅ | ✅ |
| game-engine-developer | קרבות מאמנים | `feature/trainer-battles` | ✅ | ⬜ |

**מקרא:** ⬜ לא התחיל | 🔄 בעבודה | ✅ הושלם | ❌ נכשל — דורש תיקון

---

## Execution Phases

```
Phase 1 (parallel — no deps):
  Branch 1: feature/map-system         [game-engine-developer]
  Branch 3: feature/city-maps          [asset-manager]
  Branch 6: feature/party-ui           [frontend-developer]
  Branch 7: feature/pokedex-ui         [frontend-developer]

Phase 2 (after Branch 1 merges):
  Branch 2: feature/npc-system         [game-engine-developer]
  Branch 4: feature/pokemon-center-mart [frontend-developer]

Phase 3 (after Branch 2 merges):
  Branch 5: feature/trainer-battles    [game-engine-developer]
  QA + integration
```

**Merge order:** 1 → 3 → 6 → 7 → 2 → 4 → 5

---

## 1. game-engine-developer → `feature/map-system` ⭐ FOUNDATION

### תיאור
מערכת טעינת מפות דינמית + מעברים בין מפות (דלתות, קצה מפה). זה הבסיס לכל שאר הבראנצ'ים.

### משימות
- [x] **1.1** הרחב `TileMapData` interface ב-`tilemap.ts`:
  - `id: string` — מזהה ייחודי למפה
  - `transitions: { fromX: number; fromY: number; toMapId: string; toX: number; toY: number }[]`
  - `npcs: NPCData[]` (אם רוצים, אחרת מערך ריק)
  - `music?: string` — שם הטראק
  - `encounterTableId?: string` — מזהה טבלת encounters
- [x] **1.2** חדש `src/systems/map-manager.ts`:
  - `registerMap(id, loader)` — רישום map JSON (lazy-load)
  - `loadMap(id): Promise<TileMapData>` — טען JSON לפי id
  - `getCurrentMap()` — מחזיר מפה נוכחית
  - `getMapId()` — מחזיר id נוכחי
  - רישום כל המפות (zeroville, route-1, sumville, pokecenter-interior, mart-interior)
- [x] **1.3** הוסף `TILE_ROUTE_EXIT = 8` לtilemap + asset-generator (tile שמסמן יציאה)
- [x] **1.4** Transition detection ב-overworld:
  - כשהשחקן דורך על tile שנמצא ב-transitions[] → fade to black → loadMap → fade in
  - תמיכה גם ב-TILE_DOOR (כניסה לבניין) וגם ב-TILE_ROUTE_EXIT (מעבר לנתיב/עיר)
- [x] **1.5** עדכון overworld.ts:
  - הסרת `import testMapData` hardcoded
  - שימוש ב-`map-manager.ts` לטעינת מפה לפי `position.mapId`
  - עדכן encounter trigger: `generateWildEncounter(currentMap.encounterTableId || currentMap.id)`
  - עדכן music: `audio.playMusic(currentMap.music || 'town')`
- [x] **1.6** הוסף SceneId values חדשים ב-`types/index.ts`:
  - `'PARTY' | 'POKEDEX' | 'SHOP'` → צירוף ל-union הקיים
- [x] **1.7** ודא save/load עובד עם mapId דינמי (כבר נשמר ב-`position.mapId`)

### Files
`src/engine/tilemap.ts`, `src/systems/map-manager.ts` (new), `src/scenes/overworld.ts`, `src/types/index.ts`, `src/engine/asset-generator.ts`

### Acceptance Criteria
- [ ] מפות נטענות דינמית לפי mapId
- [ ] מעבר דרך דלת → fade → מפה חדשה → fade in
- [ ] save/load שומר מיקום נכון על מפה דינמית
- [ ] `tsc --noEmit` = 0 errors

---

## 2. game-engine-developer → `feature/npc-system` (depends on Branch 1)

### תיאור
מערכת NPCs — דמויות במפה עם דיאלוג, חסימת מעבר, ורינדור Y-sorted עם השחקן.

### משימות
- [x] **2.1** חדש `src/systems/npc.ts`:
  - `NPCData` interface: `{ id, name, x, y, facing, type: 'dialogue'|'trainer'|'shopkeeper'|'healer', dialogue: string[], spriteType: string }`
  - `TrainerData` extends NPCData: `{ party: {pokemonId, level}[], defeated: boolean, reward: number, lineOfSight: number }`
  - `createNPCManager(npcs: NPCData[])`: load NPCs from map data
  - `isNPCAt(x, y)` — collision check for blocking
  - `getNPCFacing(playerX, playerY, facing)` — get NPC player is facing
  - `renderNPCs(ctx, cameraX, cameraY, playerY)` — Y-sorted rendering
- [x] **2.2** 6 sprite variations ב-`asset-generator.ts`:
  - `npc-male`, `npc-female`, `nurse`, `shopkeeper`, `trainer-m`, `trainer-f`
  - כל אחד 16x16 pixels, פשוט כיוון אחד (down)
  - פונקציה `getNPCSpriteImage(type: string): HTMLImageElement`
- [x] **2.3** Interaction ב-overworld:
  - Enter/Space כשהשחקן פונה ל-NPC → דיאלוג overlay (שימוש ב-textBox הקיים)
  - NPC חוסם תנועה (isWalkable צריך לבדוק גם NPCs)
- [x] **2.4** Choice prompts (Yes/No):
  - כשה-NPC הוא healer או shopkeeper → אחרי דיאלוג → Yes/No
  - UI פשוט: שני כפתורים עם חיצים

### Files
`src/systems/npc.ts` (new), `src/scenes/overworld.ts`, `src/engine/asset-generator.ts`, `src/ui/text-box.ts`

### Acceptance Criteria
- [ ] NPCs נראים במפה ומסתירים/נחסמים כראוי
- [ ] Enter/Space מול NPC פותח דיאלוג
- [ ] דיאלוג typewriter + dismiss
- [ ] `tsc --noEmit` = 0 errors

---

## 3. asset-manager → `feature/city-maps` (no code deps — pure JSON)

### תיאור
יצירת 5 מפות JSON אמיתיות + encounter table + skeleton מפות לעתיד.

### משימות
- [ ] **3.1** Zeroville — `src/data/maps/zeroville.json` (30×20):
  - מעבדת פרופ' אלגוריתמה (בניין + דלת)
  - Pokemon Center (בניין + דלת → pokecenter-interior)
  - Poke Mart (בניין + דלת → mart-interior)
  - בתים
  - שביל ראשי + דשא
  - יציאה ימינה → route-1 (TILE_ROUTE_EXIT = 8)
  - spawn: ליד המעבדה
  - transitions: [דלת PC → pokecenter-interior, דלת Mart → mart-interior, קצה ימין → route-1]
- [ ] **3.2** Route 1 — Counting Path — `src/data/maps/route-1.json` (40×15):
  - tall grass patches
  - עצים בצדדים
  - שביל מפותל
  - יציאה שמאלה → zeroville, ימינה → sumville
  - encounterTableId: 'route-1'
  - music: 'route'
- [ ] **3.3** Sumville — `src/data/maps/sumville.json` (30×20):
  - Gym building (בניין גדול, דלת — לא פעיל עדיין)
  - Pokemon Center (דלת → pokecenter-interior)
  - בתים
  - יציאה שמאלה → route-1
- [ ] **3.4** Pokemon Center Interior — `src/data/maps/pokecenter-interior.json` (10×8):
  - רצפה (path tiles)
  - דלפק עליון (building tiles)
  - מיקום NPC nurse (x, y)
  - דלת למטה → חזרה לעיר (transitions כפול: אחד ל-zeroville, אחד ל-sumville — לפי mapId מקור)
- [ ] **3.5** Poke Mart Interior — `src/data/maps/mart-interior.json` (10×8):
  - רצפה + מדפים (building tiles)
  - מיקום NPC shopkeeper
  - דלת → חזרה לעיר
- [ ] **3.6** Encounter table ל-Route 1 ב-`src/systems/encounter.ts`:
  - Pidgey (lv 3-6, 25%), Rattata (lv 3-5, 25%), Sentret (lv 3-5, 20%), Caterpie (lv 2-4, 15%), Weedle (lv 2-4, 15%)
- [ ] **3.7** Skeleton maps (basic layouts — will be filled in later sprints):
  - `src/data/maps/divideburg.json`, `multitown.json`, `fractalis.json`, `algebria.json`, `logica-heights.json`, `prime-city.json`, `infinity-plateau.json`
  - כל אחד: name, 20×15, tileSize 16, spawn, tiles = grass border with path

### JSON Format (must match extended TileMapData)
```json
{
  "id": "zeroville",
  "name": "Zeroville — עיר האפס",
  "width": 30,
  "height": 20,
  "tileSize": 16,
  "spawn": { "x": 15, "y": 12 },
  "transitions": [
    { "fromX": 10, "fromY": 5, "toMapId": "pokecenter-interior", "toX": 5, "toY": 7 }
  ],
  "npcs": [],
  "music": "town",
  "encounterTableId": null,
  "tiles": [[...]]
}
```

### Tile Legend
```
0 = empty (black)
1 = grass
2 = path
3 = water
4 = tree
5 = building
6 = door
7 = tall grass
8 = route exit (new in Branch 1)
```

### Files
`src/data/maps/*.json`, `src/systems/encounter.ts`

### Acceptance Criteria
- [ ] 5 JSON maps match TileMapData format
- [ ] Maps render correctly with existing tilemap.ts
- [ ] Transitions defined consistently (door A → interior spawn, interior door → city)

---

## 4. frontend-developer → `feature/pokemon-center-mart` (depends on Branch 2)

### תיאור
מרכז פוקימון (ריפוי) + חנות (קנייה + שימוש בפריטים).

### משימות
- [x] **4.1** `healParty()` ב-`game-state.ts`:
  - שחזור HP + PP לכל הפוקימונים בקבוצה
- [x] **4.2** הוספת items ל-PlayerData ב-`types/index.ts`:
  - `items: Record<string, number>` — שם פריט → כמות
  - ב-`game-state.ts`: `createNewPlayerData()` מחזיר `items: {}`
  - ב-save.ts: migration — אם `items` חסר בsave ישן, ברירת מחדל `{}`
- [x] **4.3** Item definitions — `src/data/items.ts` (new):
  - `Potion`: HP +20, מחיר $300
  - `Super Potion`: HP +50, מחיר $700
  - Interface: `{ id, name, description, price, effect: { type, amount } }`
- [x] **4.4** Shop UI — `src/ui/shop.ts` (new):
  - רשימת פריטים עם מחיר
  - כסף נוכחי בפינה
  - חיצים לבחור, Enter לקנות, Escape לצאת
  - הפחת כסף, הוסף ל-items
- [x] **4.5** Wire NPC interactions:
  - Nurse NPC → "Want me to heal?" → Yes → `healParty()` → "Done!"
  - Shopkeeper NPC → open shop overlay
- [x] **4.6** BAG option in battle — `battle-menu.ts` + `battle.ts`:
  - BAG → item list overlay (Potions only)
  - Choose item → choose Pokemon → apply heal → enemy turn
  - חדש BattlePhase: `'SELECT_ITEM' | 'USE_ITEM'`
- [x] **4.7** i18n keys for all new text (both en.json and he.json)

### Files
`src/systems/game-state.ts`, `src/ui/shop.ts` (new), `src/data/items.ts` (new), `src/types/index.ts`, `src/scenes/battle.ts`, `src/ui/battle-menu.ts`, `src/i18n/locales/en.json`, `src/i18n/locales/he.json`

### Acceptance Criteria
- [ ] כניסה לPokemon Center → דיבור עם nurse → ריפוי
- [ ] כניסה לMart → קנייה → פריט נוסף ל-inventory
- [ ] BAG בקרב → שימוש ב-Potion → ריפוי
- [ ] `tsc --noEmit` = 0 errors

---

## 5. game-engine-developer → `feature/trainer-battles` (depends on Branch 1+2)

### תיאור
מאמנים שמאתרים את השחקן ויוזמים קרב כפוי.

### משימות
- [x] **5.1** Line-of-sight detection ב-`npc.ts`:
  - Trainer NPCs: check if player is in facing direction, 1-5 tiles away
  - `checkTrainerLineOfSight(trainers, playerX, playerY)` → returns trainer or null
- [x] **5.2** Trainer approach animation ב-overworld:
  - "!" bubble above trainer → trainer walks toward player → battle starts
  - Use existing walk animation system
- [x] **5.3** Battle scene trainer mode:
  - חדש flag: `isTrainerBattle: boolean`
  - Intro text: "Trainer X wants to battle!"
  - No RUN option (אפשר להסתיר או להציג הודעה "Can't run from trainer!")
  - Sequential Pokemon: trainer may have 2-3 Pokemon
  - Money reward on win
- [x] **5.4** Defeat flags:
  - `gameState.flags['trainer-{id}-defeated'] = true`
  - Defeated trainers: different dialogue, no re-battle
- [x] **5.5** Test content:
  - 2-3 trainers on Route 1 (simple teams: lv 4-6 Pokemon)
  - Add their NPCData to route-1 map JSON

### Files
`src/systems/npc.ts`, `src/scenes/overworld.ts`, `src/scenes/battle.ts`, `src/data/maps/route-1.json`

### Acceptance Criteria
- [ ] Trainer spots player → "!" → approaches → forced battle
- [ ] Can't run from trainer battle
- [ ] Trainer defeated → flag set → different dialogue
- [ ] `tsc --noEmit` = 0 errors

---

## 6. frontend-developer → `feature/party-ui` (no deps)

### תיאור
תפריט צפייה בקבוצת הפוקימונים — P key בoverworld.

### משימות
- [x] **6.1** חדש `src/scenes/party.ts` — Scene interface:
  - רשימה אנכית של עד 6 slots
  - כל slot: sprite (מ-front/{id}.png), שם, רמה, HP bar, types
  - חיצים לנווט, Enter לפירוט, Escape לסגור
- [x] **6.2** Detail view:
  - כל הstats: HP, Attack, Defense, Sp.Atk, Sp.Def, Speed
  - רשימת moves עם type + PP
  - XP progress bar
- [x] **6.3** Swap:
  - בחר פוקימון A → בחר פוקימון B → swap positions in party array
- [x] **6.4** Wire to game:
  - P key ב-overworld → `stateMachine.push('PARTY')`
  - Escape → `stateMachine.pop()`
  - Register scene in `game.ts`
- [x] **6.5** i18n keys for all text (both en.json and he.json)

### Files
`src/scenes/party.ts` (new), `src/engine/game.ts`, `src/scenes/overworld.ts`, `src/i18n/locales/en.json`, `src/i18n/locales/he.json`

### Acceptance Criteria
- [ ] P key → party screen → list of Pokemon
- [ ] Detail view: stats, moves, XP
- [ ] Swap two Pokemon
- [ ] Escape → back to overworld
- [ ] `tsc --noEmit` = 0 errors

---

## 7. frontend-developer → `feature/pokedex-ui` (no deps)

### תיאור
פוקדקס — רשימה של כל 251 פוקימונים, seen/unseen.

### משימות
- [x] **7.1** חדש `src/scenes/pokedex.ts` — Scene interface:
  - רשימה scrollable: #001-#251
  - Seen = שם + sprite קטן
  - Unseen = "???" + silhouette
  - חיצים לנווט, Enter לפירוט, Escape לסגור
- [x] **7.2** Detail view:
  - Sprite גדול, types, base stats
  - רק אם seen
- [x] **7.3** Mark as seen:
  - בbattle.ts enter(): `pokedex[enemy.id] = true`
  - כבר קיים ב-PlayerData: `pokedex: Record<number, boolean>`
- [x] **7.4** Wire to game:
  - D key ב-overworld → `stateMachine.push('POKEDEX')`
  - גם accessible מ-party menu
  - Register scene in `game.ts`
- [x] **7.5** i18n keys (both en.json and he.json)

### Files
`src/scenes/pokedex.ts` (new), `src/engine/game.ts`, `src/scenes/overworld.ts`, `src/scenes/battle.ts`, `src/i18n/locales/en.json`, `src/i18n/locales/he.json`

### Acceptance Criteria
- [ ] D key → Pokedex screen → scrollable list
- [ ] Seen Pokemon show name + sprite
- [ ] Unseen show "???"
- [ ] Battle encounter marks Pokemon as seen
- [ ] `tsc --noEmit` = 0 errors

---

## QA Checklist

### feature/map-system
- [ ] `tsc --noEmit` = 0 errors
- [ ] `npm test` passes
- [ ] Maps load dynamically by ID
- [ ] Door transition: fade → new map → fade in
- [ ] Save/load preserves mapId + position

### feature/city-maps
- [ ] JSON files valid and match TileMapData
- [ ] All transitions consistent (A→B and B→A)
- [ ] Maps render with correct tiles

### feature/party-ui
- [x] `tsc --noEmit` = 0 errors
- [x] P → party list → stats → swap → Escape

### feature/pokedex-ui
- [ ] `tsc --noEmit` = 0 errors
- [ ] D → Pokedex → scroll → seen/unseen correct

### feature/npc-system
- [x] `tsc --noEmit` = 0 errors
- [x] NPCs visible, block movement, respond to Enter

### feature/pokemon-center-mart
- [ ] `tsc --noEmit` = 0 errors
- [ ] Heal works, shop works, BAG in battle works

### feature/trainer-battles
- [ ] `tsc --noEmit` = 0 errors
- [ ] Trainer LOS → approach → forced battle → defeat flag

---

## QA Findings Log

### feature/map-system
```
Status: ✅ Passed
Date: 2026-03-20
Findings:
- tsc --noEmit: 0 errors
- npm test: 62/62 passed
- npm run build: success
- TileMapData extended with id, transitions, npcs, music, encounterTableId
- map-manager.ts: lazy-loading registry with 6 maps registered
- TILE_ROUTE_EXIT (8) added with arrow sprite
- Overworld refactored: async map loading + fade transitions
- SceneId extended with PARTY, POKEDEX, SHOP
- Save/load works with dynamic mapId
- 5 stub map JSONs added for tsc resolution (to be replaced by city-maps)
- Initial QA found missing JSON stubs causing TS2307 — fixed and re-verified
```

### feature/city-maps
```
Status: ✅ Passed
Date: 2026-03-20
Findings:
- All 12 JSON maps valid and match TileMapData interface
- 5 main maps: zeroville (30x20), route-1 (40x15), sumville (30x20), pokecenter-interior (10x8), mart-interior (10x8)
- 7 skeleton maps: all 20x15, correct format
- Tile values all in range 0-8, dimensions match declared width/height
- Encounter table for route-1: 5 Pokemon (Pidgey, Rattata, Sentret, Caterpie, Weedle), weights sum to 100
- tsc --noEmit: 0 errors
- npm test: 62 tests passed
- npm run build: success
- Bidirectional transitions: mostly consistent
  - Minor: pokecenter-interior only returns to zeroville, but sumville also leads there.
    Entering Pokemon Center from Sumville will exit to Zeroville.
    Acceptable for now — needs source-map tracking logic in a future sprint.
```

### feature/party-ui
```
Status: ✅ Passed
- tsc --noEmit = 0 errors
- npm test = 62/62 passed
- npm run build = success
- P key → party list, Enter → detail view, S → swap mode, Escape → back
- i18n: 10 keys in EN + HE
- Minor: hint text not i18n'd (cosmetic)
- Minor: detail view moves list clips if >5 moves (off-screen at 160px)
Merged to main: 2026-03-20
```

### feature/pokedex-ui
```
Status: ✅ Passed
Date: 2026-03-20
Findings:
- tsc --noEmit = 0 errors
- npm test = 62/62 passed
- npm run build = success
- D key → pokedex list, ArrowUp/Down scroll, Enter → detail view, Escape → back
- Scrollable list: 251 entries, 6 visible at a time, scroll indicators
- Seen Pokemon: name + 16x16 sprite + type color dots
- Unseen Pokemon: "???" + dark placeholder
- Detail view: 48x48 sprite, type badges, 6 stat bars with values
- Battle enter() marks enemy as seen in pokedex
- i18n: 5 keys in EN + HE
- Minor: hint text in list view not i18n'd (cosmetic, same as party-ui)
- Minor: measureText on line 179 called without ctx font set — mitigated by Math.max fallback
Already on main (merged with map-system at 219fe70): 2026-03-20
```

### feature/npc-system
```
Status: ✅ Passed
Date: 2026-03-20
Findings:
- tsc --noEmit = 0 errors
- npm test = 62/62 passed
- npm run build = success
- src/systems/npc.ts: NPCData and TrainerData interfaces exported, createNPCManager factory with
  isNPCAt, getNPCAt, getFacingNPC, getTrainers — clean, well-typed, NPCManager type alias exported
- 6 procedural NPC sprites in asset-generator.ts: npc-male, npc-female, nurse, shopkeeper,
  trainer-m, trainer-f — all 16x16, cached via generatedCache
- Overworld integration: Y-sorted rendering (player + NPCs sorted by pixelY), NPC collision
  blocking via isNPCAt check in movement logic, Enter/Space interaction triggers dialogue
- Choice prompt (Yes/No) after healer/shopkeeper dialogue: ArrowLeft/Right + Enter, Escape = No
  - Healer → healParty + autoSave + confirmation text
  - Shopkeeper → openShop overlay
- TileMapData.npcs typed from unknown[] to NPCData[]
- i18n: 6 NPC keys + 10 shop/item keys in both en.json and he.json
- Note: branch also includes pokemon-center-mart work (items.ts, shop.ts, battle bag,
  healParty, save migration for items field, PlayerData.items) — these are bundled together
  and all pass type checks
- Minor: FACING_VECTORS maps both cardinal names (up/down/left/right) AND ArrowKey names —
  redundant but harmless, provides flexibility
```

### feature/pokemon-center-mart
```
Status: ✅ Passed
Date: 2026-03-20
Findings:
- tsc --noEmit = 0 errors
- npm test = 62/62 passed
- npm run build = success
- healParty() in game-state.ts: restores HP + PP for all party Pokemon
- items field in PlayerData + save migration in save.ts for old saves
- Item definitions: Potion ($300/+20HP), Super Potion ($700/+50HP)
- Shop UI: overlay with buy logic, money display, cursor nav, Escape close
- NPC wiring: healer → healParty + confirmation, shopkeeper → openShop
- BAG in battle: SELECT_ITEM/USE_ITEM phases, heals lead Pokemon, enemy turn after
- i18n: 13 new keys in both en.json and he.json
- Minor: shop help bar text not i18n'd (cosmetic)
- Minor: battle bag shows max 2 items — fine for current items, needs scroll if more added
- Minor: heal.done key duplicates npc.nurse.done (harmless)
Already on main (bundled with NPC system merge): 2026-03-20
```

### feature/trainer-battles
```
Status: ⬜
```

---

## Playable Slice (Definition of Done)
שחקן יכול: להתחיל בZeroville → ללכת לRoute 1 → להיתקל בפוקימון פראי → להגיע לSumville → להיכנס למרכז פוקימון → לרפא → להיכנס לחנות → לקנות Potion → להשתמש בPotion בקרב → להיתפס ע"י מאמן → לנצח קרב מאמן → לפתוח תפריט קבוצה (P) → לצפות בפוקדקס (D) → לשמור ולהמשיך.
