/**
 * Admin save snapshots — full copies of a save slot that can be restored later,
 * so a story arc can be replayed without hand-editing flags.
 * Snapshots live in this browser's localStorage (admin-only tool).
 * Saves themselves go through systems/save.ts; a restore waits for the Supabase
 * upsert because the game re-reads saves from the cloud on every page load.
 */

import type { PlayerData } from '../types/index';
import { loadGame, saveGame, clearEventCheckpoint } from '../systems/save';
import { syncSlotsToCloud } from '../auth/auth-service';
import { getQuest } from '../data/story/quests';

export interface Snapshot {
  id: string;
  slot: number;
  label: string;
  savedAt: string;
  data: PlayerData;
}

const STORAGE_KEY = 'admin:save-snapshots';

function readAll(): Snapshot[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Snapshot[];
  } catch {
    return [];
  }
}

function writeAll(list: Snapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** Snapshots for a slot, newest first. */
export function listSnapshots(slot: number): Snapshot[] {
  return readAll()
    .filter((s) => s.slot === slot)
    .reverse();
}

/** Short description of where a save is in the story, e.g. "Quest: Road to Percentile". */
export function describeProgress(pd: PlayerData): string {
  const st = pd.story;
  if (st?.activeQuestId) return `Quest: ${getQuest(st.activeQuestId)?.title.en ?? st.activeQuestId}`;
  const last = st?.completedQuestIds.at(-1);
  return last ? `Done: ${getQuest(last)?.title.en ?? last}` : 'No active quest';
}

/** Throws if localStorage is full. */
export function addSnapshot(slot: number, pd: PlayerData, label: string): void {
  const list = readAll();
  list.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    slot,
    label,
    savedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(pd)) as PlayerData,
  });
  writeAll(list);
}

export function deleteSnapshot(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

/**
 * Restore a snapshot into its slot and push it to Supabase.
 * The current save is kept as a "Before restore" snapshot so you can go forward again.
 */
export async function restoreSnapshot(snap: Snapshot): Promise<void> {
  const current = loadGame(snap.slot);
  if (current) addSnapshot(snap.slot, current, `Before restore (${describeProgress(current)})`);
  clearEventCheckpoint(snap.slot); // otherwise a pending mid-cutscene rollback re-applies old flags
  saveGame(snap.slot, JSON.parse(JSON.stringify(snap.data)) as PlayerData);
  await syncSlotsToCloud();
}
