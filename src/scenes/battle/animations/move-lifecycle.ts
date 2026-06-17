import type { Pokemon } from '../../../types/index.js';
import type { BattleAnimationContext } from './play-attack-animation.js';
import { playAttackAnimation } from './play-attack-animation.js';
import { createTextBox } from '../../../ui/text-box.js';

export interface MoveLifecycleArgs {
  move: Pokemon['moves'][number];
  attackerActor: 'player' | 'enemy';
  defenderActor: 'player' | 'enemy';
  context: BattleAnimationContext;
  canExecute?: () => { success: boolean; errorMessages: string[] } | null;
  onImpact: () => { endMessages: string[] };
  hitTarget?: boolean;
  overrideNextPhase?: BattleAnimationContext['phase'];
}

export function runMoveLifecycle({
  move,
  attackerActor,
  defenderActor,
  context,
  canExecute,
  onImpact,
  hitTarget = true,
  overrideNextPhase,
}: MoveLifecycleArgs): void {
  const nextPhase = overrideNextPhase ?? (attackerActor === 'player' ? 'ENEMY_TURN' : 'PLAYER_ATTACK');

  if (canExecute) {
    const check = canExecute();
    if (check && !check.success) {
      context.textBox = createTextBox(check.errorMessages, context.rtl);
      context.phase = nextPhase;
      context.phaseTimer = 0;
      return;
    }
  }

  playAttackAnimation(
    attackerActor === 'player' ? context.player : context.enemy,
    attackerActor,
    defenderActor,
    move,
    context.animationDirector,
    context.audio,
    context,
    () => {
      const result = onImpact();
      context.textBox = createTextBox(result.endMessages, context.rtl);
      context.phase = nextPhase;
      context.phaseTimer = 0;
    },
    hitTarget,
  );
}
