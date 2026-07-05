// src/scenesReact/pokedex/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { PokedexScene } from './PokedexScene.js';

export type PokedexMode =
  | { kind: 'overworld' }
  | { kind: 'battle'; pokemonId: number; tab: 'battle' | 'evolution' | 'info' };

export function createPokedexReactScene(stateMachine: StateMachine, mode: PokedexMode = { kind: 'overworld' }): Scene {
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
