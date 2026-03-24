/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect } from '../engine/renderer.js';
import { createHPBar, updateHPBar, renderHPBar, setHP, setXP, isHPAnimating } from '../ui/hp-bar.js';
import { createBattleMenu, showMainMenu, showMoveMenu, updateBattleMenu, renderBattleMenu } from '../ui/battle-menu.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createFlash, updateFlash, renderFlash, createShake, updateShake, applyShake, resetShake,
  createFade, updateFade, renderFade, spawnDamageNumber, updatePopups, renderPopups, clearAllPopups,
  createLevelUpEffect, updateLevelUpEffect, renderLevelUpEffect,
} from '../ui/battle-animations.js';
import { getCombinedTypeEffectiveness, getPokemonDisplayName, getMoveDisplayName } from '../services/pokemon-data.js';
import { calculateXpGain, checkAndApplyLevelUp } from '../systems/encounter.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { getBattleBackground } from '../engine/asset-generator.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getItem } from '../data/items.js';
import type { TrainerReward } from '../systems/npc.js';
import { setBagMode, pendingItem as bagPendingItem, clearPendingItem } from '../scenes/bag.js';
import { setPartyMode, selectedPartyIndex, clearSelectedPartyIndex } from '../scenes/party.js';

export type BattleContext = 'grass' | 'water' | 'cave' | 'city' | 'gym' | 'elite' | 'route';

type BattlePhase = 'INTRO' | 'SELECT_ACTION' | 'SELECT_MOVE' | 'PLAYER_ATTACK'
  | 'ENEMY_TURN' | 'CHECK_WIN' | 'WIN' | 'XP_GAIN' | 'LEVEL_UP' | 'LOSE' | 'RUN'
  | 'USE_ITEM' | 'TRAINER_NEXT_POKEMON' | 'TRAINER_NEXT_XP'
  | 'TRAINER_NEXT_LEVEL_UP' | 'TRAINER_REWARD' | 'TRAINER_REWARD_LEVEL_UP'
  | 'WAITING_BAG' | 'WAITING_PARTY' | 'SWITCH_POKEMON';

let pendingPlayer: Pokemon | null = null;
let pendingEnemy: Pokemon | null = null;
let pendingTrainerBattle: TrainerBattleData | null = null;
let pendingBattleContext: BattleContext = 'grass';

export interface TrainerBattleData {
  trainerName: string;
  trainerId: string;
  party: Pokemon[];
  reward: TrainerReward;
  trainerSprite?: string;  // e.g., 'youngster', 'lass'
}

export function setBattleData(playerPokemon: Pokemon, enemyPokemon: Pokemon, context: BattleContext = 'grass'): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = enemyPokemon;
  pendingTrainerBattle = null;
  pendingBattleContext = context;
}

export function setTrainerBattleData(playerPokemon: Pokemon, trainerData: TrainerBattleData, context: BattleContext = 'grass'): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = trainerData.party[0];
  pendingTrainerBattle = trainerData;
  pendingBattleContext = context;
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
  let levelUpFx: ReturnType<typeof createLevelUpEffect> | null = null;
  let waitingForBag = false;
  let waitingForParty = false;
  let previousLeadId: number | null = null;
  let isTrainerBattle = false;
  let trainerData: TrainerBattleData | null = null;
  let trainerPartyIndex = 0;
  let battleContext: BattleContext = 'grass';
  let bgImage: HTMLImageElement | null = null;
  let showTrainerSprite = false;  // Show trainer sprite during intro

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
    textBox = createTextBox([t('battle.usedItem', { item: t(def.nameKey), name: getPokemonDisplayName(player.id) })], isRTL());
    phase = 'USE_ITEM';
    phaseTimer = 0;
  }

  function sendOutNextTrainerPokemon(): void {
    trainerPartyIndex++;
    enemy = trainerData!.party[trainerPartyIndex];
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, 148, 2, false);
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) getPlayerData().pokedex[enemy.id] = true;
    textBox = createTextBox([t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) })], isRTL());
    phase = 'INTRO';
  }

  function awardTrainerReward(): void {
    if (hasActiveGame() && trainerData) {
      const pd = getPlayerData();
      const reward = trainerData.reward;
      pd.money += reward.money;
      // Award items if any
      if (reward.items) {
        for (const ri of reward.items) {
          pd.items[ri.itemId] = (pd.items[ri.itemId] || 0) + ri.quantity;
        }
      }
      pd.flags[`trainer-${trainerData.trainerId}-defeated`] = true;
      autoSave();
    }
    const lines: string[] = [t('battle.trainerReward', { money: trainerData!.reward.money })];
    // Show item rewards
    if (trainerData!.reward.items) {
      for (const ri of trainerData!.reward.items) {
        const itemDef = getItem(ri.itemId);
        const itemName = itemDef ? t(itemDef.nameKey) : ri.itemId;
        lines.push(t('battle.trainerRewardItem', { item: itemName, qty: ri.quantity }));
      }
    }
    textBox = createTextBox(lines, isRTL());
    phase = 'XP_GAIN';
    trainerData = null;
  }

  function init(): void {
    isTrainerBattle = false;
    trainerData = null;
    trainerPartyIndex = 0;
    showTrainerSprite = false;

    if (pendingTrainerBattle) {
      isTrainerBattle = true;
      trainerData = pendingTrainerBattle;
      trainerPartyIndex = 0;
      showTrainerSprite = true;  // Show trainer sprite during initial intro
      pendingTrainerBattle = null;
      // Preload trainer sprite if available
      if (trainerData.trainerSprite) {
        loadImage(`/sprites/trainers/${trainerData.trainerSprite}.png`).catch(() => {});
      }
    }

    if (pendingPlayer && pendingEnemy) {
      player = pendingPlayer; enemy = pendingEnemy;
      pendingPlayer = null; pendingEnemy = null;
    } else {
      player = (hasActiveGame() && getPlayerData().party[0]) || fallbackPlayer();
      enemy = fallbackEnemy();
    }
    battleContext = pendingBattleContext;
    pendingBattleContext = 'grass';
    // Panels above each Pokemon — enemy right, player left
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, 148, 2, false);
    playerHpBar = createHPBar(player.id, player.level, player.hp, player.maxHp, 4, 32, true, player.xp, player.xpToNext);
    menu = createBattleMenu(player.moves);
    textBox = null; flash = null; shake = null; levelUpFx = null;
    waitingForBag = false; waitingForParty = false; previousLeadId = null;
    fade = createFade(true, 0.5); clearAllPopups();
    phase = 'INTRO'; phaseTimer = 0; xpGained = 0;
    // Preload Pokemon sprites
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
    // Try to load context-specific background image
    bgImage = null;
    loadImage(`/sprites/backgrounds/bg-${battleContext}.jpg`).then(img => {
      bgImage = img;
    }).catch(() => { bgImage = null; });
  }

  /** Trigger level-up sparkle + jingle. XP bar origin: x=4+3+18+2=27, y varies by panel. */
  function triggerLevelUpFx(): void {
    const barX = playerHpBar.x + 3 + 18 + 2; // PAD + PCT_W + PCT_GAP
    const barY = playerHpBar.y + 16; // approximate XP bar Y within panel
    levelUpFx = createLevelUpEffect(barX, barY);
    audio.playLevelUp();
  }

  function doAttack(): void {
    const m = player.moves[selMove];
    if (m.power > 0) {
      const dmg = calcDamage(player, enemy, m.power, m.type);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      setHP(enemyHpBar, enemy.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, 190, 42, '#f84038');
      audio.playSFX('hit');
      const rtl = isRTL();
      const msgs = [t('battle.usedMove', { name: getPokemonDisplayName(player.id), move: getMoveDisplayName(m.id) })];
      const et = effText(m.type, enemy.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs, rtl);
    } else {
      textBox = createTextBox([t('battle.usedMove', { name: getPokemonDisplayName(player.id), move: getMoveDisplayName(m.id) }), t('battle.nothingHappened')], isRTL());
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
      spawnDamageNumber(`-${dmg}`, 46, 80, '#f84038');
      audio.playSFX('hit');
      const msgs = [t('battle.usedMove', { name: getPokemonDisplayName(enemy.id), move: getMoveDisplayName(m.id) })];
      const et = effText(m.type, player.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs, rtl);
    } else {
      textBox = createTextBox([t('battle.usedMove', { name: getPokemonDisplayName(enemy.id), move: getMoveDisplayName(m.id) })], rtl);
    }
    phase = 'ENEMY_TURN'; phaseTimer = 0;
  }

  function goBack(): void { autoSave(); stateMachine.change('OVERWORLD'); }

  function handleLoss(): void {
    if (hasActiveGame()) {
      const pd = getPlayerData();
      // Heal entire party
      for (const p of pd.party) { p.hp = p.maxHp; for (const mv of p.moves) mv.currentPp = mv.pp; }
      // Lose half money
      pd.money = Math.floor(pd.money / 2);
      // Teleport to last visited Pokemon Center
      const center = pd.lastPokemonCenter;
      pd.position.mapId = center.mapId;
      pd.position.x = center.x;
      pd.position.y = center.y;
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
          t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) }),
        ], isRTL());
      } else {
        textBox = createTextBox([t('battle.wildAppeared', { name: getPokemonDisplayName(enemy.id) })], isRTL());
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
      if (levelUpFx) updateLevelUpEffect(levelUpFx, dt);
      updateHPBar(playerHpBar, dt); updateHPBar(enemyHpBar, dt); updatePopups(dt);

      switch (phase) {
        case 'INTRO': {
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; showTrainerSprite = false; phase = 'SELECT_ACTION'; showMainMenu(menu); }
          break;
        }
        case 'SELECT_ACTION': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'main') {
            audio.playSFX('menu-select');
            if (r.choice === 'FIGHT') { phase = 'SELECT_MOVE'; showMoveMenu(menu); }
            else if (r.choice === 'BAG') {
              setBagMode('battle');
              clearPendingItem();
              waitingForBag = true;
              phase = 'WAITING_BAG';
              stateMachine.push('BAG');
            }
            else if (r.choice === 'POKEMON') {
              // Check if there are other alive Pokemon to switch to
              if (hasActiveGame()) {
                const pd = getPlayerData();
                const hasOther = pd.party.some((p, i) => i !== 0 && p.hp > 0);
                if (!hasOther) {
                  textBox = createTextBox([t('battle.noOtherPokemon')], isRTL()); phase = 'INTRO';
                } else {
                  setPartyMode('battle');
                  clearSelectedPartyIndex();
                  previousLeadId = player.id;
                  waitingForParty = true;
                  phase = 'WAITING_PARTY';
                  stateMachine.push('PARTY');
                }
              } else {
                textBox = createTextBox([t('battle.cantDoThat')], isRTL()); phase = 'INTRO';
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
            if (player.hp <= 0) { textBox = createTextBox([t('battle.fainted', { name: getPokemonDisplayName(player.id) })], isRTL()); phase = 'LOSE'; }
            else { phase = 'SELECT_ACTION'; showMainMenu(menu); }
          }
          break;
        }
        case 'CHECK_WIN': {
          if (enemy.hp <= 0) {
            if (isTrainerBattle && trainerData && trainerPartyIndex + 1 < trainerData.party.length) {
              // Trainer has more Pokemon
              textBox = createTextBox([t('battle.fainted', { name: getPokemonDisplayName(enemy.id) })], isRTL());
              phase = 'TRAINER_NEXT_POKEMON';
            } else {
              // Wild win or trainer's last Pokemon fainted
              const msgs = [t('battle.fainted', { name: getPokemonDisplayName(enemy.id) }), t('battle.youWon')];
              textBox = createTextBox(msgs, isRTL());
              audio.playMusic('victory');
              phase = 'WIN';
            }
          }
          else enemyTurn();
          break;
        }
        case 'TRAINER_NEXT_POKEMON': {
          // Shows "fainted" text, then transitions to XP phase
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            xpGained = calculateXpGain(enemy);
            player.xp += xpGained;
            textBox = createTextBox([t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: xpGained })], isRTL());
            phase = 'TRAINER_NEXT_XP';
          }
          break;
        }
        case 'TRAINER_NEXT_XP': {
          // Shows XP gained text, then checks for level up or sends next Pokemon
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (checkAndApplyLevelUp(player)) {
              triggerLevelUpFx();
              textBox = createTextBox([t('battle.levelUp', { name: getPokemonDisplayName(player.id), level: player.level })], isRTL());
              phase = 'TRAINER_NEXT_LEVEL_UP';
            } else {
              sendOutNextTrainerPokemon();
            }
          }
          break;
        }
        case 'TRAINER_NEXT_LEVEL_UP': {
          // Shows level-up text, then sends out next Pokemon
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            sendOutNextTrainerPokemon();
          }
          break;
        }
        case 'WIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null; xpGained = calculateXpGain(enemy); player.xp += xpGained;
            textBox = createTextBox([t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: xpGained })], isRTL());
            if (isTrainerBattle && trainerData) {
              phase = 'TRAINER_REWARD';
            } else {
              phase = 'XP_GAIN';
            }
          }
          break;
        }
        case 'TRAINER_REWARD': {
          // Shows XP gained text (from WIN phase), then checks level up
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (checkAndApplyLevelUp(player)) {
              triggerLevelUpFx();
              textBox = createTextBox([t('battle.levelUp', { name: getPokemonDisplayName(player.id), level: player.level })], isRTL());
              phase = 'TRAINER_REWARD_LEVEL_UP';
            } else {
              awardTrainerReward();
            }
          }
          break;
        }
        case 'TRAINER_REWARD_LEVEL_UP': {
          // Shows level-up text, then awards trainer reward
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            awardTrainerReward();
          }
          break;
        }
        case 'XP_GAIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (checkAndApplyLevelUp(player)) { triggerLevelUpFx(); textBox = createTextBox([t('battle.levelUp', { name: getPokemonDisplayName(player.id), level: player.level })], isRTL()); phase = 'LEVEL_UP'; }
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
        case 'WAITING_BAG': {
          // Battle is in this phase while the BAG scene is pushed on top.
          // Once the BAG scene pops, the battle scene's update() runs again.
          if (!waitingForBag) break;
          waitingForBag = false;
          if (bagPendingItem) {
            // An item was selected in the bag
            const itemDef = bagPendingItem;
            clearPendingItem();
            if (itemDef.itemId) {
              useItem(itemDef.itemId);
            } else {
              phase = 'SELECT_ACTION'; showMainMenu(menu);
            }
          } else {
            // No item selected (user pressed Esc in bag)
            phase = 'SELECT_ACTION'; showMainMenu(menu);
          }
          break;
        }
        case 'WAITING_PARTY': {
          // Battle is in this phase while the PARTY scene is pushed on top.
          if (!waitingForParty) break;
          waitingForParty = false;
          if (selectedPartyIndex >= 0 && hasActiveGame()) {
            const pd = getPlayerData();
            const chosenIndex = selectedPartyIndex;
            const chosen = pd.party[chosenIndex];
            clearSelectedPartyIndex();
            // Validate the switch
            if (!chosen || chosen.hp <= 0) {
              textBox = createTextBox([t('battle.pokemonFainted')], isRTL()); phase = 'INTRO';
            } else if (chosen.id === previousLeadId) {
              textBox = createTextBox([t('battle.alreadyActive')], isRTL()); phase = 'INTRO';
            } else {
              // Perform the switch: swap chosen Pokemon to front of party
              if (chosenIndex !== 0) {
                const temp = pd.party[0];
                pd.party[0] = pd.party[chosenIndex];
                pd.party[chosenIndex] = temp;
              }
              // Update player reference
              player = pd.party[0];
              playerHpBar = createHPBar(player.id, player.level, player.hp, player.maxHp, 4, 32, true, player.xp, player.xpToNext);
              menu = createBattleMenu(player.moves);
              loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
              textBox = createTextBox([
                t('battle.comeBack', { name: getPokemonDisplayName(previousLeadId!) }),
                t('battle.goName', { name: getPokemonDisplayName(player.id) }),
              ], isRTL());
              phase = 'SWITCH_POKEMON';
            }
          } else {
            clearSelectedPartyIndex();
            // No selection (user pressed Esc in party)
            phase = 'SELECT_ACTION'; showMainMenu(menu);
          }
          previousLeadId = null;
          break;
        }
        case 'SWITCH_POKEMON': {
          // Show the switch text, then enemy gets a turn
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            enemyTurn();
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
      clearScreen(ctx, '#1a1a2e');
      if (shake) applyShake(ctx, shake);
      ctx.imageSmoothingEnabled = false;

      // ── Background (fills battle area 0-120) ──
      if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, 0, 0, 240, 120);
      } else {
        const bgImg = getBattleBackground();
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, 240, 120);
        } else {
          fillRect(ctx, 0, 0, 240, 50, '#88c8e8');
          fillRect(ctx, 0, 50, 240, 10, '#70b8d8');
          fillRect(ctx, 0, 60, 240, 30, '#68b848');
          fillRect(ctx, 0, 90, 240, 30, '#58a838');
        }
      }

      // ── Trainer sprites on sides (trainer battles) ──
      const showingTrainer = showTrainerSprite && isTrainerBattle && trainerData?.trainerSprite;
      if (isTrainerBattle && trainerData?.trainerSprite) {
        const tImg = getCachedImage(`/sprites/trainers/${trainerData.trainerSprite}.png`);
        if (tImg) {
          if (showingTrainer) {
            ctx.drawImage(tImg, 160, 4, 48, 68);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.drawImage(tImg, 222, 28, 16, 32);
            ctx.restore();
          }
        }
      }

      // ── Enemy Pokemon sprite (right side, tighter to panel) ──
      if (!showingTrainer) {
        const enemySprite = getCachedImage(`/sprites/pokemon/front/${enemy.id}.png`);
        if (enemySprite) {
          ctx.drawImage(enemySprite, 164, 18, 54, 54);
        }
      }

      // ── Player Pokemon sprite (left side, tighter to panel) ──
      const playerSprite = getCachedImage(`/sprites/pokemon/back/${player.id}.png`);
      if (playerSprite) {
        ctx.drawImage(playerSprite, 16, 54, 62, 62);
      }

      // ── Floating info — no panels, just text + bars above each Pokemon ──
      setXP(playerHpBar, player.xp, player.xpToNext);
      renderHPBar(ctx, enemyHpBar);   // above enemy sprite
      renderHPBar(ctx, playerHpBar);   // above player sprite

      // ── Party indicators ──
      renderPartyIndicators(ctx);

      if (levelUpFx) renderLevelUpEffect(ctx, levelUpFx);
      if (shake) resetShake(ctx, shake);
      renderPopups(ctx);
      if (flash) renderFlash(ctx, flash);

      // ── Menu / text area (Y=120-160) ──
      if (textBox) renderTextBox(ctx, textBox);
      else if (phase === 'SELECT_ACTION' || phase === 'SELECT_MOVE') renderBattleMenu(ctx, menu);
      if (fade) renderFade(ctx, fade);
    },
  };

  /** Render party Pokeball indicators near info text. */
  function renderPartyIndicators(ctx: CanvasRenderingContext2D): void {
    const DOT_R = 2;   // radius
    const GAP = 5;      // center-to-center spacing
    const ALIVE = '#f83838';
    const FAINTED = '#484848';
    const UNKNOWN = '#606060'; // unrevealed in trainer battles

    // Player party — below player panel
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const startX = 6;
      const dotY = 54;
      for (let i = 0; i < Math.min(pd.party.length, 6); i++) {
        const alive = pd.party[i].hp > 0;
        const cx = startX + i * GAP + DOT_R;
        // Pokeball-style: top half colored, bottom half white/dark
        ctx.beginPath();
        ctx.arc(cx, dotY, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = alive ? ALIVE : FAINTED;
        ctx.fill();
        // Tiny center dot
        ctx.beginPath();
        ctx.arc(cx, dotY, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // Enemy party — below enemy info panel (trainer battles only)
    if (isTrainerBattle && trainerData) {
      const startX = 150;
      const dotY = 18;
      for (let i = 0; i < Math.min(trainerData.party.length, 6); i++) {
        const pkmn = trainerData.party[i];
        const cx = startX + i * GAP + DOT_R;
        // Revealed if it's been sent out (index <= trainerPartyIndex)
        const revealed = i <= trainerPartyIndex;
        const alive = pkmn.hp > 0;
        let color: string;
        if (!revealed) color = UNKNOWN;
        else if (alive) color = ALIVE;
        else color = FAINTED;
        ctx.beginPath();
        ctx.arc(cx, dotY, DOT_R, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, dotY, 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
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
