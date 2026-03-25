import type { TilesetEditorState } from './editor-state.js';
import type { TileEntry } from './types.js';
import { TILE_CATEGORIES } from './types.js';
import { applyCrop, saveTilesetImage } from './io.js';
import { INTERACT_TYPE_IDS, getInteractType } from '../data/interact-types.js';
import { getAllItems } from '../data/items.js';

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

  /** Add form for Ctrl+Click multi-selected non-adjacent cells → single grouped tile. */
  private renderMultiAddForm(): void {
    const cells = [...this.state.multiSelectedCells].map(k => {
      const [c, r] = k.split(',').map(Number);
      return { col: c, row: r };
    });

    // Compute bounding box
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    for (const { col, row } of cells) {
      minCol = Math.min(minCol, col); maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row);
    }
    const gridCols = maxCol - minCol + 1;
    const gridRows = maxRow - minRow + 1;
    const sx = minCol * 16;
    const sy = minRow * 16;
    const w = gridCols * 16;
    const h = gridRows * 16;
    // cells as grid offsets relative to bounding box origin
    const cellOffsets = cells.map(({ col, row }) => ({ dx: col - minCol, dy: row - minRow }));

    const section = document.createElement('div');
    section.className = 'props-section';

    section.innerHTML = `
      <h3>Grouped Tile — ${cells.length} Cells</h3>
      <div style="color:#0dc; font-size:11px; margin-bottom:8px; line-height:1.5">
        Ctrl+Click to add/remove cells.<br>
        Creates <b>one tile</b> from non-adjacent cells. Gaps in the bounding box are excluded from rendering and collision.
      </div>
      <div class="prop-row"><label>Region:</label><span>(${sx}, ${sy}) ${w}×${h}px</span></div>
      <div class="prop-row"><label>Cells:</label><span class="val-highlight">${cells.length} of ${gridCols * gridRows}</span></div>
      <div class="prop-row"><label>Key:</label><input id="multi-key" type="text" placeholder="e.g. building-walls" autofocus /></div>
      <div class="prop-row"><label>Category:</label><select id="multi-cat"><option value="">None</option>${TILE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
      <div class="prop-row"><label>Walkable:</label><input id="multi-walk" type="checkbox" /></div>
      <div class="prop-row"><label>Encounter:</label><input id="multi-enc" type="checkbox" /></div>
      <div class="prop-row"><label>Above (2nd layer):</label><input id="multi-above" type="checkbox" /></div>
      <div class="prop-row"><label>Overlay (on top of player):</label><input id="multi-overlay" type="checkbox" /></div>
      <div class="prop-row"><label>Description:</label><input id="multi-desc" type="text" placeholder="optional note" /></div>
    `;

    // Preview grid showing which cells are selected vs skipped
    const previewLabel = document.createElement('h3');
    previewLabel.textContent = 'Preview';
    previewLabel.style.marginTop = '10px';
    section.appendChild(previewLabel);

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
          pctx.drawImage(this.image, c * 16, r * 16, 16, 16, px, py, cellSize, cellSize);
          pctx.strokeStyle = 'rgba(0, 220, 220, 0.6)';
          pctx.lineWidth = 1;
          pctx.strokeRect(px, py, cellSize, cellSize);
        } else {
          // Skipped cell — show as dark with X pattern
          pctx.fillStyle = '#1a1a2a';
          pctx.fillRect(px, py, cellSize, cellSize);
          pctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
          pctx.lineWidth = 1;
          pctx.beginPath();
          pctx.moveTo(px, py); pctx.lineTo(px + cellSize, py + cellSize);
          pctx.moveTo(px + cellSize, py); pctx.lineTo(px, py + cellSize);
          pctx.stroke();
        }
      }
    }
    section.appendChild(previewCanvas);

    // Add Tile button
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Grouped Tile';
    addBtn.style.marginTop = '8px';
    addBtn.addEventListener('click', () => {
      const keyInput = section.querySelector('#multi-key') as HTMLInputElement;
      const key = keyInput.value.trim();
      if (!key) { keyInput.focus(); keyInput.style.borderColor = '#cc3333'; return; }
      if (this.state.tiles.some(t => t.key === key)) { alert(`Key "${key}" already exists`); return; }

      const catVal = (section.querySelector('#multi-cat') as HTMLSelectElement).value;
      this.state.addTile({
        key,
        sx, sy, w, h,
        walkable: (section.querySelector('#multi-walk') as HTMLInputElement).checked,
        encounter: (section.querySelector('#multi-enc') as HTMLInputElement).checked,
        above: (section.querySelector('#multi-above') as HTMLInputElement).checked,
        overlay: (section.querySelector('#multi-overlay') as HTMLInputElement).checked || undefined,
        category: catVal || undefined,
        description: (section.querySelector('#multi-desc') as HTMLInputElement).value.trim() || undefined,
        cells: cellOffsets,
      });

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

    const gridCols = Math.max(1, Math.round(t.w / 16));
    const gridRows = Math.max(1, Math.round(t.h / 16));
    section.innerHTML = `
      <h3>Edit: ${t.key}</h3>
      <div class="prop-row"><label>Position:</label><span>(${t.sx}, ${t.sy})</span></div>
      <div class="prop-row"><label>Size:</label><span class="val-highlight">${t.w}×${t.h}px</span></div>
      ${t.cells ? `<div class="prop-row"><label>Grouped:</label><span class="val-highlight">${t.cells.length} of ${gridCols * gridRows} cells</span></div>` : ''}
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
      ${t.category === 'interactive' ? `
      <div class="prop-row">
        <label>Interact Type:</label>
        <select id="edit-interactType-id">
          <option value="">None</option>
        </select>
      </div>
      <div id="interact-args-container"></div>
      ` : ''}
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
    // InteractType: dynamic dropdown from INTERACT_TYPE_IDS + args editor
    // Only rendered when category === 'interactive'
    const interactSel = section.querySelector('#edit-interactType-id') as HTMLSelectElement | null;
    const argsContainer = section.querySelector('#interact-args-container') as HTMLElement | null;

    if (interactSel && argsContainer) {
    // Populate dropdown from INTERACT_TYPE_IDS (not hardcoded)
    for (const typeId of INTERACT_TYPE_IDS) {
      const opt = document.createElement('option');
      opt.value = typeId;
      const def = getInteractType(typeId);
      opt.textContent = `${typeId} — ${def?.label.en ?? typeId}`;
      if (t.interactType?.id === typeId) opt.selected = true;
      interactSel.appendChild(opt);
    }
    if (!t.interactType) (interactSel.querySelector('option[value=""]') as HTMLOptionElement).selected = true;

    const renderArgsEditor = () => {
      argsContainer.innerHTML = '';
      const ref = this.state.tiles[index]?.interactType;
      if (!ref) return;

      const defaults = getInteractType(ref.id);
      if (!defaults) return;
      const args = ref.args ?? {};
      const typeId = ref.id;

      // Helper: info tooltip
      const info = (text: string): HTMLElement => {
        const span = document.createElement('span');
        span.textContent = '\u2139';
        span.title = text;
        span.style.cssText = 'cursor:help; color:#6688cc; font-size:13px; margin-left:4px; user-select:none;';
        return span;
      };

      // Helper: add row with label + input + optional info
      const addRow = (label: string, el: HTMLElement, infoText?: string) => {
        const row = document.createElement('div');
        row.className = 'prop-row';
        const lbl = document.createElement('label');
        lbl.textContent = label + ':';
        row.appendChild(lbl);
        row.appendChild(el);
        if (infoText) row.appendChild(info(infoText));
        argsContainer.appendChild(row);
      };

      const header = document.createElement('div');
      header.style.cssText = 'font-size:10px; color:#88aacc; margin:4px 0 2px; font-weight:600;';
      header.textContent = 'Overrides (empty = use default from interact-types.ts)';
      argsContainer.appendChild(header);

      // ── Label (all types) ──
      const labelEnInput = document.createElement('input');
      labelEnInput.type = 'text';
      labelEnInput.value = (args as any).label?.en ?? '';
      labelEnInput.placeholder = defaults.label.en;
      labelEnInput.addEventListener('change', () => syncLabel());
      addRow('Label EN', labelEnInput, 'Display name shown in-game. Leave empty to use default: "' + defaults.label.en + '"');

      const labelHeInput = document.createElement('input');
      labelHeInput.type = 'text';
      labelHeInput.style.direction = 'rtl';
      labelHeInput.value = (args as any).label?.he ?? '';
      labelHeInput.placeholder = defaults.label.he;
      labelHeInput.addEventListener('change', () => syncLabel());
      addRow('Label HE', labelHeInput);

      function syncLabel(): void {
        const en = labelEnInput.value.trim();
        const he = labelHeInput.value.trim();
        updateArg('label', () => (en || he) ? { en, he } : undefined);
      }

      // ── Dialogue (sign, cut, strength — types that show text) ──
      if (typeId === 'sign' || typeId === 'cut' || typeId === 'strength') {
        const diaEnTa = document.createElement('textarea');
        diaEnTa.rows = 2;
        diaEnTa.value = ((args as any).dialogue ?? []).map((d: any) => d?.en ?? '').join('\n');
        diaEnTa.placeholder = defaults.dialogue.map(d => d.en).join('\n') || '(none)';
        diaEnTa.addEventListener('change', () => syncDialogue());
        addRow('Dialogue EN', diaEnTa, 'Bilingual text shown when player interacts. Each line = one text box page. Leave empty to use default.');

        const diaHeTa = document.createElement('textarea');
        diaHeTa.rows = 2;
        diaHeTa.style.direction = 'rtl';
        diaHeTa.value = ((args as any).dialogue ?? []).map((d: any) => d?.he ?? '').join('\n');
        diaHeTa.placeholder = defaults.dialogue.map(d => d.he).join('\n') || '(none)';
        diaHeTa.addEventListener('change', () => syncDialogue());
        addRow('Dialogue HE', diaHeTa);

        function syncDialogue(): void {
          const enLines = diaEnTa.value.split('\n');
          const heLines = diaHeTa.value.split('\n');
          const maxLen = Math.max(enLines.length, heLines.length);
          const lines: { en: string; he: string }[] = [];
          for (let i = 0; i < maxLen; i++) {
            const en = (enLines[i] || '').trim();
            const he = (heLines[i] || '').trim();
            if (en || he) lines.push({ en, he });
          }
          updateArg('dialogue', () => lines.length > 0 ? lines : undefined);
        }
      }

      // ── Item fields (item type only) ──
      if (typeId === 'item') {
        const itemSel = document.createElement('select');
        const currentItemId = (args as any).itemId ?? defaults.itemId ?? '';
        // Empty option = use default
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = `(default: ${defaults.itemId ?? 'none'})`;
        if (!currentItemId || currentItemId === defaults.itemId) emptyOpt.selected = true;
        itemSel.appendChild(emptyOpt);
        // All items from items.ts
        for (const item of getAllItems()) {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = `${item.id}`;
          if (item.id === currentItemId && currentItemId !== defaults.itemId) opt.selected = true;
          itemSel.appendChild(opt);
        }
        itemSel.addEventListener('change', () => updateArg('itemId', () => itemSel.value || undefined));
        addRow('Item', itemSel, 'The item to give when collected. Select from all defined items in src/data/items.ts.');

        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.min = '1';
        qtyInput.value = (args as any).itemQty != null ? String((args as any).itemQty) : '';
        qtyInput.placeholder = String(defaults.itemQty ?? 1);
        qtyInput.addEventListener('change', () => updateArg('itemQty', () => {
          const v = parseInt(qtyInput.value, 10);
          return isNaN(v) || v <= 0 ? undefined : v;
        }));
        addRow('Item Qty', qtyInput, 'How many of this item to give. Default: 1.');

        const flagInput = document.createElement('input');
        flagInput.type = 'text';
        flagInput.value = (args as any).flag ?? '';
        flagInput.placeholder = '(auto-generated)';
        flagInput.addEventListener('change', () => updateArg('flag', () => flagInput.value.trim() || undefined));
        addRow('Flag', flagInput, 'Prevents collecting the same item twice. Auto-generated from tile key + position if empty. Override to share a flag between multiple items.');
      }

      // ── PC type info ──
      if (typeId === 'pc') {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px; color:#667766; margin:4px 0; padding:4px; background:#0a2a1a; border-radius:3px;';
        hint.textContent = 'PC tiles open the Pokemon storage screen on interaction. No extra args needed.';
        argsContainer.appendChild(hint);
      }

      // ── Cut/Strength info ──
      if (typeId === 'cut' || typeId === 'strength') {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px; color:#667766; margin:4px 0; padding:4px; background:#0a2a1a; border-radius:3px;';
        hint.textContent = typeId === 'cut'
          ? 'Cut trees are removed when a party Pokemon knows Cut and the player has the required badge.'
          : 'Strength boulders can be pushed/removed when a party Pokemon knows Strength and the player has the required badge.';
        argsContainer.appendChild(hint);
      }

      /** Update a single arg key. getValue() returns undefined to remove the override. */
      function updateArg(key: string, getValue: () => unknown): void {
        const currentRef = this_state.tiles[index]?.interactType;
        if (!currentRef) return;
        const newArgs = { ...(currentRef.args ?? {}) } as Record<string, unknown>;
        const val = getValue();
        if (val === undefined) {
          delete newArgs[key];
        } else {
          newArgs[key] = val;
        }
        const cleanArgs = Object.keys(newArgs).length > 0 ? newArgs : undefined;
        this_state.updateTile(index, { interactType: { id: currentRef.id, args: cleanArgs } });
      }
    };

    // Capture state ref for use in closures
    const this_state = this.state;

    interactSel.addEventListener('change', () => {
      const val = interactSel.value;
      if (val) {
        this.state.updateTile(index, { interactType: { id: val } });
      } else {
        this.state.updateTile(index, { interactType: null });
      }
      renderArgsEditor();
    });

    renderArgsEditor();
    } // end if (interactSel && argsContainer)
    // Description: empty → undefined so it's omitted from JSON export
    const descEl = section.querySelector('#edit-desc') as HTMLInputElement;
    descEl.addEventListener('change', () => {
      this.state.updateTile(index, { description: descEl.value.trim() || undefined });
    });

    if (t.cells) {
      this.addGroupedPreview(section, t);
    } else {
      this.addPreview(section, t.sx, t.sy, t.w, t.h);
    }

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

  /** Preview for grouped tiles — only draws included cells, gaps shown as dark with X. */
  private addGroupedPreview(container: HTMLElement, t: TileEntry): void {
    const label = document.createElement('h3');
    label.textContent = 'Preview';
    label.style.marginTop = '10px';
    container.appendChild(label);

    const gridCols = Math.max(1, Math.round(t.w / 16));
    const gridRows = Math.max(1, Math.round(t.h / 16));
    const cellSize = Math.min(24, Math.floor(200 / Math.max(gridCols, gridRows)));
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = gridCols * cellSize;
    previewCanvas.height = gridRows * cellSize;
    previewCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.border = '1px solid #444';
    previewCanvas.style.background = '#111';
    previewCanvas.style.borderRadius = '4px';

    const cellSet = new Set(t.cells!.map(c => `${c.dx},${c.dy}`));

    const draw = () => {
      const pctx = previewCanvas.getContext('2d')!;
      pctx.imageSmoothingEnabled = false;
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const px = c * cellSize;
          const py = r * cellSize;
          if (cellSet.has(`${c},${r}`)) {
            pctx.drawImage(this.image, t.sx + c * 16, t.sy + r * 16, 16, 16, px, py, cellSize, cellSize);
            pctx.strokeStyle = 'rgba(0, 220, 220, 0.4)';
            pctx.lineWidth = 1;
            pctx.strokeRect(px, py, cellSize, cellSize);
          } else {
            pctx.fillStyle = '#1a1a2a';
            pctx.fillRect(px, py, cellSize, cellSize);
            pctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
            pctx.lineWidth = 1;
            pctx.beginPath();
            pctx.moveTo(px, py); pctx.lineTo(px + cellSize, py + cellSize);
            pctx.moveTo(px + cellSize, py); pctx.lineTo(px, py + cellSize);
            pctx.stroke();
          }
        }
      }
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
