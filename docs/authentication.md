# Authentication & Save System

**Last updated:** 2026-05-27  
**Author:** behassan  
**Status:** Production-ready  
**Sprint:** Auth Epic (implemented across sessions prior to sprint-4)

---

## Overview

The game uses **Supabase** for authentication and cloud save sync. The client never stores game data in `localStorage` during an active session — all runtime saves live in `sessionStorage`, which clears when the tab closes. This forces re-authentication on each session, protecting game assets from being accessed without a valid Supabase token.

---

## Architecture

```
User opens tab
  └─ main.ts: getSession()
       ├─ No session → showLoginScreen() → on success → startGame()
       └─ Session exists → isAccountActive(userId)
            ├─ Not active → showLoginScreen(startGame, 'pending message')
            └─ Active → initSavesFromCloud() → startGame()
                          └─ populateSessionFromCloud() → sessionStorage

During session
  └─ saveGame() → sessionStorage + syncToCloud() [throttled 10min]
  └─ Explicit save (menu / Enter on slot) → saveToSlot(slot, force=true) → syncToCloud() bypasses throttle
  └─ beforeunload → syncSlotsToCloud() [direct upsert, no throttle]

Tab closes
  └─ sessionStorage cleared automatically by browser
```

---

## Key Files

| File | Role |
|------|------|
| `src/auth/supabase-client.ts` | Supabase client singleton, reads `VITE_SUPABASE_*` env vars |
| `src/auth/auth-service.ts` | `signIn`, `signUp`, `signOut`, `getSession`, `isAccountActive`, `initSavesFromCloud`, `syncSlotsToCloud` |
| `src/auth/login-screen.ts` | HTML overlay login/register UI, bilingual (he/en), language toggle persisted to localStorage |
| `src/auth/login-screen.css` | Game-themed dark styling, CSS spinner, pending state |
| `src/systems/save.ts` | All slot I/O — sessionStorage reads/writes, slot index, cloud sync, PIN management, migrations |
| `src/systems/game-state.ts` | `saveToSlot(slot, force?)` — wraps `saveGame`, exposes force flag |
| `src/scenes/save-slots.ts` | Save/load UI, PIN prompt/setup/edit substates, delete confirm |
| `src/scenes/title.ts` | Q key logout, slot-count-aware menu (redirects to save-slots when all 5 full) |
| `src/main.ts` | Boot sequence, session check, beforeunload sync |

---

## Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

- Stored in `.env` locally (gitignored)
- In production (GitHub Pages): add as **GitHub repository secrets** under Settings → Secrets and variables → Actions
- Vite inlines them at build time — verify post-build with: `grep -r "<supabase-project-id>" dist/`

---

## Supabase Setup

### Table: `saves`

```sql
create table saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slots jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
```

### Table: `profiles`

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false
);
```

New users are created with `active = false`. Admin manually sets `active = true` in the Supabase dashboard to approve them.

### Row Level Security (RLS)

Both tables have RLS enabled. Users can only read/write their own rows (`auth.uid() = user_id` / `auth.uid() = id`).

### Auth Settings

- **Email confirmation: OFF** — admin-activation gate is sufficient. Enabling it causes UX issues where "already registered" errors hit the token endpoint instead of signup endpoint.
- Email provider: Supabase built-in (no Resend yet — deferred to future sprint)

---

## Save Slots

- **Max slots:** 5 (`MAX_SAVE_SLOTS` in `src/systems/save.ts`)
- **Storage:** `sessionStorage` keys:
  - `pokemon-math-adventure-save-{slot}` — full `PlayerData` JSON
  - `pokemon-math-adventure-slots-index` — `SaveSlotMeta[]` array
- **Cloud:** single row per user in `saves.slots` — array of `CloudSlot` objects: `{ slot, meta, data }`
- **Cloud sync throttle:** 10 minutes for auto-saves; bypassed (`force=true`) for explicit saves and `beforeunload`
- **Migration from localStorage:** `migrateFromLocalStorage()` runs once on first cloud login if no cloud saves exist

### `SaveSlotMeta` shape

```typescript
interface SaveSlotMeta {
  slot: number;
  playerName: string;
  heroCharacterId: string;
  firstPokemonId: number | null;
  savedAt: string;          // ISO timestamp
  badgeCount?: number;
  activeQuestId?: string | null;
  pin?: string | null;      // 4-digit string or null
}
```

---

## PIN System

Each save slot can have an optional 4-digit PIN.

### Flow — Load with PIN

1. User selects slot → `enterPinPrompt(meta, onSuccess)`
2. Raw `keydown` listener captures digits
3. Enter → compare with `meta.pin`
4. Match → call `onSuccess` (loads game)
5. Wrong → increment attempts; at 5 → freeze slot for 10 minutes (stored in `localStorage`)

### Flow — Save to new slot

1. Empty slot selected → `enterPinSetup(slot, onDone)`
2. User types 4 digits or presses Enter empty (skip = no PIN)
3. If 4 digits → `pin_setup_confirm` substate (re-enter to confirm)
4. Match → `onDone(pin)` → `doSave(slot, pin)`

### Flow — Edit PIN (added 2026-05-27)

Triggered by pressing `E` on any occupied slot.

```
Slot has PIN:
  enterPinPrompt → verify current PIN
    └─ onSuccess → enterPinSetup
         ├─ Enter empty  → setSlotPin(slot, null)  → flash "PIN Removed!"
         ├─ Enter 4 digits → confirm → setSlotPin(slot, newPin) → flash "PIN Updated!"
         └─ ESC          → cancelled, no change

Slot has no PIN:
  enterPinSetup directly
    ├─ Enter 4 digits → confirm → setSlotPin(slot, newPin) → flash "PIN Updated!"
    ├─ Enter empty    → no change (already no PIN)
    └─ ESC            → cancelled, no change
```

**Key distinction:** `undefined` from callback = ESC (cancelled). `null` = Enter-empty (skip/remove). This is why `pinOnSetupDone` has type `(pin: string | null | undefined) => void`.

### PIN freeze

- 5 wrong attempts → 10-minute lockout
- Stored in `localStorage` key `pokemon-math-pin-freeze-{slot}` (survives tab refresh intentionally)
- `isFrozen(slot)`, `freezeMinutesLeft(slot)` helpers in `save-slots.ts`

### `setSlotPin`

In `src/systems/save.ts`:
- Updates `pin` in the slot index in sessionStorage
- Always calls `syncToCloud(true)` (force) — PIN changes sync immediately

---

## Login Screen

- HTML overlay (`login-screen.ts` injects DOM elements over the canvas)
- Language toggle (`[L]` key) persisted to `localStorage` independently of game save locale
- **States:** `login` | `register` | `pending`
- **Pending state:** shown when admin has not yet activated the account. "Try Again" re-checks session.
- **Known edge case:** Supabase with email confirmation OFF returns "Invalid login credentials" (not "already registered") when registering an existing email with wrong password. Handled by broadening the error check: `message.includes('already') || message.includes('credentials') || message.includes('registered')`
- `loading` flag is reset at the top of both `render()` and `showPending()` to prevent stale state blocking re-submission

---

## Logout

Available from two places:
- **Title screen:** `Q` key → `signOut().then(() => window.location.reload())`
- **Save-slots screen:** `Q` key in list state (covers the case where all 5 slots are full and title redirects directly to save-slots, bypassing the title Q-key)

---

## Save Version & Migrations

Current save version: **16** (`CURRENT_SAVE_VERSION` in `save.ts`)

Migrations run automatically on `loadGame()`. Each version adds/transforms fields. After migration, the updated data is written back to sessionStorage.

Notable migrations:
- v2: boxes (10×30 PC storage)
- v3: abilityId, natureId, heldItemId
- v16: uuid per Pokemon, awayPokemon, totalSteps

---

## Debugging Tips

- **Env vars not injected:** `grep -r "rvyvhmrjifcjunvsfzym" dist/` after build — empty = vars missing
- **Session not persisting:** Supabase stores the session token in `localStorage` under `sb-<project>-auth-token`. Check DevTools → Application → Local Storage
- **Cloud sync not firing:** Check Network tab for POST to `supabase.co/rest/v1/saves`. Throttle is 10min — use an explicit save (menu → save slot) to force it
- **PIN freeze stuck:** Clear `localStorage` key `pokemon-math-pin-freeze-{slot}` in DevTools
- **Slot index out of sync:** `sessionStorage.getItem('pokemon-math-adventure-slots-index')` — should be a JSON array of `SaveSlotMeta`
- **User not activating:** Go to Supabase dashboard → Table Editor → `profiles` → set `active = true` for the user's row
