import { supabase } from './supabase-client.js';
import { populateSessionFromCloud, migrateFromLocalStorage, getAllSlotsForCloud } from '../systems/save.js';
import type { Session } from '@supabase/supabase-js';

export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function isAccountActive(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('active')
    .eq('user_id', userId)
    .single();
  return data?.active === true;
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut(): Promise<void> {
  sessionStorage.clear();
  await supabase.auth.signOut();
}

/** Called once after login — loads saves from Supabase into sessionStorage. */
export async function initSavesFromCloud(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('profiles')
    .select('slots')
    .eq('user_id', user.id)
    .single();

  if (data?.slots && Array.isArray(data.slots) && data.slots.length > 0) {
    populateSessionFromCloud(data.slots);
  } else {
    migrateFromLocalStorage();
  }
}

/** Fire-and-forget upsert of all slots to Supabase. Safe to call without await. */
export async function syncSlotsToCloud(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const slots = getAllSlotsForCloud();
  await supabase.from('profiles').upsert({
    user_id: user.id,
    slots,
    updated_at: new Date().toISOString(),
  });
}
