/**
 * StarterSelectScene - Choose your starter Pokemon.
 *
 * Presents Cyndaquil, Totodile, and Chikorita as options.
 * The chosen Pokemon is added to the player's party.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { getPokemon } from '../services/pokemon-data.js';
import { createPokemonFromData } from '../systems/encounter.js';
import { getPlayerData } from '../systems/game-state.js';

const SCREEN_W = 240;
const SCREEN_H = 160;

/** Starter definitions: ID, display name, type color, starting moves. */
const STARTERS = [
  { id: 155, name: 'Cyndaquil', type: 'fire', color: '#F08030', moveIds: [33, 52, 43, 108] },
  { id: 158, name: 'Totodile', type: 'water', color: '#6890F0', moveIds: [10, 55, 43, 45] },
  { id: 152, name: 'Chikorita', type: 'grass', color: '#78C850', moveIds: [33, 22, 45, 108] },
] as const;

const TYPE_COLORS: Record<string, string> = {
  fire: '#F08030',
  water: '#6890F0',
  grass: '#78C850',
};

export function createStarterSelectScene(
  input: InputManager,
  stateMachine: StateMachine,
): Scene {
  let selectedIndex = 0;
  let confirmed = false;
  let fadeAlpha = 1;
  let fadeIn = true;
  let fadeOut = false;

  return {
    enter(): void {
      selectedIndex = 0;
      confirmed = false;
      fadeAlpha = 1;
      fadeIn = true;
      fadeOut = false;
    },

    exit(): void {},

    update(dt: number): void {
      // Fade in
      if (fadeIn) {
        fadeAlpha -= dt * 2;
        if (fadeAlpha <= 0) {
          fadeAlpha = 0;
          fadeIn = false;
        }
        return;
      }

      // Fade out after selection
      if (fadeOut) {
        fadeAlpha += dt * 2;
        if (fadeAlpha >= 1) {
          fadeAlpha = 1;
          stateMachine.change('OVERWORLD');
        }
        return;
      }

      if (confirmed) return;

      // Navigation
      if (input.isKeyPressed('ArrowLeft')) {
        selectedIndex = (selectedIndex - 1 + STARTERS.length) % STARTERS.length;
      }
      if (input.isKeyPressed('ArrowRight')) {
        selectedIndex = (selectedIndex + 1) % STARTERS.length;
      }

      // Confirm selection
      if (input.isKeyPressed('Enter') || input.isTapped()) {
        const starter = STARTERS[selectedIndex];
        const data = getPokemon(starter.id);
        if (data) {
          const pokemon = createPokemonFromData(data, 5, [...starter.moveIds]);
          const playerData = getPlayerData();
          playerData.party = [pokemon];
          playerData.pokedex[starter.id] = true;
          confirmed = true;
          fadeOut = true;
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#1a1a2e');

      // Title
      drawText(ctx, 'Choose your partner!', SCREEN_W / 2, 16, {
        size: 10,
        color: '#ffffff',
        align: 'center',
      });

      drawText(ctx, 'Prof. Algorithma:', SCREEN_W / 2, 30, {
        size: 8,
        color: '#aaaacc',
        align: 'center',
      });

      // Draw 3 starter cards
      const cardW = 60;
      const cardH = 80;
      const spacing = 12;
      const totalW = cardW * 3 + spacing * 2;
      const startX = (SCREEN_W - totalW) / 2;
      const cardY = 45;

      for (let i = 0; i < STARTERS.length; i++) {
        const starter = STARTERS[i];
        const x = startX + i * (cardW + spacing);
        const isSelected = i === selectedIndex;

        // Card background
        const bgColor = isSelected ? '#2a2a4e' : '#16162a';
        fillRect(ctx, x, cardY, cardW, cardH, bgColor);

        // Card border
        const borderColor = isSelected ? '#ffcb05' : '#444466';
        drawRect(ctx, x, cardY, cardW, cardH, borderColor, isSelected ? 2 : 1);

        // Pokemon sprite placeholder (colored box)
        const cx = x + cardW / 2;
        const cy = cardY + 24;
        fillRect(ctx, cx - 12, cy - 12, 24, 24, starter.color);
        drawRect(ctx, cx - 12, cy - 12, 24, 24, '#ffffff44');

        drawText(ctx, `#${starter.id}`, cx, cy - 2, {
          size: 8,
          color: '#ffffff',
          align: 'center',
        });

        // Name
        drawText(ctx, starter.name, cx, cardY + 46, {
          size: 8,
          color: '#ffffff',
          align: 'center',
        });

        // Type badge
        const typeColor = TYPE_COLORS[starter.type] || '#888888';
        fillRect(ctx, cx - 16, cardY + 54, 32, 10, typeColor);
        drawText(ctx, starter.type.toUpperCase(), cx, cardY + 56, {
          size: 8,
          color: '#ffffff',
          align: 'center',
        });

        // Selection arrow
        if (isSelected) {
          drawText(ctx, '\u25bc', cx, cardY - 6, {
            size: 8,
            color: '#ffcb05',
            align: 'center',
          });
        }
      }

      // Instructions
      drawText(ctx, '\u25c0 \u25b6 to choose, ENTER to confirm', SCREEN_W / 2, 138, {
        size: 8,
        color: '#888888',
        align: 'center',
      });

      const selected = STARTERS[selectedIndex];
      drawText(ctx, `"I choose ${selected.name}!"`, SCREEN_W / 2, 150, {
        size: 8,
        color: '#ffcb05',
        align: 'center',
      });

      // Fade overlay
      if (fadeAlpha > 0) {
        const alpha = Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, `#000000${alpha}`);
      }
    },
  };
}
