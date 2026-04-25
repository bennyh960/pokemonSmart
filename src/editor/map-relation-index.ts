/**
 * MapRelationIndex — background-loaded index of map connections.
 *
 * Loads all known map JSONs once, then provides fast lookups for:
 *   - Maps in the same area group
 *   - Outgoing transitions (this map → other maps)
 *   - Incoming transitions (other maps → this map)
 *
 * Usage:
 *   mapRelationIndex.load();           // kick off background load
 *   mapRelationIndex.onReady(cb);      // called when done (or immediately if done)
 *   mapRelationIndex.getRelated(id, area);
 */

import { getKnownMapIds, loadMapFromProject } from './map-io.js';

export interface MapNode {
  id: string;
  name: string;
  area?: string;
  outgoing: string[];  // map IDs this map transitions TO
  incoming: string[];  // map IDs that transition TO this map
}

export type RelationKind = 'area' | 'outgoing' | 'incoming';

export interface RelatedMap {
  id: string;
  name: string;
  area?: string;
  relation: RelationKind;
}

class MapRelationIndex {
  private nodes = new Map<string, MapNode>();
  private _ready = false;
  private _loading = false;
  private _callbacks: Array<() => void> = [];

  /** Start loading all map data in the background. Safe to call multiple times. */
  async load(): Promise<void> {
    if (this._ready || this._loading) return;
    this._loading = true;

    const ids = getKnownMapIds();

    // First pass: load each map — record area and outgoing transitions
    await Promise.allSettled(ids.map(async (id) => {
      try {
        const map = await loadMapFromProject(id);
        const node = this._getOrCreate(id);
        node.name = (map as unknown as Record<string, unknown>).label && typeof (map as unknown as Record<string, unknown>).label === 'object'
          ? ((map as unknown as Record<string, { en: string }>).label?.en || id)
          : id;
        node.area = map.area;
        node.outgoing = (map.transitions ?? []).map(t => t.toMapId).filter(Boolean);
      } catch {
        // Map JSON doesn't exist yet — skip silently
      }
    }));

    // Second pass: build incoming edges
    for (const [fromId, node] of this.nodes) {
      for (const toId of node.outgoing) {
        const target = this._getOrCreate(toId);
        if (!target.incoming.includes(fromId)) {
          target.incoming.push(fromId);
        }
      }
    }

    this._ready = true;
    this._loading = false;
    const cbs = this._callbacks.splice(0);
    cbs.forEach(cb => cb());
  }

  private _getOrCreate(id: string): MapNode {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, name: id, outgoing: [], incoming: [] });
    }
    return this.nodes.get(id)!;
  }

  /** Register a callback to run when index is ready. Fires immediately if already loaded. */
  onReady(cb: () => void): void {
    if (this._ready) { cb(); return; }
    this._callbacks.push(cb);
  }

  get isReady(): boolean { return this._ready; }

  getNode(id: string): MapNode | undefined { return this.nodes.get(id); }

  getAll(): MapNode[] { return [...this.nodes.values()]; }

  /**
   * Get all maps related to mapId.
   * Includes: same-area siblings, outgoing transitions, incoming transitions.
   * Also merges liveOutgoing so newly-added (unsaved) transitions appear.
   */
  getRelated(mapId: string, area: string | undefined, liveOutgoing: string[] = []): RelatedMap[] {
    const result: RelatedMap[] = [];
    const seen = new Set<string>();
    seen.add(mapId); // exclude self

    const node = this.nodes.get(mapId);

    // Same area
    if (area) {
      for (const [id, n] of this.nodes) {
        if (!seen.has(id) && n.area === area) {
          result.push({ id, name: n.name, area: n.area, relation: 'area' });
          seen.add(id);
        }
      }
    }

    // Outgoing (from saved index OR live transitions)
    const outgoing = [...new Set([...(node?.outgoing ?? []), ...liveOutgoing])];
    for (const toId of outgoing) {
      if (!seen.has(toId)) {
        const t = this.nodes.get(toId);
        result.push({ id: toId, name: t?.name ?? toId, area: t?.area, relation: 'outgoing' });
        seen.add(toId);
      }
    }

    // Incoming
    for (const fromId of (node?.incoming ?? [])) {
      if (!seen.has(fromId)) {
        const f = this.nodes.get(fromId);
        result.push({ id: fromId, name: f?.name ?? fromId, area: f?.area, relation: 'incoming' });
        seen.add(fromId);
      }
    }

    return result;
  }
}

/** Singleton — import and call .load() once from main.ts. */
export const mapRelationIndex = new MapRelationIndex();
