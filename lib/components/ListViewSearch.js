import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
import { appendBadge } from './helpers.js';

export class ListViewSearch extends BaseComponent {
  constructor(id, state, defs = []) {
    super(id, state);
    this.defs = defs;
  }

  draw(container) {
    const { items = [], loading = false, query = '' } = this.state;

    const wrap = html.take(container).div.className('flex flex-col gap-3').getContext();

    const searchWrap = html.take(wrap).div.className('relative flex items-center').getContext();
    html.take(searchWrap).span.className('absolute left-2.5 text-gray-400 text-sm pointer-events-none select-none').text('⌕');
    const inp = html.take(searchWrap)
      .input.type('text')
      .className('w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
      .value(query)
      .getContext();
    inp.setAttribute('placeholder', 'Search…');
    inp.addEventListener('input', e => {
      this.setState({ query: e.target.value }, false);
      this.redraw();
    });

    if (loading) {
      for (let i = 0; i < 3; i++) {
        const card = html.take(wrap).div.className('bg-white rounded-lg border border-gray-200 p-4 space-y-2 animate-pulse').getContext();
        html.take(card).div.className('h-4 bg-gray-100 rounded w-1/3');
        html.take(card).div.className('h-3 bg-gray-100 rounded w-2/3');
      }
      return;
    }

    const primaryDef   = this.defs[0];
    const secondaryDef = this.defs.find(d => d.secondary);
    const badgeDef     = this.defs.find(d => d.type === 'BadgeCell');

    const q        = query.toLowerCase();
    const filtered = q
      ? items.filter(item => String(primaryDef ? (item[primaryDef.field] ?? '') : '').toLowerCase().includes(q))
      : items;

    if (!filtered.length) {
      html.take(wrap).div.className('py-8 text-center text-sm text-gray-400').text(q ? 'No matching items' : 'No items');
      return;
    }

    const list = html.take(wrap).div.className('flex flex-col gap-2').getContext();
    for (const item of filtered) {
      const row     = html.take(list).div.className('bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer').div.className('flex items-start justify-between gap-3').getContext();
      const textCol = html.take(row).div.getContext();
      if (primaryDef)   html.take(textCol).p.className('text-sm font-medium text-gray-900').text(String(item[primaryDef.field] ?? ''));
      if (secondaryDef) html.take(textCol).p.className('text-xs text-gray-500 mt-0.5').text(String(item[secondaryDef.field] ?? ''));
      if (badgeDef) appendBadge(row, item[badgeDef.field], null);
    }
  }
}
