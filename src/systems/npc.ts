/**
 * NPC System - NPC data, collision, and interaction management.
 *
 * NPCs are loaded from map JSON data. Each NPC has a position, facing,
 * type (dialogue/trainer/shopkeeper/healer), dialogue lines, and sprite type.
 */

/** NPC data as stored in map JSON. */
export interface NPCData {
  id: string;
  name?: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  type: 'dialogue' | 'trainer' | 'shopkeeper' | 'healer';
  dialogue: string[];
  spriteType: string;
}

/** Trainer NPC with party and battle data. */
export interface TrainerData extends NPCData {
  type: 'trainer';
  party: { pokemonId: number; level: number }[];
  defeated?: boolean;
  reward: number;
  lineOfSight: number;
}

/** Direction vectors for NPC facing. */
const FACING_VECTORS: Record<string, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

/** Create an NPC manager for a set of NPCs on a map. */
export function createNPCManager(npcs: NPCData[]) {
  return {
    /** Get all NPCs. */
    getNPCs(): NPCData[] {
      return npcs;
    },

    /** Check if there is an NPC at the given grid position. */
    isNPCAt(x: number, y: number): boolean {
      return npcs.some(npc => npc.x === x && npc.y === y);
    },

    /** Get the NPC at a given grid position. */
    getNPCAt(x: number, y: number): NPCData | undefined {
      return npcs.find(npc => npc.x === x && npc.y === y);
    },

    /** Get the NPC the player is facing (adjacent tile in facing direction). */
    getFacingNPC(playerX: number, playerY: number, facing: string): NPCData | undefined {
      const vec = FACING_VECTORS[facing];
      if (!vec) return undefined;
      const targetX = playerX + vec.dx;
      const targetY = playerY + vec.dy;
      return npcs.find(npc => npc.x === targetX && npc.y === targetY);
    },

    /** Get all trainer NPCs. */
    getTrainers(): TrainerData[] {
      return npcs.filter((npc): npc is TrainerData => npc.type === 'trainer');
    },
  };
}

/**
 * Check if any trainer NPC has line-of-sight to the player.
 * Returns the first trainer that can see the player, or null.
 */
export function checkTrainerLineOfSight(
  trainers: TrainerData[],
  playerX: number,
  playerY: number,
  defeatedFlags: Record<string, boolean>,
): TrainerData | null {
  for (const trainer of trainers) {
    // Skip already-defeated trainers
    if (defeatedFlags[`trainer-${trainer.id}-defeated`]) continue;

    const vec = FACING_VECTORS[trainer.facing];
    if (!vec) continue;

    const range = trainer.lineOfSight || 3;
    for (let d = 1; d <= range; d++) {
      const checkX = trainer.x + vec.dx * d;
      const checkY = trainer.y + vec.dy * d;
      if (checkX === playerX && checkY === playerY) {
        return trainer;
      }
    }
  }
  return null;
}

/** Return type for use in type annotations. */
export type NPCManager = ReturnType<typeof createNPCManager>;
