/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect, drawRect, drawText } from '../engine/renderer.js';
import { createHPBar, updateHPBar, renderHPBar, setHP, isHPAnimating } from '../ui/hp-bar.js';
import { createBattleMenu, showMainMenu, showMoveMenu, updateBattleMenu, renderBattleMenu } from '../ui/battle-menu.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createFlash, updateFlash, renderFlash, createShake, updateShake, applyShake, resetShake,
  createFade, updateFade, renderFade, spawnDamageNumber, updatePopups, renderPopups, clearAllPopups,
} from '../ui/battle-animations.js';
import { getCombinedTypeEffectiveness } from '../services/pokemon-data.js';
import { calculateXpGain, checkAndApplyLevelUp } from '../systems/encounter.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { getBattleBackground } from '../engine/asset-generator.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getItem, type ItemDef } from '../data/items.js';

const SCREEN_W = 240;

type BattlePhase = 'INTRO' | 'SELECT_ACTION' | 'SELECT_MOVE' | 'PLAYER_ATTACK'
  | 'ENEMY_TURN' | 'CHECK_WIN' | 'WIN' | 'XP_GAIN' | 'LEVEL_UP' | 'LOSE' | 'RUN'
  | 'SELECT_ITEM' | 'USE_ITEM' | 'TRAINER_NEXT_POKEMON' | 'TRAINER_REWARD';

let pendingPlayer: Pokemon | null = null;
let pendingEnemy: Pokemon | null = null;
let pendingTrainerBattle: TrainerBattleData | null = null;

export interface TrainerBattleData {
  trainerName: string;
  trainerId: string;
  party: Pokemon[];
  reward: number;
}

export function setBattleData(playerPokemon: Pokemon, enemyPokemon: Pokemon): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = enemyPokemon;
  pendingTrainerBattle = null;
}

export function setTrainerBattleData(playerPokemon: Pokemon, trainerData: TrainerBattleData): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = trainerData.party[0];
  pendingTrainerBattle = trainerData;
}

function calcDamage(atk: Pokemon, def: Pokemon, power: number, moveType: PokemonType): number {
  if (power <= 0) return 0;
  const lf = ((2 * atk.level) / 5) + 2;
  const base = ((lf * power * (atk.attack / def.defense)) / 50) + 2;
  const eff = getCombinedTypeEffectiveness(moveType, def.types);
  const stab = atk.types.includes(moveType) ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  return Math.max(1, Math.floor(base * eff * stab * rand));
}

function effText(mt: PokemonType, dt: PokemonType[]): string | null {
  const e = getCombinedTypeEffectiveness(mt, dt);
  if (e >= 2) return t('battle.superEffective');
  if (e > 0 && e < 1) return t('battle.notVeryEffective');
  if (e === 0) return t('battle.noEffect');
  return null;
}

export function createBattleScene(input: InputManager, stateMachine: StateMachine, _canvas: HTMLCanvasElement, audio: AudioManager): Scene {
  let phase: BattlePhase = 'INTRO';
  let player: Pokemon;
  let enemy: Pokemon;
  let playerHpBar: ReturnType<typeof createHPBar>;
  let enemyHpBar: ReturnType<typeof createHPBar>;
  let menu: ReturnType<typeof createBattleMenu>;
  let textBox: ReturnType<typeof createTextBox> | null = null;
  let selMove = 0;
  let flash: ReturnType<typeof createFlash> | null = null;
  let shake: ReturnType<typeof createShake> | null = null;
  let fade: ReturnType<typeof createFade> | null = null;
  let phaseTimer = 0;
  let xpGained = 0;
  let bagItems: { id: string; def: ItemDef; qty: number }[] = [];
  let bagCursor = 0;
  let isTrainerBattle = false;
  let trainerData: TrainerBattleData | null = null;
  let trainerPartyIndex = 0;

  function getBattleItems(): { id: string; def: ItemDef; qty: number }[] {
    if (!hasActiveGame()) return [];
    const pd = getPlayerData();
    const items: { id: string; def: ItemDef; qty: number }[] = [];
    for (const [id, qty] of Object.entries(pd.items)) {
      if (qty <= 0) continue;
      const def = getItem(id);
      if (def && def.usableInBattle) items.push({ id, def, qty });
    }
    return items;
  }

  function useItem(itemId: string): void {
    const pd = getPlayerData();
    const def = getItem(itemId);
    if (!def) return;
    if (def.effect.type === 'heal') {
      player.hp = Math.min(player.maxHp, player.hp + def.effect.amount);
      setHP(playerHpBar, player.hp);
    }
    pd.items[itemId]--;
    if (pd.items[itemId] <= 0) delete pd.items[itemId];
    textBox = createTextBox([t('battle.usedItem', { item: t(def.nameKey), name: player.name })], isRTL());
    phase = 'USE_ITEM';
    phaseTimer = 0;
  }

  function init(): void {
    isTrainerBattle = false;
    trainerData = null;
    trainerPartyIndex = 0;

    if (pendingTrainerBattle) {
      isTrainerBattle = true;
      trainerData = pendingTrainerBattle;
      trainerPartyIndex = 0;
      pendingTrainerBattle = null;
    }

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
    textBox = null; flash = null; shake = null;
    fade = createFade(true, 0.5); clearAllPopups();
    phase = 'INTRO'; phaseTimer = 0; xpGained = 0;
    // Preload Pokemon sprites
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
  }

  function doAttack(): void {
    const m = player.moves[selMove];
    if (m.power > 0) {
      const dmg = calcDamage(player, enemy, m.power, m.type);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      setHP(enemyHpBar, enemy.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, 185, 40, '#f84038');
      audio.playSFX('hit');
      const rtl = isRTL();
      const msgs = [t('battle.usedMove', { name: player.name, move: m.name })];
      const et = effText(m.type, enemy.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs, rtl);
    } else {
      textBox = createTextBox([t('battle.usedMove', { name: player.name, move: m.name }), t('battle.nothingHappened')], isRTL());
    }
    if (m.currentPp > 0) m.currentPp--;
    phase = 'PLAYER_ATTACK'; phaseTimer = 0;
  }

  function enemyTurn(): void {
    const mi = Math.floor(Math.random() * enemy.moves.length);
    const m = enemy.moves[mi];
    const rtl = isRTL();
    if (m.power > 0) {
      const dmg = calcDamage(enemy, player, m.power, m.type);
      player.hp = Math.max(0, player.hp - dmg);
      setHP(playerHpBar, player.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, 50, 80, '#f84038');
      audio.playSFX('hit');
      const msgs = [t('battle.usedMove', { name: enemy.name, move: m.name })];
      const et = effText(m.type, player.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs, rtl);
    } else {
      textBox = createTextBox([t('battle.usedMove', { name: enemy.name, move: m.name })], rtl);
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
    enter(): void {
      init();
      // Mark enemy Pokemon as seen in Pokedex
      if (hasActiveGame()) {
        getPlayerData().pokedex[enemy.id] = true;
      }
      if (isTrainerBattle && trainerData) {
        textBox = createTextBox([
          t('battle.trainerWantsBattle', { name: trainerData.trainerName }),
          t('battle.trainerSentOut', { name: enemy.name }),
        ], isRTL());
      } else {
        textBox = createTextBox([t('battle.wildAppeared', { name: enemy.name })], isRTL());
      }
      phase = 'INTRO';
      audio.playMusic('battle');
    },
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
            else if (r.choice === 'BAG') {
              bagItems = getBattleItems();
              if (bagItems.length === 0) {
                textBox = createTextBox([t('battle.noItems')], isRTL()); phase = 'INTRO';
              } else {
                bagCursor = 0; phase = 'SELECT_ITEM';
              }
            }
            else if (r.choice === 'RUN') {
              if (isTrainerBattle) {
                textBox = createTextBox([t('battle.cantRunTrainer')], isRTL()); phase = 'INTRO';
              } else {
                textBox = createTextBox([t('battle.gotAway')], isRTL()); phase = 'RUN';
              }
            }
            else { textBox = createTextBox([t('battle.cantDoThat')], isRTL()); phase = 'INTRO'; }
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
              if (m.currentPp <= 0) { textBox = createTextBox([t('battle.noPP')], isRTL()); phase = 'INTRO'; }
              else { doAttack(); }
            }
          }
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
            if (player.hp <= 0) { textBox = createTextBox([t('battle.fainted', { name: player.name })], isRTL()); phase = 'LOSE'; }
            else { phase = 'SELECT_ACTION'; showMainMenu(menu); }
          }
          break;
        }
        case 'CHECK_WIN': {
          if (enemy.hp <= 0) {
            if (isTrainerBattle && trainerData && trainerPartyIndex + 1 < trainerData.party.length) {
              // Trainer has more Pokemon
              textBox = createTextBox([t('battle.fainted', { name: enemy.name })], isRTL());
              phase = 'TRAINER_NEXT_POKEMON';
            } else {
              // Wild win or trainer's last Pokemon fainted
              const msgs = [t('battle.fainted', { name: enemy.name }), t('battle.youWon')];
              textBox = createTextBox(msgs, isRTL());
              audio.playMusic('victory');
              phase = 'WIN';
            }
          }
          else enemyTurn();
          break;
        }
        case 'TRAINER_NEXT_POKEMON': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            // XP for the fainted Pokemon first
            xpGained = calculateXpGain(enemy);
            player.xp += xpGained;
            textBox = createTextBox([t('battle.gainedXP', { name: player.name, xp: xpGained })], isRTL());
            // Check level up inline
            if (checkAndApplyLevelUp(player)) {
              // Will show level up after XP text
            }
          }
          if (!textBox) {
            // Send out next Pokemon
            trainerPartyIndex++;
            enemy = trainerData!.party[trainerPartyIndex];
            enemyHpBar = createHPBar(enemy.name, enemy.level, enemy.hp, enemy.maxHp, 130, 8, false);
            loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
            if (hasActiveGame()) getPlayerData().pokedex[enemy.id] = true;
            textBox = createTextBox([t('battle.trainerSentOut', { name: enemy.name })], isRTL());
            phase = 'INTRO';
          }
          break;
        }
        case 'WIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null; xpGained = calculateXpGain(enemy); player.xp += xpGained;
            textBox = createTextBox([t('battle.gainedXP', { name: player.name, xp: xpGained })], isRTL());
            if (isTrainerBattle && trainerData) {
              phase = 'TRAINER_REWARD';
            } else {
              phase = 'XP_GAIN';
            }
          }
          break;
        }
        case 'TRAINER_REWARD': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (checkAndApplyLevelUp(player)) {
              textBox = createTextBox([t('battle.levelUp', { name: player.name, level: player.level })], isRTL());
            }
          }
          if (!textBox) {
            // Award money and set defeat flag
            if (hasActiveGame() && trainerData) {
              const pd = getPlayerData();
              pd.money += trainerData.reward;
              pd.flags[`trainer-${trainerData.trainerId}-defeated`] = true;
              autoSave();
            }
            textBox = createTextBox([t('battle.trainerReward', { money: trainerData!.reward })], isRTL());
            phase = 'XP_GAIN';
            trainerData = null;
          }
          break;
        }
        case 'XP_GAIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (checkAndApplyLevelUp(player)) { textBox = createTextBox([t('battle.levelUp', { name: player.name, level: player.level })], isRTL()); phase = 'LEVEL_UP'; }
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
        case 'SELECT_ITEM': {
          if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
            phase = 'SELECT_ACTION'; showMainMenu(menu);
          } else if (input.isKeyPressed('ArrowUp') && bagCursor > 0) {
            bagCursor--;
          } else if (input.isKeyPressed('ArrowDown') && bagCursor < bagItems.length - 1) {
            bagCursor++;
          } else if (input.isKeyPressed('Enter') && bagItems.length > 0) {
            useItem(bagItems[bagCursor].id);
          }
          break;
        }
        case 'USE_ITEM': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !isHPAnimating(playerHpBar)) enemyTurn();
          break;
        }
      }
    },
    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#78c850');
      if (shake) applyShake(ctx, shake);
      // Battle background
      const bgImg = getBattleBackground();
      ctx.imageSmoothingEnabled = false;
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, 240, 120);
      } else {
        fillRect(ctx, 0, 0, SCREEN_W, 70, '#98d8a8');
        fillRect(ctx, 0, 70, SCREEN_W, 50, '#78c850');
      }
      // Platforms
      fillRect(ctx, 140, 55, 80, 8, '#c8b870'); drawRect(ctx, 140, 55, 80, 8, '#a89850');
      fillRect(ctx, 20, 95, 80, 8, '#c8b870'); drawRect(ctx, 20, 95, 80, 8, '#a89850');
      // Enemy Pokemon sprite (front)
      const enemySprite = getCachedImage(`/sprites/pokemon/front/${enemy.id}.png`);
      if (enemySprite) {
        ctx.drawImage(enemySprite, 157, 8, 48, 48);
      } else {
        fillRect(ctx, 165, 20, 32, 32, '#b0a0a0'); drawRect(ctx, 165, 20, 32, 32, '#888888');
      }
      // Player Pokemon sprite (back)
      const playerSprite = getCachedImage(`/sprites/pokemon/back/${player.id}.png`);
      if (playerSprite) {
        ctx.drawImage(playerSprite, 25, 48, 56, 56);
      } else {
        fillRect(ctx, 35, 60, 40, 36, '#f08030'); drawRect(ctx, 35, 60, 40, 36, '#c06020');
      }
      renderHPBar(ctx, enemyHpBar); renderHPBar(ctx, playerHpBar);
      if (shake) resetShake(ctx, shake);
      renderPopups(ctx);
      if (flash) renderFlash(ctx, flash);
      if (textBox) renderTextBox(ctx, textBox);
      else if (phase === 'SELECT_ACTION' || phase === 'SELECT_MOVE') renderBattleMenu(ctx, menu);
      else if (phase === 'SELECT_ITEM') renderBagMenu(ctx);
      if (fade) renderFade(ctx, fade);
    },
  };

  function renderBagMenu(ctx: CanvasRenderingContext2D): void {
    const MENU_Y = 120;
    const MENU_H = 40;
    fillRect(ctx, 0, MENU_Y, SCREEN_W, MENU_H, '#181820');
    drawRect(ctx, 0, MENU_Y, SCREEN_W, MENU_H, '#585858');

    drawText(ctx, t('battle.menu.bag'), 4, MENU_Y + 2, { size: 8, color: '#f8d030', font: 'monospace' });

    const maxVisible = 2;
    const startIdx = Math.max(0, bagCursor - maxVisible + 1);
    for (let i = 0; i < maxVisible && startIdx + i < bagItems.length; i++) {
      const item = bagItems[startIdx + i];
      const y = MENU_Y + 12 + i * 12;
      const selected = startIdx + i === bagCursor;

      const prefix = selected ? '\u25b6 ' : '  ';
      drawText(ctx, `${prefix}${t(item.def.nameKey)} x${item.qty}`, 8, y, {
        size: 8, color: selected ? '#ffffff' : '#a0a0a0', font: 'monospace',
      });
      drawText(ctx, t(item.def.descriptionKey), SCREEN_W - 8, y, {
        size: 7, color: '#88aa88', font: 'monospace', align: 'right',
      });
    }
  }
}

function fallbackPlayer(): Pokemon {
  return { id: 1, name: 'Bulbasaur', level: 5, hp: 21, maxHp: 21, attack: 9, defense: 9, specialAttack: 11, specialDefense: 11, speed: 9, types: ['grass', 'poison'], moves: [
    { id: 33, name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
    { id: 22, name: 'Vine Whip', type: 'grass', power: 45, accuracy: 100, pp: 25, currentPp: 25, mathDifficulty: 2 },
  ], xp: 0, xpToNext: 500, isGlitched: false };
}

function fallbackEnemy(): Pokemon {
  return { id: 16, name: 'Pidgey', level: 3, hp: 14, maxHp: 14, attack: 7, defense: 7, specialAttack: 6, specialDefense: 6, speed: 8, types: ['normal', 'flying'], moves: [
    { id: 33, name: 'Tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 35, mathDifficulty: 1 },
  ], xp: 0, xpToNext: 300, isGlitched: false };
}
