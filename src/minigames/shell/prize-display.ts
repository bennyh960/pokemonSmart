/** Turns a reward into what a prize card shows (icon + label). Display only — granting is systems/rewards.ts. */

import { getItem } from '../../data/items.js';
import { getPokemon } from '../../services/pokemon-data.js';
import { pokemonFrontSpriteUrl } from '../../systems/overworld-pokemon-anim.js';
import { t, type Locale } from '../../i18n/i18n.js';
import { getPlayerData } from '../../systems/game-state.js';
import type { DialogueReward } from '../types.js';

export interface PrizeLine {
  /** Image URL, or null when `emoji` is used. */
  icon: string | null;
  emoji?: string;
  label: string;
  /** "×3" etc. (always LTR). */
  qty?: string;
}

export function describeReward(reward: DialogueReward, locale: Locale): PrizeLine[] {
  const lines: PrizeLine[] = [];
  for (const ri of reward.items ?? []) {
    const def = getItem(ri.itemId);
    lines.push({
      icon: def?.sprite ?? null,
      emoji: def ? undefined : '🎁',
      label: def ? def.name[locale] : ri.itemId,
      qty: ri.quantity > 1 ? `×${ri.quantity}` : undefined,
    });
  }
  if (reward.money) lines.push({ icon: null, emoji: '💰', label: `${reward.money.toLocaleString()}₽` });
  if (reward.pokemon) {
    const mon = getPokemon(reward.pokemon.id);
    lines.push({
      icon: pokemonFrontSpriteUrl(reward.pokemon.id),
      label: mon ? mon.name[locale] : `#${reward.pokemon.id}`,
      qty: `Lv.${reward.pokemon.level}`,
    });
  }
  if (reward.restorePokemon) {
    const { uuid, status } = reward.restorePokemon;
    const mon = getPlayerData().party.find((p) => p.uuid === uuid);
    lines.push({
      icon: mon ? pokemonFrontSpriteUrl(mon.id) : null,
      emoji: mon ? undefined : '💖',
      label: `${mon ? `${getPokemon(mon.id)?.name[locale] ?? mon.name} · ` : ''}${t(status === 'sleep' ? 'minigames.prize.fullHpAsleep' : 'minigames.prize.fullHp')}`,
      qty: status === 'sleep' ? '💤' : '💖',
    });
  }
  if (reward.badge) lines.push({ icon: null, emoji: '🏅', label: `#${reward.badge}` });
  return lines;
}
