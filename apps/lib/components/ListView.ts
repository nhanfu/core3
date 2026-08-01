import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendBadge } from './helpers.ts';

export class ListView extends BaseComponent {
  constructor(id, state, defs = []) {
    super(id, state);
    this.defs = defs;
  }

  draw(container) {
    const { items = [], loading = false } = this.state;

    if (loading) {
      for (let i = 0; i < 3; i++) {
        const card = html.take(container).div.className('bg-white rounded-lg border border-gray-200 p-4 space-y-2 animate-pulse').getContext();
        html.take(card).div.className('h-4 bg-gray-100 rounded w-1/3');
        html.take(card).div.className('h-3 bg-gray-100 rounded w-2/3');
      }
      return;
    }

    if (!items.length) {
      html.take(container).div.className('py-8 text-center text-sm text-gray-400').text('No items');
      return;
    }

    const primaryDef   = this.defs[0];
    const secondaryDef = this.defs.find(d => d.secondary);
    const badgeDef     = this.defs.find(d => d.type === 'BadgeCell');
    const list         = html.take(container).div.className('flex flex-col gap-2').getContext();

    for (const item of items) {
      const row     = html.take(list).div.className('bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer').div.className('flex items-start justify-between gap-3').getContext();
      const textCol = html.take(row).div.getContext();
      if (primaryDef)   html.take(textCol).p.className('text-sm font-medium text-gray-900').text(String(item[primaryDef.field] ?? ''));
      if (secondaryDef) html.take(textCol).p.className('text-xs text-gray-500 mt-0.5').text(String(item[secondaryDef.field] ?? ''));
      if (badgeDef) appendBadge(row, item[badgeDef.field], null);
    }
  }
}
