// battle/animation/animation-families.ts

import { getCachedImage } from '../../../engine/sprite-loader';
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
import { createAttackEffect, createFlash, createShake } from '../../../ui/battle-animations';
import type { BattleAnimationContext } from './play-attack-animation';

// Families that create the effect at animation start (not at impact time)
export const START_FX_FAMILIES = new Set([
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

export interface AnimationArgs {
  attackerActor: 'player' | 'enemy';
  defenderActor: 'player' | 'enemy';
  profile: any;
  move: any;
  animationDirector: BattleAnimationDirector;
  attackerPokemon: Pokemon;
  source: { x: number; y: number };
  target: { x: number; y: number };
  attackerStart: any;
  defenderStart: any;
  context: BattleAnimationContext;
  onImpact: () => void;
  hitTarget: boolean;
  hitCount: number;
}

export const ANIMATION_FAMILIES: Record<string, (args: AnimationArgs) => void> = {
  'rapid-spin': (args) => {
    // Note: lungeOffset is declared but unused in the original rapid-spin logic,
    // keeping it or removing it is fine.
    const recoilOffset = args.defenderActor === 'player' ? -6 : 6;

    args.animationDirector.play(
      sequenceStep(
        callStep(() => {
          args.context.attackFx = createAttackEffect({
            kind: 'rapid-spin',
            sourceX: args.source.x,
            sourceY: args.source.y,
            targetX: args.target.x,
            targetY: args.target.y,
            color: args.profile.color,
            accentColor: args.profile.accentColor,
            duration: args.profile.duration,
          });
        }),
        parallelStep(
          tweenActorStep(
            args.attackerActor,
            {
              scaleX: args.attackerStart.scaleX * 0.82,
              scaleY: args.attackerStart.scaleY * 0.82,
              rotation: args.attackerStart.rotation + Math.PI * 6,
            },
            args.profile.impactTime,
            'linear',
          ),
        ),
        callStep(() => args.onImpact()),
        parallelStep(
          args.hitTarget
            ? sequenceStep(
                tweenActorStep(args.defenderActor, { x: args.defenderStart.x + recoilOffset }, 0.07, 'easeInOut'),
                tweenActorStep(args.defenderActor, args.defenderStart, 0.1, 'easeInOut'),
              )
            : waitStep(0.17),
          tweenActorStep(
            args.attackerActor,
            { ...args.attackerStart, rotation: args.attackerStart.rotation },
            0.15,
            'easeOut',
          ),
        ),
      ),
    );
  },

  'twister-spin': (args) => {
    args.animationDirector.play(
      sequenceStep(
        callStep(() => {
          args.context.attackFx = createAttackEffect({
            kind: 'twister-spin',
            sourceX: args.source.x,
            sourceY: args.source.y,
            targetX: args.target.x,
            targetY: args.target.y,
            color: args.profile.color,
            accentColor: args.profile.accentColor,
            duration: args.profile.duration,
          });
        }),
        parallelStep(
          tweenActorStep(
            args.defenderActor,
            {
              scaleX: args.defenderStart.scaleX * 0.85,
              scaleY: args.defenderStart.scaleY * 0.85,
              rotation: args.defenderStart.rotation + Math.PI * 4,
            },
            args.profile.impactTime,
            'linear',
          ),
        ),
        callStep(() => args.onImpact()),
        tweenActorStep(
          args.defenderActor,
          { ...args.defenderStart, rotation: args.defenderStart.rotation },
          0.18,
          'easeOut',
        ),
      ),
    );
  },

  'double-team': (args) => {
    const dtSprite = getCachedImage(`/sprites/pokemon/back/${args.attackerPokemon.id}.png`) ?? null;

    args.animationDirector.play(
      sequenceStep(
        callStep(() => {
          args.context.attackFx = createAttackEffect({
            kind: 'double-team',
            sourceX: args.source.x,
            sourceY: args.source.y,
            targetX: args.source.x,
            targetY: args.source.y,
            color: args.profile.color,
            accentColor: args.profile.accentColor,
            duration: args.profile.duration,
            spriteImage: dtSprite,
          });
        }),
        parallelStep(tweenActorStep(args.attackerActor, { alpha: 0.45 }, 0.18, 'easeInOut')),
        tweenActorStep(args.attackerActor, args.attackerStart, 0.2, 'easeInOut'),
        callStep(() => {
          args.onImpact();
        }),
        waitStep(0.15),
      ),
    );
  },
  'self-boost': (args) => {
    args.animationDirector.play(
      sequenceStep(
        parallelStep(
          tweenActorStep(
            args.attackerActor,
            { scaleX: args.attackerStart.scaleX * 1.08, scaleY: args.attackerStart.scaleY * 1.08 },
            0.1,
            'easeOut',
          ),
          callStep(() => {
            args.context.flash = createFlash('#ffffff', 0.18);
            args.context.attackFx = createAttackEffect({
              kind: 'pulse',
              sourceX: args.source.x,
              sourceY: args.source.y,
              targetX: args.source.x,
              targetY: args.source.y,
              color: '#e8e8ff',
              accentColor: '#ffffff',
              duration: 0.28,
            });
          }),
        ),
        tweenActorStep(args.attackerActor, args.attackerStart, 0.18, 'easeInOut'),
        callStep(() => {
          args.onImpact();
        }),
        waitStep(0.1),
      ),
    );
  },
  'self-boost-cooler': (args) => {
    args.animationDirector.play(
      sequenceStep(
        callStep(() => {
          args.context.attackFx = createAttackEffect({
            kind: 'dragon-aura',
            sourceX: args.source.x,
            sourceY: args.source.y,
            targetX: args.source.x,
            targetY: args.source.y,
            color: args.profile.color,
            accentColor: args.profile.accentColor,
            duration: 0.55,
          });
        }),
        parallelStep(
          tweenActorStep(
            args.attackerActor,
            {
              rotation: args.attackerStart.rotation + (args.attackerActor === 'player' ? -0.25 : 0.25),
              scaleX: args.attackerStart.scaleX * 1.12,
              scaleY: args.attackerStart.scaleY * 1.12,
            },
            0.28,
            'easeOut',
          ),
          sequenceStep(
            waitStep(0.1),
            callStep(() => {
              args.context.flash = createFlash(args.profile.color, 0.22);
            }),
          ),
        ),
        parallelStep(tweenActorStep(args.attackerActor, args.attackerStart, 0.22, 'easeInOut')),
        callStep(() => {
          args.onImpact();
        }),
        waitStep(0.12),
      ),
    );
  },

  lunge: (args) => {
    if (args.hitCount <= 1) {
      playDefaultFamilyAnimation(args);
      return;
    }
    const lungeOffset = args.attackerActor === 'player' ? 12 : -12;
    const recoilOffset = args.defenderActor === 'player' ? -6 : 6;
    const hitTime = Math.max(0.07, args.profile.impactTime * 0.6);
    const steps: BattleAnimationStep[] = [];

    for (let i = 0; i < args.hitCount; i++) {
      const isLastHit = i === args.hitCount - 1;
      steps.push(
        tweenActorStep(
          args.attackerActor,
          {
            x: args.attackerStart.x + lungeOffset,
            y: args.attackerStart.y - 2,
            rotation: args.attackerStart.rotation + (args.attackerActor === 'player' ? -0.06 : 0.06),
          },
          hitTime,
          'easeInOut',
        ),
      );
      steps.push(
        callStep(() => {
          if (args.hitTarget) {
            args.context.audio.playMoveSFX(args.move.name);
            args.context.flash = createFlash(args.profile.flashColor, 0.1);
            args.context.shake = createShake(args.profile.shakeIntensity * 0.75, 0.15);
          }
          if (isLastHit) args.onImpact();
        }),
      );
      steps.push(
        parallelStep(
          args.hitTarget
            ? sequenceStep(
                tweenActorStep(args.defenderActor, { x: args.defenderStart.x + recoilOffset }, 0.06, 'easeInOut'),
                tweenActorStep(args.defenderActor, args.defenderStart, 0.07, 'easeInOut'),
              )
            : waitStep(0.13),
          tweenActorStep(args.attackerActor, args.attackerStart, 0.09, 'easeInOut'),
        ),
      );
    }
    args.animationDirector.play(sequenceStep(...steps));
  },
};

export function playDefaultFamilyAnimation(args: AnimationArgs): void {
  // 1. Calculate a dynamic multiplier based on move power (base power ranges roughly from 40 to 120+)
  // A power of 40 yields a 1.0x multiplier, while a power of 100 yields a 2.0x multiplier.
  const powerScale = args.move.power > 0 ? Math.max(1, args.move.power / 50) : 1;

  // 2. Base distance is 12 pixels, multiplied by our dynamic power rating
  const baseLungeDistance = 12 * powerScale;
  const lungeOffset = args.attackerActor === 'player' ? baseLungeDistance : -baseLungeDistance;

  // 3. Scale rotation slightly based on the impact force as well
  const rotationOffset = 0.08 * Math.min(1.5, powerScale);
  const rotationDirection = args.attackerActor === 'player' ? -rotationOffset : rotationOffset;

  args.animationDirector.play(
    sequenceStep(
      callStep(() => {
        if (START_FX_FAMILIES.has(args.profile.family)) {
          args.context.attackFx = createAttackEffect({
            kind: args.profile.family,
            sourceX: args.source.x,
            sourceY: args.source.y,
            targetX: args.target.x,
            targetY: args.target.y,
            color: args.profile.color,
            accentColor: args.profile.accentColor,
            duration: args.profile.duration,
            variant: args.profile.variant,
            power: args.move.power > 0 ? args.move.power : undefined,
          });
        }
      }),
      args.profile.family === 'lunge'
        ? tweenActorStep(
            args.attackerActor,
            {
              x: args.attackerStart.x + lungeOffset,
              y: args.attackerStart.y - 2 * powerScale, // Slight windup height scaling
              rotation: args.attackerStart.rotation + rotationDirection,
            },
            args.profile.impactTime,
            'easeInOut',
          )
        : waitStep(args.profile.impactTime),
      callStep(() => {
        args.onImpact();
      }),
      args.profile.family === 'lunge'
        ? tweenActorStep(
            args.attackerActor,
            {
              x: args.attackerStart.x,
              y: args.attackerStart.y,
              rotation: args.attackerStart.rotation,
            },
            args.profile.impactTime * 0.6, // Snappy recovery speed
            'easeInOut',
          )
        : waitStep(0),
    ),
  );
}
