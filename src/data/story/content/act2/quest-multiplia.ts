/**
 * ACT 2: Route 3 + Multiplia — Fake Nurse + Multiplication Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * The story get more clearence , the player meet oak and gym leader in library as contuinue quest of prev act
 * the dialouge should explain about the glitches , those are real pokemon that infected and act like zombies , immposible to capture by our technoloiges
 * but team rocket has the pokeballs to capture them . they become powerfull. profesor oak says he goes to meet algotritmia
 * the gym leader says invite player to gym battle . on gym entrance the gym lader call and appologice says that a glitches has discovered on route 6
 * and he need helps . inside the  gym we blocke paths by some npc (need flag ) . new quest go helps to gym leader .
 * on going to route 6 player and gym leader battle some 6-7 rocket grunts + jessi and james , on all defeated officer jenny arrive to start new cutscne .
 * and Jenni says about thier plan to infect the cities by glitches right now the infection is medium and 50% of pokemons are infected .
 * gym leader warn player - we will beat them but make sure you capture enough pokemons before they are all infected .
 * he talk again about the the gym battle but he ask the player to do some favor - in a his private house - his wife there and she is sick and need help to get some medicine.
 * the medicine is in zerovile in the revive make house (we will create a new NPC that will give the medicine - it will be just a flag ) then quest .
 *  player go to zerovile and get the medicine and give it to gym leader wife on flag set the proffesor call and ask to visit him .
 * a new cutscne - in the lab proffesor oak , algo and lance from the elit-4
 *  they explain that they analzyed the evidence , and based rocket invastigations they know that the glitches are result of a virus that infect the pokemons and make them more aggressive and stronger
 * but also make them uncontrollable and impossible to capture by normal means . the proffesor told player they were a team who built the Null-x , they dont understand how they
 * the team rocket took control over it until they figure out in the documents . they stole the AI Cors . the cors are 8 items spread around the regions and those was the soul of the null-x
 * they stole them and place fake cors . they will built a machine that will be able to detect the cors and notify the heros about the locations .
 * lance says good bye and goes .
 * new quest - go back to multiplia to gym battle
 *
 *
 * cities involve : multipila , zerovile
 * interior : zerovile/revive-house , zerovile/algoritmia-lab , multiplia/gym , multiplia/gym-leader-house
 * npcs : gym leader , gym leader wife , professor oak , algo , lance , team rocket grunts , jessi and james , officer jenny
 * blockers and flags
 * quest :
 * 0- (from prev act ) meet professor oak in library and gym leader in library
 * 1- go to gym
 * 2- help gym leader by battle team rocket grunts + jessi and james in route 6
 * 3- meet officer jenny in route 6
 * 4- help gym leader wife by getting medicine from zerovile
 * 5- meet professor oak in his lab
 * 6- interact with gym leader wife to despawn gym blocker
 * 7- battle gym leader in multiplia gym
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { MapId } from '../../../maps/map-ids.js';
import { ITEMS } from '../../../items.js';
import { ITEM_SLUG_TO_ID } from '../../../item-defs.js';

// ── Quests ───────────────────────────────────────────────────────────────────

//#region ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route4-multiplia',
  title: { en: 'Route 4 Checkpoint', he: 'מחסום שביל 4' },
  description: {
    en: 'The Glitch has warped the signs on this route. 6 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 6 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 7,
    penaltyAmount: 500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 2, types: ['×'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.7,
    rewards: [
      { type: 'money', amount: 1500 },
      { type: 'item', itemId: 'x-attack', amount: 1 },
      { type: 'item', itemId: 'x-defense', amount: 1 },
      { type: 'item', itemId: 'x-speed', amount: 1 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE4_PASS }],
});
registerGate({
  id: 'gate-route6-multiplia',
  title: { en: 'Route 6 Checkpoint', he: 'מחסום שביל 6' },
  description: {
    en: 'The Glitch has warped the signs on this route. 10 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 10 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*', '+'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 10,
    penaltyAmount: 1500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 5, types: ['×'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.8,
    rewards: [
      { type: 'money', amount: 3500 },
      { type: 'item', itemId: 'great-ball', amount: 3 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE6_PASS }],
});
registerGate({
  id: 'gate-route5-multiplia',
  title: { en: 'Route 5 Checkpoint', he: 'מחסום שביל 5' },
  description: {
    en: 'The Glitch has warped the signs on this route. 8 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 8 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*', '+', '-'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 8,
    penaltyAmount: 1500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 5, types: ['×', '-', '+'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.8,
    rewards: [
      { type: 'money', amount: 3500 },
      { type: 'item', itemId: 'ultra-ball', amount: 2 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE5_PASS }],
});

registerGate({
  id: 'gate-route9-multiplia',
  title: { en: 'Route 9 Checkpoint', he: 'מחסום שביל 9' },
  description: {
    en: 'The Glitch has warped the signs on this route. 8 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 8 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*', '+', '-'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 8,
    penaltyAmount: 1500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 5, types: ['×', '-', '+'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.8,
    rewards: [
      { type: 'money', amount: 3500 },
      { type: 'item', itemId: 'max-repel', amount: 2 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE9_PASS }],
});
// #endregion

//#region ── Cutscenes ─────────────────────────────────────────────────────────────────

//#endregion
//#region ── Story Events ──────────────────────────────────────────────────────────────

//#endregion
