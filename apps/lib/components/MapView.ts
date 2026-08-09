import { BaseComponent } from './BaseComponent.ts';

export type MapViewDefinition = { id: 'map'; label: string; icon?: string; labelField: string; subtitleField?: string; latitudeField?: string; longitudeField?: string; };

export class MapView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: { view: MapViewDefinition; openAction?: string; rowKey?: string }) { super(id, state); }
  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const view = this.options.view; const root = document.createElement('section'); root.className = 'o-map-view';
    const map = document.createElement('div'); map.className = 'o-map-canvas'; map.setAttribute('role', 'application'); map.setAttribute('aria-label', view.label);
    const hasCoordinates = Boolean(view.latitudeField && view.longitudeField);
    rows.forEach((row, index) => { const marker = document.createElement('button'); marker.type = 'button'; marker.className = 'o-map-marker'; marker.dataset.rowId = String(row[this.options.rowKey || 'id'] ?? index); marker.title = String(row[view.labelField] ?? ''); marker.textContent = String(index + 1); if (hasCoordinates) { const lat = Number(row[view.latitudeField!]); const lon = Number(row[view.longitudeField!]); marker.style.left = `${Math.min(94, Math.max(4, (lon + 180) / 360 * 100))}%`; marker.style.top = `${Math.min(94, Math.max(4, (90 - lat) / 180 * 100))}%`; } else { marker.style.left = `${8 + (index % 8) * 12}%`; marker.style.top = `${18 + Math.floor(index / 8) * 16}%`; } if (this.options.openAction) marker.addEventListener('click', () => void this.submit(this.options.openAction!, { row })); map.appendChild(marker); });
    root.appendChild(map); const list = document.createElement('div'); list.className = 'o-map-results';
    for (const row of rows) { const item = document.createElement('button'); item.type = 'button'; item.className = 'o-map-result'; item.textContent = `${String(row[view.labelField] ?? '—')}${view.subtitleField && row[view.subtitleField] ? ` · ${String(row[view.subtitleField])}` : ''}`; if (this.options.openAction) item.addEventListener('click', () => void this.submit(this.options.openAction!, { row })); list.appendChild(item); }
    root.appendChild(list); if (!rows.length) root.textContent = 'No locations'; container.appendChild(root);
  }
}
