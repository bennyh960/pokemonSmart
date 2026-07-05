// src/scenesReact/pokdex/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { PokedexScene } from './PokedexScene.js';

export type PokdexMode = any;

export function createPokedexReactScene(stateMachine: StateMachine, mode: PokdexMode = { kind: 'overworld' }): Scene {
  return {
    enter() {
      mountReactScene(PokedexScene, {
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
