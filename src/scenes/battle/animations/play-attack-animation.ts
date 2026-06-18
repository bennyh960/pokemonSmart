// scenes/battle/animations/play-attack-animation.ts
import type { AudioManager } from '../../../audio/audio-manager.js';
import { BTL } from '../../../data/battle-constants.js';
import { getMove } from '../../../services/pokemon-data.js';
import type { BattlePokemonRuntimeState } from '../../../systems/battle-state.js';
import { getAttackAnimationProfile } from '../../../systems/move-animation.js';
import type { Pokemon } from '../../../types/index.js';
import type { BattleAnimationDirector } from '../../../ui/battle-animation-director.js';
import type { createAttackEffect, createFlash, createShake } from '../../../ui/battle-animations.js';
import type { createHPBar } from '../../../ui/hp-bar.js';
import type { createTextBox } from '../../../ui/text-box.js';
import type { BattlePhase } from '../battle_scene.js';
import { ANIMATION_FAMILIES, playDefaultFamilyAnimation, type AnimationArgs } from './animation-families.js';

function getAttackAnchor(
  actor: 'player' | 'enemy',
  animationDirector: BattleAnimationDirector,
): { x: number; y: number } {
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

export interface BattleAnimationContext {
  // Visual states
  attackFx: ReturnType<typeof createAttackEffect> | null;
  flash: ReturnType<typeof createFlash> | null;
  shake: ReturnType<typeof createShake> | null;

  // Scene orchestration states
  textBox: ReturnType<typeof createTextBox> | null;
  phase: BattlePhase;
  phaseTimer: number;

  // Game state dependencies
  player: Pokemon;
  enemy: Pokemon;
  playerBattleState: BattlePokemonRuntimeState;
  enemyBattleState: BattlePokemonRuntimeState;
  playerHpBar: ReturnType<typeof createHPBar>;
  enemyHpBar: ReturnType<typeof createHPBar>;

  // Infrastructure engines
  animationDirector: BattleAnimationDirector;
  audio: AudioManager;
  rtl: boolean;
}

export function playAttackAnimation(
  attackerPokemon: Pokemon,
  attackerActor: 'player' | 'enemy',
  defenderActor: 'player' | 'enemy',
  move: Pokemon['moves'][number],
  animationDirector: BattleAnimationDirector,
  audio: AudioManager,
  battleAnimationContext: BattleAnimationContext,
  onImpact: () => void,
  hitTarget = true,
  hitCount = 1,
): void {
  const moveData = getMove(move.id);
  const profile = getAttackAnimationProfile({
    name: moveData?.name ?? { en: move.name, he: move.name },
    type: move.type,
    power: move.power,
    damageClass: moveData?.damageClass ?? (move.power > 0 ? 'physical' : 'status'),
    speciesId: attackerPokemon.id,
  });

  if (hitCount <= 1) audio.playMoveSFX(move.name);

  const args: AnimationArgs = {
    attackerActor,
    defenderActor,
    attackerPokemon,
    profile,
    move,
    animationDirector,
    hitTarget,
    hitCount,
    onImpact,
    source: getAttackAnchor(attackerActor, animationDirector),
    target: profile.selfTarget
      ? getAttackAnchor(attackerActor, animationDirector)
      : getAttackAnchor(defenderActor, animationDirector),
    attackerStart: { ...animationDirector.getActorState(attackerActor) },
    defenderStart: { ...animationDirector.getActorState(defenderActor) },
    context: battleAnimationContext,
  };

  const specialAnimation = ANIMATION_FAMILIES[profile.family];
  console.log('DEBUG ROCK SLIDE FROM PLAY ATTACK ANIMATION', { args, specialAnimation });

  if (specialAnimation) {
    specialAnimation(args);
  } else {
    playDefaultFamilyAnimation(args);
  }
}
