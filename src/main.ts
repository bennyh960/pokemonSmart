/**
 * Entry point for Pokemon Math Adventure.
 * Creates the Game instance and mounts it to the #app container.
 */

import { createGame } from './engine/game.js';
import { loadFonts } from './engine/fonts.js';
import { initLocale } from './i18n/i18n.js';
import { preloadOverworldAssets } from './engine/sprite-preloader.js';
import './style.css';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Could not find #app container element.');
}

// Initialize locale from localStorage
initLocale();

// Load fonts and sprite sheets before starting the game
Promise.all([
  loadFonts().catch((e) => console.warn('Font loading failed:', e)),
  preloadOverworldAssets().catch((e) => console.warn('Sprite preload failed:', e)),
]).then(() => {
  const game = createGame(app!);
  game.start();
});
