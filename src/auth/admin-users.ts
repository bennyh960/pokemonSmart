// Client for the `admin-users` Supabase Edge Function (supabase/functions/admin-users).
// Only works for a logged-in user whose email is in the function's ADMIN_EMAILS secret.

import { supabase } from './supabase-client.js';

export interface AdminPlayer {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  active: boolean;
  playerNames: string[];
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // FunctionsHttpError keeps the response; surface the function's own message
    const res = (error as { context?: Response }).context;
    const msg = res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined;
    throw new Error(msg ?? error.message);
  }
  return data as T;
}

export async function listPlayers(): Promise<AdminPlayer[]> {
  return (await call<{ players: AdminPlayer[] }>({ action: 'list' })).players;
}

export async function resetPlayerPassword(userId: string, password: string): Promise<void> {
  await call({ action: 'reset-password', userId, password });
}
