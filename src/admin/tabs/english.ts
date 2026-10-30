// English tab — the Word Board ladder of a save, and a preview of the questions each English game generates.

import { getPokemon, initHeavyData } from '../../services/pokemon-data';
import { loadGame, saveGame } from '../../systems/save';
import type { PlayerData } from '../../types/index';
import { getPokemonSpriteUrl } from '../../utils/util';
import { boardLockLeft, clearBoardLock, isBoardRoundOpen } from '../../minigames/english/board';
import { ENGLISH_LADDER, ladderProgress, readLadder, setLadderStep } from '../../minigames/english/ladder';
import { knownCount, strongCount, todayKey, type WordStats } from '../../minigames/english/learning';
import { createRng, type Rng } from '../../minigames/english/random';
import { wordStatsOf } from '../../minigames/english/useWords';
import { getWords, type Word } from '../../minigames/english/words';
import { MINI_GAME_LIST } from '../../minigames/registry';
import type { AnyMiniGameDef, MiniGameId } from '../../minigames/types';
import { findPool, generateFind, type FindConfig } from '../../minigames/games/find-pokemon/find';
import { generateMemory, type MemoryConfig } from '../../minigames/games/memory-match/memory';
import { colorPool, generateColors, type ColorsConfig } from '../../minigames/games/pokemon-colors/colors';
import { generateSays, type SaysConfig } from '../../minigames/games/pokemon-says/says';
import { generateBattle, type BattleConfig } from '../../minigames/games/unown-battle/battle';
import type { UnownWordsConfig } from '../../minigames/games/unown-words/config';
import { getContent } from '../../minigames/games/unown-words/content';
import { generateQuestions } from '../../minigames/games/unown-words/questions';
import { newCatcher, type CatcherConfig } from '../../minigames/games/word-catcher/catcher';
import { section, slotPicker } from '../dom';

// ── Question previews ─────────────────────────────────────────────────────────

interface PreviewCtx {
  stats: WordStats;
  today: string;
  /** Party of the selected save (Pokémon Says speakers). */
  party: number[];
  def: AnyMiniGameDef;
}

type Preview = (config: unknown, rng: Rng, ctx: PreviewCtx) => HTMLElement[];

function preview<C>(fn: (config: C, rng: Rng, ctx: PreviewCtx) => HTMLElement[]): Preview {
  return (config, rng, ctx) => fn(config as C, rng, ctx);
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function wordChip(w: Word, ok = false): HTMLElement {
  const chip = el('span', 'en-chip' + (ok ? ' en-chip--ok' : ''));
  if (w.picture.kind === 'item') {
    const img = document.createElement('img');
    img.src = w.picture.src;
    img.className = 'en-pic';
    chip.appendChild(img);
  } else if (w.picture.kind === 'swatch') {
    const sw = el('span', 'en-swatch');
    sw.style.background = w.picture.color;
    chip.appendChild(sw);
  } else {
    chip.appendChild(el('span', 'en-emoji', w.picture.emoji));
  }
  chip.appendChild(el('b', '', w.en));
  chip.appendChild(el('span', 'en-he', `${w.he} · ${w.say}`));
  chip.title = `${w.id} · ${w.theme} · tier ${w.tier}`;
  return chip;
}

function pokemonChip(id: number, ok = false, extra?: string): HTMLElement {
  const chip = el('span', 'en-chip' + (ok ? ' en-chip--ok' : ''));
  const img = document.createElement('img');
  img.src = getPokemonSpriteUrl(id, 'front');
  img.className = 'en-pic en-pic--mon';
  chip.appendChild(img);
  chip.appendChild(el('b', '', getPokemon(id)?.name.en ?? `#${id}`));
  if (extra) chip.appendChild(el('span', 'en-he', extra));
  return chip;
}

function textChip(text: string, ok = false): HTMLElement {
  return el('span', 'en-chip en-chip--text' + (ok ? ' en-chip--ok' : ''), text);
}

/** One numbered question card: a prompt line and its answer options. */
function card(i: number, prompt: (string | HTMLElement)[], options: HTMLElement[]): HTMLElement {
  const c = el('div', 'en-card');
  const head = el('div', 'en-card-prompt');
  head.appendChild(el('span', 'en-card-num', `${i + 1}`));
  for (const p of prompt) head.append(typeof p === 'string' ? el('span', '', p) : p);
  c.appendChild(head);
  if (options.length) {
    const opts = el('div', 'en-card-options');
    opts.append(...options);
    c.appendChild(opts);
  }
  return c;
}

const PREVIEWS: Partial<Record<MiniGameId, Preview>> = {
  'unown-words': preview<UnownWordsConfig>((cfg, rng) =>
    generateQuestions(cfg, rng, getContent()).map((q, i) =>
      card(
        i,
        [`🔊 ${q.speech.kind} "${q.speech.text}"`, ...(q.show ? [textChip(`shows ${q.show}`)] : [])],
        q.options.map((o, j) =>
          q.optionKind === 'pokemon' && o.pokemonId
            ? pokemonChip(o.pokemonId, j === q.answer)
            : textChip(o.en, j === q.answer),
        ),
      ),
    ),
  ),
  'pokemon-says': preview<SaysConfig>((cfg, rng, ctx) =>
    generateSays(cfg, rng, ctx.stats, ctx.today, ctx.party.length ? ctx.party : [ctx.def.mascotPokemonId]).map(
      (q, i) =>
        card(
          i,
          [pokemonChip(q.pokemonId), `says 🔊 "${q.word.en}"`],
          q.options.map((w, j) => wordChip(w, j === q.answer)),
        ),
    ),
  ),
  'find-pokemon': preview<FindConfig>((cfg, rng, ctx) =>
    generateFind(cfg, rng, findPool(), ctx.stats, ctx.today).map((q, i) =>
      card(
        i,
        ['Find the', ...q.clues.map((c) => wordChip(c.word)), 'one'],
        q.options.map((p, j) =>
          pokemonChip(p.id, j === q.answer, `${p.types.join('/')} · h${p.height} w${p.weight} spd${p.speed}`),
        ),
      ),
    ),
  ),
  'unown-battle': preview<BattleConfig>((cfg, rng, ctx) =>
    generateBattle(cfg, rng, ctx.stats, ctx.today).map((q, i) =>
      card(
        i,
        [wordChip(q.word), `spell ${q.letters.join('')} (${cfg.input})`],
        (q.tiles ?? []).map((t) => textChip(t)),
      ),
    ),
  ),
  'memory-match': preview<MemoryConfig>((cfg, rng, ctx) => {
    const cards = generateMemory(cfg, rng, ctx.stats, ctx.today);
    return [
      card(
        0,
        [`${cards.length / 2} pairs — the board in order`],
        cards.map((c) => textChip(c.face === 'en' ? c.word.en : c.word.he)),
      ),
    ];
  }),
  'word-catcher': preview<CatcherConfig>((cfg, rng, ctx) => {
    const sim = newCatcher(cfg, rng, ctx.stats, ctx.today);
    return [
      card(0, [`Targets in order (falling bubbles are drawn from ${sim.pool.length} words)`], sim.targets.map((w) => wordChip(w))),
    ];
  }),
  'pokemon-colors': preview<ColorsConfig>((cfg, rng, ctx) =>
    generateColors(cfg, rng, colorPool(), ctx.stats, ctx.today).map((q, i) =>
      card(i, [pokemonChip(q.pokemonId), 'is…'], q.options.map((w, j) => wordChip(w, j === q.answer))),
    ),
  ),
};

/** Loaded once per admin page. */
let heavyData: Promise<void> | null = null;

const ENGLISH_GAMES = MINI_GAME_LIST.filter((d) => d.category === 'english');

/** "Level 3 — Pokémon colors" for every ladder step that plays this level. */
function ladderStepsOf(gameId: MiniGameId, level: number): string[] {
  return ENGLISH_LADDER.flatMap((st, i) =>
    st.play
      .filter((p) => p.gameId === gameId && (p.level === level || p.level === 'best'))
      .map((p) => `Step ${i + 1} — ${st.name.en}${p.level === 'best' ? ' (best level)' : ''}`),
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function renderEnglishTab(container: HTMLElement): (() => void) | void {
  let selectedSlot: number | null = null;
  let playerData: PlayerData | null = null;
  /** null = the Word Board (play panel only). */
  let gameId: MiniGameId | null = ENGLISH_GAMES[0].id;
  let level = 1;
  let writeSave = false;
  let seed = Date.now() % 100000;
  let useSaveStats = true;
  let dataReady = false;
  let alive = true;

  container.innerHTML = '';
  const root = el('div', 'si-root');
  container.appendChild(root);

  const topBar = el('div', 'si-topbar');
  root.appendChild(topBar);
  const picker = slotPicker((slot, pd) => {
    selectedSlot = slot;
    playerData = pd;
    render();
  });
  topBar.append(...picker.nodes);
  selectedSlot = picker.slot();
  playerData = selectedSlot !== null ? loadGame(selectedSlot) : null;

  root.appendChild(renderPlayPanel());

  const content = document.createElement('div');
  root.appendChild(content);

  /**
   * Plays the real game scene in an iframe (minigame-preview.html) on the selected save.
   * Built once — render() leaves it alone so a running round isn't reloaded.
   */
  function renderPlayPanel(): HTMLElement {
    const s = section('Play');
    const row = el('div', '');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';

    const gameSelect = document.createElement('select');
    gameSelect.className = 'form-select';
    for (const d of ENGLISH_GAMES) gameSelect.add(new Option(d.name.en, d.id, false, d.id === gameId));
    gameSelect.add(new Option('Word Board', ''));

    const levelSelect = document.createElement('select');
    levelSelect.className = 'form-select';
    function fillLevels() {
      levelSelect.innerHTML = '';
      const def = ENGLISH_GAMES.find((d) => d.id === gameId);
      levelSelect.style.display = def ? '' : 'none';
      if (!def) return;
      if (!def.levels.some((l) => l.number === level)) level = def.levels[0].number;
      for (const l of def.levels) {
        levelSelect.add(new Option(`Level ${l.number}${l.name ? ` — ${l.name.en}` : ''}`, String(l.number), false, l.number === level));
      }
    }
    fillLevels();
    gameSelect.addEventListener('change', () => {
      gameId = (gameSelect.value || null) as MiniGameId | null;
      fillLevels();
      render();
    });
    levelSelect.addEventListener('change', () => {
      level = Number(levelSelect.value);
      render();
    });

    const saveLabel = el('label', 'text-muted');
    const saveBox = document.createElement('input');
    saveBox.type = 'checkbox';
    saveBox.addEventListener('change', () => (writeSave = saveBox.checked));
    saveLabel.append(saveBox, ' Save progress to the slot');
    saveLabel.title = 'Off = sandbox: the round plays on a copy of the save and nothing is written';

    const frame = document.createElement('iframe');
    frame.className = 'en-play-frame';
    frame.style.display = 'none';

    const playBtn = el('button', 'btn btn-sm btn-primary', '▶ Play');
    const tabLink = document.createElement('a');
    tabLink.className = 'btn btn-sm';
    tabLink.textContent = '↗ New tab';
    tabLink.target = '_blank';
    function src(): string {
      const q = new URLSearchParams({ game: gameId ?? 'board', level: String(level) });
      if (selectedSlot !== null) q.set('slot', String(selectedSlot));
      if (writeSave) q.set('mode', 'save');
      return `minigame-preview.html?${q}`;
    }
    playBtn.addEventListener('click', () => {
      frame.style.display = '';
      frame.src = src();
      frame.focus();
    });
    tabLink.addEventListener('click', () => (tabLink.href = src()));

    const hint = el('p', 'text-muted', 'Opens any level, even one the save has not reached. The board uses the save’s ladder level.');
    row.append(gameSelect, levelSelect, saveLabel, playBtn, tabLink);
    s.body.append(row, hint, frame);
    return s.el;
  }

  /** The English Word Board: jump to any ladder level, and reopen a board closed by leaving a round. */
  function renderWordBoardSection(slot: number, pd: PlayerData): HTMLElement {
    const s = section('Word Board (English ladder)');
    const save = pd.miniGames ?? {};
    const { step, points } = readLadder(save);
    const progress = ladderProgress(save);
    const lockLeft = boardLockLeft(save, Date.now());
    const stats = wordStatsOf(save);

    const status = el('p', 'text-muted');
    status.textContent =
      `Now: Level ${step + 1} — ${ENGLISH_LADDER[step].name.en}` +
      (progress ? ` (${progress.have}/${progress.need} points)` : ' (top level)') +
      (lockLeft > 0 ? ` · locked for ${Math.ceil(lockLeft / 60000)} min` : '') +
      (isBoardRoundOpen(save) ? ' · a round is open' : '') +
      ` · words met ${Object.keys(stats).length}, strong ${strongCount(stats)}, known ${knownCount(stats)}`;
    s.body.appendChild(status);

    const row = el('div', '');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
    const levelSelect = document.createElement('select');
    levelSelect.className = 'form-select';
    ENGLISH_LADDER.forEach((st, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `Level ${i + 1} — ${st.name.en}`;
      o.selected = i === step;
      levelSelect.appendChild(o);
    });
    const pointsInput = document.createElement('input');
    pointsInput.type = 'number';
    pointsInput.min = '0';
    pointsInput.className = 'form-input form-input--small';
    pointsInput.value = String(points);
    pointsInput.title = 'Points towards the next level';
    const setBtn = el('button', 'btn btn-sm btn-primary', 'Set level');
    setBtn.addEventListener('click', () => {
      setLadderStep((pd.miniGames ??= {}), Number(levelSelect.value), Number(pointsInput.value) || 0);
      saveGame(slot, pd, true);
      render();
    });
    row.append(levelSelect, pointsInput, setBtn);

    if (lockLeft > 0 || isBoardRoundOpen(save)) {
      const unlockBtn = el('button', 'btn btn-sm', 'Open board');
      unlockBtn.title = 'Clear the leave-early lock';
      unlockBtn.addEventListener('click', () => {
        clearBoardLock((pd.miniGames ??= {}));
        saveGame(slot, pd, true);
        render();
      });
      row.appendChild(unlockBtn);
    }
    s.body.appendChild(row);
    return s.el;
  }

  function renderPreviewSection(): HTMLElement {
    const s = section('Question preview');
    const def = ENGLISH_GAMES.find((d) => d.id === gameId);
    if (!def) {
      s.body.appendChild(el('p', 'text-muted', 'Pick a game above to preview its questions.'));
      return s.el;
    }

    const row = el('div', '');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';

    const seedInput = document.createElement('input');
    seedInput.type = 'number';
    seedInput.className = 'form-input form-input--small';
    seedInput.value = String(seed);
    seedInput.title = 'Seed — the same seed gives the same round';
    seedInput.addEventListener('change', () => {
      seed = Number(seedInput.value) || 0;
      render();
    });

    const rollBtn = el('button', 'btn btn-sm btn-primary', '🎲 New round');
    rollBtn.addEventListener('click', () => {
      seed = Math.floor(Math.random() * 100000);
      render();
    });

    const statsLabel = el('label', 'text-muted');
    const statsBox = document.createElement('input');
    statsBox.type = 'checkbox';
    statsBox.checked = useSaveStats;
    statsBox.disabled = !playerData;
    statsBox.addEventListener('change', () => {
      useSaveStats = statsBox.checked;
      render();
    });
    statsLabel.append(statsBox, " Use the save's word progress");
    statsLabel.title = 'Off = a child who never met a word';

    row.append(seedInput, rollBtn, statsLabel);
    s.body.appendChild(row);

    const lvl = def.levels.find((l) => l.number === level)!;
    const steps = ladderStepsOf(def.id, level);
    const meta = el('p', 'text-muted');
    meta.textContent =
      (lvl.goal ? `${lvl.goal.en} · ` : '') + (steps.length ? `Ladder: ${steps.join(', ')}` : 'Not on the ladder');
    s.body.appendChild(meta);

    const cfg = el('pre', 'si-description');
    cfg.textContent = JSON.stringify(lvl.config, null, 2);
    s.body.appendChild(cfg);

    const gen = PREVIEWS[def.id];
    if (!dataReady) {
      s.body.appendChild(el('p', 'text-muted', 'Loading moves…'));
    } else if (!gen) {
      s.body.appendChild(el('p', 'text-muted', 'No preview for this game yet.'));
    } else {
      const ctx: PreviewCtx = {
        stats: useSaveStats && playerData ? wordStatsOf(playerData.miniGames) : {},
        today: todayKey(),
        party: playerData?.party.map((p) => p.id) ?? [],
        def,
      };
      const list = el('div', 'en-cards');
      try {
        list.append(...gen(lvl.config, createRng(seed), ctx));
      } catch (e) {
        list.appendChild(el('pre', 'si-description', String(e instanceof Error ? e.stack : e)));
      }
      s.body.appendChild(list);
    }
    return s.el;
  }

  function render() {
    content.innerHTML = '';
    if (selectedSlot !== null && playerData) content.appendChild(renderWordBoardSection(selectedSlot, playerData));
    content.appendChild(renderPreviewSection());
  }

  render();
  // Move words in the word bank resolve from moves.json, which loads async
  void (heavyData ??= initHeavyData().then(() => void getWords())).then(() => {
    dataReady = true;
    if (alive) render();
  });
  return () => {
    alive = false;
  };
}
