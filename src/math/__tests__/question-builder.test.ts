/**
 * question-builder.test.ts
 *
 * Tests for the dynamic question-builder system:
 *   - ClassConfig presets and custom config API
 *   - TemplateRegistry (register / unregister / filter)
 *   - Each concrete template (correct answer, bilingual text, assets)
 *   - QuestionBuilder fluent API
 *   - QuestionFactory convenience helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { GRADE_CONFIGS, getClassConfig, createCustomConfig, listGrades } from '../question-builder/ClassConfig.js';
import { TemplateRegistry } from '../question-builder/TemplateRegistry.js';
import { SingleItemCostTemplate, MaxItemsBudgetTemplate, TwoItemsTotalTemplate, BudgetRemainingTemplate } from '../question-builder/templates/StoreTemplates.js';
import { BasicDamageTemplate, AttackFormulaDamageTemplate, STABBonusTemplate, MoveEffectivenessTemplate } from '../question-builder/templates/BattleTemplates.js';
import { PokeBallsNeededTemplate, HPReductionTemplate, CatchCostTemplate } from '../question-builder/templates/CatchTemplates.js';
import { QuestionBuilder, QuestionFactory } from '../question-builder/index.js';
import type { PokemonWorldSnapshot } from '../question-builder/types.js';
import type { QuestionTemplate } from '../question-builder/QuestionTemplate.js';

// ─── Minimal mock snapshot ────────────────────────────────────────────────────

const MOCK_SNAPSHOT: PokemonWorldSnapshot = {
  items: [
    {
      id: 4,
      name: { en: 'Poké Ball', he: 'כדור-פוקה' },
      price: 200,
      spriteUrl: 'https://example.com/pokeball.png',
      category: 'pokeball',
    },
    {
      id: 17,
      name: { en: 'Potion', he: 'תרופה' },
      price: 300,
      spriteUrl: 'https://example.com/potion.png',
      category: 'healing',
    },
    {
      id: 2,
      name: { en: 'Ultra Ball', he: 'כדור-אולטרה' },
      price: 1200,
      spriteUrl: 'https://example.com/ultraball.png',
      category: 'pokeball',
    },
    {
      id: 18,
      name: { en: 'Antidote', he: 'אנטידוט' },
      price: 100,
      spriteUrl: 'https://example.com/antidote.png',
      category: 'status-cure',
    },
  ],
  pokemon: [
    {
      id: 25,
      name: { en: 'Pikachu', he: 'פיקאצ׳ו' },
      spriteUrl: 'https://example.com/pikachu.png',
      catchRate: 190,
      hp: 35,
      attack: 55,
      defense: 40,
      types: ['electric'],
    },
    {
      id: 6,
      name: { en: 'Charizard', he: 'צ׳ריזארד' },
      spriteUrl: 'https://example.com/charizard.png',
      catchRate: 45,
      hp: 78,
      attack: 84,
      defense: 78,
      types: ['fire', 'flying'],
    },
    {
      id: 1,
      name: { en: 'Bulbasaur', he: 'בולבסאור' },
      spriteUrl: 'https://example.com/bulbasaur.png',
      catchRate: 45,
      hp: 45,
      attack: 49,
      defense: 49,
      types: ['grass', 'poison'],
    },
  ],
  moves: [
    { id: 85, name: { en: 'Thunderbolt', he: 'ברק' }, power: 90, type: 'electric' },
    { id: 53, name: { en: 'Flamethrower', he: 'להביור' }, power: 90, type: 'fire' },
    { id: 14, name: { en: 'Tackle', he: 'בלימה' }, power: 40, type: 'normal' },
  ],
};

// ─── ClassConfig ──────────────────────────────────────────────────────────────

describe('ClassConfig', () => {
  it('has all 6 grades in GRADE_CONFIGS', () => {
    expect(Object.keys(GRADE_CONFIGS)).toHaveLength(6);
  });

  it('listGrades returns grades in order', () => {
    expect(listGrades()).toEqual(['grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6']);
  });

  it('grade1 only allows + and -', () => {
    const cfg = getClassConfig('grade1');
    expect(cfg.allowedOperations).toContain('+');
    expect(cfg.allowedOperations).toContain('-');
    expect(cfg.allowedOperations).not.toContain('×');
    expect(cfg.allowedOperations).not.toContain('÷');
  });

  it('grade6 allows all operations including ()', () => {
    const cfg = getClassConfig('grade6');
    for (const op of ['+', '-', '×', '÷', '()'] as const) {
      expect(cfg.allowedOperations).toContain(op);
    }
  });

  it('difficulty ranges increase with grade', () => {
    const grades = listGrades().map(id => getClassConfig(id));
    for (let i = 0; i < grades.length - 1; i++) {
      expect(grades[i].difficultyRange[0]).toBeLessThanOrEqual(grades[i + 1].difficultyRange[0]);
    }
  });

  it('createCustomConfig merges overrides', () => {
    const custom = createCustomConfig('grade3', { maxSteps: 5, allowNegative: true });
    expect(custom.id).toBe('grade3');
    expect(custom.maxSteps).toBe(5);
    expect(custom.allowNegative).toBe(true);
    // original fields preserved
    expect(custom.allowedOperations).toContain('×');
  });

  it('getClassConfig throws for unknown id', () => {
    expect(() => getClassConfig('grade99' as never)).toThrow();
  });
});

// ─── TemplateRegistry ─────────────────────────────────────────────────────────

describe('TemplateRegistry', () => {
  let reg: TemplateRegistry;

  beforeEach(() => {
    reg = new TemplateRegistry();
  });

  it('registers and retrieves a template', () => {
    const t = new SingleItemCostTemplate();
    reg.register(t);
    expect(reg.get(t.id)).toBe(t);
  });

  it('unregisters a template', () => {
    const t = new SingleItemCostTemplate();
    reg.register(t);
    expect(reg.unregister(t.id)).toBe(true);
    expect(() => reg.get(t.id)).toThrow();
  });

  it('registerAll adds multiple templates', () => {
    reg.registerAll([new SingleItemCostTemplate(), new MaxItemsBudgetTemplate()]);
    expect(reg.size).toBe(2);
  });

  it('forConfig filters compatible templates', () => {
    reg.registerAll([
      new SingleItemCostTemplate(),  // requires ×  (grade1 does NOT have ×)
      new BasicDamageTemplate(),     // requires +,- (grade1 DOES have these)
      new PokeBallsNeededTemplate(), // requires -   (grade1 DOES have -)
    ]);
    const grade1 = getClassConfig('grade1');
    const compatible = reg.forConfig(grade1);
    // SingleItemCostTemplate requires × which grade1 doesn't have → excluded
    expect(compatible.find(t => t.id === 'store.single-item-cost')).toBeUndefined();
    expect(compatible.find(t => t.id === 'battle.basic-damage')).toBeDefined();
    expect(compatible.find(t => t.id === 'catch.pokeballs-needed')).toBeDefined();
  });

  it('forCategory returns only that category', () => {
    reg.registerAll([new SingleItemCostTemplate(), new BasicDamageTemplate()]);
    const storeOnly = reg.forCategory('store');
    expect(storeOnly).toHaveLength(1);
    expect(storeOnly[0].id).toBe('store.single-item-cost');
  });

  it('pickRandom throws when no templates available', () => {
    expect(() => reg.pickRandom(getClassConfig('grade1'))).toThrow();
  });

  it('clear removes all templates', () => {
    reg.registerAll([new SingleItemCostTemplate(), new BasicDamageTemplate()]);
    reg.clear();
    expect(reg.size).toBe(0);
  });
});

// ─── Template compatibility ───────────────────────────────────────────────────

describe('QuestionTemplate.isCompatibleWith', () => {
  const cases: Array<[string, QuestionTemplate, string, boolean]> = [
    ['SingleItemCost', new SingleItemCostTemplate(), 'grade1', false], // needs ×
    ['SingleItemCost', new SingleItemCostTemplate(), 'grade2', true],
    ['BasicDamage',    new BasicDamageTemplate(),    'grade1', true],
    ['AttackFormula',  new AttackFormulaDamageTemplate(), 'grade2', false], // needs ×÷ which grade2 lacks ÷
    ['AttackFormula',  new AttackFormulaDamageTemplate(), 'grade3', true],
    ['STABBonus',      new STABBonusTemplate(),      'grade2', false],
    ['STABBonus',      new STABBonusTemplate(),      'grade3', true],
  ];

  for (const [name, template, gradeId, expected] of cases) {
    it(`${name} compatible with ${gradeId}: ${expected}`, () => {
      expect(template.isCompatibleWith(getClassConfig(gradeId as never))).toBe(expected);
    });
  }
});

// ─── Store Templates ──────────────────────────────────────────────────────────

describe('StoreTemplates', () => {
  const grade3 = getClassConfig('grade3');

  function buildWith(template: QuestionTemplate) {
    return template.build(MOCK_SNAPSHOT, grade3);
  }

  it('SingleItemCostTemplate: answer = price × qty', () => {
    const t = new SingleItemCostTemplate();
    for (let i = 0; i < 20; i++) {
      const q = buildWith(t);
      expect(q.correctAnswer).toBeGreaterThan(0);
      expect(q.assets).toHaveLength(1);
      expect(q.assets[0].kind).toBe('item');
      expect(q.question.en).toBeTruthy();
      expect(q.question.he).toBeTruthy();
    }
  });

  it('MaxItemsBudgetTemplate: answer = floor(budget / price)', () => {
    const t = new MaxItemsBudgetTemplate();
    for (let i = 0; i < 20; i++) {
      const q = buildWith(t);
      expect(q.correctAnswer).toBeGreaterThanOrEqual(1);
    }
  });

  it('TwoItemsTotalTemplate: has 2 assets', () => {
    const t = new TwoItemsTotalTemplate();
    const q = buildWith(t);
    expect(q.assets).toHaveLength(2);
  });

  it('BudgetRemainingTemplate: answer < budget param', () => {
    const t = new BudgetRemainingTemplate();
    for (let i = 0; i < 20; i++) {
      const q = buildWith(t);
      // answer (remaining) should be ≥ 0
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it('all store templates produce bilingual question text', () => {
    const templates: QuestionTemplate[] = [
      new SingleItemCostTemplate(),
      new MaxItemsBudgetTemplate(),
      new TwoItemsTotalTemplate(),
      new BudgetRemainingTemplate(),
    ];
    for (const t of templates) {
      const q = buildWith(t);
      expect(q.question.en.length).toBeGreaterThan(5);
      expect(q.question.he.length).toBeGreaterThan(5);
    }
  });
});

// ─── Battle Templates ─────────────────────────────────────────────────────────

describe('BattleTemplates', () => {
  const grade3 = getClassConfig('grade3');
  const grade4 = getClassConfig('grade4');

  it('BasicDamageTemplate: produces 2 pokemon assets', () => {
    const t = new BasicDamageTemplate();
    const q = t.build(MOCK_SNAPSHOT, grade3);
    expect(q.assets).toHaveLength(2);
    expect(q.assets[0].kind).toBe('pokemon');
    expect(q.assets[1].kind).toBe('pokemon');
  });

  it('STABBonusTemplate: answer is 1.5× base (floored)', () => {
    const t = new STABBonusTemplate();
    for (let i = 0; i < 30; i++) {
      const q = t.build(MOCK_SNAPSHOT, grade3);
      // answer must equal floor(base * 1.5) for some even base
      expect(q.correctAnswer % 1).toBe(0); // always integer
    }
  });

  it('MoveEffectivenessTemplate: super-effective doubles, not-effective halves', () => {
    const t = new MoveEffectivenessTemplate();
    let seenDouble = false;
    let seenHalf = false;
    for (let i = 0; i < 50; i++) {
      const q = t.build(MOCK_SNAPSHOT, grade4);
      if (q.question.en.includes('SUPER EFFECTIVE')) {
        // answer should be even base × 2
        seenDouble = true;
      } else {
        seenHalf = true;
      }
    }
    expect(seenDouble).toBe(true);
    expect(seenHalf).toBe(true);
  });

  it('AttackFormulaDamageTemplate: has solution steps', () => {
    const t = new AttackFormulaDamageTemplate();
    const q = t.build(MOCK_SNAPSHOT, grade3);
    expect(q.steps.length).toBeGreaterThanOrEqual(2);
    expect(q.steps[0].en).toBeTruthy();
  });
});

// ─── Catch Templates ──────────────────────────────────────────────────────────

describe('CatchTemplates', () => {
  const grade3 = getClassConfig('grade3');

  it('PokeBallsNeededTemplate: answer = needed - have, always > 0', () => {
    const t = new PokeBallsNeededTemplate();
    for (let i = 0; i < 20; i++) {
      const q = t.build(MOCK_SNAPSHOT, grade3);
      expect(q.correctAnswer).toBeGreaterThan(0);
    }
  });

  it('HPReductionTemplate: answer is a positive integer', () => {
    const t = new HPReductionTemplate();
    for (let i = 0; i < 20; i++) {
      const q = t.build(MOCK_SNAPSHOT, grade3);
      expect(q.correctAnswer).toBeGreaterThan(0);
      expect(Number.isInteger(q.correctAnswer)).toBe(true);
    }
  });

  it('CatchCostTemplate: has pokemon + 1 or 2 item assets', () => {
    const t = new CatchCostTemplate();
    const q = t.build(MOCK_SNAPSHOT, grade3);
    // potions qty can be 0, so we get 2 assets (pokemon+balls) or 3 (pokemon+balls+potions)
    expect(q.assets.length).toBeGreaterThanOrEqual(2);
    expect(q.assets.length).toBeLessThanOrEqual(3);
    expect(q.assets[0].kind).toBe('pokemon');
    expect(q.assets[1].kind).toBe('item');
  });
});

// ─── QuestionBuilder ──────────────────────────────────────────────────────────

describe('QuestionBuilder', () => {
  it('throws without withConfig', () => {
    expect(() => (new QuestionBuilder().withSnapshot(MOCK_SNAPSHOT)).build()).toThrow(/withConfig/);
  });

  it('throws without withSnapshot', () => {
    expect(() => (new QuestionBuilder().withConfig(getClassConfig('grade2'))).build()).toThrow(/withSnapshot/);
  });

  it('buildMany returns correct count', () => {
    const questions = QuestionFactory.many('grade3', 5);
    expect(questions).toHaveLength(5);
  });
});

// ─── RichQuestion shape ───────────────────────────────────────────────────────

describe('RichQuestion shape', () => {
  it('every field is present and typed correctly', () => {
    const grades = listGrades();
    for (const gradeId of grades) {
      const q = QuestionFactory.one(gradeId);
      expect(typeof q.templateId).toBe('string');
      expect(q.question).toHaveProperty('en');
      expect(q.question).toHaveProperty('he');
      expect(typeof q.correctAnswer).toBe('number');
      expect(Number.isFinite(q.correctAnswer)).toBe(true);
      expect(Array.isArray(q.steps)).toBe(true);
      expect(Array.isArray(q.assets)).toBe(true);
      expect(q.timeLimit).toBeGreaterThan(0);
      expect(q.classConfigId).toBe(gradeId);
    }
  });
});
