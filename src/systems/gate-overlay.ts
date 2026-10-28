/**
 * GateOverlay — HTML overlay for question gate sessions.
 *
 * Renders a full-screen question UI on top of the game canvas.
 * The game's canvas continues to render a frozen/dim background beneath.
 *
 * Mount flow:
 *   const result = await mountGateOverlay(appContainer, options);
 *   // overlay unmounts automatically when session ends
 *
 * Design principles:
 *   - No "reveal answer" button — player must pick and commit
 *   - Wrong answer: hint shown, new question generated (same template type, fresh numbers)
 *   - Correct: progress bar advances, next question auto-loaded
 *   - Bilingual: uses isRTL() + getLocale() from i18n system
 *   - Full-screen, z-index 500 so it covers canvas and all game UI
 */

import { GateSession } from './gate-session.js';
import { getLocale, isRTL, tFor } from '../i18n/i18n.js';
import type { GateSessionConfig } from '../data/story/gates.js';
import type { SessionResult, AnswerFeedback, AnyQuestion } from './gate-session.js';
import type { RichQuestion, QuestionAsset } from '../math/question-builder/index.js';
import type { SimpleInputQuestion } from '../math/simple-input-question.js';
import { getItem } from '../data/items.js';

// Re-export so gate-scene can use the same type
export type { SessionResult };

/** Type guard — distinguishes SimpleInputQuestion from RichQuestion. */
function isSimpleInput(q: AnyQuestion): q is SimpleInputQuestion {
  return (q as SimpleInputQuestion).type === 'simple-input';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GateOverlayOptions {
  gateId: string;
  sessionConfig: GateSessionConfig;
  /** Dialogue shown at the start (one is selected at random). */
  introDialogues: Array<{ en: string; he: string }>;
  /** The container element — typically document.getElementById('app'). */
  container: HTMLElement;
  /** Locale override. Defaults to getLocale(). */
  locale?: 'he' | 'en';
}

/**
 * Mount the gate overlay over the game canvas and run a full question session.
 * Returns a promise that resolves with the session result when the player finishes.
 */
export function mountGateOverlay(opts: GateOverlayOptions): Promise<SessionResult> {
  return new Promise(resolve => {
    new GateOverlayController(opts, resolve);
  });
}

// ─── Internal controller ──────────────────────────────────────────────────────

class GateOverlayController {
  private readonly opts: GateOverlayOptions;
  private readonly resolve: (r: SessionResult) => void;
  private readonly session: GateSession;
  private readonly el: HTMLDivElement;
  private readonly locale: 'he' | 'en';

  private currentQuestion: AnyQuestion | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private timerRemaining = 0;
  private inputLocked = false;
  /** Button highlighted for keyboard play (re-picked whenever a screen re-renders). */
  private kbSelected: HTMLButtonElement | null = null;
  private readonly onKeyDown = (e: KeyboardEvent): void => this._handleKey(e);

  constructor(opts: GateOverlayOptions, resolve: (r: SessionResult) => void) {
    this.opts = opts;
    this.resolve = resolve;
    this.session = new GateSession(opts.sessionConfig);
    this.locale = opts.locale ?? getLocale();

    // Build outer overlay div
    this.el = document.createElement('div');
    this.el.id = 'gate-overlay';
    this.el.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
    opts.container.appendChild(this.el);

    this._injectStyles();
    window.addEventListener('keydown', this.onKeyDown, true);
    this._showIntro();
  }

  private _t(key: string, params?: Record<string, string | number>): string {
    return tFor(this.locale, key, params);
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  // Arrows move between answers/buttons, 1–9 pick an answer, Enter/Space press,
  // Esc = "oops, wrong way". The typed-answer box handles its own Enter.

  /** Pressable buttons on the current screen, in reading order. */
  private _kbButtons(): HTMLButtonElement[] {
    return [...this.el.querySelectorAll<HTMLButtonElement>('.go-choice, .go-btn')].filter((b) => !b.disabled);
  }

  private _kbSelect(btn: HTMLButtonElement | null): void {
    this.kbSelected?.classList.remove('go-kb-selected');
    this.kbSelected = btn;
    btn?.classList.add('go-kb-selected');
  }

  /** Arrow navigation: answers are a 2-column grid, the other buttons a vertical list. */
  private _kbMove(dx: number, dy: number): void {
    const buttons = this._kbButtons();
    if (buttons.length === 0) return;
    const current = this.kbSelected && buttons.includes(this.kbSelected) ? this.kbSelected : null;
    if (!current) {
      this._kbSelect(buttons[0]);
      return;
    }
    const choices = buttons.filter((b) => b.classList.contains('go-choice'));
    const ci = choices.indexOf(current);
    let next: HTMLButtonElement | undefined;
    if (ci >= 0 && dx !== 0) {
      // Left/right stay in the same row; flip for right-to-left layout
      const step = isRTL() ? -dx : dx;
      const j = ci + step;
      if (j >= 0 && j < choices.length && Math.floor(j / 2) === Math.floor(ci / 2)) next = choices[j];
    } else if (ci >= 0) {
      next = choices[ci + dy * 2] ?? (dy > 0 ? buttons[buttons.indexOf(choices[choices.length - 1]) + 1] : undefined);
    } else {
      const i = buttons.indexOf(current);
      next = buttons[i + (dy || dx)];
    }
    if (next) this._kbSelect(next);
  }

  private _handleKey(e: KeyboardEvent): void {
    if (!this.el.isConnected) return;
    const typing = (e.target as HTMLElement | null)?.tagName === 'INPUT';
    const leave = this.el.querySelector<HTMLButtonElement>('.go-leave-btn');

    if (e.code === 'Escape') {
      if (leave && !this.inputLocked) leave.click();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (typing || this.inputLocked || e.repeat) return;

    // Typed-answer screen: a digit puts the cursor back in the answer box
    const answerBox = this.el.querySelector<HTMLInputElement>('#go-iq-input');
    if (answerBox && !answerBox.disabled && /^(Digit|Numpad)\d$|^Minus$/.test(e.code)) {
      answerBox.focus();
      return;
    }

    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const arrow = arrows[e.code];
    if (arrow) {
      this._kbMove(arrow[0], arrow[1]);
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      // Nothing picked yet: press the main button, or just highlight the first answer
      const buttons = this._kbButtons();
      const selected = this.kbSelected && buttons.includes(this.kbSelected) ? this.kbSelected : null;
      const target = selected ?? buttons.find((b) => b.classList.contains('go-btn-primary'));
      if (target) target.click();
      else this._kbMove(0, 0);
    } else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) {
      const choices = this._kbButtons().filter((b) => b.classList.contains('go-choice'));
      choices[Number(e.code.slice(-1)) - 1]?.click();
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  // ── Phase: intro dialogue ──────────────────────────────────────────────────

  private _showIntro(): void {
    const dialogues = this.opts.introDialogues;
    const idx = Math.floor(Math.random() * dialogues.length);
    const text = dialogues[idx][this.locale];
    const continueLabel = this._t('gate.ui.start');
    const titleLabel = this._t('gate.ui.introTitle');

    this.el.innerHTML = /* html */`
      <div class="go-backdrop"></div>
      <div class="go-panel go-intro-panel">
        <div class="go-null-icon">🛡️</div>
        <h2 class="go-title">${titleLabel}</h2>
        <p class="go-intro-text">${text}</p>
        <button class="go-btn go-btn-primary go-continue-btn">${continueLabel}</button>
        ${this._leaveButtonHtml()}
      </div>
    `;

    this.el.querySelector('.go-continue-btn')!.addEventListener('click', () => {
      this._startMainPhase();
    });
    this._wireLeaveButton();
  }

  // ── Phase: questions ───────────────────────────────────────────────────────

  private _startMainPhase(): void {
    this.currentQuestion = this.session.nextQuestion();
    this._showQuestion(false);
  }

  private _showQuestion(isRetry: boolean): void {
    this.inputLocked = false;
    this._stopTimer();

    const q = this.currentQuestion!;

    // Branch: simple input vs rich (multiple choice)
    if (isSimpleInput(q)) {
      this._showInputQuestion(q, isRetry);
    } else {
      this._showRichQuestion(q as RichQuestion, isRetry);
    }
  }

  /** Render a simple arithmetic input question (player types the answer). */
  private _showInputQuestion(q: SimpleInputQuestion, isRetry: boolean): void {
    const correct = this.session.currentCorrect;
    const required = this.session.currentRequired;

    const progressLabel = this._t('gate.ui.progress', { correct, required });

    const retryBadge = isRetry ? `<span class="go-retry-badge">${this._t('gate.ui.retry')}</span>` : '';

    const timerLimit = this.opts.sessionConfig.timeLimitPerQuestion;
    const showTimer = timerLimit > 0;
    this.timerRemaining = timerLimit;

    const submitLabel = this._t('gate.ui.check');
    const placeholder = this._t('gate.ui.answerPlaceholder');

    this.el.innerHTML = /* html */`
      <div class="go-backdrop"></div>
      <div class="go-panel">

        <div class="go-header">
          <div class="go-progress-bar-track">
            <div class="go-progress-bar-fill" style="width:${(correct / required) * 100}%"></div>
          </div>
          <div class="go-progress-label">${progressLabel}</div>
          ${showTimer ? `<div class="go-timer" id="go-timer">${this.timerRemaining}s</div>` : ''}
          ${retryBadge}
        </div>

        <!-- dir="ltr": arithmetic is always written left-to-right regardless of locale -->
        <div class="go-iq-expression" dir="ltr">${q.expression}</div>

        <div class="go-iq-input-row">
          <input
            type="number"
            id="go-iq-input"
            class="go-iq-input"
            placeholder="${placeholder}"
            autocomplete="off"
            inputmode="numeric"
          />
          <button class="go-btn go-btn-primary go-iq-submit">${submitLabel}</button>
        </div>

        <div id="go-feedback-area" class="go-feedback-area"></div>
        ${this._leaveButtonHtml()}
      </div>
    `;
    this._wireLeaveButton();

    const inputEl = this.el.querySelector<HTMLInputElement>('#go-iq-input')!;
    setTimeout(() => inputEl?.focus(), 50);

    const handleSubmit = () => {
      if (this.inputLocked) return;
      const raw = inputEl.value.trim();
      if (raw === '') return;
      const parsed = parseFloat(raw);
      if (isNaN(parsed)) return;
      this._handleAnswer(Math.round(parsed));
    };

    this.el.querySelector('.go-iq-submit')!.addEventListener('click', handleSubmit);
    inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    });

    if (showTimer) this._startTimer(timerLimit);
  }

  /** Render a rich (story-themed, multiple-choice) question. */
  private _showRichQuestion(q: RichQuestion, isRetry: boolean): void {
    const loc = this.locale;
    const text = q.question[loc];
    const correct = this.session.currentCorrect;
    const required = this.session.currentRequired;

    const progressLabel = this._t('gate.ui.progress', { correct, required });

    const retryBadge = isRetry ? `<span class="go-retry-badge">${this._t('gate.ui.retry')}</span>` : '';

    const timerLimit = this.opts.sessionConfig.timeLimitPerQuestion;
    const showTimer = timerLimit > 0;
    this.timerRemaining = timerLimit;

    const assetsHtml = q.assets.length > 0
      ? `<div class="go-assets">${q.assets.map((a: QuestionAsset) => `
          <div class="go-asset">
            <img src="${a.spriteUrl}" alt="${a.label[loc]}"
              onerror="this.style.display='none'"
              class="go-sprite go-sprite-${a.kind}" />
            <span class="go-asset-label">${a.label[loc]}</span>
          </div>`).join('')}
         </div>`
      : '';

    const choicesHtml = q.choices
      ? `<div class="go-choices">${q.choices.map((c: number) =>
          `<button class="go-choice" data-value="${c}">${_fmtNum(c)}</button>`
        ).join('')}</div>`
      : '';

    this.el.innerHTML = /* html */`
      <div class="go-backdrop"></div>
      <div class="go-panel">

        <div class="go-header">
          <div class="go-progress-bar-track">
            <div class="go-progress-bar-fill" style="width:${(correct / required) * 100}%"></div>
          </div>
          <div class="go-progress-label">${progressLabel}</div>
          ${showTimer ? `<div class="go-timer" id="go-timer">${this.timerRemaining}s</div>` : ''}
          ${retryBadge}
        </div>

        ${assetsHtml}

        <div class="go-question-text" dir="${loc === 'he' ? 'rtl' : 'ltr'}">${text.replaceAll('\n', '<br>')}</div>

        ${choicesHtml}

        <div id="go-feedback-area" class="go-feedback-area"></div>
        ${this._leaveButtonHtml()}
      </div>
    `;
    this._wireLeaveButton();

    this.el.querySelectorAll('.go-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.inputLocked) return;
        const val = parseInt((btn as HTMLButtonElement).dataset.value ?? '0', 10);
        this._handleAnswer(val);
      });
    });

    if (showTimer) this._startTimer(timerLimit);
  }

  private _handleAnswer(value: number): void {
    if (this.inputLocked) return;
    this.inputLocked = true;
    this._stopTimer();

    const q = this.currentQuestion!;
    const correctAnswer = isSimpleInput(q) ? q.answer : (q as RichQuestion).correctAnswer;
    const feedback = this.session.submitAnswer(value, correctAnswer);
    const loc = this.locale;

    if (isSimpleInput(q)) {
      // Disable the input field
      const inputEl = this.el.querySelector<HTMLInputElement>('#go-iq-input');
      const submitBtn = this.el.querySelector<HTMLButtonElement>('.go-iq-submit');
      if (inputEl) inputEl.disabled = true;
      if (submitBtn) submitBtn.disabled = true;

      if (feedback.correct) {
        this._showFeedbackCorrect(feedback);
      } else {
        this._showFeedbackWrong(feedback, undefined);
      }
    } else {
      // Visual feedback on choice buttons
      const richQ = q as RichQuestion;
      this.el.querySelectorAll('.go-choice').forEach(btn => {
        const btnVal = parseInt((btn as HTMLButtonElement).dataset.value ?? '', 10);
        if (btnVal === richQ.correctAnswer) {
          btn.classList.add('go-correct');
        } else if (btnVal === value && value !== richQ.correctAnswer) {
          btn.classList.add('go-wrong');
        }
        (btn as HTMLButtonElement).disabled = true;
      });

      if (feedback.correct) {
        this._showFeedbackCorrect(feedback);
      } else {
        this._showFeedbackWrong(feedback, richQ.hint?.[loc]);
      }
    }
  }

  private _showFeedbackCorrect(feedback: AnswerFeedback): void {
    const area = this.el.querySelector('#go-feedback-area')!;
    area.innerHTML = `<div class="go-feedback go-feedback-ok">${this._t('gate.ui.correct')}</div>`;

    setTimeout(() => {
      if (feedback.mainPhaseComplete && this.session.isBonusPhase) {
        this._showBonusIntro();
      } else if (this.session.isComplete) {
        this._showResult();
      } else {
        this.currentQuestion = this.session.nextQuestion();
        this._showQuestion(false);
      }
    }, 700);
  }

  private _showFeedbackWrong(
    feedback: AnswerFeedback,
    hint?: string,
  ): void {
    const area = this.el.querySelector('#go-feedback-area')!;

    const wrongMsg = this._t('gate.ui.wrong');
    const addedMsg = this._t('gate.ui.addedQuestion', { required: feedback.required });
    const hintHtml = hint
      ? `<div class="go-hint">💡 ${hint}</div>`
      : '';

    area.innerHTML = `
      <div class="go-feedback go-feedback-bad">
        <div>${wrongMsg}</div>
        <div class="go-added-msg">${addedMsg}</div>
        ${hintHtml}
      </div>
    `;

    setTimeout(() => {
      if (this.session.isComplete) {
        this._showResult();
        return;
      }
      if (feedback.retryQuestion) {
        this.currentQuestion = feedback.retryQuestion;
      }
      this._showQuestion(true);
    }, 2000);
  }

  // ── Phase: bonus question ──────────────────────────────────────────────────

  private _showBonusIntro(): void {
    const titleText = this._t('gate.ui.bonusTitle');
    const bodyText = this._t('gate.ui.bonusBody', { multiplier: this.opts.sessionConfig.bonusMultiplier });
    const yesLabel = this._t('gate.ui.bonusYes');
    const skipLabel = this._t('gate.ui.bonusSkip');

    this.el.innerHTML = /* html */`
      <div class="go-backdrop"></div>
      <div class="go-panel go-bonus-panel">
        <div class="go-bonus-star">⭐</div>
        <h2 class="go-title go-title-gold">${titleText}</h2>
        <p class="go-bonus-desc">${bodyText.replaceAll('\n', '<br>')}</p>
        <div class="go-bonus-actions">
          <button class="go-btn go-btn-primary go-accept-bonus">${yesLabel}</button>
          <button class="go-btn go-btn-ghost go-skip-bonus">${skipLabel}</button>
        </div>
      </div>
    `;

    this.el.querySelector('.go-accept-bonus')!.addEventListener('click', () => {
      this.currentQuestion = this.session.nextQuestion();
      this._showQuestion(false);
    });
    this.el.querySelector('.go-skip-bonus')!.addEventListener('click', () => {
      this.session.skipBonus();
      this._showResult();
    });
  }

  // ── Phase: result ──────────────────────────────────────────────────────────

  private _showResult(): void {
    const result = this.session.getResult();
    const loc = this.locale;

    const pct = Math.round(result.successRate * 100);
    const pctColor = pct >= 80 ? '#00ff88' : pct >= 50 ? '#ffcc44' : '#ff4466';

    const successLabel = this._t('gate.ui.score');
    const rewardLabel = this._t('gate.ui.prizes');
    const continueLabel = this._t('gate.ui.continue');
    const multiplier = this.opts.sessionConfig.bonusMultiplier;

    const bonusBadge = result.bonusPassed === true
      ? `<div class="go-bonus-win">${this._t('gate.ui.bonusWin', { multiplier })}</div>`
      : result.bonusPassed === false
      ? `<div class="go-bonus-save">${this._t('gate.ui.bonusMiss')}</div>`
      : '';

    const rewardsHtml = result.rewardsEarned.length > 0
      ? `<div class="go-rewards-section">
          <div class="go-rewards-title">${rewardLabel}</div>
          ${result.rewardsEarned.map(r => {
            if (r.type === 'money') return `<div class="go-reward-row">${this._t('gate.ui.money', { amount: r.amount ?? 0 })}</div>`;
            // Resolve item name (supports numeric id or slug)
            const def = r.itemId ? getItem(r.itemId) : undefined;
            const name = def ? def.name[loc] ?? def.name.en : r.itemId ?? '?';
            return `<div class="go-reward-row">🎒 ${name} × ${r.quantity ?? 1}</div>`;
          }).join('')}
         </div>`
      : '';

    const penaltyHtml = result.penaltyApplied > 0
      ? `<div class="go-penalty">${this._t('gate.ui.fine', { amount: result.penaltyApplied })}</div>`
      : '';

    this.el.innerHTML = /* html */`
      <div class="go-backdrop"></div>
      <div class="go-panel go-result-panel">
        <h2 class="go-title go-title-pass">${this._t('gate.ui.passed')}</h2>

        <div class="go-stat-row">
          <span>${successLabel}</span>
          <span style="color:${pctColor};font-weight:700">${pct}%</span>
        </div>
        <div class="go-stat-row">
          <span>${this._t('gate.ui.rightAnswers')}</span>
          <span>${result.correctCount} / ${result.totalAttempts}</span>
        </div>

        ${bonusBadge}
        ${rewardsHtml}
        ${penaltyHtml}

        <button class="go-btn go-btn-primary go-done-btn">${continueLabel}</button>
      </div>
    `;

    this.el.querySelector('.go-done-btn')!.addEventListener('click', () => {
      this._unmount(result);
    });
  }

  // ── Leave ("oops, wrong way") ──────────────────────────────────────────────

  private _leaveButtonHtml(): string {
    return `<button class="go-btn go-btn-ghost go-leave-btn">${this._t('gate.ui.leave')}</button>`;
  }

  private _wireLeaveButton(): void {
    this.el.querySelector('.go-leave-btn')?.addEventListener('click', () => this._leave());
  }

  /** Walk away without finishing: no rewards, no penalty, the gate stays locked. */
  private _leave(): void {
    this._unmount({
      passed: false,
      exited: true,
      correctCount: 0,
      totalAttempts: 0,
      successRate: 0,
      bonusPassed: null,
      penaltyApplied: 0,
      rewardsEarned: [],
    });
  }

  // ── Timer ──────────────────────────────────────────────────────────────────

  private _startTimer(seconds: number): void {
    this.timerRemaining = seconds;
    this.timerHandle = setInterval(() => {
      this.timerRemaining--;

      const timerEl = this.el.querySelector<HTMLElement>('#go-timer');
      if (timerEl) {
        timerEl.textContent = `${this.timerRemaining}s`;
        if (this.timerRemaining <= 5) timerEl.classList.add('go-timer-urgent');
      }

      if (this.timerRemaining <= 0) {
        this._stopTimer();
        if (!this.inputLocked) {
          // Time expired → treat as a wrong answer with a dummy value
          this._handleAnswer(-Infinity);
        }
      }
    }, 1000);
  }

  private _stopTimer(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private _unmount(result: SessionResult): void {
    this._stopTimer();
    window.removeEventListener('keydown', this.onKeyDown, true);
    this.el.remove();
    this.resolve(result);
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  private _injectStyles(): void {
    if (document.getElementById('gate-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'gate-overlay-styles';
    style.textContent = /* css */`
      /* ── Overlay ── */
      #gate-overlay {
        position: absolute;
        inset: 0;
        z-index: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Rubik', system-ui, sans-serif;
      }

      .go-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(5, 5, 20, 0.88);
        backdrop-filter: blur(2px);
      }

      /* ── Panel ── */
      .go-panel {
        position: relative;
        z-index: 1;
        background: #12122a;
        border: 2px solid #00d4ff;
        border-radius: 16px;
        padding: 28px 32px;
        width: min(540px, 92vw);
        max-height: 92vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 0 40px rgba(0, 212, 255, 0.25);
      }

      /* ── Header / progress ── */
      .go-header {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .go-progress-bar-track {
        flex: 1;
        height: 8px;
        background: #1e1e3a;
        border-radius: 4px;
        overflow: hidden;
        min-width: 80px;
      }
      .go-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d4ff, #00ff88);
        border-radius: 4px;
        transition: width 0.4s ease;
      }
      .go-progress-label {
        font-size: 12px;
        color: #aaaacc;
        white-space: nowrap;
      }
      .go-timer {
        font-size: 13px;
        font-weight: 700;
        color: #ffcc44;
        min-width: 36px;
        text-align: center;
      }
      .go-timer-urgent { color: #ff4466; animation: go-pulse 0.5s infinite alternate; }
      @keyframes go-pulse { from { opacity: 1; } to { opacity: 0.4; } }

      .go-retry-badge {
        background: #ff8c00;
        color: #000;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
      }

      /* ── Title / headings ── */
      .go-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        color: #00d4ff;
        text-align: center;
        line-height: 1.5;
      }
      .go-title-gold { color: #ffcc44; }
      .go-title-pass { color: #00ff88; }

      /* ── Intro panel ── */
      .go-intro-panel { text-align: center; }
      .go-null-icon { font-size: 48px; margin-bottom: 4px; }
      .go-intro-text {
        font-size: 14px;
        color: #ccccdd;
        line-height: 1.7;
      }

      /* ── Assets ── */
      .go-assets {
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .go-asset {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .go-sprite { width: 64px; height: 64px; image-rendering: pixelated; }
      .go-sprite-pokemon { width: 80px; height: 80px; }
      .go-asset-label { font-size: 11px; color: #8888aa; }

      /* ── Question text ── */
      .go-question-text {
        font-size: 15px;
        line-height: 1.8;
        color: #eeeeff;
        background: #0d0d22;
        border: 1px solid #2a2a55;
        border-radius: 10px;
        padding: 14px 18px;
      }

      /* ── Input question (simple arithmetic — typed answer) ── */
      .go-iq-expression {
        font-size: clamp(22px, 5vw, 36px);
        font-weight: 700;
        color: #00d4ff;
        text-align: center;
        padding: 18px 24px;
        background: #0d0d22;
        border: 2px solid #2a2a55;
        border-radius: 14px;
        letter-spacing: 3px;
        font-family: 'Courier New', 'Lucida Console', monospace;
        line-height: 1.4;
        direction: ltr;
        unicode-bidi: bidi-override;
      }
      .go-iq-input-row {
        display: flex;
        gap: 10px;
        align-items: stretch;
      }
      .go-iq-input {
        flex: 1;
        background: #1c1c38;
        border: 2px solid #3a3a66;
        border-radius: 10px;
        color: #eeeeff;
        font-size: 24px;
        font-weight: 700;
        padding: 12px 16px;
        outline: none;
        text-align: center;
        font-family: 'Courier New', monospace;
        min-width: 0;
        transition: border-color 0.15s;
      }
      .go-iq-input:focus { border-color: #00d4ff; }
      .go-iq-input:disabled { opacity: 0.5; }
      .go-iq-input::-webkit-inner-spin-button,
      .go-iq-input::-webkit-outer-spin-button { -webkit-appearance: none; }
      .go-iq-input[type=number] { -moz-appearance: textfield; }
      .go-iq-submit {
        width: auto !important;
        padding: 12px 22px !important;
        font-size: 14px !important;
        white-space: nowrap;
      }

      /* ── Choices ── */
      .go-choices {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .go-choice {
        background: #1c1c38;
        border: 2px solid #3a3a66;
        border-radius: 10px;
        color: #eeeeff;
        font-size: 18px;
        font-weight: 700;
        padding: 14px 8px;
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
      }
      .go-choice:hover:not(:disabled) {
        border-color: #00d4ff;
        background: #1e1e44;
      }
      .go-choice:disabled { cursor: default; }
      .go-choice.go-correct {
        border-color: #00ff88;
        background: rgba(0,255,136,0.12);
        color: #00ff88;
      }
      .go-choice.go-wrong {
        border-color: #ff4466;
        background: rgba(255,68,102,0.12);
        color: #ff4466;
      }

      /* ── Feedback ── */
      .go-feedback-area { min-height: 24px; }
      .go-feedback {
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 13px;
        line-height: 1.7;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .go-feedback-ok {
        background: rgba(0,255,136,0.10);
        border: 1px solid #00ff88;
        color: #00ff88;
      }
      .go-feedback-bad {
        background: rgba(255,68,102,0.10);
        border: 1px solid #ff4466;
        color: #ff4466;
      }
      .go-added-msg { font-size: 11px; color: #ff8c00; }
      .go-hint {
        margin-top: 4px;
        font-size: 12px;
        color: #ffcc44;
        background: rgba(255,204,68,0.08);
        border-radius: 6px;
        padding: 6px 10px;
        border: 1px solid rgba(255,204,68,0.25);
      }

      /* ── Bonus panel ── */
      .go-bonus-panel { text-align: center; }
      .go-bonus-star { font-size: 52px; }
      .go-bonus-desc { font-size: 14px; color: #ccccdd; line-height: 1.8; }
      .go-bonus-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .go-bonus-win {
        text-align: center;
        color: #ffcc44;
        font-size: 14px;
        font-weight: 700;
      }
      .go-bonus-save {
        text-align: center;
        color: #00ff88;
        font-size: 13px;
      }

      /* ── Result panel ── */
      .go-stat-row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #aaaacc;
        border-bottom: 1px solid #2a2a44;
        padding-bottom: 8px;
      }
      .go-rewards-section {
        background: rgba(0,255,136,0.07);
        border: 1px solid rgba(0,255,136,0.25);
        border-radius: 10px;
        padding: 12px 16px;
      }
      .go-rewards-title {
        font-size: 13px;
        font-weight: 700;
        color: #00ff88;
        margin-bottom: 6px;
      }
      .go-reward-row { font-size: 13px; color: #ccddcc; }
      .go-penalty {
        background: rgba(255,68,102,0.08);
        border: 1px solid rgba(255,68,102,0.3);
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        color: #ff4466;
      }

      /* ── Buttons ── */
      .go-btn {
        border: none;
        border-radius: 10px;
        font-family: 'Rubik', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 700;
        padding: 12px 24px;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.1s;
      }
      .go-btn:active { transform: scale(0.96); }
      .go-btn-primary {
        background: linear-gradient(135deg, #00d4ff, #0088cc);
        color: #000;
        width: 100%;
      }
      .go-btn-primary:hover { opacity: 0.88; }
      .go-btn-ghost {
        background: transparent;
        border: 2px solid #555577;
        color: #aaaacc;
      }
      .go-btn-ghost:hover { border-color: #8888aa; }
      .go-choice.go-kb-selected,
      .go-btn.go-kb-selected {
        outline: 3px solid #ffcc44;
        outline-offset: 2px;
      }
      .go-leave-btn {
        display: block;
        margin: 12px auto 0;
        padding: 8px 16px;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function _fmtNum(n: number): string {
  if (!isFinite(n)) return '?';
  return n.toLocaleString();
}
