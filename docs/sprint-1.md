# Sprint 1 - Foundation
**תאריך:** 2026-03-19
**מטרה:** בניית הבסיס הטכני - מנוע מתמטיקה, pipeline דאטה, מערכת overworld, ומערכת קרב בסיסית

---

## סטטוס כללי

| סוכן | משימה | בראנצ' | סטטוס | QA |
|-------|--------|--------|--------|-----|
| math-engine-developer | מנוע מתמטיקה מלא | `feature/math-engine` | ✅ הושלם | ✅ |
| game-engine-developer | מערכת Overworld + תנועה | `feature/overworld` | ⬜ לא התחיל | ⬜ |
| asset-manager | PokeAPI data pipeline + sprites | `feature/pokeapi-pipeline` | ⬜ לא התחיל | ⬜ |
| frontend-developer | Battle UI + Math Input | `feature/battle-ui` | ⬜ לא התחיל | ⬜ |

**מקרא:** ⬜ לא התחיל | 🔄 בעבודה | ✅ הושלם | ❌ נכשל - דורש תיקון

---

## 1. math-engine-developer → `feature/math-engine`

### תיאור
בנה את מנוע ייצור התרגילים המלא עם כל 6 רמות הקושי, adaptive difficulty, ומיפוי לנזק קרב.

### משימות
- [x] **1.1** יצירת `src/math/math-engine.ts` עם פונקציית `generateProblem(difficulty: MathDifficulty)` שמייצרת תרגילים דינמיים
- [x] **1.2** רמה 1: חיבור וחיסור חד-ספרתי (0-9, ללא תוצאות שליליות)
- [x] **1.3** רמה 2: חיבור וחיסור דו-ספרתי (10-99)
- [x] **1.4** רמה 3: כפל חד-ספרתי (טבלאות 1-9)
- [x] **1.5** רמה 4: כפל וחילוק (עד 12×12, חילוק ללא שארית)
- [x] **1.6** רמה 5: פעולות מעורבות + סדר פעולות (כולל סוגריים)
- [x] **1.7** רמה 6: ביטויים מורכבים + שברים פשוטים (1/2, 1/4, 3/4)
- [x] **1.8** יצירת `src/math/adaptive-difficulty.ts` - מערכת קושי אדפטיבי:
  - 3 תשובות נכונות ברצף → הגדלת מורכבות
  - 2 שגויות ברצף → הקטנת מורכבות
  - מעקב אחר streak ו-success rate
- [x] **1.9** מיפוי `movePowerToMathDifficulty(power: number): MathDifficulty`:
  - power 1-40 → difficulty 1
  - power 41-60 → difficulty 2
  - power 61-80 → difficulty 3
  - power 81-100 → difficulty 4
  - power 101-120 → difficulty 5
  - power 121+ → difficulty 6
- [x] **1.10** יצירת `src/math/math-engine.test.ts` - טסטים:
  - 100 תרגילים לכל רמה → כל התשובות נכונות
  - אין תוצאות שליליות ברמות 1-2
  - חילוק ללא שארית ברמה 4
  - מספרים בטווח המוגדר

### Interfaces
```typescript
generateProblem(difficulty: MathDifficulty, adaptiveState?: AdaptiveState): MathProblem
validateAnswer(problem: MathProblem, answer: number): MathResult
createAdaptiveState(): AdaptiveState
updateAdaptiveState(state: AdaptiveState, result: MathResult): AdaptiveState
movePowerToMathDifficulty(power: number): MathDifficulty
```

### בסיום: בקש מ-QA לבדוק את הבראנצ'

---

## 2. game-engine-developer → `feature/overworld`

### תיאור
בנה את מערכת ה-overworld: טעינת מפה מ-tilemap, תנועה grid-based של השחקן, collision detection, ומעברים בין אזורים.

### משימות
- [ ] **2.1** יצירת `src/engine/tilemap.ts`:
  - טעינת tilemap מ-JSON (מבנה: layers, tilesets, collision)
  - רינדור שכבות tiles על ה-canvas
  - Collision layer (אילו tiles אפשר ללכת עליהם)
- [ ] **2.2** יצירת `src/engine/camera.ts`:
  - מצלמה שעוקבת אחרי השחקן
  - גבולות מצלמה (לא יוצאת מהמפה)
  - Smooth scrolling
- [ ] **2.3** עדכון `src/scenes/overworld.ts`:
  - Grid-based movement (16px steps, לא free movement)
  - אנימציית הליכה (4 כיוונים)
  - Collision detection עם ה-tilemap
  - NPC placeholder (עמידה במקום)
- [ ] **2.4** יצירת `src/data/maps/test-map.json`:
  - מפת טסט 20×15 tiles
  - שכבת רצפה (דשא, שביל)
  - שכבת collision (עצים, מים, בניינים)
  - נקודת spawn לשחקן
- [ ] **2.5** יצירת `src/engine/sprite-loader.ts`:
  - טעינת תמונות (sprites, tilesets) async
  - Cache למניעת טעינה כפולה
  - Placeholder sprite (מלבן צבעוני) כשהתמונה חסרה
- [ ] **2.6** חיבור Title → Overworld:
  - ENTER ב-title screen → מעבר ל-overworld scene
  - שחקן מופיע על המפה וניתן להזיזו עם חצים

### Technical Notes
- Tile size: 16×16 px
- Player moves 1 tile per step (grid-based like Pokemon)
- Movement animation: ~200ms per tile (smooth interpolation)
- Camera centered on player

### בסיום: בקש מ-QA לבדוק את הבראנצ'

---

## 3. asset-manager → `feature/pokeapi-pipeline`

### תיאור
בנה סקריפט אוטומטי שמוריד את כל הדאטה מ-PokeAPI (251 פוקימונים Gen 1+2) ושומר כ-JSON + sprites מקומיים.

### משימות
- [ ] **3.1** יצירת `scripts/fetch-pokemon-data.ts`:
  - שליפת כל 251 פוקימונים (GET /api/v2/pokemon/{1..251})
  - שמירת: id, name, types, stats (hp, attack, defense, sp.atk, sp.def, speed), base_experience
  - שמירה ל-`src/data/pokemon.json`
- [ ] **3.2** יצירת `scripts/fetch-moves-data.ts`:
  - שליפת כל ה-moves שפוקימוני Gen 1-2 לומדים
  - שמירת: id, name, type, power, accuracy, pp, effect_chance
  - חישוב mathDifficulty לכל move (לפי power)
  - שמירה ל-`src/data/moves.json`
- [ ] **3.3** יצירת `scripts/fetch-type-chart.ts`:
  - שליפת damage_relations לכל 17 טייפים (+glitch)
  - יצירת טבלת effectiveness מלאה
  - שמירה ל-`src/data/type-chart.json`
- [ ] **3.4** יצירת `scripts/fetch-evolution-chains.ts`:
  - שליפת שרשראות אבולוציה לכל פוקימון Gen 1-2
  - שמירה ל-`src/data/evolution-chains.json`
- [ ] **3.5** יצירת `scripts/fetch-sprites.ts`:
  - הורדת sprites מ-PokeAPI: front_default, back_default (Gen 2 gold style)
  - שמירה ל-`public/sprites/pokemon/front/{id}.png` ו-`back/{id}.png`
  - שמירת icons ל-`public/sprites/pokemon/icons/{id}.png`
- [ ] **3.6** יצירת `scripts/fetch-cries.ts` (בונוס):
  - הורדת קולות פוקימונים מ-PokeAPI/cries GitHub repo
  - רק Gen 1-2 (IDs 1-251)
  - שמירה ל-`public/audio/cries/{id}.ogg`
- [ ] **3.7** יצירת `scripts/run-all.ts`:
  - מריץ את כל הסקריפטים ברצף
  - Progress bar
  - Retry on failure
  - npm script: `"fetch-data": "tsx scripts/run-all.ts"`
- [ ] **3.8** יצירת `src/services/pokemon-data.ts`:
  - Service layer שקורא את ה-JSON הסטטי
  - `getPokemon(id)`, `getMove(id)`, `getTypeEffectiveness(attacker, defender)`
  - `getEvolutionChain(pokemonId)`
  - Type-safe עם הממשקים מ-`types/index.ts`

### Dependencies להתקנה
```bash
npm install -D tsx  # להרצת TypeScript scripts
```

### בסיום: בקש מ-QA לבדוק את הבראנצ' (הרץ fetch + validate JSONs)

---

## 4. frontend-developer → `feature/battle-ui`

### תיאור
בנה את ממשק הקרב המלא: HP bars, תצוגת פוקימונים, תפריט מתקפות, ומסך פתרון תרגיל מתמטיקה עם number pad.

### משימות
- [ ] **4.1** יצירת `src/ui/hp-bar.ts`:
  - HP bar עם שינוי צבע (ירוק > צהוב > אדום)
  - אנימציית ירידה/עליה חלקה
  - הצגת שם פוקימון + רמה
  - HP text (current/max)
- [ ] **4.2** יצירת `src/ui/battle-menu.ts`:
  - תפריט 4 מתקפות (כמו במשחק המקורי)
  - כל מתקפה מציגה: שם, type, PP
  - ניווט עם חצים + ENTER
  - Type color coding
- [ ] **4.3** יצירת `src/ui/math-input.ts`:
  - **Number pad** (3×4 grid + 0 + backspace + submit)
  - תצוגת התרגיל למעלה (גדול וברור)
  - שדה תשובה שמתעדכן בזמן אמת
  - Timer bar (shrinking bar, לא מספרים) עם שינוי צבע
  - כפתורים גדולים (touch-friendly, minimum 48px scaled)
  - תמיכה בהקלדת מקלדת (0-9, backspace, enter)
  - Feedback: ✓ ירוק flash / ✗ אדום shake + הצגת תשובה נכונה
- [ ] **4.4** יצירת `src/ui/text-box.ts`:
  - תיבת טקסט GBA-style (תחתית מסך)
  - הקלדה אות-אות (typewriter effect)
  - המתנה ל-ENTER להמשך
  - תמיכה ב-RTL לעברית
- [ ] **4.5** עדכון `src/scenes/battle.ts`:
  - Layout: פוקימון שחקן (back sprite) משמאל למטה
  - פוקימון יריב (front sprite) מימין למעלה
  - HP bars לשניהם
  - Battle flow: בחר מתקפה → תרגיל מתמטיקה → תוצאה → תור יריב → חזור
  - שימוש ב-placeholder sprites (מלבנים צבעוניים) עד שנטען sprites אמיתיים
- [ ] **4.6** יצירת `src/ui/battle-animations.ts`:
  - Flash effect (מתקפה פגעה)
  - Shake effect (נזק)
  - Fade in/out (כניסה/יציאה מקרב)
  - Text popup (damage numbers, "Super Effective!", "Critical Hit!")

### Visual Reference
```
+------------------------------------------+
|  [Rival Pokemon]        LV 12            |
|  ████████████░░  HP: 45/60               |
|                        [front sprite]     |
|                                          |
|  [back sprite]                           |
|  [Your Pokemon]         LV 10            |
|  ██████████████  HP: 38/38               |
+------------------------------------------+
|  FIGHT    BAG                            |
|  POKEMON  RUN                            |
+------------------------------------------+

→ On FIGHT select:

+------------------------------------------+
|  TACKLE       EMBER                      |
|  Normal PP 35 Fire PP 25                 |
|  LEER         SMOKESCREEN                |
|  Normal PP 30 Normal PP 20               |
+------------------------------------------+

→ On move select → Math challenge:

+------------------------------------------+
|  ┌────────────────────┐                  |
|  │   24 + 17 = ?      │                  |
|  │                     │                  |
|  │   Answer: 41_       │                  |
|  │   ████████░░ (time) │                  |
|  └────────────────────┘                  |
|  [7] [8] [9]                             |
|  [4] [5] [6]                             |
|  [1] [2] [3]                             |
|  [⌫] [0] [✓]                             |
+------------------------------------------+
```

### בסיום: בקש מ-QA לבדוק את הבראנצ'

---

## 5. qa-tester — בדיקות (מופעל על ידי סוכנים אחרים)

### תהליך QA לכל בראנצ'

```
1. סוכן מסיים עבודה על feature branch
2. סוכן מבקש QA: "בדוק את branch feature/X"
3. QA עובר לבראנצ' ומריץ:
   a. tsc --noEmit (0 errors)
   b. npm run dev (build succeeds)
   c. טסטים ספציפיים למשימה (ראה למטה)
4. אם עבר:
   ✅ QA מעדכן סטטוס בספרינט
   ✅ Merge to main
5. אם נכשל:
   ❌ QA כותב שגיאות בספרינט
   ❌ סוכן חוזר לתקן
```

### בדיקות ספציפיות לכל בראנצ'

**feature/math-engine:**
- [ ] `tsc --noEmit` = 0 errors
- [ ] Math tests pass (if vitest installed)
- [ ] Generate 100 problems per level, verify all answers are correct
- [ ] No negative results at levels 1-2
- [ ] Clean division at level 4
- [ ] All numbers within specified ranges

**feature/overworld:**
- [ ] `tsc --noEmit` = 0 errors
- [ ] Title screen → ENTER → overworld loads
- [ ] Player moves with arrow keys (grid-based)
- [ ] Player cannot walk through collision tiles
- [ ] Camera follows player
- [ ] No visual glitches or gaps in tilemap

**feature/pokeapi-pipeline:**
- [ ] `tsc --noEmit` = 0 errors
- [ ] `npm run fetch-data` completes without errors
- [ ] pokemon.json has 251 entries with valid data
- [ ] moves.json has entries with power, type, accuracy
- [ ] type-chart.json has all 17 types
- [ ] Sprites downloaded for all 251 Pokemon (front + back)
- [ ] `pokemon-data.ts` service returns correct data

**feature/battle-ui:**
- [ ] `tsc --noEmit` = 0 errors
- [ ] Battle screen renders (even with placeholder sprites)
- [ ] HP bars animate correctly
- [ ] Number pad responds to clicks AND keyboard
- [ ] Timer bar shrinks over time
- [ ] Correct answer shows green feedback
- [ ] Wrong answer shows red + correct answer display

---

## QA Findings Log

### feature/math-engine
```
Status: ⬜ Not tested
Findings: -
```

### feature/overworld
```
Status: ⬜ Not tested
Findings: -
```

### feature/pokeapi-pipeline
```
Status: ⬜ Not tested
Findings: -
```

### feature/battle-ui
```
Status: ⬜ Not tested
Findings: -
```

---

## Notes
- כל הסוכנים עובדים **במקביל** על branches נפרדים
- **אין תלויות בין הבראנצ'ים** בספרינט הזה - כל אחד עובד עצמאי
- Merge order doesn't matter - all branches are independent
- Sprint 2 will integrate: math-engine + battle-ui + pokeapi data into a working battle
