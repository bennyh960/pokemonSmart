# Battle Animation System — LLM Skill Doc

Use this document as context when debugging, modifying, or creating new battle animations.

---

## Architecture Overview

There are two parallel systems that run together:

1. **`BattleAnimationDirector`** (`src/ui/battle-animation-director.ts`)
   Moves _sprites_ (position, scale, rotation, alpha) using a step-based tween queue.

2. **`AttackEffect` / `renderAttackEffect`** (`src/ui/battle-animations.ts`)
   Draws the _visual canvas effect_ (beam, projectile, earthquake cracks, etc.) directly onto the canvas each frame.

The battle scene render loop drives both:

```typescript
if (attackFx) renderAttackEffect(ctx, attackFx);
if (shake) applyShake(ctx, shake); // applied before drawing sprites
if (shake) resetShake(ctx, shake); // undone after drawing sprites
if (flash) renderFlash(ctx, flash);
```

---

## Full Call Flow

```
battle_scene.ts (update)
  └─ playAttackAnimation()                   [play-attack-animation.ts]
       ├─ getAttackAnimationProfile()         [move-animation.ts]  → AttackAnimationProfile
       ├─ audio.playMoveSFX(move.name)
       └─ ANIMATION_FAMILIES[profile.family](args)
            OR playDefaultFamilyAnimation(args)
                 └─ animationDirector.play(sequenceStep(...))
                       ├─ callStep → context.attackFx = createAttackEffect(...)
                       ├─ waitStep(profile.impactTime)
                       ├─ callStep → onImpact()           ← HP drain, flash, shake, text
                       └─ buildRecoilStep(...)            ← defender nudge animation
```

### Alternative entry via `runMoveLifecycle()`

Used for ~7 special moves (Substitute, Belly Drum, Haze, etc.) where game logic
needs a pre-flight `canExecute()` check before the animation runs:

```
runMoveLifecycle({ move, canExecute, onImpact, ... })
  ├─ canExecute()  → if fails: set textBox + phase, return early
  └─ playAttackAnimation(..., () => {
         onImpact()           ← caller's state changes
         context.textBox = createTextBox(result.endMessages)
         context.phase = nextPhase
     })
```

---

## Key Types

### `AttackAnimationProfile`

Returned by `getAttackAnimationProfile()` in `move-animation.ts`.

```typescript
interface AttackAnimationProfile {
  family: string; // which animation family / canvas renderer to use
  color: string; // primary type color (hex)
  accentColor: string; // secondary / highlight color (hex)
  flashColor: string; // screen flash color on impact
  duration: number; // how long the attackFx canvas effect plays (seconds)
  impactTime: number; // when onImpact() fires relative to animation start (seconds)
  selfTarget: boolean; // true = effect goes attacker→attacker (heal/boost moves)
  shakeIntensity: number; // screen shake strength on impact (0 = no shake)
  variant?: string; // optional hint passed to the canvas renderer
}
```

### `AnimationArgs`

Passed to every animation family function and to `playDefaultFamilyAnimation`.

```typescript
interface AnimationArgs {
  attackerActor: 'player' | 'enemy';
  defenderActor: 'player' | 'enemy';
  attackerPokemon: Pokemon;
  profile: AttackAnimationProfile;
  move: Pokemon['moves'][number];
  animationDirector: BattleAnimationDirector;
  source: { x: number; y: number }; // pixel anchor of attacker
  target: { x: number; y: number }; // pixel anchor of defender (or attacker if selfTarget)
  attackerStart: BattleActorState; // snapshot of attacker sprite state at animation start
  defenderStart: BattleActorState; // snapshot of defender sprite state at animation start
  context: BattleAnimationContext;
  onImpact: () => void;
  hitTarget: boolean; // false = miss or status move that doesn't hit
  hitCount: number; // multi-hit moves (Fury Attack etc.)
}
```

### `BattleActorState`

The mutable state of a sprite managed by the director.

```typescript
interface BattleActorState {
  x: number; // offset from default position
  y: number;
  scaleX: number; // default 1.0
  scaleY: number;
  alpha: number; // 0–1
  rotation: number; // radians
  visible: boolean;
}
```

Actors: `'player' | 'enemy' | 'trainer' | 'ball'`

---

## Director Step Types

All steps come from `battle-animation-director.ts`. Use the factory helpers:

```typescript
waitStep(duration: number)
callStep(fn: () => void)
tweenActorStep(actor, to: Partial<BattleActorState>, duration, easing?)
sequenceStep(...steps)   // runs steps one after another
parallelStep(...steps)   // runs steps simultaneously, waits for all to finish
```

Easing options: `'linear' | 'easeIn' | 'easeOut' | 'easeInOut'` (default: `'easeInOut'`)

A `tweenActorStep` with `duration: 0` snaps immediately.

---

## `createAttackEffect` — Canvas Effect

```typescript
createAttackEffect({
  kind: AttackEffectKind,   // matches profile.family for default flow
  sourceX, sourceY,         // attacker anchor pixels
  targetX, targetY,         // defender anchor pixels
  color,                    // profile.color
  accentColor?,             // profile.accentColor (default: '#ffffff')
  duration?,                // profile.duration
  variant?,                 // profile.variant
  power?,                   // move.power (used for size scaling via getPowerScale)
})
```

The returned `AttackEffect` is assigned to `context.attackFx`.
The render loop calls `renderAttackEffect(ctx, attackFx)` every frame until `attackFx.timer >= attackFx.duration`.

---

## `AttackEffectKind` — All Canvas Renderers

```
projectile | beam | pulse | burst | dragon-aura | flamethrower | leaf-spray |
water-flow | psychic-wave | rock-throw | rock-slide | fire-blast | giga-drain |
lightning | vine-whip | heal-pulse | double-team | solar-beam | rapid-spin |
twister-spin | icy-wind | electroweb | protect-shield | earthquake | fly-vanish |
dig-vanish | smoke-screen | mist-veil | haze-clear | punch | surf-wave |
powder | shadow-ball | bite | night-shade | lunge | self-boost | self-boost-cooler
```

---

## Animation Family Registry

`ANIMATION_FAMILIES` in `animation-families.ts` is a `Record<string, (args: AnimationArgs) => void>`.

Implemented families (non-default): `rapid-spin`, `twister-spin`, `double-team`, `self-boost`,
`self-boost-cooler`, `pulse`, `burst`, `earthquake`, `lunge`

All other families fall through to `playDefaultFamilyAnimation`.

### Default family flow

```typescript
animationDirector.play(
  sequenceStep(
    callStep(() => { context.attackFx = createAttackEffect({...}) }),
    waitStep(profile.impactTime),
    callStep(() => onImpact()),
    buildRecoilStep(args, recoilOffset, 0.17),
  )
)
```

### Custom family pattern

Custom families always call `animationDirector.play(sequenceStep(...))`.
They differ from default in that they may:

- Add `tweenActorStep` on the attacker (charge-up, spin, lunge forward)
- Use `parallelStep` to run sprite tween + effect simultaneously
- Skip or customize the recoil step
- Trigger `onImpact` at a different point in the sequence

Example — `rapid-spin`:

```typescript
sequenceStep(
  callStep(() => { context.attackFx = createAttackEffect({...}) }),
  parallelStep(
    tweenActorStep(attackerActor, { scaleX: 0.82, scaleY: 0.82, rotation: start + Math.PI * 6 },
      profile.impactTime, 'linear'),
  ),
  callStep(() => args.onImpact()),
  parallelStep(
    hitTarget
      ? sequenceStep(
          tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.07),
          tweenActorStep(defenderActor, defenderStart, 0.1),
        )
      : waitStep(0.17),
    tweenActorStep(attackerActor, { ...attackerStart }, 0.15, 'easeOut'),
  ),
)
```

---

## Recoil Helpers

```typescript
// recoilOffset: positive = right, negative = left
function buildRecoilValues(args): { powerScale; recoilOffset };
// powerScale = max(1, move.power / 50), capped at 1.5x distance
// player attacker → recoils defender rightward; enemy attacker → leftward

function buildRecoilStep(args, recoilOffset, recoveryDuration): BattleAnimationStep;
// Only applies if: move.power > 0 AND hitTarget AND !profile.selfTarget
// Otherwise: waitStep(0.17)
```

---

## `move-animation.ts` — Profile Lookup

`getAttackAnimationProfile(move: MoveLike): AttackAnimationProfile`

Resolution order (first match wins):

1. Named move overrides (`matchesAny(moveName, SOME_MOVES_LIST)`) — highest priority
2. ...more named groups...
3. Type-based fallback (uses `move.type` to pick a family like `'beam'`, `'projectile'`, etc.)

`normalizeName()` lowercases and strips punctuation before matching.
`getTypeColor(type)` and `getFlashColor(type, color)` derive hex colors from the Pokémon type.

---

## `onImpact` in Normal Damaging Flow

The `onImpact` callback passed to `playAttackAnimation` from the main battle scene update
is a large inline function. It handles (in order):

- Rest / heal% moves: restore HP, `spawnDamageNumber`, `audio.playSFX('heal')`
- Damage application: `applyMoveImpact()` per hit, substitute checks
- Drain healing: `applyDrainHealing()` → `spawnDamageNumber` + heal SFX
- Recoil damage: `applyRecoilDamage()` → `flash = createFlash(...)`, `shake = createShake(...)`
- Contact ability effects on attacker
- Destiny Bond, Brick Break, Rapid Spin clears, Defog, lock-in teardown

Flash and shake for the _defender being hit_ are handled inside `applyMoveImpact()` itself,
not in the onImpact callback.

---

## How to Add a New Animation Family

1. **`move-animation.ts`**: Add a `matchesAny(moveName, MY_MOVES)` block returning a profile
   with the new `family` string, appropriate `duration`, `impactTime`, `shakeIntensity`.

2. **`battle-animations.ts`**: Add the new `kind` to `AttackEffectKind` union and add a
   `renderMyNewEffect(ctx, effect)` function. Wire it inside `renderAttackEffect`'s switch.

3. **`animation-families.ts`** (optional): If the sprite tween behavior differs from default,
   add `'my-family': (args) => { ... }` to `ANIMATION_FAMILIES`.
   If the default sequence (spawn fx → wait → impact → recoil) is fine, skip this step.

### Minimal new family (canvas effect only, default sprite behavior):

```typescript
// move-animation.ts
if (matchesAny(moveName, MY_MOVE_NAMES)) {
  return {
    family: 'my-effect',
    color, accentColor: WHITE,
    duration: 0.5, impactTime: 0.35,
    selfTarget: false, shakeIntensity: 2,
    flashColor, variant,
  };
}

// battle-animations.ts — add to AttackEffectKind union
| 'my-effect'

// battle-animations.ts — add renderer
function renderMyEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  // t goes 0→1 over effect.duration seconds
  // effect.sourceX/Y = attacker anchor
  // effect.targetX/Y = defender anchor
  // effect.color, effect.accentColor, effect.power
}

// battle-animations.ts — wire in renderAttackEffect switch
case 'my-effect': renderMyEffect(ctx, effect); break;
```

---

## Coordinate Reference

```
Player sprite anchor (source when player attacks):
  x = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w * 0.62 + actorState.x
  y = BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h * 0.36 + actorState.y

Enemy sprite anchor (source when enemy attacks):
  x = BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w * 0.38 + actorState.x
  y = BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h * 0.44 + actorState.y

Screen logical size: LOGICAL_WIDTH × LOGICAL_HEIGHT  (from engine/config.ts)
Earthquake ground strip: y = 34 to 84
```

---

## Common Gotchas

- **`impactTime` vs `duration`**: `impactTime` is when `onImpact()` fires (can exceed `duration`
  — e.g. giga-drain has `duration: 1.0` but `impactTime: 1.3`). The canvas effect ends at
  `duration`; game state changes happen at `impactTime`.
- **`hitTarget: false`**: means the move missed or is a non-hitting status. `buildRecoilStep`
  skips the defender nudge. `onImpact` still fires (text box still needs to appear).
- **`selfTarget: true`**: `target` anchor = attacker anchor. `buildRecoilStep` also skips
  the defender nudge regardless of `hitTarget`.
- **`power: 0`**: treated as a status move. `getPowerScale` returns 1. Recoil distance = 8px.
- **Earthquake `shake`**: has its own internal `earthequakeShake` variable inside
  `renderEarthquakeEffect` — separate from the scene-level `shake`. Don't confuse them.
- **`actorState.x/y` are offsets**, not absolute positions. Default is `{x:0, y:0}`.
  Always use `attackerStart` / `defenderStart` snapshots when building relative tweens.
- **`parallelStep` finishes when the longest child finishes.** Short children don't block.
- **`callStep` fires instantly** on the same frame it's reached; use `waitStep(0)` if you
  need a one-frame gap.
