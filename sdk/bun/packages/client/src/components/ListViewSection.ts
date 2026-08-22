import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class ListViewSection extends BaseComponent {
  constructor(id, state, defs = []) {
    super(id, state);
    this.defs = defs;
  }

  draw(container) {
    const { sections = [] } = this.state;
    const primaryDef   = this.defs[0];
    const secondaryDef = this.defs[1];

    const wrap = html.take(container).div.className('flex flex-col gap-4').ele();

    for (const section of sections) {
      const sec = html.take(wrap).div.ele();
      html.take(sec).div
        .className('sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 rounded-md')
        .text(section.title || '');

      const list = html.take(sec).div.className('flex flex-col gap-1 mt-1').ele();
      for (const item of (section.items || [])) {
        const row     = html.take(list).div.className('bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer').div.className('flex items-start justify-between gap-3').ele();
        const textCol = html.take(row).div.ele();
        if (primaryDef)   html.take(textCol).p.className('text-sm font-medium text-gray-900').text(String(item[primaryDef.field] ?? ''));
        if (secondaryDef) html.take(textCol).p.className('text-xs text-gray-500 mt-0.5').text(String(item[secondaryDef.field] ?? ''));
      }
    }
  }
}
