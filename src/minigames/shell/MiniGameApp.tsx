/** Root of the MINI_GAME scene: the game picker, or one game's shell. */

import { useRef, useState } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import type { MiniGameLaunch, MiniGameOutcome } from '../launch.js';
import { getMiniGame } from '../registry.js';
import type { MiniGameId } from '../types.js';
import { GamePicker } from './GamePicker.js';
import { MiniGameShell } from './MiniGameShell.js';
import './minigames.css';

interface Props {
  launch: MiniGameLaunch;
  onClose: () => void;
  /** Remembers the last finished round for the launcher's onFinish. */
  onOutcome: (outcome: MiniGameOutcome) => void;
}

export function MiniGameApp({ launch, onClose, onOutcome }: Props) {
  const { t, isRTL } = useI18n();
  const fromPicker = launch.gameId === null;
  const [gameId, setGameId] = useState<MiniGameId | null>(launch.gameId);
  const lastPicked = useRef<MiniGameId | undefined>(undefined);

  return (
    <div className="mg-root fixed inset-0 z-[60] overflow-hidden text-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {gameId === null ? (
        <GamePicker
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
          backLabel={fromPicker ? `${isRTL ? '→' : '←'} ${t('minigames.back')}` : t('minigames.exit')}
          onBack={fromPicker ? () => setGameId(null) : onClose}
          onOutcome={onOutcome}
          carePokemonUuid={fromPicker ? undefined : launch.carePokemonUuid}
        />
      )}
    </div>
  );
}
