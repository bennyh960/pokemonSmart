// src/scenesReact/party/index.ts
import type { Pokemon, Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { PartyScreen } from './PartyScreen.js';
import type { MoveLearningSession } from '../../systems/move-learning.js';

type MoveLearningConfirmAction = 'replace' | 'skip' | null;

export type PartyMode =
  | { kind: 'overworld' }
  | { kind: 'battle'; roster: Set<number>; maxSize: number; inBattleUUID: null | string }
  | {
      kind: 'select-target';
      itemId: string;
      itemName: string;
      description: string;
      isEligible?: (p: Pokemon) => boolean;
      onSelect?: (index: number) => boolean;
    }
  | { kind: 'move-learning'; session: MoveLearningSession };

export function createPartyReactScene(stateMachine: StateMachine, mode: PartyMode = { kind: 'overworld' }): Scene {
  return {
    enter() {
      mountReactScene(PartyScreen, {
        mode,
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
        },
        goToBag: () => {
          unmountReactScene();
          stateMachine.pop();
          stateMachine.push('BAG');
        },
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
  };
}
