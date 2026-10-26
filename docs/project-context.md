# Project Context — Open Work

Keep this file short. Delete an item as soon as it's done (git history is the archive).

## Where the story stands
Playable up to: badge 6 (Symmetrika) → Zapdos cave → Raikou arc → Route 9 (Reminder's Pidgeot).
Last active quest: `main-act4-percentile` ("Percentile City", set on first arrival) — `src/data/story/content/act4/quest-percentiles.ts`. Nothing happens after it yet.

## TODO — main story
- [ ] Percentile (gym 7): city + interiors + entry gate done (`act4/quest-percentiles.ts`, quest `main-act4-percentile`). Gym has no leader and no city door yet; west-ocean swimmer blockers wait for flag `percentile-ocean-open` (nothing sets it yet)
- [ ] Algebria (gym 8): `act4/quest-algebria.ts` is old "Absoluta" placeholder (map id `absoluta/absoluta` doesn't exist, `questionSetIds: ['placeholder']`) — rewrite for Algebria
- [ ] Route 12: empty map (0 NPCs, 0 transitions)
- [ ] Forest: `caves/deep-forest` and `routes/small forest` partly built — no story yet
- [ ] Legendary caves: Zapdos + Raikou done; remaining legendaries not placed
- [ ] League (`league/*`) + NULL-X Tower: maps exist with 1 NPC each; `act5/quest-nullx-tower.ts` references `nullx-floor-1..5` which don't exist (only `tower`, `floor-6`)

## Bugs
- [ ] Route 9 cave, Reminder's farewell (`quest-route9.ts` ~line 222): EN says "I am heading to Percentile", HE says "I'm debating whether to…"; typos "heared", "invastigate"
- [ ] `act3/quest-raikou.ts` `evt-auto-repel-for-raikou` waits for a `flag-set` trigger on the Raikou flee flag, but battle flee only fires `trainer-defeated` (battle_scene.ts ~2250) — the auto-repel never runs
- [ ] Trainer "VS" intro scene before battle (old bug #8, `docs/bugs.md`)

## Tech debt
- [ ] `src/data/badges.ts` badges 7–8: leader is `???`, type/mathTopic still old placeholders — fill in when the Percentile/Algebria gyms are designed
- [ ] `src/data/maps/backup/` and `templates/backup/` — old map snapshots, remove if not needed
- [ ] Stale commented-out reset script at the bottom of `act3/quest-raikou.ts`
- [ ] `overworld.ts` `buildCutsceneContext().executeStoryAction` re-implements story actions that `systems/story-engine.ts` already handles — route through the engine
- [ ] `/sprites/pokemon/front/${id}.png` is built by hand in battle, evolution, english-learning — use `pokemonFrontSpriteUrl()` from `systems/overworld-pokemon-anim.ts` (or move it to a shared sprite module)
- [ ] 7 of 13 vitest files fail on main (pre-existing)
- [ ] `public/audio/` is gitignored — the only copy is the `gh-pages` branch. A fresh clone has no sound; restore with `git archive origin/gh-pages audio | tar -x -C public`. Store it somewhere durable (LFS / release asset)
- [ ] Math in battle disabled — needs a less intrusive mechanic
