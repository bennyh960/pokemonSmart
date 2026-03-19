Read the sprint file at docs/sprint-1.md section 4 and your agent spec at .claude/agents/frontend-developer.md.

Run these git commands first:
```
git checkout -b feature/battle-ui
```

Then implement ALL tasks 4.1-4.6:

1. `src/ui/hp-bar.ts` - HP bar with color change (green>50%, yellow 25-50%, red<25%), smooth anim, name+level+HP text
2. `src/ui/battle-menu.ts` - 2×2 menu (FIGHT/BAG/POKEMON/RUN), move selection with name+type+PP, arrow nav
3. `src/ui/math-input.ts` - THE CRITICAL COMPONENT:
   - Problem display, answer field, timer bar (shrinking, color-changing)
   - Number pad: [7][8][9] / [4][5][6] / [1][2][3] / [⌫][0][✓]
   - Works with BOTH mouse clicks AND keyboard
   - Green flash correct, red shake + show answer for wrong
4. `src/ui/text-box.ts` - GBA-style text box, typewriter, RTL Hebrew support
5. `src/scenes/battle.ts` - Full battle scene with flow: INTRO→SELECT_MOVE→MATH→ATTACK→ENEMY_TURN→CHECK_WIN. Hardcoded Cyndaquil vs Pidgey with Tackle+Ember. Colored rect placeholders.
6. `src/ui/battle-animations.ts` - flash, shake, fade, damage numbers

Wire battle scene in game.ts. Press B key to enter battle for testing.

IMPORTANT: Everything on 240×160 canvas, all Canvas 2D, no HTML overlays. Number pad must support mouse AND keyboard.

When done: run `tsc --noEmit` and `npm run dev` to verify. Then commit all changes to the branch.

After commit, update docs/sprint-1.md - change your tasks status from ⬜ to ✅.
