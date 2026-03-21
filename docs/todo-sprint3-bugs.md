# Sprint 3 — Bug Fix Progress (2026-03-21)

Resume from here. Tasks 1-3 done, 4-7 remaining.

---

## Completed

### Task 1 — game-engine-developer — Bugs #7 + #6 ✅
- **Branch:** feature/fix-trainer-battle-loop (merged to main)
- **Bug #7 (critical):** XP text infinite loop after trainer battle — fixed
- **Bug #6 (low):** Level-up message between sequential trainer Pokemon — fixed

### Task 2 — game-engine-developer — Bug #9 ✅
- **Branch:** feature/fix-pokecenter-exit (merged to main)
- **Bug #9:** Pokemon Center always exits to Zeroville — fixed with source-map tracking

### Task 3 — frontend-developer — Bugs #4 + #5 ✅
- **Branch:** feature/fix-sprite-transparency (merged to main)
- **Bug #4 (high):** Pokemon sprites white background — fixed
- **Bug #5 (medium):** Tile sprites white background — fixed

---

## Remaining Tasks

### Task 4 — frontend-developer — Bug #3
```
You are the frontend-developer agent.

Branch from main: feature/fix-battle-move-grid

Fix Bug #3 (high): Battle move grid spacing too tight for 8 moves — text overflows/overlaps.

The battle menu in src/ui/battle-menu.ts renders moves in a 2-column grid. With 8 moves, the text is cramped and overlaps. The menu area is 240px wide x 40px tall (MENU_Y = 120, MENU_H = 40).

Options:
- Reduce font size for move names when there are >4 moves
- Make the move menu taller (expand MENU_H) to fit 4 rows comfortably
- Add scrolling if moves exceed visible area
- Truncate long move names

Choose the approach that best matches GBA Pokemon Silver style (compact but readable). The move menu should handle up to 8 moves without text overlap.

After fixing:
1. Run npx tsc --noEmit — must be 0 errors
2. Run npm test — must pass
3. Run npm run build — must succeed
4. Update docs/bugs.md: change bug #3 status to "closed"
5. Commit and request QA merge to main
```

### Task 5 — frontend-developer — Bugs #1 + #2
```
You are the frontend-developer agent.

Branch from main: feature/fix-hebrew-rendering

Fix two related Hebrew/i18n bugs:

BUG #1 (high): Hebrew font barely readable — the Pokemon-style pixel font doesn't render well for Hebrew characters. Check src/engine/renderer.ts drawText function and any custom font loading. Hebrew characters need a font that supports them clearly at small pixel sizes. Options: use a system monospace font for Hebrew text, or find a pixel font with Hebrew support, or conditionally switch font based on current language.

BUG #2 (medium): RTL text alignment inconsistent — Hebrew text not properly right-aligned across UI. Check all drawText calls across the codebase. When isRTL() is true, text should be right-aligned and use direction: 'rtl'. Audit: battle menu, HUD, dialogue boxes, party screen, pokedex, shop UI.

Key files: src/engine/renderer.ts, src/i18n/i18n.ts, src/ui/text-box.ts, src/ui/battle-menu.ts, src/scenes/*.ts

After fixing:
1. Run npx tsc --noEmit — must be 0 errors
2. Run npm test — must pass
3. Run npm run build — must succeed
4. Update docs/bugs.md: change bugs #1 and #2 status to "closed"
5. Commit and request QA merge to main
```

### Task 6 — frontend-developer — Bug #8
```
You are the frontend-developer agent.

Branch from main: feature/trainer-vs-scene

Implement Bug #8 (feature): Add a trainer encounter "VS" intro scene before battle starts.

Currently when a trainer spots the player, the approach animation plays ("!" bubble → walk) and then it goes directly to the battle scene showing Pokemon. In Pokemon Silver, there's a brief trainer encounter screen.

Implement a simple VS intro overlay in the battle scene:
- When isTrainerBattle is true, before showing "X wants to battle!" text:
- Show a brief (1-1.5 second) overlay with the trainer's name and a "VS" graphic
- Can be a simple screen: dark background, trainer sprite (use getNPCSpriteImage scaled up), "VS" text, trainer name
- After the overlay, proceed to normal battle intro

This should be a new BattlePhase (e.g. 'TRAINER_INTRO') that plays before 'INTRO' in trainer battles.

Files: src/scenes/battle.ts (add phase + rendering), possibly src/engine/asset-generator.ts if trainer sprite needs scaling. The trainer name and sprite type need to be passed via TrainerBattleData — check if spriteType is already available, if not add it.

After implementing:
1. Run npx tsc --noEmit — must be 0 errors
2. Run npm test — must pass
3. Run npm run build — must succeed
4. Update docs/bugs.md: change bug #8 status to "closed"
5. Commit and request QA merge to main
```

### Task 7 — game-engine-developer — Bug #10
```
You are the game-engine-developer agent. Read .claude/agents/game-engine-developer.md for your role.

Branch from main: feature/fix-loss-teleport

Fix Bug #10 (high): When the player's last Pokemon faints, the trainer renders at the top-left corner of the screen (0,0) and can't move. This is because handleLoss() in src/scenes/battle.ts resets position to x=0, y=0 — which is a tree tile (blocked).

Fix: Instead of resetting to (0,0), teleport the player to the last Pokemon Center they visited (or Zeroville Pokemon Center as default fallback). Heal the party fully.

Implementation approach (choose simplest):
- Option A: Store lastPokemonCenter { mapId, x, y } in PlayerData — updated whenever the player enters a Pokemon Center and heals. On loss, teleport there.
- Option B: Hardcode a fallback Pokemon Center location (e.g. Zeroville pokecenter door at x=4, y=5). Simpler but less flexible.

Either way:
- handleLoss() should set position to the Pokemon Center location, not (0,0)
- Party should be fully healed (already done)
- Player should lose some money (optional — classic Pokemon mechanic, half their money)

Files: src/scenes/battle.ts (handleLoss), src/types/index.ts (if adding lastPokemonCenter to PlayerData), src/systems/game-state.ts, src/systems/save.ts (migration)

After fixing:
1. Run npx tsc --noEmit — must be 0 errors
2. Run npm test — must pass
3. Run npm run build — must succeed
4. Update docs/bugs.md: change bug #10 status to "closed"
5. Commit and request QA merge to main
```

---

## Execution Order

4 → 5 → 6 → 7

After all tasks done — run full QA on main, then Sprint 3 is complete.

---

## Open Bugs Summary (from bugs.md)
| # | Description | Severity | Agent |
|---|-------------|----------|-------|
| 1 | Hebrew font barely readable | high | frontend-developer |
| 2 | RTL text alignment inconsistent | medium | frontend-developer |
| 3 | Battle move grid too tight for 8 moves | high | frontend-developer |
| 8 | Trainer VS intro scene missing | low | frontend-developer |
| 10 | Loss teleports to (0,0) — stuck on tree tile | high | game-engine-developer |

## Notes
- No remote repo — all work is local git only
- Each task: pull from main → new branch → fix → tsc/test/build → QA merge
- bugs.md is the source of truth for bug status
- This file is temporary — delete after Sprint 3 is complete
