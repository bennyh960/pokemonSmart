# Project Context — Open Work

Keep this file short. Delete an item as soon as it's done (git history is the archive).

## Where the story stands
Playable up to: badge 6 (Symmetrika) → Zapdos cave → Raikou arc → Route 9 (Reminder's Pidgeot) → Percentile "The Burning Chance" arc (built, **not playtested**).
Burning Chance (`act4/quest-percentile-burning-chance.ts`): city clues → lab (core lore) → Reminder → Route 12 Heat Collectors → Admin Kelvin → Entei (Core X4) + Moltres (Core X5) → Oak in the lab → Lance + Jenny → badge 7 + HM02 → sets `act4-minusburg-open`. Last quest: `main-act5-minusburg` — nothing built after it yet.

## Story direction (agreed, not built)
- After Percentile: 7 badges, 5 NULL-X cores (X1–X5), 5 legendaries met (Zapdos, Articuno, Raikou, Entei, Moltres). Cores = NULL-X's 8 modules, hidden inside legendaries (X4 = Chance, X5 = Energy).
- Give more screen time to rivals (Reminder, Gary), professors, gym leaders, Officer Jenny and the Elite Four.
- Route to the small forest / Percentile is long and branches into 2 paths, so no story goes there.
- **Minusburg arc (next):** Officer Jenny `jenny-mb` (minusburg.json, 44,0) now despawns on `act4-minusburg-open` (badge 7). Build the arc under Minusburg with Gary, Jenny, Lance (+ others): cores X6 + X7 and 1 legendary (Suicune suggested). X8 at the NULL-X Tower.

## TODO — main story
- [ ] Burning Chance arc: playtest end to end. Check NPC spots in the editor (Route 12 guards/admin/Max/Entei/Moltres, Reminder 39,2 + gym helper 41,2, Lance 16,28, coin kid, ball thief, Oak) and that the new cutscene `fx` step (fire/smoke/burst) looks right
- [ ] Algebria (gym 8): `act4/quest-algebria.ts` is old "Absoluta" placeholder (map id `absoluta/absoluta` doesn't exist, `questionSetIds: ['placeholder']`) — rewrite for Algebria
- [ ] Forest: `caves/deep-forest` and `routes/small forest` partly built — no story yet
- [ ] Forest region `forest/*` (Algebria → League, branch to Zeroville) — layout done, no story/NPCs/trainers yet. Algebria east gate → `algebria-woods` → `frost-trail` → `league-summit` (League gate, snow Pokemon Center + Mart); `algebria-woods` → `zeroville-trail` → Zeroville west gate. Hidden: `mossy-grotto` (behind a Cut tree), `frost-cave` (its top "Frozen Sanctum" chamber is empty, reserved for a legendary), interiors `frost-hut` / `ranger-cabin` (empty `house-small` instances)
- [ ] `league-summit` door → `league/l1` is one-way: `l1` has no exit back to the summit yet
- [ ] `forest/league-summit` is a world-map route label only — decide if it should be a Fly city (it has a Pokemon Center)
- [ ] Legendary caves: Zapdos + Raikou done; remaining legendaries not placed
- [ ] League (`league/*`) + NULL-X Tower: maps exist with 1 NPC each; `act5/quest-nullx-tower.ts` references `nullx-floor-1..5` which don't exist (only `tower`, `floor-6`)

## Bugs
- [ ] Route 9 cave, Reminder's farewell (`quest-route9.ts` ~line 222): EN says "I am heading to Percentile", HE says "I'm debating whether to…"; typos "heared", "invastigate"
- [ ] `act3/quest-raikou.ts` `evt-auto-repel-for-raikou` waits for a `flag-set` trigger on the Raikou flee flag, but battle flee only fires `trainer-defeated` (battle_scene.ts ~2250) — the auto-repel never runs
- [ ] Trainer "VS" intro scene before battle (old bug #8, `docs/bugs.md`)

## Tech debt
- [ ] `src/data/badges.ts` badge 8: leader is `???`, type/mathTopic still old placeholders — fill in when the Algebria gym is designed
- [ ] `src/data/maps/backup/` and `templates/backup/` — old map snapshots, remove if not needed
- [ ] Stale commented-out reset script at the bottom of `act3/quest-raikou.ts`
- [ ] `overworld.ts` `buildCutsceneContext().executeStoryAction` re-implements story actions that `systems/story-engine.ts` already handles — route through the engine
- [ ] `/sprites/pokemon/front/${id}.png` is built by hand in battle, evolution, english-learning — use `pokemonFrontSpriteUrl()` from `systems/overworld-pokemon-anim.ts` (or move it to a shared sprite module)
- [ ] 7 of 13 vitest files fail on main (pre-existing)
- [ ] `public/audio/` is gitignored — the only copy is the `gh-pages` branch. A fresh clone has no sound; restore with `git archive origin/gh-pages audio | tar -x -C public`. Store it somewhere durable (LFS / release asset)
- [ ] `encounter-tables.json`: some old entries have minLevel > maxLevel (sumville Pineco 10/5, route-3 Nidoran-f 24/20, small-forest Murkrow 30/14, cave-20-30 Phanpy 29/25)
- [ ] Math in battle disabled — needs a less intrusive mechanic
