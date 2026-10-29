# Mini Games — Design

Branch: `feature/mini-games`. Three short games (2–4 min each). Each has levels, 1–3 stars and prizes.
Trigger wiring (NPC / cutscene / tile) comes later; this sprint builds the games plus one entry API.

| # | Game | Genre | Teaches |
|---|------|-------|---------|
| 1 | **Unown Word Quest** (`unown-words`) | English, progressive levels | letters → sounds → words → spelling → sentences |
| 2 | **Poké-Doku** (`poke-doku`) | Logic puzzle | deduction (a Sudoku with Pokémon) |
| 3 | **Snorlax Snack Attack** (`snorlax-snack`) | Arcade + math | adding to a target, then times tables |

---

## 0. Shared framework (built once, used by all games)

### Look & feel — "modern, bright, bouncy"
- React overlay (like Pokédex/Party), Tailwind. Full-screen, **not** pixel-locked: big rounded cards, soft gradients
  (one colour theme per game), chunky buttons (min 48px touch targets), drop shadows, glass HUD bar.
- Motion everywhere, short and springy: pop-in on cards (scale 0.8→1.05→1), shake on wrong, float-up "+10" text,
  confetti burst on level clear, glowing pulse on the next thing to tap. Respect `prefers-reduced-motion`.
- Pokémon sprites from the existing sprite helper (`pokemonFrontSpriteUrl()`), never a hand-built path.
- RTL + LTR: all UI text through `t()`; game content (English words) is always LTR inside its own box.

### Flow (same for every game)
1. **Intro card** — game logo, mascot Pokémon, level picker (locked levels show a padlock + "needs 2★ on level N").
2. **3-2-1-GO** countdown (sound + giant numbers).
3. **Play** — HUD: score, combo flame, timer/lives, pause.
4. **Results** — stars fly in one by one, score counts up, "NEW RECORD!" banner.
5. **Prize reveal** — a Poké Ball shakes 3× and pops open → item card (rarity colour + shine). Then "Play again" / "Next level" / "Exit".

### Progress & save
- `pd.miniGames: Record<gameId, { levels: Record<number, { stars: 0-3; best: number; clears: number }>; lastPlayed?: string }>`
- New save migration **v22** (adds `miniGames: {}`).
- Level N+1 unlocks with ≥2★ on level N. Level 1 always open.

### Prizes (data-driven, in each game's level table)
- `firstClear` reward — given once per level (the big one, rarity rises with level).
- `threeStar` reward — given once, the first time a level gets 3★.
- `replay` reward — small (money / common item), every clear. Capped to 5 per game per day (stored as a date + count) so it's fun, not a farm.
- Rewards reuse `DialogueReward`. The grant code currently lives inside `overworld.ts` (`giveNPCReward`) — **extract it to
  `src/systems/rewards.ts`** and call it from both places (no duplication).
- Rarity tiers (card colour): common (grey) · good (blue) · rare (purple) · epic (gold, extra sparkle sound).

### Entry API (the trigger layer plugs in here later)
- `startMiniGame(gameId, { level?, onFinish? })` → pushes state `MINI_GAME`.
- Later triggers just call that: NPC field `miniGame: { gameId, level? }`, cutscene step `{ type: 'minigame', gameId }`,
  interact type `minigame` with args `{ gameId }`. **Not built this sprint.**
- Dev access now: start-menu entry "Mini Games" (replaces the old English entry) opens a game picker.
  The old canvas `scenes/english-learning.ts` is replaced by game 1 and deleted once game 1 works.

### Sound design — "one more round!"
All synthesized with Web Audio through the existing `audio-manager` (`playToneSequence` / `withSynthContext`), added as
named cues — no new audio files needed. Letter/word sounds reuse `playLetter()` / `playWord()` (speech fallback).

| Cue | Sound | Why kids like it |
|-----|-------|------------------|
| `mg-correct` | bright bell "bling" on a pentatonic scale — **each combo step plays the next note up** | rising pitch = "keep going!" |
| `mg-combo-5` | sparkle arpeggio + whoosh at combo 5 / 10 / 15 | milestone reward |
| `mg-wrong` | soft low "boop-oop" (triangle, short) — never harsh | mistakes feel safe |
| `mg-tap` | tiny wood-block pop on every button | tactile |
| `mg-count` / `mg-go` | 3 beeps + high "GO!" chord | anticipation |
| `mg-star` | 3 chimes, each a 3rd higher, synced to stars landing | |
| `mg-clear` | 1-second fanfare (major arpeggio + chord) | |
| `mg-record` | quick ascending glissando | |
| `mg-ball-shake` | 3 rattles, then `mg-prize` "ta-da" — epic tier adds a shimmer tail | slot-machine suspense |
| `mg-tick` | soft tick in the last 5 seconds, faster near 0 | |
| Pokémon cry | `playCry(id)` when a Pokémon is the answer | |
Music: a light looping track per game if one fits the existing set, else silence + cues (cues are the star).

### Framework as built (notes for the game agents — see `src/minigames/README.md`)
- Save shape: `pd.miniGames[id] = { levels: { [n]: { stars, best, clears } }, lastPlayed?, replayDay?: { date, count }, data? }`.
  Game-owned data (e.g. unown-words `seen`) lives in `data`, not at the top level.
- Replay prize: given only on a clear that earned no first-clear / 3★ prize (so first plays don't use up the daily cap).
- "Exit" on results leaves the mini-game (back to the picker when opened from it); "Quit" in the pause menu goes back
  to the intro card.
- `DialogueReward` gained `pokemon?: { id, level }` (gift Pokémon → party, or PC box when full) for the Unown prize.
- Item substitutions (not in the game's item data — `item-defs.ts`):
  | Design | Used | Where |
  |---|---|---|
  | PP Up | Max Elixir | unown L5 3★ |
  | Lucky Egg | Rare Candy ×3 | unown L6 first clear |
  | Shiny-chance charm / big money | 5000₽ | unown L7 3★ |
  | Oran Berry ×5 | Fresh Water ×5 | snorlax L1 first clear |
  | Sitrus Berry ×3 | Moomoo Milk ×3 | snorlax L2 first clear |
- "Evolution stone (random)" = any evolution-category item (also Sun/Moon Stone); "TM (random)" = any buyable non-HM TM.
  Both derived from item data (`evolutionStonePrize()` / `tmPrize()` in `src/minigames/define.ts`).
- Replay prizes are money (100₽ → 500₽ by level); rarities per prize are in each game's level table.

---

## 1. Unown Word Quest (English) — `unown-words`

**Story hook:** the Unown are living letters scattered across Numeria. Put them back together to make words.
Each letter is an Unown-style glyph tile (letter drawn in a round Unown-ish badge).

Each level = 8 questions. Stars: 3★ = 0–1 mistakes, 2★ = 2–3, 1★ = finished. Hearts don't end the game (kids keep going).
A 🔊 button replays the sound on every question. After an answer, the word/letter is spoken again (repetition = learning).

| Lvl | Name | Task | Content source | First-clear prize | 3★ prize |
|-----|------|------|----------------|-------------------|----------|
| 1 | **Letter Pop** | Hear a letter → tap the right Unown out of 4 (capital) | A–Z | 3× Poké Ball | Potion ×3 |
| 2 | **Big & Small** | See a capital → tap its lowercase (and back) | A–Z / a–z | 3× Great Ball | Super Potion ×2 |
| 3 | **First Sound** | Hear a sound "/b/" → tap the Pokémon whose name starts with it (3 sprites) | Pokémon names (pokemon.json) | Ultra Ball ×2 | Rare Candy |
| 4 | **Type Speller** | Show `_ _ _ _` + 3 Pokémon of that type → tap letters in order (existing mechanic) | 17 type names | Evolution stone (random of Fire/Water/Thunder/Leaf) | Rare Candy ×2 |
| 5 | **Word Match** | Hear an English word → tap the picture (item sprites / type icons / Pokémon) | item + type names (`{en,he}` data) | TM (random from a list) | PP Up |
| 6 | **Unown Scramble** | Unscramble letter tiles to spell a Pokémon name (short names first: ONIX, ABRA, MEW…) | Pokémon names ≤ 6 letters | Lucky Egg | Master Ball |
| 7 | **Sentence Builder** | Drag words into order: "Pikachu is yellow" / "Charmander likes fire" | small template list (Pokémon + type/colour) | Gift Pokémon: **Unown** (once) | Shiny-chance charm / big money |

- Hebrew help shrinks with level: L1–L3 show the Hebrew prompt, L4–L5 show it only after a mistake, L6–L7 English only.
- Words are taken from game data (types, items, Pokémon) — no hand-made word lists except the L7 sentence templates.
- Track learned letters/words in progress (`pd.miniGames['unown-words'].seen`) — later feeds Sprint 11 progressive English.

## 2. Poké-Doku (logic) — `poke-doku`

A Sudoku where the symbols are Pokémon. Each row, column and box holds each Pokémon once.
Generated puzzles (seeded, always a unique solution), so it never runs out.

| Lvl | Grid | Pokémon | Givens | Extra | First-clear | 3★ |
|-----|------|---------|--------|-------|-------------|----|
| 1 | 4×4 (2×2 boxes) | 4 starters | many | — | Potion ×3 | Great Ball ×3 |
| 2 | 4×4 | 4 | few | — | Great Ball ×3 | Super Potion ×3 |
| 3 | 6×6 (2×3 boxes) | 6 | many | — | Ultra Ball ×2 | Rare Candy |
| 4 | 6×6 | 6 | few | timer bonus | Rare Candy | Max Revive |
| 5 | 6×6 **Type-Doku** | 6 **types** (icons only) | few | — | Evolution stone | Master Ball |

- Controls: tap a cell → tap a Pokémon from the tray (or keys 1–6). Wrong placements are allowed but glow red on "Check".
- Hint button (Psyduck "thinks"): highlights one cell that has only one possible answer — teaches the reasoning.
  Each hint costs one star cap (3 hints max).
- Stars: 3★ = no mistakes & no hints, 2★ = ≤2, 1★ = solved.
- Juice: placing the last Pokémon of a row/col/box makes that line flash and the Pokémon cry plays.
  Finished puzzle = all Pokémon jump in a wave.

## 3. Snorlax Snack Attack (arcade + math) — `snorlax-snack`

Snorlax is hungry. Berries with numbers fall from a tree. Move Snorlax (← → / drag) to eat berries that reach the target
**exactly**. The sum is shown in a panel at the top of the field (never on the Pokémon): `7 → 12` under "Add up! ⬆" /
"Take away! ⬇", `4 × ? = 24`, `24 ÷ ? = 6`. Hit the target → "BURP!", points, new target. Go past it → tummy ache, meter resets.
60-second rounds. Combo multiplier grows with each exact target; a Golden Berry starts 5s **Fever** (everything ×2, music speeds up).
Rotten (grey) berries: −1 heart (3 hearts).

Pick the level on the intro card ("Select difficulty level": a 5×2 grid, 1 = Junior … 10 = Master, 2–9 just numbers).
Level N opens level N+1 after **N wins with ★★★** (`unlockWins`; level 1 → 1 win … level 9 → 9 wins), shown as a bar.
Speed: level 1 = 0.4 × top speed, rising evenly to the top speed at level 10 (`pace`, `speedOf()` in sim.ts).
Prizes start at ★★ (`prizeStars: 2`): the ★★ list keeps every earlier level's prizes; ★★★ is the ★★ list with quantities
multiplied, from the level shown. Care rounds pay on every win; the games menu pays once per level (first ★★, first ★★★).

| Lvl | Ops | New ★★ prizes | ★★★ |
|-----|-----|---------------|-----|
| 1 Junior | + | Poké Ball · Potion · status cure | lvl 1 ×3 |
| 2 | − | Great Ball · Super Potion | lvl 1–2 ×3 |
| 3 | + − | Ultra Ball · Hyper Potion · Full Heal · Ether | lvl 3 only ×3 |
| 4 | × | Max Potion · X item | lvl 3–4 ×3 |
| 5 | + × | Max Ether · 10,000 | lvl 1–5 ×4 |
| 6 | − × | Elixir · 15,000 | lvl 1–6 ×4 |
| 7 | + − × | Max Elixir · vitamin | lvl 1–7 ×5 |
| 8 | ÷ | Rare Candy · 20,000 | lvl 1–8 ×5 |
| 9 | ÷ × | held item that works in battle (Leftovers, Choice…) | lvl 1–9 ×5 |
| 10 Master | + − × ÷ | (same as 9) | one of: Leftovers · vitamin ×10 · 50,000 · Master Ball · Max Elixir ×20 · Full Restore ×20 |

- Stars by score thresholds per level (in the level table).
- Juice: Snorlax's belly grows as the meter fills; berries squish; exact hit = belly bounce + confetti + `mg-correct` pitch climb.
- No-math mode is not needed — level 1 is gentle enough.

### 3b. Snack Attack family + care trigger (built)
One engine (`src/minigames/games/snack-attack/`: `sim.ts` rules · `skins.ts` look/texts · `index.ts` defs), five games
with the same 10-level table (`SNACK_LEVELS` in index.ts: math, speed and prizes) and their own world:

| Game id | Pokémon line | Falls / take-away / hazard / golden | Care habitat | After the heal |
|---|---|---|---|---|
| `snorlax-snack` | Snorlax | berries / blue berries / rotten / golden berry | grass | **asleep** |
| `bulbasaur-sun` | Bulbasaur → Venusaur | sun drops / clouds / poison spore (**a treat** — the line is Poison: points, no heart lost) / rainbow | grass | cured |
| `charmander-flame` | Charmander → Charizard | embers / smoke / water drop / gold flame | ground, mountain | cured |
| `squirtle-swim` | Squirtle → Blastoise | bubbles / whirlpools / **rocks** (bigger, 1.5× more, river 1.12× faster) / shell | water (surfing) | cured |
| `pikachu-charge` | Pichu → Raichu | bolts / purple bolts / mud ball / thunder star | grass, ground | cured |

A skin's `hazardFriend` (type) turns its hazard into points for a Pokémon of that type. The player is drawn with its
overworld walk animation when a `wild-pokemon` character sprite has its English name (Snorlax today), else its battle sprite.
Care prizes = the level prizes above, paid on every ★★/★★★ win (`carePrizes()` in care.ts).

**Care round** (`src/minigames/care.ts`, wired in `overworld.ts` before the wild-encounter roll): a party Pokémon of a
line above, alive and at 50% HP or less, on an encounter tile of the game's habitat whose encounter filter allows its types →
a chance per step that grows as HP drops — 40–50% HP: 10% · 30–40%: 20% · 30% or less: 50% (`CARE_CHANCE_BY_HP`; the most hurt Pokémon asks; cooldown 100 steps) it asks "Snorlax looks very hungry… Feed it?" → Yes starts the game with
`startMiniGame(id, { carePokemonUuid })`. In a care round the Pokémon itself plays and the player **picks the level** — every
open level can be picked (the highest open one is pre-selected). The intro lists that level's ★★ and ★★★ prizes. Every win heals
(`DialogueReward.restorePokemon`: full HP + status); ★★ / ★★★ also pays one of the level's prizes, every time.
Stars/best still save.
After a clear there is no "Play again"; a failed round can be retried.
**Care spot** (interact type `care-spot`, set on a tile in the tileset editor): facing it and pressing A, a party Pokémon
with one of these games (the most hurt first — HP doesn't matter here) pops out, the spot shakes, "Oh! Looks like something
dropped out!" and its game starts as a care round. A finished round hides the spot for 30 minutes (flag
`care-spot-<map>-<x>-<y>` + its timestamp); quitting before the end keeps it. Logic: `careSpotGame()` / `restCareSpot()` in care.ts.
Admin: **C** in the overworld offers the care game of the first party Pokémon that has one (ignores HP, tile, chance, cooldown).

---

## Build plan (subagents)
1. **Framework** (one agent, first): `src/minigames/` core (types, registry, progress, unlocks, prizes, daily cap),
   `systems/rewards.ts` extraction, save v22, audio cues, `MINI_GAME` React scene + shared shell (intro, countdown, HUD,
   results, prize reveal), `startMiniGame()`, start-menu picker, i18n keys. Stub components for the 3 games.
2. **Games** (three agents, in parallel, each only in its own folder `src/minigames/games/<id>/`): game logic as pure
   TS modules with vitest tests (generators, scoring, puzzle uniqueness), React component plugging into the shell.
3. **QA**: `npm run build`, `npm test` for the new tests, play each level once in the browser.

## Open questions (for later)
- Where each game lives in the world (Unown ruins? a Game Corner? Snorlax on a route?) — decide during trigger wiring.
- Replay daily cap value (5) and exact prize items — tune after playtest.
