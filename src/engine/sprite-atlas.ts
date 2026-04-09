/**
 * SpriteAtlas — Paths to the gridded tileset and sprite assets.
 *
 * The tileset is a clean 16×16 grid (tileset-grid.png).
 * Tile at (col, row) = pixel (col*16, row*16). Always.
 * No more irregular atlas pixel hunting.
 */

export const TILESET_PATH = '/sprites/overworld/tileset-grid.png';
export const TILESET_MANIFEST_PATH = '/sprites/overworld/tileset-grid.json';

// ─── Player Walk Frame Files ────────────────────────────────────
export const PLAYER_FRAME_MAP: { row: number; col: number; file: string }[] = [
  { row: 0, col: 0, file: '/sprites/overworld/player-down-0.png' },
  { row: 0, col: 1, file: '/sprites/overworld/player-down-1.png' },
  { row: 0, col: 2, file: '/sprites/overworld/player-down-2.png' },
  { row: 1, col: 0, file: '/sprites/overworld/player-up-0.png' },
  { row: 1, col: 1, file: '/sprites/overworld/player-up-1.png' },
  { row: 1, col: 2, file: '/sprites/overworld/player-up-2.png' },
  { row: 2, col: 0, file: '/sprites/overworld/player-left-0.png' },
  { row: 2, col: 1, file: '/sprites/overworld/player-left-1.png' },
  { row: 2, col: 2, file: '/sprites/overworld/player-left-2.png' },
  { row: 3, col: 0, file: '/sprites/overworld/player-right-0.png' },
  { row: 3, col: 1, file: '/sprites/overworld/player-right-1.png' },
  { row: 3, col: 2, file: '/sprites/overworld/player-right-2.png' },
];

export const PLAYER_FRAME_WIDTH = 16;
export const PLAYER_FRAME_HEIGHT = 16;
export const PLAYER_FRAMES_PER_DIR = 3;
export const PLAYER_DIRECTIONS = 4;

// ─── NPC Sprite Paths ───────────────────────────────────────────
export const NPC_SPRITE_PATHS: Record<string, string> = {
  'npc-male': '/sprites/overworld/npc-male.png',
  'npc-female': '/sprites/overworld/npc-female.png',
  'nurse': '/sprites/overworld/npc-nurse.png',
  'shopkeeper': '/sprites/overworld/npc-shopkeeper.png',
  'trainer-m': '/sprites/overworld/npc-trainer-m.png',
  'trainer-f': '/sprites/overworld/npc-trainer-f.png',
};
