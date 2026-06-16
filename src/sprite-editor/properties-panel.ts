import type { SpriteEditorState } from './editor-state.js';
import type { SpriteEntry, FramePos } from './types.js';
import { FRAME_DICT_REVERSE, FRAME_DICT, generateSpriteId } from './types.js';
import { createNamePicker } from '../ui/name-picker.js';
import { CHARACTER_ROLES } from '../engine/character-sprites.js';
import { applyCrop, saveSpriteImage } from './io.js';

/** Direction arrows for visual grouping. */
const DIR_ARROWS: Record<string, string> = {
  down: '\u2193', // ↓
  up: '\u2191', // ↑
  left: '\u2190', // ←
  right: '\u2192', // →
};

/** Ordered directions for display (up first — matches spritesheet layout). */
const DIR_ORDER = ['up', 'down', 'left', 'right'];

/** Poses per direction (columns). */
const DIR_POSES = ['stand', 'walk-1', 'walk-2'];

/** A slot in the direction grid — either filled or empty (null). */
interface FrameSlot {
  index: number; // index in the frames array (-1 = empty)
  pose: string; // label like "stand", "walk-1"
  filled: boolean; // true if a real frame exists at this index
}

/**
 * Build the full direction grid: always 4 directions × 3 poses.
 * Slots beyond the actual frame count are marked as empty (filled=false).
 * Extra frames beyond the dict go into an "extra" row.
 */
function buildDirectionGrid(frameCount: number): Map<string, FrameSlot[]> {
  const grid = new Map<string, FrameSlot[]>();

  // Always show all 4 directions with all pose slots
  for (const dir of DIR_ORDER) {
    const slots: FrameSlot[] = [];
    for (const pose of DIR_POSES) {
      const label = `${dir}-${pose}`;
      const dictIdx = FRAME_DICT_REVERSE_BY_LABEL[label];
      if (dictIdx !== undefined && dictIdx < frameCount) {
        slots.push({ index: dictIdx, pose, filled: true });
      } else {
        // Show the slot but mark as empty — the dict index tells us WHERE
        // this frame would go if it existed
        slots.push({ index: dictIdx ?? -1, pose, filled: false });
      }
    }
    grid.set(dir, slots);
  }

  // Extra frames beyond the dict
  const maxDictIdx = Math.max(...Object.values(FRAME_DICT_REVERSE).map(Number));
  if (frameCount > maxDictIdx + 1) {
    const extra: FrameSlot[] = [];
    for (let i = maxDictIdx + 1; i < frameCount; i++) {
      extra.push({ index: i, pose: `frame-${i}`, filled: true });
    }
    if (extra.length > 0) grid.set('extra', extra);
  }

  return grid;
}

/** Reverse lookup: label string → dict index (same as FRAME_DICT). */
const FRAME_DICT_REVERSE_BY_LABEL = FRAME_DICT;

/** Check if a frame is a null/empty placeholder. */
function isNullFrame(f: FramePos | null | undefined): boolean {
  return !f || f.sx < 0 || f.sy < 0;
}

/** Right sidebar: properties for current selection or selected sprite. */
export class PropertiesPanel {
  private container: HTMLElement;
  private state: SpriteEditorState;
  private image: HTMLImageElement;
  private animTimer = 0;
  private animFrame = 0;

  // Drag-and-drop state
  private dragSrcIndex = -1;

  // Frame clipboard for copy/paste
  private clipboardFrame: FramePos | null = null;

  // Active context menu element (to dismiss)
  private activeContextMenu: HTMLElement | null = null;

  // Whether to show fully-transparent frames as filled slots (default: hide them)
  private showTransparent = false;

  // Reusable offscreen canvas for transparency checks
  private offscreenCanvas = document.createElement('canvas');
  // Cache: "sx,sy,fw,fh" → isFullyTransparent
  private transparencyCache = new Map<string, boolean>();

  constructor(container: HTMLElement, state: SpriteEditorState, image: HTMLImageElement) {
    this.container = container;
    this.state = state;
    this.image = image;

    state.on('selection-changed', () => this.refresh());
    state.on('item-selected', () => this.refresh());
    state.on('items-changed', () => this.refresh());
    state.on('crop-mode-changed', () => this.refresh());
    state.on('crop-target-changed', () => this.syncCropInputs());
    this.refresh();
  }

  private updateCropPreview?: () => void;

  private syncCropInputs(): void {
    if (!this.state.cropMode || !this.state.cropLocked) return;
    const twEl = this.container.querySelector('#crop-tw') as HTMLInputElement | null;
    if (!twEl) return;
    twEl.value = String(this.state.cropTargetW);
    (this.container.querySelector('#crop-th') as HTMLInputElement).value = String(this.state.cropTargetH);
    (this.container.querySelector('#crop-sx') as HTMLInputElement).value = String(this.state.cropTargetX);
    (this.container.querySelector('#crop-sy') as HTMLInputElement).value = String(this.state.cropTargetY);
    this.updateCropPreview?.();
  }

  private refresh(): void {
    this.container.innerHTML = '';
    this.stopAnim();
    this.updateCropPreview = undefined;

    // Crop mode
    if (this.state.cropMode) {
      if (this.state.cropLocked) {
        this.renderCropLockedForm();
      } else if (this.state.cropSelValid) {
        this.renderCropSelectForm();
      } else {
        this.container.innerHTML =
          '<div class="prop-empty">Crop mode is active.<br><br>Select a region on the spritesheet to crop/resize it in-place. Selection is pixel-level (1px steps).</div>';
      }
      return;
    }

    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.sprites.length) {
      this.renderEditForm(this.state.selectedIndex);
      return;
    }

    if (this.state.selectionValid) {
      this.renderAddForm();
      return;
    }

    this.container.innerHTML =
      '<div class="prop-empty">Select a region on the spritesheet to define a sprite, or click an existing sprite in the list to edit it.<br><br>Drag to select the full area of all frames for one character, then set sprite size.</div>';
  }

  // ── Crop forms ──

  private renderCropSelectForm(): void {
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
        Lock the selection to drag and resize it on the canvas.
      </div>
    `;

    this.addCropPreviewWithGrid(section, sx, sy, sw, sh);

    const lockBtn = document.createElement('button');
    lockBtn.className = 'primary';
    lockBtn.textContent = 'Lock Selection';
    lockBtn.style.marginTop = '8px';
    lockBtn.addEventListener('click', () => this.state.lockCrop());
    section.appendChild(lockBtn);

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
        Drag the orange overlay to move. Drag edges/corners to resize.
      </div>
    `;

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

    // Source preview with grid
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
          pctx.fillStyle = (x / 8 + y / 8) % 2 === 0 ? '#222' : '#333';
          pctx.fillRect(x, y, 8, 8);
        }
      }
      pctx.drawImage(this.image, s.cropSrcX, s.cropSrcY, s.cropSrcW, s.cropSrcH, 0, 0, tw * scale, th * scale);
      this.drawGridOnCanvas(pctx, previewCanvas.width, previewCanvas.height, s.cropTargetX, s.cropTargetY, scale);
    };
    this.updateCropPreview = updatePreview;
    setTimeout(updatePreview, 0);

    // Unlock
    const unlockBtn = document.createElement('button');
    unlockBtn.className = 'primary';
    unlockBtn.textContent = 'Unlock';
    unlockBtn.style.marginTop = '8px';
    unlockBtn.style.background = '#555';
    unlockBtn.style.borderColor = '#666';
    unlockBtn.addEventListener('click', () => s.unlockCrop());
    section.appendChild(unlockBtn);

    // Apply
    const applyBtn = document.createElement('button');
    applyBtn.className = 'primary';
    applyBtn.textContent = 'Apply Crop & Save Image';
    applyBtn.style.marginTop = '6px';
    applyBtn.addEventListener('click', async () => {
      const tw = s.cropTargetW;
      const th = s.cropTargetH;
      if (tw < 1 || th < 1) {
        alert('Invalid target size');
        return;
      }

      applyBtn.disabled = true;
      applyBtn.textContent = 'Applying...';

      try {
        const blob = await applyCrop(
          this.image,
          s.cropSrcX,
          s.cropSrcY,
          s.cropSrcW,
          s.cropSrcH,
          tw,
          th,
          s.cropTargetX,
          s.cropTargetY,
        );
        await saveSpriteImage(blob);

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

        // Full reset
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

  /** Draw grid lines on a preview canvas aligned to the original grid. */
  private drawGridOnCanvas(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    originX: number,
    originY: number,
    scale: number,
  ): void {
    const gs = this.state.gridSize;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    const gridPx = gs * scale;
    const offsetX = (originX % gs) * scale;
    const offsetY = (originY % gs) * scale;

    for (let x = gridPx - offsetX; x < cw; x += gridPx) {
      if (x <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, ch);
      ctx.stroke();
    }
    for (let y = gridPx - offsetY; y < ch; y += gridPx) {
      if (y <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(cw, y + 0.5);
      ctx.stroke();
    }
  }

  /** Preview with grid overlay for crop mode. */
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
      for (let y2 = 0; y2 < previewCanvas.height; y2 += 8) {
        for (let x2 = 0; x2 < previewCanvas.width; x2 += 8) {
          pctx.fillStyle = (x2 / 8 + y2 / 8) % 2 === 0 ? '#222' : '#333';
          pctx.fillRect(x2, y2, 8, 8);
        }
      }
      pctx.drawImage(this.image, sx, sy, w, h, 0, 0, w * scale, h * scale);
      this.drawGridOnCanvas(pctx, previewCanvas.width, previewCanvas.height, sx, sy, scale);
    };
    if (this.image.complete) draw();
    else this.image.addEventListener('load', draw);

    container.appendChild(previewCanvas);
  }

  // ── Add form ──

  private renderAddForm(): void {
    const sx = this.state.selPixelX;
    const sy = this.state.selPixelY;
    const totalW = this.state.selPixelW;
    const totalH = this.state.selPixelH;
    const gs = this.state.gridSize;

    const section = document.createElement('div');
    section.className = 'props-section';

    const autoId = generateSpriteId();
    let pendingName = { en: '', he: '' };
    section.innerHTML = `
      <h3>New Sprite</h3>
      <div class="prop-row"><label>Origin:</label><span>(${sx}, ${sy})</span></div>
      <div class="prop-row"><label>Selection:</label><span class="val-highlight">${totalW}×${totalH}px</span></div>
      <div class="prop-row"><label>Sprite size:</label>
        <input id="add-fw" type="number" value="${gs}" min="1" style="width:50px" />
        <span style="color:#666">\u00d7</span>
        <input id="add-fh" type="number" value="${gs}" min="1" style="width:50px" />
        <span style="color:#666">px</span>
      </div>
      <div class="prop-row"><label>ID:</label><span class="val-highlight">${autoId}</span></div>
    `;
    // Name picker
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:6px 0 3px;';
    nameLabel.textContent = 'Name';
    section.appendChild(nameLabel);
    section.appendChild(
      createNamePicker({
        onChange: (name) => {
          pendingName = name;
        },
      }),
    );

    const fwInput = section.querySelector('#add-fw') as HTMLInputElement;
    const fhInput = section.querySelector('#add-fh') as HTMLInputElement;

    // Frames section with direction grouping + drag-and-drop
    const framesSection = document.createElement('div');
    framesSection.className = 'props-section';
    framesSection.innerHTML = '<h3>Frames (drag to reorder)</h3>';
    const framesContainer = document.createElement('div');
    framesSection.appendChild(framesContainer);

    // Mutable frames array for drag-and-drop reordering
    let pendingFrames: (FramePos | null)[] = [];

    const onSwap = (from: number, to: number) => {
      const tmp = pendingFrames[from];
      pendingFrames[from] = pendingFrames[to];
      pendingFrames[to] = tmp;
      renderFrameRows();
    };

    const onFrameUpdate = (idx: number, frame: FramePos | null) => {
      while (pendingFrames.length <= idx) pendingFrames.push(null);
      pendingFrames[idx] = frame;
      renderFrameRows();
    };

    const rebuildFrames = () => {
      const fw = parseInt(fwInput.value) || gs;
      const fh = parseInt(fhInput.value) || gs;
      const cols = Math.max(1, Math.floor(totalW / fw));
      const rows = Math.max(1, Math.floor(totalH / fh));
      const extracted = cols * rows;

      // Build array with all 12 dict slots, fill from extracted frames
      const maxSlot = Math.max(12, extracted);
      pendingFrames = new Array(maxSlot).fill(null);
      for (let i = 0; i < extracted; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        pendingFrames[i] = { sx: sx + col * fw, sy: sy + row * fh };
      }
      renderFrameRows();
    };

    const renderFrameRows = () => {
      const fw = parseInt(fwInput.value) || gs;
      const fh = parseInt(fhInput.value) || gs;
      framesContainer.innerHTML = '';
      const grid = buildDirectionGrid(pendingFrames.length);

      for (const [dir, slots] of grid) {
        const row = document.createElement('div');
        row.className = 'dir-row';

        const arrow = document.createElement('div');
        arrow.className = 'dir-arrow';
        arrow.textContent = DIR_ARROWS[dir] || '\u2022';
        arrow.title = dir;
        row.appendChild(arrow);

        const dirLabel = document.createElement('div');
        dirLabel.className = 'dir-label';
        dirLabel.textContent = dir;
        row.appendChild(dirLabel);

        const thumbs = document.createElement('div');
        thumbs.className = 'dir-frames';

        for (const slot of slots) {
          if (slot.filled && slot.index >= 0) {
            const f = pendingFrames[slot.index];
            if (f) {
              thumbs.appendChild(
                this.createDraggableThumb(f.sx, f.sy, fw, fh, slot.index, slot.pose, onSwap, onFrameUpdate),
              );
            } else {
              thumbs.appendChild(this.createEmptySlot(fw, fh, slot.index, slot.pose, onSwap, onFrameUpdate));
            }
          } else {
            thumbs.appendChild(this.createEmptySlot(fw, fh, slot.index, slot.pose, onSwap, onFrameUpdate));
          }
        }

        row.appendChild(thumbs);
        framesContainer.appendChild(row);
      }
    };

    fwInput.addEventListener('change', rebuildFrames);
    fhInput.addEventListener('change', rebuildFrames);
    rebuildFrames();

    section.appendChild(framesSection);

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'primary';
    addBtn.textContent = '+ Add Sprite';
    addBtn.addEventListener('click', () => {
      const fw = parseInt(fwInput.value) || gs;
      const fh = parseInt(fhInput.value) || gs;

      // Keep nulls in array — they represent empty slots
      // The game engine should handle null frames gracefully
      const frames: FramePos[] = pendingFrames.map((f) => f ?? { sx: -1, sy: -1 });

      const entry: SpriteEntry = {
        id: autoId,
        name: { ...pendingName },
        roles: [],
        frameWidth: fw,
        frameHeight: fh,
        frames,
      };
      this.state.addSprite(entry);
    });
    section.appendChild(addBtn);

    // Enter on search input triggers add
    const searchIn = section.querySelector('.name-picker-search');
    if (searchIn) {
      searchIn.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') addBtn.click();
      });
    }

    this.container.appendChild(section);
  }

  // ── Edit form ──

  private renderEditForm(index: number): void {
    const s = this.state.sprites[index];
    const section = document.createElement('div');
    section.className = 'props-section';

    const displayName = s.name.en || s.name.he || s.id;
    section.innerHTML = `
      <h3>Edit: ${displayName}</h3>
      <div class="prop-row"><label>ID:</label><span class="val-highlight">${s.id}</span></div>
      <div class="prop-row"><label>Sprite size:</label>
        <span class="val-highlight">${s.frameWidth}\u00d7${s.frameHeight}px</span>
      </div>
      <div class="prop-row"><label>Frames:</label>
        <span class="val-highlight">${s.frames.length}</span>
      </div>
    `;

    // Name picker with current values
    const nameLabel = document.createElement('div');
    nameLabel.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:6px 0 3px;';
    nameLabel.textContent = 'Name';
    section.appendChild(nameLabel);
    section.appendChild(
      createNamePicker({
        initialEn: s.name.en,
        initialHe: s.name.he,
        onChange: (name) => {
          this.state.updateSprite(index, { name: { en: name.en, he: name.he } });
        },
      }),
    );

    // Roles multi-select
    const rolesLabel = document.createElement('div');
    rolesLabel.style.cssText = 'font-size:11px;color:#8899bb;font-weight:600;margin:6px 0 3px;';
    rolesLabel.textContent = 'Roles';
    section.appendChild(rolesLabel);

    const rolesContainer = document.createElement('div');
    rolesContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;';

    const buildRoleChips = () => {
      rolesContainer.innerHTML = '';
      for (const role of CHARACTER_ROLES) {
        const chip = document.createElement('button');
        const active = s.roles.includes(role);
        chip.textContent = role;
        chip.style.cssText = `
          font-size:10px; padding:2px 6px; border-radius:8px; cursor:pointer;
          border:1px solid ${active ? '#6cf' : '#555'};
          background:${active ? '#2a4a6a' : '#1a1a2e'};
          color:${active ? '#8df' : '#888'};
        `;
        chip.addEventListener('click', () => {
          const newRoles = active ? s.roles.filter((r) => r !== role) : [...s.roles, role];
          this.state.updateSprite(index, { roles: newRoles });
          buildRoleChips();
        });
        rolesContainer.appendChild(chip);
      }
    };
    buildRoleChips();
    section.appendChild(rolesContainer);

    // Frames with direction grouping + drag-and-drop
    const framesSection = document.createElement('div');
    framesSection.className = 'props-section';

    const frameHeader = document.createElement('div');
    frameHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;';
    const frameTitle = document.createElement('h3');
    frameTitle.textContent = 'Frame Map (drag to reorder)';
    frameTitle.style.margin = '0';
    frameHeader.appendChild(frameTitle);

    const toggleBtn = document.createElement('button');
    const syncToggleBtn = () => {
      toggleBtn.textContent = this.showTransparent ? 'Hide Transparent' : 'Show Transparent';
      toggleBtn.style.cssText = `font-size:10px;padding:2px 7px;border-radius:8px;cursor:pointer;
        border:1px solid ${this.showTransparent ? '#6a6a2a' : '#444'};
        background:${this.showTransparent ? '#2a2a1a' : '#1a1a1a'};
        color:${this.showTransparent ? '#cc9' : '#777'};`;
    };
    syncToggleBtn();
    toggleBtn.addEventListener('click', () => {
      this.showTransparent = !this.showTransparent;
      syncToggleBtn();
      renderRows();
    });
    frameHeader.appendChild(toggleBtn);
    framesSection.appendChild(frameHeader);

    const framesContainer = document.createElement('div');
    framesSection.appendChild(framesContainer);

    const editSwap = (from: number, to: number) => {
      const newFrames = [...s.frames];
      // Extend array if needed (swapping into an empty slot)
      while (newFrames.length <= Math.max(from, to)) {
        newFrames.push({ sx: -1, sy: -1 });
      }
      const tmp = newFrames[from];
      newFrames[from] = newFrames[to];
      newFrames[to] = tmp;
      this.state.updateSprite(index, { frames: newFrames });
      renderRows();
    };

    const editFrameUpdate = (idx: number, frame: FramePos | null) => {
      const newFrames = [...s.frames];
      while (newFrames.length <= idx) newFrames.push({ sx: -1, sy: -1 });
      newFrames[idx] = frame ?? { sx: -1, sy: -1 };
      this.state.updateSprite(index, { frames: newFrames });
      renderRows();
    };

    const renderRows = () => {
      framesContainer.innerHTML = '';
      const grid = buildDirectionGrid(Math.max(s.frames.length, 12));

      for (const [dir, slots] of grid) {
        const row = document.createElement('div');
        row.className = 'dir-row';

        const arrow = document.createElement('div');
        arrow.className = 'dir-arrow';
        arrow.textContent = DIR_ARROWS[dir] || '\u2022';
        arrow.title = dir;
        row.appendChild(arrow);

        const dirLabel = document.createElement('div');
        dirLabel.className = 'dir-label';
        dirLabel.textContent = dir;
        row.appendChild(dirLabel);

        const thumbs = document.createElement('div');
        thumbs.className = 'dir-frames';

        for (const slot of slots) {
          const f = slot.index >= 0 && slot.index < s.frames.length ? s.frames[slot.index] : null;
          const isNull = !f || f.sx < 0 || f.sy < 0;
          const isTransparent =
            !isNull && !this.showTransparent && this.isFrameTransparent(f!.sx, f!.sy, s.frameWidth, s.frameHeight);

          if (!isNull && !isTransparent && f) {
            thumbs.appendChild(
              this.createDraggableThumb(
                f.sx,
                f.sy,
                s.frameWidth,
                s.frameHeight,
                slot.index,
                slot.pose,
                editSwap,
                editFrameUpdate,
              ),
            );
          } else {
            thumbs.appendChild(
              this.createEmptySlot(s.frameWidth, s.frameHeight, slot.index, slot.pose, editSwap, editFrameUpdate),
            );
          }
        }

        row.appendChild(thumbs);
        framesContainer.appendChild(row);
      }
    };
    renderRows();

    section.appendChild(framesSection);

    // Animation preview
    this.addAnimatedPreview(section, s);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete Sprite';
    delBtn.style.marginTop = '8px';
    delBtn.addEventListener('click', () => {
      if (confirm(`Delete "${s.name || s.id}"?`)) this.state.removeSprite(index);
    });
    section.appendChild(delBtn);

    this.container.appendChild(section);
  }

  // ── Draggable frame thumbnail ──

  private createDraggableThumb(
    frameSx: number,
    frameSy: number,
    fw: number,
    fh: number,
    index: number,
    pose: string,
    onSwap: (from: number, to: number) => void,
    onUpdate?: (index: number, frame: FramePos | null) => void,
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'frame-item';
    item.draggable = true;
    item.dataset.frameIdx = String(index);

    const scale = Math.min(3, Math.max(1, Math.floor(48 / Math.max(fw, fh))));
    const thumb = document.createElement('canvas');
    thumb.width = fw * scale;
    thumb.height = fh * scale;
    thumb.style.imageRendering = 'pixelated';
    thumb.className = 'frame-thumb';

    const draw = () => {
      const ctx = thumb.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, thumb.width, thumb.height);
      // Checkerboard
      for (let y = 0; y < thumb.height; y += 6) {
        for (let x = 0; x < thumb.width; x += 6) {
          ctx.fillStyle = (x / 6 + y / 6) % 2 === 0 ? '#222' : '#333';
          ctx.fillRect(x, y, 6, 6);
        }
      }
      ctx.drawImage(this.image, frameSx, frameSy, fw, fh, 0, 0, thumb.width, thumb.height);
    };
    if (this.image.complete) draw();
    else this.image.addEventListener('load', draw);
    item.appendChild(thumb);

    // Pose label under thumbnail
    const badge = document.createElement('span');
    badge.className = 'frame-index';
    badge.textContent = pose || String(index);
    item.appendChild(badge);

    // ── Right-click context menu ──
    if (onUpdate) {
      item.addEventListener('contextmenu', (e) => {
        this.showFrameContextMenu(e, index, { sx: frameSx, sy: frameSy }, onUpdate);
      });
    }

    // ── Drag-and-drop ──
    item.addEventListener('dragstart', (e) => {
      this.dragSrcIndex = index;
      item.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', String(index));
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      this.dragSrcIndex = -1;
      // Clean up all drag-over highlights
      this.container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromIdx = this.dragSrcIndex;
      const toIdx = index;
      if (fromIdx >= 0 && fromIdx !== toIdx) {
        onSwap(fromIdx, toIdx);
      }
    });

    return item;
  }

  // ── Empty slot placeholder (for missing frames) ──

  private createEmptySlot(
    fw: number,
    fh: number,
    index: number,
    pose: string,
    onSwap: (from: number, to: number) => void,
    onUpdate?: (index: number, frame: FramePos | null) => void,
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'frame-item frame-empty';
    item.dataset.frameIdx = String(index);

    const scale = Math.min(3, Math.max(1, Math.floor(48 / Math.max(fw, fh))));
    const placeholder = document.createElement('div');
    placeholder.className = 'frame-thumb-empty';
    placeholder.style.width = fw * scale + 'px';
    placeholder.style.height = fh * scale + 'px';
    item.appendChild(placeholder);

    const badge = document.createElement('span');
    badge.className = 'frame-index';
    badge.textContent = pose;
    item.appendChild(badge);

    // ── Right-click context menu (paste into empty slot) ──
    if (onUpdate) {
      item.addEventListener('contextmenu', (e) => {
        this.showFrameContextMenu(e, index, null, onUpdate);
      });
    }

    // Accept drops into empty slots
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromIdx = this.dragSrcIndex;
      if (fromIdx >= 0 && fromIdx !== index) {
        onSwap(fromIdx, index);
      }
    });

    return item;
  }

  private addTrainerStaticPreview(container: HTMLElement, id: string): void {
    const previewBox = document.createElement('div');

    const safeId = id.replace('#', '_');
    const primaryPath = `/sprites/trainers/${safeId}.png`;
    const fallbackPath = `/sprites/trainers/default.png`;

    const img = document.createElement('img');
    img.src = primaryPath;
    img.loading = 'lazy';
    img.alt = 'Trainer Asset';
    img.style.cssText = 'max-width:100%; max-height:120px; object-fit:contain; image-rendering:pixelated;';

    // Clean fallback pattern to prevent infinite loops if both fail
    img.onerror = function () {
      this.onerror = null;
      this.src = fallbackPath;
    };

    const label = document.createElement('div');
    label.style.cssText = 'font-size:10px; color:#666; margin-top:4px; text-align:center;';
    label.textContent = 'Static Asset';

    previewBox.appendChild(img);
    previewBox.appendChild(label);
    container.appendChild(previewBox);
  }

  // ── Animated preview ──

  private addAnimatedPreview(container: HTMLElement, s: SpriteEntry): void {
    if (s.frames.length === 0) return;

    const section = document.createElement('div');
    section.className = 'props-section';
    section.innerHTML = '<h3>Animation Preview</h3>';

    // Group by direction — skip null frames
    const directions = new Map<string, { index: number; label: string }[]>();
    for (let i = 0; i < s.frames.length; i++) {
      if (isNullFrame(s.frames[i])) continue;
      const label = FRAME_DICT_REVERSE[i];
      if (!label) continue;
      const dir = label.split('-')[0];
      if (!directions.has(dir)) directions.set(dir, []);
      directions.get(dir)!.push({ index: i, label });
    }

    if (directions.size === 0) {
      const validFrames = s.frames.map((f, i) => ({ f, i })).filter(({ f }) => !isNullFrame(f));
      if (validFrames.length === 0) return; // nothing to animate
      directions.set(
        'all',
        validFrames.map(({ i }) => ({ index: i, label: `frame ${i}` })),
      );
    }

    // Direction selector with arrows
    const dirRow = document.createElement('div');
    dirRow.className = 'prop-row';
    dirRow.innerHTML = '<label>Direction:</label>';
    const dirSelect = document.createElement('select');
    dirSelect.style.cssText =
      'flex:1;background:#2a2a44;color:#ddd;border:1px solid #444;border-radius:3px;padding:4px 6px;font-size:12px;';
    for (const [dir] of directions) {
      const opt = document.createElement('option');
      opt.value = dir;
      const arrow = DIR_ARROWS[dir] || '';
      opt.textContent = arrow ? `${arrow} ${dir}` : dir;
      dirSelect.appendChild(opt);
    }
    dirRow.appendChild(dirSelect);
    section.appendChild(dirRow);

    const scale = Math.min(6, Math.max(2, Math.floor(120 / Math.max(s.frameWidth, s.frameHeight))));
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = s.frameWidth * scale;
    previewCanvas.height = s.frameHeight * scale;
    previewCanvas.style.imageRendering = 'pixelated';
    previewCanvas.style.border = '1px solid #444';
    previewCanvas.style.background = '#111';
    previewCanvas.style.borderRadius = '4px';
    previewCanvas.style.display = 'block';
    previewCanvas.style.margin = '6px 0';

    const frameLabel = document.createElement('div');
    frameLabel.style.fontSize = '11px';
    frameLabel.style.color = '#888';

    const drawFrame = () => {
      const dir = dirSelect.value;
      const dirFrames = directions.get(dir);
      if (!dirFrames || dirFrames.length === 0) return;

      const info = dirFrames[this.animFrame % dirFrames.length];
      const f = s.frames[info.index];
      if (isNullFrame(f)) return;

      const pctx = previewCanvas.getContext('2d')!;
      pctx.imageSmoothingEnabled = false;
      pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      for (let y = 0; y < previewCanvas.height; y += 8) {
        for (let x = 0; x < previewCanvas.width; x += 8) {
          pctx.fillStyle = (x / 8 + y / 8) % 2 === 0 ? '#222' : '#333';
          pctx.fillRect(x, y, 8, 8);
        }
      }
      pctx.drawImage(
        this.image,
        f.sx,
        f.sy,
        s.frameWidth,
        s.frameHeight,
        0,
        0,
        previewCanvas.width,
        previewCanvas.height,
      );
      frameLabel.textContent = `${info.label} (index ${info.index})`;
    };

    this.animFrame = 0;
    drawFrame();
    dirSelect.addEventListener('change', () => {
      this.animFrame = 0;
      drawFrame();
    });

    this.animTimer = window.setInterval(() => {
      this.animFrame++;
      drawFrame();
    }, 250);

    const canvasWrapper = document.createElement('div');
    canvasWrapper.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
    section.appendChild(canvasWrapper);
    canvasWrapper.appendChild(previewCanvas);
    this.addTrainerStaticPreview(canvasWrapper, s.id);

    section.appendChild(frameLabel);
    container.appendChild(section);
  }

  // ── Context menu for frame slots ──

  private dismissContextMenu(): void {
    if (this.activeContextMenu) {
      this.activeContextMenu.remove();
      this.activeContextMenu = null;
    }
  }

  private showFrameContextMenu(
    e: MouseEvent,
    frameIndex: number,
    frame: FramePos | null,
    onUpdate: (index: number, frame: FramePos | null) => void,
  ): void {
    e.preventDefault();
    this.dismissContextMenu();

    const menu = document.createElement('div');
    menu.className = 'frame-context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    const isFilled = frame && frame.sx >= 0 && frame.sy >= 0;

    if (isFilled) {
      // Copy
      const copyBtn = document.createElement('div');
      copyBtn.className = 'frame-ctx-item';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        this.clipboardFrame = { sx: frame!.sx, sy: frame!.sy };
        this.dismissContextMenu();
      });
      menu.appendChild(copyBtn);

      // Delete
      const delBtn = document.createElement('div');
      delBtn.className = 'frame-ctx-item frame-ctx-danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        onUpdate(frameIndex, null);
        this.dismissContextMenu();
      });
      menu.appendChild(delBtn);
    }

    if (this.clipboardFrame) {
      // Paste
      const pasteBtn = document.createElement('div');
      pasteBtn.className = 'frame-ctx-item';
      pasteBtn.textContent = `Paste${isFilled ? ' (replace)' : ''}`;
      pasteBtn.addEventListener('click', () => {
        onUpdate(frameIndex, { sx: this.clipboardFrame!.sx, sy: this.clipboardFrame!.sy });
        this.dismissContextMenu();
      });
      menu.appendChild(pasteBtn);
    }

    if (menu.children.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'frame-ctx-item frame-ctx-disabled';
      empty.textContent = 'No actions';
      menu.appendChild(empty);
    }

    document.body.appendChild(menu);
    this.activeContextMenu = menu;

    // Dismiss on click outside
    const dismiss = (ev: MouseEvent) => {
      if (!menu.contains(ev.target as Node)) {
        this.dismissContextMenu();
        document.removeEventListener('mousedown', dismiss);
      }
    };
    // Use setTimeout so the current event doesn't immediately dismiss
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  }

  // ── Transparency check ──

  /**
   * Returns true if every pixel in the frame region has alpha = 0.
   * Results are cached by coordinates so each unique frame is only read once.
   */
  private isFrameTransparent(sx: number, sy: number, fw: number, fh: number): boolean {
    const key = `${sx},${sy},${fw},${fh}`;
    if (this.transparencyCache.has(key)) return this.transparencyCache.get(key)!;

    this.offscreenCanvas.width = fw;
    this.offscreenCanvas.height = fh;
    const ctx = this.offscreenCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, fw, fh);
    ctx.drawImage(this.image, sx, sy, fw, fh, 0, 0, fw, fh);
    const pixels = ctx.getImageData(0, 0, fw, fh).data;
    let transparent = true;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) {
        transparent = false;
        break;
      }
    }

    this.transparencyCache.set(key, transparent);
    return transparent;
  }

  private stopAnim(): void {
    if (this.animTimer) {
      clearInterval(this.animTimer);
      this.animTimer = 0;
    }
  }
}
