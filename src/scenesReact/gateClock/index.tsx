// src/scenesReact/gateClock/index.tsx
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { getActiveGateId, clearActiveGate } from '../../systems/story-engine.js';
import GateClock from './GateClock.js';

/** Clock challenge opened by talking to a green gate light (see systems/gate-lights.ts). */
export function createGateClockReactScene(stateMachine: StateMachine): Scene {
  return {
    enter() {
      const gateId = getActiveGateId();
      if (!gateId) {
        stateMachine.pop();
        return;
      }
      mountReactScene(GateClock, {
        gateId,
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
        },
      });
    },
    exit() {
      clearActiveGate();
      unmountReactScene();
    },
    update() {},
    render() {},
  };
}
