# Authentication & Save System

**Last updated:** 2026-05-27  
**Author:** behassan  
**Status:** Production-ready  
**Sprint:** Auth Epic (implemented across sessions prior to sprint-4)

---

## Overview

The game uses **Supabase** for authentication and cloud save sync. The client never stores game data in `localStorage` during an active session — all runtime saves live in `sessionStorage`, which clears when the tab closes. This forces re-authentication on each session, protecting game assets from being accessed without a valid Supabase token.

New users require **admin approval** before they can play. When a user registers, an email is sent to the admin with a one-click approve button.

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

New user registers
  └─ Supabase creates row in auth.users
       └─ Postgres trigger → INSERT into public.profiles (active=false)
            └─ DB Webhook → Edge Function notify-new-user (POST)
                 └─ Resend API → email to admin with Approve button
                      └─ Admin clicks Approve
                           └─ Edge Function notify-new-user (GET ?user_id=...&secret=...)
                                └─ UPDATE profiles SET active=true
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
VITE_SUPABASE_URL=https://rvyvhmrjifcjunvsfzym.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

- Stored in `.env` locally (gitignored)
- In production (GitHub Pages): add as **GitHub repository secrets** under Settings → Secrets and variables → Actions
- Vite inlines them at build time — verify post-build with: `grep -r "rvyvhmrjifcjunvsfzym" dist/`

---

## Supabase Setup

### Table: `profiles` (consolidated — replaces old `saves` + `profiles`)

```sql
create table public.profiles (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  slots    jsonb not null default '[]',
  active   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

> **Note:** Originally two tables (`saves` and `profiles`) were merged into one on 2026-05-27.  
> `saves` is dropped. All cloud save upserts and `active` checks now target `profiles`.

### Row Level Security (RLS)

```sql
create policy "Users can access own data"
  on public.profiles for all
  using (auth.uid() = user_id);
```

### Auto-create trigger

Fires on every new Supabase auth signup, inserts a pending profile row:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, active)
  values (new.id, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Auth Settings

- **Email confirmation: OFF** — admin-activation gate is sufficient. Enabling it causes a UX issue: registering an existing email with wrong password hits the token endpoint and returns "Invalid login credentials" instead of "already registered". The login screen handles this by broadening the error check to catch both strings.

---

## Admin Notification System

### How it works

When a new user registers:
1. Postgres trigger inserts row into `public.profiles`
2. DB Webhook (on `public.profiles` INSERT) calls the `notify-new-user` Edge Function
3. Function looks up the user's email via service role, sends email via Resend
4. Email contains two buttons: **Approve** (one-click) and **View in Supabase**

### Edge Function: `notify-new-user`

**URL:** `https://rvyvhmrjifcjunvsfzym.functions.supabase.co/notify-new-user`  
**JWT verification:** OFF (disabled in dashboard — approve link opens in browser without auth headers)

Handles two request types:

| Method | Trigger | Action |
|--------|---------|--------|
| POST | DB Webhook (auto) | Looks up email, sends notification via Resend |
| GET `?user_id=...&secret=...` | Admin clicks email button | Sets `profiles.active = true` |

### Required Supabase Secrets

| Secret | Source |
|--------|--------|
| `RESEND_API_KEY` | resend.com dashboard → API Keys |
| `ADMIN_APPROVE_SECRET` | Any string you chose (e.g. `pkmn-admin-2026`) |
| `SUPABASE_URL` | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected by Supabase runtime |

### DB Webhook config

- **Name:** `on_profile_created`
- **Schema:** `public` — **Table:** `profiles`
- **Event:** `INSERT`
- **Target:** Edge Function `notify-new-user`

> **Why `public.profiles` and not `auth.users`?**  
> Supabase DB Webhooks use pg_net which doesn't reliably trigger on the `auth` schema (internally managed by GoTrue). Watching `public.profiles` works because the Postgres trigger on `auth.users` inserts into it first.

### Approve flow security

The approve URL contains `?secret=ADMIN_APPROVE_SECRET`. The function checks this before updating `active`. Anyone without the secret gets a 401. JWT verification is off because the browser GET from an email link carries no auth headers.

### Email sender

- **From:** `onboarding@resend.dev` (Resend sandbox domain, works on free plan)
- **To:** `behassan@deloitte.co.il`
- Lands in spam on first send — mark as not spam once

---

## Save Slots

- **Max slots:** 5 (`MAX_SAVE_SLOTS` in `src/systems/save.ts`)
- **Storage:** `sessionStorage` keys:
  - `pokemon-math-adventure-save-{slot}` — full `PlayerData` JSON
  - `pokemon-math-adventure-slots-index` — `SaveSlotMeta[]` array
- **Cloud:** single row per user in `profiles.slots` — array of `CloudSlot` objects: `{ slot, meta, data }`
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
         ├─ Enter empty    → setSlotPin(slot, null)   → flash "PIN Removed!"
         ├─ Enter 4 digits → confirm → setSlotPin(slot, newPin) → flash "PIN Updated!"
         └─ ESC            → cancelled, no change

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

In `src/systems/save.ts` — updates PIN in sessionStorage slot index, always calls `syncToCloud(true)` (force syncs immediately).

---

## Login Screen

- HTML overlay (`login-screen.ts` injects DOM elements over the canvas)
- Language toggle (`[L]` key) persisted to `localStorage` independently of game save locale
- **States:** `login` | `register` | `pending`
- **Pending state:** shown when admin has not yet activated the account. "Try Again" re-checks session.
- **Known edge case:** Supabase with email confirmation OFF returns "Invalid login credentials" (not "already registered") when registering an existing email. Handled by: `message.includes('already') || message.includes('credentials') || message.includes('registered')`
- `loading` flag is reset at the top of both `render()` and `showPending()` to prevent stale state blocking re-submission

---

## Logout

Available from two places:
- **Title screen:** `Q` key → `signOut().then(() => window.location.reload())`
- **Save-slots screen:** `Q` key in list state (covers the case where all 5 slots are full and title redirects directly to save-slots, bypassing the title Q-key)

---

## Save Version & Migrations

Current save version: **16** (`CURRENT_SAVE_VERSION` in `save.ts`)

Migrations run automatically on `loadGame()`. Each version adds/transforms fields. After migration the updated data is written back to sessionStorage.

Notable migrations:
- v2: boxes (10×30 PC storage)
- v3: abilityId, natureId, heldItemId
- v16: uuid per Pokemon, awayPokemon, totalSteps

---

## Debugging Tips

- **Env vars not injected:** `grep -r "rvyvhmrjifcjunvsfzym" dist/` after build — empty = vars missing
- **Session not persisting:** Supabase stores the session token in `localStorage` under `sb-<project>-auth-token`. Check DevTools → Application → Local Storage
- **Cloud sync not firing:** Check Network tab for POST to `supabase.co/rest/v1/profiles`. Throttle is 10min — use an explicit save (menu → save slot) to force it
- **Notification email not arriving:** Check spam. First send from `onboarding@resend.dev` always lands in spam
- **Approve button 401:** JWT verification must be OFF on the `notify-new-user` function (dashboard → Edge Functions → function settings)
- **Webhook not firing:** Check Supabase → Database → Webhooks — must target `public.profiles`, not `auth.users`
- **PIN freeze stuck:** Clear `localStorage` key `pokemon-math-pin-freeze-{slot}` in DevTools
- **Slot index out of sync:** `sessionStorage.getItem('pokemon-math-adventure-slots-index')` — should be a JSON array of `SaveSlotMeta`
- **User stuck in pending:** Supabase → Table Editor → `profiles` → set `active = true`, or click Approve in the notification email
