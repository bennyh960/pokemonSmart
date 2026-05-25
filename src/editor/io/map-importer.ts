/**
 * Map Importer — Loads a JSON map file into the editor state.
 */

import { editorState } from '../state/editor-state.js';

export function importMap(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.tiles || !Array.isArray(data.tiles)) {
      alert('Invalid map: missing tiles array');
      return false;
    }
    if (!data.width || !data.height) {
      alert('Invalid map: missing width/height');
      return false;
    }

    editorState.map = {
      id: data.id || 'imported-map',
      name: data.name || 'Imported Map',
      width: data.width,
      height: data.height,
      tiles: data.tiles,
      objects: data.objects || [],
      spawn: data.spawn || { x: 0, y: 0 },
      npcs: (data.npcs || []).map((npc: any) => ({
        id: npc.id || `npc-${Date.now()}`,
        name: npc.name,
        x: npc.x || 0,
        y: npc.y || 0,
        facing: npc.facing || 'down',
        type: npc.type || 'dialogue',
        dialogue: npc.dialogue || [],
        spriteType: npc.spriteType || 'npc-male',
        party: npc.party,
        reward: npc.reward,
        lineOfSight: npc.lineOfSight,
      })),
      warps: (data.transitions || []).map((t: any) => ({
        fromX: t.fromX,
        fromY: t.fromY,
        toMapId: t.toMapId || '',
        toX: t.toX || 0,
        toY: t.toY || 0,
      })),
      music: data.music || '',
      encounterTableId: data.encounterTableId || '',
      outside: data.outside !== undefined ? data.outside : undefined,
    };

    editorState.selectedEntityType = null;
    editorState.selectedEntityIndex = -1;
    editorState.notify();
    return true;
  } catch (e) {
    alert(`Failed to parse map JSON: ${e}`);
    return false;
  }
}
