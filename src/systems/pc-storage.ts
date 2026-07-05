/**
 * PC Storage — Logic for depositing, withdrawing, and releasing Pokemon
 * between the player's party and PC storage boxes.
 *
 * All functions operate directly on PlayerData (same pattern as other systems).
 * The PC scene (src/scenes/pc.ts) handles UI; this module handles data.
 */

import type { Pokemon } from '../types/index.js';
import { getPlayerData } from './game-state.js';

const MAX_PARTY = 6;
const BOX_SIZE = 30;

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

/** Release a Pokemon from the party. Must keep at least 1. Returns the released Pokemon or null. */
export function releaseFromParty(partyIndex: number): Pokemon | null {
  const pd = getPlayerData();
  // 2 cause route-1 has a mandatory catch blocker , npc give poekball and npc clear flags -> if player stay with 1 pokemon this blocker respawn but those giving pokeball not
  if (pd.party.length <= 2) return null;
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
