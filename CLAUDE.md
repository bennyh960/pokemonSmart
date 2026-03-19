# Pokemon Math Adventure - Project Context

## What is this?
A Pokemon Silver-style RPG where math problems drive combat. Set in "Numeria" (נומריה), players solve math to attack, decode ciphers to find antidotes, and stop a rogue AI called NULL-X.

## Key Files
- **Full game spec:** `docs/game-spec.md` — THE reference for everything (story, world, mechanics, Pokemon, gym leaders)
- **Current sprint:** `docs/sprint-1.md` — Active tasks, who's doing what, QA status
- **Roadmap:** `docs/roadmap.md` — All sprints planned, what's done vs pending
- **Agent definitions:** `.claude/agents/*.md` — 7 agents with detailed roles
- **Agent prompts:** `.claude/prompts/*.md` — Ready-to-run instructions for parallel execution

## Agents
| Agent | File | Role |
|-------|------|------|
| product-manager | Built-in (you) | Sprint planning, coordination, roadmap |
| game-designer | `.claude/agents/game-designer.md` | Mechanics, balance, progression |
| math-engine-developer | `.claude/agents/math-engine-developer.md` | Math problem generation |
| game-engine-developer | `.claude/agents/game-engine-developer.md` | Core game loop, overworld, tilemap |
| frontend-developer | `.claude/agents/frontend-developer.md` | UI, battle screens, audio integration |
| asset-manager | `.claude/agents/pixel-artist.md` | Sourcing sprites/tiles/sounds from APIs |
| qa-tester | `.claude/agents/qa-tester.md` | Testing + documentation |

## Tech Stack
- **Runtime:** Vite + TypeScript + HTML5 Canvas (240×160 scaled 3x)
- **Audio:** Howler.js
- **Data:** PokeAPI (fetched at build time → static JSON)
- **Pokemon:** Real Gen 1-2 (251 Pokemon, real types/moves/evolutions)
- **Sprites:** PokeAPI Gen 2 Gold + Spriters Resource for tilesets/trainers

## How to Work
1. Read `docs/roadmap.md` to see overall progress
2. Read `docs/sprint-{N}.md` for current sprint details
3. Each sprint has tasks assigned to agents with branch names
4. Agents work on feature branches → QA tests → merge to main
5. Sprint file gets updated with ✅/❌ status

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm test` — Run vitest tests
- `npm run fetch-data` — Download all PokeAPI data (after pipeline is built)

## Branch Strategy
- `main` — Stable, tested code only
- `feature/*` — Agent work branches (one per sprint task)
- QA tests on feature branch → merge to main if passes
