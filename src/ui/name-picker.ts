/**
 * Reusable name picker component — searchable dropdown of Pokemon-world names
 * with a random button. Fills both EN and HE on selection.
 *
 * Used by both the sprite editor and map editor.
 */

import { CHARACTER_NAMES, getRandomName, type BilingualName } from '../data/names.js';

export interface NamePickerOptions {
  /** Initial EN value. */
  initialEn?: string;
  /** Initial HE value. */
  initialHe?: string;
  /** Called when a name is selected (from dropdown, random, or manual edit). */
  onChange: (name: BilingualName) => void;
}

/**
 * Create a name picker element.
 * Returns the container div to append to your UI.
 */
export function createNamePicker(opts: NamePickerOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'name-picker';

  // ── Search row: dropdown + random button ──
  const searchRow = document.createElement('div');
  searchRow.className = 'name-picker-search-row';

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'name-picker-search-wrapper';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'name-picker-search';
  searchInput.placeholder = 'Search name...';
  searchInput.value = opts.initialEn || '';

  const dropdown = document.createElement('div');
  dropdown.className = 'name-picker-dropdown';
  dropdown.style.display = 'none';

  const renderDropdown = (filter: string) => {
    dropdown.innerHTML = '';
    const lf = filter.toLowerCase();
    const matches = CHARACTER_NAMES.filter(n =>
      n.en.toLowerCase().includes(lf)
    ).slice(0, 20);

    for (const n of matches) {
      const item = document.createElement('div');
      item.className = 'name-picker-item';
      item.textContent = `${n.en} — ${n.he}`;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectName(n);
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(item);
    }
    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="name-picker-empty">No matches</div>';
    }
  };

  searchInput.addEventListener('focus', () => {
    renderDropdown(searchInput.value);
    dropdown.style.display = 'block';
  });
  searchInput.addEventListener('input', () => {
    renderDropdown(searchInput.value);
    dropdown.style.display = 'block';
  });
  searchInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });

  searchWrapper.appendChild(searchInput);
  searchWrapper.appendChild(dropdown);
  searchRow.appendChild(searchWrapper);

  // Random button
  const randomBtn = document.createElement('button');
  randomBtn.className = 'name-picker-random';
  randomBtn.textContent = '🎲';
  randomBtn.title = 'Random name';
  randomBtn.addEventListener('click', () => {
    selectName(getRandomName());
  });
  searchRow.appendChild(randomBtn);

  container.appendChild(searchRow);

  // ── EN / HE inputs ──
  const enRow = document.createElement('div');
  enRow.className = 'name-picker-field';
  enRow.innerHTML = '<label>EN:</label>';
  const enInput = document.createElement('input');
  enInput.type = 'text';
  enInput.value = opts.initialEn || '';
  enInput.addEventListener('change', () => {
    opts.onChange({ en: enInput.value.trim(), he: heInput.value.trim() });
  });
  enRow.appendChild(enInput);
  container.appendChild(enRow);

  const heRow = document.createElement('div');
  heRow.className = 'name-picker-field';
  heRow.innerHTML = '<label>HE:</label>';
  const heInput = document.createElement('input');
  heInput.type = 'text';
  heInput.dir = 'rtl';
  heInput.value = opts.initialHe || '';
  heInput.addEventListener('change', () => {
    opts.onChange({ en: enInput.value.trim(), he: heInput.value.trim() });
  });
  heRow.appendChild(heInput);
  container.appendChild(heRow);

  function selectName(n: BilingualName) {
    enInput.value = n.en;
    heInput.value = n.he;
    searchInput.value = n.en;
    opts.onChange({ en: n.en, he: n.he });
  }

  return container;
}
