export type FavoriteFilter = { id: string; label: string; search?: string; filter?: string; groupBy?: string; sort?: string };

/** Small browser-backed store used by any action control panel. */
export class FavoritesStore {
  constructor(private readonly key: string) {}

  list(): FavoriteFilter[] {
    try { return JSON.parse(window.localStorage.getItem(this.key) || '[]'); } catch { return []; }
  }

  save(filter: Omit<FavoriteFilter, 'id'>) {
    const items = this.list().filter(item => item.label !== filter.label);
    items.unshift({ ...filter, id: `${Date.now()}` });
    window.localStorage.setItem(this.key, JSON.stringify(items.slice(0, 12)));
    return items[0];
  }

  remove(id: string) {
    window.localStorage.setItem(this.key, JSON.stringify(this.list().filter(item => item.id !== id)));
  }
}
