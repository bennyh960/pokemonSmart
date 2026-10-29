/** Intro card: logo, mascot, level grid (locks + stars + how the next one opens), prizes, Play. */

import { useI18n } from '../../ui-react/context/i18n-context.js';
import {
  getLevelProgress,
  isLevelUnlocked,
  prizeStarsOf,
  replayPrizesLeft,
  slotPrizes,
  unlockProgress,
} from '../progress.js';
import type { AnyMiniGameDef, MiniGamePrizeSlot, MiniGamesSave, MiniGameTheme } from '../types.js';
import { useMenuNav } from './hooks.js';
import { PrizeIcon } from './PrizeChip.js';
import { levelTitle, MgButton, PokemonSprite, StarRow } from './ui.js';

interface Props {
  def: AnyMiniGameDef;
  save: MiniGamesSave;
  levelNumber: number;
  onLevelChange: (n: number) => void;
  onPlay: () => void;
  onBack: () => void;
  backLabel: string;
  /** The Pokémon shown as the mascot (the care Pokémon in a care round). */
  pokemonId: number;
  /** Line shown above the levels (care / building gate / board). */
  introLine?: string;
  /** Building gate / board: the caller set the level — no level picker, never locked. */
  fixedLevel?: boolean;
  /** Prizes shown for the selected level: its level prizes, its care-round prizes, or none. */
  prizes?: 'level' | 'care' | 'none';
}

export function IntroCard({
  def,
  save,
  levelNumber,
  onLevelChange,
  onPlay,
  onBack,
  backLabel,
  pokemonId,
  introLine,
  fixedLevel = false,
  prizes = 'level',
}: Props) {
  const { t, locale } = useI18n();
  const levelIndex = Math.max(
    0,
    def.levels.findIndex((l) => l.number === levelNumber),
  );
  const level = def.levels[levelIndex];
  const progress = getLevelProgress(save, def.id, level.number);
  // A fixed round's level is set by the caller — never locked
  const isOpen = (n: number) => fixedLevel || isLevelUnlocked(save, def, n);
  const unlocked = isOpen(level.number);
  const nextLevel = def.levels[levelIndex + 1];

  useMenuNav({
    id: `mg-intro-${def.id}`,
    count: fixedLevel ? 1 : def.levels.length,
    index: fixedLevel ? 0 : levelIndex,
    onIndexChange: (i) => !fixedLevel && onLevelChange(def.levels[i].number),
    axis: 'both',
    onSelect: () => unlocked && onPlay(),
    onBack,
  });

  // Prizes still to win (level prizes) or paid on every win (care round), one row per star goal
  const need = prizeStarsOf(level);
  const stars = (n: number) => '★'.repeat(n);
  const rows: { label: string; slot: MiniGamePrizeSlot }[] = [];
  if (prizes === 'care') {
    if (need < 3)
      rows.push({ label: t('minigames.care.prizeRow', { stars: stars(need) }), slot: level.rewards.firstClear });
    rows.push({ label: t('minigames.care.prizeRow', { stars: stars(3) }), slot: level.rewards.threeStar });
  } else if (prizes === 'level') {
    if (progress.stars < need)
      rows.push({
        label: need > 1 ? t('minigames.prize.firstStars', { stars: stars(need) }) : t('minigames.prize.firstClear'),
        slot: level.rewards.firstClear,
      });
    if (progress.stars < 3) rows.push({ label: t('minigames.prize.threeStar'), slot: level.rewards.threeStar });
  }

  /** "Win level 3 with ★★★ 3 times" (+ bar) for the level that opens `n`. */
  const unlockLine = (n: number) => {
    const p = unlockProgress(save, def, n - 1);
    const text =
      p.kind === 'wins'
        ? t('minigames.unlockWins', { n: n - 1, need: p.need })
        : t('minigames.locked', { stars: p.need, n: n - 1 });
    return <UnlockBar text={text} have={p.have} need={p.need} theme={def.theme} />;
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <MgButton theme={def.theme} variant="dark" onClick={onBack}>
            {backLabel}
          </MgButton>
          <span className="rounded-full bg-black/25 px-3 py-1 text-sm font-black text-white" dir="ltr">
            ★ {def.levels.reduce((n, l) => n + getLevelProgress(save, def.id, l.number).stars, 0)}/
            {def.levels.length * 3}
          </span>
        </div>

        {/* Logo + mascot */}
        <div className="mg-pop-in flex items-center gap-3">
          <PokemonSprite
            id={pokemonId}
            className="mg-bob h-20 w-20 shrink-0 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)] sm:h-28 sm:w-28"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:text-4xl">
              {def.name[locale]}
            </h1>
            <p className="mt-0.5 text-sm font-bold text-white/90 sm:text-base">{def.tagline[locale]}</p>
          </div>
        </div>

        {introLine && (
          <p className="mg-pop-in mg-glass rounded-2xl px-4 py-3 text-center text-base font-black text-white shadow-lg sm:text-lg">
            {introLine}
          </p>
        )}

        {/* Level grid */}
        {!fixedLevel && (
          <section className="mg-glass rounded-3xl p-3 shadow-xl">
            <h2 className="mb-2 text-center text-base font-black text-white">{t('minigames.pickLevel')}</h2>
            <div className="mx-auto grid max-w-sm grid-cols-5 gap-2">
              {def.levels.map((l, i) => {
                const lp = getLevelProgress(save, def.id, l.number);
                const open = isOpen(l.number);
                const selected = l.number === level.number;
                return (
                  <button
                    key={l.number}
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onLevelChange(l.number)}
                    className={`mg-pop-in flex aspect-square flex-col items-center justify-center rounded-2xl transition-transform duration-150 ${selected ? 'mg-selected scale-105 shadow-lg' : 'hover:scale-105'}`}
                    style={{
                      animationDelay: `${i * 30}ms`,
                      background: selected ? def.theme.accent : open ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.35)',
                      color: selected ? def.theme.accentText : '#fff',
                    }}
                    aria-label={levelTitle(t, l, locale)}
                  >
                    <span className="text-xl font-black leading-none sm:text-2xl">{open ? l.number : '🔒'}</span>
                    {l.short ? (
                      <span className="text-[10px] font-black leading-tight sm:text-xs">{l.short[locale]}</span>
                    ) : null}
                    {open && <StarRow stars={lp.stars} size="text-[10px] sm:text-xs" />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Selected level */}
        <section key={level.number} className="mg-slide-up mg-glass rounded-3xl p-4 text-white shadow-xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-black">{levelTitle(t, level, locale)}</h2>
            {progress.best > 0 && (
              <span className="text-sm font-bold text-white/85">{t('minigames.best', { score: progress.best })}</span>
            )}
          </div>
          {level.goal && <p className="mt-0.5 text-base font-semibold text-white/90">{level.goal[locale]}</p>}

          {!unlocked ? (
            <div className="mt-3">{unlockLine(level.number)}</div>
          ) : (
            <>
              {prizes !== 'none' && (
                <div className="mt-3 flex flex-col gap-3">
                  {rows.map(({ label, slot }) => (
                    <div key={label}>
                      <p className="mb-1.5 text-sm font-black text-white/90">{label}</p>
                      <div className="flex flex-wrap gap-x-1 gap-y-2">
                        {slotPrizes(slot).map((prize, i) => (
                          <PrizeIcon key={i} prize={prize} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {prizes === 'level' && rows.length === 0 && (
                    <span className="self-start rounded-full bg-black/20 px-3 py-1 text-sm font-bold">
                      {t('minigames.replayLeft', { n: replayPrizesLeft(save, def.id, new Date()) })}
                    </span>
                  )}
                </div>
              )}
              {!fixedLevel && nextLevel && !isOpen(nextLevel.number) && (
                <div className="mt-3">{unlockLine(nextLevel.number)}</div>
              )}
            </>
          )}
        </section>

        <div className="mt-auto flex justify-center pt-1">
          <MgButton
            theme={def.theme}
            variant="primary"
            glow
            disabled={!unlocked}
            onClick={onPlay}
            className="min-w-[200px] !py-3 !text-2xl"
          >
            ▶ {t('minigames.play')}
          </MgButton>
        </div>
      </div>
    </div>
  );
}

/** "🔒 Win level 3 with ★★★ 3 times" over a have/need bar. */
function UnlockBar({ text, have, need, theme }: { text: string; have: number; need: number; theme: MiniGameTheme }) {
  return (
    <div className="rounded-2xl bg-black/25 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-sm font-black">
        <span>🔒 {text}</span>
        <span dir="ltr">
          {have}/{need}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${(Math.min(have, need) / need) * 100}%`, background: theme.accent }}
        />
      </div>
    </div>
  );
}
