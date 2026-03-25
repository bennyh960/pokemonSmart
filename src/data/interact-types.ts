/**
 * Interact Types — Central definitions for interactive tile behaviors.
 *
 * Each type defines default values for label, dialogue, item, flag, etc.
 * Tiles in the tileset manifest reference a type by ID and can override
 * specific args. At runtime, defaults are merged with per-tile overrides.
 */

import type { BilingualText } from '../systems/npc.js';

/** Args that can be set per-type (defaults) or per-tile (overrides). */
export interface InteractArgs {
  label?: BilingualText;
  dialogue?: BilingualText[];
  itemId?: string | null;
  itemQty?: number | null;
  flag?: string | null;
}

/** A full interact type definition with defaults. */
export interface InteractTypeDef {
  id: string;
  label: BilingualText;
  dialogue: BilingualText[];
  itemId: string | null;
  itemQty: number | null;
  flag: string | null;
}

/** Reference stored on a tile: type ID + optional per-tile overrides. */
export interface InteractTypeRef {
  id: string;
  args?: InteractArgs;
}

/** All available interact type IDs. */
export const INTERACT_TYPE_IDS = ['pc', 'sign', 'item', 'cut', 'strength'] as const;
export type InteractTypeId = typeof INTERACT_TYPE_IDS[number];

/** Default definitions for each interact type. */
const INTERACT_TYPES: Record<InteractTypeId, InteractTypeDef> = {
  pc: {
    id: 'pc',
    label: { en: 'PC', he: 'מחשב' },
    dialogue: [{ en: 'Turn on the PC?', he: 'להפעיל את המחשב?' }],
    itemId: null,
    itemQty: null,
    flag: null,
  },
  sign: {
    id: 'sign',
    label: { en: 'Sign', he: 'שלט' },
    dialogue: [],
    itemId: null,
    itemQty: null,
    flag: null,
  },
  item: {
    id: 'item',
    label: { en: 'Item Ball', he: 'פריט' },
    dialogue: [],
    itemId: 'potion',
    itemQty: 1,
    flag: null,
  },
  cut: {
    id: 'cut',
    label: { en: 'Small Tree', he: 'עץ קטן' },
    dialogue: [{ en: 'This tree can be cut!', he: 'אפשר לגזום את העץ הזה!' }],
    itemId: null,
    itemQty: null,
    flag: null,
  },
  strength: {
    id: 'strength',
    label: { en: 'Boulder', he: 'סלע' },
    dialogue: [{ en: 'This boulder can be moved!', he: 'אפשר להזיז את הסלע הזה!' }],
    itemId: null,
    itemQty: null,
    flag: null,
  },
};

/** Get the default definition for an interact type. */
export function getInteractType(id: string): InteractTypeDef | undefined {
  return INTERACT_TYPES[id as InteractTypeId];
}

/** Resolve a tile's InteractTypeRef into final merged values. */
export function resolveInteract(ref: InteractTypeRef): InteractTypeDef | null {
  const defaults = INTERACT_TYPES[ref.id as InteractTypeId];
  if (!defaults) return null;

  if (!ref.args) return defaults;

  const args = ref.args;
  return {
    id: defaults.id,
    label: args.label ?? defaults.label,
    dialogue: (args.dialogue && args.dialogue.length > 0) ? args.dialogue : defaults.dialogue,
    itemId: args.itemId !== undefined ? args.itemId : defaults.itemId,
    itemQty: args.itemQty !== undefined ? args.itemQty : defaults.itemQty,
    flag: args.flag !== undefined ? args.flag : defaults.flag,
  };
}
