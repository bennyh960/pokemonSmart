/**
 * GateScene — Verification gate placeholder UI.
 *
 * For Sprint 7A, gates render "Press Enter to continue" — no actual
 * question logic yet. The QuestionGateDef is read to display the title
 * and description from the data registry.
 *
 * When the player presses Enter:
 *   1. The gate's successActions are executed via the story engine.
 *   2. The gate's `reopenCooldownMs` determines lock duration (0 = permanent).
 *   3. The scene pops back to the overworld.
 *
 * The gate fires the 'gate-cleared' trigger so story events can respond.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { drawText, fillRect } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { isRTL, getLocale } from '../i18n/i18n.js';
import { getGate } from '../data/story/gates.js';
import { fireStoryTrigger, unlockGatePermanent, unlockGateTimed, getActiveGateId, clearActiveGate } from '../systems/story-engine.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import type { StoryAction } from '../data/story/events.js';

export function createGateScene(
  input: InputManager,
  stateMachine: StateMachine,
): Scene {
  let gateId: string | null = null;
  let phase: 'prompt' | 'result' = 'prompt';
  let resultMessage = '';

  return {
    enter(): void {
      gateId = getActiveGateId();
      phase = 'prompt';
      resultMessage = '';
    },

    exit(): void {
      clearActiveGate();
    },

    update(_dt: number): void {
      if (phase === 'prompt') {
        if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
          // Player cancelled — don't clear, just exit
          stateMachine.pop();
          return;
        }

        if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
          handlePass();
        }
      } else {
        // result phase: any key dismisses
        if (
          input.isKeyPressed('Enter') ||
          input.isKeyPressed(' ') ||
          input.isKeyPressed('Escape')
        ) {
          stateMachine.pop();
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      const rtl = isRTL();
      const locale = getLocale();
      const gate = gateId ? getGate(gateId) : null;

      // Dark overlay
      fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#0a0a1a');

      // Top accent bar
      fillRect(ctx, 0, 0, SCREEN_W, 3, '#00d4ff');

      // Title
      const titleText = gate
        ? (locale === 'he' ? gate.title.he : gate.title.en)
        : (locale === 'he' ? 'מחסום' : 'Checkpoint');

      drawText(ctx, titleText, SCREEN_W / 2, 18, {
        size: 9,
        color: '#00d4ff',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });

      if (phase === 'prompt') {
        // Description
        const descText = gate?.description
          ? (locale === 'he' ? gate.description.he : gate.description.en)
          : (locale === 'he' ? 'המסלול הזה דורש אימות.' : 'This path requires verification.');

        drawText(ctx, descText, SCREEN_W / 2, 50, {
          size: 7,
          color: '#aaaaaa',
          align: 'center',
          maxWidth: SCREEN_W - 20,
          direction: rtl ? 'rtl' : 'ltr',
        });

        // Decorative gate graphic (simple bars)
        const gateY = 70;
        fillRect(ctx, SCREEN_W / 2 - 30, gateY, 4, 30, '#334');
        fillRect(ctx, SCREEN_W / 2 + 26, gateY, 4, 30, '#334');
        for (let i = 0; i < 5; i++) {
          fillRect(ctx, SCREEN_W / 2 - 26 + i * 13, gateY + 5, 4, 20, '#445');
        }
        fillRect(ctx, SCREEN_W / 2 - 30, gateY, 60, 3, '#00d4ff');

        // Press Enter prompt with blinking effect
        const now = Date.now();
        const visible = Math.floor(now / 600) % 2 === 0;
        if (visible) {
          const hintText = locale === 'he' ? 'לחץ Enter להמשך' : 'Press Enter to continue';
          drawText(ctx, hintText, SCREEN_W / 2, SCREEN_H - 20, {
            size: 7,
            color: '#ffffff',
            align: 'center',
            direction: rtl ? 'rtl' : 'ltr',
          });
        }

        // ESC hint
        const backText = locale === 'he' ? 'ESC — חזור' : 'ESC — go back';
        drawText(ctx, backText, SCREEN_W / 2, SCREEN_H - 9, {
          size: 5,
          color: '#555',
          align: 'center',
        });
      } else {
        // Result message
        drawText(ctx, resultMessage, SCREEN_W / 2, SCREEN_H / 2, {
          size: 7,
          color: '#00ff88',
          align: 'center',
          maxWidth: SCREEN_W - 20,
          direction: rtl ? 'rtl' : 'ltr',
        });

        const locale2 = getLocale();
        const hintText = locale2 === 'he' ? 'לחץ Enter להמשך' : 'Press Enter to continue';
        drawText(ctx, hintText, SCREEN_W / 2, SCREEN_H - 12, {
          size: 6,
          color: '#555',
          align: 'center',
        });
      }
    },
  };

  // ---------------------------------------------------------------------------

  function handlePass(): void {
    if (!gateId) { stateMachine.pop(); return; }
    const gate = getGate(gateId);
    if (!gate) { stateMachine.pop(); return; }

    const locale = getLocale();

    // Execute success actions
    if (gate.successActions && hasActiveGame()) {
      for (const action of gate.successActions) {
        executeSingleAction(action);
      }
    }

    // Unlock the gate
    if (gate.reopenCooldownMs === 0 || gate.reopenCooldownMs === undefined) {
      // reopenCooldownMs=0 → permanent, undefined → always re-check (no unlock stored)
      if (gate.reopenCooldownMs === 0) {
        unlockGatePermanent(gateId);
      }
    } else {
      unlockGateTimed(gateId, gate.reopenCooldownMs);
    }

    // Fire gate-cleared trigger so story events can respond
    fireStoryTrigger({ type: 'gate-cleared', gateId });

    autoSave();

    resultMessage = locale === 'he' ? 'עברת! המסלול פתוח.' : 'Passed! The path is open.';
    phase = 'result';
  }

  function executeSingleAction(action: StoryAction): void {
    if (!hasActiveGame()) return;
    const pd = getPlayerData();
    switch (action.type) {
      case 'set-flag':
        pd.flags[action.flag] = action.value ?? true;
        break;
      case 'give-item':
        pd.items[action.itemId] = (pd.items[action.itemId] || 0) + action.quantity;
        break;
      case 'give-money':
        pd.money += action.amount;
        break;
      case 'set-quest':
        if (pd.story) pd.story.activeQuestId = action.questId;
        break;
      case 'complete-quest':
        if (pd.story) {
          if (!pd.story.completedQuestIds.includes(action.questId)) {
            pd.story.completedQuestIds.push(action.questId);
          }
          if (pd.story.activeQuestId === action.questId) {
            pd.story.activeQuestId = null;
          }
        }
        break;
      // Other actions (start-cutscene, teleport, etc.) are deferred to story engine
    }
  }
}
