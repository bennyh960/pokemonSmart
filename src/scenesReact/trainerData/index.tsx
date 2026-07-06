// src/scenesReact/trainerData/index.tsx
import type { Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import TrainerData from './TrainerData.js';

export function createTrainerDataReactScene(stateMachine: StateMachine): Scene {
  return {
    enter() {
      mountReactScene(TrainerData, {
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
