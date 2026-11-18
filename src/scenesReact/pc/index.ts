// src/scenesReact/pc/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { PCScreen } from './PCScreen.js';

/** PC storage — move Pokémon between the team and the 10 PC boxes, or release them. */
export function createPCReactScene(stateMachine: StateMachine): Scene {
  return {
    enter() {
      mountReactScene(PCScreen, {
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
        },
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
    // Every control is a real button / tile — no d-pad needed on touch screens
    virtualControls: { dpad: false, utility: false },
  };
}
