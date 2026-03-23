import type { TileDef } from '../engine/tileset.js';
import type { TileMapData, MapTransition, PlacedObject } from '../engine/tilemap.js';
import type { NPCData } from '../systems/npc.js';

export type { TileDef, TileMapData, MapTransition, NPCData, PlacedObject };

/** Which layer the user is editing. */
export type LayerMode = 'ground' | 'object';

/** Available editor tools. */
export type ToolType = 'paint' | 'erase' | 'fill' | 'select' | 'npc' | 'transition';

/** A tile category for the palette. */
export interface TileCategory {
  name: string;
  tileIds: string[];
}

/** A command for the undo/redo stack. */
export interface EditorCommand {
  label: string;
  execute(): void;
  undo(): void;
}

/** Events emitted by EditorState. */
export type EditorEvent =
  | 'tool-changed'
  | 'layer-changed'
  | 'tile-selected'
  | 'map-loaded'
  | 'map-modified'
  | 'cursor-moved'
  | 'viewport-changed'
  | 'selection-changed'
  | 'npc-changed'
  | 'transition-changed'
  | 'history-changed';
