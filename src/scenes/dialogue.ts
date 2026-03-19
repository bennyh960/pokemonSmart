/**
 * DialogueScene - GBA-style text dialogue system.
 *
 * Renders scrolling text boxes at the bottom of the screen
 * with optional NPC character portraits. Supports RTL Hebrew text.
 *
 * TODO:
 * - Text box rendering (dark border, light background)
 * - Character-by-character text reveal with blip SFX
 * - NPC portrait display
 * - Multi-page dialogue with advance prompt
 * - Choice prompts (Yes/No, multiple choice)
 * - RTL text layout for Hebrew dialogue
 * - Skip/fast-forward on button press
 */

import type { Scene } from '../types/index.js';

export function createDialogueScene(): Scene {
  return {
    enter(): void {
      // TODO: Set up dialogue queue, reset text position
    },

    exit(): void {
      // TODO: Clean up dialogue state
    },

    update(_dt: number): void {
      // TODO: Advance text reveal, handle input for next/skip
    },

    render(_ctx: CanvasRenderingContext2D): void {
      // TODO: Draw text box, portrait, revealed text
    },
  };
}
