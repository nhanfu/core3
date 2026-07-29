import { BaseComponent } from '../runtime.ts';
import { html } from '../html.ts';
import { FavoritesStore } from '../services/FavoritesStore.ts';

export type OdooControlPanelDefinition = {
  placeholder?: string;
  views?: string[];
  activeView?: string;
  filters?: string[];
  filterOptions?: Array<{ value: string; label: string }>;
  groupOptions?: Array<{ value: string; label: string }>;
  sortOptions?: Array<{ value: string; label: string }>;
  favoriteKey?: string;
};

/** Shared Odoo-style search, filter, grouping, favorites, and view controls. */
export class OdooControlPanel extends BaseComponent {
  def: OdooControlPanelDefinition;

  constructor(id: string, state: { search?: string } = {}, def: OdooControlPanelDefinition = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container: HTMLElement) {
    const root = html.take(container).div.className('odoo-control-panel').getContext();
    const input = html.take(root).input.className('odoo-search').attr('placeholder', this.def.placeholder || 'Search…').attr('aria-label', 'Search').value(this.state.search || '').getContext() as HTMLInputElement;
    input.setAttribute('aria-label', 'Search');
    input.addEventListener('input', () => { this.state.search = input.value; });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') void this.submit('search', { query: input.value });
    });

    for (const label of this.def.filters || ['Filters', 'Group By', 'Favorites']) {
      const store = label === 'Favorites' ? new FavoritesStore(this.def.favoriteKey || `core3:favorites:${this.id}`) : null;
      const button = html.take(root).button.className('odoo-button filter').type('button').text(`${label}${store?.list().length ? ` (${store.list().length})` : ''}`).getContext();
      if (label === 'Favorites') {
        button.addEventListener('click', () => {
          const name = window.prompt('Save current filter as', input.value || 'My filter');
          if (name?.trim()) void this.submit('control', { control: 'favorite_saved', favorite: store.save({ label: name.trim(), search: input.value }) });
        });
        for (const favorite of store.list()) {
          const saved = html.take(root).button.className('odoo-button favorite').type('button').text(favorite.label).getContext();
          saved.addEventListener('click', () => void this.submit('control', { control: 'favorite_apply', favorite }));
        }
      } else button.addEventListener('click', () => void this.submit('control', { control: label }));
    }

    this.addSelect(root, 'Filter', this.def.filterOptions, 'filter');
    this.addSelect(root, 'Group By', this.def.groupOptions, 'group');
    this.addSelect(root, 'Sort', this.def.sortOptions, 'sort');

    const viewModes = html.take(root).div.className('odoo-view-modes').getContext();
    for (const view of this.def.views || []) {
      const button = html.take(viewModes).button.className(`odoo-button ${view === this.def.activeView ? 'selected' : 'view'}`).type('button').text(view).getContext();
      button.addEventListener('click', () => void this.submit('view', { view, search: input.value }));
    }
  }

  private addSelect(root: HTMLElement, label: string, options: Array<{ value: string; label: string }> | undefined, control: string) {
    if (!options?.length) return;
    const select = html.take(root).select.className('odoo-control-select').attr('aria-label', label).getContext() as HTMLSelectElement;
    html.take(select).option.attr('value', '').text(label);
    for (const option of options) html.take(select).option.attr('value', option.value).text(option.label);
    select.addEventListener('change', () => void this.submit('control', { control, value: select.value }));
  }
}
