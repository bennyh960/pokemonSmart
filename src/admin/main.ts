import './admin.css';
import { ADMIN_NAME, SLOT_INDEX_KEY } from './constants';
import { renderPokemonTab } from './tabs/pokemon';
import { renderMovesTab } from './tabs/moves';
import { renderStoryTab } from './tabs/story';

type TabId = 'pokemon' | 'moves' | 'story';

function hasAdminAccess(): boolean {
  try {
    const raw = localStorage.getItem(SLOT_INDEX_KEY);
    if (!raw) return false;
    const slots = JSON.parse(raw) as { playerName: string }[];
    return slots.some(s => s.playerName === ADMIN_NAME);
  } catch {
    return false;
  }
}

function mount() {
  const root = document.getElementById('admin-app')!;

  if (!hasAdminAccess()) {
    root.innerHTML = `
      <div class="access-denied">
        <h1>Access Denied</h1>
        <p>No admin save found. Start the game and create a save named <code>${ADMIN_NAME}</code>.</p>
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
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset['tab'] === tabId));
    tabContent.innerHTML = '';
    if (tabId === 'pokemon') cleanup = renderPokemonTab(tabContent);
    else if (tabId === 'moves') cleanup = renderMovesTab(tabContent);
    else cleanup = renderStoryTab(tabContent);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset['tab'] as TabId));
  });

  switchTab('pokemon');
}

mount();
