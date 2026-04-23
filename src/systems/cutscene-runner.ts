/**
 * CutsceneRunner — Executes CutsceneDef steps inside the overworld scene.
 *
 * The runner is NOT a separate scene — it hooks into the overworld's update/render
 * so the world stays visible while scripts play out. The overworld:
 *   1. Calls runner.update(dt, input, ctx) in its update loop (blocks player input)
 *   2. Calls runner.render(canvas2d) at the end of its render pass (draws dialogue/fade overlay)
 *
 * Supported steps (Sprint 7A):
 *   dialogue, screen-fade, wait, wait-input, face-npc, show-npc, hide-npc,
 *   hide-player, show-player, action, if-flag, play-music, stop-music, play-sfx,
 *   move-npc (instant teleport), camera-snap, camera-pan (snap for now)
 *
 * Not yet supported (deferred): start-battle, start-gate, move-player
 */

import type { CutsceneDef, CutsceneStep } from '../data/story/cutscenes.js';
import type { NPCData } from './npc.js';
import type { StoryAction } from '../data/story/events.js';
import type { InputManager } from '../engine/input.js';
import { drawText, fillRect } from '../engine/renderer.js';
import { LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H, TILE_SIZE } from '../engine/config.js';
import { getLocale, isRTL } from '../i18n/i18n.js';
import { getCutscene } from '../data/story/cutscenes.js';

// ---------------------------------------------------------------------------
// Context — callbacks the overworld provides so the runner can poke state
// ---------------------------------------------------------------------------
export interface CutsceneContext {
  getNPCById(id: string): NPCData | undefined;
  setNPCFacing(npc: NPCData, dir: string): void;
  setNPCHidden(id: string, hidden: boolean): void;
  setPlayerHidden(hidden: boolean): void;
  /** Queue animated walking for an NPC along a path (one tile per step). */
  moveNPCAlongPath(npc: NPCData, path: Array<'up' | 'down' | 'left' | 'right'>): void;
  /** Returns true while the NPC is still walking its cutscene path. */
  isNPCWalking(id: string): boolean;
  snapCamera(x: number, y: number): void;
  panCamera(x: number, y: number, durationMs: number): void;
  playMusic(id: string): void;
  stopMusic(): void;
  playSFX(id: string): void;
  executeStoryAction(action: StoryAction): void;
  getFlag(flag: string): boolean;
  /** Immediately end the cutscene and switch to a different scene (e.g. STARTER_SELECT). */
  startScene(sceneId: string): void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface DialogueState {
  lines: string[]; // resolved to current locale
  lineIndex: number;
  charIndex: number; // typewriter char counter
  charTimer: number;
  speakerId?: string;
  waitingDismiss: boolean; // true once all chars revealed, waiting for Enter
}

interface FadeState {
  direction: 'in' | 'out';
  alpha: number; // current alpha (0=transparent,1=opaque)
  duration: number; // seconds
  elapsed: number;
  color: string;
  done: boolean;
}

interface PhoneRingState {
  callerName: string; // resolved to current locale
  elapsed: number; // total time in ring phase
  sfxPlayed: boolean; // play ring SFX only once per 1.5s cycle
  sfxTimer: number; // countdown to next ring SFX
  /** true once the player presses Enter or auto-timeout fires */
  answered: boolean;
  answerTimer: number; // brief pause after answering before starting steps
}

const PHONE_RING_MIN_DURATION = 1.2; // seconds before player input is accepted (avoids instant-answer from trigger keypress)
const PHONE_RING_AUTO_ANSWER = 6; // seconds before auto-answer
const PHONE_RING_SFX_INTERVAL = 1.5; // seconds between ring tones
const PHONE_ANSWER_PAUSE = 0.6; // seconds of "Connected..." pause after answering

// ---------------------------------------------------------------------------
// Module state (singleton — only one cutscene runs at a time)
// ---------------------------------------------------------------------------

let _def: CutsceneDef | null = null;
let _steps: CutsceneStep[] = []; // flattened/active steps (if-flag branches resolved at runtime)
let _stepIndex = 0;
let _active = false;

let _dialogue: DialogueState | null = null;
let _fade: FadeState | null = null;
let _overlay: string | null = null; // persistent background color (null = world shows through)
let _waitTimer = 0; // for 'wait' steps
let _waitingInput = false; // for 'wait-input' steps
let _phoneRing: PhoneRingState | null = null; // phone-ring intro phase

let _npcMoveWaiting: string | null = null; // npcId being waited on for animated walk
let _completionResolve: (() => void) | null = null;

const CHARS_PER_SEC = 40; // typewriter speed

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isCutsceneActive(): boolean {
  return _active;
}

/** Start a cutscene by ID. Returns false if the cutscene isn't registered. */
export function activateCutscene(id: string): boolean {
  const def = getCutscene(id);
  if (!def) {
    console.warn(`[cutscene] Unknown cutscene: ${id}`);
    return false;
  }
  _def = def;
  _steps = [...def.steps];
  _stepIndex = 0;
  _active = true;
  _dialogue = null;
  _fade = null;
  _waitTimer = 0;
  _waitingInput = false;
  _npcMoveWaiting = null;
  _phoneRing = null;

  // If phoneCaller is set, enter the ring phase before executing any steps
  // console.log('[cutscene] activating:', id, '| phoneCaller:', def.phoneCaller);
  if (def.phoneCaller) {
    const locale = getLocale();
    const name = locale === 'he' ? def.phoneCaller.he : def.phoneCaller.en;
    _phoneRing = {
      callerName: name,
      elapsed: 0,
      sfxPlayed: false,
      sfxTimer: 0,
      answered: false,
      answerTimer: 0,
    };
    console.log('[cutscene] phone ring starting for:', name);
  }

  return true;
}

export function deactivateCutscene(): void {
  _active = false;
  _def = null;
  _dialogue = null;
  _fade = null;
  _overlay = null;
  _waitingInput = false;
  _npcMoveWaiting = null;
  _phoneRing = null;
  _completionResolve?.();
  _completionResolve = null;
}

/**
 * Returns a Promise that resolves when the current (or next) cutscene finishes.
 * Call this immediately before/after setting _pendingCutsceneId so the resolve
 * is registered before deactivateCutscene() could theoretically fire.
 */
export function awaitCutsceneCompletion(): Promise<void> {
  return new Promise((resolve) => {
    _completionResolve = resolve;
  });
}

// ---------------------------------------------------------------------------
// Update — call from overworld.update() when _active
// ---------------------------------------------------------------------------

export function updateCutscene(dt: number, input: InputManager, ctx: CutsceneContext): void {
  if (!_active) return;

  // ── Phone ring intro phase ──
  if (_phoneRing) {
    const r = _phoneRing;
    r.elapsed += dt;

    // Play ring SFX on first frame and then every PHONE_RING_SFX_INTERVAL seconds
    r.sfxTimer -= dt;
    if (!r.sfxPlayed || r.sfxTimer <= 0) {
      ctx.playSFX('phone-ring');
      r.sfxPlayed = true;
      r.sfxTimer = PHONE_RING_SFX_INTERVAL;
    }

    if (!r.answered) {
      // Only accept input after minimum ring duration — prevents the same
      // keypress that triggered the cutscene from instantly answering the phone
      const canAnswer = r.elapsed >= PHONE_RING_MIN_DURATION;
      const pressedAnswer =
        canAnswer &&
        (input.isKeyPressed('Enter') || input.isKeyPressed(' ') || input.isKeyPressed('z') || input.isKeyPressed('Z'));
      if (pressedAnswer || r.elapsed >= PHONE_RING_AUTO_ANSWER) {
        r.answered = true;
        r.answerTimer = PHONE_ANSWER_PAUSE;
      }
    } else {
      // Brief pause after answering, then begin steps
      r.answerTimer -= dt;
      if (r.answerTimer <= 0) {
        _phoneRing = null;
        // Steps begin normally from here
      }
    }
    return; // Block all normal step execution while ring is active
  }

  // Skip: if cutscene is skippable and player presses Escape.
  // We still execute remaining 'action' and 'start-scene' steps so that
  // story flags / quest changes are applied even when dialogue is skipped.
  if (_def?.skippable && input.isKeyPressed('Escape')) {
    for (let i = _stepIndex; i < _steps.length; i++) {
      const step = _steps[i];
      if (step.type === 'action') {
        ctx.executeStoryAction((step as { action: import('../data/story/events.js').StoryAction }).action);
      } else if (step.type === 'start-scene') {
        // Transition scene must still happen (e.g. STARTER_SELECT)
        deactivateCutscene();
        ctx.startScene((step as { sceneId: string }).sceneId);
        return;
      }
      // Dialogue, fades, waits, NPC movement — safely skipped
    }
    deactivateCutscene();
    return;
  }

  // ── Dialogue step: typewriter + dismiss ──
  if (_dialogue) {
    const d = _dialogue;
    if (!d.waitingDismiss) {
      d.charTimer += dt;
      const charsToReveal = Math.floor(d.charTimer * CHARS_PER_SEC);
      if (charsToReveal > 0) {
        d.charIndex += charsToReveal;
        d.charTimer -= charsToReveal / CHARS_PER_SEC;
        const currentLine = d.lines[d.lineIndex] ?? '';
        if (d.charIndex >= currentLine.length) {
          d.charIndex = currentLine.length;
          d.waitingDismiss = true;
        }
      }
    } else {
      if (
        input.isKeyPressed('Enter') ||
        input.isKeyPressed(' ') ||
        input.isKeyPressed('z') ||
        input.isKeyPressed('Z')
      ) {
        d.lineIndex++;
        if (d.lineIndex >= d.lines.length) {
          // All lines done — advance to next step
          _dialogue = null;
          _stepIndex++;
        } else {
          d.charIndex = 0;
          d.charTimer = 0;
          d.waitingDismiss = false;
        }
      }
    }
    return;
  }

  // ── Fade step ──
  if (_fade) {
    const f = _fade;
    if (!f.done) {
      f.elapsed += dt;
      const t = Math.min(f.elapsed / f.duration, 1);
      f.alpha = f.direction === 'out' ? t : 1 - t;
      if (t >= 1) {
        f.done = true;
        f.alpha = f.direction === 'out' ? 1 : 0;
      }
    }
    if (f.done) {
      _fade = null;
      _stepIndex++;
    }
    return;
  }

  // ── NPC animated walk wait ──
  if (_npcMoveWaiting) {
    if (!ctx.isNPCWalking(_npcMoveWaiting)) {
      _npcMoveWaiting = null;
      _stepIndex++;
    }
    return;
  }

  // ── Wait (timed) ──
  if (_waitTimer > 0) {
    _waitTimer -= dt;
    if (_waitTimer <= 0) {
      _waitTimer = 0;
      _stepIndex++;
    }
    return;
  }

  // ── Wait-input ──
  if (_waitingInput) {
    if (input.isKeyPressed('Enter') || input.isKeyPressed(' ') || input.isKeyPressed('z') || input.isKeyPressed('Z')) {
      _waitingInput = false;
      _stepIndex++;
    }
    return;
  }

  // ── Execute next step ──
  if (_stepIndex >= _steps.length) {
    deactivateCutscene();
    return;
  }

  executeStep(_steps[_stepIndex], ctx);
}

// ---------------------------------------------------------------------------
// Render — call from overworld.render() after world is drawn
// ---------------------------------------------------------------------------

export function renderCutscene(canvas: CanvasRenderingContext2D): void {
  if (!_active) return;

  // Phone ring overlay — rendered instead of normal cutscene content
  if (_phoneRing) {
    renderPhoneRing(canvas, _phoneRing);
    return;
  }

  // Persistent overlay (solid background — drawn before fade animation)
  if (_overlay) {
    fillRect(canvas, 0, 0, W, H, _overlay);
  }

  // Fade animation overlay (drawn on top of persistent overlay)
  if (_fade && _fade.alpha > 0) {
    canvas.save();
    canvas.globalAlpha = _fade.alpha;
    fillRect(canvas, 0, 0, W, H, _fade.color);
    canvas.restore();
  }

  // Dialogue box
  if (_dialogue) {
    renderDialogue(canvas, _dialogue);
  }

  // Wait-input blinking arrow
  if (_waitingInput) {
    const visible = Math.floor(Date.now() / 500) % 2 === 0;
    if (visible) {
      drawText(canvas, '▼', W / 2, H - 8, { size: 6, color: '#ffffff', align: 'center' });
    }
  }
}

// ---------------------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------------------

function executeStep(step: CutsceneStep, ctx: CutsceneContext): void {
  switch (step.type) {
    case 'dialogue': {
      const locale = getLocale();
      const lines = step.lines.map((l) => (locale === 'he' ? l.he : l.en) || l.en || '');
      _dialogue = {
        lines,
        lineIndex: 0,
        charIndex: 0,
        charTimer: 0,
        speakerId: step.speakerId,
        waitingDismiss: false,
      };
      // Don't advance _stepIndex — dialogue handler does it on dismiss
      break;
    }

    case 'screen-fade': {
      _fade = {
        direction: step.direction,
        alpha: step.direction === 'out' ? 0 : 1,
        duration: step.durationMs / 1000,
        elapsed: 0,
        color: step.color ?? '#000000',
        done: false,
      };
      // Don't advance — fade handler advances when done
      break;
    }

    case 'wait': {
      _waitTimer = step.durationMs / 1000;
      // Don't advance — wait handler advances when done
      break;
    }

    case 'wait-input': {
      _waitingInput = true;
      // Don't advance — wait-input handler advances on key press
      break;
    }

    case 'face-npc': {
      const npc = ctx.getNPCById(step.npcId);
      if (npc) ctx.setNPCFacing(npc, step.dir);
      _stepIndex++;
      break;
    }

    case 'show-npc': {
      ctx.setNPCHidden(step.npcId, false);
      _stepIndex++;
      break;
    }

    case 'hide-npc': {
      ctx.setNPCHidden(step.npcId, true);
      _stepIndex++;
      break;
    }

    case 'hide-player': {
      ctx.setPlayerHidden(true);
      _stepIndex++;
      break;
    }

    case 'show-player': {
      ctx.setPlayerHidden(false);
      _stepIndex++;
      break;
    }

    case 'move-npc': {
      const npc = ctx.getNPCById(step.npcId);
      if (npc) ctx.moveNPCAlongPath(npc, step.path);
      // Wait for animation unless caller explicitly opts out
      if (step.waitForComplete !== false && step.path.length > 0 && npc) {
        _npcMoveWaiting = step.npcId;
      } else {
        _stepIndex++;
      }
      break;
    }

    case 'camera-snap': {
      ctx.snapCamera(step.x * TILE_SIZE, step.y * TILE_SIZE);
      _stepIndex++;
      break;
    }

    case 'camera-pan': {
      // For now snap immediately; smooth pan can be added later
      ctx.snapCamera(step.x * TILE_SIZE, step.y * TILE_SIZE);
      _stepIndex++;
      break;
    }

    case 'overlay': {
      _overlay = step.color; // null clears it, string sets solid color
      _stepIndex++;
      break;
    }

    case 'play-music': {
      ctx.playMusic(step.musicId);
      _stepIndex++;
      break;
    }

    case 'stop-music': {
      ctx.stopMusic();
      _stepIndex++;
      break;
    }

    case 'play-sfx': {
      ctx.playSFX(step.sfxId);
      _stepIndex++;
      break;
    }

    case 'action': {
      ctx.executeStoryAction(step.action);
      _stepIndex++;
      break;
    }

    case 'if-flag': {
      const value = ctx.getFlag(step.flag);
      const branch = value ? step.thenSteps : (step.elseSteps ?? []);
      // Replace remaining steps with branch + original tail
      _steps = [...branch, ..._steps.slice(_stepIndex + 1)];
      _stepIndex = 0;
      break;
    }

    case 'start-gate': {
      // Not yet implemented — wire up in overworld to push the gate scene
      throw new Error(
        `[cutscene] step 'start-gate' (gateId: "${(step as { gateId: string }).gateId}") is not implemented yet. ` +
          `Remove this step from the cutscene, or implement gate-from-cutscene handoff.`,
      );
    }

    case 'start-battle': {
      // Not yet implemented — wire up battle scene launch from cutscene
      throw new Error(
        `[cutscene] step 'start-battle' (trainerId: "${(step as { trainerId: string }).trainerId}") is not implemented yet. ` +
          `Remove this step from the cutscene, or implement battle-from-cutscene handoff.`,
      );
    }

    case 'start-scene': {
      // Deactivate cutscene and switch scene (e.g. STARTER_SELECT → returns to OVERWORLD)
      deactivateCutscene();
      ctx.startScene(step.sceneId);
      break;
    }

    case 'move-player': {
      // Not yet implemented — player movement animation is not wired up.
      throw new Error(
        `[cutscene] step 'move-player' is not implemented yet. ` +
          `Remove this step from the cutscene or implement player path animation.`,
      );
    }

    default: {
      // Unknown step — skip
      _stepIndex++;
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Phone ring rendering
// ---------------------------------------------------------------------------

function renderPhoneRing(ctx: CanvasRenderingContext2D, r: PhoneRingState): void {
  const rtl = isRTL();

  // Full black background — phone call covers the world entirely
  fillRect(ctx, 0, 0, W, H, '#000000');

  // Pulsing border color: cyan to white
  const pulse = Math.abs(Math.sin(r.elapsed * 4));
  const borderColor = r.answered ? '#20d860' : pulse > 0.5 ? '#00d4ff' : '#ffffff';

  // Card — centered, large enough to be unmissable
  const CW = 190,
    CH = 70;
  const CX = Math.floor((W - CW) / 2);
  const CY = Math.floor((H - CH) / 2);

  // Card fill
  fillRect(ctx, CX, CY, CW, CH, '#0d2233');

  // Card border — 2px bright pulsing
  fillRect(ctx, CX, CY, CW, 2, borderColor);
  fillRect(ctx, CX, CY + CH - 2, CW, 2, borderColor);
  fillRect(ctx, CX, CY, 2, CH, borderColor);
  fillRect(ctx, CX + CW - 2, CY, 2, CH, borderColor);

  // Header stripe
  fillRect(ctx, CX + 2, CY + 2, CW - 4, 12, r.answered ? '#0d3a1a' : '#0a2a3a');

  // "Incoming Call" / "שיחה נכנסת"
  const headerText = rtl ? 'שיחה נכנסת' : 'Incoming Call';
  drawText(ctx, headerText, W / 2, CY + 4, {
    size: 6,
    color: borderColor,
    align: 'center',
  });

  // Caller name — large white text
  drawText(ctx, r.callerName, W / 2, CY + 22, {
    size: 9,
    color: '#ffffff',
    align: 'center',
  });

  if (!r.answered) {
    // Ringing animation: animated dots
    const dots = '.'.repeat((Math.floor(r.elapsed * 3) % 3) + 1);
    drawText(ctx, '[ TEL' + dots + ' ]', W / 2, CY + 38, {
      size: 6,
      color: '#00d4ff',
      align: 'center',
    });
    // Blinking hint
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      const hintText = rtl ? 'ENTER – ענה' : '[ ENTER ] to answer';
      drawText(ctx, hintText, W / 2, CY + CH - 10, {
        size: 5,
        color: '#aaaaaa',
        align: 'center',
      });
    }
  } else {
    const connText = rtl ? 'מחובר...' : 'Connected...';
    drawText(ctx, connText, W / 2, CY + 38, {
      size: 7,
      color: '#20d860',
      align: 'center',
    });
  }
}

// ---------------------------------------------------------------------------
// Dialogue rendering
// ---------------------------------------------------------------------------

const BOX_H = 48;
const BOX_Y = H - BOX_H - 4;
const BOX_X = 4;
const BOX_W = W - 8;
const PADDING = 6;
const MAX_LINE_W = BOX_W - PADDING * 2 - 2;

function renderDialogue(ctx: CanvasRenderingContext2D, d: DialogueState): void {
  const rtl = isRTL();

  // Box background
  fillRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, '#0a0a1a');
  fillRect(ctx, BOX_X, BOX_Y, BOX_W, 2, '#00d4ff'); // top accent
  fillRect(ctx, BOX_X, BOX_Y + BOX_H - 2, BOX_W, 2, '#00d4ff'); // bottom accent

  // Speaker name
  if (d.speakerId) {
    const nameX = rtl ? BOX_X + BOX_W - PADDING : BOX_X + PADDING;
    drawText(ctx, d.speakerId, nameX, BOX_Y + 4, {
      size: 6,
      color: '#00d4ff',
      align: rtl ? 'right' : 'left',
      direction: rtl ? 'rtl' : 'ltr',
    });
  }

  // Current line (typewriter effect)
  const currentLine = d.lines[d.lineIndex] ?? '';
  const visible = currentLine.slice(0, d.charIndex);

  const textY = BOX_Y + (d.speakerId ? 14 : PADDING + 4);
  const textX = rtl ? BOX_X + BOX_W - PADDING : BOX_X + PADDING;

  drawText(ctx, visible, textX, textY, {
    size: 7,
    color: '#ffffff',
    align: rtl ? 'right' : 'left',
    direction: rtl ? 'rtl' : 'ltr',
    maxWidth: MAX_LINE_W,
    lineHeight: 10,
  });

  // Blinking ▼ prompt when waiting for dismiss
  if (d.waitingDismiss) {
    const promptVisible = Math.floor(Date.now() / 400) % 2 === 0;
    if (promptVisible) {
      drawText(ctx, '▼', BOX_X + BOX_W - PADDING - 2, BOX_Y + BOX_H - 10, {
        size: 6,
        color: '#aaaaaa',
        align: 'right',
      });
    }
  }
}
