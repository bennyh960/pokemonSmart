/**
 * Mini-game preview (dev page `minigame-preview.html`, shown in the admin English tab's iframe).
 * Mounts the real mini-game shell on a save:
 *   ?slot=N        the save to play on (omitted → a new game)
 *   &game=<id>     a mini-game id, or `board` for the English Word Board
 *   &level=N       the level to play (opened even when locked on the save)
 *   &mode=save     write progress back to the slot (default: sandbox — nothing is saved)
 */

import '../style.css';
import { createAudioManager, setGlobalAudio } from '../audio/audio-manager';
import { loadFonts } from '../engine/fonts';
import { createInputManager } from '../engine/input';
import { initReactHost, mountReactScene, unmountReactScene } from '../engine/react/react-scene-host';
import { initLocale } from '../i18n/i18n';
import type { MiniGameLaunch } from '../minigames/launch';
import { MiniGameApp } from '../minigames/shell/MiniGameApp';
import { isMiniGameId } from '../minigames/registry';
import { initHeavyData } from '../services/pokemon-data';
import { loadGameFromSlot, startNewGame, startSandboxGame } from '../systems/game-state';
import { notifyPlayerDataReplaced } from '../systems/player-store/player-store';
import { loadGame } from '../systems/save';

const params = new URLSearchParams(location.search);
const slotParam = params.get('slot');
const slot = slotParam === null ? null : Number(slotParam);
const game = params.get('game') ?? 'board';
const level = Number(params.get('level')) || 1;
const writeSave = params.get('mode') === 'save';

const app = document.getElementById('app')!;

function message(text: string): void {
  app.innerHTML = '';
  const p = document.createElement('p');
  p.style.cssText = 'color:#8b949e;font:14px sans-serif;text-align:center;margin-top:40vh;';
  p.textContent = text;
  app.appendChild(p);
}

function launchOf(): MiniGameLaunch | null {
  if (game === 'board') return { gameId: null, board: true };
  if (!isMiniGameId(game)) return null;
  // A gate round plays the given level even when the save hasn't opened it yet
  return { gameId: game, level, gate: { intro: { en: `Admin preview — level ${level}`, he: `תצוגת מנהל — שלב ${level}` } } };
}

async function start(): Promise<void> {
  initLocale();
  message('Loading…');
  await Promise.all([initHeavyData(), loadFonts().catch(() => {})]);

  if (slot === null) startSandboxGame(startNewGame());
  else if (writeSave) loadGameFromSlot(slot);
  else {
    const pd = loadGame(slot);
    if (!pd) return message(`No save in slot ${slot}.`);
    startSandboxGame(pd);
  }
  notifyPlayerDataReplaced();

  const launch = launchOf();
  if (!launch) return message(`Unknown game "${game}".`);

  app.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.display = 'none';
  app.appendChild(canvas);
  createInputManager(canvas, { touchContainer: app });
  setGlobalAudio(createAudioManager());

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;';
  app.appendChild(overlay);
  initReactHost(overlay);
  mountReactScene(MiniGameApp, {
    launch,
    onOutcome: () => {},
    onClose: () => {
      unmountReactScene();
      message('Closed — press ▶ Play to start again.');
    },
  });
}

void start();
