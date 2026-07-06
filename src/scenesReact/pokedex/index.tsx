// src/scenesReact/pokedex/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { PokedexScene } from './PokedexScene.js';

export type PokedexMode =
  | { kind: 'overworld' }
  | { kind: 'party'; pokemonId: number; tab?: 'battle' | 'evolution' | 'info' }
  | { kind: 'battle'; pokemonId: number; tab: 'battle' | 'evolution' | 'info' };

export function createPokedexReactScene(stateMachine: StateMachine, mode: PokedexMode = { kind: 'overworld' }): Scene {
  return {
    enter() {
      mountReactScene(PokedexScene, {
        mode,
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
          if (mode.kind === 'battle' && mode.tab === 'evolution') {
            // evolution open new scene so we need to pop twice to go back to the previous scene
            stateMachine.pop();
          }
        },
        stateMachine,
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
    virtualControls: {
      utility: [
        { id: 'v-enter', label: '⏎ ENTER', key: 'Enter', className: 'vEnter' },
        { id: 'v-esc', label: 'ESC', key: 'Escape', className: 'vEsc' },
      ],
    },
  };
}
