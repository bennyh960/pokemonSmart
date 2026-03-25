import type { TilesetEditorState } from './editor-state.js';
import type { TileEntry } from './types.js';
import { TILE_CATEGORIES } from './types.js';
import { applyCrop, saveTilesetImage } from './io.js';

/** Right sidebar: properties for current selection or selected tile. */
export class PropertiesPanel {
  private container: HTMLElement;
  private state: TilesetEditorState;
  private image: HTMLImageElement;

  constructor(container: HTMLElement, state: TilesetEditorState, image: HTMLImageElement) {
    this.container = container;
    this.state = state;
    this.image = image;

    state.on('selection-changed', () => this.refresh());
    state.on('multi-selection-changed', () => this.refresh());
    state.on('item-selected', () => this.refresh());
    state.on('items-changed', () => this.refresh());
    state.on('crop-mode-changed', () => this.refresh());
    state.on('crop-target-changed', () => this.syncCropInputs());
    this.refresh();
  }

  /** Sync input fields from state when dragging on canvas (without full re-render). */
  private syncCropInputs(): void {
    if (!this.state.cropMode || !this.state.cropLocked) return;
    const twEl = this.container.querySelector('#crop-tw') as HTMLInputElement | null;
    if (!twEl) return;
    twEl.value = String(this.state.cropTargetW);
    (this.container.querySelector('#crop-th') as HTMLInputElement).value = String(this.state.cropTargetH);
    (this.container.querySelector('#crop-sx') as HTMLInputElement).value = String(this.state.cropTargetX);
    (this.container.querySelector('#crop-sy') as HTMLInputElement).value = String(this.state.cropTargetY);
    // Update after-crop preview
    this.updateCropPreview?.();
  }

  private updateCropPreview?: () => void;

  private refresh(): void {
    this.container.innerHTML = '';
    this.updateCropPreview = undefined;

    // Crop mode: show crop controls
    if (this.state.cropMode) {
      if (this.state.cropLocked) {
        this.renderCropLockedForm();
      } else if (this.state.cropSelValid) {
        this.renderCropForm();
      } else {
        this.container.innerHTML = '<div class="prop-empty">Crop mode is active.<br><br>Select a region on the spritesheet to crop/resize it in-place. Selection is pixel-level (1px steps).</div>';
      }
      return;
    }

    // If a tile is selected in the list, show its editable properties
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.tiles.length) {
      this.renderEditForm(this.state.selectedIndex);
      return;
    }

    // Multi-selection: show batch add form
    if (this.state.multiSelectionValid) {
      this.renderMultiAddForm();
      return;
    }

    // If there's a selection on the spritesheet, show "Add Tile" form
    if (this.state.selectionValid) {
      this.renderAddForm();
      return;
    }

    this.container.innerHTML = '<div class="prop-empty">Select a region on the spritesheet to define a tile, or click an existing tile in the list to edit it.</div>';
  }

  /** Before locking — show selection info and Lock button. */
  private renderCropForm(): void {
    const sx = this.state.cropSelX;
    const sy = this.state.cropSelY;
    const sw = this.state.cropSelW;
    const sh = this.state.cropSelH;

    const section = document.createElement('div');
    section.className = 'props-section';

    section.innerHTML = `
      <h3>Crop / Resize Region</h3>
      <div class="prop-row"><label>Position:</label><span>(${sx}, ${sy})</span></div>
      <div class="prop-row"><label>Size:</label><span class="val-highlight">${sw}×${sh}px</span></div>
      <div style="color:#888; font-size:11px; margin-top:8px; line-height:1.5">
        Lock the selection to drag and resize it on the canvas. The source pixels will be scaled to the new size/position.
      </div>
    `;

    this.addCropPreviewWithGrid(section, sx, sy, sw, sh);

    const lockBtn = document.createElement('button');
    lockBtn.className = 'primary';
    lockBtn.textContent = 'Lock Selection';
    lockBtn.style.marginTop = '8px';
    lockBtn.addEventListener('click', () => {
      this.state.lockCrop();
    });
    section.appendChild(lockBtn);

    // Manual release button
    const releaseBtn = document.createElement('button');
    releaseBtn.className = 'primary';
    releaseBtn.textContent = 'Release Selection';
    releaseBtn.style.marginTop = '6px';
    releaseBtn.style.background = '#555';
    releaseBtn.style.borderColor = '#666';
    releaseBtn.addEventListener('click', () => {
      this.state.cropSelX = -1;
      this.state.cropSelW = 0;
      this.state.cropSelH = 0;
      this.state.emit('selection-changed');
    });
    section.appendChild(releaseBtn);

    this.container.appendChild(section);
  }

  /** After locking — show editable target fields, live preview, drag hint, apply/unlock buttons. */
  private renderCropLockedForm(): void {
    const s = this.state;
    const section = document.createElement('div');
    section.className = 'props-section';

    section.innerHTML = `
      <h3>Crop — Locked</h3>
      <div class="prop-row"><label>Source:</label><span>(${s.cropSrcX}, ${s.cropSrcY}) ${s.cropSrcW}×${s.cropSrcH}px</span></div>
      <hr style="border-color:#333; margin:8px 0" />
      <div class="prop-row"><label>Target sx:</label><input id="crop-sx" type="number" min="0" value="${s.cropTargetX}" style="width:70px" /> px</div>
      <div class="prop-row"><label>Target sy:</label><input id="crop-sy" type="number" min="0" value="${s.cropTargetY}" style="width:70px" /> px</div>
      <div class="prop-row"><label>Target width:</label><input id="crop-tw" type="number" min="1" value="${s.cropTargetW}" style="width:70px" /> px</div>
      <div class="prop-row"><label>Target height:</label><input id="crop-th" type="number" min="1" value="${s.cropTargetH}" style="width:70px" /> px</div>
      <div style="color:#ff8800; font-size:11px; margin-top:8px; line-height:1.5">
        Drag the orange overlay to move. Drag edges/corners to resize. Or edit the values above.
      </div>
    `;

    // Wire inputs → state
    const wireInput = (id: string, field: 'cropTargetX' | 'cropTargetY' | 'cropTargetW' | 'cropTargetH') => {
      const el = section.querySelector(id) as HTMLInputElement;
      el.addEventListener('input', () => {
        const val = parseInt(el.value);
        if (!isNaN(val) && val >= 0) {
          s[field] = val;
          s.emit('crop-target-changed');
        }
      });
    };
    wireInput('#crop-sx', 'cropTargetX');
    wireInput('#crop-sy', 'cropTargetY');
    wireInput('#crop-tw', 'cropTargetW');
    wireInput('#crop-th', 'cropTargetH');

    // Before preview (with grid)
    this.addCropPreviewWithGrid(section, s.cropSrcX, s.cropSrcY, s.cropSrcW, s.cropSrcH);

    // After crop preview
    const previewLabel = document.createElement('h3');
    previewLabel.textContent = 'After Crop';
    previewLabel.style.marginTop = '10px';
    section.appendChild(previewLabel);

    const previewCanvas = document.createElement('canvas');
    previewCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.border = '1px solid #444';
    previewCanvas.style.background = '#111';
    previewCanvas.style.borderRadius = '4px';
    section.appendChild(previewCanvas);

    const updatePreview = () => {
      const tw = s.cropTargetW;
      const th = s.cropTargetH;
      const scale = Math.min(4, Math.max(1, Math.floor(200 / Math.max(tw, th))));
      previewCanvas.width = tw * scale;
      previewCanvas.height = th * scale;
      const pctx = previewCanvas.getContext('2d')!;
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      for (let y = 0; y < previewCanvas.height; y += 8) {
        for (let x = 0; x < previewCanvas.width; x += 8) {
          pctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#222' : '#333';
          pctx.fillRect(x, y, 8, 8);
        }
      }
      pctx.drawImage(this.image, s.cropSrcX, s.cropSrcY, s.cropSrcW, s.cropSrcH, 0, 0, tw * scale, th * scale);
      // Draw 16px grid lines relative to where the target sits on the original grid
      this.drawGridOnCanvas(pctx, previewCanvas.width, previewCanvas.height, s.cropTargetX, s.cropTargetY, scale);
    };

    // Store ref so syncCropInputs can call it
    this.updateCropPreview = updatePreview;
    setTimeout(updatePreview, 0);

    // Unlock button
    const unlockBtn = document.createElement('button');
    unlockBtn.className = 'primary';
    unlockBtn.textContent = 'Unlock';
    unlockBtn.style.marginTop = '8px';
    unlockBtn.style.background = '#555';
    unlockBtn.style.borderColor = '#666';
    unlockBtn.addEventListener('click', () => {
      s.unlockCrop();
    });
    section.appendChild(unlockBtn);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.className = 'primary';
    applyBtn.textContent = 'Apply Crop & Save Image';
    applyBtn.style.marginTop = '6px';
    applyBtn.addEventListener('click', async () => {
      const tw = s.cropTargetW;
      const th = s.cropTargetH;
      const targetSx = s.cropTargetX;
      const targetSy = s.cropTargetY;
      if (tw < 1 || th < 1) { alert('Invalid target size'); return; }

      applyBtn.disabled = true;
      applyBtn.textContent = 'Applying...';

      try {
        const blob = await applyCrop(this.image, s.cropSrcX, s.cropSrcY, s.cropSrcW, s.cropSrcH, tw, th, targetSx, targetSy);
        await saveTilesetImage(blob);

        // Reload the image with the modified data
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          this.image.onload = () => {
            s.imageWidth = this.image.naturalWidth;
            s.imageHeight = this.image.naturalHeight;
            resolve();
          };
          this.image.onerror = () => reject(new Error('Failed to reload image'));
          this.image.src = url;
        });

        // Fully reset crop state
        s.unlockCrop();
        s.cropSelX = -1;
        s.cropSelW = 0;
        s.cropSelH = 0;
        s.emit('viewport-changed');
        s.emit('selection-changed');
        alert('Crop applied and image saved!');
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') {
          console.error('Crop failed:', err);
          alert('Crop failed: ' + (err as Error).message);
        }
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Crop & Save Image';
      }
    });
    section.appendChild(applyBtn);

    this.container.appendChild(section);
  }

  /** Batch add form for Ctrl+Click multi-selected non-adjacent cells. */
  private renderMultiAddForm(): void {
    const cells = [...this.state.multiSelectedCells].map(k => {
      const [c, r] = k.split(',').map(Number);
      return { col: c, row: r };
    });

    const section = document.createElement('div');
    section.className = 'props-section';

    section.innerHTML = `
      <h3>Batch Add — ${cells.length} Cells</h3>
      <div style="color:#0dc; font-size:11px; margin-bottom:8px; line-height:1.5">
        Ctrl+Click to add/remove cells.<br>
        All selected cells will share the same properties. Each cell becomes a separate 16×16 tile with auto-numbered keys.
      </div>
      <div class="prop-row"><label>Key prefix:</label><input id="multi-key" type="text" placeholder="e.g. building-wall" autofocus /></div>
      <div class="prop-row"><label>Category:</label><select id="multi-cat"><option value="">None</option>${TILE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="prop-row"><label>Walkable:</label><input id="multi-walk" type="checkbox" /></div>
      <div class="prop-row"><label>Encounter:</label><input id="multi-enc" type="checkbox" /></div>
      <div class="prop-row"><label>Above (2nd layer):</label><input id="multi-above" type="checkbox" /></div>
      <div class="prop-row"><label>Overlay (on top of player):</label><input id="multi-overlay" type="checkbox" /></div>
      <div class="prop-row"><label>Description:</label><input id="multi-desc" type="text" placeholder="optional note" /></div>
    `;

    // Preview grid showing which cells are selected
    const previewLabel = document.createElement('h3');
    previewLabel.textContent = 'Selected Cells';
    previewLabel.style.marginTop = '10px';
    section.appendChild(previewLabel);

    // Compute bounding box
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    for (const { col, row } of cells) {
      minCol = Math.min(minCol, col); maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row);
    }
    const gridCols = maxCol - minCol + 1;
    const gridRows = maxRow - minRow + 1;
    const cellSet = new Set(this.state.multiSelectedCells);

    const cellSize = Math.min(24, Math.floor(200 / Math.max(gridCols, gridRows)));
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = gridCols * cellSize;
    previewCanvas.height = gridRows * cellSize;
    previewCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.border = '1px solid #444';
    previewCanvas.style.background = '#111';
    previewCanvas.style.borderRadius = '4px';

    const pctx = previewCanvas.getContext('2d')!;
    pctx.imageSmoothingEnabled = false;
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const px = (c - minCol) * cellSize;
        const py = (r - minRow) * cellSize;
        if (cellSet.has(`${c},${r}`)) {
          // Draw the actual tile from the tileset image
          pctx.drawImage(this.image, c * 16, r * 16, 16, 16, px, py, cellSize, cellSize);
          pctx.strokeStyle = 'rgba(0, 220, 220, 0.6)';
          pctx.lineWidth = 1;
          pctx.strokeRect(px, py, cellSize, cellSize);
        } else {
          // Empty/skipped cell
          pctx.fillStyle = '#1a1a2a';
          pctx.fillRect(px, py, cellSize, cellSize);
          pctx.strokeStyle = 'rgba(255,255,255,0.05)';
          pctx.lineWidth = 1;
          pctx.strokeRect(px, py, cellSize, cellSize);
        }
      }
    }
    section.appendChild(previewCanvas);

    // Add Tiles button
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = `+ Add ${cells.length} Tiles`;
    addBtn.style.marginTop = '8px';
    addBtn.addEventListener('click', () => {
      const keyInput = section.querySelector('#multi-key') as HTMLInputElement;
      const prefix = keyInput.value.trim();
      if (!prefix) { keyInput.focus(); keyInput.style.borderColor = '#cc3333'; return; }

      const catVal = (section.querySelector('#multi-cat') as HTMLSelectElement).value;
      const walkable = (section.querySelector('#multi-walk') as HTMLInputElement).checked;
      const encounter = (section.querySelector('#multi-enc') as HTMLInputElement).checked;
      const above = (section.querySelector('#multi-above') as HTMLInputElement).checked;
      const overlay = (section.querySelector('#multi-overlay') as HTMLInputElement).checked || undefined;
      const description = (section.querySelector('#multi-desc') as HTMLInputElement).value.trim() || undefined;

      // Check for key collisions
      const existingKeys = new Set(this.state.tiles.map(t => t.key));
      for (let i = 0; i < cells.length; i++) {
        const key = cells.length === 1 ? prefix : `${prefix}-${i + 1}`;
        if (existingKeys.has(key)) { alert(`Key "${key}" already exists`); return; }
      }

      // Add all tiles
      for (let i = 0; i < cells.length; i++) {
        const { col, row } = cells[i];
        const key = cells.length === 1 ? prefix : `${prefix}-${i + 1}`;
        this.state.addTile({
          key,
          sx: col * 16,
          sy: row * 16,
          w: 16,
          h: 16,
          walkable,
          encounter,
          destroy: null,
          above,
          overlay,
          category: catVal || undefined,
          description,
        });
      }

      this.state.clearMultiSelection();
    });
    section.appendChild(addBtn);

    // Clear selection button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'primary';
    clearBtn.textContent = 'Clear Selection';
    clearBtn.style.marginTop = '6px';
    clearBtn.style.background = '#555';
    clearBtn.style.borderColor = '#666';
    clearBtn.addEventListener('click', () => {
      this.state.clearMultiSelection();
    });
    section.appendChild(clearBtn);

    // Enter key shortcut
    section.querySelector('#multi-key')!.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') addBtn.click();
    });

    this.container.appendChild(section);
  }

  private renderAddForm(): void {
    const sx = this.state.selPixelX;
    const sy = this.state.selPixelY;
    const w = this.state.selPixelW;
    const h = this.state.selPixelH;
    const section = document.createElement('div');
    section.className = 'props-section';

    section.innerHTML = `
      <h3>New Tile</h3>
      <div class="prop-row"><label>Region:</label><span>(${sx}, ${sy})</span></div>
      <div class="prop-row"><label>Size:</label><span class="val-highlight">${w}×${h}px</span></div>
      <div class="prop-row"><label>Key:</label><input id="add-key" type="text" placeholder="e.g. grass-1" autofocus /></div>
      <div class="prop-row"><label>Category:</label><select id="add-cat"><option value="">None</option>${TILE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="prop-row"><label>Walkable:</label><input id="add-walk" type="checkbox" checked /></div>
      <div class="prop-row"><label>Encounter:</label><input id="add-enc" type="checkbox" /></div>
      <div class="prop-row"><label>Above (2nd layer):</label><input id="add-above" type="checkbox" /></div>
      <div class="prop-row"><label>Overlay (on top of player):</label><input id="add-overlay" type="checkbox" /></div>
      <div class="prop-row"><label>Description:</label><input id="add-desc" type="text" placeholder="optional note" /></div>
    `;

    this.addPreview(section, sx, sy, w, h);

    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Tile';
    addBtn.addEventListener('click', () => {
      const keyInput = section.querySelector('#add-key') as HTMLInputElement;
      const key = keyInput.value.trim();
      if (!key) { keyInput.focus(); keyInput.style.borderColor = '#cc3333'; return; }
      if (this.state.tiles.some(t => t.key === key)) { alert(`Key "${key}" already exists`); return; }

      const catVal = (section.querySelector('#add-cat') as HTMLSelectElement).value;
      const entry: TileEntry = {
        key,
        sx, sy,
        w, h,
        walkable: (section.querySelector('#add-walk') as HTMLInputElement).checked,
        encounter: (section.querySelector('#add-enc') as HTMLInputElement).checked,
        destroy: null,
        above: (section.querySelector('#add-above') as HTMLInputElement).checked,
        overlay: (section.querySelector('#add-overlay') as HTMLInputElement).checked || undefined,
        category: catVal || undefined,
        description: (section.querySelector('#add-desc') as HTMLInputElement).value.trim() || undefined,
      };
      this.state.addTile(entry);
    });
    section.appendChild(addBtn);

    // Enter key shortcut on the name field
    section.querySelector('#add-key')!.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') addBtn.click();
    });

    this.container.appendChild(section);
  }

  private renderEditForm(index: number): void {
    const t = this.state.tiles[index];
    const section = document.createElement('div');
    section.className = 'props-section';

    section.innerHTML = `
      <h3>Edit: ${t.key}</h3>
      <div class="prop-row"><label>Position:</label><span>(${t.sx}, ${t.sy})</span></div>
      <div class="prop-row"><label>Size:</label><span class="val-highlight">${t.w}×${t.h}px</span></div>
      <div class="prop-row">
        <label>Key:</label>
        <input id="edit-key" type="text" value="${t.key}" />
      </div>
      <div class="prop-row">
        <label>Category:</label>
        <select id="edit-cat">
          <option value="">None</option>
          ${TILE_CATEGORIES.map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="prop-row">
        <label>Walkable:</label>
        <input id="edit-walk" type="checkbox" ${t.walkable ? 'checked' : ''} />
      </div>
      <div class="prop-row">
        <label>Encounter:</label>
        <input id="edit-enc" type="checkbox" ${t.encounter ? 'checked' : ''} />
      </div>
      <div class="prop-row">
        <label>Above (2nd layer):</label>
        <input id="edit-above" type="checkbox" ${t.above ? 'checked' : ''} />
      </div>
      <div class="prop-row">
        <label>Overlay (on top of player):</label>
        <input id="edit-overlay" type="checkbox" ${t.overlay ? 'checked' : ''} />
      </div>
      <div class="prop-row">
        <label>Destroy:</label>
        <select id="edit-destroy">
          <option value="" ${t.destroy === null ? 'selected' : ''}>None</option>
          <option value="cut" ${t.destroy === 'cut' ? 'selected' : ''}>Cut</option>
          <option value="strength" ${t.destroy === 'strength' ? 'selected' : ''}>Strength</option>
        </select>
      </div>
      <div class="prop-row">
        <label>Description:</label>
        <input id="edit-desc" type="text" value="${t.description ?? ''}" placeholder="optional note" />
      </div>
    `;

    // Wire up live editing
    const wire = (id: string, field: keyof TileEntry, type: 'check' | 'text' | 'select') => {
      const el = section.querySelector(id) as HTMLInputElement | HTMLSelectElement;
      const event = type === 'text' ? 'change' : 'change';
      el.addEventListener(event, () => {
        let value: unknown;
        if (type === 'check') value = (el as HTMLInputElement).checked;
        else if (type === 'select') value = (el as HTMLSelectElement).value || null;
        else value = el.value.trim();
        this.state.updateTile(index, { [field]: value });
      });
    };
    wire('#edit-key', 'key', 'text');
    wire('#edit-cat', 'category', 'select');
    wire('#edit-walk', 'walkable', 'check');
    wire('#edit-enc', 'encounter', 'check');
    wire('#edit-above', 'above', 'check');
    wire('#edit-overlay', 'overlay', 'check');
    wire('#edit-destroy', 'destroy', 'select');
    // Description: empty → undefined so it's omitted from JSON export
    const descEl = section.querySelector('#edit-desc') as HTMLInputElement;
    descEl.addEventListener('change', () => {
      this.state.updateTile(index, { description: descEl.value.trim() || undefined });
    });

    this.addPreview(section, t.sx, t.sy, t.w, t.h);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete Tile';
    delBtn.style.marginTop = '8px';
    delBtn.addEventListener('click', () => {
      if (confirm(`Delete "${t.key}"?`)) this.state.removeTile(index);
    });
    section.appendChild(delBtn);

    this.container.appendChild(section);
  }

  private addPreview(container: HTMLElement, sx: number, sy: number, w: number, h: number): void {
    const label = document.createElement('h3');
    label.textContent = 'Preview';
    label.style.marginTop = '10px';
    container.appendChild(label);

    const scale = Math.min(4, Math.floor(200 / Math.max(w, h)));
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = w * scale;
    previewCanvas.height = h * scale;
    previewCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.border = '1px solid #444';
    previewCanvas.style.background = '#111';
    previewCanvas.style.borderRadius = '4px';

    const draw = () => {
      const pctx = previewCanvas.getContext('2d')!;
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      // Checkerboard transparency background
      for (let y = 0; y < previewCanvas.height; y += 8) {
        for (let x = 0; x < previewCanvas.width; x += 8) {
          pctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#222' : '#333';
          pctx.fillRect(x, y, 8, 8);
        }
      }
      pctx.drawImage(this.image, sx, sy, w, h, 0, 0, w * scale, h * scale);
    };
    if (this.image.complete) draw();
    else this.image.addEventListener('load', draw);

    container.appendChild(previewCanvas);
  }

  /** Draw 16px grid lines on a preview canvas, offset to match the original tileset grid. */
  private drawGridOnCanvas(ctx: CanvasRenderingContext2D, cw: number, ch: number, originX: number, originY: number, scale: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    const gridPx = 16 * scale;

    // Offset so grid lines align with the original 16px grid
    const offsetX = (originX % 16) * scale;
    const offsetY = (originY % 16) * scale;

    // Vertical lines
    for (let x = gridPx - offsetX; x < cw; x += gridPx) {
      if (x <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, ch);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = gridPx - offsetY; y < ch; y += gridPx) {
      if (y <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(cw, y + 0.5);
      ctx.stroke();
    }
  }

  /** Preview with 16px grid overlay — used in crop mode to show alignment. */
  private addCropPreviewWithGrid(container: HTMLElement, sx: number, sy: number, w: number, h: number): void {
    const label = document.createElement('h3');
    label.textContent = 'Preview';
    label.style.marginTop = '10px';
    container.appendChild(label);

    const scale = Math.min(4, Math.max(1, Math.floor(200 / Math.max(w, h))));
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = w * scale;
    previewCanvas.height = h * scale;
    previewCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.border = '1px solid #444';
    previewCanvas.style.background = '#111';
    previewCanvas.style.borderRadius = '4px';

    const draw = () => {
      const pctx = previewCanvas.getContext('2d')!;
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      // Checkerboard
      for (let y2 = 0; y2 < previewCanvas.height; y2 += 8) {
        for (let x2 = 0; x2 < previewCanvas.width; x2 += 8) {
          pctx.fillStyle = ((x2 / 8 + y2 / 8) % 2 === 0) ? '#222' : '#333';
          pctx.fillRect(x2, y2, 8, 8);
        }
      }
      pctx.drawImage(this.image, sx, sy, w, h, 0, 0, w * scale, h * scale);
      // Grid overlay aligned to original tileset grid
      this.drawGridOnCanvas(pctx, previewCanvas.width, previewCanvas.height, sx, sy, scale);
    };
    if (this.image.complete) draw();
    else this.image.addEventListener('load', draw);

    container.appendChild(previewCanvas);
  }
}
