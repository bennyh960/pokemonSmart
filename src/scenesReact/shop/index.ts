// src/scenesReact/shop/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { rollShopDiscount, type ShopConfig } from '../../systems/shop.js';
import { ShopScreen } from './ShopScreen.js';

/** Every item category, no tag filter — the admin N shortcut. */
export const FULL_SHOP: ShopConfig = { categoriesToExclude: [], categoryTags: {} };

/**
 * Opens the Poké Mart over the current scene. A new discount is rolled for every visit.
 * `onClosed` runs after the shop pops (e.g. the overworld shows its HUD again).
 */
export function openShopScene(stateMachine: StateMachine, config: ShopConfig, onClosed?: () => void): void {
  const scene: Scene = {
    enter() {
      mountReactScene(ShopScreen, {
        config,
        discount: rollShopDiscount(),
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
          onClosed?.();
        },
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
    // Every control is a real button — no d-pad needed on touch screens
    virtualControls: { dpad: false, utility: false },
  };
  stateMachine.pushDirect('SHOP', scene);
}
