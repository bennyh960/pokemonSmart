/**
 * Map Canvas — Central canvas for painting and viewing the tile map.
 * Supports paint, erase, fill, select, NPC/warp placement, and spawn setting.
 */

import { editorState } from '../state/editor-state.js';
import { getTileDef } from '../tile-catalog.js';
import type { TilesetImages } from '../editor-main.js';
import type { AtlasCatalog } from '../../engine/object-catalog.js';

const TILE_PX = 16;

export function createMapCanvas(tilesetImages: TilesetImages, catalog?: AtlasCatalog | null): {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  render: () => void;
} {
  const container = document.createElement('div');
  container.className = 'map-canvas-container';

  const canvas = document.createElement('canvas');
  canvas.className = 'map-canvas';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  let isPainting = false;
  let paintBatchStarted = false;

  // ─── Coordinate helpers ────────────────────────────────────
  function canvasToTile(clientX: number, clientY: number): { tx: number; ty: number } {
    const rect = canvas.getBoundingClientRect();
    const scale = editorState.zoom;
    const tx = Math.floor((clientX - rect.left) / (TILE_PX * scale));
    const ty = Math.floor((clientY - rect.top) / (TILE_PX * scale));
    return { tx, ty };
  }

  // ─── Rendering ─────────────────────────────────────────────
  function render() {
    const { map, zoom, showGrid } = editorState;
    const w = map.width * TILE_PX * zoom;
    const h = map.height * TILE_PX * zoom;

    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Draw tiles
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tileId = map.tiles[y][x];
        const def = getTileDef(tileId);
        if (def) {
          const tsImg = tilesetImages[def.tilesetId];
          if (tsImg) {
            ctx.drawImage(
              tsImg,
              def.col * TILE_PX, def.row * TILE_PX, TILE_PX, TILE_PX,
              x * TILE_PX * zoom, y * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom,
            );
          }
        } else {
          // Unknown tile — magenta
          ctx.fillStyle = '#ff00ff';
          ctx.fillRect(x * TILE_PX * zoom, y * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
        }
      }
    }

    // Draw objects from map data
    const atlasImg = tilesetImages['grid'];
    if (atlasImg && catalog && map.objects) {
      for (const obj of map.objects) {
        const def = catalog.objects.get(obj.id);
        if (!def) continue;
        const destW = def.gridW * TILE_PX * zoom;
        const destH = def.gridH * TILE_PX * zoom;
        ctx.drawImage(
          atlasImg,
          def.sx, def.sy, def.sw, def.sh,
          obj.x * TILE_PX * zoom, obj.y * TILE_PX * zoom, destW, destH,
        );
      }
    }

    // Grid overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= map.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_PX * zoom + 0.5, 0);
        ctx.lineTo(x * TILE_PX * zoom + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= map.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_PX * zoom + 0.5);
        ctx.lineTo(w, y * TILE_PX * zoom + 0.5);
        ctx.stroke();
      }
    }

    // Draw spawn point
    const sp = map.spawn;
    ctx.fillStyle = 'rgba(0, 255, 100, 0.5)';
    ctx.fillRect(sp.x * TILE_PX * zoom, sp.y * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.strokeRect(sp.x * TILE_PX * zoom, sp.y * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, 8 * zoom)}px monospace`;
    ctx.fillText('S', sp.x * TILE_PX * zoom + 4 * zoom, sp.y * TILE_PX * zoom + 12 * zoom);

    // Draw warps
    for (let i = 0; i < map.warps.length; i++) {
      const warp = map.warps[i];
      const selected = editorState.selectedEntityType === 'warp' && editorState.selectedEntityIndex === i;
      ctx.fillStyle = selected ? 'rgba(0, 120, 255, 0.6)' : 'rgba(0, 120, 255, 0.35)';
      ctx.fillRect(warp.fromX * TILE_PX * zoom, warp.fromY * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
      ctx.strokeStyle = selected ? '#fff' : '#0088ff';
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(warp.fromX * TILE_PX * zoom, warp.fromY * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(8, 6 * zoom)}px monospace`;
      ctx.fillText('W', warp.fromX * TILE_PX * zoom + 3 * zoom, warp.fromY * TILE_PX * zoom + 10 * zoom);
    }

    // Draw NPCs
    for (let i = 0; i < map.npcs.length; i++) {
      const npc = map.npcs[i];
      const selected = editorState.selectedEntityType === 'npc' && editorState.selectedEntityIndex === i;
      ctx.fillStyle = selected ? 'rgba(255, 100, 0, 0.6)' : 'rgba(255, 100, 0, 0.35)';
      ctx.fillRect(npc.x * TILE_PX * zoom, npc.y * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
      ctx.strokeStyle = selected ? '#fff' : '#ff6600';
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(npc.x * TILE_PX * zoom, npc.y * TILE_PX * zoom, TILE_PX * zoom, TILE_PX * zoom);
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(8, 6 * zoom)}px monospace`;
      ctx.fillText('N', npc.x * TILE_PX * zoom + 3 * zoom, npc.y * TILE_PX * zoom + 10 * zoom);
    }
  }

  // ─── Input handlers ────────────────────────────────────────
  function handleTileAction(tx: number, ty: number) {
    const { activeTool, selectedTileId } = editorState;

    if (activeTool === 'paint') {
      editorState.setTile(tx, ty, selectedTileId);
    } else if (activeTool === 'erase') {
      editorState.setTile(tx, ty, 0);
    } else if (activeTool === 'fill') {
      editorState.floodFill(tx, ty, selectedTileId);
    } else if (activeTool === 'spawn') {
      editorState.setSpawn(tx, ty);
      editorState.activeTool = 'select';
      editorState.notify();
    } else if (activeTool === 'npc') {
      editorState.addNPC({
        id: `npc-${Date.now()}`,
        name: 'New NPC',
        x: tx, y: ty,
        facing: 'down',
        type: 'dialogue',
        dialogue: ['Hello!'],
        spriteType: 'npc-male',
      });
      editorState.activeTool = 'select';
      editorState.notify();
    } else if (activeTool === 'warp') {
      editorState.addWarp({
        fromX: tx, fromY: ty,
        toMapId: '', toX: 0, toY: 0,
      });
      editorState.activeTool = 'select';
      editorState.notify();
    } else if (activeTool === 'select') {
      // Check if clicking on an NPC
      const npcIdx = editorState.map.npcs.findIndex((n) => n.x === tx && n.y === ty);
      if (npcIdx >= 0) {
        editorState.selectedEntityType = 'npc';
        editorState.selectedEntityIndex = npcIdx;
        editorState.notify();
        return;
      }
      // Check if clicking on a warp
      const warpIdx = editorState.map.warps.findIndex((w) => w.fromX === tx && w.fromY === ty);
      if (warpIdx >= 0) {
        editorState.selectedEntityType = 'warp';
        editorState.selectedEntityIndex = warpIdx;
        editorState.notify();
        return;
      }
      // Deselect
      editorState.selectedEntityType = null;
      editorState.selectedEntityIndex = -1;
      editorState.notify();
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const { tx, ty } = canvasToTile(e.clientX, e.clientY);
    isPainting = true;

    if (editorState.activeTool === 'paint' || editorState.activeTool === 'erase') {
      if (!paintBatchStarted) {
        editorState.pushUndo();
        paintBatchStarted = true;
      }
    }

    handleTileAction(tx, ty);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isPainting) return;
    const { activeTool } = editorState;
    if (activeTool !== 'paint' && activeTool !== 'erase') return;
    const { tx, ty } = canvasToTile(e.clientX, e.clientY);
    handleTileAction(tx, ty);
  });

  canvas.addEventListener('mouseup', () => {
    isPainting = false;
    paintBatchStarted = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isPainting = false;
    paintBatchStarted = false;
  });

  // Listen for state changes
  editorState.subscribe(render);

  return { container, canvas, render };
}
