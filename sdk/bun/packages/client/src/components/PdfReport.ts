import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class PdfReport extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { title = '', rows = [], columns = [] } = this.state;
    const { showLogo = false } = this.def;

    const wrap = html.take(container)
      .div.className('flex flex-col items-center gap-4 p-6 bg-gray-100 print:p-0 print:bg-white')
      .ele();

    const page = html.take(wrap)
      .div
      .className('bg-white shadow-md print:shadow-none')
      .style('width:21cm;min-height:29.7cm;padding:2cm;box-sizing:border-box;')
      .ele();

    const header = html.take(page).div.className('mb-6 pb-4 border-b border-gray-200').ele();
    if (showLogo) {
      html.take(header).div.className('text-xs font-semibold text-gray-400 mb-2 tracking-widest').text('LOGO');
    }
    html.take(header).h3.className('text-xl font-bold text-gray-800').text(title);

    if (columns.length) {
      const tableWrap = html.take(page).div.className('overflow-x-auto').ele();
      const table = html.take(tableWrap).table.className('w-full text-sm border-collapse').ele();

      const thead = html.take(table).thead.ele();
      const headerRow = html.take(thead).trow.ele();
      columns.forEach(col => {
        html.take(headerRow).th
          .className('border border-gray-300 px-3 py-2 text-left font-semibold bg-gray-50 text-gray-700')
          .text(String(col));
      });

      const tbody = html.take(table).tbody.ele();
      rows.forEach(row => {
        const tr = html.take(tbody).trow.ele();
        columns.forEach(col => {
          html.take(tr).tdata
            .className('border border-gray-300 px-3 py-2 text-gray-600')
            .text(String(row[col] ?? ''));
        });
      });
    }

    const footer = html.take(wrap)
      .div.className('flex justify-center print:hidden')
      .ele();

    html.take(footer)
      .button
      .className('px-6 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition-colors shadow-sm')
      .text('Print')
      .event('click', () => window.print());
  }
}
