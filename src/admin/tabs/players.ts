// Players tab — every account, its save names, and a password reset for kids who forgot theirs.
// The reset runs in the `admin-users` Edge Function (needs the service-role key, server side only).

import { listPlayers, resetPlayerPassword, type AdminPlayer } from '../../auth/admin-users';
import { addRow, makeTable, section } from '../dom';

/** Easy to read aloud / type: e.g. "pika4821". */
function suggestPassword(): string {
  const words = ['pika', 'eevee', 'togepi', 'mew', 'psyduck', 'snorlax'];
  return words[Math.floor(Math.random() * words.length)] + String(1000 + Math.floor(Math.random() * 9000));
}

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}

export function renderPlayersTab(container: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'si-root';
  container.appendChild(root);

  const topBar = document.createElement('div');
  topBar.className = 'si-topbar';
  const search = document.createElement('input');
  search.className = 'form-input';
  search.placeholder = 'Search email or player name…';
  search.style.minWidth = '260px';
  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'btn btn-sm';
  reloadBtn.textContent = '↺';
  reloadBtn.title = 'Reload players';
  topBar.append(search, reloadBtn);
  root.appendChild(topBar);

  const content = document.createElement('div');
  root.appendChild(content);

  let players: AdminPlayer[] = [];

  function render() {
    content.innerHTML = '';
    const q = search.value.trim().toLowerCase();
    const shown = players.filter(
      (p) => !q || p.email.toLowerCase().includes(q) || p.playerNames.some((n) => n.toLowerCase().includes(q)),
    );
    const { el, body } = section(`Players (${shown.length})`);
    const table = makeTable(['Email', 'Player names', 'Active', 'Joined', 'Last login', '']);
    for (const p of shown) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.textContent = 'Reset password';
      btn.addEventListener('click', async () => {
        const pw = window.prompt(`New password for ${p.email} (at least 6 characters):`, suggestPassword());
        if (pw === null) return;
        btn.disabled = true;
        try {
          await resetPlayerPassword(p.userId, pw);
          window.alert(`Done! ${p.email} can now log in with:\n\n${pw}`);
        } catch (e) {
          window.alert(`Reset failed: ${(e as Error).message}`);
        } finally {
          btn.disabled = false;
        }
      });
      addRow(table, [p.email, p.playerNames.join(', ') || '—', p.active ? '✓' : '✗', fmtDate(p.createdAt), fmtDate(p.lastSignInAt), btn]);
    }
    body.appendChild(table);
    content.appendChild(el);
  }

  async function load() {
    content.innerHTML = '<p class="text-muted">Loading players…</p>';
    try {
      players = (await listPlayers()).sort((a, b) => (b.lastSignInAt ?? '').localeCompare(a.lastSignInAt ?? ''));
      render();
    } catch (e) {
      content.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'text-muted';
      p.textContent = `Could not load players: ${(e as Error).message}. Is the admin-users function deployed, and is your email in ADMIN_EMAILS? (see supabase/functions/admin-users/index.ts)`;
      content.appendChild(p);
    }
  }

  search.addEventListener('input', render);
  reloadBtn.addEventListener('click', () => void load());
  void load();
}
