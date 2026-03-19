# Sprint 2 - Integration & Visual Upgrade
**תאריך:** 2026-03-19
**מטרה:** חיבור כל חלקי Sprint 1 למשחק עובד + שדרוג ויזואלי ותיקון גופנים

---

## סטטוס כללי

| סוכן | משימה | בראנצ' | סטטוס | QA |
|-------|--------|--------|--------|-----|
| frontend-developer | גופן פיקסל + תיקון עברית | `feature/pixel-font` | ✅ | ✅ |
| asset-manager | ספרייטים אמיתיים + tilesets | `feature/real-assets` | ⬜ | ⬜ |
| game-engine-developer | Wild encounter → battle → back | `feature/encounter-flow` | ✅ | ⬜ |
| game-engine-developer | Save/Load system | `feature/save-system` | ✅ | ✅ |
| frontend-developer | Audio manager + BGM | `feature/audio` | ⬜ | ⬜ |

**מקרא:** ⬜ לא התחיל | 🔄 בעבודה | ✅ הושלם | ❌ נכשל - דורש תיקון

---

## 1. frontend-developer → `feature/pixel-font` ⭐ HIGH PRIORITY

### תיאור
תיקון הגופן - נראות טובה יותר, תמיכה בעברית קריאה. זה דחוף כי כרגע הטקסט כמעט לא קריא.

### משימות
- [x] **1.1** מצא/הורד pixel font שתומך בעברית + אנגלית:
  - Option A: Google Fonts - "Press Start 2P" (אנגלית) + "Rubik" / "Assistant" (עברית, נראה טוב בגודל קטן)
  - Option B: מצא bitmap font שתומך Unicode Hebrew range
  - Option C: ייצר bitmap font atlas מ-system font בגודל pixel
- [x] **1.2** עדכן `src/engine/renderer.ts` - שימוש בגופן החדש בכל drawText
- [x] **1.3** ודא שעברית RTL עובדת נכון בכל מקום:
  - Title screen subtitle
  - Text box dialogues
  - Battle messages
- [x] **1.4** תקן גודל פונט - minimum 8px ב-native resolution (24px בתצוגה 3x)
- [x] **1.5** הוסף font loading ב-game.ts - שהפונט נטען לפני שהמשחק מתחיל (prevent FOUT)

### Acceptance Criteria
- [ ] טקסט אנגלי קריא וברור בסגנון פיקסל
- [ ] טקסט עברי קריא וברור, RTL תקין
- [ ] כל הטקסט במשחק משתמש בפונט החדש

---

## 2. asset-manager → `feature/real-assets` ⭐ HIGH PRIORITY

### תיאור
החלפת כל ה-placeholder מלבנים בספרייטים אמיתיים מ-PokeAPI ו-Spriters Resource.

### משימות
- [ ] **2.1** עדכן את ה-battle scene לטעון Pokemon sprites אמיתיים:
  - Front sprite לפוקימון יריב מ-`public/sprites/pokemon/front/{id}.png`
  - Back sprite לפוקימון שחקן מ-`public/sprites/pokemon/back/{id}.png`
  - שימוש ב-sprite-loader.ts הקיים
- [ ] **2.2** הורד player overworld sprite מ-Spriters Resource (Gold/Silver):
  - 4 כיוונים × 3 frames (stand, walk1, walk2)
  - שמור ב-`public/sprites/characters/player.png`
  - עדכן overworld.ts להשתמש ב-sprite במקום מלבן כחול
- [ ] **2.3** הורד tileset בסיסי מ-Spriters Resource:
  - Outdoor tileset (grass, path, trees, water, tall grass)
  - שמור ב-`public/sprites/tilesets/outdoor.png`
  - עדכן tilemap.ts לרנדר tiles מה-tileset במקום מלבנים צבעוניים
- [ ] **2.4** הורד UI frames מ-Spriters Resource:
  - Text box border
  - Battle HUD frame
  - Menu frame
  - שמור ב-`public/sprites/ui/`
- [ ] **2.5** הורד battle backgrounds:
  - Grass/outdoor battle BG
  - שמור ב-`public/sprites/battle/bg_grass.png`
  - עדכן battle scene להציג רקע

### Acceptance Criteria
- [ ] קרבות מציגים Pokemon sprites אמיתיים (לא מלבנים)
- [ ] השחקן ב-overworld הוא ספרייט אמיתי עם אנימציית הליכה
- [ ] Tiles ב-overworld הם גרפיקה אמיתית (לא מלבנים צבעוניים)
- [ ] Battle scene יש רקע אמיתי

---

## 3. game-engine-developer → `feature/encounter-flow`

### תיאור
חיבור overworld → battle → חזרה. כשהשחקן דורך על tall grass ויש encounter, נכנסים לקרב אמיתי עם פוקימון אקראי, ובסיום חוזרים ל-overworld.

### משימות
- [x] **3.1** יצירת `src/systems/encounter.ts`:
  - Encounter table per area (מאיזה פוקימונים ובאיזה levels)
  - פונקציה שמגרילה פוקימון פראי לפי האזור
  - שימוש בדאטה האמיתי מ-`pokemon.json`
- [x] **3.2** חיבור overworld → battle:
  - כשיש encounter ב-overworld → transition to battle scene
  - Battle scene מקבלת: פוקימון השחקן + פוקימון פראי
  - Fade to black transition
- [x] **3.3** חיבור battle → overworld:
  - ניצחון: XP + חזרה ל-overworld
  - הפסד: חזרה ל-Pokemon Center (לעת עתה חזרה ל-spawn)
  - בריחה: חזרה ל-overworld
- [x] **3.4** Battle עם נתונים אמיתיים:
  - Math difficulty לפי power של ה-move (משתמש ב-movePowerToMathDifficulty)
  - Damage formula עם stats אמיתיים
  - Type effectiveness מ-type-chart.json
- [x] **3.5** XP & Level up:
  - XP gain after winning battle
  - Level up check (simple formula: need level*100 XP)
  - Stat increase on level up
  - Move learning placeholder (just log it for now)
- [x] **3.6** Starter Pokemon:
  - בתחילת המשחק (אחרי title) → בחירת starter: Cyndaquil / Totodile / Chikorita
  - UI פשוט: 3 אפשרויות עם שם + type + sprite
  - הפוקימון הנבחר נכנס ל-party של השחקן

### Acceptance Criteria
- [ ] הליכה על tall grass → encounter → קרב אמיתי
- [ ] קרב עם math problems לפי רמת ה-move
- [ ] ניצחון נותן XP, הפסד מחזיר ל-spawn
- [ ] בחירת starter בתחילת המשחק

---

## 4. game-engine-developer → `feature/save-system`

### תיאור
שמירה וטעינה של מצב המשחק ב-localStorage.

### משימות
- [x] **4.1** עדכון `src/systems/save.ts`:
  - `saveGame(state: PlayerData): void` — serialize to JSON, save to localStorage
  - `loadGame(): PlayerData | null` — load from localStorage, deserialize
  - `hasSavedGame(): boolean`
  - `deleteSave(): void`
- [x] **4.2** Auto-save triggers:
  - שמירה אחרי כל קרב שנגמר
  - שמירה בכניסה לעיר/אזור חדש
- [x] **4.3** Title screen integration:
  - אם יש save → הצג "Continue" + "New Game"
  - אם אין save → הצג רק "New Game"
  - Continue → טען save → overworld במיקום האחרון
- [x] **4.4** PlayerData includes:
  - Party (Pokemon array)
  - Position (map + x,y)
  - Badges, serum parts, money
  - Pokedex (seen/caught)
  - Playtime

### Acceptance Criteria
- [x] שחקן יכול לסגור ולפתוח מחדש - המשחק ממשיך מאיפה שהפסיק
- [x] Title screen מציג Continue כשיש save

---

## 5. frontend-developer → `feature/audio`

### תיאור
מוזיקת רקע ואפקטי סאונד בסיסיים עם Howler.js.

### משימות
- [ ] **5.1** יצירת `src/audio/audio-manager.ts` מלא:
  - `playMusic(trackName)` — play + loop
  - `stopMusic(fade?)` — stop with optional fade
  - `playSfx(sfxName)` — one-shot sound effect
  - `setVolume(category, level)` — music/sfx/master
  - `crossfade(fromTrack, toTrack, duration)` — smooth transition
- [ ] **5.2** הורד 3-5 טראקים חיוניים מ-Khinsider Gold/Silver OST:
  - Title screen music
  - Town/overworld music (New Bark Town)
  - Route/wild area music (Route 29)
  - Wild battle music
  - Victory fanfare
  - שמור ב-`public/audio/music/`
- [ ] **5.3** הורד SFX בסיסיים מ-Pokemon Showdown:
  - Menu select beep
  - Menu cancel
  - Hit/damage
  - Text scroll blip
  - שמור ב-`public/audio/sfx/`
- [ ] **5.4** שלב audio ב-scenes:
  - Title: play title music
  - Overworld: play town/route music
  - Battle: crossfade to battle music
  - Victory: play victory fanfare
  - Scene transition: stop/crossfade
- [ ] **5.5** Volume control:
  - Default: music 50%, sfx 70%
  - Mute button (M key)

### Acceptance Criteria
- [ ] מוזיקה מתנגנת ב-title screen
- [ ] מוזיקה משתנה בין overworld ו-battle
- [ ] SFX בסיסיים עובדים (menu, hit)
- [ ] M = mute/unmute

---

## QA Checklist

### feature/pixel-font
- [x] `tsc --noEmit` = 0 errors
- [x] טקסט אנגלי קריא (Press Start 2P pixel font)
- [x] טקסט עברי קריא + RTL (Rubik font, auto-detected)
- [x] פונט נטען לפני תחילת משחק (loadFonts() in main.ts)

### feature/real-assets
- [ ] `tsc --noEmit` = 0 errors
- [ ] Pokemon sprites נטענים בקרב
- [ ] Player sprite עם אנימציית הליכה
- [ ] Tiles אמיתיים ב-overworld

### feature/encounter-flow ✅
- [x] `tsc --noEmit` = 0 errors
- [x] `npm test` passes
- [x] Tall grass → encounter → battle → back to overworld
- [x] Math difficulty matches move power
- [x] XP gained after win
- [x] Starter selection works

### feature/save-system
- [ ] `tsc --noEmit` = 0 errors
- [ ] Save → close → reopen → Continue → same position
- [ ] New Game works when save exists

### feature/audio
- [ ] `tsc --noEmit` = 0 errors
- [ ] Music plays on title + overworld + battle
- [ ] Crossfade between scenes
- [ ] M key mutes/unmutes

---

## QA Findings Log

### feature/pixel-font
```
Status: ✅ Passed
Tested: 2026-03-19
Findings:
  - tsc --noEmit: 0 errors
  - npm test: 124/124 passed
  - All font sizes >= 8px (verified via grep on committed files)
  - No hardcoded 'monospace' in any scene/UI file
  - Google Fonts loaded via <link> with display=block
  - loadFonts() awaited before game.start() — prevents FOUT
  - Hebrew auto-detection via fontFor() in renderer
  - Merged to main (fast-forward)
```

### feature/real-assets
```
Status: ⬜ Not tested
Findings: -
```

### feature/encounter-flow
```
Status: ✅ PASS
Date: 2026-03-19
tsc --noEmit: 0 errors
npm test: 62/62 passed
Findings:
  - All acceptance criteria met
  - Tall grass → encounter → battle → overworld flow works
  - Math difficulty correctly mapped from move power via generateProblem()
  - XP gain uses (baseExp * level) / 7 formula, level-up recalculates stats
  - Starter selection: Cyndaquil/Totodile/Chikorita at level 5 with real moves
  - Type effectiveness + STAB + math bonus in damage formula
  - Save/load integration with position restore
Minor notes (non-blocking):
  - enemyTurn() has no guard for empty moves array (mitigated by encounter system always providing moves)
  - startEncounterTransition() has no guard for empty party (mitigated by starter selection guaranteeing 1+ Pokemon)
```

### feature/save-system
```
Status: ✅ PASS
Date: 2026-03-19
tsc --noEmit: 0 errors
npm test: 62/62 passed
vite build: success (31 modules, 169 kB gzipped 31 kB)
Findings:
  - save.ts exports saveGame/loadGame/hasSave/deleteSave (low-level localStorage API)
  - game-state.ts wraps save.ts with hasSavedGame/autoSave/loadSavedGame/startNewGame (high-level API)
  - Title screen: hasSavedGame() gates "Continue" option; "New Game" always shown
  - Auto-save triggers: after battle win (goBack), after battle loss (handleLoss), on overworld enter/exit
  - PlayerData includes: party, position (mapId+x,y), badges, serumParts, money, pokedex, playtime
  - Playtime tracked in overworld update() via getPlayerData().playtime += dt
  - All acceptance criteria met
Minor notes (non-blocking):
  - save.ts uses slot-based API (SAVE_KEY_PREFIX + slot) but only slot 0 is used currently
  - No save data versioning/migration yet (noted as TODO in save.ts)
```

### feature/audio
```
Status: ⬜ Not tested
Findings: -
```
