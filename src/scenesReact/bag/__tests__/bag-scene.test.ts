import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));

// The React host is replaced by a recorder: every mount hands us the screen's props
const mounts: Record<string, unknown>[] = [];
vi.mock('../../../engine/react/react-scene-host.js', () => ({
  mountReactScene: (_c: unknown, props: Record<string, unknown>) => mounts.push(props),
  unmountReactScene: () => {},
}));

import type { Scene, SceneId } from '../../../types/index.js';
import type { StateMachine } from '../../../engine/state-machine.js';
import { createNewPlayerData, startSandboxGame, getPlayerData } from '../../../systems/game-state';
import { createPokemonFromData } from '../../../systems/encounter';
import { getPokemon } from '../../../services/pokemon-data';
import { setPartyIndex } from '../../../scenes/party/party_scene';
import { createBagReactScene, setBagMode, pendingItem, type BagController } from '../index';

/** A tiny stack: the bag is the bottom scene, other scenes are pushed over it. */
function fakeStateMachine() {
  const stack: { id: string; scene?: Scene }[] = [];
  let bag: Scene;
  const sm = {
    pushDirect: (id: SceneId, scene: Scene) => stack.push({ id, scene }),
    push: (id: SceneId) => stack.push({ id }),
    pop: () => stack.pop(),
    current: () => (stack.length ? stack[stack.length - 1].scene : bag),
  } as unknown as StateMachine;
  return { sm, stack, setBag: (s: Scene) => (bag = s) };
}

const last = () => mounts[mounts.length - 1] as { controller: BagController; initialMessage: string | null };

describe('bag scene', () => {
  let fsm: ReturnType<typeof fakeStateMachine>;
  let bag: Scene;

  beforeEach(() => {
    mounts.length = 0;
    const pd = createNewPlayerData();
    pd.party = [createPokemonFromData(getPokemon(4)!, 10)];
    pd.party[0].hp = 1;
    pd.items = { potion: 2, 'poke-ball': 3 };
    startSandboxGame(pd);
    fsm = fakeStateMachine();
    bag = createBagReactScene(fsm.sm);
    fsm.setBag(bag);
  });

  it('a potion opens the party, heals the picked Pokémon and comes back with a message', () => {
    setBagMode('overworld');
    bag.enter();
    expect(mounts).toHaveLength(1);
    last().controller.activate('potion');
    expect(fsm.stack.map((s) => s.id)).toEqual(['PARTY']);

    // The player picks the first Pokémon, the party screen closes
    setPartyIndex(0);
    fsm.stack.pop();
    bag.update(0.016);

    expect(getPlayerData().items.potion).toBe(1);
    expect(getPlayerData().party[0].hp).toBeGreaterThan(1);
    expect(mounts).toHaveLength(2);
    expect(last().initialMessage).toBeTruthy();
  });

  it('closing the party without a pick uses nothing', () => {
    setBagMode('overworld');
    bag.enter();
    last().controller.activate('potion');
    fsm.stack.pop();
    bag.update(0.016);
    expect(getPlayerData().items.potion).toBe(2);
    expect(last().initialMessage).toBeNull();
  });

  it('in battle an item is handed to the battle and the bag closes', () => {
    setBagMode('battle');
    bag.enter();
    fsm.stack.push({ id: 'BAG' }); // the bag itself, so its pop is visible
    last().controller.activate('poke-ball');
    expect(pendingItem?.itemId).toBe('poke-ball');
    expect(fsm.stack).toHaveLength(0);
  });

  it('sells for half price', () => {
    setBagMode('sell-item');
    bag.enter();
    const money = getPlayerData().money;
    const msg = last().controller.sell('potion', 2);
    expect(msg).toBeTruthy();
    expect(getPlayerData().items.potion ?? 0).toBe(0);
    expect(getPlayerData().money).toBe(money + 300);
  });
});
