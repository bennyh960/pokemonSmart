Read CLAUDE.md for project context, then docs/sprint-2.md section 3, and your agent spec at .claude/agents/game-engine-developer.md.

```bash
git checkout main
git pull 2>/dev/null
git checkout -b feature/encounter-flow
```

Implement ALL tasks 3.1-3.6: Connect overworld → battle → back, with real Pokemon data.

Key tasks:

1. Encounter system: when stepping on tall grass, random Pokemon from encounter table
2. Overworld → battle transition (fade to black, load battle scene with real Pokemon)
3. Battle → overworld (win: XP gain, lose: back to spawn, run: back to overworld)
4. Real battle data: math difficulty from move power, damage from stats, type effectiveness
5. XP & level up system
6. Starter Pokemon selection at game start (Cyndaquil/Totodile/Chikorita)

Use the real data from src/data/pokemon.json, moves.json, type-chart.json.
Use src/services/pokemon-data.ts to access data.

When done: self-verify (tsc, dev, test), rebase on main, update sprint file, request QA per your agent instructions.
