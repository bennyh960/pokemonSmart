# Feature: Unown Library — English that kids want to play

Branch: `feature/mini-games` — **built (Stories 1–5), not playtested.** Run the QA list in Story 5.

Today Unown Word Quest is 7 straight levels of "tap the letter / spell the word", with words taken from game data
(Pokémon names, "Max Elixir"…). Goal: **real, useful English for 8–10 year olds, close to the Pokémon world**, in
several short modes that feel like games — so kids *want* to visit libraries.

## Decisions (change before building)
- **One word bank** decides *what* is learned; **modes** decide *how* it's played. Every mode draws from the same bank
  and the same progress, so a word learned in one mode is reviewed in another.
- **Word rules:** common words a 3rd–4th grader meets; ≤ 8 letters for spelling; no rare/abstract words, no idioms.
  Hebrew = real Hebrew words (reviewed by a person before merge).
- **Close to the game:** types and moves come *from game data by id* (no copied names); the rest is a hand-made list —
  an agreed exception to "no hand-made lists", because it's teaching content, not game state.
- **Pictures:** Pokémon sprites, type icons and item sprites when the word has one; otherwise an emoji.
- **Letters stay** as the warm-up mode (today's L1–L3), not the whole game.

---

## Story 1: Word bank (~250 words)
**Goal:** one data file of kid-level words, grouped by theme and difficulty.
- Built: `src/data/english-words.json` — 247 words, `{ id, theme, tier, en?, he?, emoji? | item?, typeId? | move? }`
  (type / move words take English + Hebrew from game data). Words whose pictures a child could confuse (sad / cry,
  sun / day…) were left out; a test keeps ids, English and pictures unique. Loader: `src/minigames/english/words.ts`.
- Themes (rough counts):
  | Theme | ~# | Examples |
  |-------|----|----------|
  | Types (from type data) | 17 | fire, water, grass, ice, rock, ghost, dragon |
  | Moves — real English words (from `moves.json` ids) | 25 | bite, scratch, growl, ember, bubble, cut, fly, surf, dig, rest, swift |
  | Pokémon world | 35 | ball, egg, berry, map, city, cave, tree, sea, bag, badge, trainer |
  | Actions (verbs) | 30 | run, jump, swim, sleep, eat, catch, throw, climb |
  | Describe | 35 | big, small, fast, slow, strong, hot, cold, happy, angry, tired |
  | Colours & shapes | 15 | red, blue, yellow, round, long |
  | Nature & weather | 25 | sun, rain, snow, wind, rock, flower, leaf |
  | Body | 15 | eye, ear, tail, wing, hand, leg |
  | Food | 20 | apple, bread, milk, cake, water |
  | Numbers & time | 20 | one … ten, day, night, morning |
- Validation test: unique ids, ≤ 8 letters for tier 1–2, `typeId` / `moveId` / `ref` exist, `he` not equal to `en`.

## Story 2: Learning progress
**Goal:** kids see words again until they know them.
- Built: `pd.miniGames['unown-words'].data.words[id] = { box 0–3, seen, right, day, upDay, rightDay, known }`.
  Right on the first try → up one box, at most once per day; wrong → box 0. **Known = box 3** (3 different days), and
  stays known. No save migration (game-owned data). Unown Letters keeps its `seen` letters as before.
- `pickWords()` weights: missed words most, then new, then learning; known words now and then. The mode's level sets the tier.
- `knownCount()` / `wordStatsOf()` for Sprint 11.

## Story 3: Modes
The game becomes a mode picker (each mode keeps its own levels + stars + prizes in the shell). Levels inside a mode
raise speed / choices / tier, not the word list.

| Mode | Feel | How it plays |
|------|------|--------------|
| **Unown Letters** | warm-up | Today's letter pop, big & small, first sound — merged, short |
| **Pokémon Says** | fun, fast | "Pikachu, **JUMP**!" (spoken + written) → tap the right action picture. Speeds up; a "Pokémon says" twist for older kids |
| **Find the Pokémon** | thinking | "Find the **BIG BLUE** Pokémon that can **SWIM**" → pick from 3–4 sprites. Clues from real Pokémon data (colour, type, size) + describe/colour words |
| **Word Catcher** | arcade | A flying Pokémon catches falling words that match the Hebrew word / picture; avoid the wrong ones. Reuses the Snorlax-style falling engine if it was made generic in Section A |
| **Memory Match** | calm | Flip cards, match English ↔ picture (level 2+: English ↔ Hebrew) |
| **Unown Battle** | spelling | A wild Unown appears; spell the word for the picture — each right letter is a hit, a full word is a critical. Replaces Type Speller / Scramble |

- Built, each its own game (`games/<id>/`, `category: 'english'`): `pokemon-says`, `find-pokemon`, `unown-battle`,
  `memory-match`, `word-catcher`; `unown-words` became **Unown Letters** (its 3 letter levels).
- Find the Pokémon's clues are data, no colours needed: size (height), weight, speed and type.
- Hebrew help shrinks with the mode's level (today's rule) — never shrinks for brand-new words.
- Every answer is spoken (`playWord`) — music is already capped under speech in mini-games.

## Story 4: Library visit
- **Gate round:** one random English mode at the trainer-rank level (built; "picked by what's due" was not needed —
  every mode already picks the due words).
- **Librarian free play:** all unlocked modes, normal prizes (daily cap).
- **Word Dex** (reason to come back): every known word becomes a card in a collection book (picture + EN + HE, 🔊).
  Milestones (25 / 50 / 100 / 200 words) give a prize — the big ones (e.g. Unown gift Pokémon, today's L7 prize) move here.
- **Word of the day:** shown at the top of the Word Dex (🔊); answering it right today in any mode → 200₽ once a day.
- Built: the Word Dex opens from the 📖 button of any picker that lists English games. Milestones (known words):
  10 → Rare Candy · 25 → Rare Candy ×3 · 50 → Unown (gift) · 100 → Master Ball · 200 → 5000₽.

## Story 5: Cleanup + QA
- Delete `src/scenes/english-learning.ts`, the `ENGLISH_LEARNING` scene and `menu.actions.learn` keys.
- Remove the old 7-level table (prizes moved to modes / Word Dex milestones).
- QA: play each mode in HE and EN; a new save only sees tier-1 words; wrong answers bring the word back soon;
  Word Dex grows; build + tests green.

## Open questions
- Should Find the Pokémon use Pokémon colours from PokeAPI (`species.color`) — needs a small fetch-data addition?
- Do we want a **Professor's Quiz** (Pokémon-world trivia: silhouettes, types, evolutions) as a second lab game or a
  Pokémon Center game? Not planned here.
