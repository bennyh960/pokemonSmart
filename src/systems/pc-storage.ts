/**
 * PC Storage — Logic for depositing, withdrawing, and releasing Pokemon
 * between the player's party and PC storage boxes.
 *
 * All functions operate directly on PlayerData (same pattern as other systems).
 * The PC screen (src/scenesReact/pc/) handles UI; this module handles data.
 */

import type { Pokemon, PlayerData } from '../types/index.js';
import { getPlayerData } from './game-state.js';

export const MAX_PARTY = 6;
export const BOX_SIZE = 30;

/** Deposit a Pokemon from party into a box slot. Returns false if invalid. */
export function depositPokemon(partyIndex: number, boxIndex: number, slotIndex: number): boolean {
  const pd = getPlayerData();
  // Must keep at least 1 Pokemon in party
  if (pd.party.length <= 1) return false;
  if (partyIndex < 0 || partyIndex >= pd.party.length) return false;
  if (boxIndex < 0 || boxIndex >= pd.boxes.length) return false;
  if (slotIndex < 0 || slotIndex >= BOX_SIZE) return false;
  // Slot must be empty
  if (pd.boxes[boxIndex].pokemon[slotIndex] !== null) return false;

  const pokemon = pd.party.splice(partyIndex, 1)[0];
  pd.boxes[boxIndex].pokemon[slotIndex] = pokemon;
  return true;
}

/** Withdraw a Pokemon from a box slot into the party. Returns false if invalid. */
export function withdrawPokemon(boxIndex: number, slotIndex: number): boolean {
  const pd = getPlayerData();
  if (pd.party.length >= MAX_PARTY) return false;
  if (boxIndex < 0 || boxIndex >= pd.boxes.length) return false;
  if (slotIndex < 0 || slotIndex >= BOX_SIZE) return false;

  const pokemon = pd.boxes[boxIndex].pokemon[slotIndex];
  if (!pokemon) return false;

  pd.boxes[boxIndex].pokemon[slotIndex] = null;
  pd.party.push(pokemon);
  return true;
}

/** Release (permanently delete) a Pokemon from a box slot. Returns the released Pokemon for confirmation, or null. */
export function releaseFromBox(boxIndex: number, slotIndex: number): Pokemon | null {
  const pd = getPlayerData();
  if (boxIndex < 0 || boxIndex >= pd.boxes.length) return null;
  if (slotIndex < 0 || slotIndex >= BOX_SIZE) return null;

  const pokemon = pd.boxes[boxIndex].pokemon[slotIndex];
  if (!pokemon) return null;

  pd.pokedex[pokemon.id] = 'release'; // mark as seen in case it was caught and released
  pd.boxes[boxIndex].pokemon[slotIndex] = null;
  return pokemon;
}

/**
 * Smallest party you may release from (party size must be above this). 2, not 1: Route 1 has a
 * mandatory-catch blocker — with 1 Pokémon it respawns, but the NPCs that hand out Poké Balls don't.
 */
export const MIN_PARTY_FOR_RELEASE = 2;

/** Release a Pokemon from the party (party must be bigger than MIN_PARTY_FOR_RELEASE). Returns it, or null. */
export function releaseFromParty(partyIndex: number): Pokemon | null {
  const pd = getPlayerData();
  if (pd.party.length <= MIN_PARTY_FOR_RELEASE) return null;
  if (partyIndex < 0 || partyIndex >= pd.party.length) return null;

  return pd.party.splice(partyIndex, 1)[0];
}

/** Swap a party Pokemon with a box slot Pokemon. Both must exist. */
export function swapPartyAndBox(partyIndex: number, boxIndex: number, slotIndex: number): boolean {
  const pd = getPlayerData();
  if (partyIndex < 0 || partyIndex >= pd.party.length) return false;
  if (boxIndex < 0 || boxIndex >= pd.boxes.length) return false;
  if (slotIndex < 0 || slotIndex >= BOX_SIZE) return false;

  const boxPokemon = pd.boxes[boxIndex].pokemon[slotIndex];
  if (!boxPokemon) return false;

  const partyPokemon = pd.party[partyIndex];
  pd.party[partyIndex] = boxPokemon;
  pd.boxes[boxIndex].pokemon[slotIndex] = partyPokemon;
  return true;
}

/**
 * Send a newly caught Pokemon directly to the first available box slot.
 * Used when the party is already full at the moment of capture.
 * Returns the box index (1-based for display) or -1 if all boxes are full.
 */
export function sendCaughtToBox(pokemon: Pokemon): number {
  const pd = getPlayerData();
  pokemon.hp = pokemon.maxHp;
  for (let b = 0; b < pd.boxes.length; b++) {
    const slot = pd.boxes[b].pokemon.indexOf(null);
    if (slot >= 0) {
      pd.boxes[b].pokemon[slot] = { ...pokemon };
      return b + 1; // 1-based box number for display
    }
  }
  return -1; // all boxes full (extremely unlikely)
}

/**
 * Move a boxed Pokemon to another slot (same box or another box). An occupied target
 * swaps the two; toSlot = null takes the target box's first empty slot.
 */
export function moveBoxPokemon(fromBox: number, fromSlot: number, toBox: number, toSlot: number | null): boolean {
  const pd = getPlayerData();
  const from = pd.boxes[fromBox]?.pokemon;
  const to = pd.boxes[toBox]?.pokemon;
  if (!from || !to || !from[fromSlot]) return false;
  const target = toSlot ?? to.indexOf(null);
  if (target < 0 || target >= BOX_SIZE) return false;
  if (fromBox === toBox && fromSlot === target) return false;
  [from[fromSlot], to[target]] = [to[target], from[fromSlot]];
  return true;
}

/** Party + boxes + Pokédex as they were before a PC action — lets the PC screen undo its last action. */
export interface StorageSnapshot {
  party: Pokemon[];
  boxes: (Pokemon | null)[][];
  pokedex: PlayerData['pokedex'];
}

export function takeStorageSnapshot(): StorageSnapshot {
  const pd = getPlayerData();
  return { party: [...pd.party], boxes: pd.boxes.map((b) => [...b.pokemon]), pokedex: { ...pd.pokedex } };
}

export function restoreStorageSnapshot(snap: StorageSnapshot): void {
  const pd = getPlayerData();
  pd.party = [...snap.party];
  snap.boxes.forEach((slots, i) => {
    if (pd.boxes[i]) pd.boxes[i].pokemon = [...slots];
  });
  pd.pokedex = { ...snap.pokedex };
}

/** Count non-null Pokemon in a box. */
export function getBoxCount(boxIndex: number): number {
  const pd = getPlayerData();
  if (boxIndex < 0 || boxIndex >= pd.boxes.length) return 0;
  return pd.boxes[boxIndex].pokemon.filter((p) => p !== null).length;
}

/** Find the first empty slot in a box. Returns index or -1 if full. */
export function findEmptySlot(boxIndex: number): number {
  const pd = getPlayerData();
  if (boxIndex < 0 || boxIndex >= pd.boxes.length) return -1;
  return pd.boxes[boxIndex].pokemon.indexOf(null);
}
