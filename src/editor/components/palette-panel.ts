/**
 * Palette Panel — Left sidebar showing tiles from all tilesets,
 * organized by tileset tabs and category sub-tabs.
 */

import { TILE_CATALOG, TILESETS, TILE_CATEGORIES, type TileCategory, getTilesByTileset } from '../tile-catalog.js';
import { editorState } from '../state/editor-state.js';
import type { TilesetImages } from '../editor-main.js';

const THUMB_SIZE = 32;
const TILE_PX = 16;

export function createPalettePanel(tilesetImages: TilesetImages): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'palette-panel';

  // ─── Tileset selector ──────────────────────────────────────
  const tilesetTabs = document.createElement('div');
  tilesetTabs.className = 'palette-tabs';

  const allTsBtn = document.createElement('button');
  allTsBtn.className = 'palette-tab active';
  allTsBtn.textContent = 'All';
  allTsBtn.dataset.ts = '__all__';
  tilesetTabs.appendChild(allTsBtn);

  for (const ts of TILESETS) {
    const btn = document.createElement('button');
    btn.className = 'palette-tab';
    btn.textContent = ts.label;
    btn.dataset.ts = ts.id;
    tilesetTabs.appendChild(btn);
  }
  panel.appendChild(tilesetTabs);

  // ─── Category filter ───────────────────────────────────────
  const catTabs = document.createElement('div');
  catTabs.className = 'palette-tabs';

  const allCatBtn = document.createElement('button');
  allCatBtn.className = 'palette-tab palette-cat-tab active';
  allCatBtn.textContent = 'All';
  allCatBtn.dataset.cat = '__all__';
  catTabs.appendChild(allCatBtn);

  for (const cat of TILE_CATEGORIES) {
    const btn = document.createElement('button');
    btn.className = 'palette-tab palette-cat-tab';
    btn.textContent = cat.label;
    btn.dataset.cat = cat.key;
    catTabs.appendChild(btn);
  }
  panel.appendChild(catTabs);

  // ─── Search ────────────────────────────────────────────────
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = 'Search tiles...';
  search.className = 'palette-search';
  panel.appendChild(search);

  // ─── Tile grid ─────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'palette-grid';
  panel.appendChild(grid);

  // ─── Info ──────────────────────────────────────────────────
  const info = document.createElement('div');
  info.className = 'palette-info';
  info.textContent = 'Selected: Grass (ID 1)';
  panel.appendChild(info);

  let activeTileset = '__all__';
  let activeCategory: TileCategory | '__all__' = '__all__';

  function renderTiles(filter = '') {
    grid.innerHTML = '';
    const filterLower = filter.toLowerCase();

    let tiles = activeTileset === '__all__'
      ? [...TILE_CATALOG]
      : getTilesByTileset(activeTileset);

    if (activeCategory !== '__all__') {
      tiles = tiles.filter((t) => t.category === activeCategory);
    }

    if (filterLower) {
      tiles = tiles.filter((t) => t.name.toLowerCase().includes(filterLower));
    }

    for (const tile of tiles) {
      const tsImg = tilesetImages[tile.tilesetId];
      if (!tsImg) continue;

      const cell = document.createElement('canvas');
      cell.width = THUMB_SIZE;
      cell.height = THUMB_SIZE;
      cell.className = 'palette-tile' + (tile.id === editorState.selectedTileId ? ' selected' : '');
      cell.title = `${tile.name} (ID ${tile.id}) [${tile.tilesetId}: ${tile.col},${tile.row}]`;

      const ctx = cell.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        tsImg,
        tile.col * TILE_PX, tile.row * TILE_PX, TILE_PX, TILE_PX,
        0, 0, THUMB_SIZE, THUMB_SIZE,
      );

      if (!tile.walkable) {
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, THUMB_SIZE - 2, THUMB_SIZE - 2);
      }
      if (tile.encounter) {
        ctx.fillStyle = '#ffff0044';
        ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE);
      }

      cell.addEventListener('click', () => {
        editorState.selectedTileId = tile.id;
        editorState.activeTool = 'paint';
        renderTiles(search.value);
        info.textContent = `Selected: ${tile.name} (ID ${tile.id}) [${tile.tilesetId}]`;
        editorState.notify();
      });

      grid.appendChild(cell);
    }

    if (tiles.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#666; padding:16px; text-align:center;';
      empty.textContent = 'No tiles found';
      grid.appendChild(empty);
    }
  }

  // Tileset tab clicks
  tilesetTabs.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.palette-tab') as HTMLElement;
    if (!btn || !btn.dataset.ts) return;
    tilesetTabs.querySelectorAll('.palette-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeTileset = btn.dataset.ts!;
    renderTiles(search.value);
  });

  // Category tab clicks
  catTabs.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.palette-cat-tab') as HTMLElement;
    if (!btn || !btn.dataset.cat) return;
    catTabs.querySelectorAll('.palette-cat-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat as TileCategory | '__all__';
    renderTiles(search.value);
  });

  search.addEventListener('input', () => renderTiles(search.value));

  renderTiles();
  editorState.subscribe(() => renderTiles(search.value));

  return panel;
}
