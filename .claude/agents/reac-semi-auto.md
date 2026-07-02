---
name: pokemon-react-skill
description: >
  Use this skill whenever adding a new React scene, popup, modal, or UI overlay
  to the Pokemon Math Adventure game. Triggers include: "add a React scene",
  "create a party/bag/pokédex/menu screen", "add a popup", "add a modal",
  "mount React over canvas", "add UI overlay", "create a new scene-react",
  "wire a scene to the state machine". This skill encodes the full architecture
  for React↔canvas integration in this specific codebase — always use it
  instead of guessing file locations or patterns. Stop and ask for file contents
  whenever a referenced path cannot be resolved.
---

# Pokemon Math Adventure — React UI Skill

## Project snapshot

| Concern       | Tech                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| Game loop     | Canvas + `requestAnimationFrame` in `src/engine/game.ts`                |
| Scene manager | Stack-based state machine in `src/engine/state-machine.ts`              |
| Player data   | Global singleton `getPlayerData()` in `src/services/game-state.ts`      |
| i18n          | `t()`, `getLocale()`, `isRTL()` in `src/i18n/i18n.ts`                   |
| React host    | `src/engine/react/react-scene-host.ts`                                  |
| Popup host    | `src/engine/react/popup-host.ts`                                        |
| Sprite cache  | `loadImage()` / `getCachedImage()` in `src/engine/sprite-loader.ts`     |
| Type colors   | `TYPE_BADGE` record in `src/data/type-badge.ts`                         |
| Styling       | Tailwind (core utilities only) + existing global CSS in `src/style.css` |

## Folder structure

```
src/
  engine/
    react/
      react-scene-host.ts   ← mounts/unmounts full React scenes
      popup-host.ts         ← mounts non-blocking popups over canvas
  ui-react/
    components/             ← shared reusable React components (buttons, badges…)
    context/
      i18n-context.tsx      ← I18nProvider + useI18n hook
    hooks/
      useDragSort.ts        ← reusable drag-and-drop reorder hook
  scenes-react/
    <scene-name>/
      index.ts              ← canvas shell scene (enter/exit/update/render)
      <SceneName>Screen.tsx ← React component (full screen)
      <SceneName>Card.tsx   ← sub-components if needed
  scenes/                   ← existing canvas scenes (do not touch unless migrating)
```

> **If you cannot resolve a path listed above, STOP and ask the user to share
> that file before continuing.**

---

## Decision tree — which pattern to use?

```
Is it inside a React scene already?
  └── YES → plain React state (useState / local modal component). Done.

Is it triggered from a canvas scene?
  ├── Should the game loop PAUSE?
  │     └── stateMachine.push('<SCENE_ID>') + React scene (Pattern A)
  └── Should the game loop KEEP RUNNING?
        └── showPopup() from popup-host (Pattern B)
```

**Always ask the user** before assuming pause vs. keep-running for new popups.
Suggested question: _"Should the game loop pause while this is shown, or keep
running underneath (e.g. for a toast/notification)?"_

---

## Pattern A — Full React scene (loop pauses)

### 1. Canvas shell — `src/scenes-react/<name>/index.ts`

```typescript
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { <Name>Screen } from './<Name>Screen.js';

export function create<Name>ReactScene(stateMachine: StateMachine): Scene {
  return {
    enter() {
      mountReactScene(<Name>Screen, () => {
        unmountReactScene();
        stateMachine.pop();
      });
    },
    exit() {
      unmountReactScene(); // safety guard for change() calls
    },
    update() {},
    render() {},
  };
}
```

### 2. Register in `src/engine/game.ts`

```typescript
import { create<Name>ReactScene } from '../scenes-react/<name>/index.js';

// replace or add inside createGame():
stateMachine.register('<SCENE_ID>', create<Name>ReactScene(stateMachine));
```

### 3. React component — `src/scenes-react/<name>/<Name>Screen.tsx`

```tsx
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { getPlayerData } from '../../services/game-state.js';

interface Props { onClose: () => void; }

export function <Name>Screen({ onClose }: Props) {
  const { t, isRTL, locale } = useI18n();
  const pd = getPlayerData(); // direct singleton access — no prop drilling

  return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col"
         dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-700/50">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-5 py-4">
          <h1 className="text-white text-xl font-bold">{t('<scene>.title')}</h1>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">✕</button>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* scene content here */}
        </div>
      </div>
    </div>
  );
}
```

---

## Pattern B — Non-blocking popup (loop keeps running)

### Usage from any canvas scene

```typescript
import { showPopup } from '../../engine/react/popup-host.js';
import { <Name>Popup } from '../../scenes-react/popups/<Name>Popup.js';

// call once — guard with a flag so it's not called every frame:
if (condition && !popupShown) {
  popupShown = true;
  showPopup(<Name>Popup, { /* props minus onClose */ }, () => {
    popupShown = false;
    condition = false;
  });
}
```

### Popup component

```tsx
import { useEffect } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';

interface Props {
  onClose: () => void;
  // add your own props here (e.g. item: Item)
}

export function <Name>Popup({ onClose }: Props) {
  const { t } = useI18n();

  // optional auto-dismiss:
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2
                    bg-zinc-800 border border-zinc-600 rounded-xl
                    px-6 py-4 shadow-2xl text-white text-sm">
      {t('popup.message')}
    </div>
  );
}
```

`showPopup` signature (from `popup-host.ts`):

```typescript
showPopup<P extends { onClose: () => void }>(
  Component: ComponentType<P>,
  props: Omit<P, 'onClose'>,
  onClose?: () => void
): void
```

---

## Shared hooks

### `useDragSort` — `src/ui-react/hooks/useDragSort.ts`

Reusable for any ordered list (party, moves, etc.).

```typescript
import { useDragSort } from '../../ui-react/hooks/useDragSort.js';

const { onDragStart, onDragOver, onDragEnd } = useDragSort(items, (next) => {
  setItems(next);
  pd.someArray.splice(0, pd.someArray.length, ...next); // write back to singleton
});
```

Each draggable element needs:

```tsx
<div
  draggable
  onDragStart={() => onDragStart(index)}
  onDragOver={(e) => onDragOver(e, index)}
  onDragEnd={onDragEnd}
  style={{ touchAction: 'none' }}
>
```

---

## i18n in React

Always use `useI18n()` — never import `t`, `isRTL`, or `getLocale` directly in components.
`I18nProvider` is already applied once in `react-scene-host.ts` and `popup-host.ts`.

```tsx
const { t, isRTL, locale } = useI18n();
// locale: 'en' | 'he'
// isRTL: boolean — use as dir={isRTL ? 'rtl' : 'ltr'} on root element
// t('key', { param: value }) — same signature as the canvas t()
```

Add new keys to **both** `src/i18n/locales/en.json` and `src/i18n/locales/he.json`.

---

## Sprite loading in React

```tsx
import { useState, useEffect } from 'react';
import { loadImage, getCachedImage } from '../../engine/sprite-loader.js';

const [sprite, setSprite] = useState<string | null>(
  getCachedImage(url)?.src ?? null, // sync check first (already cached?)
);

useEffect(() => {
  let cancelled = false;
  loadImage(url)
    .then((img) => {
      if (!cancelled) setSprite(img.src);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
}, [url]);
```

Always cancel on unmount with the `cancelled` flag to avoid setState on unmounted components.

---

## Type badges

```tsx
import { TYPE_BADGE } from '../../data/type-badge.js';

<span
  className="text-xs px-3 py-1 rounded-full font-medium"
  style={{
    background: TYPE_BADGE[type].bg,
    border: `1px solid ${TYPE_BADGE[type].border}`,
    color: TYPE_BADGE[type].color,
  }}
>
  {locale === 'he' ? TYPE_BADGE[type].he : TYPE_BADGE[type].en}
</span>;
```

---

## Tailwind + existing CSS coexistence

- Use Tailwind utility classes for all React component styling.
- Never add styles to `src/style.css` that could conflict with canvas/existing selectors.
- For animations not in Tailwind core, add `@keyframes` + class to `src/style.css`:

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.25s ease-out both;
}
```

- Use staggered `animationDelay` on list items for entrance feel:
  ```tsx
  style={{ animationDelay: `${index * 60}ms` }}
  className="animate-fade-in-up"
  ```

---

## Layout defaults for full-screen scenes

```tsx
{/* Outer — full screen, dark bg, RTL-aware */}
<div className="fixed inset-0 bg-zinc-900 flex flex-col" dir={...}>

  {/* Header — constrained width, sticky */}
  <div className="shrink-0 border-b border-zinc-700/50">
    <div className="max-w-7xl mx-auto w-full flex items-center justify-between px-5 py-4">

  {/* Scrollable content — responsive grid */}
  <div className="flex-1 overflow-y-auto">
    <div className="max-w-7xl mx-auto px-4 py-4
                    grid gap-3
                    grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                    auto-rows-min">

  {/* Footer */}
  <div className="shrink-0 border-t border-zinc-700/50">
    <div className="max-w-7xl mx-auto px-5 py-3">
```

---

## Existing scene reference — Party

The Party scene is the canonical example. When in doubt, mirror its structure:

```
src/scenes-react/party/
  index.ts          ← createPartyReactScene(stateMachine)
  PartyScreen.tsx   ← full-screen layout, drag-and-drop list
  PokemonCard.tsx   ← card component with sprite, HP bar, type badges
```

Registered in `game.ts` as `'PARTY'`.

---

## Checklist for every new React scene

- [ ] Created `src/scenes-react/<name>/index.ts` with shell scene
- [ ] Created `src/scenes-react/<name>/<Name>Screen.tsx`
- [ ] Registered in `src/engine/game.ts` via `stateMachine.register()`
- [ ] Added i18n keys to both locale files
- [ ] Root element has `dir={isRTL ? 'rtl' : 'ltr'}`
- [ ] Data read directly from `getPlayerData()` — no prop drilling
- [ ] Sprite loads use `getCachedImage` (sync) + `loadImage` (async) pattern
- [ ] Asked user: pause loop or keep running? (for popups/modals from canvas)
