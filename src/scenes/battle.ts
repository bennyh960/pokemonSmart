/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect } from '../engine/renderer.js';
import { createHPBar, updateHPBar, renderHPBar, setHP, setXP, setDisplayedXP, isHPAnimating, isXPAnimating } from '../ui/hp-bar.js';
import { createBattleMenu, showMainMenu, showMoveMenu, updateBattleMenu, renderBattleMenu, renderPartyBalls } from '../ui/battle-menu.js';
import { BTL } from '../data/battle-constants.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createFlash, updateFlash, renderFlash, createShake, updateShake, applyShake, resetShake,
  createFade, updateFade, renderFade, spawnDamageNumber, updatePopups, renderPopups, clearAllPopups,
  createLevelUpEffect, updateLevelUpEffect, renderLevelUpEffect,
} from '../ui/battle-animations.js';
import { getCombinedTypeEffectiveness, getPokemonDisplayName, getMoveDisplayName, getPokemon, getLocalizedName } from '../services/pokemon-data.js';
import { createPokemonFromData, calculateXpGain, checkAndApplyLevelUp } from '../systems/encounter.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { getBattleBackground } from '../engine/asset-generator.js';
import { t, isRTL, getLocale } from '../i18n/i18n.js';
import { getItem } from '../data/items.js';
import { applyItemEffect, consumeItem } from '../systems/item-effects.js';
import { resolveDialogue, type TrainerReward, type BilingualText } from '../systems/npc.js';
import { setBagMode, pendingItem as bagPendingItem, clearPendingItem } from '../scenes/bag.js';
import { setPartyMode, selectedPartyIndex, clearSelectedPartyIndex } from '../scenes/party.js';

export type BattleContext = 'grass' | 'water' | 'cave' | 'city' | 'gym' | 'elite' | 'route';

type BattlePhase = 'INTRO' | 'SELECT_ACTION' | 'SELECT_MOVE' | 'PLAYER_ATTACK'
  | 'ENEMY_TURN' | 'CHECK_WIN' | 'WIN' | 'XP_GAIN' | 'LEVEL_UP' | 'LEVEL_UP_MOVES' | 'LOSE' | 'RUN'
  | 'USE_ITEM' | 'TRAINER_NEXT_POKEMON' | 'TRAINER_NEXT_XP'
  | 'TRAINER_NEXT_LEVEL_UP' | 'TRAINER_NEXT_LEVEL_UP_MOVES'
  | 'TRAINER_REWARD' | 'TRAINER_REWARD_LEVEL_UP' | 'TRAINER_REWARD_LEVEL_UP_MOVES'
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
  trainerSprite?: string;           // e.g., 'youngster', 'lass'
  postBattleDialogue?: BilingualText[];  // Dialogue shown after defeat
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
  let pendingNewMoves: number[] = [];  // moveIds learned on level-up, shown one by one
  let waitingForBag = false;
  let waitingForParty = false;
  let previousLeadId: number | null = null;
  let isTrainerBattle = false;
  let trainerData: TrainerBattleData | null = null;
  let trainerPartyIndex = 0;
  let battleContext: BattleContext = 'grass';
  let bgImage: HTMLImageElement | null = null;
  let showTrainerSprite = false;  // Show trainer sprite during intro
  let enemyGoesFirst = false;
  let enemyAlreadyAttacked = false;
  let playerStatStages: Record<string, number> = {};
  let turnNumber = 0;

  function useItem(itemId: string): void {
    const pd = getPlayerData();
    const def = getItem(itemId);
    if (!def) return;

    // Stat-boost items: modify temporary battle stages
    if (def.effect.type === 'stat-boost') {
      const stat = def.effect.stat;
      const current = playerStatStages[stat] || 0;
      if (current >= 6) {
        textBox = createTextBox([t('battle.statWontGoHigher')], isRTL());
        phase = 'USE_ITEM'; phaseTimer = 0;
        return;
      }
      playerStatStages[stat] = Math.min(6, current + def.effect.stages);
      consumeItem(pd.items, itemId);
      audio.playSFX('heal');
      textBox = createTextBox([t('battle.usedItem', { item: getLocalizedName(def.name), name: getPokemonDisplayName(player.id) })], isRTL());
      phase = 'USE_ITEM'; phaseTimer = 0;
      return;
    }

    // Capture items (pokeballs)
    if (def.effect.type === 'capture') {
      if (isTrainerBattle) {
        textBox = createTextBox([t('battle.cantCatchTrainer')], isRTL());
        phase = 'USE_ITEM'; phaseTimer = 0;
        return;
      }
      consumeItem(pd.items, itemId);
      const hpFactor = 1 - (enemy.hp / enemy.maxHp) * 0.5;
      if (Math.random() < def.effect.rate * hpFactor * 0.3) {
        enemy.caughtBall = itemId;
        if (pd.party.length < 6) pd.party.push({ ...enemy });
        pd.pokedex[enemy.id] = true;
        autoSave();
        textBox = createTextBox([t('battle.caught', { name: getPokemonDisplayName(enemy.id) })], isRTL());
        audio.playMusic('victory');
        phase = 'RUN';
      } else {
        textBox = createTextBox([t('battle.brokeFreeBall', { name: getPokemonDisplayName(enemy.id) })], isRTL());
        phase = 'USE_ITEM';
      }
      phaseTimer = 0;
      return;
    }

    // All other items: centralized effect system
    const result = applyItemEffect(itemId, player);
    if (result.success) {
      consumeItem(pd.items, itemId);
      setHP(playerHpBar, player.hp);
      audio.playSFX('heal');
    }
    textBox = createTextBox([t('battle.usedItem', { item: getLocalizedName(def.name), name: getPokemonDisplayName(player.id) })], isRTL());
    phase = 'USE_ITEM'; phaseTimer = 0;
  }

  function sendOutNextTrainerPokemon(): void {
    trainerPartyIndex++;
    enemy = trainerData!.party[trainerPartyIndex];
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp,
      BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) getPlayerData().pokedex[enemy.id] = true;
    textBox = createTextBox([t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) })], isRTL());
    phase = 'INTRO';
  }

  function awardTrainerReward(): void {
    const td = trainerData!;
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const reward = td.reward;
      pd.money += reward.money;
      // Award items
      if (reward.items) {
        for (const ri of reward.items) {
          pd.items[ri.itemId] = (pd.items[ri.itemId] || 0) + ri.quantity;
        }
      }
      // Award badge
      if (reward.badge !== undefined && reward.badge >= 1 && reward.badge <= 8) {
        pd.badges |= (1 << (reward.badge - 1));
      }
      // Set story event flag
      if (reward.storyEvent) {
        pd.flags[reward.storyEvent] = true;
      }
      pd.flags[`trainer-${td.trainerId}-defeated`] = true;
      autoSave();
    }

    // Build reward message lines
    const lines: string[] = [t('battle.trainerReward', { money: td.reward.money })];
    if (td.reward.items) {
      for (const ri of td.reward.items) {
        const itemDef = getItem(ri.itemId);
        const itemName = itemDef ? getLocalizedName(itemDef.name) : ri.itemId;
        lines.push(t('battle.trainerRewardItem', { item: itemName, qty: ri.quantity }));
      }
    }
    if (td.reward.badge !== undefined) {
      lines.push(t('battle.trainerRewardBadge', { badge: td.reward.badge }));
    }
    // Append post-battle dialogue if present (resolved to current locale)
    if (td.postBattleDialogue && td.postBattleDialogue.length > 0) {
      lines.push(...resolveDialogue(td.postBattleDialogue, getLocale()));
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
    // V2 layout: opponent bar at (136,12), player bar position computed dynamically
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp,
      BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    playerHpBar = createHPBar(player.id, player.level, player.hp, player.maxHp,
      BTL.PLY_BAR_X, BTL.PLY_BAR_BOTTOM - 18, true, player.xp, player.xpToNext);
    menu = createBattleMenu(player.moves);
    menu.playerPokemon = player;
    menu.party = hasActiveGame() ? getPlayerData().party : [player];
    textBox = null; flash = null; shake = null; levelUpFx = null;
    waitingForBag = false; waitingForParty = false; previousLeadId = null;
    enemyGoesFirst = false; enemyAlreadyAttacked = false; playerStatStages = {};
    turnNumber = 0;
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

  /** Trigger level-up sparkle + jingle. Uses player sprite center for the effect. */
  function triggerLevelUpFx(): void {
    const barX = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2;
    const barY = BTL.PLY_SPRITE.y;
    levelUpFx = createLevelUpEffect(barX, barY);
    audio.playLevelUp();
  }

  function syncPlayerBar(resetDisplayedXp = false): void {
    playerHpBar.level = player.level;
    playerHpBar.maxHp = player.maxHp;
    playerHpBar.currentHp = Math.max(0, Math.min(player.hp, player.maxHp));
    if (playerHpBar.displayHp > playerHpBar.maxHp) {
      playerHpBar.displayHp = playerHpBar.maxHp;
    }
    setXP(playerHpBar, player.xp, player.xpToNext);
    if (resetDisplayedXp) {
      setDisplayedXP(playerHpBar, 0);
    }
    menu.playerPokemon = player;
  }

  function waitForXpResolution(): boolean {
    setXP(playerHpBar, player.xp, player.xpToNext);
    if (player.xp >= player.xpToNext) {
      return playerHpBar.displayXp < playerHpBar.xpToNext - 0.5;
    }
    return isXPAnimating(playerHpBar);
  }

  function startLevelUp(levelPhase: BattlePhase): boolean {
    const result = checkAndApplyLevelUp(player);
    if (!result.leveledUp) return false;

    syncPlayerBar(true);
    triggerLevelUpFx();
    pendingNewMoves = result.newMoves || [];
    textBox = createTextBox([t('battle.levelUp', { name: getPokemonDisplayName(player.id), level: player.level })], isRTL());
    phase = levelPhase;
    return true;
  }

  /** Show the next "learned move" text box from pendingNewMoves. Returns true if a message was shown. */
  function showNextLearnedMove(movesPhase: BattlePhase): boolean {
    if (pendingNewMoves.length === 0) return false;
    const moveId = pendingNewMoves.shift()!;
    const moveName = getMoveDisplayName(moveId);
    const pokeName = getPokemonDisplayName(player.id);
    textBox = createTextBox([`${pokeName} learned ${moveName}!`], isRTL());
    phase = movesPhase;
    return true;
  }

  function doAttack(): void {
    const m = player.moves[selMove];
    if (m.power > 0) {
      const dmg = calcDamage(player, enemy, m.power, m.type);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      setHP(enemyHpBar, enemy.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2, BTL.OPP_SPRITE.y + 10, '#f84038');
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

  function enemyTurn(showFasterMsg = false): void {
    const mi = Math.floor(Math.random() * enemy.moves.length);
    const m = enemy.moves[mi];
    const rtl = isRTL();
    const prefix: string[] = showFasterMsg
      ? [t('battle.enemyFaster', { name: getPokemonDisplayName(enemy.id) })]
      : [];
    if (m.power > 0) {
      const dmg = calcDamage(enemy, player, m.power, m.type);
      player.hp = Math.max(0, player.hp - dmg);
      setHP(playerHpBar, player.hp);
      flash = createFlash('#ffffff', 0.15); shake = createShake(2, 0.25);
      spawnDamageNumber(`-${dmg}`, BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2, BTL.PLY_SPRITE.y + 10, '#f84038');
      audio.playSFX('hit');
      const msgs = [...prefix, t('battle.usedMove', { name: getPokemonDisplayName(enemy.id), move: getMoveDisplayName(m.id) })];
      const et = effText(m.type, player.types);
      if (et) msgs.push(et);
      textBox = createTextBox(msgs, rtl);
    } else {
      textBox = createTextBox([...prefix, t('battle.usedMove', { name: getPokemonDisplayName(enemy.id), move: getMoveDisplayName(m.id) })], rtl);
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
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null; showTrainerSprite = false;
            turnNumber++;
            menu.turnNumber = turnNumber;
            menu.playerPokemon = player;
            if (hasActiveGame()) menu.party = getPlayerData().party;
            phase = 'SELECT_ACTION'; showMainMenu(menu);
          }
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
              else {
                // Speed-based turn order
                enemyGoesFirst = player.speed < enemy.speed ||
                  (player.speed === enemy.speed && Math.random() >= 0.5);
                if (enemyGoesFirst) {
                  enemyTurn(true);
                } else {
                  doAttack();
                }
              }
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
            if (player.hp <= 0) {
              enemyGoesFirst = false;
              textBox = createTextBox([t('battle.fainted', { name: getPokemonDisplayName(player.id) })], isRTL()); phase = 'LOSE';
            } else if (enemyGoesFirst) {
              // Enemy went first, now player attacks with pre-selected move
              enemyGoesFirst = false;
              enemyAlreadyAttacked = true;
              doAttack();
            } else {
              phase = 'SELECT_ACTION'; showMainMenu(menu);
            }
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
          else if (enemyAlreadyAttacked) {
            // Enemy already attacked this turn (speed-based)
            enemyAlreadyAttacked = false;
            phase = 'SELECT_ACTION'; showMainMenu(menu);
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
          if (textBox) {
            if (updateTextBox(textBox, input, dt)) {
              textBox = null;
            } else {
              break;
            }
          }
          if (waitForXpResolution()) break;
          if (!startLevelUp('TRAINER_NEXT_LEVEL_UP')) {
            sendOutNextTrainerPokemon();
          }
          break;
        }
        case 'TRAINER_NEXT_LEVEL_UP': {
          // Shows level-up text, then shows learned moves or sends next Pokemon
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (!showNextLearnedMove('TRAINER_NEXT_LEVEL_UP_MOVES')) {
              if (player.xp > 0) {
                phase = 'TRAINER_NEXT_XP';
              } else {
                sendOutNextTrainerPokemon();
              }
            }
          }
          break;
        }
        case 'TRAINER_NEXT_LEVEL_UP_MOVES': {
          // Shows "learned move" text one by one, then sends next Pokemon
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (!showNextLearnedMove('TRAINER_NEXT_LEVEL_UP_MOVES')) {
              if (player.xp > 0) {
                phase = 'TRAINER_NEXT_XP';
              } else {
                sendOutNextTrainerPokemon();
              }
            }
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
          if (textBox) {
            if (updateTextBox(textBox, input, dt)) {
              textBox = null;
            } else {
              break;
            }
          }
          if (waitForXpResolution()) break;
          if (!startLevelUp('TRAINER_REWARD_LEVEL_UP')) {
            awardTrainerReward();
          }
          break;
        }
        case 'TRAINER_REWARD_LEVEL_UP': {
          // Shows level-up text, then shows learned moves or awards trainer reward
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (!showNextLearnedMove('TRAINER_REWARD_LEVEL_UP_MOVES')) {
              if (player.xp > 0) {
                phase = 'TRAINER_REWARD';
              } else {
                awardTrainerReward();
              }
            }
          }
          break;
        }
        case 'TRAINER_REWARD_LEVEL_UP_MOVES': {
          // Shows "learned move" text one by one, then awards trainer reward
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (!showNextLearnedMove('TRAINER_REWARD_LEVEL_UP_MOVES')) {
              if (player.xp > 0) {
                phase = 'TRAINER_REWARD';
              } else {
                awardTrainerReward();
              }
            }
          }
          break;
        }
        case 'XP_GAIN': {
          if (textBox) {
            if (updateTextBox(textBox, input, dt)) {
              textBox = null;
            } else {
              break;
            }
          }
          if (waitForXpResolution()) break;
          if (!startLevelUp('LEVEL_UP')) {
            fade = createFade(false, 0.5); phase = 'RUN';
          }
          break;
        }
        case 'LEVEL_UP': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (!showNextLearnedMove('LEVEL_UP_MOVES')) {
              if (player.xp > 0) {
                phase = 'XP_GAIN';
              } else {
                fade = createFade(false, 0.5); phase = 'RUN';
              }
            }
          }
          break;
        }
        case 'LEVEL_UP_MOVES': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (!showNextLearnedMove('LEVEL_UP_MOVES')) {
              if (player.xp > 0) {
                phase = 'XP_GAIN';
              } else {
                fade = createFade(false, 0.5); phase = 'RUN';
              }
            }
          }
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
              playerHpBar = createHPBar(player.id, player.level, player.hp, player.maxHp,
                BTL.PLY_BAR_X, BTL.PLY_BAR_BOTTOM - 18, true, player.xp, player.xpToNext);
              menu = createBattleMenu(player.moves);
              menu.playerPokemon = player;
              menu.party = hasActiveGame() ? getPlayerData().party : [player];
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
      clearScreen(ctx, BTL.COLORS.bg);
      if (shake) applyShake(ctx, shake);
      ctx.imageSmoothingEnabled = false;

      // ── Battle field background (y=0..83) ──
      if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, 0, 0, 240, BTL.FIELD_H);
      } else {
        const bgImg = getBattleBackground();
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, 240, BTL.FIELD_H);
        } else {
          // Fallback v2 gradient
          const BG = BTL.BG;
          // Sky gradient
          const skyGrad = ctx.createLinearGradient(0, BG.SKY.y, 0, BG.SKY.y + BG.SKY.h);
          skyGrad.addColorStop(0, BG.SKY.from);
          skyGrad.addColorStop(0.5, BG.SKY.mid);
          skyGrad.addColorStop(1, BG.SKY.to);
          ctx.fillStyle = skyGrad;
          ctx.fillRect(BG.SKY.x, BG.SKY.y, BG.SKY.w, BG.SKY.h);
          // Ground gradient
          const gndGrad = ctx.createLinearGradient(0, BG.GROUND.y, 0, BG.GROUND.y + BG.GROUND.h);
          gndGrad.addColorStop(0, BG.GROUND.from);
          gndGrad.addColorStop(0.4, BG.GROUND.mid1);
          gndGrad.addColorStop(0.7, BG.GROUND.mid2);
          gndGrad.addColorStop(1, BG.GROUND.to);
          ctx.fillStyle = gndGrad;
          ctx.fillRect(BG.GROUND.x, BG.GROUND.y, BG.GROUND.w, BG.GROUND.h);
          // Subtle ground lines
          for (const line of BG.LINES) {
            fillRect(ctx, 0, line.y, 240, 1, `rgba(100,80,50,${line.alpha})`);
          }
        }
      }

     

      // ── Trainer sprites on sides (trainer battles) ──
      const showingTrainer = showTrainerSprite && isTrainerBattle && trainerData?.trainerSprite;
      if (isTrainerBattle && trainerData?.trainerSprite) {
        const tImg = getCachedImage(`/sprites/trainers/${trainerData.trainerSprite}.png`);
        if (tImg) {
          if (showingTrainer) {
            ctx.drawImage(tImg, BTL.OPP_SPRITE.x, 4, 48, 68);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.drawImage(tImg, 222, 28, 16, 32);
            ctx.restore();
          }
        }
      }

      // ── Enemy Pokemon sprite (right side) ──
      if (!showingTrainer) {
        const enemySprite = getCachedImage(`/sprites/pokemon/front/${enemy.id}.png`);
        if (enemySprite) {
          ctx.drawImage(enemySprite, BTL.OPP_SPRITE.x, BTL.OPP_SPRITE.y,
            BTL.OPP_SPRITE.w, BTL.OPP_SPRITE.h);
        }
      }

      // ── Player Pokemon sprite (left side) ──
      const playerSprite = getCachedImage(`/sprites/pokemon/back/${player.id}.png`);
      if (playerSprite) {
        ctx.drawImage(playerSprite, BTL.PLY_SPRITE.x, BTL.PLY_SPRITE.y,
          BTL.PLY_SPRITE.w, BTL.PLY_SPRITE.h);
      }

      // ── Info panels ──
      setXP(playerHpBar, player.xp, player.xpToNext);
      renderHPBar(ctx, enemyHpBar);
      renderHPBar(ctx, playerHpBar);

      // ── Party ball indicators (y=79) ──
      if (hasActiveGame()) {
        renderPartyBalls(ctx, 'player', getPlayerData().party, 6);
      }
      if (isTrainerBattle && trainerData) {
        renderPartyBalls(ctx, 'opponent', trainerData.party, trainerData.party.length, trainerPartyIndex);
      }

      // ── Effects ──
      if (levelUpFx) renderLevelUpEffect(ctx, levelUpFx);
      if (shake) resetShake(ctx, shake);
      renderPopups(ctx);
      if (flash) renderFlash(ctx, flash);

      // ── Menu / text area ──
      if (textBox) {
        // Fill lower area background before text box
        fillRect(ctx, 0, BTL.DIVIDER_Y, 240, 160 - BTL.DIVIDER_Y, BTL.COLORS.bg);
        fillRect(ctx, 0, BTL.DIVIDER_Y, 240, 1, BTL.COLORS.divider);
        renderTextBox(ctx, textBox);
      } else if (phase === 'SELECT_ACTION' || phase === 'SELECT_MOVE') {
        renderBattleMenu(ctx, menu);
      }
      if (fade) renderFade(ctx, fade);
    },
  };

}

function fallbackPlayer(): Pokemon {
  const data = getPokemon(1); // Bulbasaur
  return data ? createPokemonFromData(data, 5) : createPokemonFromData(getPokemon(1)!, 5);
}

function fallbackEnemy(): Pokemon {
  const data = getPokemon(16); // Pidgey
  return data ? createPokemonFromData(data, 3) : createPokemonFromData(getPokemon(16)!, 3);
}
