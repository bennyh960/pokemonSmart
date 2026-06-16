import type { SpriteEditorState } from './editor-state.js';
import { CHARACTER_ROLES } from '../engine/character-sprites.js';
import type { CharacterRole } from './types.js';

/** Left sidebar: list of all defined sprites with search + role filter. */
export class SpriteList {
  private container: HTMLElement;
  private state: SpriteEditorState;
  private filterText = '';
  private filterRole = '';

  constructor(container: HTMLElement, state: SpriteEditorState) {
    this.container = container;
    this.state = state;

    // Search box
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search sprites...';
    search.className = 'ts-search';
    search.addEventListener('input', () => {
      this.filterText = search.value.toLowerCase();
      this.build();
    });
    container.appendChild(search);

    // Role filter dropdown
    const roleSel = document.createElement('select');
    roleSel.className = 'ts-search';
    roleSel.style.marginTop = '4px';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All roles';
    roleSel.appendChild(allOpt);
    for (const role of CHARACTER_ROLES) {
      const opt = document.createElement('option');
      opt.value = role;
      opt.textContent = role;
      roleSel.appendChild(opt);
    }
    roleSel.addEventListener('change', () => {
      this.filterRole = roleSel.value;
      this.build();
    });
    container.appendChild(roleSel);

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
      // Role filter
      if (this.filterRole && !s.roles.includes(this.filterRole as CharacterRole)) return false;
      // Text search
      if (!this.filterText) return true;
      const q = this.filterText;
      return s.id.toLowerCase().includes(q) || s.name.en.toLowerCase().includes(q) || s.name.he.includes(q);
    });

    for (const s of filtered) {
      const idx = this.state.sprites.indexOf(s);
      const item = document.createElement('div');
      item.className = 'list-item';
      if (idx === this.state.selectedIndex) item.classList.add('selected');
      item.dataset.idx = String(idx);

      // Mini preview — show first valid frame
      const frames = s.frames.filter((f) => f.sx >= 0 && f.sy >= 0);
      const firstFrame = frames[4] ?? frames[0];
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
      const roleStr = s.roles.length > 0 ? ` ${s.roles[0]}` : '';
      badges.textContent = `${s.frames.length}f${roleStr}`;
      item.appendChild(badges);

      item.addEventListener('click', () => this.state.selectItem(idx));
      listEl.appendChild(item);
    }
  }

  private updateHighlight(): void {
    const listEl = this.container.querySelector('.ts-tile-list')!;
    listEl.querySelectorAll('.list-item').forEach((el) => {
      const idx = parseInt((el as HTMLElement).dataset.idx || '-1', 10);
      (el as HTMLElement).classList.toggle('selected', idx === this.state.selectedIndex);
    });
  }
}
