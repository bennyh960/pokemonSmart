/**
 * Question Builder Playground
 *
 * Interactive dev tool to preview dynamically generated questions.
 * Accessible at: http://localhost:5173/question-builder.html
 */

import {
  listGrades,
  getClassConfig,
  registry,
  buildSnapshot,
  QuestionBuilder,
} from '../math/question-builder/index.js';

import type { RichQuestion, GradeId, QuestionCategory } from '../math/question-builder/index.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const snapshot = buildSnapshot();

// ─── State ───────────────────────────────────────────────────────────────────

let currentGrade: GradeId = 'grade3';
let currentCategory: QuestionCategory | 'any' = 'any';
let currentTemplateId: string = '';
let locale: 'he' | 'en' = 'he';
let currentQuestion: RichQuestion | null = null;
let revealAnswer = false;

// ─── Mount ───────────────────────────────────────────────────────────────────

const root = document.getElementById('qb-root')!;
root.innerHTML = buildShell();
injectStyles();
bindEvents();
refreshTemplateList();
generateQuestion();

// ─── HTML Shell ───────────────────────────────────────────────────────────────

function buildShell(): string {
  const grades = listGrades();
  const gradeOptions = grades
    .map(g => {
      const cfg = getClassConfig(g);
      return `<option value="${g}" ${g === currentGrade ? 'selected' : ''}>${cfg.label.he} / ${cfg.label.en}</option>`;
    })
    .join('');

  return /* html */ `
    <div class="qb-layout">

      <!-- ── Sidebar ── -->
      <aside class="qb-sidebar">
        <div class="qb-logo">
          <span class="qb-logo-icon">🎮</span>
          <span class="qb-logo-text">Question Builder</span>
        </div>

        <section class="qb-section">
          <label class="qb-label">שכבה / Grade</label>
          <select id="grade-select" class="qb-select">${gradeOptions}</select>
        </section>

        <section class="qb-section">
          <label class="qb-label">קטגוריה / Category</label>
          <div id="category-pills" class="qb-pills">
            ${['any','store','battle','catch'].map(c =>
              `<button class="qb-pill${c === currentCategory ? ' active' : ''}" data-category="${c}">
                ${categoryLabel(c)}
              </button>`
            ).join('')}
          </div>
        </section>

        <section class="qb-section">
          <label class="qb-label">תבנית / Template</label>
          <select id="template-select" class="qb-select">
            <option value="">— אקראי / Random —</option>
          </select>
          <div id="template-meta" class="qb-template-meta"></div>
        </section>

        <section class="qb-section">
          <label class="qb-label">שפה / Language</label>
          <div class="qb-pills">
            <button class="qb-pill${locale === 'he' ? ' active' : ''}" id="lang-he">עברית</button>
            <button class="qb-pill${locale === 'en' ? ' active' : ''}" id="lang-en">English</button>
          </div>
        </section>

        <button id="generate-btn" class="qb-generate-btn">
          ⚡ Generate Question
        </button>

        <div id="error-box" class="qb-error" style="display:none"></div>
      </aside>

      <!-- ── Main ── -->
      <main class="qb-main">
        <div id="question-card" class="qb-card qb-empty">
          <p class="qb-hint-text">👈 Press Generate to create a question</p>
        </div>
      </main>

    </div>
  `;
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    any: '🎲 All',
    store: '🛒 Store',
    battle: '⚔️ Battle',
    catch: '🎯 Catch',
  };
  return map[cat] ?? cat;
}

// ─── Events ───────────────────────────────────────────────────────────────────

function bindEvents(): void {
  document.getElementById('grade-select')!.addEventListener('change', e => {
    currentGrade = (e.target as HTMLSelectElement).value as GradeId;
    refreshTemplateList();
  });

  document.getElementById('template-select')!.addEventListener('change', e => {
    currentTemplateId = (e.target as HTMLSelectElement).value;
    updateTemplateMeta();
  });

  document.getElementById('generate-btn')!.addEventListener('click', () => {
    revealAnswer = false;
    generateQuestion();
  });

  document.getElementById('lang-he')!.addEventListener('click', () => setLocale('he'));
  document.getElementById('lang-en')!.addEventListener('click', () => setLocale('en'));

  document.getElementById('category-pills')!.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest('[data-category]') as HTMLElement | null;
    if (!btn) return;
    currentCategory = btn.dataset.category as QuestionCategory | 'any';
    document.querySelectorAll('#category-pills .qb-pill').forEach(el =>
      el.classList.toggle('active', (el as HTMLElement).dataset.category === currentCategory)
    );
    currentTemplateId = '';
    refreshTemplateList();
  });
}

function setLocale(lang: 'he' | 'en'): void {
  locale = lang;
  document.querySelectorAll('#lang-he, #lang-en').forEach(el =>
    el.classList.toggle('active', el.id === `lang-${lang}`)
  );
  if (currentQuestion) renderCard(currentQuestion);
}

// ─── Template list ────────────────────────────────────────────────────────────

function refreshTemplateList(): void {
  const config = getClassConfig(currentGrade);
  let templates = registry.forConfig(config);
  if (currentCategory !== 'any') {
    templates = templates.filter(t => t.category === currentCategory);
  }

  const sel = document.getElementById('template-select') as HTMLSelectElement;
  sel.innerHTML = `<option value="">— אקראי / Random —</option>` +
    templates.map(t => {
      const label = locale === 'he' ? t.name.he : t.name.en;
      return `<option value="${t.id}" ${t.id === currentTemplateId ? 'selected' : ''}>${label}</option>`;
    }).join('');

  updateTemplateMeta();
}

function updateTemplateMeta(): void {
  const box = document.getElementById('template-meta')!;
  if (!currentTemplateId) { box.innerHTML = ''; return; }
  try {
    const t = registry.get(currentTemplateId);
    box.innerHTML = `
      <div class="qb-meta-row"><span>ID</span><code>${t.id}</code></div>
      <div class="qb-meta-row"><span>Difficulty</span><code>${t.minDifficulty}–${t.maxDifficulty}</code></div>
      <div class="qb-meta-row"><span>Ops</span><code>${t.requiredOperations.join(' ')}</code></div>
    `;
  } catch { box.innerHTML = ''; }
}

// ─── Question generation ──────────────────────────────────────────────────────

function generateQuestion(): void {
  const errBox = document.getElementById('error-box')!;
  errBox.style.display = 'none';
  try {
    const config = getClassConfig(currentGrade);
    const builder = new QuestionBuilder()
      .withConfig(config)
      .withSnapshot(snapshot);

    if (currentTemplateId) builder.withTemplateId(currentTemplateId);
    else if (currentCategory !== 'any') builder.withCategory(currentCategory as QuestionCategory);

    currentQuestion = builder.build();
    revealAnswer = false;
    renderCard(currentQuestion);
  } catch (err) {
    errBox.style.display = 'block';
    errBox.textContent = String(err);
  }
}

// ─── Small render helpers (keep ternaries flat) ───────────────────────────────

function getChoiceCls(value: number, correct: number): string {
  if (value === correct) return ' correct';
  return ' wrong';
}

function stepsTitle(): string {
  if (locale === 'he') return 'פתרון שלב בשלב';
  return 'Step-by-step solution';
}

function nextLabel(): string {
  if (locale === 'he') return 'שאלה הבאה';
  return 'Next Question';
}

function revealLabel(): string {
  if (locale === 'he') return 'הצג תשובה';
  return 'Reveal Answer';
}

function hintHtml(hint: RichQuestion['hint']): string {
  if (!hint) return '';
  return `<div class="qb-hint">💡 ${hint[locale]}</div>`;
}

function revealBtnHtml(): string {
  if (revealAnswer) return '';
  return `<button id="reveal-btn" class="qb-reveal-btn">${revealLabel()}</button>`;
}

function assetFallback(kind: string): string {
  if (kind === 'pokemon') return '🐾';
  return '🎒';
}

// ─── Card rendering ───────────────────────────────────────────────────────────

function renderCard(q: RichQuestion): void {
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const text = locale === 'he' ? q.question.he : q.question.en;

  // Assets row
  const assetsHtml = q.assets.length > 0
    ? `<div class="qb-assets">
        ${q.assets.map(a => {
          const fallbackIcon = assetFallback(a.kind);
          return `
          <div class="qb-asset">
            <img src="${a.spriteUrl}" alt="${a.label[locale]}"
              onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22><text y=%2240%22 font-size=%2240%22>${fallbackIcon}</text></svg>'"
              class="qb-sprite ${a.kind}" />
            <span class="qb-asset-label">${a.label[locale]}</span>
          </div>`;
        }).join('')}
       </div>`
    : '';

  // Choices
  const choicesHtml = q.choices
    ? `<div class="qb-choices">
        ${q.choices.map(c => {
          const cls = revealAnswer ? getChoiceCls(c, q.correctAnswer) : '';
          const disabledAttr = revealAnswer ? 'disabled' : '';
          return `<button class="qb-choice${cls}" data-value="${c}" ${disabledAttr}>${formatNumber(c)}</button>`;
        }).join('')}
       </div>`
    : '';

  // Answer + steps (shown after reveal)
  const stepsHtml = revealAnswer
    ? `<div class="qb-steps">
        <div class="qb-answer-badge">✅ ${formatNumber(q.correctAnswer)}</div>
        <h4 class="qb-steps-title">${stepsTitle()}</h4>
        ${q.steps.map(s => `<div class="qb-step">${s[locale]}</div>`).join('')}
        ${hintHtml(q.hint)}
       </div>`
    : '';

  // Meta chips
  const cfg = getClassConfig(currentGrade);

  const card = document.getElementById('question-card') as HTMLElement;
  card.className = 'qb-card';
  card.innerHTML = /* html */ `
    <div class="qb-card-header">
      <div class="qb-chips">
        <span class="qb-chip grade">${cfg.label[locale]}</span>
        <span class="qb-chip cat-${q.category}">${categoryLabel(q.category)}</span>
        <span class="qb-chip diff">Level ${q.difficulty}</span>
        <span class="qb-chip time">⏱ ${q.timeLimit}s</span>
      </div>
      <code class="qb-template-id">${q.templateId}</code>
    </div>

    ${assetsHtml}

    <div class="qb-question-text" dir="${dir}">${text.replaceAll('\n', '<br>')}</div>

    ${choicesHtml}

    ${revealBtnHtml()}

    ${stepsHtml}

    <div class="qb-card-footer">
      <button id="next-btn" class="qb-next-btn">⚡ ${nextLabel()}</button>
    </div>
  `;

  // Choice click
  card.querySelectorAll('.qb-choice:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      revealAnswer = true;
      renderCard(q);
    });
  });

  // Reveal click
  document.getElementById('reveal-btn')?.addEventListener('click', () => {
    revealAnswer = true;
    renderCard(q);
  });

  // Next
  document.getElementById('next-btn')?.addEventListener('click', () => {
    revealAnswer = false;
    generateQuestion();
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = /* css */ `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Rubik', system-ui, sans-serif;
      background: #0f0f1a;
      color: #e8e8f0;
      min-height: 100vh;
    }

    /* ── Layout ── */
    .qb-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      min-height: 100vh;
    }

    /* ── Sidebar ── */
    .qb-sidebar {
      background: #161625;
      border-right: 1px solid #2a2a44;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow-y: auto;
    }

    .qb-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-bottom: 20px;
      border-bottom: 1px solid #2a2a44;
    }
    .qb-logo-icon { font-size: 28px; }
    .qb-logo-text {
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: #ffcc44;
      line-height: 1.5;
    }

    .qb-section { display: flex; flex-direction: column; gap: 8px; }

    .qb-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #8888aa;
    }

    .qb-select {
      background: #1e1e30;
      color: #e8e8f0;
      border: 1px solid #3a3a55;
      border-radius: 8px;
      padding: 8px 12px;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%238888aa' d='M0 0l6 8 6-8z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: left 12px center;
    }
    .qb-select:focus { outline: none; border-color: #ffcc44; }

    .qb-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .qb-pill {
      background: #1e1e30;
      border: 1px solid #3a3a55;
      color: #aaaacc;
      border-radius: 20px;
      padding: 5px 12px;
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      transition: all .15s;
    }
    .qb-pill:hover { border-color: #ffcc44; color: #ffcc44; }
    .qb-pill.active {
      background: #ffcc44;
      border-color: #ffcc44;
      color: #0f0f1a;
      font-weight: 700;
    }

    .qb-template-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 2px;
    }
    .qb-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6666aa;
    }
    .qb-meta-row code {
      background: #1e1e30;
      padding: 2px 6px;
      border-radius: 4px;
      color: #aaffcc;
      font-size: 11px;
    }

    .qb-generate-btn {
      background: linear-gradient(135deg, #ffcc44, #ff8844);
      color: #0f0f1a;
      border: none;
      border-radius: 10px;
      padding: 12px 20px;
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      cursor: pointer;
      transition: transform .1s, box-shadow .1s;
      box-shadow: 0 4px 16px #ffcc4440;
    }
    .qb-generate-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px #ffcc4466;
    }
    .qb-generate-btn:active { transform: translateY(0); }

    .qb-error {
      background: #3a1a1a;
      border: 1px solid #aa3333;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #ff8888;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ── Main ── */
    .qb-main {
      padding: 32px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      overflow-y: auto;
    }

    /* ── Card ── */
    .qb-card {
      background: #1a1a2e;
      border: 1px solid #2a2a44;
      border-radius: 16px;
      padding: 28px 32px;
      max-width: 640px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 8px 40px #00000060;
    }
    .qb-card.qb-empty {
      align-items: center;
      justify-content: center;
      min-height: 300px;
    }
    .qb-hint-text { color: #4444aa; font-size: 15px; }

    /* Card header */
    .qb-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }
    .qb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .qb-chip {
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .qb-chip.grade  { background: #223355; color: #88aaff; }
    .qb-chip.diff   { background: #22334d; color: #66bbff; }
    .qb-chip.time   { background: #1e2e1e; color: #66cc88; }
    .qb-chip.cat-store   { background: #33221a; color: #ffaa66; }
    .qb-chip.cat-battle  { background: #33221a; color: #ff7766; }
    .qb-chip.cat-catch   { background: #221a33; color: #bb88ff; }
    .qb-chip.cat-exploration { background: #1a3322; color: #66ffaa; }
    .qb-template-id {
      font-size: 10px;
      color: #554488;
      background: #12122a;
      padding: 3px 8px;
      border-radius: 4px;
    }

    /* Assets */
    .qb-assets {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .qb-asset {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .qb-sprite {
      width: 80px;
      height: 80px;
      object-fit: contain;
      image-rendering: pixelated;
      filter: drop-shadow(0 2px 8px #00000080);
    }
    .qb-sprite.pokemon {
      background: radial-gradient(circle, #1e2e4a 0%, transparent 70%);
      border-radius: 12px;
      padding: 4px;
    }
    .qb-sprite.item {
      background: radial-gradient(circle, #2a2e1a 0%, transparent 70%);
      border-radius: 12px;
      padding: 6px;
    }
    .qb-asset-label {
      font-size: 11px;
      color: #8888aa;
      text-align: center;
      max-width: 90px;
    }

    /* Question text */
    .qb-question-text {
      font-size: 17px;
      font-weight: 500;
      line-height: 1.65;
      color: #e8e8ff;
      background: #12122a;
      border-radius: 12px;
      padding: 16px 20px;
      border: 1px solid #2a2a44;
      white-space: pre-line;
    }

    /* Choices */
    .qb-choices {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .qb-choice {
      background: #1e1e30;
      border: 2px solid #3a3a55;
      color: #e8e8f0;
      border-radius: 10px;
      padding: 12px;
      font-family: 'Press Start 2P', monospace;
      font-size: 13px;
      cursor: pointer;
      transition: all .15s;
    }
    .qb-choice:hover:not([disabled]) {
      border-color: #ffcc44;
      background: #1e1e40;
      color: #ffcc44;
    }
    .qb-choice.correct {
      background: #1a3a1a;
      border-color: #44cc66;
      color: #44cc66;
    }
    .qb-choice.wrong {
      background: #3a1a1a;
      border-color: #cc4444;
      color: #cc4444;
    }
    .qb-choice[disabled] { cursor: default; }

    /* Reveal */
    .qb-reveal-btn {
      background: transparent;
      border: 2px dashed #3a3a55;
      color: #6666aa;
      border-radius: 10px;
      padding: 10px 20px;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
      align-self: center;
      transition: all .15s;
    }
    .qb-reveal-btn:hover { border-color: #ffcc44; color: #ffcc44; }

    /* Steps */
    .qb-steps {
      background: #12122a;
      border: 1px solid #2a2a44;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .qb-answer-badge {
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      color: #44cc66;
      text-align: center;
      background: #1a3a1a;
      border-radius: 8px;
      padding: 10px;
    }
    .qb-steps-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #6666aa;
      margin-top: 4px;
    }
    .qb-step {
      font-size: 13px;
      color: #aaaacc;
      padding: 6px 12px;
      background: #1a1a35;
      border-radius: 6px;
      border-right: 3px solid #ffcc44;
    }
    .qb-hint {
      font-size: 12px;
      color: #88aaff;
      padding: 8px 12px;
      background: #1a1a35;
      border-radius: 6px;
      border-right: 3px solid #88aaff;
    }

    /* Footer */
    .qb-card-footer {
      display: flex;
      justify-content: center;
      padding-top: 4px;
    }
    .qb-next-btn {
      background: linear-gradient(135deg, #4444cc, #7744ff);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 28px;
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      cursor: pointer;
      transition: transform .1s, box-shadow .1s;
      box-shadow: 0 4px 16px #7744ff40;
    }
    .qb-next-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px #7744ff66;
    }

    /* RTL question text border fix */
    [dir="ltr"] .qb-step  { border-right: none; border-left: 3px solid #ffcc44; }
    [dir="ltr"] .qb-hint  { border-right: none; border-left: 3px solid #88aaff; }

    /* Responsive */
    @media (max-width: 700px) {
      .qb-layout { grid-template-columns: 1fr; }
      .qb-sidebar { border-right: none; border-bottom: 1px solid #2a2a44; }
      .qb-main { padding: 20px 16px; }
    }
  `;
  document.head.appendChild(style);
}
