import type { TilesetEditorState } from './editor-state.js';
import type { TileEntry } from './types.js';
import { TILE_CATEGORIES } from './types.js';

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
    state.on('item-selected', () => this.refresh());
    state.on('items-changed', () => this.refresh());
    this.refresh();
  }

  private refresh(): void {
    this.container.innerHTML = '';

    // If a tile is selected in the list, show its editable properties
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.tiles.length) {
      this.renderEditForm(this.state.selectedIndex);
      return;
    }

    // If there's a selection on the spritesheet, show "Add Tile" form
    if (this.state.selectionValid) {
      this.renderAddForm();
      return;
    }

    this.container.innerHTML = '<div class="prop-empty">Select a region on the spritesheet to define a tile, or click an existing tile in the list to edit it.</div>';
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
}
