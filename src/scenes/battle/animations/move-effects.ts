// // scenes/battle/animations/move-effects.ts

// import { t } from '../../../i18n/i18n.js';
// import type { BattlePokemonRuntimeState } from '../../../systems/battle-state.js';
// import type { Pokemon } from '../../../types/index.js';
// import { setHP, type createHPBar } from '../../../ui/hp-bar.js';
// import type { AudioManager } from '../../../audio/audio-manager.js';

// /** Structural blueprint tracking all necessary battle scene dependencies */
//  interface MoveEffectContext {
//   attacker: Pokemon;
//   defender: Pokemon;
//   attackerState: BattlePokemonRuntimeState;
//   attackerHpBar: ReturnType<typeof createHPBar>;
//   attackerActor: 'player' | 'enemy';
//   audio: AudioManager;
//   syncPlayerBar: () => void;
//   syncEnemyBar: () => void;
// }

//  interface MoveEffectDefinition {
//   hitTarget: boolean;
//   canExecute?: (ctx: MoveEffectContext) => { success: boolean; errorKey: string } | null;
//   onFailure?: (ctx: MoveEffectContext) => void;
//   onImpact: (ctx: MoveEffectContext) => void;
//   getMessages: (attackerName: string, moveName: string) => string[];
// }

//  const SPECIAL_MOVE_EFFECTS: Record<string, MoveEffectDefinition> = {
//   substitute: {
//     hitTarget: false,
//     canExecute: (ctx) => {
//       if (ctx.attackerState.substituteActive) {
//         return { success: false, errorKey: 'substituteAlreadyActive' };
//       }
//       const cost = Math.floor(ctx.attacker.maxHp / 4);
//       if (ctx.attacker.hp <= cost) {
//         return { success: false, errorKey: 'substituteTooWeak' };
//       }
//       return null;
//     },
//     onFailure: (ctx) => {
//       ctx.audio.playSFX('menu-cancel');
//     },
//     onImpact: (ctx) => {
//       const cost = Math.floor(ctx.attacker.maxHp / 4);
//       ctx.attacker.hp -= cost;
//       setHP(ctx.attackerHpBar, ctx.attacker.hp);
//       ctx.attackerState.substituteActive = true;
//       ctx.attackerState.substituteHitsAbsorbed = 0;

//       // Clean, parameterized execution calling your original scene UI syncs safely
//       if (ctx.attackerActor === 'player') {
//         ctx.syncPlayerBar();
//       } else {
//         ctx.syncEnemyBar();
//       }
//     },
//     getMessages: (attackerName) => [t('battle.substituteCreated', { name: attackerName })],
//   },
//   'magic-coat': {
//     hitTarget: false,
//     onImpact: (ctx) => {
//       ctx.attackerState.turnFlags.magicCoatActive = true;
//     },
//     getMessages: (attackerName) => [t('battle.magicCoatActive', { name: attackerName })],
//   },
// };
