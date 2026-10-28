/**
 * Gate lights — a red/green traffic light beside a gate, so players can see
 * whether they may pass before walking up to it.
 *
 * Placed by data, coloured at runtime:
 *   - gate-guard NPC:   `"light": { "x": 12, "y": 30 }` → that guard's gateId
 *   - door transition:  `"light": { "x": 40, "y": 37 }` → the auto-gate of the door's target map
 *
 * The light tile is solid and talkable. Talking to a green light opens the clock
 * challenge (GATE_CLOCK scene), which refills the pass on a correct answer.
 */

import type { TileMapData } from '../engine/tilemap.js';
import type { GateGuardData, NPCData } from './npc.js';
import { getGate } from '../data/story/gates.js';
import { getAutoGateIdForMap, getGatePassExpiry, unlockGateTimed } from './story-engine.js';
import { drawGateLightSprite } from '../ui/gate-light-sprite.js';

export interface GateLight {
  x: number;
  y: number;
  gateId: string;
  /** The guard this light belongs to — the light hides when the guard does. */
  guard?: NPCData;
}

export type GatePass =
  | { kind: 'locked' }
  | { kind: 'forever' }
  | { kind: 'timed'; remainingMs: number; fullMs: number };

/** All lights placed on a map (guards' and doors'). */
export function collectGateLights(map: TileMapData): GateLight[] {
  const lights: GateLight[] = [];
  for (const npc of map.npcs ?? []) {
    if (npc.type !== 'gate-guard') continue;
    const guard = npc as GateGuardData;
    if (guard.light && guard.gateId) lights.push({ ...guard.light, gateId: guard.gateId, guard: npc });
  }
  for (const tr of map.transitions ?? []) {
    if (!tr.light) continue;
    const gateId = getAutoGateIdForMap(tr.toMapId);
    if (gateId) lights.push({ ...tr.light, gateId });
  }
  return lights;
}

export function gateLightAt(lights: readonly GateLight[], x: number, y: number): GateLight | undefined {
  return lights.find((l) => l.x === x && l.y === y);
}

export function getGatePass(gateId: string, now = Date.now()): GatePass {
  const expiry = getGatePassExpiry(gateId);
  if (expiry === undefined) return { kind: 'locked' };
  if (expiry === 0) return { kind: 'forever' };
  if (expiry <= now) return { kind: 'locked' };
  return { kind: 'timed', remainingMs: expiry - now, fullMs: getGate(gateId)?.reopenCooldownMs ?? 0 };
}

/** Reset a timed pass to its full length (the clock challenge reward). */
export function refillGatePass(gateId: string): void {
  const fullMs = getGate(gateId)?.reopenCooldownMs;
  if (fullMs) unlockGateTimed(gateId, fullMs);
}

const BLINK_UNDER_MS = 60_000;

/** Draw a light post on the tile whose top-left screen corner is (sx, sy). */
export function drawGateLight(ctx: CanvasRenderingContext2D, sx: number, sy: number, pass: GatePass): void {
  // Last minute: the green lamp blinks so kids see the pass is about to end
  const blinkOff = pass.kind === 'timed' && pass.remainingMs < BLINK_UNDER_MS && Math.floor(Date.now() / 400) % 2 === 0;
  drawGateLightSprite(ctx, sx, sy, pass.kind === 'locked' ? 'red' : blinkOff ? 'none' : 'green');
}
