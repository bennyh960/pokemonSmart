import { describe, expect, it } from 'vitest';
import { getAbility, getAbilityBattleEffects, getMoveBattleData, getMoveByName } from '../pokemon-data.js';

describe('battle metadata', () => {
  it('adds move priority and behavior tags for battle ordering', () => {
    const quickAttack = getMoveByName('quick attack');
    const suckerPunch = getMoveByName('sucker punch');
    const hyperBeam = getMoveByName('hyper beam');

    expect(quickAttack?.battle.priority).toBe(1);
    expect(suckerPunch?.battle.priority).toBe(1);
    expect(suckerPunch?.battle.behaviorTags).toContain('fails-if-target-not-attacking');
    expect(hyperBeam?.battle.behaviorTags).toContain('must-recharge');
  });

  it('exposes major-status metadata for direct and secondary-status moves', () => {
    const toxic = getMoveByName('toxic');
    const iceBeam = getMoveByName('ice beam');

    expect(toxic?.battle.ailment).toMatchObject({
      status: 'poison',
      chance: 100,
      badlyPoisoned: true,
    });
    expect(iceBeam?.battle.ailment).toMatchObject({
      status: 'freeze',
      chance: 10,
      minTurns: 2,
      maxTurns: 5,
    });
  });

  it('tracks self buffs and enemy debuffs in move metadata', () => {
    const bulkUp = getMoveByName('bulk up');
    const growl = getMoveByName('growl');

    expect(bulkUp?.battle.target).toBe('user');
    expect(bulkUp?.battle.statChanges).toEqual([
      { stat: 'attack', stages: 1, target: 'user', chance: 100 },
      { stat: 'defense', stages: 1, target: 'user', chance: 100 },
    ]);
    expect(growl?.battle.statChanges).toEqual([
      { stat: 'attack', stages: -1, target: 'target', chance: 100 },
    ]);
  });

  it('exposes volatile move effects through battle metadata', () => {
    const confuseRay = getMoveByName('confuse ray');
    const leechSeed = getMoveByName('leech seed');
    const wrap = getMoveByName('wrap');
    const bite = getMoveByName('bite');
    const megaDrain = getMoveByName('mega drain');
    const doubleEdge = getMoveByName('double edge');
    const solarBeam = getMoveByName('solar beam');
    const skullBash = getMoveByName('skull bash');
    const reflect = getMoveByName('reflect');
    const lightScreen = getMoveByName('light screen');
    const safeguard = getMoveByName('safeguard');
    const explosion = getMoveByName('explosion');

    expect(confuseRay?.battle.effects).toEqual([
      { id: 'confusion', target: 'target', chance: 100, minTurns: 2, maxTurns: 5 },
    ]);
    expect(leechSeed?.battle.effects).toEqual([
      { id: 'leech-seed', target: 'target', chance: 100 },
    ]);
    expect(wrap?.battle.effects).toEqual([
      { id: 'trap', target: 'target', chance: 100, minTurns: 2, maxTurns: 5, damagePercent: 6.25 },
    ]);
    expect(bite?.battle.flinchChance).toBe(30);
    expect(megaDrain?.battle.drainPercent).toBe(50);
    expect(doubleEdge?.battle.recoilPercent).toBe(25);
    expect(solarBeam?.battle.behaviorTags).toContain('requires-charge-turn');
    expect(skullBash?.battle.behaviorTags).toContain('requires-charge-turn');
    expect(skullBash?.battle.chargeStatChanges).toEqual([
      { stat: 'defense', stages: 1, target: 'user', chance: 100 },
    ]);
    expect(reflect?.battle.sideEffects).toEqual([
      { id: 'reflect', target: 'user', turns: 5 },
    ]);
    expect(lightScreen?.battle.sideEffects).toEqual([
      { id: 'light-screen', target: 'user', turns: 5 },
    ]);
    expect(safeguard?.battle.sideEffects).toEqual([
      { id: 'safeguard', target: 'user', turns: 5 },
    ]);
    expect(explosion?.battle.behaviorTags).toContain('leave-user-at-1-hp');
  });

  it('exposes battle effects for passive ability hooks', () => {
    const thickFat = getAbility(47);
    const limberEffects = getAbilityBattleEffects(7);

    expect(thickFat?.battleEffects).toEqual([
      { kind: 'damageTakenMultiplier', moveTypes: ['fire', 'ice'], multiplier: 0.5 },
    ]);
    expect(limberEffects).toEqual([
      { kind: 'statusImmunity', statuses: ['paralyze'] },
    ]);
  });

  it('serves the same move battle metadata through helper accessors', () => {
    const quickAttack = getMoveByName('quick attack');

    expect(quickAttack).toBeDefined();
    expect(getMoveBattleData(quickAttack!.id)).toEqual(quickAttack!.battle);
  });
});
