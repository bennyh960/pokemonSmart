/** MINI_GAME — React scene shell (game loop paused underneath). Launch it with startMiniGame(). */

import type { Scene } from '../types/index.js';
import type { StateMachine } from '../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../engine/react/react-scene-host.js';
import { bindMiniGameStateMachine, takeMiniGameLaunch, type MiniGameOutcome } from './launch.js';
import { MiniGameApp } from './shell/MiniGameApp.js';

export function createMiniGameReactScene(stateMachine: StateMachine): Scene {
  bindMiniGameStateMachine(stateMachine);
  return {
    enter() {
      const launch = takeMiniGameLaunch();
      let last: MiniGameOutcome | null = null;
      mountReactScene(MiniGameApp, {
        launch,
        onOutcome: (o) => {
          last = o;
        },
        onClose: () => {
          unmountReactScene();
          stateMachine.pop();
          launch.onFinish?.(last);
        },
      });
    },
    exit() {
      unmountReactScene();
    },
    update() {},
    render() {},
    // The shell has its own big touch buttons
    virtualControls: { dpad: false, utility: false, numbers: false },
  };
}
