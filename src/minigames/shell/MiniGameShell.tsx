/**
 * The shell around one game: intro → 3-2-1-GO → play (HUD, pause) → results → prize reveal.
 * The game component only renders its play area; everything else lives here.
 */

import { useEffect, useRef, useState } from 'react';
import { getGlobalAudio } from '../../audio/audio-manager.js';
import { useInputLayer } from '../../engine/input/index.js';
import { getPokemonDisplayName } from '../../services/pokemon-data.js';
import { grantReward } from '../../systems/rewards.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { getTrainerRank } from '../../systems/trainer-rank.js';
import { carePrizes } from '../care.js';
import { boardPrizes, ownedSpecies } from '../english/board.js';
import { addLadderPoints, ladderStep } from '../english/ladder.js';
import { highestUnlockedLevel, isLevelUnlocked, levelForRank, recordResult, type RecordOutcome } from '../progress.js';
import type { AnyMiniGameDef, MiniGameResult } from '../types.js';
import type { MiniGameOutcome, StartMiniGameOptions } from '../launch.js';
import { Countdown } from './Countdown.js';
import { HudBar } from './HudBar.js';
import { useReducedMotion } from './hooks.js';
import { IntroCard } from './IntroCard.js';
import { PauseMenu } from './PauseMenu.js';
import { PrizeReveal } from './PrizeReveal.js';
import { Results } from './Results.js';
import { miniGameSfx } from './sfx.js';
import { Confetti, levelTitle, themeBackground } from './ui.js';
import { useHud } from './useHud.js';

type Phase = 'intro' | 'countdown' | 'play' | 'results' | 'prizes';

const PLAY_BINDINGS = [
  { code: 'Escape', action: 'pause' },
  { code: 'KeyP', action: 'pause' },
] as const;

/** Music ceiling while a mini-game is open (the player's setting still applies if lower). */
const MINI_GAME_MUSIC_VOLUME = 0.08;

interface Props {
  def: AnyMiniGameDef;
  initialLevel?: number;
  /** Label + action of the intro card's back button / the Exit button (picker or close). */
  backLabel: string;
  onBack: () => void;
  onOutcome: (outcome: MiniGameOutcome) => void;
  /** Care round for this party Pokémon (see care.ts). */
  carePokemonUuid?: string;
  /** Building gate round (see launch.ts). */
  gate?: StartMiniGameOptions['gate'];
  /** Word Board round on this ladder step: board prizes instead of level prizes (english/board.ts). */
  board?: { stepIndex: number; city?: string; intro: string; onPlayAgain: () => void };
}

export function MiniGameShell({
  def,
  initialLevel,
  backLabel,
  onBack,
  onOutcome,
  carePokemonUuid,
  gate,
  board,
}: Props) {
  const { t, locale } = useI18n();
  const [pd, mutate] = usePlayerData();
  const save = pd.miniGames ?? {};
  const reduced = useReducedMotion();

  // Care round: the hurt Pokémon plays, the player picks one of the open levels, clearing it heals the Pokémon once
  const careMon = def.care && carePokemonUuid ? pd.party.find((p) => p.uuid === carePokemonUuid) : undefined;
  const care = careMon ? def.care : undefined;
  // Gate / board rounds play the caller's level: no level picker
  const fixedLevel = !!gate || !!board;
  // Care, gate or board: once cleared it can't be replayed from here
  const fixed = !!care || fixedLevel;
  const [fixedDone, setFixedDone] = useState(false);
  const pokemonId = careMon?.id ?? def.mascotPokemonId;

  const [levelNumber, setLevelNumber] = useState(() =>
    fixedLevel && initialLevel && def.levels.some((l) => l.number === initialLevel)
      ? initialLevel
      : fixedLevel
        ? levelForRank(getTrainerRank(pd).index, def)
        : initialLevel &&
            isLevelUnlocked(save, def, initialLevel) &&
            def.levels.some((l) => l.number === initialLevel)
          ? initialLevel
          : highestUnlockedLevel(save, def),
  );
  const level = def.levels.find((l) => l.number === levelNumber) ?? def.levels[0];
  const [phase, setPhase] = useState<Phase>('intro');
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [result, setResult] = useState<MiniGameResult | null>(null);
  const [outcome, setOutcome] = useState<RecordOutcome | null>(null);
  const finishedRun = useRef(-1);

  const playAreaRef = useRef<HTMLDivElement>(null);
  const gamePaused = paused || phase !== 'play';
  const { hud, state: hudState, reset: resetHud } = useHud(playAreaRef, def.theme, gamePaused, reduced);
  const levelLabel = levelTitle(t, level, locale);

  // Keep music quiet in the background so speech (letters, words) stays clear
  useEffect(() => {
    const audio = getGlobalAudio();
    audio?.setMusicCap(MINI_GAME_MUSIC_VOLUME);
    return () => audio?.setMusicCap(null);
  }, []);

  // Optional per-game music; restore what was playing on the way out
  useEffect(() => {
    const audio = getGlobalAudio();
    if (!audio || !def.music) return;
    const previous = audio.currentMusic();
    audio.playMusic(def.music);
    return () => {
      if (previous) audio.playMusic(previous);
      else audio.stopMusic();
    };
  }, [def.music]);

  // Auto-pause when the tab is hidden
  useEffect(() => {
    const onVis = () => document.hidden && phase === 'play' && setPaused(true);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  useInputLayer({
    id: 'mg-play',
    name: 'Mini-game play',
    keyBindings: PLAY_BINDINGS,
    active: phase === 'play' && !paused,
    onAction: () => setPaused(true),
  });

  function startRound(n = levelNumber) {
    setLevelNumber(n);
    resetHud();
    setPaused(false);
    setResult(null);
    setOutcome(null);
    setRunId((r) => r + 1);
    setPhase('countdown');
  }

  function backToIntro() {
    resetHud();
    setPaused(false);
    setPhase('intro');
  }

  function handleFinish(res: MiniGameResult) {
    if (finishedRun.current === runId) return; // a game must finish once per run
    finishedRun.current = runId;
    hud.stopTimer();
    let rec: RecordOutcome | null = null;
    mutate((draft) => {
      draft.miniGames ??= {};
      rec = recordResult(draft.miniGames, def, level.number, res, { levelPrizes: !care && !board });
      if (care && careMon) rec.prizes = carePrizes(care, level, careMon, rec.stars);
      if (board) rec.prizes = boardPrizes(board.stepIndex, rec.stars, ownedSpecies(draft), Math.random, board.city);
      // A board round is an English ladder round: its stars earn ladder points
      if (board) {
        const { gained, leveledUp } = addLadderPoints(draft.miniGames, rec.stars);
        rec.ladder = { gained, newLevel: leveledUp ? ladderStep(draft.miniGames) + 1 : undefined };
      }
      for (const prize of rec.prizes) grantReward(prize.reward, { silent: true });
    });
    const done = rec as RecordOutcome | null;
    if (!done) return;
    if (fixed && done.cleared) setFixedDone(true);
    setResult(res);
    setOutcome(done);
    setPhase('results');
    onOutcome({ gameId: def.id, level: level.number, stars: done.stars, score: res.score, cleared: done.cleared });
  }

  const nextLevel = def.levels.find((l) => l.number === level.number + 1);
  const canNext = !fixed && !!nextLevel && isLevelUnlocked(save, def, nextLevel.number);
  // A board round always plays again from the board (the next round follows the ladder)
  const playAgain = board ? board.onPlayAgain : fixedDone ? undefined : () => startRound();
  const Game = def.Component;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" style={themeBackground(def.theme)}>
      {phase === 'intro' ? (
        <IntroCard
          def={def}
          save={save}
          levelNumber={level.number}
          onLevelChange={(n) => {
            miniGameSfx.tap();
            setLevelNumber(n);
          }}
          onPlay={() => startRound()}
          onBack={onBack}
          backLabel={backLabel}
          pokemonId={pokemonId}
          introLine={
            care && careMon
              ? care.intro[locale].replace('{name}', getPokemonDisplayName(careMon.id))
              : (gate?.intro[locale] ?? board?.intro)
          }
          fixedLevel={fixedLevel}
          prizes={care ? 'care' : board ? 'none' : 'level'}
        />
      ) : (
        <>
          <HudBar state={hudState} theme={def.theme} levelLabel={levelLabel} onPause={() => setPaused(true)} />
          <div ref={playAreaRef} className="relative min-h-0 flex-1 overflow-hidden">
            {phase !== 'countdown' && (
              <Game
                key={runId}
                level={level}
                runId={runId}
                paused={gamePaused}
                hud={hud}
                sfx={miniGameSfx}
                theme={def.theme}
                pokemonId={pokemonId}
                onFinish={handleFinish}
                onQuit={backToIntro}
              />
            )}
          </div>
          {phase === 'countdown' && <Countdown theme={def.theme} onDone={() => setPhase('play')} />}
          {phase === 'play' && paused && (
            <PauseMenu
              theme={def.theme}
              onResume={() => setPaused(false)}
              onRestart={() => startRound()}
              onQuit={backToIntro}
            />
          )}
          {phase === 'results' && result && outcome && (
            <Results
              theme={def.theme}
              levelLabel={levelLabel}
              result={result}
              outcome={outcome}
              canNext={canNext}
              onOpenPrizes={() => setPhase('prizes')}
              onPlayAgain={playAgain}
              onNext={() => nextLevel && startRound(nextLevel.number)}
              onExit={onBack}
            />
          )}
          {phase === 'prizes' && outcome && (
            <PrizeReveal
              theme={def.theme}
              prizes={outcome.prizes}
              canNext={canNext}
              onPlayAgain={playAgain}
              onNext={() => nextLevel && startRound(nextLevel.number)}
              onExit={onBack}
            />
          )}
        </>
      )}
      {hudState.confettiKey > 0 && phase === 'play' && <Confetti key={hudState.confettiKey} />}
    </div>
  );
}
