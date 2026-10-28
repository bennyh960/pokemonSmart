/**
 * Reward granting — the one place that turns a `DialogueReward` into inventory, money,
 * badges, story flags, gift Pokémon and party heals. Used by NPC rewards (overworld) and mini-game prizes.
 *
 * It mutates the player data in place, plays the "item found" sound and returns the
 * message lines to show. Saving and showing the lines is the caller's job.
 */

import { t } from '../i18n/i18n.js';
import { getItem } from '../data/items.js';
import { getLocalizedName, getPokemon, getPokemonDisplayName } from '../services/pokemon-data.js';
import { getPlayerData, setFlag } from './game-state.js';
import { fireStoryTrigger } from './story-engine.js';
import { createPokemonFromData } from './encounter.js';
import { sendCaughtToBox } from './pc-storage.js';
import { getGlobalAudio } from '../audio/audio-manager.js';
import type { DialogueReward } from './npc.js';

const MAX_PARTY = 6;

export interface GrantRewardOptions {
  /**
   * Flag that makes the reward one-time: if already set, nothing is granted (returns null);
   * otherwise it is set after granting and a `flag-set` story trigger fires.
   * Defaults to `reward.flag`.
   */
  onceFlag?: string;
  /** Skip the "item found" sound (the caller plays its own, e.g. the mini-game prize reveal). */
  silent?: boolean;
}

/**
 * Grant a reward. Returns the message lines, or null when `onceFlag` was already set.
 */
export function grantReward(reward: DialogueReward, options: GrantRewardOptions = {}): string[] | null {
  const pd = getPlayerData();
  const onceFlag = options.onceFlag ?? reward.flag;
  if (onceFlag && pd.flags[onceFlag]) return null;

  const lines: string[] = [];

  if (reward.items) {
    if (!options.silent) getGlobalAudio()?.playItemFound();
    for (const ri of reward.items) {
      pd.items[ri.itemId] = (pd.items[ri.itemId] || 0) + ri.quantity;
      const itemDef = getItem(ri.itemId);
      const displayName = itemDef ? getLocalizedName(itemDef.name) : ri.itemId;
      lines.push(t('npc.reward.item', { item: displayName, qty: ri.quantity }));
      // Key items auto-set their flag when received
      if (itemDef?.keyFlag) setFlag(pd, itemDef.keyFlag);
    }
  }

  if (reward.money && reward.money > 0) {
    pd.money += reward.money;
    lines.push(t('npc.reward.money', { money: reward.money }));
  }

  if (reward.badge !== undefined && reward.badge >= 1 && reward.badge <= 8) {
    pd.badges |= 1 << (reward.badge - 1);
    lines.push(t('npc.reward.badge', { badge: reward.badge }));
  }

  if (reward.pokemon) {
    const data = getPokemon(reward.pokemon.id);
    if (data) {
      const mon = createPokemonFromData(data, reward.pokemon.level);
      pd.pokedex[mon.id] = 'caught';
      const name = getPokemonDisplayName(mon.id);
      lines.push(t('npc.reward.pokemon', { name }));
      if (pd.party.length < MAX_PARTY) {
        pd.party.push(mon);
      } else {
        const box = sendCaughtToBox(mon);
        if (box > 0) lines.push(t('battle.partyFull', { name, box }));
      }
    }
  }

  if (reward.restorePokemon) {
    const mon = pd.party.find((p) => p.uuid === reward.restorePokemon!.uuid);
    if (mon) {
      mon.hp = mon.maxHp;
      mon.status = reward.restorePokemon.status;
      const name = getPokemonDisplayName(mon.id);
      lines.push(t(mon.status === 'sleep' ? 'npc.reward.restoredAsleep' : 'npc.reward.restored', { name }));
    }
  }

  if (reward.storyEvent) setFlag(pd, reward.storyEvent);

  if (onceFlag) {
    setFlag(pd, onceFlag);
    void fireStoryTrigger({ type: 'flag-set', flag: onceFlag });
  }

  return lines;
}
