import type { TilesetEditorState } from './editor-state.js';

/** Left sidebar: list of all defined tiles with search/filter. */
export class TileList {
  private container: HTMLElement;
  private state: TilesetEditorState;
  private filterText = '';
  private filterType: 'all' | 'tiles' | 'above' = 'all';
  private filterCategory = '';
  private catSelect!: HTMLSelectElement;

  constructor(container: HTMLElement, state: TilesetEditorState) {
    this.container = container;
    this.state = state;

    // Search box
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search tiles...';
    search.className = 'ts-search';
    search.addEventListener('input', () => { this.filterText = search.value.toLowerCase(); this.build(); });
    container.appendChild(search);

    // Filter buttons
    const filters = document.createElement('div');
    filters.className = 'ts-filters';
    filters.innerHTML = `
      <button class="filter-btn active" data-f="all">All</button>
      <button class="filter-btn" data-f="tiles">Tiles</button>
      <button class="filter-btn" data-f="above">Above</button>
    `;
    filters.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.filter-btn') as HTMLElement | null;
      if (!btn) return;
      this.filterType = btn.dataset.f as 'all' | 'tiles' | 'above';
      filters.querySelectorAll('.filter-btn').forEach(b => (b as HTMLElement).classList.toggle('active', b === btn));
      this.build();
    });
    container.appendChild(filters);

    // Category filter dropdown
    this.catSelect = document.createElement('select');
    this.catSelect.className = 'ts-search';
    this.catSelect.addEventListener('change', () => { this.filterCategory = this.catSelect.value; this.build(); });
    container.appendChild(this.catSelect);

    // List container
    const listEl = document.createElement('div');
    listEl.className = 'ts-tile-list';
    container.appendChild(listEl);

    state.on('items-changed', () => { this.rebuildCategoryOptions(); this.build(); });
    state.on('item-selected', () => this.updateHighlight());
    this.rebuildCategoryOptions();
    this.build();
  }

  private rebuildCategoryOptions(): void {
    const cats = new Set<string>();
    for (const t of this.state.tiles) {
      if (t.category) cats.add(t.category);
    }
    const sorted = [...cats].sort();
    const prev = this.catSelect.value;
    this.catSelect.innerHTML = '<option value="">All categories</option>';
    for (const cat of sorted) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      this.catSelect.appendChild(opt);
    }
    // Preserve selection if still valid
    if (sorted.includes(prev)) {
      this.catSelect.value = prev;
      this.filterCategory = prev;
    } else {
      this.filterCategory = '';
    }
  }

  private build(): void {
    const listEl = this.container.querySelector('.ts-tile-list')!;
    listEl.innerHTML = '';

    const filtered = this.state.tiles.filter((t) => {
      if (this.filterText && !t.key.toLowerCase().includes(this.filterText)) return false;
      if (this.filterType === 'tiles' && t.above) return false;
      if (this.filterType === 'above' && !t.above) return false;
      if (this.filterCategory && t.category !== this.filterCategory) return false;
      return true;
    });

    for (const t of filtered) {
      const idx = this.state.tiles.indexOf(t);
      const item = document.createElement('div');
      item.className = 'list-item';
      if (idx === this.state.selectedIndex) item.classList.add('selected');
      item.dataset.idx = String(idx);

      // Mini preview — scale tile to fit in a 24×24 box
      const maxDim = Math.max(t.w, t.h);
      const scale = 24 / maxDim;
      const pw = Math.round(t.w * scale);
      const ph = Math.round(t.h * scale);
      const preview = document.createElement('span');
      preview.className = 'tile-mini-preview';
      preview.style.backgroundImage = `url(${this.state.imageSrc})`;
      preview.style.backgroundPosition = `-${t.sx * scale}px -${t.sy * scale}px`;
      preview.style.backgroundSize = `${this.state.imageWidth * scale}px auto`;
      preview.style.width = pw + 'px';
      preview.style.height = ph + 'px';
      item.appendChild(preview);

      const label = document.createElement('span');
      label.className = 'tile-label';
      label.textContent = t.key;
      item.appendChild(label);

      const badges = document.createElement('span');
      badges.className = 'tile-size-badge';
      badges.textContent = `${t.w}×${t.h}`;
      if (t.above) badges.textContent += ' ↑';
      if (t.category) badges.textContent += ` [${t.category}]`;
      item.appendChild(badges);

      item.addEventListener('click', () => this.state.selectItem(idx));
      listEl.appendChild(item);
    }
  }

  private updateHighlight(): void {
    const listEl = this.container.querySelector('.ts-tile-list')!;
    listEl.querySelectorAll('.list-item').forEach(el => {
      const idx = parseInt((el as HTMLElement).dataset.idx || '-1', 10);
      (el as HTMLElement).classList.toggle('selected', idx === this.state.selectedIndex);
    });
  }
}
