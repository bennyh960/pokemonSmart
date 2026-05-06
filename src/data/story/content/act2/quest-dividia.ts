/**
 * ACT 2: Route 4 + Dividia — Remainder Glitch + Division Gym
 * ─────────────────────────────────────────────────────────────────────────────

 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act2-dividia',
  title: { en: 'Battle the wild glitch', he: 'הילחם בגליץ׳ הפראי' },
  objective: { en: 'Defeat the wild glitch', he: 'נצח את הגליץ׳ הפראי' },
});

registerQuest({
  id: 'main-act2-gym4',
  title: { en: 'Dividia Gym', he: 'קרב מכון דיודיה' },
  objective: { en: 'Defeat Divon at the Division Gym', he: 'נצח את מורטי דיבון מנהיג מכון החילוק' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route4-dividia',
  title: { en: 'Route 4 Checkpoint', he: 'מחסום שביל 4' },
  description: {
    en: 'NULL-X interference detected. 5 questions — 3 correct to pass.',
    he: 'זוהתה הפרעה מ-NULL-X. 5 שאלות — 3 נכונות כדי לעבור.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 150,
  },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE4_PASS },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

registerGate({
  id: 'gate-dividia-gym',
  title: { en: 'Division Gym', he: 'חדר הכושר של החילוק' },
  description: { en: 'Answer 4 questions to enter the gym.', he: 'ענה על 4 שאלות כדי להיכנס לחדר הכושר.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 4,
    penaltyAmount: 0,
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_DIVIDIA_GYM_PASS },
    { type: 'set-quest', questId: 'main-act2-gym4' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────
registerCutscene({
  id: 'route5-cutscene-glitch-snorlax-asemple',
  steps: [
    { type: 'face-npc', npcId: 'npc-jenny-route5', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-jenny-route5',
      lines: [
        { en: 'Ohh its you! Good to see you here!', he: 'הוו זה אתה ! כמה טוב לראות אותך כאן!' },
        {
          en: 'This Snorlax try to enter to the dividia city - its been stoped by gate keeper',
          he: 'סנורלקס הזה מנסה להיכנס לעיר דיוידיה - הוא נעצר על ידי שומר השער',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-ranger3-route5',
      lines: [
        {
          en: "He couldn't answere math questions and we discover is a glitch",
          he: 'הוא לא הצליח לענות על שאלות הגיון פשוטות וגילינו שזה גליץ',
        },
        { en: 'We must prevent him from enter dividia city', he: 'עלינו למנוע ממנו להיכנס לעיר דיוידיה' },
      ],
    },
    { type: 'face-npc', npcId: 'reminder-route-5', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'reminder-route-5',
      lines: [
        {
          he: 'היי,זה אתה! טוב שאתה כאן ,  כבר הוכחת את עצמך כמאמן חזק - בוא נעסוק בזה יחד',
          en: 'Hi , You already prove yourself as strong trainer - lets deal with him together',
        },
        { en: 'I will block his path to the city', he: 'אני אחסום את דרכו לעיר' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-ranger3-route5',
      lines: [{ en: 'I came to cover you!', he: 'היזהר, הוא נראה מסוכן! אני בא לגבות אותך' }],
    },
    {
      type: 'move-npc',
      npcId: 'reminder-route-5',
      path: ['right', 'right', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'right', 'down', 'down'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'npc-ranger3-route5',
      waitForComplete: false,
      path: ['right', 'right', 'right', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'right', 'down'],
    },
    { type: 'face-npc', npcId: 'npc-ranger3-route5', dir: 'up' },
    { type: 'face-npc', npcId: 'reminder-route-5', dir: 'right' },
  ],
});

registerCutscene({
  id: 'route5-cutscene-reminder-defeat',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'reminder-route-5',
      lines: [
        { en: 'ohh that was amazing battle!', he: 'אווו זה היה קרב מעולה' },
        {
          en: 'But I must say my pokemons energy was low after dealing with the glitch',
          he: 'אבל אני חייב לומר שהאנרגיה של הפוקימונים שלי הייתה נמוכה אחרי ההתמודדות עם הבאג',
        },
        { en: 'Next time I will be more prepared..', he: 'בפעם הבאה אני אהיה יותר מוכן..' },
        {
          en: "I'm going to Dividia to earn my divider badge! see you later",
          he: 'אני הולך לדיבידיה כדי להרוויח את תג החילוק שלי! נתראה מאוחר יותר',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-jenny-route5',
      path: [
        'right',
        'right',
        'right',
        'right',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-jenny-route5',
      lines: [
        { en: 'Thanks you both young trainers', he: 'תודה רבה לשניכם מאמנים צעירים!' },
        {
          en: "I'm happy to see that you have left enough energy to challenge each other",
          he: 'אני שמחה לראות שנשאר לכם מספיק אנרגיה לאתגר אחד את השני',
        },
        { en: 'I hope we will meet again under better circumstances', he: 'אני מקווה שנפגש שוב בנסיבות טובות יותר' },
      ],
    },
    { type: 'move-npc', npcId: 'npc-jenny-route5', path: ['down'] },
    { type: 'move-npc', npcId: 'reminder-route-5', path: ['down'] },
    { type: 'hide-npc', npcId: 'reminder-route-5' },
    { type: 'hide-npc', npcId: 'npc-jenny-route5' },
  ],
});
// ── Story Events ──────────────────────────────────────────────────────────────

// ACT2_ROUTE5_JENNY_TALKED
registerStoryEvent({
  id: 'evt-route5-jenny',
  trigger: { type: 'npc-interact', npcId: 'npc-jenny-route5' },
  // conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_DIVIDIA }],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'route5-cutscene-glitch-snorlax-asemple' },
    { type: 'set-flag', flag: FLAGS.ACT2_ROUTE5_JENNY_TALKED },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

registerStoryEvent({
  id: 'evt-route5-reminder-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'reminder-route-5' },
  actions: [
    { type: 'start-cutscene', cutsceneId: 'route5-cutscene-reminder-defeat' },
    { type: 'complete-quest', questId: 'main-act2-dividia' },
    { type: 'set-quest', questId: 'main-act2-gym4' },
  ],
});
