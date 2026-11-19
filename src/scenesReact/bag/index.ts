// src/scenesReact/bag/index.ts
/**
 * Bag scene. The React screen shows the items; this file runs everything that
 * needs other scenes: picking a Pokémon (PARTY), the move-learning screen and
 * evolution. Before pushing one of those it unmounts the screen (the React host
 * has one root), and remounts it in update() once it is on top again.
 */
import type { Pokemon, Scene } from '../../types/index.js';
import type { StateMachine } from '../../engine/state-machine.js';
import { mountReactScene, unmountReactScene } from '../../engine/react/react-scene-host.js';
import { t, getLocale } from '../../i18n/i18n.js';
import { getPlayerData, autoSave } from '../../systems/game-state.js';
import { editPlayerData } from '../../systems/player-store/player-store.js';
import { getItem } from '../../data/items.js';
import { getTMEffect } from '../../data/item-defs.js';
import {
  applyItemEffect,
  applyDirectItemEffect,
  consumeItem,
  isItemConsumable,
  canUseItemOnPokemon,
  itemTargetsPokemon,
} from '../../systems/item-effects.js';
import {
  getPokemonDisplayName,
  getLocalizedName,
  getMoveDisplayName,
  canLearnViaTM,
  getLearnLevelForMove,
} from '../../services/pokemon-data.js';
import { getGlobalAudio } from '../../audio/audio-manager.js';
import { setEvolutionData } from '../../scenes/evolution.js';
import { selectedPartyIndex, clearSelectedPartyIndex } from '../../scenes/party/party_scene.js';
import {
  createMoveLearningQueueState,
  initializeMoveLearningQueue,
  nextMoveLearningQueueStep,
  resetMoveLearningQueueState,
} from '../../systems/move-learning.js';
import { createPartyReactScene } from '../party/index.js';
import { BagScreen, type BagView, type TMQuestion } from './BagScreen.js';
import { getBagMode, setBagPendingItem, clearPendingItem } from './bag-mode.js';
import { primaryAction, sellPrice } from './bag-helpers.js';

export { setBagMode, getBagMode, setBagPendingItem, clearPendingItem, pendingItem } from './bag-mode.js';

/** What the screen can ask the scene to do. A returned string is a message for the toast. */
export interface BagController {
  /** Main button / Enter on an item */
  activate(itemId: string): string | void;
  sell(itemId: string, count: number): string | void;
  toss(itemId: string, count: number): string | void;
  answerTM(teachAnyway: boolean): string | void;
}

const DEFAULT_VIEW: BagView = { pocket: 'medicine', category: null, query: '', sort: 'default', selected: null };

export function createBagReactScene(stateMachine: StateMachine): Scene {
  let mounted = false;
  let view: BagView = { ...DEFAULT_VIEW };
  /** Messages to show when the screen comes back (after the party / evolution screens) */
  let flash: string[] = [];
  let waitingTargetFor: string | null = null;
  let tmQuestion: (TMQuestion & { pokemon: Pokemon }) | null = null;
  const learning = createMoveLearningQueueState();

  const name = (p: Pokemon) => getPokemonDisplayName(p.id);

  function mount() {
    mounted = true;
    const message = flash.join('  ');
    flash = [];
    mountReactScene(BagScreen, {
      mode: getBagMode(),
      initialView: view,
      onViewChange: (v: BagView) => {
        view = v;
      },
      initialMessage: message || null,
      tmQuestion: tmQuestion
        ? { pokemonName: tmQuestion.pokemonName, moveName: tmQuestion.moveName, level: tmQuestion.level }
        : null,
      controller,
      onClose: () => {
        unmount();
        stateMachine.pop();
      },
    });
  }

  function unmount() {
    if (!mounted) return;
    mounted = false;
    unmountReactScene();
  }

  /** Opens the party to pick who gets the item; the result is read in update(). */
  function pickTarget(itemId: string, isEligible: (p: Pokemon) => boolean) {
    const def = getItem(itemId);
    if (!def) return;
    unmount();
    clearSelectedPartyIndex();
    waitingTargetFor = itemId;
    stateMachine.pushDirect(
      'PARTY',
      createPartyReactScene(stateMachine, {
        kind: 'select-target',
        itemId,
        itemName: getLocalizedName(def.name),
        description: getLocalizedName(def.description),
        onSelect: () => true,
        isEligible,
      }),
    );
  }

  // ── TMs ─────────────────────────────────────────────────────────

  function teachTM(itemId: string, pokemon: Pokemon): string {
    const tm = getTMEffect(itemId)!;
    const move = getMoveDisplayName(tm.moveId);
    let out = '';
    editPlayerData((pd) => {
      const result = applyItemEffect(itemId, pokemon);
      if (result.success) {
        out = t('bag.tm.learned', { name: name(pokemon), move });
        if (!tm.isHM) consumeItem(pd.items, itemId); // HMs are never used up
      } else {
        out = result.message === 'no-space' ? t('bag.tm.noSpace', { name: name(pokemon), move }) : result.message;
      }
    });
    return out;
  }

  /** TM picked a Pokémon: checks, then asks first if it would learn the move by itself later. */
  function handleTM(itemId: string, pokemon: Pokemon, partyIndex: number): void {
    const tm = getTMEffect(itemId)!;
    const move = getMoveDisplayName(tm.moveId);
    if (!canLearnViaTM(pokemon.id, tm.moveId))
      return void flash.push(t('bag.tm.cantLearn', { name: name(pokemon), move }));
    if (pokemon.moves.some((m) => m.id === tm.moveId)) {
      return void flash.push(t('bag.tm.alreadyKnows', { name: name(pokemon), move }));
    }
    if (pokemon.moves.length >= 8) {
      // Full moveset — the move-learning screen lets the player swap one out
      initializeMoveLearningQueue(learning, partyIndex, pokemon.id, [{ moveId: tm.moveId, learned: false }], null);
      return;
    }
    const level = getLearnLevelForMove(pokemon.id, tm.moveId);
    if (level !== null && level > pokemon.level) {
      tmQuestion = { itemId, pokemon, pokemonName: name(pokemon), moveName: move, level };
      return;
    }
    flash.push(teachTM(itemId, pokemon));
  }

  // ── Back from the party screen ─────────────────────────────────

  function handleTargetPicked(itemId: string): void {
    const index = selectedPartyIndex;
    clearSelectedPartyIndex();
    const pd = getPlayerData();
    const target = index >= 0 ? pd.party[index] : undefined;
    const def = getItem(itemId);
    if (!target || !def) return;

    if (def.category === 'held') {
      if (target.heldItemId) return void flash.push(t('bag.heldItem.equippedAlready', { name: name(target) }));
      editPlayerData((d) => {
        target.heldItemId = itemId;
        consumeItem(d.items, itemId);
      });
      return void flash.push(t('bag.heldItem.equipped', { name: name(target), item: def.name[getLocale()] }));
    }

    if (getTMEffect(itemId)) return handleTM(itemId, target, index);

    let result: ReturnType<typeof applyItemEffect> | null = null;
    editPlayerData((d) => {
      result = applyItemEffect(itemId, target);
      if (result.success && isItemConsumable(itemId)) consumeItem(d.items, itemId);
    });
    const r = result as ReturnType<typeof applyItemEffect> | null;
    if (!r) return;
    if (!r.success) return void flash.push(r.message);
    getGlobalAudio()?.playSFX('heal');
    flash.push(`${name(target)}: ${r.message}`);
    if (r.newMoves && r.newMoves.length > 0) {
      initializeMoveLearningQueue(learning, index, target.id, r.newMoves, r.evolution ?? null);
    } else if (r.evolution) {
      setEvolutionData(target, r.evolution);
      stateMachine.push('EVOLUTION');
    }
  }

  /** Runs the move-learning queue. Returns true when it pushed another scene. */
  function runLearningQueue(): boolean {
    while (learning.partyIndex !== null) {
      const target = getPlayerData().party[learning.partyIndex];
      if (!target) {
        resetMoveLearningQueueState(learning);
        return false;
      }
      const step = nextMoveLearningQueueStep(learning, () => autoSave());
      if (step.kind === 'show-message') {
        flash.push(step.message);
        continue;
      }
      if (step.kind === 'open-session') {
        flash = []; // the move-learning screen announces the move itself
        stateMachine.pushDirect(
          'PARTY',
          createPartyReactScene(stateMachine, { kind: 'move-learning', session: step.session }),
        );
        return true;
      }
      if (step.kind === 'finish' && step.evolution) {
        setEvolutionData(target, step.evolution);
        stateMachine.push('EVOLUTION');
        return true;
      }
      return false;
    }
    return false;
  }

  // ── Actions from the screen ────────────────────────────────────

  const controller: BagController = {
    activate(itemId) {
      const def = getItem(itemId);
      if (!def || (getPlayerData().items[itemId] ?? 0) <= 0) return;
      view = { ...view, selected: itemId };
      const action = primaryAction(def, getBagMode());
      switch (action.kind) {
        case 'pick':
          setBagPendingItem(itemId);
          unmount();
          stateMachine.pop();
          return;
        case 'sell':
          return controller.sell(itemId, 1);
        case 'give':
          return pickTarget(itemId, () => true);
        case 'teach': {
          const tm = getTMEffect(itemId)!;
          const anyCanLearn = getPlayerData().party.some(
            (p) => canLearnViaTM(p.id, tm.moveId) && !p.moves.some((m) => m.id === tm.moveId),
          );
          if (!anyCanLearn) return t('bag.tm.noneCanLearn', { move: getMoveDisplayName(tm.moveId) });
          return pickTarget(itemId, (p) => canUseItemOnPokemon(itemId, p));
        }
        case 'use': {
          if (itemTargetsPokemon(itemId)) return pickTarget(itemId, (p) => canUseItemOnPokemon(itemId, p));
          let message = '';
          editPlayerData((pd) => {
            const result = applyDirectItemEffect(itemId);
            if (result.success && isItemConsumable(itemId)) consumeItem(pd.items, itemId);
            message = result.message;
          });
          return message;
        }
        case 'none':
          return t(action.reasonKey);
      }
    },

    sell(itemId, count) {
      const def = getItem(itemId);
      const have = getPlayerData().items[itemId] ?? 0;
      const n = Math.min(count, have);
      if (!def || n <= 0) return;
      const price = sellPrice(def) * n;
      editPlayerData((pd) => {
        for (let i = 0; i < n; i++) consumeItem(pd.items, itemId);
        pd.money += price;
      });
      getGlobalAudio()?.playSFX('heal');
      return t('bag.sell.confirmed', {
        itemName: getLocalizedName(def.name),
        count: n,
        price: price.toLocaleString('en-US'),
      });
    },

    toss(itemId, count) {
      const def = getItem(itemId);
      const n = Math.min(count, getPlayerData().items[itemId] ?? 0);
      if (!def || n <= 0) return;
      editPlayerData((pd) => {
        for (let i = 0; i < n; i++) consumeItem(pd.items, itemId);
      });
      return t('bag.tossed', { itemName: getLocalizedName(def.name), count: n });
    },

    answerTM(teachAnyway) {
      const q = tmQuestion;
      tmQuestion = null;
      if (!q || !teachAnyway) return;
      return teachTM(q.itemId, q.pokemon);
    },
  };

  const scene: Scene = {
    enter() {
      view = { ...DEFAULT_VIEW };
      flash = [];
      waitingTargetFor = null;
      tmQuestion = null;
      clearPendingItem();
      resetMoveLearningQueueState(learning);
      mount();
    },
    exit() {
      unmount();
    },
    update() {
      if (mounted) return;
      // On top again after the party / move-learning / evolution screen
      if (waitingTargetFor) {
        const id = waitingTargetFor;
        waitingTargetFor = null;
        handleTargetPicked(id);
        if (stateMachine.current() !== scene) return; // evolution started
      }
      if (runLearningQueue()) return;
      mount();
    },
    render() {},
    // Every control is a real button — no d-pad needed on touch screens
    virtualControls: { dpad: false, utility: false },
  };
  return scene;
}
