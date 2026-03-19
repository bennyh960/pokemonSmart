/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { createHPBar, updateHPBar, renderHPBar, setHP, isHPAnimating } from '../ui/hp-bar.js';
import { createBattleMenu, showMainMenu, showMoveMenu, updateBattleMenu, renderBattleMenu } from '../ui/battle-menu.js';
import { createMathInput, updateMathInput, renderMathInput } from '../ui/math-input.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createFlash, updateFlash, renderFlash, createShake, updateShake, applyShake, resetShake,
  createFade, updateFade, renderFade, spawnDamageNumber, updatePopups, renderPopups, clearAllPopups,
} from '../ui/battle-animations.js';
import { generateProblem } from '../math/math-engine.js';
import { getCombinedTypeEffectiveness } from '../services/pokemon-data.js';
import { calculateXpGain, checkAndApplyLevelUp } from '../systems/encounter.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';

const SCREEN_W = 240;

type BattlePhase = 'INTRO' | 'SELECT_ACTION' | 'SELECT_MOVE' | 'MATH' | 'PLAYER_ATTACK'
  | 'ENEMY_TURN' | 'CHECK_WIN' | 'WIN' | 'XP_GAIN' | 'LEVEL_UP' | 'LOSE' | 'RUN';

let pendingPlayer: Pokemon | null = null;
let pendingEnemy: Pokemon | null = null;

export function setBattleData(playerPokemon: Pokemon, enemyPokemon: Pokemon): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = enemyPokemon;
}

function calcDamage(atk: Pokemon, def: Pokemon, power: number, moveType: PokemonType, correct: boolean): number {
  if (power <= 0) return 0;
  const lf = ((2 * atk.level) / 5) + 2;
  const base = ((lf * power * (atk.attack / def.defense)) / 50) + 2;
  const eff = getCombinedTypeEffectiveness(moveType, def.types);
  const stab = atk.types.includes(moveType) ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  const mathMul = correct ? 1 : 0.3;
  return Math.max(1, Math.floor(base * eff * stab * rand * mathMul));
}

function effText(mt: PokemonType, dt: PokemonType[]): string | null {
  const e = getCombinedTypeEffectiveness(mt, dt);
  if (e >= 2) return "It's super effective!";
  if (e > 0 && e < 1) return "It's not very effective...";
  if (e === 0) return "It had no effect!";
  return null;
}

export function createBattleScene(input: InputManager, stateMachine: StateMachine, canvas: HTMLCanvasElement, audio: AudioManager): Scene {
  let phase: BattlePhase = 'INTRO';
  let player: Pokemon;
  let enemy: Pokemon;
  let playerHpBar: ReturnType<typeof createHPBar>;
  let enemyHpBar: ReturnType<typeof createHPBar>;
  let menu: ReturnType<typeof createBattleMenu>;
  let mathInput: ReturnType<typeof createMathInput> | null = null;
  let textBox: ReturnType<typeof createTextBox> | null = null;
  let selMove = 0;
  let flash: ReturnType<typeof createFlash> | null = null;
  let shake: ReturnType<typeof createShake> | null = null;
  let fade: ReturnType<typeof createFade> | null = null;
  let phaseTimer = 0;
  let xpGained = 0;

  function init(): void {
    if (pendingPlayer && pendingEnemy) {
      player = pendingPlayer; enemy = pendingEnemy;
      pendingPlayer = null; pendingEnemy = null;
    } else {
      player = (hasActiveGame() && getPlayerData().party[0]) || fallbackPlayer();
      enemy = fallbackEnemy();
    }
    playerHpBar = createHPBar(player.name, player.level, player.hp, player.maxHp, 8, 80, true);
    enemyHpBar = createHPBar(enemy.name, enemy.level, enemy.hp, enemy.maxHp, 130, 8, false);
    menu = createBattleMenu(player.moves);
    mathInput = null; textBox = null; flash = null; shake = null;
    fade = createFade(true, 0.5); clearAllPopups();
    phase = 'INTRO'; phaseTimer = 0; xpGained = 0;
  }

  function doAttack(correct: boolean): void {
    const m = player.moves[selMove];
    if (m.power > 0) {
      const dmg = calcDamage(player, enemy, m.power, m.type, correct);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      setHP(enemyHpBar, enemy.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, 185, 40, '#f84038');
      audio.playSFX('hit');
      const msgs = [`${player.name} used ${m.name}!`];
      if (!correct) msgs.push('The attack was weak...');
      const et = effText(m.type, enemy.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs);
    } else {
      textBox = createTextBox([`${player.name} used ${m.name}!`, 'But nothing happened...']);
    }
    if (m.currentPp > 0) m.currentPp--;
    phase = 'PLAYER_ATTACK'; phaseTimer = 0;
  }

  function enemyTurn(): void {
    const mi = Math.floor(Math.random() * enemy.moves.length);
    const m = enemy.moves[mi];
    if (m.power > 0) {
      const dmg = calcDamage(enemy, player, m.power, m.type, true);
      player.hp = Math.max(0, player.hp - dmg);
      setHP(playerHpBar, player.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, 50, 80, '#f84038');
      audio.playSFX('hit');
      const msgs = [`${enemy.name} used ${m.name}!`];
      const et = effText(m.type, player.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs);
    } else {
      textBox = createTextBox([`${enemy.name} used ${m.name}!`]);
    }
    phase = 'ENEMY_TURN'; phaseTimer = 0;
  }

  function goBack(): void { autoSave(); stateMachine.change('OVERWORLD'); }

  function handleLoss(): void {
    if (hasActiveGame()) {
      const pd = getPlayerData();
      for (const p of pd.party) { p.hp = p.maxHp; for (const mv of p.moves) mv.currentPp = mv.pp; }
      pd.position.x = 0; pd.position.y = 0;
    }
    autoSave();
    stateMachine.change('OVERWORLD');
  }

  return {
    enter(): void { init(); textBox = createTextBox([`A wild ${enemy.name} appeared!`]); phase = 'INTRO'; audio.playMusic('battle'); },
    exit(): void { clearAllPopups(); },
    update(dt: number): void {
      phaseTimer += dt;
      if (flash) updateFlash(flash, dt);
      if (shake) updateShake(shake, dt);
      if (fade) updateFade(fade, dt);
      updateHPBar(playerHpBar, dt); updateHPBar(enemyHpBar, dt); updatePopups(dt);

      switch (phase) {
        case 'INTRO': {
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; phase = 'SELECT_ACTION'; showMainMenu(menu); }
          break;
        }
        case 'SELECT_ACTION': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'main') {
            audio.playSFX('menu-select');
            if (r.choice === 'FIGHT') { phase = 'SELECT_MOVE'; showMoveMenu(menu); }
            else if (r.choice === 'RUN') { textBox = createTextBox(['Got away safely!']); phase = 'RUN'; }
            else { textBox = createTextBox(["Can't do that yet!"]); phase = 'INTRO'; }
          }
          break;
        }
        case 'SELECT_MOVE': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'move') {
            if (r.index === -1) { phase = 'SELECT_ACTION'; showMainMenu(menu); }
            else {
              selMove = r.index;
              const m = player.moves[selMove];
              if (m.currentPp <= 0) { textBox = createTextBox(['No PP left!']); phase = 'INTRO'; }
              else { mathInput = createMathInput(generateProblem(m.mathDifficulty)); input.clearNumberInput(); phase = 'MATH'; }
            }
          }
          break;
        }
        case 'MATH': {
          if (mathInput) { const r = updateMathInput(mathInput, input, canvas, dt); if (r) { doAttack(r.correct); mathInput = null; } }
          break;
        }
        case 'PLAYER_ATTACK': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !isHPAnimating(enemyHpBar)) phase = 'CHECK_WIN';
          break;
        }
        case 'ENEMY_TURN': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !isHPAnimating(playerHpBar)) {
            if (player.hp <= 0) { textBox = createTextBox([`${player.name} fainted!`]); phase = 'LOSE'; }
            else { phase = 'SELECT_ACTION'; showMainMenu(menu); }
          }
          break;
        }
        case 'CHECK_WIN': {
          if (enemy.hp <= 0) { textBox = createTextBox([`${enemy.name} fainted!`, 'You won!']); audio.playMusic('victory'); phase = 'WIN'; }
          else enemyTurn();
          break;
        }
        case 'WIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null; xpGained = calculateXpGain(enemy); player.xp += xpGained;
            textBox = createTextBox([`${player.name} gained ${xpGained} XP!`]); phase = 'XP_GAIN';
          }
          break;
        }
        case 'XP_GAIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (checkAndApplyLevelUp(player)) { textBox = createTextBox([`${player.name} grew to level ${player.level}!`]); phase = 'LEVEL_UP'; }
            else { fade = createFade(false, 0.5); phase = 'RUN'; }
          }
          break;
        }
        case 'LEVEL_UP': {
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; fade = createFade(false, 0.5); phase = 'RUN'; }
          break;
        }
        case 'RUN': {
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; fade = createFade(false, 0.5); }
          if (!textBox && fade && !fade.active) goBack();
          break;
        }
        case 'LOSE': {
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; fade = createFade(false, 0.5); }
          if (!textBox && fade && !fade.active) handleLoss();
          break;
        }
      }
    },
    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#78c850');
      if (shake) applyShake(ctx, shake);
      fillRect(ctx, 0, 0, SCREEN_W, 70, '#98d8a8');
      fillRect(ctx, 0, 70, SCREEN_W, 50, '#78c850');
      fillRect(ctx, 140, 55, 80, 8, '#c8b870'); drawRect(ctx, 140, 55, 80, 8, '#a89850');
      fillRect(ctx, 20, 95, 80, 8, '#c8b870'); drawRect(ctx, 20, 95, 80, 8, '#a89850');
      fillRect(ctx, 165, 20, 32, 32, '#b0a0a0'); drawRect(ctx, 165, 20, 32, 32, '#888888');
      drawText(ctx, enemy.name.slice(0, 3).toUpperCase(), 172, 30, { size: 8, color: '#404040', align: 'center' });
      fillRect(ctx, 35, 60, 40, 36, '#f08030'); drawRect(ctx, 35, 60, 40, 36, '#c06020');
      drawText(ctx, player.name.slice(0, 3).toUpperCase(), 48, 72, { size: 8, color: '#802010', align: 'center' });
      renderHPBar(ctx, enemyHpBar); renderHPBar(ctx, playerHpBar);
      if (shake) resetShake(ctx, shake);
      renderPopups(ctx);
      if (flash) renderFlash(ctx, flash);
      if (phase === 'MATH' && mathInput) renderMathInput(ctx, mathInput);
      else if (textBox) renderTextBox(ctx, textBox);
      else if (phase === 'SELECT_ACTION' || phase === 'SELECT_MOVE') renderBattleMenu(ctx, menu);
      if (fade) renderFade(ctx, fade);
    },
  };
}

function fallbackPlayer(): Pokemon {
  return { id: 155, name: 'Cyndaquil', level: 5, hp: 20, maxHp: 20, attack: 10, defense: 9, specialAttack: 11, specialDefense: 10, speed: 12, types: ['fire'], moves: [
    { id: 33, name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
    { id: 52, name: 'Ember', type: 'fire', power: 40, accuracy: 100, pp: 25, currentPp: 25, mathDifficulty: 1 },
  ], xp: 0, xpToNext: 500, isGlitched: false };
}

function fallbackEnemy(): Pokemon {
  return { id: 16, name: 'Pidgey', level: 3, hp: 14, maxHp: 14, attack: 7, defense: 7, specialAttack: 6, specialDefense: 6, speed: 8, types: ['normal', 'flying'], moves: [
    { id: 33, name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
  ], xp: 0, xpToNext: 300, isGlitched: false };
}
