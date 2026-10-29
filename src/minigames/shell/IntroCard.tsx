/** Intro card: logo, mascot, level picker (locks + stars), prizes still to win, Play. */

import { useEffect, useRef } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import {
  getLevelProgress,
  isLevelUnlocked,
  prizeStarsOf,
  replayPrizesLeft,
  slotPrizes,
  UNLOCK_STARS,
} from '../progress.js';
import type { AnyMiniGameDef, MiniGamePrizeSlot, MiniGamesSave } from '../types.js';
import { useMenuNav } from './hooks.js';
import { PrizeChip } from './PrizeChip.js';
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
  /** Care round: every level is open to pick. */
  allOpen?: boolean;
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
  allOpen = false,
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
  const isOpen = (n: number) => fixedLevel || allOpen || isLevelUnlocked(save, def.id, n);
  const unlocked = isOpen(level.number);
  const chipsRef = useRef<HTMLDivElement>(null);

  useMenuNav({
    id: `mg-intro-${def.id}`,
    count: fixedLevel ? 1 : def.levels.length,
    index: fixedLevel ? 0 : levelIndex,
    onIndexChange: (i) => !fixedLevel && onLevelChange(def.levels[i].number),
    axis: 'both',
    onSelect: () => unlocked && onPlay(),
    onBack,
  });

  useEffect(() => {
    chipsRef.current?.querySelector<HTMLElement>(`[data-level="${level.number}"]`)?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    });
  }, [level.number]);

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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5">
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
        <div className="mg-pop-in flex items-center gap-4">
          <PokemonSprite
            id={pokemonId}
            className="mg-bob h-28 w-28 shrink-0 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)] sm:h-36 sm:w-36"
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-black leading-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.25)] sm:text-5xl">
              {def.name[locale]}
            </h1>
            <p className="mt-1 text-base font-bold text-white/90 sm:text-lg">{def.tagline[locale]}</p>
          </div>
        </div>

        {introLine && (
          <p className="mg-pop-in mg-glass rounded-3xl px-5 py-4 text-center text-xl font-black text-white shadow-xl">
            {introLine}
          </p>
        )}

        {!fixedLevel && <h2 className="-mb-2 text-lg font-black text-white/90">{t('minigames.pickLevel')}</h2>}

        {/* Level chips */}
        <div ref={chipsRef} className={`-mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-3 ${fixedLevel ? 'hidden' : ''}`}>
          {def.levels.map((l, i) => {
            const lp = getLevelProgress(save, def.id, l.number);
            const open = isOpen(l.number);
            const selected = l.number === level.number;
            return (
              <button
                key={l.number}
                data-level={l.number}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onLevelChange(l.number)}
                className={`mg-pop-in flex min-h-[84px] w-[92px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl p-2 shadow-lg transition-transform duration-150 ${selected ? 'mg-selected scale-105' : 'hover:scale-105'}`}
                style={{
                  animationDelay: `${i * 50}ms`,
                  background: selected ? def.theme.accent : open ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.35)',
                  color: selected ? def.theme.accentText : '#fff',
                }}
                aria-label={t('minigames.level', { n: l.number })}
              >
                <span className="text-2xl font-black leading-none">{open ? l.number : '🔒'}</span>
                {l.short && <span className="text-xs font-black leading-none">{l.short[locale]}</span>}
                <StarRow stars={lp.stars} size="text-sm" />
              </button>
            );
          })}
        </div>

        {/* Selected level */}
        <div key={level.number} className="mg-slide-up mg-glass rounded-3xl p-5 text-white shadow-xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-black">{levelTitle(t, level, locale)}</h2>
            {progress.best > 0 && (
              <span className="text-sm font-bold text-white/85">{t('minigames.best', { score: progress.best })}</span>
            )}
          </div>
          {level.goal && <p className="mt-1 text-lg font-semibold text-white/90">{level.goal[locale]}</p>}

          {!unlocked ? (
            <p className="mt-3 rounded-2xl bg-black/25 px-4 py-3 text-center text-lg font-black">
              🔒 {t('minigames.locked', { stars: UNLOCK_STARS, n: level.number - 1 })}
            </p>
          ) : prizes === 'none' ? null : (
            <div className="mt-3 flex flex-col gap-3">
              {rows.map(({ label, slot }) => (
                <div key={label}>
                  <p className="text-sm font-bold text-white/85">{label}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {slotPrizes(slot).map((prize, i) => (
                      <PrizeChip key={i} prize={prize} />
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
        </div>

        <div className="mt-auto flex justify-center pt-2">
          <MgButton
            theme={def.theme}
            variant="primary"
            glow
            disabled={!unlocked}
            onClick={onPlay}
            className="min-w-[200px] !py-4 !text-2xl"
          >
            ▶ {t('minigames.play')}
          </MgButton>
        </div>
      </div>
    </div>
  );
}
