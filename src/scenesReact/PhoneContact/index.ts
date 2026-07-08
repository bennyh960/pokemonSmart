// src/scenesReact/pokedex/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import PhoneContactScene from './PhoneContactScene.js';

export type PhoneContactMode = { kind: 'overworld' };

export function createPhoneContactReactScene(
  stateMachine: StateMachine,
  mode: PhoneContactMode = { kind: 'overworld' },
): Scene {
  return {
    enter() {
      mountReactScene(PhoneContactScene, {
        mode,
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
        },
        stateMachine,
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
  };
}
