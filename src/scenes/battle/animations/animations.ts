import type { AudioManager } from '../../../audio/audio-manager';
import { BTL } from '../../../data/battle-constants';
import { getMove } from '../../../services/pokemon-data';
import { getAttackAnimationProfile } from '../../../systems/move-animation';
import type { Pokemon } from '../../../types';
import type { BattleAnimationDirector } from '../../../ui/battle-animation-director.js';
import type { createAttackEffect, createFlash, createShake } from '../../../ui/battle-animations.js';
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

// battle/animation/play-attack-animation.ts
export interface BattleAnimationContext {
  attackFx: ReturnType<typeof createAttackEffect> | null;
  flash: ReturnType<typeof createFlash> | null;
  shake: ReturnType<typeof createShake> | null;
  textBox: any;
  phase: string;
  phaseTimer: number;
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

  // הפעלת האודיו ב-0ms למהלכים רגילים (כפי שתיקנו קודם)
  if (hitCount <= 1) audio.playMoveSFX(move.name);

  // הכנת הארגומנטים המשותפים
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

  // שליפה מה-Registry והפעלה
  const specialAnimation = ANIMATION_FAMILIES[profile.family];

  if (specialAnimation) {
    specialAnimation(args);
  } else {
    playDefaultFamilyAnimation(args);
  }
}
