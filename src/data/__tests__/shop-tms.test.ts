import { beforeAll, describe, expect, it } from 'vitest';
import { loadHeavyData } from '../../services/__tests__/heavy-data.js';
import { getItem, getItemsByCategory } from '../items';
import { SHOP_TM_TAG } from '../item-defs';
import { canLearnViaTM } from '../../services/pokemon-data.js';
import { MOVE_BATTLE_OVERRIDES } from '../move-battle-overrides';
import tmLearnsets from '../tm-learnsets.json';
import martInterior from '../maps/shared/mart-interior.json';

beforeAll(loadHeavyData);

const shopTms = () => getItemsByCategory('machine').filter((i) => i.tags?.includes(SHOP_TM_TAG));

describe('shop TMs', () => {
  it('26 priced TMs, each teaching a wired move that at least one of our Pokémon can learn by TM', () => {
    const tms = shopTms();
    expect(tms).toHaveLength(26);
    for (const tm of tms) {
      expect(tm.price).toBeGreaterThan(0);
      if (tm.effect.type !== 'tm') throw new Error(`${tm.id} is not a TM`);
      const { moveId } = tm.effect;
      const learners = Object.keys(tmLearnsets).filter((pid) => canLearnViaTM(Number(pid), moveId));
      expect(learners.length, tm.id).toBeGreaterThan(0);
    }
  });

  it('a shop TM describes its move once move data is loaded', () => {
    expect(getItem('tm72')?.description.en).toBe('Teaches Scald');
    expect(getItem('tm54')?.name.en).toBe('TM54');
  });

  it('the Percentile mart sells only shop TMs; the other city marts sell none', () => {
    const npcs = martInterior.npcs as Array<{
      id: string;
      categoriesToExclude?: string[];
      shopCategoryTags?: Record<string, string[]>;
    }>;
    expect(npcs.find((n) => n.id === 'npc-pct-mart-keeper')?.shopCategoryTags).toEqual({ machine: [SHOP_TM_TAG] });
    expect(npcs.find((n) => n.id === 'npc-shopkeepr')?.categoriesToExclude).toContain('machine');
  });

  it('moves no Pokémon can learn have no active override', () => {
    for (const name of ['Shell Smash', 'Quiver Dance', 'Nuzzle', 'Toxic Thread']) {
      expect(MOVE_BATTLE_OVERRIDES[name], name).toBeUndefined();
    }
  });
});
