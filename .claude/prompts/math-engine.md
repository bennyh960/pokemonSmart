Read the sprint file at docs/sprint-1.md section 1 and your agent spec at .claude/agents/math-engine-developer.md.

Run these git commands first:

```
git checkout -b feature/math-engine
```

Then implement ALL tasks 1.1-1.10:

1. Full `src/math/math-engine.ts` with generateProblem() for all 6 difficulty levels
2. `src/math/adaptive-difficulty.ts` with adaptive difficulty tracking
3. Install vitest, write tests in `src/math/__tests__/math-engine.test.ts`

Use types from `src/types/index.ts` (MathDifficulty is 1|2|3|4|5|6).

When done: run `tsc --noEmit` and `npm test` to verify everything passes. Then commit all changes to the branch.

After commit, update docs/sprint-1.md - change your tasks status from ⬜ to ✅.
