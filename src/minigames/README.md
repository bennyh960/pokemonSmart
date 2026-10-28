# Mini-games — how a game plugs in

Design: `docs/stories/mini-games.md`. The shell does everything around the play area (picker, intro + level
picker, 3-2-1-GO, HUD, pause, results, stars, prizes, saving). **A game only renders its play area and reports
score / combo / finish.** Work only inside `src/minigames/games/<id>/`.

## Your folder

`games/<id>/index.ts` default-exports the def (already there, with the level table + prizes):

```ts
export default defineMiniGame<MyConfig>({
  id, name: { en, he }, tagline: { en, he }, theme: { from, to, accent, accentText },
  mascotPokemonId, music?,           // music = MUSIC_TRACKS key, optional
  levels: [{ number, name, goal?, rewards: { firstClear, threeStar, replay }, config: MyConfig }],
  Component: MyGame,                 // replace StubGame with your component
});
```

- Change `MyConfig` and the per-level `config` freely; the shell never reads it.
- Prizes: `prize(rarity, item('rare-candy', 2))`, `money(n)`, `giftPokemon(id, level)`, `evolutionStonePrize()`,
  `tmPrize()`, `prizeOneOf()` (from `../../define.js`). Rarity = card colour: `common | good | rare | epic`.
  `registry.test.ts` checks every item id exists — keep it green.
- Put game logic in pure TS modules next to the component, with vitest tests in `games/<id>/__tests__/`.

## Props (`MiniGameProps<C>` in `types.ts`)

| prop                                      |                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `level`                                   | the `MiniGameLevel<C>` being played (`level.config` is yours)                         |
| `runId`                                   | changes on every new round (the component is also remounted) — use as seed            |
| `paused`                                  | pause menu open: stop timers / rAF / input (use `active: !paused` on `useInputLayer`) |
| `hud`                                     | HUD helpers (below), stable object                                                    |
| `sfx`                                     | sounds (below)                                                                        |
| `theme`                                   | the game's colours                                                                    |
| `onFinish({ stars: 0-3, score, extra? })` | call **once** when the round ends; 0★ = not cleared (no prizes)                       |
| `onQuit()`                                | leave without a result (back to the intro card)                                       |

## HUD (`hud`)

`setScore(n)` · `addScore(delta, { x, y }?)` (floats "+N" at viewport coords, e.g. `e.clientX/Y`) ·
`setCombo(n)` (flame at ≥2, milestone sound + "Combo ×N" at 5/10/15…) · `setHearts(current, max)` ·
`startTimer(seconds, onDone)` (pauses with the game, ticks the last 5 s) · `stopTimer()` · `addTime(s)` ·
`getTimeLeft()` · `floatText(text, opts?)` · `confetti()` · `shake()` (wrong answer).
The HUD shows hearts / timer only once you call `setHearts` / `startTimer`.

## Sound (`sfx`)

`tap()` · `correct(combo)` (pentatonic bell, one note higher per combo step) · `wrong()` (soft boop) ·
`cry(pokemonId)` · `letter('a')` · `word('fire')` · `cue(name, opts)` for any other cue.
The shell already plays count / go / star / clear / record / ball-shake / prize / tick. Cue table:
`MINI_GAME_CUES` in `src/audio/audio-manager.ts`.

## Input

- Taps/clicks: normal React `onClick` / pointer events. Buttons ≥ 48px.
- Keys: `useInputLayer({ id, name, keyBindings, active: !paused, onAction })` from `engine/input`
  (fresh presses only). Held keys (e.g. moving Snorlax): poll `getInput().isKeyDown('ArrowLeft')` in your rAF.
- Escape / P are taken by the shell (pause). Don't bind them.

## Look

Tailwind + the classes in `shell/minigames.css` (`mg-pop-in`, `mg-bob`, `mg-bump`, `mg-glow`, `mg-btn`, …).
Put game-only keyframes in your own CSS file in your folder, prefixed `mg-<id>-`. English game content goes in a
`dir="ltr"` box; all UI text through `useI18n().t()` with keys in both locale files. Respect reduced motion
(`useReducedMotion()` from `shell/hooks.ts`). Pokémon sprites: `PokemonSprite` from `shell/ui.tsx`
(or `useGetPokemonSprite`) — never a hand-built path.

## Saved data

Stars / best / clears / prizes are saved by the shell (`pd.miniGames[id]`, `progress.ts`). For your own data
(e.g. unown-words `seen` letters) use `pd.miniGames[id].data` via `usePlayerData()`'s `mutate`:
`mutate((pd) => { (ensureGameProgress(pd.miniGames, 'unown-words').data ??= {}).seen = [...] })`.

## Care rounds

A def may set `care` (`MiniGameCare` in `types.ts`): a hurt party Pokémon of that evolution line, walking on a tile of
its `habitat`, asks to play (`care.ts`, triggered from the overworld). The shell then uses that Pokémon (`pokemonId`
prop), picks the level, hides the level picker and replaces the level prizes with the heal + rare bonus.
Games always get `pokemonId` — draw that sprite, not a fixed one.

## Launching

`startMiniGame(id, { level?, onFinish?, carePokemonUuid? })` / `openMiniGamePicker()` from `src/minigames/index.ts`.
Dev: start menu → Actions → Mini Games.
