/**
 * PokemonWorldContext.ts
 *
 * Builds a PokemonWorldSnapshot from our local static JSON data
 * (pokemon.json, items.json, item-defs.ts, moves.json, etc.) so that
 * question templates have access to rich, real Pokemon-world content
 * without making any network requests at question-generation time.
 *
 * The snapshot is intentionally pre-filtered to entities that are
 * meaningful in math questions (items with prices, Pokemon with
 * clean stats, moves with non-zero power).
 *
 * Usage:
 *   import { buildSnapshot } from './PokemonWorldContext.js';
 *   const snapshot = buildSnapshot();            // use defaults
 *   const snapshot = buildSnapshot({ maxPokemonId: 151 }); // Gen 1 only
 */

import type {
  PokemonWorldSnapshot,
  StoreItem,
  QuestionPokemon,
  QuestionMove,
  BilingualText,
} from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ITEMS_RAW from '../../data/items.json';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import POKEMON_RAW from '../../data/pokemon.json';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import MOVES_RAW from '../../data/moves.json';
import { ITEM_GAME_DATA } from '../../data/item-defs.js';

// ─── Types for enriched JSON shapes (as they actually exist on disk) ──────────

/** items.json is an OBJECT keyed by string item-id. */
interface RawItemEntry {
  name?: { en?: string; he?: string } | string;
  slug?: string;
  description?: string;
  category?: string;
  /** Sprite URL baked in during fetch. */
  sprite?: string;
}
type RawItemsJson = Record<string, RawItemEntry>;

/** pokemon.json is an array of enriched Pokemon objects. */
interface RawPokemon {
  id: number;
  name: { en?: string; he?: string } | string;
  types?: string[];
  stats?: {
    hp?: number;
    attack?: number;
    defense?: number;
    specialAttack?: number;
    specialDefense?: number;
    speed?: number;
  };
  baseExperience?: number;
  height?: number;
  weight?: number;
  category?: string;
  description?: string;
}

/** moves.json is an array of enriched move objects. */
interface RawMove {
  id: number;
  name?: { en?: string; he?: string } | string;
  type?: string;
  power?: number | null;
  accuracy?: number | null;
  pp?: number;
  damageClass?: string;
  description?: string;
  mathDifficulty?: number;
}

// ─── Snapshot build options ───────────────────────────────────────────────────

export interface SnapshotOptions {
  /** Only include Pokemon with id <= this value. Default: 251 (Gen 1+2). */
  maxPokemonId?: number;
  /** Only include moves with power >= this value. Default: 20. */
  minMovePower?: number;
  /** Only include items with price > 0 and price <= this cap. Default: 5000. */
  maxItemPrice?: number;
}

const DEFAULTS: Required<SnapshotOptions> = {
  maxPokemonId: 251,
  minMovePower: 20,
  maxItemPrice: 5000,
};

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Build a PokemonWorldSnapshot suitable for question generation.
 * This is a pure, synchronous function — all data comes from static JSON modules.
 */
export function buildSnapshot(opts: SnapshotOptions = {}): PokemonWorldSnapshot {
  const options = { ...DEFAULTS, ...opts };
  return {
    items: buildItems(options),
    pokemon: buildPokemon(options),
    moves: buildMoves(options),
  };
}

// ─── Items ────────────────────────────────────────────────────────────────────

const ITEM_SPRITE_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

function buildItems(opts: Required<SnapshotOptions>): StoreItem[] {
  const items: StoreItem[] = [];
  const itemsObj = ITEMS_RAW as unknown as RawItemsJson;

  for (const [idStr, raw] of Object.entries(itemsObj)) {
    const id = Number(idStr);
    const gameDef = ITEM_GAME_DATA[id];
    if (!gameDef) continue;
    const price = (gameDef as { price: number }).price;
    if (!price || price <= 0 || price > opts.maxItemPrice) continue;

    const name = resolveItemName(raw, idStr);
    const spriteUrl = raw.sprite ?? `${ITEM_SPRITE_BASE}${raw.slug ?? idStr}.png`;

    items.push({
      id,
      name,
      price,
      spriteUrl,
      category: raw.category ?? (gameDef as { category: string }).category,
    });
  }

  return items;
}

function resolveItemName(raw: RawItemEntry, fallback: string): BilingualText {
  if (!raw.name) return { en: prettifySlug(fallback), he: prettifySlug(fallback) };
  if (typeof raw.name === 'string') return { en: raw.name, he: raw.name };
  const en = raw.name.en ?? prettifySlug(fallback);
  const he = raw.name.he ?? en;
  return { en, he };
}

// ─── Pokemon ──────────────────────────────────────────────────────────────────

const POKEMON_SPRITE_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

function buildPokemon(opts: Required<SnapshotOptions>): QuestionPokemon[] {
  const pokemon: QuestionPokemon[] = [];

  for (const raw of POKEMON_RAW as unknown as RawPokemon[]) {
    if (raw.id > opts.maxPokemonId) continue;

    const hp = raw.stats?.hp ?? 0;
    const attack = raw.stats?.attack ?? 0;
    const defense = raw.stats?.defense ?? 0;
    if (!hp || !attack || !defense) continue;

    const name = resolveBilingualName(raw.name, `pokemon-${raw.id}`);
    const spriteUrl = `${POKEMON_SPRITE_BASE}${raw.id}.png`;

    pokemon.push({
      id: raw.id,
      name,
      spriteUrl,
      catchRate: 45,
      hp,
      attack,
      defense,
      types: raw.types ?? ['normal'],
    });
  }

  return pokemon;
}

// ─── Moves ────────────────────────────────────────────────────────────────────

function buildMoves(opts: Required<SnapshotOptions>): QuestionMove[] {
  const moves: QuestionMove[] = [];

  for (const raw of MOVES_RAW as unknown as RawMove[]) {
    const power = raw.power ?? 0;
    if (power < opts.minMovePower) continue;
    if (raw.damageClass === 'status') continue;

    const name = resolveBilingualName(raw.name, `move-${raw.id}`);

    moves.push({
      id: raw.id,
      name,
      power,
      type: raw.type ?? 'normal',
    });
  }

  return moves;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function resolveBilingualName(
  raw: { en?: string; he?: string } | string | undefined,
  fallback: string,
): BilingualText {
  if (!raw) return { en: prettifySlug(fallback), he: prettifySlug(fallback) };
  if (typeof raw === 'string') return { en: raw, he: raw };
  const en = raw.en ?? prettifySlug(fallback);
  const he = raw.he ?? en;
  return { en, he };
}

/** "ancient-power" → "Ancient Power" */
function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
