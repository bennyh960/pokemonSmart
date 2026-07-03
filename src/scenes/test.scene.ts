/**
 * TestScene - A scene for testing purposes.
 */

import type { AudioManager } from '../audio/audio-manager';
import type { InputManager, VirtualControlPad } from '../engine/inputManagerV2';
// import type { InputManager } from '../engine/input';
import { drawText } from '../engine/renderer';
import type { StateMachine } from '../engine/state-machine';
import { loadGameFromSlot } from '../systems/game-state';
import type { Scene } from '../types';

const C = {
  BG: '#0d1a14',
  CARD_BG: '#0f2a1a',
  CARD_SEL: '#1a3a2a',
  BORDER: '#1a4a30',
  BORDER_SEL: '#2a6a40',
  SEP: '#1a3a2a',
  TEXT_PRI: '#ffffff',
  TEXT_SEC: '#aaccaa',
  TEXT_MUT: '#667766',
  TEXT_DIM: '#445544',
  TAB_BG: '#0a2a1a',
  TAB_ACT: '#1a5a35',
  TITLE_BG: '#0a1a10',
  BTM_BG: '#0a1a10',
  KEY_BG: '#1a3a2a',
  KEY_BRD: '#2a5a3a',
  KEY_BG_HOVER: '#1a5a35',
  KEY_BRD_HOVER: '#2a6a40',
  SEL_BAR: '#20d860',
  USE_BTN_BG: '#1a5a35',
  USE_BTN_BRD: '#2a6a40',
};

export function createTestScene(
  input: InputManager,
  stateMachine: StateMachine,
  _: AudioManager,
  pad: VirtualControlPad | null,
): Scene {
  let unsubscribe: (() => void) | undefined;

  return {
    enter(): void {
      loadGameFromSlot(0);
      pad?.setVisible([]);
      pad?.setExtraKeys([{ code: 'KeyX', label: 'Party' }]);

      unsubscribe = input.push({
        id: 'test-scene',
        name: 'TestScene',
        keyBindings: [{ code: 'KeyX', action: 'open-party' }],
        onAction: (action) => {
          if (action === 'open-party') {
            console.log('TestScene: open-party action triggered');
            stateMachine.push('TITLE');
          }
        },
      });
      console.log('[TestScene] pushed. Stack should have test-scene now.');
    },
    exit(): void {
      unsubscribe?.();
      pad?.setExtraKeys([]);
    },
    update(_dt: number): void {
      // nothing to poll — the action above is discrete, driven by the
      // keyBinding and the pad button, both firing the same handler
    },

    render(ctx: CanvasRenderingContext2D): void {
      drawText(ctx, 'Hello World', 10, 10, { size: 8, color: C.TEXT_PRI });
      drawText(ctx, 'Centered', 80, 10, { size: 8, color: C.TEXT_PRI, align: 'center' });
    },
  };
}
