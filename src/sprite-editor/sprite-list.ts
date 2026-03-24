import type { SpriteEditorState } from './editor-state.js';

/** Left sidebar: list of all defined sprites with search/filter, grouped by category. */
export class SpriteList {
  private container: HTMLElement;
  private state: SpriteEditorState;
  private filterText = '';
  private filterCategory = '';
  private catSelect!: HTMLSelectElement;

  constructor(container: HTMLElement, state: SpriteEditorState) {
    this.container = container;
    this.state = state;

    // Search box
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search sprites...';
    search.className = 'ts-search';
    search.addEventListener('input', () => { this.filterText = search.value.toLowerCase(); this.build(); });
    container.appendChild(search);

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
    for (const s of this.state.sprites) {
      if (s.category) cats.add(s.category);
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

    const filtered = this.state.sprites.filter((s) => {
      if (this.filterText && !s.id.toLowerCase().includes(this.filterText) && !s.name.toLowerCase().includes(this.filterText)) return false;
      if (this.filterCategory && s.category !== this.filterCategory) return false;
      return true;
    });

    // Group by category
    const groups = new Map<string, { sprite: typeof filtered[0]; idx: number }[]>();
    for (const s of filtered) {
      const idx = this.state.sprites.indexOf(s);
      const cat = s.category || 'other';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push({ sprite: s, idx });
    }

    for (const [cat, items] of groups) {
      // Category header
      const header = document.createElement('div');
      header.className = 'list-category-header';
      header.textContent = `${cat} (${items.length})`;
      listEl.appendChild(header);

      for (const { sprite: s, idx } of items) {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (idx === this.state.selectedIndex) item.classList.add('selected');
        item.dataset.idx = String(idx);

        // Mini preview — show first frame
        if (s.frames.length > 0) {
          const f = s.frames[0];
          const maxDim = Math.max(s.frameWidth, s.frameHeight);
          const scale = 24 / maxDim;
          const pw = Math.round(s.frameWidth * scale);
          const ph = Math.round(s.frameHeight * scale);
          const preview = document.createElement('span');
          preview.className = 'tile-mini-preview';
          preview.style.backgroundImage = `url(${this.state.imageSrc})`;
          preview.style.backgroundPosition = `-${f.sx * scale}px -${f.sy * scale}px`;
          preview.style.backgroundSize = `${this.state.imageWidth * scale}px auto`;
          preview.style.width = pw + 'px';
          preview.style.height = ph + 'px';
          item.appendChild(preview);
        }

        const label = document.createElement('span');
        label.className = 'tile-label';
        label.textContent = s.name || s.id;
        item.appendChild(label);

        const badges = document.createElement('span');
        badges.className = 'tile-size-badge';
        badges.textContent = `${s.frames.length}f`;
        item.appendChild(badges);

        item.addEventListener('click', () => this.state.selectItem(idx));
        listEl.appendChild(item);
      }
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
