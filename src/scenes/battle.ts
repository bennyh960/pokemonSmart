/**
 * BattleScene - Full turn-based battle with math challenges.
 *
 * Flow: INTRO → SELECT_MOVE → MATH → ATTACK → ENEMY_TURN → CHECK_WIN
 * Hardcoded Cyndaquil vs Pidgey with Tackle + Ember for Sprint 1.
 * Uses colored rectangle placeholders for Pokemon sprites.
 */

import type { Scene, Pokemon, MathProblem } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import {
  createHPBar, updateHPBar, renderHPBar, setHP, isHPAnimating,
} from '../ui/hp-bar.js';
import {
  createBattleMenu, showMainMenu, showMoveMenu,
  updateBattleMenu, renderBattleMenu,
} from '../ui/battle-menu.js';
import {
  createMathInput, updateMathInput, renderMathInput,
} from '../ui/math-input.js';
import {
  createTextBox, updateTextBox, renderTextBox,
} from '../ui/text-box.js';
import {
  createFlash, updateFlash, renderFlash,
  createShake, updateShake, applyShake, resetShake,
  createFade, updateFade, renderFade,
  spawnDamageNumber, updatePopups, renderPopups, clearAllPopups,
} from '../ui/battle-animations.js';

const SCREEN_W = 240;

type BattlePhase =
  | 'INTRO'
  | 'SELECT_ACTION'
  | 'SELECT_MOVE'
  | 'MATH'
  | 'PLAYER_ATTACK'
  | 'ENEMY_TURN'
  | 'CHECK_WIN'
  | 'WIN'
  | 'LOSE';

/** Hardcoded Cyndaquil for Sprint 1. */
function makePlayerPokemon(): Pokemon {
  return {
    id: 155,
    name: 'Cyndaquil',
    level: 10,
    hp: 38,
    maxHp: 38,
    attack: 14,
    defense: 12,
    specialAttack: 16,
    specialDefense: 14,
    speed: 18,
    types: ['fire'],
    moves: [
      { id: 33, name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
      { id: 52, name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, currentPp: 25, mathDifficulty: 1 },
      { id: 43, name: 'Leer', type: 'normal', power: 0, accuracy: 100, pp: 30, currentPp: 30, mathDifficulty: 1 },
      { id: 108, name: 'Smokescreen', type: 'normal', power: 0, accuracy: 100, pp: 20, currentPp: 20, mathDifficulty: 1 },
    ],
    xp: 0,
    xpToNext: 100,
    isGlitched: false,
  };
}

/** Hardcoded Pidgey for Sprint 1. */
function makeEnemyPokemon(): Pokemon {
  return {
    id: 16,
    name: 'Pidgey',
    level: 12,
    hp: 45,
    maxHp: 45,
    attack: 13,
    defense: 11,
    specialAttack: 10,
    specialDefense: 10,
    speed: 16,
    types: ['normal', 'flying'],
    moves: [
      { id: 33, name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
      { id: 16, name: 'Gust', type: 'flying', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
    ],
    xp: 0,
    xpToNext: 100,
    isGlitched: false,
  };
}

/** Generate a simple math problem (placeholder until math engine is integrated). */
function generateSimpleProblem(difficulty: number): MathProblem {
  let a: number, b: number, question: string, answer: number;

  if (difficulty <= 1) {
    a = Math.floor(Math.random() * 10) + 1;
    b = Math.floor(Math.random() * 10) + 1;
    if (Math.random() > 0.5) {
      question = `${a} + ${b} = ?`;
      answer = a + b;
    } else {
      if (a < b) [a, b] = [b, a];
      question = `${a} - ${b} = ?`;
      answer = a - b;
    }
  } else {
    a = Math.floor(Math.random() * 20) + 10;
    b = Math.floor(Math.random() * 20) + 10;
    question = `${a} + ${b} = ?`;
    answer = a + b;
  }

  return {
    question,
    correctAnswer: answer,
    difficulty: 1,
    timeLimit: 15,
    category: 'arithmetic',
  };
}

/** Create the battle scene. */
export function createBattleScene(
  input: InputManager,
  stateMachine: StateMachine,
  canvas: HTMLCanvasElement,
): Scene {
  let phase: BattlePhase = 'INTRO';
  let player: Pokemon;
  let enemy: Pokemon;
  let playerHpBar: ReturnType<typeof createHPBar>;
  let enemyHpBar: ReturnType<typeof createHPBar>;
  let menu: ReturnType<typeof createBattleMenu>;
  let mathInput: ReturnType<typeof createMathInput> | null = null;
  let textBox: ReturnType<typeof createTextBox> | null = null;
  let selectedMoveIndex = 0;

  // Animation effects
  let flash: ReturnType<typeof createFlash> | null = null;
  let shake: ReturnType<typeof createShake> | null = null;
  let fade: ReturnType<typeof createFade> | null = null;
  let phaseTimer = 0;

  function initBattle(): void {
    player = makePlayerPokemon();
    enemy = makeEnemyPokemon();
    playerHpBar = createHPBar(player.name, player.level, player.hp, player.maxHp, 8, 80, true);
    enemyHpBar = createHPBar(enemy.name, enemy.level, enemy.hp, enemy.maxHp, 130, 8, false);
    menu = createBattleMenu(player.moves);
    mathInput = null;
    textBox = null;
    flash = null;
    shake = null;
    fade = createFade(true, 0.5);
    clearAllPopups();
    phase = 'INTRO';
    phaseTimer = 0;
  }

  function startIntroText(): void {
    textBox = createTextBox([`A wild ${enemy.name} appeared!`]);
    phase = 'INTRO';
  }

  function doPlayerAttack(): void {
    const move = player.moves[selectedMoveIndex];
    if (move.power > 0) {
      const baseDamage = Math.floor((move.power * (player.attack / enemy.defense)) / 5) + 2;
      const damage = Math.max(1, baseDamage);
      enemy.hp = Math.max(0, enemy.hp - damage);
      setHP(enemyHpBar, enemy.hp);
      flash = createFlash('#ffffff', 0.15);
      shake = createShake(2, 0.25);
      spawnDamageNumber(`-${damage}`, 185, 40, '#f84038');
      textBox = createTextBox([`${player.name} used ${move.name}!`]);
    } else {
      textBox = createTextBox([`${player.name} used ${move.name}!`, `But nothing happened...`]);
    }
    if (move.currentPp > 0) move.currentPp--;
    phase = 'PLAYER_ATTACK';
    phaseTimer = 0;
  }

  function doPlayerAttackReduced(): void {
    const move = player.moves[selectedMoveIndex];
    if (move.power > 0) {
      const baseDamage = Math.floor((move.power * (player.attack / enemy.defense)) / 5) + 2;
      const damage = Math.max(1, Math.floor(baseDamage * 0.3));
      enemy.hp = Math.max(0, enemy.hp - damage);
      setHP(enemyHpBar, enemy.hp);
      spawnDamageNumber(`-${damage}`, 185, 40, '#a0a0a0');
      textBox = createTextBox([`${player.name} used ${move.name}!`, `The attack was weak...`]);
    } else {
      textBox = createTextBox([`${player.name} used ${move.name}!`, `But nothing happened...`]);
    }
    if (move.currentPp > 0) move.currentPp--;
    phase = 'PLAYER_ATTACK';
    phaseTimer = 0;
  }

  function doEnemyTurn(): void {
    const moveIdx = Math.floor(Math.random() * enemy.moves.length);
    const move = enemy.moves[moveIdx];
    if (move.power > 0) {
      const baseDamage = Math.floor((move.power * (enemy.attack / player.defense)) / 5) + 2;
      const damage = Math.max(1, baseDamage);
      player.hp = Math.max(0, player.hp - damage);
      setHP(playerHpBar, player.hp);
      flash = createFlash('#ffffff', 0.15);
      shake = createShake(2, 0.25);
      spawnDamageNumber(`-${damage}`, 50, 80, '#f84038');
    }
    textBox = createTextBox([`${enemy.name} used ${move.name}!`]);
    phase = 'ENEMY_TURN';
    phaseTimer = 0;
  }

  return {
    enter(): void {
      initBattle();
      startIntroText();
    },

    exit(): void {
      clearAllPopups();
    },

    update(dt: number): void {
      phaseTimer += dt;

      // Update animations
      if (flash) updateFlash(flash, dt);
      if (shake) updateShake(shake, dt);
      if (fade) updateFade(fade, dt);
      updateHPBar(playerHpBar, dt);
      updateHPBar(enemyHpBar, dt);
      updatePopups(dt);

      switch (phase) {
        case 'INTRO': {
          if (textBox) {
            const done = updateTextBox(textBox, input, dt);
            if (done) {
              textBox = null;
              phase = 'SELECT_ACTION';
              showMainMenu(menu);
            }
          }
          break;
        }

        case 'SELECT_ACTION': {
          const result = updateBattleMenu(menu, input);
          if (result?.type === 'main') {
            switch (result.choice) {
              case 'FIGHT':
                phase = 'SELECT_MOVE';
                showMoveMenu(menu);
                break;
              case 'RUN':
                textBox = createTextBox(['Got away safely!']);
                phase = 'WIN';
                break;
              default:
                textBox = createTextBox(["Can't do that yet!"]);
                phase = 'INTRO';
                break;
            }
          }
          break;
        }

        case 'SELECT_MOVE': {
          const result = updateBattleMenu(menu, input);
          if (result?.type === 'move') {
            if (result.index === -1) {
              phase = 'SELECT_ACTION';
              showMainMenu(menu);
            } else {
              selectedMoveIndex = result.index;
              const move = player.moves[selectedMoveIndex];
              if (move.currentPp <= 0) {
                textBox = createTextBox(['No PP left for this move!']);
                phase = 'INTRO';
              } else {
                const problem = generateSimpleProblem(move.mathDifficulty);
                mathInput = createMathInput(problem);
                input.clearNumberInput();
                phase = 'MATH';
              }
            }
          }
          break;
        }

        case 'MATH': {
          if (mathInput) {
            const result = updateMathInput(mathInput, input, canvas, dt);
            if (result) {
              if (result.correct) {
                doPlayerAttack();
              } else {
                doPlayerAttackReduced();
              }
              mathInput = null;
            }
          }
          break;
        }

        case 'PLAYER_ATTACK': {
          if (textBox) {
            const done = updateTextBox(textBox, input, dt);
            if (done) {
              textBox = null;
            }
          }
          if (!textBox && !isHPAnimating(enemyHpBar)) {
            phase = 'CHECK_WIN';
          }
          break;
        }

        case 'ENEMY_TURN': {
          if (textBox) {
            const done = updateTextBox(textBox, input, dt);
            if (done) {
              textBox = null;
            }
          }
          if (!textBox && !isHPAnimating(playerHpBar)) {
            if (player.hp <= 0) {
              textBox = createTextBox([`${player.name} fainted!`]);
              phase = 'LOSE';
            } else {
              phase = 'SELECT_ACTION';
              showMainMenu(menu);
            }
          }
          break;
        }

        case 'CHECK_WIN': {
          if (enemy.hp <= 0) {
            textBox = createTextBox([`${enemy.name} fainted!`, 'You won the battle!']);
            phase = 'WIN';
          } else {
            doEnemyTurn();
          }
          break;
        }

        case 'WIN':
        case 'LOSE': {
          if (textBox) {
            const done = updateTextBox(textBox, input, dt);
            if (done) {
              textBox = null;
              fade = createFade(false, 0.5);
            }
          }
          if (!textBox && fade && !fade.active) {
            if (stateMachine.currentId() === 'BATTLE') {
              stateMachine.change('TITLE');
            }
          }
          break;
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#78c850');

      if (shake) applyShake(ctx, shake);

      // Battle field
      fillRect(ctx, 0, 0, SCREEN_W, 70, '#98d8a8');
      fillRect(ctx, 0, 70, SCREEN_W, 50, '#78c850');

      // Enemy platform
      fillRect(ctx, 140, 55, 80, 8, '#c8b870');
      drawRect(ctx, 140, 55, 80, 8, '#a89850');

      // Player platform
      fillRect(ctx, 20, 95, 80, 8, '#c8b870');
      drawRect(ctx, 20, 95, 80, 8, '#a89850');

      // Enemy Pokemon placeholder
      fillRect(ctx, 165, 20, 32, 32, '#b0a0a0');
      drawRect(ctx, 165, 20, 32, 32, '#888888');
      drawText(ctx, enemy.name.slice(0, 3).toUpperCase(), 172, 30, {
        size: 7,
        color: '#404040',
        align: 'center',
      });

      // Player Pokemon placeholder (back view)
      fillRect(ctx, 35, 60, 40, 36, '#f08030');
      drawRect(ctx, 35, 60, 40, 36, '#c06020');
      drawText(ctx, player.name.slice(0, 3).toUpperCase(), 48, 72, {
        size: 7,
        color: '#802010',
        align: 'center',
      });

      // HP bars
      renderHPBar(ctx, enemyHpBar);
      renderHPBar(ctx, playerHpBar);

      if (shake) resetShake(ctx, shake);

      // Damage popups
      renderPopups(ctx);

      // Flash
      if (flash) renderFlash(ctx, flash);

      // UI layer
      if (phase === 'MATH' && mathInput) {
        renderMathInput(ctx, mathInput);
      } else if (textBox) {
        renderTextBox(ctx, textBox);
      } else if (phase === 'SELECT_ACTION' || phase === 'SELECT_MOVE') {
        renderBattleMenu(ctx, menu);
      }

      // Fade overlay
      if (fade) renderFade(ctx, fade);
    },
  };
}
