Read the sprint file at docs/sprint-1.md section 3 and your agent spec at .claude/agents/pixel-artist.md.

Run these git commands first:
```
git checkout -b feature/pokeapi-pipeline
```

Then implement ALL tasks 3.1-3.8:

1. `npm install -D tsx`
2. `scripts/fetch-pokemon-data.ts` - Fetch 251 Pokemon from PokeAPI, save to `src/data/pokemon.json`
3. `scripts/fetch-moves-data.ts` - Fetch moves, calculate mathDifficulty from power, save to `src/data/moves.json`
4. `scripts/fetch-type-chart.ts` - Fetch type effectiveness, add glitch type, save to `src/data/type-chart.json`
5. `scripts/fetch-evolution-chains.ts` - Fetch evolution chains, save to `src/data/evolution-chains.json`
6. `scripts/fetch-sprites.ts` - Download Gen 2 Gold sprites (front+back) for 251 Pokemon to `public/sprites/pokemon/`
7. `scripts/run-all.ts` - Master script + add `"fetch-data": "tsx scripts/run-all.ts"` to package.json
8. `src/services/pokemon-data.ts` - Service layer: getPokemon, getMove, getTypeEffectiveness, etc.

IMPORTANT:
- Rate limit 100ms between API calls
- Add `public/sprites/` to .gitignore (too many files)
- Actually RUN `npm run fetch-data` and verify the JSON outputs are correct
- Commit scripts + JSON data + service file to the branch

After commit, update docs/sprint-1.md - change your tasks status from ⬜ to ✅.
