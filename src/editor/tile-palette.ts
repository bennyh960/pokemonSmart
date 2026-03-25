import type { TileDef, TileCategory } from './types.js';
import type { EditorState } from './editor-state.js';

/** Build categories from tiles using the category field. */
export function categorizeTiles(tiles: Record<string, TileDef>): TileCategory[] {
  const catMap = new Map<string, string[]>();
  for (const [id, def] of Object.entries(tiles)) {
    const catName = def.category || (def.above ? 'above' : 'uncategorized');
    if (!catMap.has(catName)) catMap.set(catName, []);
    catMap.get(catName)!.push(id);
  }
  return [...catMap.entries()].map(([name, tileIds]) => ({
    name: `${name} (${tileIds.length})`,
    tileIds,
  }));
}

/** Extract unique category names from tiles. */
function getCategories(tiles: Record<string, TileDef>): string[] {
  const cats = new Set<string>();
  for (const def of Object.values(tiles)) {
    if (def.category) cats.add(def.category);
  }
  return [...cats].sort();
}

/** Tile palette panel. */
export class TilePalette {
  private container: HTMLElement;
  private state: EditorState;
  private tiles: Record<string, TileDef>;
  private tilesetImage: HTMLImageElement;
  private searchText = '';
  private filterCategory = '';

  constructor(container: HTMLElement, state: EditorState, tilesetSrc: string, tiles: Record<string, TileDef>, tilesetWidth: number, tilesetImage?: HTMLImageElement) {
    this.container = container;
    this.state = state;
    this.tiles = tiles;
    // Use provided image or load one
    if (tilesetImage) {
      this.tilesetImage = tilesetImage;
    } else {
      this.tilesetImage = new Image();
      this.tilesetImage.src = tilesetSrc;
    }
    void tilesetWidth; // kept for API compat

    // Search
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search tiles...';
    search.className = 'palette-search';
    search.addEventListener('input', () => { this.searchText = search.value.toLowerCase(); this.buildGrid(); });
    container.appendChild(search);

    // Layer toggle (Ground / Above)
    const layerToggle = document.createElement('div');
    layerToggle.className = 'palette-layer-toggle';
    layerToggle.innerHTML = `
      <button class="layer-btn active" data-layer="ground">Ground</button>
      <button class="layer-btn" data-layer="object">Above</button>
    `;
    layerToggle.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.layer-btn') as HTMLElement | null;
      if (!btn) return;
      state.setLayer(btn.dataset.layer as 'ground' | 'object');
    });
    container.appendChild(layerToggle);
    state.on('layer-changed', () => {
      layerToggle.querySelectorAll('.layer-btn').forEach(b => {
        (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.layer === state.activeLayer);
      });
      this.buildGrid();
    });

    // Category filter
    const catFilter = document.createElement('select');
    catFilter.className = 'palette-search';
    catFilter.innerHTML = `<option value="">All categories</option>`;
    for (const cat of getCategories(tiles)) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catFilter.appendChild(opt);
    }
    catFilter.addEventListener('change', () => { this.filterCategory = catFilter.value; this.buildGrid(); });
    container.appendChild(catFilter);

    // Tile grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'palette-category';
    container.appendChild(gridContainer);

    this.buildGrid();
    state.on('tile-selected', () => this.updateSelection());
    state.on('map-loaded', () => this.buildGrid());
  }

  private buildGrid(): void {
    const gridContainer = this.container.querySelector('.palette-category')!;
    gridContainer.innerHTML = '';

    const isAboveLayer = this.state.activeLayer === 'object';
    const filtered = Object.entries(this.tiles).filter(([id, def]) => {
      if (def.above !== isAboveLayer) return false;
      if (this.searchText && !id.toLowerCase().includes(this.searchText)) return false;
      if (this.filterCategory && def.category !== this.filterCategory) return false;
      return true;
    });

    const grid = document.createElement('div');
    grid.className = 'palette-grid';

    for (const [id, def] of filtered) {
      const maxDim = Math.max(def.w, def.h);
      const scale = Math.min(2, 48 / maxDim);
      const tw = Math.round(def.w * scale);
      const th = Math.round(def.h * scale);

      // Use a canvas for reliable rendering (CSS sprites break with very tall images)
      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      canvas.className = 'palette-tile';
      canvas.dataset.tileId = id;
      canvas.title = `${id}\n(${def.sx}, ${def.sy}) ${def.w}×${def.h}px${def.category ? ' [' + def.category + ']' : ''}${def.walkable ? '' : ' [blocked]'}`;
      canvas.style.width = tw + 'px';
      canvas.style.height = th + 'px';
      canvas.draggable = true;
      canvas.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/tile-id', id);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        this.state.selectTile(id);
      });

      if (this.state.selectedTileId === id) canvas.classList.add('selected');

      // Draw tile from tileset image
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      const drawTile = () => {
        if (def.cells) {
          const scaleX = tw / def.w;
          const scaleY = th / def.h;
          for (const cell of def.cells) {
            ctx.drawImage(this.tilesetImage, def.sx + cell.dx * 16, def.sy + cell.dy * 16, 16, 16,
              cell.dx * 16 * scaleX, cell.dy * 16 * scaleY, 16 * scaleX, 16 * scaleY);
          }
        } else {
          ctx.drawImage(this.tilesetImage, def.sx, def.sy, def.w, def.h, 0, 0, tw, th);
        }
      };
      if (this.tilesetImage.complete) {
        drawTile();
      } else {
        this.tilesetImage.addEventListener('load', drawTile, { once: true });
      }

      canvas.addEventListener('click', () => {
        this.state.selectTile(id);
        if (this.state.activeTool !== 'paint' && this.state.activeTool !== 'fill') {
          this.state.setTool('paint');
        }
      });

      grid.appendChild(canvas);
    }

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'palette-empty';
      empty.textContent = 'No tiles match';
      grid.appendChild(empty);
    }

    gridContainer.appendChild(grid);
  }

  private updateSelection(): void {
    this.container.querySelectorAll('.palette-tile').forEach(el => {
      (el as HTMLElement).classList.toggle('selected', (el as HTMLElement).dataset.tileId === this.state.selectedTileId);
    });
  }
}
