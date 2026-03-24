import type { SpriteEditorState } from './editor-state.js';

/** Left sidebar: list of all defined sprites with search. */
export class SpriteList {
  private container: HTMLElement;
  private state: SpriteEditorState;
  private filterText = '';

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

    const filtered = this.state.sprites.filter((s) => {
      if (!this.filterText) return true;
      const q = this.filterText;
      return s.id.toLowerCase().includes(q) ||
        s.name.en.toLowerCase().includes(q) ||
        s.name.he.includes(q);
    });

    for (const s of filtered) {
      const idx = this.state.sprites.indexOf(s);
      const item = document.createElement('div');
      item.className = 'list-item';
      if (idx === this.state.selectedIndex) item.classList.add('selected');
      item.dataset.idx = String(idx);

      // Mini preview — show first valid frame
      const firstFrame = s.frames.find(f => f.sx >= 0 && f.sy >= 0);
      if (firstFrame) {
        const maxDim = Math.max(s.frameWidth, s.frameHeight);
        const scale = 24 / maxDim;
        const pw = Math.round(s.frameWidth * scale);
        const ph = Math.round(s.frameHeight * scale);
        const preview = document.createElement('span');
        preview.className = 'tile-mini-preview';
        preview.style.backgroundImage = `url(${this.state.imageSrc})`;
        preview.style.backgroundPosition = `-${firstFrame.sx * scale}px -${firstFrame.sy * scale}px`;
        preview.style.backgroundSize = `${this.state.imageWidth * scale}px auto`;
        preview.style.width = pw + 'px';
        preview.style.height = ph + 'px';
        item.appendChild(preview);
      }

      const label = document.createElement('span');
      label.className = 'tile-label';
      label.textContent = s.name.en || s.name.he || s.id;
      item.appendChild(label);

      const badges = document.createElement('span');
      badges.className = 'tile-size-badge';
      badges.textContent = `${s.frames.length}f`;
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
