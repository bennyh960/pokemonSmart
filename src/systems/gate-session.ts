/**
 * GateSession — manages the state of a single question-gate play session.
 *
 * Flow:
 *  1. Session is created with a config.
 *  2. `nextQuestion()` generates the next RichQuestion to show.
 *  3. `submitAnswer(value)` records the answer, returns `AnswerFeedback`.
 *     - Correct: progress advances, no retry.
 *     - Wrong:   `retryRequired = true` — same template, different variables;
 *               question count for "required" is bumped by 1.
 *  4. Once `correctCount >= config.questionsRequired`, session moves to
 *     optional bonus phase (if enabled).
 *  5. `getResult()` computes the final SessionResult with reward/penalty info.
 *
 * Gate cards (systems/gate-cards.ts): `bypass()` ends the main phase at once — no fine — and the bonus
 * question still follows; `skipQuestion()` counts the current question as answered (not an attempt). Bonus questions come from a harder grade and avoid templates seen lately.
 */

import { QuestionBuilder, buildSnapshot, getClassConfig, registry } from '../math/question-builder/index.js';
import type { ClassConfig, GradeId, RichQuestion } from '../math/question-builder/index.js';
import type { MathDifficulty } from '../types/index.js';
import type { GateSessionConfig, GateReward } from '../data/story/gates.js';
import { gradeFromBirthYear, getPlayerBirthYear } from '../data/story/global-gate-config.js';
import {
  generateSimpleInputQuestion,
  type SimpleInputQuestion,
  type SimpleOpType,
} from '../math/simple-input-question.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnyQuestion = RichQuestion | SimpleInputQuestion;

export interface AnswerFeedback {
  correct: boolean;
  /** Only set on wrong answers — a new question with different variables. */
  retryQuestion?: AnyQuestion;
  /** Progress after this answer. */
  correctCount: number;
  required: number;
  /** Whether the session (main phase) is now complete. */
  mainPhaseComplete: boolean;
}

export interface SessionResult {
  /** Did the player satisfy `questionsRequired`? (they always do — session ends when they do) */
  passed: boolean;
  /** How many times the player answered correctly. */
  correctCount: number;
  /** Total answer attempts (correct + wrong). */
  totalAttempts: number;
  /** correctCount / totalAttempts — used for reward/penalty gating. */
  successRate: number;
  /** null = bonus not offered; true/false = offered and answered. */
  bonusPassed: boolean | null;
  /** PokeCoins deducted (0 if none). */
  penaltyApplied: number;
  /** Rewards the player earned (after bonus multiplier applied to money). */
  rewardsEarned: GateReward[];
  /** The player left before finishing ("oops, wrong way") — nothing is applied. */
  exited?: boolean;
  /** The player skipped the questions with a Bypass Card (the caller takes the card). */
  bypassed?: boolean;
  /** Questions skipped with Skip Cards (the caller takes the cards — also when the player left). */
  skipsUsed?: number;
}

/** A bonus pool smaller than this widens to easier templates (the numbers stay at the harder grade). */
const MIN_BONUS_POOL = 4;
/** Bonus templates of the last gates (memory only) — skipped while other templates are left. */
const RECENT_BONUS_MEMORY = 4;
const recentBonusTemplates: string[] = [];

// ─── GateSession ────────────────────────────────────────────────────────────────────

export class GateSession {
  private readonly config: GateSessionConfig;
  private readonly snapshot = buildSnapshot();
  private readonly gradeId = gradeFromBirthYear(getPlayerBirthYear());
  private readonly birthYear = getPlayerBirthYear();

  private correctCount = 0;
  private totalAttempts = 0;

  /** Bumped by 1 for every wrong answer (you must earn one extra correct). */
  private requiredTotal: number;

  /** Last-used template id (so retries reuse exact same template). */
  private lastTemplateId = '';

  /** Tracks how many simple-input questions remain to be served. */
  private inputQuestionsRemaining: number;

  /** Type of the most recently served question — used to generate same-type retries. */
  private lastQuestionType: 'rich' | 'input' = 'rich';

  private phase: 'main' | 'bonus' | 'done' = 'main';
  private bonusPassed: boolean | null = null;
  private bypassed = false;
  private skipsUsed = 0;
  /** Templates served in this session — the bonus question picks another one. */
  private readonly servedTemplates = new Set<string>();

  constructor(config: GateSessionConfig) {
    this.config = config;
    this.requiredTotal = config.questionsRequired;
    const inputCount = config.inputQuestions?.count ?? 0;
    // Clamp: can't have more input questions than questionsRequired
    this.inputQuestionsRemaining = Math.min(inputCount, config.questionsRequired);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isComplete(): boolean {
    return this.phase === 'done';
  }
  get isBonusPhase(): boolean {
    return this.phase === 'bonus';
  }
  get currentCorrect(): number {
    return this.correctCount;
  }
  get currentRequired(): number {
    return this.requiredTotal;
  }

  /**
   * Generate the next question for the current phase.
   * Returns a RichQuestion (story-themed, multiple choice) OR a SimpleInputQuestion
   * (plain arithmetic, typed answer) depending on the session config.
   */
  nextQuestion(): AnyQuestion {
    // Bonus phase always uses a rich question at elevated difficulty
    if (this.phase === 'bonus') return this._nextBonusQuestion();

    // Decide whether to serve a simple input question.
    // Probability = remaining input questions / remaining total questions.
    const totalRemaining = this.requiredTotal - this.correctCount;
    if (
      this.inputQuestionsRemaining > 0 &&
      (totalRemaining <= this.inputQuestionsRemaining || Math.random() < this.inputQuestionsRemaining / totalRemaining)
    ) {
      this.inputQuestionsRemaining--;
      this.lastQuestionType = 'input';
      const types = this.config.inputQuestions?.types as SimpleOpType[] | undefined;
      return generateSimpleInputQuestion(this.gradeId, types, this.birthYear);
    }

    this.lastQuestionType = 'rich';
    return this._nextRichQuestion(getClassConfig(this.gradeId));
  }

  private _nextRichQuestion(config: ClassConfig): RichQuestion {
    const builder = new QuestionBuilder().withConfig(config).withSnapshot(this.snapshot);
    const q = builder.build();
    this.lastTemplateId = q.templateId;
    this.servedTemplates.add(q.templateId);
    return q;
  }

  /** A harder question than the regular ones, from a template not seen in this gate or the last few bonuses. */
  private _nextBonusQuestion(): RichQuestion {
    const cfg = this._buildBonusConfig();
    const pool = registry.forConfig(cfg);
    const notRecent = pool.filter((tpl) => !recentBonusTemplates.includes(tpl.id));
    const fresh = notRecent.filter((tpl) => !this.servedTemplates.has(tpl.id));
    const options = fresh.length > 0 ? fresh : notRecent.length > 0 ? notRecent : pool;
    const template = options[Math.floor(Math.random() * options.length)];
    recentBonusTemplates.push(template.id);
    if (recentBonusTemplates.length > RECENT_BONUS_MEMORY) recentBonusTemplates.shift();
    const q = new QuestionBuilder().withConfig(cfg).withSnapshot(this.snapshot).withTemplateId(template.id).build();
    this.lastTemplateId = q.templateId;
    this.servedTemplates.add(q.templateId);
    return q;
  }

  /**
   * Submit an answer for the current question.
   * Returns feedback including whether a retry question should be shown.
   */
  submitAnswer(value: number, correctAnswer: number): AnswerFeedback {
    this.totalAttempts++;

    if (value === correctAnswer) {
      this.correctCount++;
      const mainPhaseComplete = this.correctCount >= this.requiredTotal;

      if (this.phase === 'bonus') {
        this.bonusPassed = true;
        this.phase = 'done';
      } else if (mainPhaseComplete) {
        if (this.config.bonusEnabled) {
          this.phase = 'bonus';
        } else {
          this.phase = 'done';
        }
      }

      return {
        correct: true,
        correctCount: this.correctCount,
        required: this.requiredTotal,
        mainPhaseComplete,
      };
    }

    // Wrong answer in main phase — bump required count and provide a retry
    if (this.phase === 'main' && this.config.questionsRequired * 3 > this.requiredTotal) {
      this.requiredTotal++;
    } else if (this.phase === 'bonus') {
      // Bonus wrong = bonus failed, penalty cleared
      this.bonusPassed = false;
      this.phase = 'done';
      return {
        correct: false,
        correctCount: this.correctCount,
        required: this.requiredTotal,
        mainPhaseComplete: true,
      };
    }

    // Generate a retry question matching the type of the last question served
    let retryQuestion: AnyQuestion;

    if (this.lastQuestionType === 'input') {
      const types = this.config.inputQuestions?.types as SimpleOpType[] | undefined;
      retryQuestion = generateSimpleInputQuestion(this.gradeId, types, this.birthYear);
    } else {
      const cfg = getClassConfig(this.gradeId);
      const builder = new QuestionBuilder().withConfig(cfg).withSnapshot(this.snapshot);
      try {
        if (this.lastTemplateId) {
          registry.get(this.lastTemplateId);
          builder.withTemplateId(this.lastTemplateId);
        }
      } catch {
        /* template not found — use random */
      }
      const richRetry = builder.build();
      this.lastTemplateId = richRetry.templateId;
      this.servedTemplates.add(richRetry.templateId);
      retryQuestion = richRetry;
    }

    return {
      correct: false,
      retryQuestion,
      correctCount: this.correctCount,
      required: this.requiredTotal,
      mainPhaseComplete: false,
    };
  }

  get wasBypassed(): boolean {
    return this.bypassed;
  }

  /** Bypass Card: the main questions are done at once; the bonus question follows when the gate has one. */
  bypass(): void {
    if (this.phase !== 'main') return;
    this.bypassed = true;
    this.phase = this.config.bonusEnabled ? 'bonus' : 'done';
  }

  get questionsSkipped(): number {
    return this.skipsUsed;
  }

  /** Skip Card: the current main question counts as answered (no attempt). Returns whether the main phase is done. */
  skipQuestion(): boolean {
    if (this.phase !== 'main') return false;
    this.skipsUsed++;
    this.correctCount++;
    const done = this.correctCount >= this.requiredTotal;
    if (done) this.phase = this.config.bonusEnabled ? 'bonus' : 'done';
    return done;
  }

  /** Skip bonus phase (player chose not to answer optional question). */
  skipBonus(): void {
    if (this.phase === 'bonus') {
      this.bonusPassed = null;
      this.phase = 'done';
    }
  }

  /** Compute the final result once the session is done. */
  getResult(): SessionResult {
    // Skipped questions are neither right nor wrong — the score counts the answered ones only
    const answeredRight = this.correctCount - this.skipsUsed;
    const successRate = this.totalAttempts > 0 ? answeredRight / this.totalAttempts : 1;

    const meetsRewardThreshold = successRate >= this.config.rewardThreshold;
    const belowPenaltyThreshold = successRate < this.config.penaltyThreshold;

    // A Bypass Card never comes with a fine
    const penaltyApplied =
      belowPenaltyThreshold && this.bonusPassed !== true && !this.bypassed ? this.config.penaltyAmount : 0;

    let rewardsEarned: GateReward[] = [];
    if (meetsRewardThreshold) {
      rewardsEarned = this.config.rewards.map((r) => {
        if (r.type === 'money' && this.bonusPassed === true && r.amount !== undefined) {
          return { ...r, amount: Math.round(r.amount * this.config.bonusMultiplier) };
        }
        return r;
      });
    }

    return {
      passed: true, // session always ends with a pass (player answered enough correct)
      correctCount: this.correctCount,
      totalAttempts: this.totalAttempts,
      successRate,
      bonusPassed: this.bonusPassed,
      penaltyApplied,
      rewardsEarned,
      bypassed: this.bypassed,
      skipsUsed: this.skipsUsed,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * The bonus grade (1–2 above the player's) with difficulty starting just above the player's top level.
   * Too few templates there → the range widens down one level at a time; the bonus grade's bigger numbers
   * and extra operations keep it harder than the regular questions.
   */
  private _buildBonusConfig(): ClassConfig {
    const gradeNum = Number(this.gradeId.replace('grade', ''));
    const boost = Math.random() < 0.5 ? 1 : 2;
    const bonusBase = getClassConfig(`grade${Math.min(6, gradeNum + boost)}` as GradeId);
    const top = bonusBase.difficultyRange[1];
    let min = Math.min(getClassConfig(this.gradeId).difficultyRange[1] + 1, top);
    const withMin = (m: number): ClassConfig => ({ ...bonusBase, difficultyRange: [m as MathDifficulty, top] });
    while (min > 1 && registry.forConfig(withMin(min)).length < MIN_BONUS_POOL) min--;
    return withMin(min);
  }
}
