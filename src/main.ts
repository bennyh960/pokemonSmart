/**
 * Entry point for Pokemon Math Adventure.
 * Creates the Game instance and mounts it to the #app container.
 */

import { createGame } from './engine/game.js';
import './style.css';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Could not find #app container element.');
}

const game = createGame(app);
game.start();
