/**
 * InputMathOverlay — standalone HTML overlay for simple arithmetic input questions.
 *
 * Fully self-contained: injects its own styles, no dependency on gate-overlay-styles.
 *
 * The math expression is always rendered LTR (dir="ltr") even in RTL locales,
 * because arithmetic notation is universally read left-to-right.
 *
 * Usage:
 *   const result = await mountInputMathOverlay({ count: 3, gradeId: 'grade3', container });
 */

import {
  generateSimpleInputQuestion,
  type SimpleInputQuestion,
  type SimpleOpType,
} from '../math/simple-input-question.js';
import { getLocale, isRTL } from '../i18n/i18n.js';
import type { GradeId } from '../math/question-builder/types.js';

// ─── Public API ───────────────────────────────────────────────────────────────

export interface InputMathOverlayOptions {
  /** Number of correct answers required to finish. */
  count: number;
  /** Which operation types to include (undefined/empty = all grade-appropriate). */
  types?: SimpleOpType[];
  /** Grade to use for question difficulty. */
  gradeId: GradeId;
  /** The container element — typically document.getElementById('app'). */
  container: HTMLElement;
  /** Optional overlay title (bilingual). */
  title?: { en: string; he: string };
  /** Locale override — defaults to getLocale(). */
  locale?: 'he' | 'en';
}

export interface InputMathResult {
  correctCount: number;
  totalAttempts: number;
}

export function mountInputMathOverlay(opts: InputMathOverlayOptions): Promise<InputMathResult> {
  return new Promise(resolve => {
    new InputMathOverlayController(opts, resolve);
  });
}

// ─── Controller ───────────────────────────────────────────────────────────────

class InputMathOverlayController {
  private readonly opts: InputMathOverlayOptions;
  private readonly resolve: (r: InputMathResult) => void;
  private readonly el: HTMLDivElement;
  private readonly locale: 'he' | 'en';

  private correctCount = 0;
  private totalAttempts = 0;
  private requiredTotal: number;
  private currentQ: SimpleInputQuestion | null = null;
  private locked = false;

  constructor(opts: InputMathOverlayOptions, resolve: (r: InputMathResult) => void) {
    this.opts = opts;
    this.resolve = resolve;
    this.locale = opts.locale ?? getLocale();
    this.requiredTotal = Math.max(1, opts.count);

    this.el = document.createElement('div');
    this.el.id = 'imo-overlay';
    // Panel direction follows locale; expression inside is always LTR
    this.el.setAttribute('dir', isRTL() ? 'rtl' : 'ltr');
    opts.container.appendChild(this.el);

    this._injectStyles();
    this._showQuestion(false);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  private _showQuestion(isRetry: boolean): void {
    this.locked = false;
    this.currentQ = generateSimpleInputQuestion(
      this.opts.gradeId,
      this.opts.types as SimpleOpType[] | undefined,
    );
    const q = this.currentQ;
    const loc = this.locale;

    const titleText = this.opts.title
      ? this.opts.title[loc]
      : loc === 'he' ? '🧮 שאלת חשבון' : '🧮 Math Challenge';

    const progressLabel = loc === 'he'
      ? `${this.correctCount} / ${this.requiredTotal} נכון`
      : `${this.correctCount} / ${this.requiredTotal} correct`;

    const retryBadge = isRetry
      ? `<span class="imo-retry-badge">${loc === 'he' ? '🔁 נסה שוב' : '🔁 Try Again'}</span>`
      : '';

    const submitLabel = loc === 'he' ? 'אשר ✓' : 'Submit ✓';
    const placeholder = loc === 'he' ? 'הכנס תשובה...' : 'Enter answer...';

    this.el.innerHTML = /* html */`
      <div class="imo-backdrop"></div>
      <div class="imo-panel">

        <div class="imo-header">
          <div class="imo-progress-track">
            <div class="imo-progress-fill"
              style="width:${(this.correctCount / this.requiredTotal) * 100}%"></div>
          </div>
          <div class="imo-progress-label">${progressLabel}</div>
          ${retryBadge}
        </div>

        <h2 class="imo-title">${titleText}</h2>

        <!-- dir="ltr": math is always written left-to-right regardless of locale -->
        <div class="imo-expression" dir="ltr">${q.expression}</div>

        <div class="imo-input-row">
          <input
            type="number"
            id="imo-answer-input"
            class="imo-input"
            placeholder="${placeholder}"
            autocomplete="off"
            inputmode="numeric"
          />
          <button class="imo-submit-btn">${submitLabel}</button>
        </div>

        <div id="imo-feedback-area" class="imo-feedback-area"></div>
      </div>
    `;

    const inputEl = this.el.querySelector<HTMLInputElement>('#imo-answer-input')!;
    const submitBtn = this.el.querySelector<HTMLButtonElement>('.imo-submit-btn')!;

    setTimeout(() => inputEl?.focus(), 50);

    const handleSubmit = () => {
      if (this.locked) return;
      const raw = inputEl.value.trim();
      if (raw === '') return;
      const parsed = parseFloat(raw);
      if (isNaN(parsed)) return;
      this._handleAnswer(Math.round(parsed));
    };

    submitBtn.addEventListener('click', handleSubmit);
    inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    });
  }

  // ── Answer handling ────────────────────────────────────────────────────────

  private _handleAnswer(value: number): void {
    if (this.locked || !this.currentQ) return;
    this.locked = true;
    this.totalAttempts++;

    const inputEl = this.el.querySelector<HTMLInputElement>('#imo-answer-input');
    const submitBtn = this.el.querySelector<HTMLButtonElement>('.imo-submit-btn');
    if (inputEl) inputEl.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    const correct = value === this.currentQ.answer;
    const loc = this.locale;
    const area = this.el.querySelector('#imo-feedback-area')!;

    if (correct) {
      this.correctCount++;
      area.innerHTML = `
        <div class="imo-feedback imo-feedback-ok">
          ✅ ${loc === 'he' ? 'נכון!' : 'Correct!'}
        </div>`;

      setTimeout(() => {
        if (this.correctCount >= this.requiredTotal) {
          this._unmount();
        } else {
          this._showQuestion(false);
        }
      }, 700);
    } else {
      if (this.requiredTotal < this.opts.count * 3) this.requiredTotal++;
      const ans = this.currentQ.answer;
      area.innerHTML = `
        <div class="imo-feedback imo-feedback-bad">
          <div>❌ ${loc === 'he' ? 'לא נכון!' : 'Wrong!'}</div>
          <div class="imo-added-msg">
            ${loc === 'he'
              ? `התשובה הנכונה: ${ans} — +1 שאלה (${this.requiredTotal} סה"כ)`
              : `Answer: ${ans} — +1 extra question (${this.requiredTotal} total)`}
          </div>
        </div>`;

      setTimeout(() => this._showQuestion(true), 1800);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private _unmount(): void {
    this.el.remove();
    this.resolve({ correctCount: this.correctCount, totalAttempts: this.totalAttempts });
  }

  // ── Styles — fully self-contained, no dependency on gate-overlay-styles ────

  private _injectStyles(): void {
    if (document.getElementById('imo-styles')) return;
    const style = document.createElement('style');
    style.id = 'imo-styles';
    style.textContent = /* css */`
      /* ── Overlay wrapper ── */
      #imo-overlay {
        position: absolute;
        inset: 0;
        z-index: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Rubik', system-ui, sans-serif;
      }

      /* ── Dark backdrop ── */
      .imo-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(5, 5, 20, 0.88);
        backdrop-filter: blur(2px);
      }

      /* ── Card panel ── */
      .imo-panel {
        position: relative;
        z-index: 1;
        background: #12122a;
        border: 2px solid #00d4ff;
        border-radius: 16px;
        padding: 28px 32px;
        width: min(500px, 92vw);
        max-height: 92vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 0 40px rgba(0, 212, 255, 0.25), 0 8px 32px rgba(0,0,0,0.6);
      }

      /* ── Header: progress bar + label ── */
      .imo-header {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .imo-progress-track {
        flex: 1;
        height: 8px;
        background: #1e1e3a;
        border-radius: 4px;
        overflow: hidden;
        min-width: 80px;
      }
      .imo-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d4ff, #00ff88);
        border-radius: 4px;
        transition: width 0.4s ease;
      }
      .imo-progress-label {
        font-size: 12px;
        color: #aaaacc;
        white-space: nowrap;
      }
      .imo-retry-badge {
        background: #ff8c00;
        color: #000;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 6px;
      }

      /* ── Title ── */
      .imo-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        color: #00d4ff;
        text-align: center;
        line-height: 1.5;
        margin: 0;
      }

      /* ── Expression — always LTR, large and clear ── */
      .imo-expression {
        font-size: clamp(26px, 6vw, 38px);
        font-weight: 700;
        color: #ffffff;
        text-align: center;
        padding: 20px 24px;
        background: #0d0d22;
        border: 2px solid #2a2a55;
        border-radius: 14px;
        letter-spacing: 4px;
        font-family: 'Courier New', 'Lucida Console', monospace;
        line-height: 1.4;
        direction: ltr; /* math is always LTR */
        unicode-bidi: bidi-override;
      }

      /* ── Input row ── */
      .imo-input-row {
        display: flex;
        gap: 10px;
        align-items: stretch;
      }
      .imo-input {
        flex: 1;
        background: #1c1c38;
        border: 2px solid #3a3a66;
        border-radius: 10px;
        color: #eeeeff;
        font-size: 26px;
        font-weight: 700;
        padding: 12px 16px;
        outline: none;
        text-align: center;
        font-family: 'Courier New', monospace;
        min-width: 0;
        transition: border-color 0.15s;
        direction: ltr;
      }
      .imo-input:focus { border-color: #00d4ff; }
      .imo-input:disabled { opacity: 0.5; }
      .imo-input::-webkit-inner-spin-button,
      .imo-input::-webkit-outer-spin-button { -webkit-appearance: none; }
      .imo-input[type=number] { -moz-appearance: textfield; }

      /* ── Submit button ── */
      .imo-submit-btn {
        background: linear-gradient(135deg, #00d4ff, #0088cc);
        border: none;
        border-radius: 10px;
        color: #000;
        font-family: 'Rubik', system-ui, sans-serif;
        font-size: 14px;
        font-weight: 700;
        padding: 12px 20px;
        cursor: pointer;
        white-space: nowrap;
        transition: transform 0.1s, opacity 0.1s;
        flex-shrink: 0;
      }
      .imo-submit-btn:hover { opacity: 0.88; }
      .imo-submit-btn:active { transform: scale(0.96); }
      .imo-submit-btn:disabled { opacity: 0.4; cursor: default; }

      /* ── Feedback ── */
      .imo-feedback-area { min-height: 24px; }
      .imo-feedback {
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 13px;
        line-height: 1.7;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .imo-feedback-ok {
        background: rgba(0,255,136,0.10);
        border: 1px solid #00ff88;
        color: #00ff88;
      }
      .imo-feedback-bad {
        background: rgba(255,68,102,0.10);
        border: 1px solid #ff4466;
        color: #ff4466;
      }
      .imo-added-msg {
        font-size: 11px;
        color: #ff8c00;
      }
    `;
    document.head.appendChild(style);
  }
}
