import { describe, expect, it } from 'vitest';
import { GateSession } from '../gate-session.js';
import { bypassAllowed, gateCardCount, useGateCard } from '../gate-cards.js';
import { gateCardPrize } from '../../minigames/gate-card-prizes.js';
import { boardPool, boardStep } from '../../minigames/english/board.js';
import { ENGLISH_LADDER } from '../../minigames/english/ladder.js';
import { DEFAULT_SESSION_CONFIG } from '../../data/story/global-gate-config.js';
import { getItem } from '../../data/items.js';
import type { RichQuestion } from '../../math/question-builder/index.js';

const config = { ...DEFAULT_SESSION_CONFIG, questionsRequired: 5 };

describe('gate card items', () => {
  it('are key items with their own Hebrew names and a sprite', () => {
    for (const [id, sprite] of [
      ['bypass-card', 'card-key'],
      ['skip-card', 'pass'],
    ]) {
      const def = getItem(id);
      expect(def?.category).toBe('key');
      expect(def?.name.he).not.toBe(def?.name.en);
      expect(def?.sprite).toMatch(new RegExp(`/${sprite}\\.png$`));
    }
  });

  it('are used up one by one', () => {
    const pd = { items: { 'skip-card': 3 } as Record<string, number> };
    expect(useGateCard(pd, 'skip', 2)).toBe(2);
    expect(gateCardCount(pd, 'skip')).toBe(1);
    expect(useGateCard(pd, 'skip', 5)).toBe(1);
    expect(pd.items['skip-card']).toBeUndefined();
    expect(useGateCard(pd, 'bypass')).toBe(0);
  });

  it('Bypass works everywhere but gyms and the League', () => {
    expect(bypassAllowed('route-checkpoint')).toBe(true);
    expect(bypassAllowed('city-entry')).toBe(true);
    expect(bypassAllowed('auto-pokecenter')).toBe(true);
    expect(bypassAllowed('auto-pokemarket')).toBe(true);
    expect(bypassAllowed('gym-entry')).toBe(false);
    expect(bypassAllowed('auto-gym-entrance')).toBe(false);
    expect(bypassAllowed('elite-four')).toBe(false);
  });
});

describe('GateSession.bypass', () => {
  it('skips the questions and goes on to the bonus, never with a fine', () => {
    const s = new GateSession(config);
    s.nextQuestion();
    s.submitAnswer(-1, 1);
    s.submitAnswer(-1, 1);
    s.bypass();
    expect(s.isBonusPhase).toBe(true);
    s.skipBonus();
    const r = s.getResult();
    expect(r.bypassed).toBe(true);
    expect(r.penaltyApplied).toBe(0);
  });

  it('ends the gate at once when it has no bonus', () => {
    const s = new GateSession({ ...config, bonusEnabled: false });
    s.bypass();
    expect(s.isComplete).toBe(true);
  });
});

describe('GateSession.skipQuestion', () => {
  it('counts the question as answered, not as an attempt', () => {
    const s = new GateSession(config);
    s.nextQuestion();
    expect(s.skipQuestion()).toBe(false);
    expect(s.currentCorrect).toBe(1);
    s.submitAnswer(1, 1);
    const r = s.getResult();
    expect(r.skipsUsed).toBe(1);
    expect(r.totalAttempts).toBe(1);
    expect(r.successRate).toBe(1);
  });

  it('the last skipped question opens the bonus; no skipping the bonus itself', () => {
    const s = new GateSession(config);
    for (let i = 0; i < 4; i++) s.skipQuestion();
    expect(s.skipQuestion()).toBe(true);
    expect(s.isBonusPhase).toBe(true);
    expect(s.skipQuestion()).toBe(false);
    expect(s.questionsSkipped).toBe(5);
  });
});

describe('bonus question', () => {
  it('is harder than the regular questions and does not repeat right away', () => {
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const s = new GateSession(config);
      const regular = s.nextQuestion() as RichQuestion;
      s.bypass();
      const bonus = s.nextQuestion() as RichQuestion;
      expect(bonus.difficulty).toBeGreaterThanOrEqual(regular.difficulty);
      seen.push(bonus.templateId);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });
});

describe('gateCardPrize (labs, berry games)', () => {
  it('needs 3 stars and luck; Bypass is rolled before Skip', () => {
    expect(gateCardPrize('lab', 2, () => 0)).toBeNull();
    expect(gateCardPrize('lab', 3, () => 0.99)).toBeNull();
    expect(gateCardPrize('lab', 3, () => 0)?.reward.items?.[0].itemId).toBe('bypass-card');
    expect(gateCardPrize('lab', 3, () => 0.25)?.reward.items?.[0].itemId).toBe('skip-card');
  });
});

describe('Word Board card prizes', () => {
  /** "rarity:item" → quantity on board level `level` (1-based). */
  const cardsOn = (level: number) => {
    const out: Record<string, number> = {};
    for (const p of boardPool(boardStep(level - 1), new Set())) {
      const ri = 'reward' in p ? p.reward.items?.[0] : undefined;
      if (ri?.itemId === 'bypass-card' || ri?.itemId === 'skip-card') out[`${p.rarity}:${ri.itemId}`] = ri.quantity;
    }
    return out;
  };

  it('Bypass Cards from level 4, more on higher levels', () => {
    const bypass = (level: number) =>
      Object.fromEntries(Object.entries(cardsOn(level)).filter(([k]) => k.endsWith('bypass-card')));
    expect(bypass(3)).toEqual({});
    expect(bypass(4)).toEqual({ 'epic:bypass-card': 2 });
    expect(bypass(6)).toEqual({ 'epic:bypass-card': 2 });
    expect(bypass(7)).toEqual({ 'epic:bypass-card': 2, 'rare:bypass-card': 1 });
    expect(bypass(8)).toEqual({ 'epic:bypass-card': 2, 'rare:bypass-card': 1 });
    expect(bypass(9)).toEqual({ 'epic:bypass-card': 3, 'rare:bypass-card': 1 });
    expect(bypass(10)).toEqual({ 'epic:bypass-card': 3, 'rare:bypass-card': 1 });
    expect(bypass(11)).toEqual({ 'epic:bypass-card': 4, 'rare:bypass-card': 2, 'good:bypass-card': 1 });
    expect(bypass(ENGLISH_LADDER.length)).toEqual({ 'epic:bypass-card': 4, 'rare:bypass-card': 2, 'good:bypass-card': 1 });
  });

  it('Skip Cards on every level', () => {
    ENGLISH_LADDER.forEach((_, i) =>
      expect(Object.keys(cardsOn(i + 1)).some((k) => k.endsWith('skip-card'))).toBe(true),
    );
  });
});
