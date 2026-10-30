/** Word Dex — the book of every English word met in the library games: cards, milestones, word of the day. */

import { useState } from 'react';
import { useInputLayer } from '../../engine/input/index.js';
import { grantReward } from '../../systems/rewards.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { ensureGameProgress, resolvePrize } from '../progress.js';
import { describeReward } from '../shell/prize-display.js';
import { miniGameSfx } from '../shell/sfx.js';
import { MgButton, RARITY_STYLE, themeBackground } from '../shell/ui.js';
import type { Bilingual, MiniGamePrizeDef, MiniGameTheme } from '../types.js';
import {
  cardDays,
  cardState,
  claimableMilestones,
  DEX_MILESTONES,
  readDex,
  WORD_OF_THE_DAY_PRIZE,
  wordOfDayClaimable,
  type DexData,
} from './dex.js';
import { LadderCard } from './LadderCard.js';
import { knownCount, todayKey, type WordStats } from './learning.js';
import { WordPic } from './ui.js';
import { useWordOfTheDay, wordStatsOf, WORDS_HOME } from './useWords.js';
import { getWords, THEME_NAMES, type Word, type WordTheme } from './words.js';

const DEX_THEME: MiniGameTheme = { from: '#0f766e', to: '#4338ca', accent: '#fde047', accentText: '#1e1b4b' };

const TEXT = {
  title: { en: 'Word Dex', he: 'ספר המילים' },
  known: { en: 'words known', he: 'מילים שלמדתם' },
  wordOfDay: { en: 'Word of the day', he: 'המילה של היום' },
  useIt: { en: 'Get it right in any game today for a prize!', he: 'ענו עליה נכון במשחק היום וקבלו פרס!' },
  claim: { en: 'Take the prize!', he: 'קחו את הפרס!' },
  done: { en: 'Done for today ✓', he: 'סיימתם להיום ✓' },
  milestones: { en: 'Word prizes', he: 'פרסי מילים' },
  words: { en: 'words', he: 'מילים' },
  back: { en: 'Back', he: 'חזרה' },
  howTo: {
    en: 'Answer a word right on 3 different days to collect its card! ●●○ = 2 days done.',
    he: 'ענו נכון על מילה ב-3 ימים שונים כדי לאסוף את הקלף שלה! ●●○ = עברו כבר 2 ימים.',
  },
} satisfies Record<string, Bilingual>;

export function WordDex({ onBack }: { onBack: () => void }) {
  const { locale, isRTL } = useI18n();
  const [pd, mutate] = usePlayerData();
  const stats = wordStatsOf(pd.miniGames);
  const dex = readDex(pd.miniGames?.[WORDS_HOME]?.data?.dex);
  const words = getWords();
  const today = todayKey();
  const wotd = useWordOfTheDay();
  const known = knownCount(stats);
  const [toast, setToast] = useState<string[] | null>(null);

  useInputLayer({
    id: 'mg-word-dex',
    name: 'Word Dex',
    keyBindings: [{ code: 'Escape', action: 'back' }],
    onAction: onBack,
  });

  /** Gives a prize and records it in the dex data. */
  function claim(def: MiniGamePrizeDef, mark: (d: DexData) => DexData) {
    let lines: string[] | null = null;
    mutate((draft) => {
      draft.miniGames ??= {};
      const data = (ensureGameProgress(draft.miniGames, WORDS_HOME).data ??= {});
      data.dex = mark(readDex(data.dex));
      lines = grantReward(resolvePrize(def).reward, { silent: true });
    });
    miniGameSfx.cue('mg-prize');
    setToast(lines);
  }

  const claimable = claimableMilestones(stats, dex);
  const byTheme = new Map<WordTheme, Word[]>();
  for (const w of words) byTheme.set(w.theme, [...(byTheme.get(w.theme) ?? []), w]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={themeBackground(DEX_THEME)}>
      <div className="shrink-0 px-4 pt-5 pb-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <MgButton theme={DEX_THEME} variant="dark" onClick={onBack}>
            {isRTL ? '→' : '←'} {TEXT.back[locale]}
          </MgButton>
          <h1 className="text-3xl font-black text-white drop-shadow sm:text-4xl">📖 {TEXT.title[locale]}</h1>
          <span className="rounded-full bg-black/25 px-3 py-1 font-black" dir="ltr">
            {known}/{words.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 pt-2">
          <LadderCard save={pd.miniGames ?? {}} />

          {/* Word of the day */}
          <div className="mg-pop-in mg-glass flex flex-wrap items-center gap-4 rounded-3xl p-4">
            <WordPic word={wotd} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white/80">⭐ {TEXT.wordOfDay[locale]}</p>
              <p dir="ltr" className="text-start text-4xl font-black">
                {wotd.en}
              </p>
              <p dir="rtl" className="text-xl font-bold text-yellow-200">
                {wotd.he}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <MgButton theme={DEX_THEME} onClick={() => miniGameSfx.word(wotd.en)} ariaLabel="🔊">
                🔊
              </MgButton>
              {wordOfDayClaimable(stats, wotd, dex, today) ? (
                <MgButton
                  theme={DEX_THEME}
                  variant="primary"
                  glow
                  onClick={() => claim(WORD_OF_THE_DAY_PRIZE, (d) => ({ ...d, wordOfDayClaimed: today }))}
                >
                  🎁 {TEXT.claim[locale]}
                </MgButton>
              ) : dex.wordOfDayClaimed === today ? (
                <span className="font-black text-green-200">{TEXT.done[locale]}</span>
              ) : (
                <span className="max-w-[14rem] text-center text-sm font-bold text-white/85">{TEXT.useIt[locale]}</span>
              )}
            </div>
          </div>

          {/* Milestones */}
          <div className="mg-glass rounded-3xl p-4">
            <p className="mb-2 font-black">🏆 {TEXT.milestones[locale]}</p>
            <p className="mb-3 text-sm font-bold text-white/80">{TEXT.howTo[locale]}</p>
            <div className="flex flex-wrap gap-2">
              {DEX_MILESTONES.map((m) => {
                const taken = dex.claimed.includes(m.known);
                const ready = claimable.includes(m);
                const line = 'reward' in m.prize ? describeReward(m.prize.reward, locale)[0] : null;
                const style = RARITY_STYLE[m.prize.rarity];
                return (
                  <button
                    key={m.known}
                    type="button"
                    tabIndex={-1}
                    disabled={!ready}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => claim(m.prize, (d) => ({ ...d, claimed: [...d.claimed, m.known] }))}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-2 font-black shadow ${ready ? 'mg-glow' : ''} ${taken ? 'opacity-60' : ''}`}
                    style={{ background: style.bg, color: style.text, border: `2px solid ${style.border}` }}
                  >
                    {line?.icon ? (
                      <img src={line.icon} alt="" className="h-7 w-7 object-contain" />
                    ) : (
                      <span>{line?.emoji ?? '🎁'}</span>
                    )}
                    <span dir="ltr">
                      {Math.min(known, m.known)}/{m.known}
                    </span>
                    <span>{taken ? '✓' : ready ? '🎁' : '🔒'}</span>
                  </button>
                );
              })}
            </div>
            {toast && toast.length > 0 && (
              <p className="mg-slide-up mt-3 rounded-2xl bg-black/25 px-4 py-2 font-black">{toast.join(' · ')}</p>
            )}
          </div>

          {/* Cards, by theme */}
          {[...byTheme.entries()].map(([theme, list]) => (
            <section key={theme}>
              <h2 className="mb-2 text-xl font-black drop-shadow">
                {THEME_NAMES[theme][locale]}{' '}
                <span className="text-base text-white/75" dir="ltr">
                  ({list.filter((w) => cardState(stats, w.id) === 'known').length}/{list.length})
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                {list.map((w) => (
                  <DexCard key={w.id} word={w} stats={stats} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function DexCard({ word, stats }: { word: Word; stats: WordStats }) {
  const state = cardState(stats, word.id);
  if (state === 'new') {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-2xl bg-black/20 text-3xl font-black text-white/40">
        ?
      </div>
    );
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => miniGameSfx.word(word.en)}
      className={`mg-en-card flex aspect-[3/4] flex-col items-center justify-center gap-1 p-1 ${state === 'learning' ? 'opacity-70' : ''}`}
      aria-label={word.en}
    >
      <WordPic word={word} size="sm" />
      <span dir="ltr" className="text-sm font-black leading-tight">
        {word.en}
      </span>
      <span dir="rtl" className="text-xs font-bold leading-tight text-indigo-900/70">
        {word.he}
      </span>
      {state === 'learning' && <DayDots {...cardDays(stats, word.id)} />}
    </button>
  );
}

/** ●●○ — days answered right out of the days a card needs. */
function DayDots({ have, need }: { have: number; need: number }) {
  return (
    <span dir="ltr" className="text-sm leading-none tracking-widest text-fuchsia-600" aria-label={`${have}/${need}`}>
      {'●'.repeat(have)}
      {'○'.repeat(need - have)}
    </span>
  );
}
