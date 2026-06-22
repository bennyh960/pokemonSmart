import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect, drawRect, drawText } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SW, RES_SCALE } from '../engine/config.js';
import { getAllPokemon } from '../services/pokemon-data.js';
import { TYPE_BADGE } from '../data/type-constants.js';
import type { PokemonType } from '../types/index.js';
import { getCachedImage, loadImage } from '../engine/sprite-loader.js';

// ── Keyboard layout constants ────────────────────────────────────────────────
const BTN_W = 16;
const BTN_H = 13;
const BTN_GAP_X = 2;
const LETTERS_PER_ROW = 13;
// KB_X = (240 - (13*16 + 12*2)) / 2 = 4
const KB_X = Math.round((SW - (LETTERS_PER_ROW * BTN_W + (LETTERS_PER_ROW - 1) * BTN_GAP_X)) / 2);
const KB_ROWS_Y = [100, 115, 130, 145] as const;
const KB_ROWS = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz'] as const;

// Exclude 'glitch' — not a real teachable type
const SPELL_TYPES = (Object.keys(TYPE_BADGE) as PokemonType[]).filter((t) => t !== 'glitch');

type View = 'menu' | 'board' | 'spelling';
type Feedback = 'idle' | 'wrong' | 'complete';

interface HintPokemon {
  id: number;
  name: string;
  sprite: HTMLImageElement | null;
}

export function createEnglishLearningScene(
  input: InputManager,
  stateMachine: StateMachine,
  canvas: HTMLCanvasElement,
  audio: AudioManager,
): Scene {
  // ── Shared state ─────────────────────────────────────────────────────────
  let view: View = 'menu';
  let menuIdx = 0;
  let pressedBtn = '';
  let pressedTimer = 0;

  // ── Board state ──────────────────────────────────────────────────────────
  let boardLetter = '';

  // ── Spelling state ───────────────────────────────────────────────────────
  let currentType: PokemonType = 'fire';
  let word = '';
  let filledSlots: string[] = [];
  let currentSlot = 0;
  let feedback: Feedback = 'idle';
  let feedbackTimer = 0;
  let completionTimer = 0;
  let hintPokemon: HintPokemon[] = [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  function canvasToLogical(tap: { x: number; y: number }): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((tap.x - rect.left) * scaleX) / RES_SCALE,
      y: ((tap.y - rect.top) * scaleY) / RES_SCALE,
    };
  }

  function hitTestKeyboard(nx: number, ny: number): string {
    for (let row = 0; row < 4; row++) {
      const ky = KB_ROWS_Y[row];
      if (ny < ky || ny >= ky + BTN_H) continue;
      for (let col = 0; col < KB_ROWS[row].length; col++) {
        const bx = KB_X + col * (BTN_W + BTN_GAP_X);
        if (nx >= bx && nx < bx + BTN_W) return KB_ROWS[row][col];
      }
    }
    return '';
  }

  function pickRandom<T>(arr: T[], count: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(count, copy.length));
  }

  function startNewRound(): void {
    const idx = Math.floor(Math.random() * SPELL_TYPES.length);
    currentType = SPELL_TYPES[idx];
    word = TYPE_BADGE[currentType].en;
    filledSlots = new Array(word.length).fill('');
    currentSlot = 0;
    feedback = 'idle';
    feedbackTimer = 0;
    completionTimer = 0;
    pressedBtn = '';

    const pool = getAllPokemon().filter((p) => p.types.includes(currentType));
    const picks = pickRandom(pool, 3);
    hintPokemon = picks.map((p) => ({
      id: p.id,
      name: p.name.he || p.name.en,
      sprite: getCachedImage(`/sprites/pokemon/front/${p.id}.png`),
    }));
    picks.forEach((p) => {
      void loadImage(`/sprites/pokemon/front/${p.id}.png`).then((img) => {
        const h = hintPokemon.find((hp) => hp.id === p.id);
        if (h) h.sprite = img;
      });
    });

    // Preload all unique letter sounds for this word, then play the first
    const uniqueLetters = [...new Set(word.toLowerCase().split(''))];
    audio.preloadLetters(uniqueLetters);
    setTimeout(() => audio.playLetter(word[0].toLowerCase()), 400);
  }

  function handleLetter(letter: string): void {
    if (feedback !== 'idle') return;
    if (currentSlot >= word.length) return;

    const target = word[currentSlot];
    pressedBtn = letter;
    pressedTimer = 0.15;

    if (letter.toUpperCase() === target.toUpperCase()) {
      filledSlots[currentSlot] = target;
      currentSlot++;
      audio.playSFX('menu-select');
      if (currentSlot >= word.length) {
        feedback = 'complete';
        completionTimer = 3.2;
        setTimeout(() => audio.playWord(word.toLowerCase()), 300);
        audio.playLevelUp();
      } else {
        setTimeout(() => audio.playLetter(word[currentSlot].toLowerCase()), 250);
      }
    } else {
      feedback = 'wrong';
      feedbackTimer = 0.9;
      audio.playSFX('menu-cancel');
      // Re-play the target letter to help the kid
      setTimeout(() => audio.playLetter(word[currentSlot].toLowerCase()), 450);
    }
  }

  // ── Keyboard render ──────────────────────────────────────────────────────

  function renderKeyboard(ctx: CanvasRenderingContext2D, targetLetter: string | null): void {
    for (let row = 0; row < 4; row++) {
      const ky = KB_ROWS_Y[row];
      for (let col = 0; col < KB_ROWS[row].length; col++) {
        const letter = KB_ROWS[row][col];
        const bx = KB_X + col * (BTN_W + BTN_GAP_X);
        const isTarget = targetLetter !== null && letter.toLowerCase() === targetLetter.toLowerCase();
        const isPressed = letter === pressedBtn;

        let bg = '#1e1e30';
        let fg = '#9090b0';
        let border = '#383858';

        if (isTarget) {
          bg = '#183830';
          fg = '#48e898';
          border = '#30a860';
        }
        if (isPressed) {
          bg = '#484870';
          fg = '#ffffff';
          border = '#7878b0';
        }

        fillRect(ctx, bx, ky, BTN_W, BTN_H, bg);
        drawRect(ctx, bx, ky, BTN_W, BTN_H, border);
        drawText(ctx, letter, bx + BTN_W / 2, ky + 2, { size: 7, color: fg, align: 'center' });
      }
    }

    // Separator above keyboard
    fillRect(ctx, 0, KB_ROWS_Y[0] - 4, SW, 1, '#30304a');
  }

  // ── View renders ──────────────────────────────────────────────────────────

  function renderMenu(ctx: CanvasRenderingContext2D): void {
    clearScreen(ctx, '#07070e');

    drawText(ctx, 'English', SW / 2, 16, { size: 14, color: '#f8e030', align: 'center' });
    drawText(ctx, 'Learning', SW / 2, 33, { size: 14, color: '#f8e030', align: 'center' });
    drawText(ctx, 'לימוד אנגלית', SW / 2, 50, { size: 6, color: '#7070a0', align: 'center', direction: 'rtl' });

    const OPTS = ['ABC - אותיות', 'איות סוגים'];
    for (let i = 0; i < OPTS.length; i++) {
      const oy = 68 + i * 26;
      const sel = i === menuIdx;
      fillRect(ctx, 34, oy, SW - 68, 20, sel ? '#252548' : '#121224');
      drawRect(ctx, 34, oy, SW - 68, 20, sel ? '#6868c0' : '#383858');
      if (sel) {
        drawText(ctx, '►', 39, oy + 6, { size: 6, color: '#ffff30' });
        drawText(ctx, '◄', SW - 41, oy + 6, { size: 6, color: '#ffff30', align: 'right' });
      }
      drawText(ctx, OPTS[i], SW / 2, oy + 6, {
        size: 7,
        color: sel ? '#f0f0f8' : '#7878a0',
        align: 'center',
        direction: 'rtl',
      });
    }

    drawText(ctx, 'ESC = חזרה', SW / 2, 148, { size: 5, color: '#383858', align: 'center', direction: 'rtl' });
  }

  function renderBoard(ctx: CanvasRenderingContext2D): void {
    clearScreen(ctx, '#07070e');

    drawText(ctx, 'לחץ על אות לשמוע', SW / 2, 5, { size: 6, color: '#a0a0c8', align: 'center', direction: 'rtl' });

    // Big letter display box
    const BOX = 48;
    const bx = Math.round((SW - BOX) / 2);
    const by = 18;
    fillRect(ctx, bx, by, BOX, BOX, '#111126');
    drawRect(ctx, bx, by, BOX, BOX, '#4848a0');

    if (boardLetter) {
      drawText(ctx, boardLetter.toUpperCase(), bx + BOX / 2, by + 6, { size: 24, color: '#f8e030', align: 'center' });
      drawText(ctx, boardLetter.toLowerCase(), bx + BOX / 2, by + 35, { size: 9, color: '#6868a0', align: 'center' });
    } else {
      drawText(ctx, '?', bx + BOX / 2, by + 9, { size: 20, color: '#303050', align: 'center' });
    }

    drawText(ctx, 'ESC = חזרה', SW / 2, 91, { size: 5, color: '#303050', align: 'center', direction: 'rtl' });

    renderKeyboard(ctx, null);
  }

  function renderSpelling(ctx: CanvasRenderingContext2D): void {
    clearScreen(ctx, '#07070e');

    const typeData = TYPE_BADGE[currentType];

    // Type-colored header strip
    ctx.fillStyle = typeData.color + '33';
    ctx.fillRect(0, 0, SW, 15);
    drawRect(ctx, 0, 0, SW, 15, typeData.color + '66');
    ctx.beginPath();
    ctx.arc(7, 7, 4, 0, Math.PI * 2);
    ctx.fillStyle = typeData.color;
    ctx.fill();
    drawText(ctx, 'מה הסוג של הפוקמונים?', SW - 8, 4, {
      size: 5,
      color: '#d8d8f0',
      align: 'right',
      direction: 'rtl',
    });

    // Pokemon hint sprites
    const SPRITE = 28;
    const GAP = 8;
    const count = hintPokemon.length;
    const totalW = count * SPRITE + (count - 1) * GAP;
    let hx = Math.round((SW - totalW) / 2);
    for (const p of hintPokemon) {
      if (p.sprite) {
        ctx.drawImage(p.sprite, hx, 17, SPRITE, SPRITE);
      } else {
        fillRect(ctx, hx, 17, SPRITE, SPRITE, '#111126');
        drawRect(ctx, hx, 17, SPRITE, SPRITE, '#303050');
      }
      drawText(ctx, p.name, hx + SPRITE / 2, 48, {
        size: 5,
        color: '#9898c0',
        align: 'center',
        direction: 'rtl',
      });
      hx += SPRITE + GAP;
    }

    // Word slots
    const SLOT_W = 14;
    const SLOT_H = 14;
    const SLOT_GAP = 3;
    const totalSlotW = word.length * SLOT_W + (word.length - 1) * SLOT_GAP;
    let sx = Math.round((SW - totalSlotW) / 2);
    for (let i = 0; i < word.length; i++) {
      const sy = 58;
      const filled = filledSlots[i] !== '';
      const isCurrent = i === currentSlot && feedback === 'idle';
      let slotBg = '#111126';
      let slotBorder = '#303050';
      if (filled) {
        slotBg = '#182e28';
        slotBorder = '#30a060';
      } else if (isCurrent) {
        slotBg = '#1c1240';
        slotBorder = '#6040c0';
      }

      fillRect(ctx, sx, sy, SLOT_W, SLOT_H, slotBg);
      drawRect(ctx, sx, sy, SLOT_W, SLOT_H, slotBorder);
      if (filled) {
        drawText(ctx, filledSlots[i], sx + SLOT_W / 2, sy + 2, { size: 8, color: '#40e890', align: 'center' });
      }
      sx += SLOT_W + SLOT_GAP;
    }

    // Feedback row
    if (feedback === 'wrong') {
      fillRect(ctx, 0, 76, SW, 14, '#2a0012');
      drawText(ctx, 'נסה שוב!', SW / 2, 79, { size: 6, color: '#ff6868', align: 'center', direction: 'rtl' });
    } else if (feedback === 'complete') {
      fillRect(ctx, 0, 76, SW, 14, '#0c2818');
      drawText(ctx, `${word} = ${typeData.he}  ✓`, SW / 2, 79, { size: 6, color: '#40f890', align: 'center' });
    } else if (currentSlot < word.length) {
      // Prompt: which letter to press
      const tl = word[currentSlot];
      drawText(ctx, `▶  ${tl}`, SW / 2, 79, { size: 6, color: '#6060a0', align: 'center' });
    }

    const target = feedback === 'idle' && currentSlot < word.length ? word[currentSlot] : null;
    renderKeyboard(ctx, target);
  }

  // ── Scene interface ───────────────────────────────────────────────────────

  return {
    enter(): void {
      view = 'menu';
      menuIdx = 0;
      pressedBtn = '';
      pressedTimer = 0;
    },

    exit(): void {},

    update(dt: number): void {
      if (pressedTimer > 0) {
        pressedTimer -= dt;
        if (pressedTimer <= 0) {
          pressedTimer = 0;
          pressedBtn = '';
        }
      }

      const esc = input.isKeyPressed('Escape');
      const up = input.isKeyPressed('ArrowUp');
      const down = input.isKeyPressed('ArrowDown');
      const enter = input.isKeyPressed('Enter');
      const tapped = input.isTapped();
      const rawTap = tapped ? input.getTapPosition() : null;
      const tap = rawTap ? canvasToLogical(rawTap) : null;

      if (view === 'menu') {
        if (esc) {
          stateMachine.pop();
          return;
        }
        if (up || down) {
          menuIdx = 1 - menuIdx;
          return;
        }

        if (tapped && tap) {
          for (let i = 0; i < 2; i++) {
            const oy = 68 + i * 26;
            if (tap.x >= 34 && tap.x <= SW - 34 && tap.y >= oy && tap.y <= oy + 20) {
              if (i === 0) {
                view = 'board';
                boardLetter = '';
                return;
              }
              view = 'spelling';
              startNewRound();
              return;
            }
          }
        }

        if (enter) {
          if (menuIdx === 0) {
            view = 'board';
            boardLetter = '';
          } else {
            view = 'spelling';
            startNewRound();
          }
        }
      } else if (view === 'board') {
        if (esc) {
          view = 'menu';
          return;
        }

        // Physical key detection (layout-independent)
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
          if (input.isKeyPressed(letter)) {
            boardLetter = letter;
            audio.playLetter(letter.toLowerCase());
            pressedBtn = letter;
            pressedTimer = 0.2;
            break;
          }
        }

        if (tapped && tap) {
          const hit = hitTestKeyboard(tap.x, tap.y);
          if (hit) {
            boardLetter = hit;
            audio.playLetter(hit.toLowerCase());
            pressedBtn = hit;
            pressedTimer = 0.2;
          }
        }
      } else {
        // Spelling view
        if (esc) {
          view = 'menu';
          return;
        }

        if (feedbackTimer > 0) {
          feedbackTimer -= dt;
          if (feedbackTimer <= 0) {
            feedbackTimer = 0;
            feedback = 'idle';
          }
        }

        if (completionTimer > 0) {
          completionTimer -= dt;
          if (completionTimer <= 0) startNewRound();
          return;
        }

        // Physical key detection
        for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
          if (input.isKeyPressed(letter)) {
            handleLetter(letter);
            break;
          }
        }

        if (tapped && tap) {
          const hit = hitTestKeyboard(tap.x, tap.y);
          if (hit) handleLetter(hit);
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      if (view === 'menu') renderMenu(ctx);
      else if (view === 'board') renderBoard(ctx);
      else renderSpelling(ctx);
    },
  };
}
