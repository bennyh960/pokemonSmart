/**
 * Entry point for Pokemon Math Adventure.
 * Creates the Game instance and mounts it to the #app container.
 */

import { createGame } from './engine/game.js';
import { loadFonts } from './engine/fonts.js';
import './style.css';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Could not find #app container element.');
}


// Load fonts before starting the game to prevent FOUT
loadFonts().then(() => {
  const game = createGame(app!);
  game.start();
});
