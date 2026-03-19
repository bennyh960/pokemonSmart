Read CLAUDE.md for project context, then docs/sprint-2.md section 4, and your agent spec at .claude/agents/game-engine-developer.md.

```bash
git checkout main
git pull 2>/dev/null
git checkout -b feature/save-system
```

Implement ALL tasks 4.1-4.4: localStorage save/load system.

Key tasks:
1. save.ts: saveGame(), loadGame(), hasSavedGame(), deleteSave()
2. Auto-save after battles and area transitions
3. Title screen: show "Continue" when save exists, "New Game" always
4. Save all PlayerData: party, position, badges, serum, money, pokedex, playtime

Use the PlayerData interface from src/types/index.ts.

When done: self-verify (tsc, dev), rebase on main, update sprint file, request QA per your agent instructions.
