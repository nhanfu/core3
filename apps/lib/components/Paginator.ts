import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class Paginator extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { page: 1, total: 0, pageSize: 25 });
    this.def = def;
  }

  draw(container) {
    const { page = 1, total = 0, pageSize = 25 } = this.state;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startN = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endN = Math.min(page * pageSize, total);

    const wrap = html.take(container).div.className('flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-white').getContext();
    html.take(wrap).span.className('text-sm text-gray-600').text(`${startN}–${endN} of ${total}`);

    const ctrl = html.take(wrap).div.className('flex items-center gap-2').getContext();

    const prevBtn = html.take(ctrl)
      .button.className('px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed')
      .text('← Prev')
      .getContext();
    if (page <= 1) prevBtn.setAttribute('disabled', '');

    html.take(ctrl).span.className('text-sm text-gray-500 px-1').text(`${page} / ${totalPages}`);

    const nextBtn = html.take(ctrl)
      .button.className('px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed')
      .text('Next →')
      .getContext();
    if (page >= totalPages) nextBtn.setAttribute('disabled', '');

    prevBtn.addEventListener('click', () => {
      const p = this.state.page || 1;
      if (p > 1) this.submit('page.change', { page: p - 1 });
    });
    nextBtn.addEventListener('click', () => {
      const p = this.state.page || 1;
      const tot = this.state.total || 0;
      const ps = this.state.pageSize || 25;
      const tp = Math.ceil(tot / ps);
      if (p < tp) this.submit('page.change', { page: p + 1 });
    });
  }
}
