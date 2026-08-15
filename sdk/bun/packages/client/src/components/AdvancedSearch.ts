import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';
import { i18n } from '@core3/client/i18n';

export class AdvancedSearch extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || { filters: [] });
    this.def = def;
  }

  draw(container) {
    const { filters = [] } = this.state;
    const { fields = ['name', 'status', 'date'] } = this.def;
    const operators = ['equals', 'contains', 'greater', 'less'];

    const wrap = html.take(container).div
      .className('flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-xl')
      .ele();

    const rowsEl = html.take(wrap).div.className('flex flex-col gap-2').ele();

    filters.forEach((filter, idx) => {
      const row = html.take(rowsEl).div.className('flex gap-2 items-center').ele();

      const fieldSel = html.take(row)
        .select.className('text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
        .ele();
      html.take(fieldSel).option.value('').text(i18n.tKey('search.field', {}, 'Field'));
      for (const f of fields) {
        const opt = html.take(fieldSel).option.value(f).text(f).ele();
        if (filter.field === f) html.take(opt).attr('selected', '');
      }
      html.take(fieldSel).event('change', e => {
        const newFilters = this.state.filters.map((fil, i) => i === idx ? { ...fil, field: e.target.value } : fil);
        this.setState({ filters: newFilters }, false);
      });

      const opSel = html.take(row)
        .select.className('text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
        .ele();
      for (const op of operators) {
        const opt = html.take(opSel).option.value(op).text(op).ele();
        if (filter.operator === op) html.take(opt).attr('selected', '');
      }
      html.take(opSel).event('change', e => {
        const newFilters = this.state.filters.map((fil, i) => i === idx ? { ...fil, operator: e.target.value } : fil);
        this.setState({ filters: newFilters }, false);
      });

      const valInp = html.take(row).input.type('text')
        .className('flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
        .value(filter.value || '')
        .ele();
      html.take(valInp).event('input', e => {
        const newFilters = this.state.filters.map((fil, i) => i === idx ? { ...fil, value: e.target.value } : fil);
        this.setState({ filters: newFilters }, false);
      });

      const removeBtn = html.take(row).button
        .className('text-gray-400 hover:text-red-500 transition-colors text-xl leading-none px-1')
        .ele();
      appendIcon(removeBtn, 'x');
      html.take(removeBtn).event('click', () => {
        const newFilters = this.state.filters.filter((_, i) => i !== idx);
        this.setState({ filters: newFilters });
      });
    });

    const actions = html.take(wrap).div.className('flex gap-2 pt-1').ele();

    const addBtn = html.take(actions).button
      .className('text-sm px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 rounded-md transition-colors')
      .text(`+ ${i18n.tKey('search.add_filter', {}, 'Add Filter')}`)
      .ele();
    html.take(addBtn).event('click', () => {
      const newFilters = [...this.state.filters, { field: '', operator: 'equals', value: '' }];
      this.setState({ filters: newFilters });
    });

    const applyBtn = html.take(actions).button
      .className('ml-auto text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium')
      .text(i18n.tKey('labels.apply', {}, 'Apply'))
      .ele();
    html.take(applyBtn).event('click', () => {
      this.submit('search.filter', { filters: this.state.filters });
    });
  }
}
