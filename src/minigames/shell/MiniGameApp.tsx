/** Root of the MINI_GAME scene: the game picker or the Word Board, or one game's shell. */

import { useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import type { MiniGameLaunch, MiniGameOutcome } from '../launch.js';
import { getMiniGame, MINI_GAME_LIST } from '../registry.js';
import type { MiniGameId } from '../types.js';
import { isBoardRoundOpen, openBoardRound } from '../english/board.js';
import { EnglishBoard } from '../english/EnglishBoard.js';
import { ENGLISH_LADDER, isOpenOnLadder, ladderRound } from '../english/ladder.js';
import { createRng } from '../english/random.js';
import { LeaveRoundDialog } from '../english/LeaveRoundDialog.js';
import { dexPrizeWaiting } from '../english/dex.js';
import { todayKey } from '../english/learning.js';
import { useWordOfTheDay } from '../english/useWords.js';
import { WordDex } from '../english/WordDex.js';
import { GamePicker } from './GamePicker.js';
import { MiniGameShell } from './MiniGameShell.js';
import './minigames.css';

interface Props {
  launch: MiniGameLaunch;
  onClose: () => void;
  /** Remembers the last finished round for the launcher's onFinish. */
  onOutcome: (outcome: MiniGameOutcome) => void;
}

/**
 * A Word Board round: a game of the child's ladder step or, as practice, a step below it.
 * `n` remounts the shell for each new round.
 */
interface BoardRound {
  gameId: MiniGameId;
  level: number;
  stepIndex: number;
  playIndex: number;
  n: number;
}

const BOARD_INTRO = {
  en: 'Level {n} — {name}. More stars = more prizes!',
  he: 'רמה {n} — {name}. יותר כוכבים = יותר פרסים!',
};

export function MiniGameApp({ launch, onClose, onOutcome }: Props) {
  const { t, locale, isRTL } = useI18n();
  const [pd, mutate] = usePlayerData();
  const fromPicker = launch.gameId === null;
  const [gameId, setGameId] = useState<MiniGameId | null>(launch.gameId);
  const lastPicked = useRef<MiniGameId | undefined>(undefined);
  const [dexOpen, setDexOpen] = useState(false);
  const [boardRound, setBoardRound] = useState<BoardRound | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  useWordOfTheDay(); // chosen as the games open, so their rounds can ask it
  const games = launch.pickerIds ? MINI_GAME_LIST.filter((g) => launch.pickerIds!.includes(g.id)) : MINI_GAME_LIST;
  const back = `${isRTL ? '→' : '←'} ${t('minigames.back')}`;

  function playBoardRound() {
    const save = pd.miniGames ?? {};
    const round = ladderRound(save, createRng((Date.now() ^ (((boardRound?.n ?? 0) + 1) * 2654435761)) >>> 0));
    mutate((draft) => openBoardRound((draft.miniGames ??= {})));
    setBoardRound({ ...round, n: (boardRound?.n ?? 0) + 1 });
  }

  // Back from a round that hasn't finished asks first; leaving locks the board (applied when it mounts again)
  function leaveBoardRound() {
    if (isBoardRoundOpen(pd.miniGames ?? {})) setConfirmLeave(true);
    else setBoardRound(null);
  }

  if (dexOpen) {
    return (
      <Root rtl={isRTL}>
        <WordDex onBack={() => setDexOpen(false)} />
      </Root>
    );
  }

  if (launch.board) {
    return (
      <Root rtl={isRTL}>
        {boardRound ? (
          <>
            <MiniGameShell
              key={boardRound.n}
              def={getMiniGame(boardRound.gameId)}
              initialLevel={boardRound.level}
              backLabel={back}
              onBack={leaveBoardRound}
              onOutcome={onOutcome}
              board={{
                stepIndex: boardRound.stepIndex,
                playIndex: boardRound.playIndex,
                city: launch.boardCity,
                intro: BOARD_INTRO[locale]
                  .replace('{n}', String(boardRound.stepIndex + 1))
                  .replace('{name}', ENGLISH_LADDER[boardRound.stepIndex].name[locale]),
                onPlayAgain: playBoardRound,
              }}
            />
            {confirmLeave && (
              <LeaveRoundDialog
                theme={getMiniGame(boardRound.gameId).theme}
                onStay={() => setConfirmLeave(false)}
                onLeave={() => {
                  setConfirmLeave(false);
                  setBoardRound(null);
                }}
              />
            )}
          </>
        ) : (
          <EnglishBoard
            city={launch.boardCity}
            onPlay={playBoardRound}
            onWordDex={() => setDexOpen(true)}
            onClose={onClose}
          />
        )}
      </Root>
    );
  }

  return (
    <Root rtl={isRTL}>
      {gameId === null ? (
        <GamePicker
          games={games}
          onWordDex={games.some((g) => g.category === 'english') ? () => setDexOpen(true) : undefined}
          dexPrize={dexPrizeWaiting(pd.miniGames ?? {}, todayKey())}
          lockOf={(g) =>
            // In the world (an NPC's picker) English games follow the ladder; the admin picker opens everything
            launch.pickerIds && g.category === 'english' && !isOpenOnLadder(g.id, pd.miniGames ?? {})
              ? t('minigames.ladderLocked')
              : null
          }
          initialId={lastPicked.current}
          onPick={(id) => {
            lastPicked.current = id;
            setGameId(id);
          }}
          onClose={onClose}
        />
      ) : (
        <MiniGameShell
          key={gameId}
          def={getMiniGame(gameId)}
          initialLevel={fromPicker ? undefined : launch.level}
          backLabel={fromPicker ? back : t('minigames.exit')}
          onBack={fromPicker ? () => setGameId(null) : onClose}
          onOutcome={onOutcome}
          carePokemonUuid={fromPicker ? undefined : launch.carePokemonUuid}
          gate={fromPicker ? undefined : launch.gate}
          ambush={fromPicker ? undefined : launch.ambush}
        />
      )}
    </Root>
  );
}

function Root({ rtl, children }: { rtl: boolean; children: ReactNode }) {
  return (
    <div className="mg-root fixed inset-0 z-[60] overflow-hidden text-white" dir={rtl ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
}
