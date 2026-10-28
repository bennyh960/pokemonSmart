/** Root of the MINI_GAME scene: the game picker or the Word Board, or one game's shell. */

import { useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import type { MiniGameLaunch, MiniGameOutcome } from '../launch.js';
import { getMiniGame, MINI_GAME_LIST } from '../registry.js';
import type { MiniGameId } from '../types.js';
import { EnglishBoard } from '../english/EnglishBoard.js';
import { ENGLISH_LADDER, isOpenOnLadder, ladderRound, ladderStep } from '../english/ladder.js';
import { createRng } from '../english/random.js';
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

/** A Word Board round: a game of the child's ladder step. `n` remounts the shell for each new round. */
interface BoardRound {
  gameId: MiniGameId;
  level: number;
  stepIndex: number;
  n: number;
}

const BOARD_INTRO = { en: 'Level {n} — {name}. More stars = more prizes!', he: 'רמה {n} — {name}. יותר כוכבים = יותר פרסים!' };

export function MiniGameApp({ launch, onClose, onOutcome }: Props) {
  const { t, locale, isRTL } = useI18n();
  const [pd] = usePlayerData();
  const fromPicker = launch.gameId === null;
  const [gameId, setGameId] = useState<MiniGameId | null>(launch.gameId);
  const lastPicked = useRef<MiniGameId | undefined>(undefined);
  const [dexOpen, setDexOpen] = useState(false);
  const [boardRound, setBoardRound] = useState<BoardRound | null>(null);
  const games = launch.pickerIds ? MINI_GAME_LIST.filter((g) => launch.pickerIds!.includes(g.id)) : MINI_GAME_LIST;
  const back = `${isRTL ? '→' : '←'} ${t('minigames.back')}`;

  function playBoardRound() {
    const save = pd.miniGames ?? {};
    const round = ladderRound(save, createRng((Date.now() ^ ((boardRound?.n ?? 0) + 1) * 2654435761) >>> 0));
    setBoardRound({ ...round, stepIndex: ladderStep(save), n: (boardRound?.n ?? 0) + 1 });
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
          <MiniGameShell
            key={boardRound.n}
            def={getMiniGame(boardRound.gameId)}
            initialLevel={boardRound.level}
            backLabel={back}
            onBack={() => setBoardRound(null)}
            onOutcome={onOutcome}
            board={{
              stepIndex: boardRound.stepIndex,
              intro: BOARD_INTRO[locale]
                .replace('{n}', String(boardRound.stepIndex + 1))
                .replace('{name}', ENGLISH_LADDER[boardRound.stepIndex].name[locale]),
              onPlayAgain: playBoardRound,
            }}
          />
        ) : (
          <EnglishBoard onPlay={playBoardRound} onWordDex={() => setDexOpen(true)} onClose={onClose} />
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
          ladder={fromPicker ? undefined : launch.ladder}
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
