import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

export type MapViewDefinition = { id: 'map'; label: string; icon?: string; labelField: string; subtitleField?: string; latitudeField?: string; longitudeField?: string; };

export class MapView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: { view: MapViewDefinition; openAction?: string; rowKey?: string }) { super(id, state); }
  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const view = this.options.view; const root = html.take(container).section.className('o-map-view').getContext() as HTMLElement;
    const map = html.take(root).div.className('o-map-canvas').attr('role', 'application').attr('aria-label', view.label).getContext() as HTMLDivElement;
    const hasCoordinates = Boolean(view.latitudeField && view.longitudeField);
    rows.forEach((row, index) => { const marker = html.take(map).button.type('button').className('o-map-marker').dataAttr('row-id', String(row[this.options.rowKey || 'id'] ?? index)).attr('title', String(row[view.labelField] ?? '')).text(String(index + 1)).getContext() as HTMLButtonElement; if (hasCoordinates) { const lat = Number(row[view.latitudeField!]); const lon = Number(row[view.longitudeField!]); html.take(marker).css('left', `${Math.min(94, Math.max(4, (lon + 180) / 360 * 100))}%`).css('top', `${Math.min(94, Math.max(4, (90 - lat) / 180 * 100))}%`); } else { html.take(marker).css('left', `${8 + (index % 8) * 12}%`).css('top', `${18 + Math.floor(index / 8) * 16}%`); } if (this.options.openAction) html.take(marker).event('click', () => void this.submit(this.options.openAction!, { row })); });
    const list = html.take(root).div.className('o-map-results').getContext() as HTMLDivElement;
    for (const row of rows) { const item = html.take(list).button.type('button').className('o-map-result').text(`${String(row[view.labelField] ?? '—')}${view.subtitleField && row[view.subtitleField] ? ` · ${String(row[view.subtitleField])}` : ''}`).getContext() as HTMLButtonElement; if (this.options.openAction) html.take(item).event('click', () => void this.submit(this.options.openAction!, { row })); }
    if (!rows.length) html.take(root).text('No locations');
  }
}
