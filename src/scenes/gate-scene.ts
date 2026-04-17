/**
 * GateScene — Question-gate driver.
 *
 * Launches the HTML question overlay (mountGateOverlay) on top of the canvas.
 * The canvas renders a simple dark backdrop while the overlay runs.
 *
 * Flow:
 *   1. `enter()` — check if gate is already unlocked; if yes immediately pop.
 *   2. Otherwise schedule overlay launch on next tick (setTimeout 0).
 *   3. While overlay is running, canvas shows a "verification in progress" screen.
 *   4. When overlay promise resolves, apply session rewards/penalties to PlayerData,
 *      unlock the gate, fire story triggers, and pop back to overworld.
 */

import type { Scene } from '../types/index.js';
import type { StateMachine } from '../engine/state-machine.js';
import { drawText, fillRect } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { isRTL, getLocale } from '../i18n/i18n.js';
import { getGate } from '../data/story/gates.js';
import {
  fireStoryTrigger,
  unlockGatePermanent,
  unlockGateTimed,
  isGateUnlocked,
  getActiveGateId,
  clearActiveGate,
} from '../systems/story-engine.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { mountGateOverlay } from '../systems/gate-overlay.js';
import type { SessionResult } from '../systems/gate-overlay.js';
import type { StoryAction } from '../data/story/events.js';
import { VERIFICATION_DIALOGUES } from '../data/story/global-gate-config.js';
import { getItem } from '../data/items.js';
import { getGlobalAudio } from '../audio/audio-manager.js';

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createGateScene(
  _input: unknown,
  stateMachine: StateMachine,
): Scene {
  let gateId: string | null = null;
  let overlayRunning = false;
  let pendingResult: SessionResult | null = null;
  let resolved = false;
  let wasMutedBeforeGate = false;

  return {
    enter(): void {
      gateId = getActiveGateId();
      overlayRunning = false;
      pendingResult = null;
      resolved = false;

      if (!gateId) {
        stateMachine.pop();
        return;
      }

      // Gate already unlocked — let player through immediately
      if (isGateUnlocked(gateId)) {
        stateMachine.pop();
        return;
      }

      // Mute audio during questions; remember prior state so we can restore it
      const audio = getGlobalAudio();
      wasMutedBeforeGate = audio?.isMuted() ?? false;
      if (!wasMutedBeforeGate) audio?.setMuted(true);

      overlayRunning = true;
      setTimeout(() => void _launchOverlay(), 0);
    },

    exit(): void {
      clearActiveGate();
      overlayRunning = false;
      // Restore audio to pre-gate state
      if (!wasMutedBeforeGate) getGlobalAudio()?.setMuted(false);
    },

    update(_dt: number): void {
      if (!overlayRunning && pendingResult && !resolved) {
        resolved = true;
        const passed = pendingResult.passed;
        _applyResult(pendingResult);
        // Play success jingle before popping (audio is restored in exit())
        if (passed && !wasMutedBeforeGate) {
          getGlobalAudio()?.setMuted(false);
          getGlobalAudio()?.playGateSuccess();
        }
        stateMachine.pop();
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      _renderBackdrop(ctx);
    },
  };

  // ── Overlay launcher ────────────────────────────────────────────────────────

  async function _launchOverlay(): Promise<void> {
    if (!gateId) { overlayRunning = false; return; }

    const gate = getGate(gateId);
    if (!gate) { overlayRunning = false; return; }

    const cfg = gate.sessionConfig;

    const dialogues = _dialoguesFor(gate.triggerType);

    const appContainer = document.getElementById('app');
    if (!appContainer) { overlayRunning = false; return; }

    const result = await mountGateOverlay({
      gateId,
      sessionConfig: cfg,
      introDialogues: dialogues,
      container: appContainer,
    });

    overlayRunning = false;
    pendingResult = result;
  }

  // ── Post-session result processing ─────────────────────────────────────────

  function _applyResult(result: SessionResult): void {
    if (!gateId) return;
    const gate = getGate(gateId);
    if (!gate || !hasActiveGame()) return;
    const pd = getPlayerData();

    for (const reward of result.rewardsEarned) {
      if (reward.type === 'money' && reward.amount !== undefined) {
        pd.money += reward.amount;
      } else if (reward.type === 'item' && reward.itemId) {
        const qty = reward.quantity ?? 1;
        // Resolve numeric id ("45") or slug ("hp-up") → canonical slug
        const itemDef = getItem(reward.itemId);
        const slug = itemDef?.id ?? reward.itemId;
        pd.items[slug] = (pd.items[slug] ?? 0) + qty;
        getGlobalAudio()?.playItemFound();
      }
    }

    if (result.penaltyApplied > 0) {
      pd.money = Math.max(0, pd.money - result.penaltyApplied);
    }

    const cooldown = gate.reopenCooldownMs;
    if (cooldown === 0) {
      unlockGatePermanent(gateId);
    } else if (cooldown !== undefined) {
      unlockGateTimed(gateId, cooldown);
    }

    if (gate.successActions) {
      for (const action of gate.successActions) {
        _executeAction(action, pd);
      }
    }

    fireStoryTrigger({ type: 'gate-cleared', gateId });
    autoSave();
  }

  function _executeAction(action: StoryAction, pd: ReturnType<typeof getPlayerData>): void {
    switch (action.type) {
      case 'set-flag':
        pd.flags[action.flag] = action.value ?? true;
        break;
      case 'give-item':
        pd.items[action.itemId] = (pd.items[action.itemId] ?? 0) + action.quantity;
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
    }
  }

  // ── Canvas backdrop (shown while HTML overlay runs) ─────────────────────────

  function _renderBackdrop(ctx: CanvasRenderingContext2D): void {
    const rtl = isRTL();
    const locale = getLocale();
    const gate = gateId ? getGate(gateId) : null;

    fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#080816');
    fillRect(ctx, 0, 0, SCREEN_W, 2, '#00d4ff');

    const titleText = gate
      ? (locale === 'he' ? gate.title.he : gate.title.en)
      : (locale === 'he' ? 'מחסום' : 'Checkpoint');

    drawText(ctx, titleText, SCREEN_W / 2, 20, {
      size: 8,
      color: '#00d4ff',
      align: 'center',
      direction: rtl ? 'rtl' : 'ltr',
    });

    const waitText = locale === 'he' ? 'בדיקת זהות מתבצעת…' : 'Identity verification…';
    if (Math.floor(Date.now() / 700) % 2 === 0) {
      drawText(ctx, waitText, SCREEN_W / 2, SCREEN_H / 2, {
        size: 6,
        color: '#444466',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });
    }
  }
}

// ─── Dialogue helpers ─────────────────────────────────────────────────────────

function _dialoguesFor(triggerType: string): Array<{ en: string; he: string }> {
  if (triggerType === 'auto-pokecenter') return VERIFICATION_DIALOGUES.pokecenter;
  if (triggerType === 'auto-pokemarket') return VERIFICATION_DIALOGUES.pokemarket;
  if (triggerType === 'auto-gym-entrance') return VERIFICATION_DIALOGUES.gym;

  return [
    { en: 'Verify your identity to proceed. NULL-X glitches cannot pass.', he: 'אמת את זהותך כדי להמשיך. תקלות NULL-X לא יכולות לעבור.' },
    { en: 'HALT! The gate security requires proof you are a real trainer.', he: 'עצור! אבטחת השער דורשת הוכחה שאתה מאמן אמיתי.' },
    { en: 'This checkpoint is protected by the Anti-NULL-X Verification Protocol.', he: 'מחסום זה מוגן על ידי פרוטוקול אימות הנגד-NULL-X.' },
  ];
}
