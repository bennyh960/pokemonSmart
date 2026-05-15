import type { EditorState } from './editor-state.js';
import type { TileDef } from './types.js';
import type { ToolSystem } from './tool-system.js';

/**
 * CanvasViewport — renders the map on a <canvas> and handles mouse interaction.
 * Pan with middle-click or Space+drag. Zoom with Ctrl+wheel.
 */
export class CanvasViewport {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: EditorState;
  private tilesetImage: HTMLImageElement;
  private tiles: Map<string, TileDef>;
  private toolSystem: ToolSystem;
  private dirty = true;
  private rafId = 0;

  // Mouse state
  private mouseDown = false;
  private panning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panScrollStartX = 0;
  private panScrollStartY = 0;
  private spaceHeld = false;

  // Dragging state
  private draggingObjIdx = -1;
  private draggingTransitionIdx = -1;
  private draggingSpawn = false;

  constructor(
    container: HTMLElement,
    state: EditorState,
    tilesetImage: HTMLImageElement,
    tiles: Map<string, TileDef>,
    toolSystem: ToolSystem,
  ) {
    this.state = state;
    this.tilesetImage = tilesetImage;
    this.tiles = tiles;
    this.toolSystem = toolSystem;

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'crosshair';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Subscribe to state changes
    for (const evt of ['map-loaded', 'map-modified', 'viewport-changed', 'cursor-moved', 'selection-changed', 'tool-changed', 'layer-changed'] as const) {
      state.on(evt, () => this.markDirty());
    }

    // Pan to tile when selection is made from the properties panel
    state.on('focus-tile', () => {
      const tilePixels = 16 * state.zoom;
      const cx = state.focusTileX * tilePixels + tilePixels / 2;
      const cy = state.focusTileY * tilePixels + tilePixels / 2;
      state.setScroll(
        cx - this.canvas.width / 2,
        cy - this.canvas.height / 2,
      );
    });

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => { this.mouseDown = false; this.panning = false; this.draggingObjIdx = -1; this.draggingTransitionIdx = -1; this.draggingSpawn = false; });
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Drag & drop from palette onto canvas
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const rect = this.canvas.getBoundingClientRect();
      const { gx, gy } = this.pixelToGrid(e.clientX - rect.left, e.clientY - rect.top);
      state.setCursor(gx, gy);
    });
    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const tileId = e.dataTransfer?.getData('text/tile-id');
      if (!tileId) return;
      const rect = this.canvas.getBoundingClientRect();
      const { gx, gy } = this.pixelToGrid(e.clientX - rect.left, e.clientY - rect.top);
      const def = this.tiles.get(tileId);
      if (def && (def.w > 16 || def.h > 16 || def.above)) {
        state.addPlacedObject(tileId, gx, gy);
      } else {
        state.setGroundTile(gx, gy, tileId);
      }
    });

    // Space key for panning
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat) { this.spaceHeld = true; this.canvas.style.cursor = 'grab'; } });
    document.addEventListener('keyup', (e) => { if (e.code === 'Space') { this.spaceHeld = false; this.canvas.style.cursor = 'crosshair'; } });

    // Start render loop
    this.renderLoop();
  }

  private resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.markDirty();
  }

  markDirty(): void { this.dirty = true; }

  updateTileset(image: HTMLImageElement, tiles: Map<string, TileDef>): void {
    this.tilesetImage = image;
    this.tiles = tiles;
    this.markDirty();
  }

  private pixelToGrid(px: number, py: number): { gx: number; gy: number } {
    const tilePixels = 16 * this.state.zoom;
    return {
      gx: Math.floor((px + this.state.scrollX) / tilePixels),
      gy: Math.floor((py + this.state.scrollY) / tilePixels),
    };
  }

  // ── Mouse handlers ──

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Middle click or space+left click = pan
    if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
      this.panning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panScrollStartX = this.state.scrollX;
      this.panScrollStartY = this.state.scrollY;
      this.canvas.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    if (e.button === 0) {
      this.mouseDown = true;
      const { gx, gy } = this.pixelToGrid(px, py);

      // Check if clicking on draggable entities (select tool)
      if (this.state.activeTool === 'select') {
        // Spawn marker
        const sp = this.state.mapData.spawn;
        if (sp.x === gx && sp.y === gy) {
          this.draggingSpawn = true;
          this.canvas.style.cursor = 'move';
          return;
        }

        // Transition markers
        const transitions = this.state.mapData.transitions;
        if (transitions) {
          const tIdx = transitions.findIndex(t => t.fromX === gx && t.fromY === gy);
          if (tIdx >= 0) {
            this.draggingTransitionIdx = tIdx;
            this.state.selectTransition(tIdx);
            this.canvas.style.cursor = 'move';
            return;
          }
        }

        // Placed objects
        if (this.state.mapData.objects) {
          const objIdx = this.findObjectAt(gx, gy);
          if (objIdx >= 0) {
            this.draggingObjIdx = objIdx;
            this.canvas.style.cursor = 'move';
            return;
          }
        }
      }

      this.toolSystem.handleMouseDown(gx, gy);
    }
  }

  /** Find a placed object whose bounds contain (gx, gy). Returns index or -1. */
  private findObjectAt(gx: number, gy: number): number {
    const objs = this.state.mapData.objects;
    if (!objs) return -1;
    // Search in reverse so topmost objects are found first
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      const def = this.tiles.get(o.key);
      if (!def) continue;
      const gw = Math.max(1, Math.round(def.w / 16));
      const gh = Math.max(1, Math.round(def.h / 16));
      if (gx >= o.x && gx < o.x + gw && gy >= o.y && gy < o.y + gh) return i;
    }
    return -1;
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (this.panning) {
      const dx = e.clientX - this.panStartX;
      const dy = e.clientY - this.panStartY;
      this.state.setScroll(this.panScrollStartX - dx, this.panScrollStartY - dy);
      return;
    }

    const { gx, gy } = this.pixelToGrid(px, py);
    this.state.setCursor(gx, gy);

    // Dragging spawn
    if (this.draggingSpawn) {
      const sp = this.state.mapData.spawn;
      if (sp.x !== gx || sp.y !== gy) {
        sp.x = gx;
        sp.y = gy;
        this.state.emit('map-modified');
      }
      return;
    }

    // Dragging a transition
    if (this.draggingTransitionIdx >= 0 && this.state.mapData.transitions) {
      const t = this.state.mapData.transitions[this.draggingTransitionIdx];
      if (t && (t.fromX !== gx || t.fromY !== gy)) {
        t.fromX = gx;
        t.fromY = gy;
        this.state.emit('map-modified');
      }
      return;
    }

    // Dragging an object
    if (this.draggingObjIdx >= 0 && this.state.mapData.objects) {
      const obj = this.state.mapData.objects[this.draggingObjIdx];
      if (obj && (obj.x !== gx || obj.y !== gy)) {
        obj.x = gx;
        obj.y = gy;
        this.state.emit('map-modified');
      }
      return;
    }

    this.toolSystem.handleMouseMove(gx, gy, this.mouseDown);
  }

  private onMouseUp(e: MouseEvent): void {
    // Finish entity drag
    if (this.draggingSpawn || this.draggingTransitionIdx >= 0 || this.draggingObjIdx >= 0) {
      this.draggingSpawn = false;
      this.draggingTransitionIdx = -1;
      this.draggingObjIdx = -1;
      this.canvas.style.cursor = 'crosshair';
      this.state.emit('map-modified');
      return;
    }

    if (this.panning) {
      this.panning = false;
      this.canvas.style.cursor = this.spaceHeld ? 'grab' : 'crosshair';
      return;
    }

    if (e.button === 0) {
      this.mouseDown = false;
      const rect = this.canvas.getBoundingClientRect();
      const { gx, gy } = this.pixelToGrid(e.clientX - rect.left, e.clientY - rect.top);
      this.toolSystem.handleMouseUp(gx, gy);
    }
  }

  private onWheel(e: WheelEvent): void {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.5 : 0.5;
      this.state.setZoom(this.state.zoom + delta);
    } else {
      this.state.setScroll(
        this.state.scrollX + e.deltaX,
        this.state.scrollY + e.deltaY,
      );
    }
  }

  // ── Render loop ──

  private renderLoop(): void {
    this.rafId = requestAnimationFrame(() => this.renderLoop());
    const needsBlink = this.state.blinkSelectedTransition && this.state.selectedTransitionIndex !== null;
    if (!this.dirty && !needsBlink) return;
    this.dirty = false;
    this.render();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const zoom = this.state.zoom;
    const tilePixels = 16 * zoom;
    const { scrollX, scrollY } = this.state;
    const mapW = this.state.mapData.width;
    const mapH = this.state.mapData.height;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Visible tile range
    const startCol = Math.max(0, Math.floor(scrollX / tilePixels));
    const startRow = Math.max(0, Math.floor(scrollY / tilePixels));
    const endCol = Math.min(mapW - 1, Math.floor((scrollX + w) / tilePixels));
    const endRow = Math.min(mapH - 1, Math.floor((scrollY + h) / tilePixels));

    // ── Ground layer ──
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.state.getGroundTile(col, row);
        const drawX = Math.floor(col * tilePixels - scrollX);
        const drawY = Math.floor(row * tilePixels - scrollY);

        if (typeof tile === 'string') {
          const def = this.tiles.get(tile);
          if (def) {
            ctx.drawImage(this.tilesetImage, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w * zoom, def.h * zoom);
          } else {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(drawX, drawY, tilePixels, tilePixels);
          }
        } else {
          ctx.fillStyle = '#333';
          ctx.fillRect(drawX, drawY, tilePixels, tilePixels);
        }
      }
    }

    // ── Placed objects (above layer) ──
    if (this.state.mapData.objects) {
      for (const obj of this.state.mapData.objects) {
        const def = this.tiles.get(obj.key);
        if (!def) continue;
        const drawX = Math.floor(obj.x * tilePixels - scrollX);
        const drawY = Math.floor(obj.y * tilePixels - scrollY);
        if (def.cells) {
          for (const cell of def.cells) {
            const cellSx = def.sx + cell.dx * 16;
            const cellSy = def.sy + cell.dy * 16;
            const cellDrawX = drawX + cell.dx * tilePixels;
            const cellDrawY = drawY + cell.dy * tilePixels;
            ctx.drawImage(this.tilesetImage, cellSx, cellSy, 16, 16, cellDrawX, cellDrawY, tilePixels, tilePixels);
          }
        } else {
          ctx.drawImage(this.tilesetImage, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w * zoom, def.h * zoom);
        }
      }
    }
    // ── Legacy object layer (deprecated) ──
    if (this.state.mapData.objectLayer) {
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const tile = this.state.getObjectTile(col, row);
          if (!tile) continue;
          const def = this.tiles.get(tile);
          if (!def) continue;
          const drawX = Math.floor(col * tilePixels - scrollX);
          const drawY = Math.floor(row * tilePixels - scrollY);
          ctx.drawImage(this.tilesetImage, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w * zoom, def.h * zoom);
        }
      }
    }

    // ── Walkability overlay ──
    if (this.state.showWalkability) {
      // Pre-build set of cells blocked by above-layers so multi-tile footprints are fully covered.
      const aboveBlocked = new Set<string>();

      // Object layer: expand each anchor tile to its full w×h footprint
      if (this.state.mapData.objectLayer) {
        for (let r = 0; r < mapH; r++) {
          for (let c = 0; c < mapW; c++) {
            const t = this.state.getObjectTile(c, r);
            if (!t) continue;
            const d = this.tiles.get(t);
            if (!d || d.walkable) continue;
            const gw = Math.max(1, Math.round(d.w / 16));
            const gh = Math.max(1, Math.round(d.h / 16));
            for (let dy = 0; dy < gh; dy++)
              for (let dx = 0; dx < gw; dx++)
                aboveBlocked.add(`${c + dx},${r + dy}`);
          }
        }
      }

      // Placed objects: expand using cells[] for irregular shapes, or gw×gh for rectangular
      for (const obj of this.state.mapData.objects ?? []) {
        const d = this.tiles.get(obj.key);
        if (!d || d.walkable) continue;
        if (d.cells) {
          for (const cell of d.cells)
            aboveBlocked.add(`${obj.x + cell.dx},${obj.y + cell.dy}`);
        } else {
          const gw = Math.max(1, Math.round(d.w / 16));
          const gh = Math.max(1, Math.round(d.h / 16));
          for (let dy = 0; dy < gh; dy++)
            for (let dx = 0; dx < gw; dx++)
              aboveBlocked.add(`${obj.x + dx},${obj.y + dy}`);
        }
      }

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const tile = this.state.getGroundTile(col, row);
          const def = typeof tile === 'string' ? this.tiles.get(tile) : null;
          const walkable = (def ? def.walkable : false) && !aboveBlocked.has(`${col},${row}`);

          const drawX = Math.floor(col * tilePixels - scrollX);
          const drawY = Math.floor(row * tilePixels - scrollY);
          if (walkable) {
            ctx.fillStyle = 'rgba(0, 220, 0, 0.35)';
            ctx.fillRect(drawX, drawY, tilePixels, tilePixels);
          } else {
            ctx.fillStyle = 'rgba(220, 0, 0, 0.45)';
            ctx.fillRect(drawX, drawY, tilePixels, tilePixels);
            // X mark so blocked tiles are obvious even at small zoom
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(drawX + 2, drawY + 2);
            ctx.lineTo(drawX + tilePixels - 2, drawY + tilePixels - 2);
            ctx.moveTo(drawX + tilePixels - 2, drawY + 2);
            ctx.lineTo(drawX + 2, drawY + tilePixels - 2);
            ctx.stroke();
          }
        }
      }
    }

    // ── Transition markers ──
    if (this.state.showTransitions && this.state.mapData.transitions) {
      const selTIdx = this.state.selectedTransitionIndex;
      const blinkActive = this.state.blinkSelectedTransition && selTIdx !== null;
      const blinkOn = Math.floor(performance.now() / 500) % 2 === 0;
      const fontSize = Math.max(7, tilePixels * 0.28);
      ctx.font = `bold ${fontSize}px Inter`;
      const currentMapId = this.state.mapData.id;

      this.state.mapData.transitions.forEach((t, i) => {
        const label = `T${i + 1}`;
        const isSelected = selTIdx === i;
        const hidden = blinkActive && isSelected && !blinkOn;

        // Source marker (blue)
        if (!hidden) {
          const drawX = Math.floor(t.fromX * tilePixels - scrollX);
          const drawY = Math.floor(t.fromY * tilePixels - scrollY);
          ctx.fillStyle = isSelected ? 'rgba(80, 160, 255, 0.65)' : 'rgba(50, 100, 255, 0.35)';
          ctx.fillRect(drawX, drawY, tilePixels, tilePixels);
          ctx.fillStyle = '#fff';
          ctx.fillText(label, drawX + 2, drawY + tilePixels * 0.55);
          if (isSelected) {
            ctx.strokeStyle = '#55aaff';
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX + 1, drawY + 1, tilePixels - 2, tilePixels - 2);
          }
        }

        // Same-map destination marker (orange) — only valid when toMapId matches this map
        if (!hidden && t.toX != null && t.toY != null && t.toMapId === currentMapId) {
          const dstLabel = `t${i + 1}`;
          const dstX = Math.floor(t.toX * tilePixels - scrollX);
          const dstY = Math.floor(t.toY * tilePixels - scrollY);
          ctx.fillStyle = isSelected ? 'rgba(255, 140, 30, 0.65)' : 'rgba(220, 100, 20, 0.35)';
          ctx.fillRect(dstX, dstY, tilePixels, tilePixels);
          ctx.fillStyle = '#fff';
          ctx.fillText(dstLabel, dstX + 2, dstY + tilePixels * 0.55);
          if (isSelected) {
            ctx.strokeStyle = '#ffaa44';
            ctx.lineWidth = 2;
            ctx.strokeRect(dstX + 1, dstY + 1, tilePixels - 2, tilePixels - 2);
          }
        }
      });
    }

    // ── NPC markers ──
    if (this.state.mapData.npcs) {
      const selNpcId = this.state.selectedNpcId;
      for (const npc of this.state.mapData.npcs) {
        const drawX = Math.floor(npc.x * tilePixels - scrollX);
        const drawY = Math.floor(npc.y * tilePixels - scrollY);
        ctx.fillStyle = selNpcId === npc.id ? 'rgba(255, 180, 0, 0.75)' : 'rgba(255, 150, 0, 0.5)';
        ctx.fillRect(drawX, drawY, tilePixels, tilePixels);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(8, tilePixels * 0.3)}px Inter`;
        ctx.fillText(npc.type[0].toUpperCase(), drawX + 2, drawY + tilePixels * 0.5);
        // Selection outline
        if (selNpcId === npc.id) {
          ctx.strokeStyle = '#ffcc00';
          ctx.lineWidth = 2;
          ctx.strokeRect(drawX + 1, drawY + 1, tilePixels - 2, tilePixels - 2);
        }
      }
    }

    // ── Spawn marker ──
    const sx = this.state.mapData.spawn;
    {
      const drawX = Math.floor(sx.x * tilePixels - scrollX);
      const drawY = Math.floor(sx.y * tilePixels - scrollY);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX + 1, drawY + 1, tilePixels - 2, tilePixels - 2);
      ctx.fillStyle = '#00ff00';
      ctx.font = `bold ${Math.max(8, tilePixels * 0.25)}px Inter`;
      ctx.fillText('SP', drawX + 2, drawY + tilePixels - 3);
    }

    // ── Grid overlay ──
    if (this.state.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let col = startCol; col <= endCol + 1; col++) {
        const x = Math.floor(col * tilePixels - scrollX) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let row = startRow; row <= endRow + 1; row++) {
        const y = Math.floor(row * tilePixels - scrollY) + 0.5;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    // ── Cursor highlight ──
    const { cursorGridX: cgx, cursorGridY: cgy } = this.state;
    if (cgx >= 0 && cgx < mapW && cgy >= 0 && cgy < mapH) {
      const drawX = Math.floor(cgx * tilePixels - scrollX);
      const drawY = Math.floor(cgy * tilePixels - scrollY);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, tilePixels, tilePixels);
    }

    // ── Selection highlight ──
    const { selectedCellX, selectedCellY } = this.state;
    if (selectedCellX !== null && selectedCellY !== null) {
      const drawX = Math.floor(selectedCellX * tilePixels - scrollX);
      const drawY = Math.floor(selectedCellY * tilePixels - scrollY);
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, tilePixels, tilePixels);
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
