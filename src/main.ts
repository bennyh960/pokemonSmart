import { createGame } from './engine/game.js';
import { loadFonts } from './engine/fonts.js';
import { initLocale } from './i18n/i18n.js';
import { preloadOverworldAssets } from './engine/sprite-preloader.js';
import { initLoadingScreen, setLoadingProgress, hideLoadingScreen } from './engine/loading-screen.js';
import { initHeavyData } from './services/pokemon-data.js';
import { getSession, isAccountActive, initSavesFromCloud, syncSlotsToCloud } from './auth/auth-service.js';
import { showLoginScreen } from './auth/login-screen.js';
import './style.css';

const app = document.getElementById('app');
if (!app) throw new Error('Could not find #app container element.');

initLocale();
initLoadingScreen();
setLoadingProgress(0.1, 'טוען...');

// Fonts are tiny (~30 KB) and load in parallel — start early, don't block
const fontPromise = loadFonts().catch(() => {});

Promise.all([
  // Heavy JSON data: moves (301 KB) + learnsets (126 KB) + tm-learnsets (277 KB)
  // fetched separately so the initial JS bundle is ~700 KB lighter
  initHeavyData((p) => setLoadingProgress(0.1 + p * 0.5, 'טוען נתוני פוקמון...')),
  // Overworld sprites: tileset + player frames + NPC sprites
  preloadOverworldAssets().then(() => setLoadingProgress(0.7, 'טוען גרפיקה...')),
  fontPromise,
]).then(async () => {
  setLoadingProgress(0.75, 'טוען חשבון...');

  async function startGame(): Promise<void> {
    try {
      await initSavesFromCloud();
    } catch {
      /* network error — start with empty session */
    }
    const game = createGame(app!);
    game.start();
    window.addEventListener('beforeunload', () => {
      syncSlotsToCloud().catch(() => {});
    });
  }

  const session = await getSession();
  if (session) {
    setLoadingProgress(0.95, 'טוען משחק...');
    const active = await isAccountActive(session.user.id);
    if (active) {
      await startGame();
    } else {
      showLoginScreen(startGame, 'Account pending approval / ממתין לאישור מנהל');
    }
  } else {
    showLoginScreen(startGame);
  }
  setLoadingProgress(1, 'מוכן!');
  await hideLoadingScreen();
});
