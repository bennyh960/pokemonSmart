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
  /** Instantly move an NPC along a path (teleport, no animation). */
  moveNPCAlongPath(npc: NPCData, path: Array<'up'|'down'|'left'|'right'>): void;
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
  lines: string[];          // resolved to current locale
  lineIndex: number;
  charIndex: number;        // typewriter char counter
  charTimer: number;
  speakerId?: string;
  waitingDismiss: boolean;  // true once all chars revealed, waiting for Enter
}

interface FadeState {
  direction: 'in' | 'out';
  alpha: number;            // current alpha (0=transparent,1=opaque)
  duration: number;         // seconds
  elapsed: number;
  color: string;
  done: boolean;
}

// ---------------------------------------------------------------------------
// Module state (singleton — only one cutscene runs at a time)
// ---------------------------------------------------------------------------

let _def: CutsceneDef | null = null;
let _steps: CutsceneStep[] = [];    // flattened/active steps (if-flag branches resolved at runtime)
let _stepIndex = 0;
let _active = false;

let _dialogue: DialogueState | null = null;
let _fade: FadeState | null = null;
let _waitTimer = 0;                 // for 'wait' steps
let _waitingInput = false;          // for 'wait-input' steps

const CHARS_PER_SEC = 40;           // typewriter speed

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
  return true;
}

export function deactivateCutscene(): void {
  _active = false;
  _def = null;
  _dialogue = null;
  _fade = null;
  _waitingInput = false;
}

// ---------------------------------------------------------------------------
// Update — call from overworld.update() when _active
// ---------------------------------------------------------------------------

export function updateCutscene(dt: number, input: InputManager, ctx: CutsceneContext): void {
  if (!_active) return;

  // Skip: if cutscene is skippable and player presses Escape, jump to end
  if (_def?.skippable && input.isKeyPressed('Escape')) {
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
      if (input.isKeyPressed('Enter') || input.isKeyPressed(' ') || input.isKeyPressed('z') || input.isKeyPressed('Z')) {
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

  // Fade overlay (drawn first so dialogue sits on top)
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
      const lines = step.lines.map(l => (locale === 'he' ? l.he : l.en) || l.en || '');
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
      _stepIndex++;
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
      // TODO Sprint 7B: push gate scene from here
      console.warn('[cutscene] start-gate not yet wired — skipping');
      _stepIndex++;
      break;
    }

    case 'start-battle': {
      // TODO Sprint 7B: start trainer battle from cutscene
      console.warn('[cutscene] start-battle not yet wired — skipping');
      _stepIndex++;
      break;
    }

    case 'start-scene': {
      // Deactivate cutscene and switch scene (e.g. STARTER_SELECT → returns to OVERWORLD)
      deactivateCutscene();
      ctx.startScene(step.sceneId);
      break;
    }

    case 'move-player': {
      // TODO: animate player movement; for now skip
      _stepIndex++;
      break;
    }

    default: {
      // Unknown step — skip
      _stepIndex++;
      break;
    }
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
  fillRect(ctx, BOX_X, BOX_Y, BOX_W, 2, '#00d4ff');       // top accent
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
        size: 6, color: '#aaaaaa', align: 'right',
      });
    }
  }
}
