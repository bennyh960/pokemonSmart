import { registerCutscene } from '../../cutscenes';
import { registerStoryEvent } from '../../events';
import { FLAGS } from '../../flags';
import { registerQuest } from '../../quests';

registerQuest({
  id: 'main-act1-route3',
  title: { en: 'Route 3', he: 'שביל 3' },
  objective: { en: 'Explore Route 3 and find new trainers to battle', he: 'חקור את שביל 3 ומצא מאמנים חדשים לקרב' },
});

registerStoryEvent({
  id: 'act1-route3-start',
  trigger: { type: 'map-enter', mapId: 'routes/route-3' },
  actions: [{ type: 'set-quest', questId: 'main-act1-route3' }],
});

registerStoryEvent({
  id: 'act1-route3-reward',
  trigger: { type: 'npc-interact', npcId: 'fishing-rod-blocker' },
  actions: [
    { type: 'set-flag', flag: FLAGS.ACT1_ROUTE3_MEET_MISTY },
    { type: 'complete-quest', questId: 'main-act1-route3' },
    { type: 'set-quest', questId: 'main-act1-route3-reward' },
  ],
});

registerQuest({
  id: 'main-act1-route3-reward',
  title: { en: 'Route 3 Reward', he: 'פרס שביל 3' },
  objective: { en: 'Go to get a fishing rod', he: 'לך לקבל חכת דיג' },
});

registerStoryEvent({
  id: 'act1-route3-end',
  trigger: { type: 'flag-set', flag: FLAGS.ACT1_ROUTE3_REWARD_RECEIVED },
  actions: [{ type: 'complete-quest', questId: 'main-act1-route3-reward' }],
});
