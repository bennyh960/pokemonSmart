# Sprint 3 — Bug Fix Progress (2026-03-21)

Resume from here. Next task: Bug #8 (trainer VS scene).

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

### Resolution Refactor ✅
- Canvas now physically 720×480 with 240×160 logical coords via `ctx.scale(RES_SCALE)`
- All `SCREEN_W/H` constants replaced with config imports across 11 files
- Responsive CSS, input coordinate mapping fixed
- **Bug #1 closed:** Hebrew font now readable at physical resolution

### Bug #3 — Removed
- Battle move grid spacing issue — removed from backlog, battle scene will be redesigned

### Task 4 — game-engine-developer — Bug #10 ✅
- **Bug #10 (high):** Loss teleports to (0,0) — fixed
- Added `lastPokemonCenter` to PlayerData, updated on heal
- handleLoss() now teleports to last Pokemon Center, heals party, halves money
- Save migration for backward compatibility

---

## Remaining Tasks

### Task 5 — frontend-developer — Bug #8
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

---

## Execution Order

5 (Bug #8)

Bug #2 (RTL) is blocked on Hebrew translation story — see roadmap.

After Bug #8 done — run full QA on main, then Sprint 3 is complete.

---

## Open Bugs Summary (from bugs.md)
| # | Description | Severity | Agent | Status |
|---|-------------|----------|-------|--------|
| 2 | RTL text alignment — blocked on Hebrew translation story | medium | frontend-developer | open (blocked) |
| 8 | Trainer VS intro scene missing | low | frontend-developer | open — **next task** |

## Notes
- No remote repo — all work is local git only
- Each task: pull from main → new branch → fix → tsc/test/build → QA merge
- bugs.md is the source of truth for bug status
- This file is temporary — delete after Sprint 3 is complete
