import type { AudioManager } from '../../../audio/audio-manager';
import { BTL } from '../../../data/battle-constants';
import { getMove } from '../../../services/pokemon-data';
import { getAttackAnimationProfile } from '../../../systems/move-animation';
import type { Pokemon } from '../../../types';
import {
  callStep,
  parallelStep,
  sequenceStep,
  tweenActorStep,
  waitStep,
  type BattleAnimationDirector,
  type BattleAnimationStep,
} from '../../../ui/battle-animation-director';
import { createAttackEffect } from '../../../ui/battle-animations';

  // Families that create the effect at animation start (not at impact time)
  const START_FX_FAMILIES = new Set([
    'projectile',
    'beam',
    'dragon-aura',
    'flamethrower',
    'leaf-spray',
    'water-flow',
    'surf-wave',
    'psychic-wave',
    'rock-throw',
    'rock-slide',
    'fire-blast',
    'giga-drain',
    'lightning',
    'vine-whip',
    'heal-pulse',
    'double-team',
    'solar-beam',
    'rapid-spin',
    'twister-spin',
    'icy-wind',
    'electroweb',
    'protect-shield',
    'smoke-screen',
    'mist-veil',
    'haze-clear',
    'punch',
    'powder',
    'shadow-ball',
    'bite',
    'night-shade',
  ]);


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

export function playAttackAnimation(
  attackerActor: 'player' | 'enemy',
  defenderActor: 'player' | 'enemy',
  move: Pokemon['moves'][number],
  onImpact: () => void,
  hitTarget = true,
    hitCount = 1,
  attackerPokemon: Pokemon,
  animationDirector: BattleAnimationDirector,
    audio: AudioManager,
  attackFx: ReturnType<typeof createAttackEffect> | null = null;
): void {
  const moveData = getMove(move.id);
//   const attackerPokemon = attackerActor === 'player' ? player : enemy;
  const profile = getAttackAnimationProfile({
    name: moveData?.name ?? { en: move.name, he: move.name },
    type: move.type,
    power: move.power,
    damageClass: moveData?.damageClass ?? (move.power > 0 ? 'physical' : 'status'),
    speciesId: attackerPokemon.id,
  });

  if (hitCount <= 1) {
    audio.playMoveSFX(move.name);
  }

  const attackerStart = { ...animationDirector.getActorState(attackerActor) };
  const defenderStart = { ...animationDirector.getActorState(defenderActor) };
  const source = getAttackAnchor(attackerActor, animationDirector);
  const target = profile.selfTarget
    ? getAttackAnchor(attackerActor, animationDirector)
    : getAttackAnchor(defenderActor, animationDirector);
  const lungeOffset = attackerActor === 'player' ? 12 : -12;
  const recoilOffset = defenderActor === 'player' ? -6 : 6;
  const recoveryDuration = Math.max(0.12, profile.duration - profile.impactTime);

  // the state variable responsible for the animation itself
  attackFx = null;

  // --- Multi-hit lunge: repeat lunge+sfx N times, then call onImpact ---
  if (hitCount > 1 && profile.family === 'lunge') {
    const hitTime = Math.max(0.07, profile.impactTime * 0.6);
    const steps: BattleAnimationStep[] = [];
    for (let i = 0; i < hitCount; i++) {
      const isLastHit = i === hitCount - 1;
      steps.push(
        tweenActorStep(
          attackerActor,
          {
            x: attackerStart.x + lungeOffset,
            y: attackerStart.y - 2,
            rotation: attackerStart.rotation + (attackerActor === 'player' ? -0.06 : 0.06),
          },
          hitTime,
          'easeInOut',
        ),
      );
      const capturedIsLast = isLastHit;
      steps.push(
        callStep(() => {
          if (hitTarget) {
            audio.playMoveSFX(move.name);
            flash = createFlash(profile.flashColor, 0.1);
            shake = createShake(profile.shakeIntensity * 0.75, 0.15);
            // audio.playSFX('hit');
          }
          if (capturedIsLast) onImpact();
        }),
      );
      steps.push(
        parallelStep(
          hitTarget
            ? sequenceStep(
                tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.06, 'easeInOut'),
                tweenActorStep(defenderActor, defenderStart, 0.07, 'easeInOut'),
              )
            : waitStep(0.13),
          tweenActorStep(attackerActor, attackerStart, 0.09, 'easeInOut'),
        ),
      );
    }
    animationDirector.play(sequenceStep(...steps));
    return;
  }

  // --- Special: Rapid Spin — attacker pokemon spins fast ---
  if (profile.family === 'rapid-spin') {
    animationDirector.play(
      sequenceStep(
        callStep(() => {
          attackFx = createAttackEffect({
            kind: 'rapid-spin',
            sourceX: source.x,
            sourceY: source.y,
            targetX: target.x,
            targetY: target.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.duration,
          });
        }),
        parallelStep(
          tweenActorStep(
            attackerActor,
            {
              scaleX: attackerStart.scaleX * 0.82,
              scaleY: attackerStart.scaleY * 0.82,
              rotation: attackerStart.rotation + Math.PI * 6,
            },
            profile.impactTime,
            'linear',
          ),
        ),
        callStep(() => {
          onImpact();
        }),
        parallelStep(
          hitTarget
            ? sequenceStep(
                tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.07, 'easeInOut'),
                tweenActorStep(defenderActor, defenderStart, 0.1, 'easeInOut'),
              )
            : waitStep(0.17),
          tweenActorStep(attackerActor, { ...attackerStart, rotation: attackerStart.rotation }, 0.15, 'easeOut'),
        ),
      ),
    );
    return;
  }

  // --- Special: Twister Spin — target pokemon spins, vortex effect ---
  if (profile.family === 'twister-spin') {
    animationDirector.play(
      sequenceStep(
        callStep(() => {
          attackFx = createAttackEffect({
            kind: 'twister-spin',
            sourceX: source.x,
            sourceY: source.y,
            targetX: target.x,
            targetY: target.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.duration,
          });
        }),
        parallelStep(
          tweenActorStep(
            defenderActor,
            {
              scaleX: defenderStart.scaleX * 0.85,
              scaleY: defenderStart.scaleY * 0.85,
              rotation: defenderStart.rotation + Math.PI * 4,
            },
            profile.impactTime,
            'linear',
          ),
        ),
        callStep(() => {
          onImpact();
        }),
        tweenActorStep(defenderActor, { ...defenderStart, rotation: defenderStart.rotation }, 0.18, 'easeOut'),
      ),
    );
    return;
  }

  // --- Special: Double Team — ghost clone burst, attacker briefly fades ---
  if (profile.family === 'double-team') {
    const dtSprite = getCachedImage(`/sprites/pokemon/back/${attackerPokemon.id}.png`) ?? null;
    animationDirector.play(
      sequenceStep(
        callStep(() => {
          attackFx = createAttackEffect({
            kind: 'double-team',
            sourceX: source.x,
            sourceY: source.y,
            targetX: source.x,
            targetY: source.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.duration,
            spriteImage: dtSprite,
          });
        }),
        parallelStep(tweenActorStep(attackerActor, { alpha: 0.45 }, 0.18, 'easeInOut')),
        tweenActorStep(attackerActor, attackerStart, 0.2, 'easeInOut'),
        callStep(() => {
          onImpact();
        }),
        waitStep(0.15),
      ),
    );
    return;
  }

  // --- Self-boost (harden/defense curl) — quick white flash, subtle scale pulse ---
  if (profile.family === 'self-boost') {
    animationDirector.play(
      sequenceStep(
        parallelStep(
          tweenActorStep(
            attackerActor,
            { scaleX: attackerStart.scaleX * 1.08, scaleY: attackerStart.scaleY * 1.08 },
            0.1,
            'easeOut',
          ),
          callStep(() => {
            flash = createFlash('#ffffff', 0.18);
            attackFx = createAttackEffect({
              kind: 'pulse',
              sourceX: source.x,
              sourceY: source.y,
              targetX: source.x,
              targetY: source.y,
              color: '#e8e8ff',
              accentColor: '#ffffff',
              duration: 0.28,
            });
          }),
        ),
        tweenActorStep(attackerActor, attackerStart, 0.18, 'easeInOut'),
        callStep(() => {
          onImpact();
        }),
        waitStep(0.1),
      ),
    );
    return;
  }

  // --- Cool self boost (dragon dance etc.) — slow spin with sparkle burst ---
  if (profile.family === 'self-boost-cooler') {
    animationDirector.play(
      sequenceStep(
        callStep(() => {
          attackFx = createAttackEffect({
            kind: 'dragon-aura',
            sourceX: source.x,
            sourceY: source.y,
            targetX: source.x,
            targetY: source.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: 0.55,
          });
        }),
        parallelStep(
          tweenActorStep(
            attackerActor,
            {
              rotation: attackerStart.rotation + (attackerActor === 'player' ? -0.25 : 0.25),
              scaleX: attackerStart.scaleX * 1.12,
              scaleY: attackerStart.scaleY * 1.12,
            },
            0.28,
            'easeOut',
          ),
          sequenceStep(
            waitStep(0.1),
            callStep(() => {
              flash = createFlash(profile.color, 0.22);
            }),
          ),
        ),
        parallelStep(tweenActorStep(attackerActor, attackerStart, 0.22, 'easeInOut')),
        callStep(() => {
          onImpact();
        }),
        waitStep(0.12),
      ),
    );
    return;
  }

  animationDirector.play(
    sequenceStep(
      callStep(() => {
        if (START_FX_FAMILIES.has(profile.family)) {
          attackFx = createAttackEffect({
            kind: profile.family as Parameters<typeof createAttackEffect>[0]['kind'],
            sourceX: source.x,
            sourceY: source.y,
            targetX: target.x,
            targetY: target.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.duration,
            variant: profile.variant,
            power: move.power > 0 ? move.power : undefined,
          });
        }
      }),
      profile.family === 'lunge'
        ? tweenActorStep(
            attackerActor,
            {
              x: attackerStart.x + lungeOffset,
              y: attackerStart.y - 2,
              rotation: attackerStart.rotation + (attackerActor === 'player' ? -0.08 : 0.08),
            },
            profile.impactTime,
            'easeInOut',
          )
        : waitStep(profile.impactTime),
      callStep(() => {
        if (
          profile.family === 'pulse' ||
          profile.family === 'burst' ||
          profile.family === 'lunge' ||
          profile.family === 'earthquake'
        ) {
          attackFx = createAttackEffect({
            kind: profile.family === 'lunge' ? 'burst' : profile.family,
            sourceX: source.x,
            sourceY: source.y,
            targetX: target.x,
            targetY: target.y,
            color: profile.color,
            accentColor: profile.accentColor,
            duration: profile.family === 'lunge' ? 0.2 : profile.family === 'earthquake' ? profile.duration : undefined,
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
    ),
  );
}
