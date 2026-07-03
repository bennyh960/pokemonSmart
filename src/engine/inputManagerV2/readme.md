# input-manager

One authority for keyboard, mouse, and touch input, shared across React
components and canvas/game-loop code in the same app.

```
input-manager/
├── InputManager.ts
├── types.ts
├── index.ts
├── adapters/
│   ├── keyboardAdapter.ts
│   ├── pointerAdapter.ts
│   └── virtualButtonAdapter.ts
├── dom/
│   └── VirtualControlPad.ts
├── utils/
│   └── deviceDetection.ts
└── react/
    ├── useInputLayer.ts
    ├── useInputStack.ts
    ├── useIsTouchPrimary.ts
    └── VirtualKeyButton.tsx
```

## The core idea

Separate **trigger** (a key, a click, a tap) from **action** (a semantic
string like `"pause"` or `"confirm"`). Layers map triggers to actions.
Nothing ever reacts to a raw event directly — only to the action it
resolved to. This is what lets the exact same handler be driven by
`Enter`, a mouse click, and a tap, with one implementation.

Scoping — "who is allowed to react to input right now" — only needs to be
built by hand for **keyboard**, because keys have no on-screen position.
**Mouse and touch already have a position**, and the browser's own paint
order resolves scoping for free _as long as you're using real DOM
elements_ (a `<div>` on top of another physically blocks clicks from
reaching what's underneath it). Inside a `<canvas>`, that free scoping
disappears — the browser sees one opaque rectangle — so canvas pointer
input needs the same manual arbitration as keyboard. That's why this
module handles both, through the same stack, but the pointer half is
usually a canvas-only concern.

## Files

```
input-manager/
├── types.ts                     shared vocabulary (Layer, KeyBinding, etc)
├── InputManager.ts               the singleton: stack + dispatch
├── adapters/
│   ├── keyboardAdapter.ts        one global window keydown/keyup listener
│   └── pointerAdapter.ts         pointerdown on a single element (mouse+touch+pen)
├── react/
│   ├── useInputLayer.ts          push/pop a layer for a component's lifetime
│   └── useInputStack.ts          observe the stack (debug HUD, etc) — optional
└── index.ts                      public exports
```

## Bootstrap (once, at app startup)

```ts
import { inputManager, attachKeyboardAdapter } from './input-manager';

// exactly once per app — this is the only place a raw keydown listener
// should exist anywhere in the codebase
attachKeyboardAdapter(inputManager);
```

If you also have a canvas that draws its own UI:

```ts
import { inputManager, attachPointerAdapter } from './input-manager';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const detachPointer = attachPointerAdapter(inputManager, canvas);
// call detachPointer() if the canvas is ever torn down
```

## Using it from React

```tsx
import { useInputLayer } from './input-manager';

function PauseMenu({ onResume }: { onResume: () => void }) {
  useInputLayer({
    id: 'pause-menu',
    name: 'PauseMenu',
    blocksLowerLayers: true, // gameplay beneath gets nothing while this is open
    keyBindings: [
      { code: 'Escape', action: 'back' },
      { code: 'ArrowUp', action: 'nav-up' },
      { code: 'ArrowDown', action: 'nav-down' },
    ],
    onAction: (action) => {
      if (action === 'back') onResume();
      // ...
    },
  });

  return <div>{/* real DOM buttons here just use onClick, no manager needed */}</div>;
}
```

Mount = push, unmount = pop. That's the whole integration point. If this
component is rendered on top of a canvas scene that's _also_ pushed a
layer, the canvas scene's own `isTopLayer()` / `isKeyHeld()` checks
automatically start returning false the moment this mounts — there is no
separate coordination step, because both are reading the same stack.

## Using it from a canvas scene (no React at all)

```ts
import { inputManager } from './input-manager';

class BattleScene {
  private unsubscribe?: () => void;

  init() {
    this.unsubscribe = inputManager.push({
      id: 'battle',
      name: 'BattleScene',
      keyBindings: [{ code: 'Escape', action: 'open-menu' }],
      hitTest: (point) => this.hitTestUi(point), // your own bounds checking
      onAction: (action) => {
        if (action === 'open-menu') this.openMenu();
      },
    });
  }

  update(dt: number) {
    // Only move if nothing (no React modal, no other scene) is above us.
    if (inputManager.isKeyHeld('KeyD', 'battle')) {
      this.player.x += this.speed * dt;
    }
  }

  destroy() {
    this.unsubscribe?.();
  }
}
```

## Why `isKeyHeld(code, layerId)` instead of exposing the raw held-keys set

An earlier version of this exposed `heldKeys` directly and expected every
caller to remember to guard reads with `isTopLayer()` first. That's an
easy discipline to forget, and forgetting it silently reintroduces "the
background scene keeps moving while a menu is open" — the exact bug this
whole module exists to prevent. `isKeyHeld` bakes the check in, so
misusing it isn't an available option.

## Why keyboard uses `event.code`, not `event.key`

`event.code` is the physical key position ("KeyW" stays "KeyW" on an
AZERTY keyboard even though the printed letter changes) — correct for
game-style movement controls. If you need a layout-aware shortcut (Ctrl+S
should always mean "save," on whatever key physically produces the
letter S for that user), bind on `event.key` for that specific case
instead. `KeyBinding.code` is deliberately named `code`, not `key`, as a
reminder of which one you're matching.

## What this module does **not** do for you

- **Hover/drag/gesture** — only discrete pointer-down and held-key
  polling are covered. Hover highlighting, drag-to-move, and multi-touch
  gestures need their own dispatch methods layered on top of the same
  stack, following the pattern `handlePointerDown` already establishes.
- **Gamepad input** — a separate, polled browser API
  (`navigator.getGamepads()`), not wired in here.
- **Accessibility for canvas UI** — a canvas-drawn menu is invisible to
  screen readers no matter how correctly this manager arbitrates it
  internally. If a canvas UI needs to be accessible, that requires a
  separate, deliberately maintained ARIA layer — this module doesn't and
  can't provide that automatically.
- **Duplicate-binding detection** — unlike a flat "every listener races
  every other listener" registry, the layer stack removes most binding
  ambiguity structurally (topmost layer wins, deterministically), so
  there's less need for the dev-time duplicate warnings that model
  requires. If you want one anyway, it's a small addition to `push()`.

## Touch support

**Taps** already work with no extra code: `attachPointerAdapter` listens
for `pointerdown`, which the Pointer Events API fires for mouse clicks,
touch taps, and pen input alike — one adapter, one code path, regardless
of device. For real DOM buttons, native `onClick` already fires on tap
too; nothing manager-specific is needed there either.

**Held/continuous input** (an on-screen d-pad button you hold to keep
moving) needed two additions, since `heldKeys` was previously only ever
populated by real `keydown`/`keyup`:

```ts
inputManager.pressVirtualKey('ArrowLeft'); // on pointerdown
inputManager.releaseVirtualKey('ArrowLeft'); // on pointerup / pointerleave / pointercancel
```

`isKeyHeld(code, layerId)` doesn't care whether a code entered `heldKeys`
via a physical key or a virtual press — so gameplay movement code needs
**zero changes** to also work from touch. `react/VirtualKeyButton.tsx` is
a ready-made button wired to both calls, including the touch-specific
edge case where a finger slides off the button without a clean
`pointerup` (handled via `onPointerLeave` + `onPointerCancel` — skipping
either risks a permanently "stuck" held key).

```tsx
import { VirtualKeyButton } from './input-manager';

<VirtualKeyButton code="ArrowLeft">◀</VirtualKeyButton>;
```

## The one rule that makes all of this hold

**Nothing outside this module registers its own keyboard or pointer
listener.** The moment something does — a stray
`window.addEventListener('keydown', ...)` in an unrelated file — that
input source is invisible to the stack, and every scoping guarantee
described above stops applying to it. Route everything through
`inputManager`, always.
