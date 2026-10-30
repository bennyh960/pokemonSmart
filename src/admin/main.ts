import './admin.css';
import { ADMIN_NAME } from '../engine/config';
import { getSlotIndex } from '../systems/save';
import { renderPokemonTab } from './tabs/pokemon';
import { renderMovesTab } from './tabs/moves';
import { renderStoryTab } from './tabs/story';
import { renderEnglishTab } from './tabs/english';
import { initSavesFromCloud } from '../auth/auth-service';

type TabId = 'pokemon' | 'moves' | 'story' | 'english';

function hasAdminAccess(): boolean {
  return getSlotIndex().some((s) => s.playerName === ADMIN_NAME);
}

async function mount() {
  const root = document.getElementById('admin-app')!;

  // sessionStorage is per-tab, so a freshly opened admin tab has no saves — load them from Supabase like the game does
  if (!hasAdminAccess()) {
    root.textContent = 'Loading saves…';
    try {
      await initSavesFromCloud();
    } catch {
      /* network error — falls through to access denied */
    }
  }

  if (!hasAdminAccess()) {
    root.innerHTML = `
      <div class="access-denied">
        <h1>Access Denied</h1>
        <p>No admin save found. Log in to the game in this browser and create a save named <code>${ADMIN_NAME}</code>.</p>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <header class="admin-header">
      <span class="admin-title">&#9881; Admin Panel</span>
    </header>
    <nav class="tab-bar">
      <button class="tab-btn active" data-tab="pokemon">Pokemon</button>
      <button class="tab-btn" data-tab="moves">Moves</button>
      <button class="tab-btn" data-tab="story">Story</button>
      <button class="tab-btn" data-tab="english">English</button>
    </nav>
    <main class="admin-main">
      <div id="tab-content"></div>
    </main>
  `;

  const tabContent = root.querySelector<HTMLDivElement>('#tab-content')!;
  const tabBtns = root.querySelectorAll<HTMLButtonElement>('.tab-btn');

  let cleanup: (() => void) | void;

  function switchTab(tabId: TabId) {
    if (cleanup) cleanup();
    cleanup = undefined;
    tabBtns.forEach((b) => b.classList.toggle('active', b.dataset['tab'] === tabId));
    tabContent.innerHTML = '';
    if (tabId === 'pokemon') cleanup = renderPokemonTab(tabContent);
    else if (tabId === 'moves') cleanup = renderMovesTab(tabContent);
    else if (tabId === 'story') cleanup = renderStoryTab(tabContent);
    else cleanup = renderEnglishTab(tabContent);
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset['tab'] as TabId));
  });

  switchTab('pokemon');
}

void mount();
