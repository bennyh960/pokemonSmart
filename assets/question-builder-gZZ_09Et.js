import{a as e,i as t,n,r,t as i}from"./question-builder-C8FkiK7s.js";var a=i(),o=`grade3`,s=`any`,c=``,l=`he`,u=null,d=!1,f=document.getElementById(`qb-root`);f.innerHTML=p(),k(),h(),_(),y();function p(){return`
    <div class="qb-layout">

      <!-- ── Sidebar ── -->
      <aside class="qb-sidebar">
        <div class="qb-logo">
          <span class="qb-logo-icon">🎮</span>
          <span class="qb-logo-text">Question Builder</span>
        </div>

        <section class="qb-section">
          <label class="qb-label">שכבה / Grade</label>
          <select id="grade-select" class="qb-select">${e().map(e=>{let n=t(e);return`<option value="${e}" ${e===o?`selected`:``}>${n.label.he} / ${n.label.en}</option>`}).join(``)}</select>
        </section>

        <section class="qb-section">
          <label class="qb-label">קטגוריה / Category</label>
          <div id="category-pills" class="qb-pills">
            ${[`any`,`store`,`battle`,`catch`].map(e=>`<button class="qb-pill${e===s?` active`:``}" data-category="${e}">
                ${m(e)}
              </button>`).join(``)}
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
            <button class="qb-pill${l===`he`?` active`:``}" id="lang-he">עברית</button>
            <button class="qb-pill${l===`en`?` active`:``}" id="lang-en">English</button>
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
  `}function m(e){return{any:`🎲 All`,store:`🛒 Store`,battle:`⚔️ Battle`,catch:`🎯 Catch`}[e]??e}function h(){document.getElementById(`grade-select`).addEventListener(`change`,e=>{o=e.target.value,_()}),document.getElementById(`template-select`).addEventListener(`change`,e=>{c=e.target.value,v()}),document.getElementById(`generate-btn`).addEventListener(`click`,()=>{d=!1,y()}),document.getElementById(`lang-he`).addEventListener(`click`,()=>g(`he`)),document.getElementById(`lang-en`).addEventListener(`click`,()=>g(`en`)),document.getElementById(`category-pills`).addEventListener(`click`,e=>{let t=e.target.closest(`[data-category]`);t&&(s=t.dataset.category,document.querySelectorAll(`#category-pills .qb-pill`).forEach(e=>e.classList.toggle(`active`,e.dataset.category===s)),c=``,_())})}function g(e){l=e,document.querySelectorAll(`#lang-he, #lang-en`).forEach(t=>t.classList.toggle(`active`,t.id===`lang-${e}`)),u&&D(u)}function _(){let e=t(o),n=r.forConfig(e);s!==`any`&&(n=n.filter(e=>e.category===s));let i=document.getElementById(`template-select`);i.innerHTML=`<option value="">— אקראי / Random —</option>`+n.map(e=>{let t=l===`he`?e.name.he:e.name.en;return`<option value="${e.id}" ${e.id===c?`selected`:``}>${t}</option>`}).join(``),v()}function v(){let e=document.getElementById(`template-meta`);if(!c){e.innerHTML=``;return}try{let t=r.get(c);e.innerHTML=`
      <div class="qb-meta-row"><span>ID</span><code>${t.id}</code></div>
      <div class="qb-meta-row"><span>Difficulty</span><code>${t.minDifficulty}–${t.maxDifficulty}</code></div>
      <div class="qb-meta-row"><span>Ops</span><code>${t.requiredOperations.join(` `)}</code></div>
    `}catch{e.innerHTML=``}}function y(){let e=document.getElementById(`error-box`);e.style.display=`none`;try{let e=t(o),r=new n().withConfig(e).withSnapshot(a);c?r.withTemplateId(c):s!==`any`&&r.withCategory(s),u=r.build(),d=!1,D(u)}catch(t){e.style.display=`block`,e.textContent=String(t)}}function b(e,t){return e===t?` correct`:` wrong`}function x(){return l===`he`?`פתרון שלב בשלב`:`Step-by-step solution`}function S(){return l===`he`?`שאלה הבאה`:`Next Question`}function C(){return l===`he`?`הצג תשובה`:`Reveal Answer`}function w(e){return e?`<div class="qb-hint">💡 ${e[l]}</div>`:``}function T(){return d?``:`<button id="reveal-btn" class="qb-reveal-btn">${C()}</button>`}function E(e){return e===`pokemon`?`🐾`:`🎒`}function D(e){let n=l===`he`?`rtl`:`ltr`,r=l===`he`?e.question.he:e.question.en,i=e.assets.length>0?`<div class="qb-assets">
        ${e.assets.map(e=>{let t=E(e.kind);return`
          <div class="qb-asset">
            <img src="${e.spriteUrl}" alt="${e.label[l]}"
              onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22><text y=%2240%22 font-size=%2240%22>${t}</text></svg>'"
              class="qb-sprite ${e.kind}" />
            <span class="qb-asset-label">${e.label[l]}</span>
          </div>`}).join(``)}
       </div>`:``,a=e.choices?`<div class="qb-choices">
        ${e.choices.map(t=>`<button class="qb-choice${d?b(t,e.correctAnswer):``}" data-value="${t}" ${d?`disabled`:``}>${O(t)}</button>`).join(``)}
       </div>`:``,s=d?`<div class="qb-steps">
        <div class="qb-answer-badge">✅ ${O(e.correctAnswer)}</div>
        <h4 class="qb-steps-title">${x()}</h4>
        ${e.steps.map(e=>`<div class="qb-step">${e[l]}</div>`).join(``)}
        ${w(e.hint)}
       </div>`:``,c=t(o),u=document.getElementById(`question-card`);u.className=`qb-card`,u.innerHTML=`
    <div class="qb-card-header">
      <div class="qb-chips">
        <span class="qb-chip grade">${c.label[l]}</span>
        <span class="qb-chip cat-${e.category}">${m(e.category)}</span>
        <span class="qb-chip diff">Level ${e.difficulty}</span>
        <span class="qb-chip time">⏱ ${e.timeLimit}s</span>
      </div>
      <code class="qb-template-id">${e.templateId}</code>
    </div>

    ${i}

    <div class="qb-question-text" dir="${n}">${r.replaceAll(`
`,`<br>`)}</div>

    ${a}

    ${T()}

    ${s}

    <div class="qb-card-footer">
      <button id="next-btn" class="qb-next-btn">⚡ ${S()}</button>
    </div>
  `,u.querySelectorAll(`.qb-choice:not([disabled])`).forEach(t=>{t.addEventListener(`click`,()=>{d=!0,D(e)})}),document.getElementById(`reveal-btn`)?.addEventListener(`click`,()=>{d=!0,D(e)}),document.getElementById(`next-btn`)?.addEventListener(`click`,()=>{d=!1,y()})}function O(e){return e.toLocaleString()}function k(){let e=document.createElement(`style`);e.textContent=`
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
  `,document.head.appendChild(e)}