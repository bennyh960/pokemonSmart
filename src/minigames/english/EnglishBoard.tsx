/**
 * Word Board screen — opened from the library's board tile: the child's level + bar, a big Play button,
 * how stars turn into prizes, and every level's prizes by rarity (board.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { countBadges } from '../../data/badges.js';
import { useInputLayer } from '../../engine/input/index.js';
import { pokemonFrontSpriteUrl } from '../../systems/overworld-pokemon-anim.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { PrizeChip } from '../shell/PrizeChip.js';
import { MgButton, RARITY_STYLE, themeBackground } from '../shell/ui.js';
import type { Bilingual, MiniGameTheme, Stars } from '../types.js';
import {
  badgesFor,
  boardLockLeft,
  boardPool,
  boardStep,
  DRAWN_RARITIES,
  EPIC_STARS,
  epicOdds,
  isBoardRoundOpen,
  leaveBoardRound,
  ownedSpecies,
  PREMIUM_BADGES,
  RARITIES,
  RARITY_ODDS_BY_STARS,
  rarePokemonPrize,
} from './board.js';
import { dexPrizeWaiting } from './dex.js';
import { ENGLISH_LADDER, ladderStep } from './ladder.js';
import { todayKey } from './learning.js';
import { LadderCard } from './LadderCard.js';

export const BOARD_THEME: MiniGameTheme = { from: '#0e7490', to: '#7c3aed', accent: '#fde047', accentText: '#1e1b4b' };

const TEXT = {
  title: { en: 'Word Board', he: 'לוח המילים' },
  back: { en: 'Back', he: 'חזרה' },
  play: { en: 'Play!', he: 'שחקו!' },
  locked: {
    en: 'You left class early — the board opens again in {time}',
    he: 'יצאתם מהשיעור באמצע — הלוח ייפתח שוב בעוד {time}',
  },
  playMore: {
    en: 'Play as much as you like — 2 or 3 stars fill your bar!',
    he: 'משחקים כמה שרוצים — שניים או שלושה כוכבים ממלאים את הפס!',
  },
  stars: { en: 'More stars = more prizes', he: 'יותר כוכבים = יותר פרסים' },
  prizes: { en: 'prizes', he: 'פרסים' },
  prize: { en: 'prize', he: 'פרס' },
  levels: { en: 'Prizes of every level', he: 'הפרסים של כל רמה' },
  level: { en: 'Level', he: 'רמה' },
  here: { en: 'You are here!', he: 'אתם כאן!' },
  rareMon: { en: 'Pokémon you can win:', he: 'פוקימונים שאפשר לזכות בהם:' },
  epicOnly: { en: 'only, one per game:', he: 'בלבד, אחד במשחק:' },
  badgeLock: {
    en: '🔒 Special prizes open with gym badges 🏅 — win badges to unlock them!',
    he: '🔒 פרסים מיוחדים נפתחים עם תגים 🏅 — נצחו במכונים ופתחו אותם!',
  },
  cityPrizes: {
    en: "This library's board has its own special prizes — every city is different!",
    he: 'ללוח של הספרייה הזאת יש פרסים מיוחדים משלו — בכל עיר זה אחרת!',
  },
} satisfies Record<string, Bilingual>;

const STAR_COUNTS: Exclude<Stars, 0>[] = [1, 2, 3];

interface Props {
  /** The library's city: its own prizes (board-cities.ts). */
  city?: string;
  onPlay: () => void;
  onWordDex: () => void;
  onClose: () => void;
}

export function EnglishBoard({ city, onPlay, onWordDex, onClose }: Props) {
  const { t, locale, isRTL } = useI18n();
  const [pd, mutate] = usePlayerData();
  const save = pd.miniGames ?? {};
  const current = ladderStep(save);
  const [now, setNow] = useState(Date.now);
  const lockLeft = boardLockLeft(save, now);
  const locked = lockLeft > 0;
  const owned = ownedSpecies(pd);
  const badges = countBadges(pd.badges);
  /** "🔒 5🏅" on a premium prize the player's badges don't open yet. */
  const badgeLock = (need: number) => (need > badges ? `🔒 ${need}🏅` : undefined);
  const currentRef = useRef<HTMLDivElement>(null);
  const dexPrize = dexPrizeWaiting(save, todayKey());

  // Braces: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup function
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  // A round left before it finished (back button, or the game closed mid-round) closes the board
  useEffect(() => {
    if (isBoardRoundOpen(save)) mutate((draft) => leaveBoardRound((draft.miniGames ??= {}), Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the board opens
  }, []);

  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const play = () => {
    if (!locked) onPlay();
  };

  useInputLayer({
    id: 'mg-english-board',
    name: 'Word Board',
    keyBindings: [
      { code: 'Escape', action: 'back' },
      { code: 'Enter', action: 'play' },
      { code: 'Space', action: 'play' },
    ],
    onAction: (action) => (action === 'play' ? play() : onClose()),
  });

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={themeBackground(BOARD_THEME)}>
      <div className="shrink-0 px-4 pt-5 pb-2">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <MgButton theme={BOARD_THEME} variant="dark" onClick={onClose}>
            {isRTL ? '→' : '←'} {TEXT.back[locale]}
          </MgButton>
          <h1 className="text-3xl font-black text-white drop-shadow sm:text-4xl">📋 {TEXT.title[locale]}</h1>
          <MgButton
            theme={BOARD_THEME}
            variant={dexPrize ? 'primary' : undefined}
            glow={dexPrize}
            onClick={onWordDex}
          >
            📖 {t('minigames.wordDex')}
            {dexPrize && ' 🎁'}
          </MgButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 pt-2">
          <LadderCard save={save} />

          <div className="flex flex-col items-center gap-2">
            <MgButton
              theme={BOARD_THEME}
              variant="primary"
              glow={!locked}
              disabled={locked}
              onClick={play}
              className="min-w-[220px] !py-4 !text-3xl"
            >
              {locked ? '🔒' : '▶'} {TEXT.play[locale]}
            </MgButton>
            {locked ? (
              <p className="text-center font-bold text-yellow-200">
                {TEXT.locked[locale].replace('{time}', formatLockLeft(lockLeft))}
              </p>
            ) : (
              <p className="text-center font-bold text-white/90">{TEXT.playMore[locale]}</p>
            )}
            {city && <p className="text-center font-bold text-yellow-200">🎁 {TEXT.cityPrizes[locale]}</p>}
          </div>

          {/* Stars → prizes */}
          <div className="mg-glass rounded-3xl p-4">
            <p className="text-lg font-black">⭐ {TEXT.stars[locale]}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {STAR_COUNTS.map((n) => (
                <div key={n} className="flex items-center justify-between gap-2 rounded-2xl bg-black/20 px-3 py-2">
                  <span className="font-black text-yellow-300" dir="ltr">
                    {'★'.repeat(n)}
                  </span>
                  <span className="font-black">
                    {'🎁'.repeat(n)} {n} {n === 1 ? TEXT.prize[locale] : TEXT.prizes[locale]}
                  </span>
                  <span className="flex gap-1">
                    {[
                      ...DRAWN_RARITIES.filter((r) => RARITY_ODDS_BY_STARS[n][r] > 0),
                      ...(n >= EPIC_STARS ? (['epic'] as const) : []),
                    ].map((r) => (
                      <span
                        key={r}
                        title={t(`minigames.rarity.${r}`)}
                        className="h-4 w-4 rounded-full"
                        style={{ background: RARITY_STYLE[r].bg, border: `2px solid ${RARITY_STYLE[r].border}` }}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Every level's prizes */}
          <h2 className="text-2xl font-black">🏆 {TEXT.levels[locale]}</h2>
          {badges < PREMIUM_BADGES.masterBall && (
            <p className="-mt-2 text-sm font-bold text-white/85">{TEXT.badgeLock[locale]}</p>
          )}
          {ENGLISH_LADDER.map((_, i) => {
            const step = boardStep(i, city);
            const mon = rarePokemonPrize(step, owned);
            const pool = boardPool(step, owned);
            const chanceOf = new Map(epicOdds(step, owned).map((e) => [e.prize, e.chance]));
            const isCurrent = i === current;
            return (
              <div
                key={i}
                ref={isCurrent ? currentRef : undefined}
                className={`rounded-3xl p-4 ${isCurrent ? 'bg-white/25 ring-4 ring-yellow-300' : 'mg-glass'} ${i > current ? 'opacity-75' : ''}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-black">
                    {i < current ? '✅' : i === current ? '⭐' : '🔒'} {TEXT.level[locale]} {i + 1} — {step.name[locale]}
                  </span>
                  {isCurrent && (
                    <span className="rounded-full bg-yellow-300 px-3 py-0.5 text-sm font-black text-indigo-950">
                      {TEXT.here[locale]}
                    </span>
                  )}
                </div>
                {RARITIES.map((r) => {
                  const ofRarity = pool.filter((p) => p.rarity === r);
                  if (ofRarity.length === 0) return null;
                  return (
                    <div key={r} className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="w-16 shrink-0 text-sm font-black" style={{ color: RARITY_STYLE[r].border }}>
                        <span className="rounded-full bg-white/90 px-2 py-0.5">{t(`minigames.rarity.${r}`)}</span>
                      </span>
                      {r === 'epic' && (
                        <span className="text-sm font-bold text-white/85">
                          <span dir="ltr">{'★'.repeat(EPIC_STARS)}</span> {TEXT.epicOnly[locale]}
                        </span>
                      )}
                      {ofRarity.map((p, k) => {
                        const lock = badgeLock(badgesFor(p));
                        return (
                          <span key={k} className={lock ? 'opacity-60 grayscale' : undefined}>
                            <PrizeChip
                              prize={p}
                              label={lock ?? (chanceOf.has(p) ? `${Math.round(chanceOf.get(p)! * 100)}%` : undefined)}
                              icon={p === mon ? pokemonFrontSpriteUrl(mon.oneOf[0].pokemon!.id) : undefined}
                            />
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
                {mon && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-sm font-bold text-white/85">
                      {badgeLock(PREMIUM_BADGES.rarePokemon)} {TEXT.rareMon[locale]}
                    </span>
                    {mon.oneOf.map((r) => (
                      <img
                        key={r.pokemon!.id}
                        src={pokemonFrontSpriteUrl(r.pokemon!.id)}
                        alt=""
                        className="h-12 w-12 object-contain [image-rendering:pixelated]"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** m:ss, always left-to-right digits. */
function formatLockLeft(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
