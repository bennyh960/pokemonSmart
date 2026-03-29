/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { BattleStatId } from '../types/battle-metadata.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect } from '../engine/renderer.js';
import { createHPBar, updateHPBar, renderHPBar, setHP, setXP, setDisplayedXP, setStatus, isHPAnimating, isXPAnimating } from '../ui/hp-bar.js';
import { createBattleMenu, showMainMenu, showMoveMenu, updateBattleMenu, renderBattleMenu } from '../ui/battle-menu.js';
import type { MainMenuChoice } from '../ui/battle-menu.js';
import { resolveBattleBackgroundPath, type BattleBackgroundId } from '../data/battle-backgrounds.js';
import { BTL } from '../data/battle-constants.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createFlash, updateFlash, renderFlash, createShake, updateShake, applyShake, resetShake,
  createFade, updateFade, renderFade, spawnDamageNumber, updatePopups, renderPopups, clearAllPopups,
  createLevelUpEffect, updateLevelUpEffect, renderLevelUpEffect,
  createCaptureSuccessEffect, updateCaptureSuccessEffect, renderCaptureSuccessEffect,
  createSendOutEffect, updateSendOutEffect, renderSendOutEffect,
  createAttackEffect, updateAttackEffect, renderAttackEffect,
  createStatusTurnEffect, updateStatusTurnEffect, renderStatusTurnEffect,
} from '../ui/battle-animations.js';
import {
  createBattleAnimationDirector,
  callStep,
  parallelStep,
  sequenceStep,
  tweenActorStep,
  waitStep,
} from '../ui/battle-animation-director.js';
import { drawPokeballIcon } from '../ui/item-icons.js';
import {
  getCombinedTypeEffectiveness,
  getAbilityBattleEffects,
  getMoveBattleData,
  getPokemonCatchRate,
  getPokemonDisplayName,
  getMoveDisplayName,
  getMove,
  getPokemon,
  getLocalizedName,
  type EvolutionStep,
} from '../services/pokemon-data.js';
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
import { setEvolutionData } from './evolution.js';
import { getAttackAnimationProfile } from '../systems/move-animation.js';
import {
  createMoveLearningSession,
  getMoveLearningAnnouncementLines,
  getMoveLearningResolutionMessage,
  setMoveLearningSession,
  type LevelUpMoveResult,
  type MoveLearningResolution,
} from '../systems/move-learning.js';
import { calculateCaptureChance } from '../systems/capture.js';
import type { BattlePokemonRuntimeState } from '../systems/battle-state.js';
import {
  applyEndOfTurnStatusEffects,
  applyStatChanges,
  applyMajorStatus,
  chooseEnemyMoveIndex,
  createBattleRuntimeStateForPokemon,
  determineTurnOrder,
  doesMoveHit,
  getDisplayedStatChanges,
  getModifiedStatValue,
  processStartOfTurnStatus,
  rollCriticalHit,
} from '../systems/battle-system.js';

export type BattleContext = 'grass' | 'water' | 'cave' | 'city' | 'gym' | 'elite' | 'route';
type LossOutcome = 'wild-whiteout' | 'trainer-whiteout' | 'trainer-roster';

type BattlePhase = 'INTRO' | 'SELECT_ACTION' | 'SELECT_MOVE' | 'PLAYER_ATTACK'
  | 'ENEMY_TURN' | 'CHECK_WIN' | 'WIN' | 'XP_GAIN' | 'LEVEL_UP' | 'LEVEL_UP_MOVES' | 'LOSE' | 'RUN'
  | 'USE_ITEM' | 'TRAINER_NEXT_POKEMON' | 'TRAINER_NEXT_XP'
  | 'TRAINER_NEXT_LEVEL_UP' | 'TRAINER_NEXT_LEVEL_UP_MOVES'
  | 'TRAINER_REWARD' | 'TRAINER_REWARD_LEVEL_UP' | 'TRAINER_REWARD_LEVEL_UP_MOVES'
  | 'WAITING_BAG' | 'WAITING_PARTY' | 'WAITING_MOVE_LEARN' | 'SWITCH_POKEMON' | 'CAPTURE_ANIM'
  | 'PLAYER_FAINT_SWITCH' | 'TRAINER_LOSS' | 'END_TURN_STATUS';

let pendingPlayer: Pokemon | null = null;
let pendingEnemy: Pokemon | null = null;
let pendingTrainerBattle: TrainerBattleData | null = null;
let pendingBattleContext: BattleContext = 'grass';
let pendingBattleBackground: BattleBackgroundId | null = null;

export interface TrainerBattleData {
  trainerName: string;
  trainerId: string;
  party: Pokemon[];
  reward: TrainerReward;
  trainerSprite?: string;           // e.g., 'youngster', 'lass'
  postBattleDialogue?: BilingualText[];  // Dialogue shown after defeat
}

export function setBattleData(
  playerPokemon: Pokemon,
  enemyPokemon: Pokemon,
  context: BattleContext = 'grass',
  battleBackground: BattleBackgroundId | null = null,
): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = enemyPokemon;
  pendingTrainerBattle = null;
  pendingBattleContext = context;
  pendingBattleBackground = battleBackground;
}

export function setTrainerBattleData(
  playerPokemon: Pokemon,
  trainerData: TrainerBattleData,
  context: BattleContext = 'grass',
  battleBackground: BattleBackgroundId | null = null,
): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = trainerData.party[0];
  pendingTrainerBattle = trainerData;
  pendingBattleContext = context;
  pendingBattleBackground = battleBackground;
}

function calcDamage(
  atk: Pokemon,
  atkState: BattlePokemonRuntimeState,
  def: Pokemon,
  defState: BattlePokemonRuntimeState,
  power: number,
  moveType: PokemonType,
  damageClass: string,
  criticalHit = false,
): number {
  if (power <= 0) return 0;
  const isSpecial = damageClass === 'special';
  const burnMultiplier = damageClass === 'physical' && atk.status === 'burn' ? 0.5 : 1;
  const attackStat = getModifiedStatValue(atk, atkState, isSpecial ? 'specialAttack' : 'attack');
  const defenseStat = getModifiedStatValue(def, defState, isSpecial ? 'specialDefense' : 'defense');
  let defenderMultiplier = 1;
  if (def.abilityId) {
    for (const effect of getAbilityBattleEffects(def.abilityId)) {
      if (effect.kind === 'damageTakenMultiplier' && effect.moveTypes.includes(moveType)) {
        defenderMultiplier *= effect.multiplier;
      }
    }
  }
  const lf = ((2 * atk.level) / 5) + 2;
  const base = ((lf * power * ((attackStat * burnMultiplier) / defenseStat)) / 50) + 2;
  const eff = getCombinedTypeEffectiveness(moveType, def.types);
  const stab = atk.types.includes(moveType) ? 1.5 : 1;
  const critMultiplier = criticalHit ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  return Math.max(1, Math.floor(base * eff * stab * critMultiplier * defenderMultiplier * rand));
}

function effText(mt: PokemonType, dt: PokemonType[]): string | null {
  const e = getCombinedTypeEffectiveness(mt, dt);
  if (e >= 2) return t('battle.superEffective');
  if (e > 0 && e < 1) return t('battle.notVeryEffective');
  if (e === 0) return t('battle.noEffect');
  return null;
}

function getStatusAppliedLine(name: string, status: Pokemon['status']): string | null {
  switch (status) {
    case 'poison':
      return t('battle.statusPoison', { name });
    case 'burn':
      return t('battle.statusBurn', { name });
    case 'paralyze':
      return t('battle.statusParalyze', { name });
    case 'sleep':
      return t('battle.statusSleep', { name });
    case 'freeze':
      return t('battle.statusFreeze', { name });
    default:
      return null;
  }
}

function getTurnStatusLine(name: string, event: ReturnType<typeof processStartOfTurnStatus>['event']): string | null {
  switch (event) {
    case 'woke-up':
      return t('battle.wokeUp', { name });
    case 'fast-asleep':
      return t('battle.fastAsleep', { name });
    case 'thawed-out':
      return t('battle.thawedOut', { name });
    case 'frozen-solid':
      return t('battle.frozenSolid', { name });
    case 'fully-paralyzed':
      return t('battle.fullyParalyzed', { name });
    default:
      return null;
  }
}

function getBattleStatLabel(stat: BattleStatId): string {
  if (isRTL()) {
    switch (stat) {
      case 'attack':
        return 'התקפה';
      case 'defense':
        return 'הגנה';
      case 'specialAttack':
        return 'התקפה מיוחדת';
      case 'specialDefense':
        return 'הגנה מיוחדת';
      case 'speed':
        return 'מהירות';
      case 'accuracy':
        return 'דיוק';
      case 'evasion':
        return 'התחמקות';
    }
  }

  switch (stat) {
    case 'attack':
      return 'Attack';
    case 'defense':
      return 'Defense';
    case 'specialAttack':
      return 'Sp. Atk';
    case 'specialDefense':
      return 'Sp. Def';
    case 'speed':
      return 'Speed';
    case 'accuracy':
      return 'Accuracy';
    case 'evasion':
      return 'Evasion';
  }

  return stat;
}

function getStatChangeLine(
  name: string,
  change: ReturnType<typeof applyStatChanges>[number],
): string {
  const stat = getBattleStatLabel(change.stat);
  if (change.direction === 'rose') {
    return t(change.sharply ? 'battle.statRoseSharply' : 'battle.statRose', { name, stat });
  }
  return t(change.sharply ? 'battle.statFellHarshly' : 'battle.statFell', { name, stat });
}

function normalizeBattleItemStat(stat: string): BattleStatId | null {
  switch (stat) {
    case 'attack':
    case 'defense':
    case 'specialAttack':
    case 'specialDefense':
    case 'speed':
    case 'accuracy':
    case 'evasion':
      return stat;
    default:
      return null;
  }
}

function doesAbilityAbsorbMove(target: Pokemon, moveType: PokemonType): boolean {
  if (!target.abilityId) return false;
  return getAbilityBattleEffects(target.abilityId).some(effect => {
    return effect.kind === 'typeAbsorbHeal' && effect.moveTypes.includes(moveType);
  });
}

export function createBattleScene(input: InputManager, stateMachine: StateMachine, _canvas: HTMLCanvasElement, audio: AudioManager): Scene {
  let phase: BattlePhase = 'INTRO';
  let player: Pokemon;
  let enemy: Pokemon;
  let playerHpBar: ReturnType<typeof createHPBar>;
  let enemyHpBar: ReturnType<typeof createHPBar>;
  let playerBattleState: BattlePokemonRuntimeState;
  let enemyBattleState: BattlePokemonRuntimeState;
  let menu: ReturnType<typeof createBattleMenu>;
  let textBox: ReturnType<typeof createTextBox> | null = null;
  let selMove = 0;
  let flash: ReturnType<typeof createFlash> | null = null;
  let shake: ReturnType<typeof createShake> | null = null;
  let fade: ReturnType<typeof createFade> | null = null;
  let phaseTimer = 0;
  let xpGained = 0;
  let levelUpFx: ReturnType<typeof createLevelUpEffect> | null = null;
  let captureSuccessFx: ReturnType<typeof createCaptureSuccessEffect> | null = null;
  let sendOutFx: ReturnType<typeof createSendOutEffect> | null = null;
  let attackFx: ReturnType<typeof createAttackEffect> | null = null;
  let statusTurnFx: ReturnType<typeof createStatusTurnEffect> | null = null;
  let pendingNewMoves: LevelUpMoveResult[] = [];
  let activeMoveLearningPrompt: LevelUpMoveResult | null = null;
  let pendingMoveLearningResolution: MoveLearningResolution | null = null;
  let pendingMoveLearningPhase: BattlePhase | null = null;
  let pendingEvolution: EvolutionStep | null = null;
  let waitingForBag = false;
  let waitingForParty = false;
  let previousLeadId: number | null = null;
  let activePartyIndex = 0;  // Index of the active Pokemon in the player's party
  let battleRoster = new Set<number>();  // Party indices that have entered this battle
  let battleTurnCounts = new Map<number, number>();  // Active turns per party slot this battle
  let pendingTurnCredit = false;  // Whether to credit a turn to active Pokemon after phase resolves
  let maxRosterSize = 0;  // Max Pokemon player can use (= trainer's party size, or 6 for wild)
  let isTrainerBattle = false;
  let trainerData: TrainerBattleData | null = null;
  let trainerPartyIndex = 0;
  let battleContext: BattleContext = 'grass';
  let battleBackground: BattleBackgroundId | null = null;
  let bgImage: HTMLImageElement | null = null;
  let showTrainerSprite = false;  // Show trainer sprite during intro
  let enemyGoesFirst = false;
  let enemySelectedMoveIndex = -1;
  let enemyAlreadyAttacked = false;
  let turnNumber = 0;
  let lossDialogueShown = false;
  let pendingLossOutcome: LossOutcome | null = null;
  let soloOpeningSwitchUsed = false;
  let activeBallId: string | null = null;
  let pendingCaptureOutcome: { itemId: string; caught: boolean } | null = null;
  let pendingEnemySendOutAnimation = false;
  let pendingPlayerSendOutAnimation = false;
  const animationDirector = createBattleAnimationDirector();

  function useItem(itemId: string): void {
    const pd = getPlayerData();
    const def = getItem(itemId);
    if (!def) return;

    // Stat-boost items: modify temporary battle stages
    if (def.effect.type === 'stat-boost') {
      const stat = normalizeBattleItemStat(def.effect.stat);
      if (!stat) {
        textBox = createTextBox([t('battle.cantDoThat')], isRTL());
        phase = 'USE_ITEM'; phaseTimer = 0;
        return;
      }

      const applied = applyStatChanges(playerBattleState, [{
        stat,
        stages: def.effect.stages,
        target: 'user',
        chance: 100,
      }], 'user');

      if (applied.length === 0) {
        textBox = createTextBox([t('battle.statWontGoHigher')], isRTL());
        phase = 'USE_ITEM'; phaseTimer = 0;
        return;
      }

      consumeItem(pd.items, itemId);
      syncPlayerBar();
      audio.playSFX('heal');
      textBox = createTextBox([
        t('battle.usedItem', { item: getLocalizedName(def.name), name: getPokemonDisplayName(player.id) }),
        ...applied.map(change => getStatChangeLine(getPokemonDisplayName(player.id), change)),
      ], isRTL());
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
      startCaptureSequence(itemId, Math.random() < getCaptureChance(def.effect.rate));
      phaseTimer = 0;
      return;
    }

    // All other items: centralized effect system
    const result = applyItemEffect(itemId, player);
    if (result.success) {
      consumeItem(pd.items, itemId);
      setHP(playerHpBar, player.hp);
      setStatus(playerHpBar, player.status ?? '');
      audio.playSFX('heal');
    }
    textBox = createTextBox([t('battle.usedItem', { item: getLocalizedName(def.name), name: getPokemonDisplayName(player.id) })], isRTL());
    phase = 'USE_ITEM'; phaseTimer = 0;
  }

  function sendOutNextTrainerPokemon(): void {
    trainerPartyIndex++;
    enemy = trainerData!.party[trainerPartyIndex];
    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    enemySelectedMoveIndex = -1;
    enemyAlreadyAttacked = false;
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp,
      BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    setStatus(enemyHpBar, enemy.status ?? '');
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) getPlayerData().pokedex[enemy.id] = true;
    pendingEnemySendOutAnimation = true;
    animationDirector.setActorState('enemy', {
      x: 26,
      y: -8,
      scaleX: 0.55,
      scaleY: 0.55,
      alpha: 0,
      rotation: -0.2,
      visible: false,
    });
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
      // Determine which party index this player Pokemon corresponds to
      if (hasActiveGame()) {
        const pd = getPlayerData();
        const idx = pd.party.findIndex(p => p === player);
        activePartyIndex = idx >= 0 ? idx : 0;
      } else {
        activePartyIndex = 0;
      }
      pendingPlayer = null; pendingEnemy = null;
    } else {
      player = (hasActiveGame() && getPlayerData().party[0]) || fallbackPlayer();
      enemy = fallbackEnemy();
    }
    battleContext = pendingBattleContext;
    battleBackground = pendingBattleBackground;
    pendingBattleContext = 'grass';
    pendingBattleBackground = null;
    // V2 layout: opponent bar at (136,12), player bar position computed dynamically
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp,
      BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    playerHpBar = createHPBar(player.id, player.level, player.hp, player.maxHp,
      BTL.PLY_BAR_X, BTL.PLY_BAR_BOTTOM - 18, true, player.xp, player.xpToNext);
    playerBattleState = createBattleRuntimeStateForPokemon(player);
    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    setStatus(enemyHpBar, enemy.status ?? '');
    setStatus(playerHpBar, player.status ?? '');
    menu = createBattleMenu(player.moves);
    menu.playerPokemon = player;
    menu.party = hasActiveGame() ? getPlayerData().party : [player];
    textBox = null; flash = null; shake = null; levelUpFx = null; captureSuccessFx = null; sendOutFx = null; attackFx = null; statusTurnFx = null;
    waitingForBag = false; waitingForParty = false; previousLeadId = null;
    pendingNewMoves = [];
    activeMoveLearningPrompt = null;
    pendingMoveLearningResolution = null;
    pendingMoveLearningPhase = null;
    enemyGoesFirst = false; enemySelectedMoveIndex = -1; enemyAlreadyAttacked = false;
    turnNumber = 0;
    pendingTurnCredit = false;
    lossDialogueShown = false;
    pendingLossOutcome = null;
    soloOpeningSwitchUsed = false;
    // Initialize battle roster: player's first Pokemon is automatically registered
    battleRoster = new Set<number>([activePartyIndex]);
    battleTurnCounts = new Map<number, number>([[activePartyIndex, 0]]);
    maxRosterSize = isTrainerBattle && trainerData ? trainerData.party.length : 6;
    activeBallId = null;
    pendingCaptureOutcome = null;
    pendingEnemySendOutAnimation = isTrainerBattle;
    pendingPlayerSendOutAnimation = true;
    animationDirector.clear();
    animationDirector.resetActors();
    animationDirector.setActorState('ball', { visible: false });
    animationDirector.setActorState('player', {
      x: -24,
      y: 8,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0,
      rotation: 0.14,
      visible: false,
    });
    if (isTrainerBattle) {
      animationDirector.setActorState('enemy', {
        x: 26,
        y: -8,
        scaleX: 0.55,
        scaleY: 0.55,
        alpha: 0,
        rotation: -0.2,
        visible: false,
      });
    }
    fade = createFade(true, 0.5); clearAllPopups();
    pendingEvolution = null;
    phase = 'INTRO'; phaseTimer = 0; xpGained = 0;
    // Preload Pokemon sprites
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
    // Try to load tile-selected or context-mapped background image
    bgImage = null;
    const bgPath = resolveBattleBackgroundPath(battleBackground, battleContext);
    if (bgPath) {
      loadImage(bgPath).then(img => {
        bgImage = img;
      }).catch(() => { bgImage = null; });
    }
  }

  /** Trigger level-up sparkle + jingle. Uses player sprite center for the effect. */
  function triggerLevelUpFx(): void {
    const barX = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2;
    const barY = BTL.PLY_SPRITE.y;
    levelUpFx = createLevelUpEffect(barX, barY);
    audio.playLevelUp();
  }

  function recordBattleTurn(partyIndex: number): void {
    battleTurnCounts.set(partyIndex, (battleTurnCounts.get(partyIndex) ?? 0) + 1);
  }

  function enterSelectMovePhase(): void {
    phase = 'SELECT_MOVE';
    showMoveMenu(menu);
    if (pendingTurnCredit) {
      recordBattleTurn(activePartyIndex);
      pendingTurnCredit = false;
    }
  }

  function getCaptureXpReward(): number {
    return calculateXpGain(enemy) * 3;
  }

  function getDefeatXpReward(): number {
    return calculateXpGain(enemy, { trainerBattle: isTrainerBattle });
  }

  function getConsolationXpReward(partyIndex: number): number {
    const winXp = getDefeatXpReward();
    const turns = Math.max(1, battleTurnCounts.get(partyIndex) ?? 0);
    const maxBonus = Math.max(1, Math.floor(winXp * 0.5));
    const perTurnBonus = Math.max(1, Math.floor(winXp * 0.1));
    return Math.min(maxBonus, perTurnBonus * turns);
  }

  function awardConsolationXp(pokemon: Pokemon, partyIndex: number): number {
    const bonusXp = getConsolationXpReward(partyIndex);
    const before = pokemon.xp;
    pokemon.xp = Math.min(pokemon.xp + bonusXp, pokemon.xpToNext - 1);
    return pokemon.xp - before;
  }

  function getLossPenalty(outcome: LossOutcome, currentMoney: number): number {
    switch (outcome) {
      case 'trainer-whiteout':
      case 'wild-whiteout':
        return Math.floor(currentMoney / 2);
      case 'trainer-roster':
        return trainerData ? Math.min(currentMoney, trainerData.reward.money * 3) : 0;
    }
  }

  function buildLossDialogue(outcome: LossOutcome): string[] {
    const lines: string[] = [];
    if (outcome === 'trainer-roster') {
      lines.push(t('battle.lostTrainerBattle'));
    } else {
      lines.push(t('battle.whiteout'));
    }

    if (hasActiveGame()) {
      const penalty = getLossPenalty(outcome, getPlayerData().money);
      if (penalty > 0) lines.push(t('battle.moneyPenalty', { amount: penalty }));
    }

    lines.push(outcome === 'trainer-roster' ? t('battle.trainerWaitsRecover') : t('battle.recoverMessage'));
    return lines;
  }

  function beginLoss(outcome: LossOutcome): void {
    pendingLossOutcome = outcome;
    lossDialogueShown = false;
    fade = null;
    phase = 'LOSE';
  }

  function canUseOpeningSoloSwitch(partyIndex: number): boolean {
    return isTrainerBattle
      && maxRosterSize === 1
      && turnNumber === 1
      && !soloOpeningSwitchUsed
      && partyIndex !== activePartyIndex;
  }

  function getBallStartPoint(): { x: number; y: number } {
    return {
      x: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w - 6,
      y: BTL.PLY_SPRITE.y + 18,
    };
  }

  function getBallTargetPoint(): { x: number; y: number } {
    return {
      x: BTL.OPP_SPRITE.x + (BTL.OPP_SPRITE.w / 2),
      y: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h - 8,
    };
  }

  function getTrainerBallStartPoint(): { x: number; y: number } {
    return {
      x: 224,
      y: 42,
    };
  }

  function getPlayerBallStartPoint(): { x: number; y: number } {
    return {
      x: 92,
      y: 72,
    };
  }

  function getPlayerBallTargetPoint(): { x: number; y: number } {
    return {
      x: BTL.PLY_SPRITE.x + 24,
      y: BTL.PLY_SPRITE.y + 28,
    };
  }

  function getPlayerBallId(): string {
    return player.caughtBall ?? 'poke-ball';
  }

  function getEnemyCaptureStatus(): string | null {
    return (enemy.status ?? enemyHpBar.status) || null;
  }

  function getCaptureChance(ballRate: number): number {
    return calculateCaptureChance({
      ballRate,
      speciesCatchRate: getPokemonCatchRate(enemy.id),
      currentHp: enemy.hp,
      maxHp: enemy.maxHp,
      playerLevel: player.level,
      wildLevel: enemy.level,
      turnNumber,
      status: getEnemyCaptureStatus(),
    });
  }

  function createBallShakeStep(targetX: number, targetY: number): ReturnType<typeof sequenceStep> {
    return sequenceStep(
      tweenActorStep('ball', { x: targetX + 3, y: targetY, rotation: 0.22 }, 0.08, 'easeInOut'),
      tweenActorStep('ball', { x: targetX - 3, y: targetY, rotation: -0.22 }, 0.08, 'easeInOut'),
      tweenActorStep('ball', { x: targetX, y: targetY, rotation: 0 }, 0.08, 'easeInOut'),
      waitStep(0.05),
    );
  }

  function resetCaptureActors(): void {
    animationDirector.setActorState('enemy', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.setActorState('ball', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: false,
    });
  }

  function finishCaptureAnimation(): void {
    if (!pendingCaptureOutcome) return;

    const outcome = pendingCaptureOutcome;
    const pd = getPlayerData();
    pendingCaptureOutcome = null;

    if (outcome.caught) {
      animationDirector.setActorState('enemy', {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 0,
        rotation: 0,
        visible: false,
      });
      enemy.caughtBall = outcome.itemId;
      if (pd.party.length < 6) pd.party.push({ ...enemy });
      pd.pokedex[enemy.id] = true;
      xpGained = getCaptureXpReward();
      player.xp += xpGained;
      autoSave();
      textBox = createTextBox([
        t('battle.caught', { name: getPokemonDisplayName(enemy.id) }),
        t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: xpGained }),
      ], isRTL());
      audio.playMusic('victory');
      phase = 'XP_GAIN';
      return;
    }

    activeBallId = null;
    resetCaptureActors();
    textBox = createTextBox([t('battle.brokeFreeBall', { name: getPokemonDisplayName(enemy.id) })], isRTL());
    phase = 'USE_ITEM';
  }

  function startEnemyFaintAnimation(): void {
    animationDirector.clear();
    animationDirector.setActorState('enemy', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(sequenceStep(
      callStep(() => audio.playCry(enemy.id)),
      parallelStep(
        tweenActorStep('enemy', { y: 10, alpha: 0 }, 0.28, 'easeInOut'),
        tweenActorStep('enemy', { scaleX: 1.08, scaleY: 0.08 }, 0.28, 'easeInOut'),
      ),
      callStep(() => {
        animationDirector.setActorState('enemy', {
          y: 10,
          alpha: 0,
          scaleX: 1.08,
          scaleY: 0.08,
          visible: false,
        });
      }),
    ));
  }

  function startPlayerFaintAnimation(): void {
    animationDirector.clear();
    animationDirector.setActorState('player', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(sequenceStep(
      callStep(() => audio.playCry(player.id)),
      parallelStep(
        tweenActorStep('player', { y: 12, alpha: 0 }, 0.28, 'easeInOut'),
        tweenActorStep('player', { scaleX: 1.04, scaleY: 0.08 }, 0.28, 'easeInOut'),
      ),
      callStep(() => {
        animationDirector.setActorState('player', {
          y: 12,
          alpha: 0,
          scaleX: 1.04,
          scaleY: 0.08,
          visible: false,
        });
      }),
    ));
  }

  function startPlayerRetreatAnimation(): void {
    animationDirector.clear();
    animationDirector.setActorState('player', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(sequenceStep(
      parallelStep(
        tweenActorStep('player', { x: -26, y: 10, alpha: 0 }, 0.22, 'easeInOut'),
        tweenActorStep('player', { scaleX: 0.72, scaleY: 0.72 }, 0.22, 'easeInOut'),
      ),
      callStep(() => {
        animationDirector.setActorState('player', {
          x: -26,
          y: 10,
          alpha: 0,
          scaleX: 0.72,
          scaleY: 0.72,
          visible: false,
        });
      }),
    ));
  }

  function startEnemySendOutAnimation(): void {
    const start = getTrainerBallStartPoint();
    const target = getBallTargetPoint();
    pendingEnemySendOutAnimation = false;
    activeBallId = 'poke-ball';
    sendOutFx = null;
    animationDirector.clear();
    animationDirector.setActorState('ball', {
      x: start.x,
      y: start.y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.setActorState('enemy', {
      x: 26,
      y: -8,
      scaleX: 0.55,
      scaleY: 0.55,
      alpha: 0,
      rotation: -0.2,
      visible: false,
    });
    animationDirector.play(sequenceStep(
      callStep(() => audio.playSFX('menu-select')),
      tweenActorStep('ball', {
        x: start.x + ((target.x - start.x) * 0.58),
        y: target.y - 26,
        rotation: -0.4,
      }, 0.14, 'easeOut'),
      tweenActorStep('ball', {
        x: target.x,
        y: target.y,
        rotation: 0,
      }, 0.12, 'easeInOut'),
      callStep(() => {
        audio.playSFX('hit');
        flash = createFlash('#ff6a6a', 0.14);
        sendOutFx = createSendOutEffect(target.x, target.y - 2, '#ff6a6a', '#ffd6d6');
        activeBallId = null;
        animationDirector.setActorState('ball', {
          alpha: 0,
          visible: false,
        });
        animationDirector.setActorState('enemy', {
          visible: true,
        });
      }),
      waitStep(0.04),
      callStep(() => audio.playCry(enemy.id)),
      tweenActorStep('enemy', {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        rotation: 0,
        visible: true,
      }, 0.26, 'easeOut'),
      callStep(() => {
        activeBallId = null;
        animationDirector.setActorState('ball', {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          rotation: 0,
          visible: false,
        });
      }),
    ));
  }

  function startPlayerSendOutAnimation(): void {
    const start = getPlayerBallStartPoint();
    const target = getPlayerBallTargetPoint();
    pendingPlayerSendOutAnimation = false;
    activeBallId = getPlayerBallId();
    sendOutFx = null;
    animationDirector.clear();
    animationDirector.setActorState('ball', {
      x: start.x,
      y: start.y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.setActorState('player', {
      x: -24,
      y: 8,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0,
      rotation: 0.14,
      visible: false,
    });
    animationDirector.play(sequenceStep(
      callStep(() => audio.playSFX('menu-select')),
      tweenActorStep('ball', {
        x: start.x - ((start.x - target.x) * 0.58),
        y: target.y - 22,
        rotation: 0.38,
      }, 0.14, 'easeOut'),
      tweenActorStep('ball', {
        x: target.x,
        y: target.y,
        rotation: 0,
      }, 0.12, 'easeInOut'),
      callStep(() => {
        audio.playSFX('hit');
        flash = createFlash('#d6ecff', 0.12);
        sendOutFx = createSendOutEffect(target.x, target.y - 2, '#80b8ff', '#e8f4ff');
        activeBallId = null;
        animationDirector.setActorState('ball', {
          alpha: 0,
          visible: false,
        });
        animationDirector.setActorState('player', {
          visible: true,
        });
      }),
      waitStep(0.03),
      callStep(() => audio.playCry(player.id)),
      tweenActorStep('player', {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        rotation: 0,
        visible: true,
      }, 0.24, 'easeOut'),
      callStep(() => {
        activeBallId = null;
        animationDirector.setActorState('ball', {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          rotation: 0,
          visible: false,
        });
      }),
    ));
  }

  function startCaptureSequence(itemId: string, caught: boolean): void {
    const start = getBallStartPoint();
    const target = getBallTargetPoint();

    activeBallId = itemId;
    pendingCaptureOutcome = { itemId, caught };
    textBox = null;
    captureSuccessFx = null;
    animationDirector.clear();
    resetCaptureActors();
    animationDirector.setActorState('ball', {
      x: start.x,
      y: start.y,
      visible: true,
    });

    const absorbStep = parallelStep(
      tweenActorStep('enemy', {
        scaleX: 0.15,
        scaleY: 0.15,
        alpha: 0,
      }, 0.16, 'easeInOut'),
      sequenceStep(
        tweenActorStep('ball', { scaleX: 1.2, scaleY: 1.2 }, 0.08, 'easeOut'),
        tweenActorStep('ball', { scaleX: 1, scaleY: 1 }, 0.08, 'easeInOut'),
      ),
    );

    const throwAndTrapStep = sequenceStep(
      callStep(() => audio.playSFX('menu-select')),
      tweenActorStep('ball', {
        x: start.x + ((target.x - start.x) * 0.55),
        y: target.y - 30,
        rotation: 0.45,
      }, 0.16, 'easeOut'),
      tweenActorStep('ball', {
        x: target.x,
        y: target.y,
        rotation: 0,
      }, 0.14, 'easeInOut'),
      callStep(() => audio.playSFX('hit')),
      absorbStep,
      callStep(() => {
        animationDirector.setActorState('enemy', {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          rotation: 0,
          visible: false,
        });
      }),
      waitStep(0.12),
    );

    const successSequence = sequenceStep(
      createBallShakeStep(target.x, target.y),
      createBallShakeStep(target.x, target.y),
      createBallShakeStep(target.x, target.y),
      callStep(() => {
        flash = createFlash('#fff5a8', 0.16);
        captureSuccessFx = createCaptureSuccessEffect(target.x, target.y - 1);
        audio.playCaptureSuccess();
      }),
      waitStep(0.22),
    );

    const brokeFreeSequence = sequenceStep(
      createBallShakeStep(target.x, target.y),
      createBallShakeStep(target.x, target.y),
      callStep(() => audio.playCry(enemy.id)),
      callStep(() => {
        animationDirector.setActorState('enemy', {
          scaleX: 0.15,
          scaleY: 0.15,
          alpha: 0,
          visible: true,
        });
      }),
      parallelStep(
        tweenActorStep('enemy', {
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          visible: true,
        }, 0.16, 'easeOut'),
        sequenceStep(
          tweenActorStep('ball', { scaleX: 1.35, scaleY: 1.35, alpha: 0.15 }, 0.1, 'easeOut'),
          tweenActorStep('ball', { alpha: 0, scaleX: 0.9, scaleY: 0.9 }, 0.12, 'easeInOut'),
        ),
      ),
      waitStep(0.06),
    );

    animationDirector.play(sequenceStep(
      throwAndTrapStep,
      caught ? successSequence : brokeFreeSequence,
    ));
    phase = 'CAPTURE_ANIM';
  }

  function syncPlayerBar(resetDisplayedXp = false): void {
    playerHpBar.pokemonId = player.id;
    playerHpBar.level = player.level;
    playerHpBar.maxHp = player.maxHp;
    playerHpBar.currentHp = Math.max(0, Math.min(player.hp, player.maxHp));
    playerHpBar.statChanges = getDisplayedStatChanges(playerBattleState);
    setStatus(playerHpBar, player.status ?? '');
    if (playerHpBar.displayHp > playerHpBar.maxHp) {
      playerHpBar.displayHp = playerHpBar.maxHp;
    }
    setXP(playerHpBar, player.xp, player.xpToNext);
    if (resetDisplayedXp) {
      setDisplayedXP(playerHpBar, 0);
    }
    menu.playerPokemon = player;
  }

  function syncEnemyBar(): void {
    enemyHpBar.pokemonId = enemy.id;
    enemyHpBar.level = enemy.level;
    enemyHpBar.maxHp = enemy.maxHp;
    enemyHpBar.currentHp = Math.max(0, Math.min(enemy.hp, enemy.maxHp));
    enemyHpBar.statChanges = getDisplayedStatChanges(enemyBattleState);
    setStatus(enemyHpBar, enemy.status ?? '');
    if (enemyHpBar.displayHp > enemyHpBar.maxHp) {
      enemyHpBar.displayHp = enemyHpBar.maxHp;
    }
  }

  function handlePlayerFaintAfterAction(consolationXp = 0): void {
    enemyGoesFirst = false;
    startPlayerFaintAnimation();
    const faintLines = [t('battle.fainted', { name: getPokemonDisplayName(player.id) })];
    if (consolationXp > 0) {
      faintLines.push(t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: consolationXp }));
    }
    textBox = createTextBox(faintLines, isRTL());
    if (hasUsablePartyPokemon()) {
      phase = 'PLAYER_FAINT_SWITCH';
      return;
    }

    const pd = hasActiveGame() ? getPlayerData() : null;
    const allPartyFainted = pd ? pd.party.every(p => p.hp <= 0) : true;
    if (isTrainerBattle && !allPartyFainted) {
      beginLoss('trainer-roster');
    } else {
      beginLoss(isTrainerBattle ? 'trainer-whiteout' : 'wild-whiteout');
    }
  }

  function startEndTurnStatusPhase(): void {
    const lines: string[] = [];
    const playerResult = applyEndOfTurnStatusEffects(player, playerBattleState);
    const enemyResult = applyEndOfTurnStatusEffects(enemy, enemyBattleState);

    if (playerResult.message === 'poison') {
      lines.push(t('battle.hurtByPoison', { name: getPokemonDisplayName(player.id) }));
    } else if (playerResult.message === 'burn') {
      lines.push(t('battle.hurtByBurn', { name: getPokemonDisplayName(player.id) }));
    }

    if (enemyResult.message === 'poison') {
      lines.push(t('battle.hurtByPoison', { name: getPokemonDisplayName(enemy.id) }));
    } else if (enemyResult.message === 'burn') {
      lines.push(t('battle.hurtByBurn', { name: getPokemonDisplayName(enemy.id) }));
    }

    syncPlayerBar();
    syncEnemyBar();

    if (lines.length > 0) {
      textBox = createTextBox(lines, isRTL());
      phase = 'END_TURN_STATUS';
      phaseTimer = 0;
      return;
    }

    if (enemy.hp <= 0) {
      phase = 'CHECK_WIN';
      return;
    }
    if (player.hp <= 0) {
      handlePlayerFaintAfterAction();
      return;
    }

    pendingTurnCredit = true;
    enterSelectMovePhase();
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
    activeMoveLearningPrompt = null;
    pendingEvolution = result.evolution ?? null;
    textBox = createTextBox([t('battle.levelUp', { name: getPokemonDisplayName(player.id), level: player.level })], isRTL());
    phase = levelPhase;
    return true;
  }

  function startPendingEvolution(nextPhase: BattlePhase): boolean {
    if (!pendingEvolution) return false;
    const evolution = pendingEvolution;
    pendingEvolution = null;
    phase = nextPhase;
    setEvolutionData(player, evolution, () => {
      syncPlayerBar();
      menu.playerPokemon = player;
      loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
    });
    stateMachine.push('EVOLUTION');
    return true;
  }

  function refreshPlayerMoveState(): void {
    syncPlayerBar();
    menu = createBattleMenu(player.moves);
    menu.playerPokemon = player;
    menu.party = hasActiveGame() ? getPlayerData().party : [player];
  }

  function startMoveLearning(phaseAfterResolution: BattlePhase): boolean {
    if (!activeMoveLearningPrompt || !hasActiveGame()) return false;

    const prompt = activeMoveLearningPrompt;
    activeMoveLearningPrompt = null;
    pendingMoveLearningResolution = null;
    pendingMoveLearningPhase = phaseAfterResolution;
    setPartyMode('move-learning');
    setMoveLearningSession(createMoveLearningSession(activePartyIndex, prompt, (resolution) => {
      pendingMoveLearningResolution = resolution;
    }));
    phase = 'WAITING_MOVE_LEARN';
    stateMachine.push('PARTY');
    return true;
  }

  /** Show the next move-learning text box from pendingNewMoves. Returns true if a message was shown. */
  function showNextLearnedMove(movesPhase: BattlePhase): boolean {
    if (pendingNewMoves.length === 0) return false;
    activeMoveLearningPrompt = pendingNewMoves.shift()!;
    const lines = getMoveLearningAnnouncementLines(player.id, activeMoveLearningPrompt);
    textBox = createTextBox(lines, isRTL());
    phase = movesPhase;
    return true;
  }

  function getAttackAnchor(actor: 'player' | 'enemy'): { x: number; y: number } {
    const state = animationDirector.getActorState(actor);
    if (actor === 'player') {
      return {
        x: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w * 0.62 + state.x,
        y: BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h * 0.36 + state.y,
      };
    }
    return {
      x: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w * 0.38 + state.x,
      y: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h * 0.44 + state.y,
    };
  }

  function getActorStatusBounds(actor: 'player' | 'enemy'): { centerX: number; centerY: number; width: number; height: number } {
    const sprite = actor === 'player' ? BTL.PLY_SPRITE : BTL.OPP_SPRITE;
    const state = animationDirector.getActorState(actor);
    return {
      centerX: sprite.x + (sprite.w / 2) + state.x,
      centerY: sprite.y + (sprite.h / 2) + state.y,
      width: sprite.w * Math.abs(state.scaleX),
      height: sprite.h * Math.abs(state.scaleY),
    };
  }

  function triggerStatusTurnEffect(actor: 'player' | 'enemy', pokemon: Pokemon): void {
    if (!pokemon.status) return;
    const bounds = getActorStatusBounds(actor);
    statusTurnFx = createStatusTurnEffect(
      pokemon.status,
      bounds.centerX,
      bounds.centerY,
      bounds.width,
      bounds.height,
    );
  }

  function applyMoveImpact(
    defender: Pokemon,
    move: Pokemon['moves'][number],
    targetBar: ReturnType<typeof createHPBar>,
    popupX: number,
    popupY: number,
    resolvedDamage = 0,
  ): void {
    const moveData = getMove(move.id);
    const damageClass = moveData?.damageClass ?? (move.power > 0 ? 'physical' : 'status');
    const profile = getAttackAnimationProfile({
      name: moveData?.name ?? { en: move.name, he: move.name },
      type: move.type,
      power: move.power,
      damageClass,
    });

    if (move.power > 0) {
      const absorbEffect = defender.abilityId
        ? getAbilityBattleEffects(defender.abilityId).find((effect) => {
          return effect.kind === 'typeAbsorbHeal' && effect.moveTypes.includes(move.type);
        })
        : undefined;
      if (absorbEffect?.kind === 'typeAbsorbHeal') {
        const healAmount = Math.max(1, Math.floor((defender.maxHp * absorbEffect.healPercent) / 100));
        const healed = Math.max(0, Math.min(defender.maxHp, defender.hp + healAmount) - defender.hp);
        defender.hp = Math.min(defender.maxHp, defender.hp + healAmount);
        setHP(targetBar, defender.hp);
        spawnDamageNumber(`+${healed}`, popupX, popupY, '#48d870');
        audio.playSFX('heal');
        return;
      }

      const dmg = resolvedDamage;
      if (dmg <= 0) return;
      defender.hp = Math.max(0, defender.hp - dmg);
      setHP(targetBar, defender.hp);
      flash = createFlash(profile.flashColor, 0.15);
      shake = createShake(profile.shakeIntensity, 0.22);
      spawnDamageNumber(`-${dmg}`, popupX, popupY, '#f84038');
      audio.playSFX('hit');
    }
  }

  function applyResolvedMoveEffects(
    attacker: Pokemon,
    attackerState: BattlePokemonRuntimeState,
    attackerName: string,
    defender: Pokemon,
    defenderState: BattlePokemonRuntimeState,
    defenderName: string,
    move: Pokemon['moves'][number],
    allowTargetEffects: boolean,
  ): string[] {
    const moveBattleData = getMoveBattleData(move.id);
    if (!moveBattleData) return [];

    const lines: string[] = [];
    const userStatChanges = applyStatChanges(attackerState, moveBattleData.statChanges, 'user');
    for (const change of userStatChanges) {
      lines.push(getStatChangeLine(attackerName, change));
    }

    if (moveBattleData.ailment?.target === 'user') {
      const statusResult = applyMajorStatus(attacker, attackerState, moveBattleData.ailment);
      if (statusResult.applied) {
        const statusLine = getStatusAppliedLine(attackerName, statusResult.status);
        if (statusLine) lines.push(statusLine);
      }
    }

    if (allowTargetEffects) {
      const targetStatChanges = applyStatChanges(defenderState, moveBattleData.statChanges, 'target');
      for (const change of targetStatChanges) {
        lines.push(getStatChangeLine(defenderName, change));
      }

      if (moveBattleData.ailment?.target === 'target') {
        const statusResult = applyMajorStatus(defender, defenderState, moveBattleData.ailment);
        if (statusResult.applied) {
          const statusLine = getStatusAppliedLine(defenderName, statusResult.status);
          if (statusLine) lines.push(statusLine);
        }
      }
    }

    syncPlayerBar();
    syncEnemyBar();
    return lines;
  }

  function playAttackAnimation(
    attackerActor: 'player' | 'enemy',
    defenderActor: 'player' | 'enemy',
    move: Pokemon['moves'][number],
    onImpact: () => void,
    hitTarget = true,
  ): void {
    const moveData = getMove(move.id);
    const profile = getAttackAnimationProfile({
      name: moveData?.name ?? { en: move.name, he: move.name },
      type: move.type,
      power: move.power,
      damageClass: moveData?.damageClass ?? (move.power > 0 ? 'physical' : 'status'),
    });

    const attackerStart = { ...animationDirector.getActorState(attackerActor) };
    const defenderStart = { ...animationDirector.getActorState(defenderActor) };
    const source = getAttackAnchor(attackerActor);
    const target = profile.selfTarget ? getAttackAnchor(attackerActor) : getAttackAnchor(defenderActor);
    const lungeOffset = attackerActor === 'player' ? 12 : -12;
    const recoilOffset = defenderActor === 'player' ? -6 : 6;
    const recoveryDuration = Math.max(0.12, profile.duration - profile.impactTime);

    attackFx = null;

    animationDirector.play(sequenceStep(
      callStep(() => {
        if (profile.family === 'projectile' || profile.family === 'beam') {
          attackFx = createAttackEffect({
            kind: profile.family,
            sourceX: source.x,
            sourceY: source.y,
            targetX: target.x,
            targetY: target.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.duration,
          });
        }
      }),
      profile.family === 'lunge'
        ? tweenActorStep(attackerActor, {
          x: attackerStart.x + lungeOffset,
          y: attackerStart.y - 2,
          rotation: attackerStart.rotation + (attackerActor === 'player' ? -0.08 : 0.08),
        }, profile.impactTime, 'easeInOut')
        : waitStep(profile.impactTime),
      callStep(() => {
        if (profile.family === 'pulse' || profile.family === 'burst' || profile.family === 'lunge') {
          attackFx = createAttackEffect({
            kind: profile.family === 'lunge' ? 'burst' : profile.family,
            sourceX: source.x,
            sourceY: source.y,
            targetX: target.x,
            targetY: target.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.family === 'lunge' ? 0.2 : undefined,
          });
        }
        onImpact();
      }),
      parallelStep(
        move.power > 0 && hitTarget && !profile.selfTarget
          ? sequenceStep(
            tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.07, 'easeInOut'),
            tweenActorStep(defenderActor, defenderStart, 0.1, 'easeInOut'),
          )
          : waitStep(0.17),
        profile.family === 'lunge'
          ? tweenActorStep(attackerActor, attackerStart, recoveryDuration, 'easeInOut')
          : waitStep(recoveryDuration),
      ),
    ));
  }

  function doAttack(): void {
    const m = player.moves[selMove];
    const rtl = isRTL();
    const attackerName = getPokemonDisplayName(player.id);
    const defenderName = getPokemonDisplayName(enemy.id);
    triggerStatusTurnEffect('player', player);
    const startResult = processStartOfTurnStatus(player, playerBattleState);
    const turnStatusLine = getTurnStatusLine(attackerName, startResult.event);
    syncPlayerBar();

    if (!startResult.canAct) {
      textBox = createTextBox(turnStatusLine ? [turnStatusLine] : [t('battle.nothingHappened')], rtl);
      phase = 'PLAYER_ATTACK';
      phaseTimer = 0;
      return;
    }

    if (m.currentPp > 0) {
      m.currentPp--;
    }

    const moveData = getMove(m.id);
    const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status');
    const hitResult = doesMoveHit(m.accuracy, playerBattleState, enemyBattleState);
    const absorbed = hitResult.hit && m.power > 0 && doesAbilityAbsorbMove(enemy, m.type);
    const criticalHit = hitResult.hit && m.power > 0 && !absorbed ? rollCriticalHit(m.id, enemy) : false;
    const resolvedDamage = hitResult.hit && m.power > 0 && !absorbed
      ? calcDamage(player, playerBattleState, enemy, enemyBattleState, m.power, m.type, damageClass, criticalHit)
      : 0;
    const allowTargetEffects = hitResult.hit && !absorbed && (m.power <= 0 || resolvedDamage < enemy.hp);
    const resolvedEffectLines = hitResult.hit
      ? applyResolvedMoveEffects(
        player,
        playerBattleState,
        attackerName,
        enemy,
        enemyBattleState,
        defenderName,
        m,
        allowTargetEffects,
      )
      : [];
    const msgs: string[] = [];
    if (turnStatusLine) {
      msgs.push(turnStatusLine);
    }
    msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }));

    if (m.power > 0) {
      if (!hitResult.hit) {
        msgs.push(t('battle.moveMissed', { name: attackerName }));
      } else {
        if (criticalHit) {
          msgs.push(t('battle.criticalHit'));
        }
        const et = effText(m.type, enemy.types);
        if (et) msgs.push(et);
      }
    } else if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }));
    } else if (resolvedEffectLines.length === 0) {
      msgs.push(t('battle.nothingHappened'));
      audio.playSFX('menu-cancel');
    }
    msgs.push(...resolvedEffectLines);

    textBox = createTextBox(msgs, rtl);
    playAttackAnimation('player', 'enemy', m, () => {
      if (hitResult.hit) {
        applyMoveImpact(
          enemy,
          m,
          enemyHpBar,
          BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
          BTL.OPP_SPRITE.y + 10,
          resolvedDamage,
        );
      }
    }, hitResult.hit && !absorbed && resolvedDamage > 0);
    phase = 'PLAYER_ATTACK'; phaseTimer = 0;
  }

  function enemyTurn(showFasterMsg = false): void {
    const mi = enemySelectedMoveIndex >= 0 ? enemySelectedMoveIndex : chooseEnemyMoveIndex(enemy);
    enemySelectedMoveIndex = -1;
    const m = enemy.moves[mi];
    const rtl = isRTL();
    const attackerName = getPokemonDisplayName(enemy.id);
    const defenderName = getPokemonDisplayName(player.id);
    triggerStatusTurnEffect('enemy', enemy);
    const startResult = processStartOfTurnStatus(enemy, enemyBattleState);
    const turnStatusLine = getTurnStatusLine(attackerName, startResult.event);
    syncEnemyBar();
    const prefix: string[] = showFasterMsg
      ? [t('battle.enemyMovesFirst', { name: attackerName })]
      : [];

    if (!startResult.canAct) {
      const msgs = [...prefix];
      msgs.push(turnStatusLine ?? t('battle.nothingHappened'));
      textBox = createTextBox(msgs, rtl);
      phase = 'ENEMY_TURN';
      phaseTimer = 0;
      return;
    }

    if (m.currentPp > 0) {
      m.currentPp--;
    }

    const moveData = getMove(m.id);
    const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status');
    const hitResult = doesMoveHit(m.accuracy, enemyBattleState, playerBattleState);
    const absorbed = hitResult.hit && m.power > 0 && doesAbilityAbsorbMove(player, m.type);
    const criticalHit = hitResult.hit && m.power > 0 && !absorbed ? rollCriticalHit(m.id, player) : false;
    const resolvedDamage = hitResult.hit && m.power > 0 && !absorbed
      ? calcDamage(enemy, enemyBattleState, player, playerBattleState, m.power, m.type, damageClass, criticalHit)
      : 0;
    const allowTargetEffects = hitResult.hit && !absorbed && (m.power <= 0 || resolvedDamage < player.hp);
    const resolvedEffectLines = hitResult.hit
      ? applyResolvedMoveEffects(
        enemy,
        enemyBattleState,
        attackerName,
        player,
        playerBattleState,
        defenderName,
        m,
        allowTargetEffects,
      )
      : [];
    const msgs = [...prefix];
    if (turnStatusLine) {
      msgs.push(turnStatusLine);
    }
    msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }));

    if (m.power > 0) {
      if (!hitResult.hit) {
        msgs.push(t('battle.moveMissed', { name: attackerName }));
      } else {
        if (criticalHit) {
          msgs.push(t('battle.criticalHit'));
        }
        const et = effText(m.type, player.types);
        if (et) msgs.push(et);
      }
    } else if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }));
    } else if (resolvedEffectLines.length === 0) {
      audio.playSFX('menu-cancel');
      msgs.push(t('battle.nothingHappened'));
    }
    msgs.push(...resolvedEffectLines);

    textBox = createTextBox(msgs, rtl);
    playAttackAnimation('enemy', 'player', m, () => {
      if (hitResult.hit) {
        applyMoveImpact(
          player,
          m,
          playerHpBar,
          BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
          BTL.PLY_SPRITE.y + 10,
          resolvedDamage,
        );
      }
    }, hitResult.hit && !absorbed && resolvedDamage > 0);
    phase = 'ENEMY_TURN'; phaseTimer = 0;
  }

  function goBack(): void { autoSave(); stateMachine.change('OVERWORLD'); }

  function handleLoss(): void {
    const outcome = pendingLossOutcome ?? (isTrainerBattle ? 'trainer-whiteout' : 'wild-whiteout');
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const penalty = getLossPenalty(outcome, pd.money);
      pd.money = Math.max(0, pd.money - penalty);

      if (outcome === 'trainer-whiteout' || outcome === 'wild-whiteout') {
        for (const p of pd.party) {
          p.hp = p.maxHp;
          p.status = null;
          for (const mv of p.moves) mv.currentPp = mv.pp;
        }
        const center = pd.lastPokemonCenter;
        pd.position.mapId = center.mapId;
        pd.position.x = center.x;
        pd.position.y = center.y;
      }
    }
    pendingLossOutcome = null;
    autoSave();
    stateMachine.change('OVERWORLD');
  }

  /** Check if the player can still send out a Pokemon (roster member alive OR roster not full) */
  function hasUsablePartyPokemon(): boolean {
    if (!hasActiveGame()) return false;
    const pd = getPlayerData();
    // Check if any roster Pokemon (other than current) is still alive
    for (const idx of battleRoster) {
      if (idx !== activePartyIndex && pd.party[idx] && pd.party[idx].hp > 0) return true;
    }
    // Check if roster can grow and there's a healthy non-roster Pokemon
    if (battleRoster.size < maxRosterSize) {
      return pd.party.some((p, i) => !battleRoster.has(i) && p.hp > 0);
    }
    return false;
  }

  /** Check if a party index is eligible for switching into battle */
  function canSwitchTo(partyIndex: number): boolean {
    if (canUseOpeningSoloSwitch(partyIndex)) return true;
    if (isTrainerBattle && maxRosterSize === 1) return false;
    if (battleRoster.has(partyIndex)) return true;  // Already in roster
    return battleRoster.size < maxRosterSize;        // New slot available
  }

  function handleMainChoice(choice: MainMenuChoice): void {
    audio.playSFX('menu-select');
    if (choice === 'FIGHT') { enterSelectMovePhase(); }
    else if (choice === 'BAG') {
      setBagMode('battle');
      clearPendingItem();
      waitingForBag = true;
      phase = 'WAITING_BAG';
      stateMachine.push('BAG');
    }
    else if (choice === 'POKEMON') {
      if (hasActiveGame()) {
        const pd = getPlayerData();
        const hasOther = pd.party.some((p, i) => i !== activePartyIndex && p.hp > 0 && canSwitchTo(i));
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
    else if (choice === 'RUN') {
      if (isTrainerBattle) {
        textBox = createTextBox([t('battle.cantRunTrainer')], isRTL()); phase = 'INTRO';
      } else {
        startPlayerRetreatAnimation();
        textBox = createTextBox([t('battle.gotAway')], isRTL()); phase = 'RUN';
      }
    }
    else { textBox = createTextBox([t('battle.cantDoThat')], isRTL()); phase = 'INTRO'; }
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
      if (captureSuccessFx) updateCaptureSuccessEffect(captureSuccessFx, dt);
      if (sendOutFx) updateSendOutEffect(sendOutFx, dt);
      if (attackFx) {
        updateAttackEffect(attackFx, dt);
        if (!attackFx.active) attackFx = null;
      }
      if (statusTurnFx) {
        updateStatusTurnEffect(statusTurnFx, dt);
        if (!statusTurnFx.active) statusTurnFx = null;
      }
      animationDirector.update(dt);
      updateHPBar(playerHpBar, dt); updateHPBar(enemyHpBar, dt); updatePopups(dt);

      switch (phase) {
        case 'INTRO': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            showTrainerSprite = false;
          }
          if (!textBox) {
            if (pendingEnemySendOutAnimation) {
              if (!animationDirector.isBusy()) startEnemySendOutAnimation();
              break;
            }
            if (pendingPlayerSendOutAnimation) {
              if (!animationDirector.isBusy()) startPlayerSendOutAnimation();
              break;
            }
            if (animationDirector.isBusy()) {
              break;
            }
            turnNumber++;
            menu.turnNumber = turnNumber;
            menu.playerPokemon = player;
            if (hasActiveGame()) menu.party = getPlayerData().party;
            pendingTurnCredit = true;
            enterSelectMovePhase();
          }
          break;
        }
        case 'SELECT_ACTION': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'main') {
            handleMainChoice(r.choice);
          }
          break;
        }
        case 'SELECT_MOVE': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'main') {
            // Number shortcut (2=switch, 3=bag) pressed from move grid
            handleMainChoice(r.choice);
          } else if (r?.type === 'move') {
            if (r.index === -1) { phase = 'SELECT_ACTION'; showMainMenu(menu); }
            else {
              selMove = r.index;
              const m = player.moves[selMove];
              if (m.currentPp <= 0) { textBox = createTextBox([t('battle.noPP')], isRTL()); phase = 'INTRO'; }
              else {
                enemySelectedMoveIndex = chooseEnemyMoveIndex(enemy);
                const enemyMove = enemy.moves[enemySelectedMoveIndex] ?? enemy.moves[0];
                const turnOrder = determineTurnOrder(
                  player,
                  playerBattleState,
                  m.id,
                  enemy,
                  enemyBattleState,
                  enemyMove.id,
                );
                enemyGoesFirst = turnOrder.enemyActsFirst;
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
          if (!textBox && !animationDirector.isBusy() && !attackFx && !isHPAnimating(enemyHpBar)) phase = 'CHECK_WIN';
          break;
        }
        case 'ENEMY_TURN': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !animationDirector.isBusy() && !attackFx && !isHPAnimating(playerHpBar)) {
            if (player.hp <= 0) {
              const consolationXp = awardConsolationXp(player, activePartyIndex);
              handlePlayerFaintAfterAction(consolationXp);
            } else if (enemyGoesFirst) {
              // Enemy went first, now player attacks with pre-selected move
              enemyGoesFirst = false;
              enemyAlreadyAttacked = true;
              doAttack();
            } else {
              startEndTurnStatusPhase();
            }
          }
          break;
        }
        case 'CHECK_WIN': {
          if (enemy.hp <= 0) {
            startEnemyFaintAnimation();
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
            // Enemy already attacked this turn
            enemyAlreadyAttacked = false;
            startEndTurnStatusPhase();
          }
          else enemyTurn();
          break;
        }
        case 'END_TURN_STATUS': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !animationDirector.isBusy() && !attackFx
            && !isHPAnimating(playerHpBar) && !isHPAnimating(enemyHpBar)) {
            if (enemy.hp <= 0) {
              phase = 'CHECK_WIN';
            } else if (player.hp <= 0) {
              handlePlayerFaintAfterAction();
            } else {
              pendingTurnCredit = true;
              enterSelectMovePhase();
            }
          }
          break;
        }
        case 'TRAINER_NEXT_POKEMON': {
          // Shows "fainted" text, then transitions to XP phase
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy()) {
            xpGained = getDefeatXpReward();
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
              if (startPendingEvolution('TRAINER_NEXT_XP')) break;
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
            if (startMoveLearning('TRAINER_NEXT_LEVEL_UP_MOVES')) break;
            if (!showNextLearnedMove('TRAINER_NEXT_LEVEL_UP_MOVES')) {
              if (startPendingEvolution('TRAINER_NEXT_XP')) break;
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
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy()) {
            xpGained = getDefeatXpReward(); player.xp += xpGained;
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
              if (startPendingEvolution('TRAINER_REWARD')) break;
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
            if (startMoveLearning('TRAINER_REWARD_LEVEL_UP_MOVES')) break;
            if (!showNextLearnedMove('TRAINER_REWARD_LEVEL_UP_MOVES')) {
              if (startPendingEvolution('TRAINER_REWARD')) break;
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
              if (startPendingEvolution('XP_GAIN')) break;
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
            if (startMoveLearning('LEVEL_UP_MOVES')) break;
            if (!showNextLearnedMove('LEVEL_UP_MOVES')) {
              if (startPendingEvolution('XP_GAIN')) break;
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
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; }
          if (!textBox && !animationDirector.isBusy() && !fade) { fade = createFade(false, 0.5); }
          if (!textBox && fade && !fade.active) goBack();
          break;
        }
        case 'LOSE': {
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; }
          if (!textBox && !animationDirector.isBusy() && !fade) {
            if (!lossDialogueShown) {
              const outcome = pendingLossOutcome ?? (isTrainerBattle ? 'trainer-whiteout' : 'wild-whiteout');
              textBox = createTextBox(buildLossDialogue(outcome), isRTL());
              lossDialogueShown = true;
            } else {
              fade = createFade(false, 0.5);
            }
          }
          if (!textBox && fade && !fade.active) handleLoss();
          break;
        }
        case 'PLAYER_FAINT_SWITCH': {
          // Active Pokemon fainted but roster has usable Pokemon — force switch
          if (textBox && updateTextBox(textBox, input, dt)) { textBox = null; }
          if (!textBox && !animationDirector.isBusy()) {
            setPartyMode('battle');
            clearSelectedPartyIndex();
            previousLeadId = player.id;
            waitingForParty = true;
            phase = 'WAITING_PARTY';
            stateMachine.push('PARTY');
          }
          break;
        }
        case 'TRAINER_LOSS': {
          if (!pendingLossOutcome) beginLoss('trainer-roster');
          phase = 'LOSE';
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
              enterSelectMovePhase();
            }
          } else {
            // No item selected (user pressed Esc in bag)
            enterSelectMovePhase();
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
            } else if (chosenIndex === activePartyIndex) {
              textBox = createTextBox([t('battle.alreadyActive')], isRTL()); phase = 'INTRO';
            } else if (!canSwitchTo(chosenIndex)) {
              textBox = createTextBox([t('battle.rosterFull')], isRTL()); phase = 'INTRO';
            } else {
              const isSoloOpeningSwitch = canUseOpeningSoloSwitch(chosenIndex);
              if (isSoloOpeningSwitch) {
                battleRoster = new Set([chosenIndex]);
                soloOpeningSwitchUsed = true;
              } else {
                battleRoster.add(chosenIndex);
              }
              if (!battleTurnCounts.has(chosenIndex)) battleTurnCounts.set(chosenIndex, 0);
              activePartyIndex = chosenIndex;
              player = pd.party[activePartyIndex];
              playerBattleState = createBattleRuntimeStateForPokemon(player);
              playerHpBar = createHPBar(player.id, player.level, player.hp, player.maxHp,
                BTL.PLY_BAR_X, BTL.PLY_BAR_BOTTOM - 18, true, player.xp, player.xpToNext);
              setStatus(playerHpBar, player.status ?? '');
              menu = createBattleMenu(player.moves);
              menu.playerPokemon = player;
              menu.party = hasActiveGame() ? getPlayerData().party : [player];
              loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
              animationDirector.setActorState('player', {
                x: -24,
                y: 8,
                scaleX: 0.6,
                scaleY: 0.6,
                alpha: 0,
                rotation: 0.14,
                visible: false,
              });
              const switchMsgs: string[] = [];
              // Only say "come back" if the previous Pokemon isn't fainted
              const prevPokemon = pd.party.find(p => p.id === previousLeadId);
              if (prevPokemon && prevPokemon.hp > 0) {
                switchMsgs.push(t('battle.comeBack', { name: getPokemonDisplayName(previousLeadId!) }));
              }
              switchMsgs.push(t('battle.goName', { name: getPokemonDisplayName(player.id) }));
              textBox = createTextBox(switchMsgs, isRTL());
              pendingPlayerSendOutAnimation = true;
              phase = 'SWITCH_POKEMON';
            }
          } else {
            clearSelectedPartyIndex();
            if (player.hp <= 0) {
              // Active Pokemon is fainted — must switch, can't cancel
              setPartyMode('battle');
              clearSelectedPartyIndex();
              waitingForParty = true;
              stateMachine.push('PARTY');
            } else {
              // No selection (user pressed Esc in party)
              enterSelectMovePhase();
            }
          }
          previousLeadId = null;
          break;
        }
        case 'SWITCH_POKEMON': {
          // Show the switch text, then enemy gets a turn
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (pendingPlayerSendOutAnimation) {
              startPlayerSendOutAnimation();
            }
          }
          if (!textBox && !animationDirector.isBusy()) {
            enemySelectedMoveIndex = -1;
            enemyTurn();
          }
          break;
        }
        case 'WAITING_MOVE_LEARN': {
          if (!pendingMoveLearningResolution || !pendingMoveLearningPhase) break;
          const resolution = pendingMoveLearningResolution;
          const resumePhase = pendingMoveLearningPhase;
          pendingMoveLearningResolution = null;
          pendingMoveLearningPhase = null;
          refreshPlayerMoveState();
          const followUpText = getMoveLearningResolutionMessage(player.id, resolution);
          if (followUpText) {
            textBox = createTextBox([followUpText], isRTL());
            phase = resumePhase;
          } else if (!showNextLearnedMove(resumePhase)) {
            if (resumePhase === 'TRAINER_NEXT_LEVEL_UP_MOVES') {
              if (startPendingEvolution('TRAINER_NEXT_XP')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_NEXT_XP';
              } else {
                sendOutNextTrainerPokemon();
              }
            } else if (resumePhase === 'TRAINER_REWARD_LEVEL_UP_MOVES') {
              if (startPendingEvolution('TRAINER_REWARD')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_REWARD';
              } else {
                awardTrainerReward();
              }
            } else if (resumePhase === 'LEVEL_UP_MOVES') {
              if (startPendingEvolution('XP_GAIN')) break;
              if (player.xp > 0) {
                phase = 'XP_GAIN';
              } else {
                fade = createFade(false, 0.5); phase = 'RUN';
              }
            }
          }
          break;
        }
        case 'USE_ITEM': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !isHPAnimating(playerHpBar)) enemyTurn();
          break;
        }
        case 'CAPTURE_ANIM': {
          if (!animationDirector.isBusy()) finishCaptureAnimation();
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
            renderActorImage(ctx, 'trainer', tImg, BTL.OPP_SPRITE.x, 4, 48, 68);
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
          renderActorImage(ctx, 'enemy', enemySprite, BTL.OPP_SPRITE.x, BTL.OPP_SPRITE.y,
            BTL.OPP_SPRITE.w, BTL.OPP_SPRITE.h);
        }
      }

      // ── Player Pokemon sprite (left side) ──
      const playerSprite = getCachedImage(`/sprites/pokemon/back/${player.id}.png`);
      if (playerSprite) {
        renderActorImage(ctx, 'player', playerSprite, BTL.PLY_SPRITE.x, BTL.PLY_SPRITE.y,
          BTL.PLY_SPRITE.w, BTL.PLY_SPRITE.h);
      }

      renderBallActor(ctx);
      if (attackFx) {
        renderAttackEffect(ctx, attackFx);
      }
      if (statusTurnFx) {
        renderStatusTurnEffect(ctx, statusTurnFx);
      }

      // ── Info panels ──
      setXP(playerHpBar, player.xp, player.xpToNext);
      const playerParty = hasActiveGame() ? getPlayerData().party : null;
      renderHPBar(ctx, enemyHpBar, isTrainerBattle && trainerData
        ? { party: trainerData.party, totalSlots: trainerData.party.length, revealedCount: trainerPartyIndex }
        : undefined);
      renderHPBar(ctx, playerHpBar, playerParty
        ? { party: playerParty, totalSlots: 6 }
        : undefined);

      // ── Effects ──
      if (levelUpFx) renderLevelUpEffect(ctx, levelUpFx);
      if (captureSuccessFx) renderCaptureSuccessEffect(ctx, captureSuccessFx);
      if (sendOutFx) renderSendOutEffect(ctx, sendOutFx);
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

  function renderActorImage(
    ctx: CanvasRenderingContext2D,
    actor: 'player' | 'enemy' | 'trainer',
    image: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const state = animationDirector.getActorState(actor);
    if (!state.visible || state.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha *= state.alpha;
    ctx.translate(x + w / 2 + state.x, y + h / 2 + state.y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scaleX, state.scaleY);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function renderBallActor(ctx: CanvasRenderingContext2D): void {
    if (!activeBallId) return;

    const state = animationDirector.getActorState('ball');
    if (!state.visible || state.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha *= state.alpha;
    ctx.translate(state.x, state.y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scaleX, state.scaleY);
    drawPokeballIcon(ctx, activeBallId, -7, -7, 14);
    ctx.restore();
  }

}

function fallbackPlayer(): Pokemon {
  const data = getPokemon(1); // Bulbasaur
  return data ? createPokemonFromData(data, 5) : createPokemonFromData(getPokemon(1)!, 5);
}

function fallbackEnemy(): Pokemon {
  const data = getPokemon(16); // Pidgey
  return data ? createPokemonFromData(data, 3) : createPokemonFromData(getPokemon(16)!, 3);
}
