// src/scenesReact/party/index.ts
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { PartyScreen } from './PartyScreen.js';

export function createPartyReactScene(stateMachine: StateMachine): Scene {
  return {
    enter() {
      mountReactScene(PartyScreen, () => {
        unmountReactScene();
        stateMachine.pop();
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
  };
}
