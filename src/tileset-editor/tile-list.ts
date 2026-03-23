import type { TilesetEditorState } from './editor-state.js';

/** Left sidebar: list of all defined tiles with search/filter. */
export class TileList {
  private container: HTMLElement;
  private state: TilesetEditorState;
  private filterText = '';
  private filterType: 'all' | 'tiles' | 'above' = 'all';

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

    // List container
    const listEl = document.createElement('div');
    listEl.className = 'ts-tile-list';
    container.appendChild(listEl);

    state.on('items-changed', () => this.build());
    state.on('item-selected', () => this.updateHighlight());
    this.build();
  }

  private build(): void {
    const listEl = this.container.querySelector('.ts-tile-list')!;
    listEl.innerHTML = '';

    const filtered = this.state.tiles.filter((t) => {
      if (this.filterText && !t.key.toLowerCase().includes(this.filterText)) return false;
      if (this.filterType === 'tiles' && t.above) return false;
      if (this.filterType === 'above' && !t.above) return false;
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
