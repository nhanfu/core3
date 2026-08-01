import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { appendIcon } from './Icon.ts';

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
      .getContext();

    const rowsEl = html.take(wrap).div.className('flex flex-col gap-2').getContext();

    filters.forEach((filter, idx) => {
      const row = html.take(rowsEl).div.className('flex gap-2 items-center').getContext();

      const fieldSel = html.take(row)
        .select.className('text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
        .getContext();
      html.take(fieldSel).option.value('').text('Field');
      for (const f of fields) {
        const opt = html.take(fieldSel).option.value(f).text(f).getContext();
        if (filter.field === f) opt.setAttribute('selected', '');
      }
      fieldSel.addEventListener('change', e => {
        const newFilters = this.state.filters.map((fil, i) => i === idx ? { ...fil, field: e.target.value } : fil);
        this.setState({ filters: newFilters }, false);
      });

      const opSel = html.take(row)
        .select.className('text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
        .getContext();
      for (const op of operators) {
        const opt = html.take(opSel).option.value(op).text(op).getContext();
        if (filter.operator === op) opt.setAttribute('selected', '');
      }
      opSel.addEventListener('change', e => {
        const newFilters = this.state.filters.map((fil, i) => i === idx ? { ...fil, operator: e.target.value } : fil);
        this.setState({ filters: newFilters }, false);
      });

      const valInp = html.take(row).input.type('text')
        .className('flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500')
        .value(filter.value || '')
        .getContext();
      valInp.addEventListener('input', e => {
        const newFilters = this.state.filters.map((fil, i) => i === idx ? { ...fil, value: e.target.value } : fil);
        this.setState({ filters: newFilters }, false);
      });

      const removeBtn = html.take(row).button
        .className('text-gray-400 hover:text-red-500 transition-colors text-xl leading-none px-1')
        .getContext();
      appendIcon(removeBtn, 'x');
      removeBtn.addEventListener('click', () => {
        const newFilters = this.state.filters.filter((_, i) => i !== idx);
        this.setState({ filters: newFilters });
      });
    });

    const actions = html.take(wrap).div.className('flex gap-2 pt-1').getContext();

    const addBtn = html.take(actions).button
      .className('text-sm px-3 py-1.5 border border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 rounded-md transition-colors')
      .text('+ Add Filter')
      .getContext();
    addBtn.addEventListener('click', () => {
      const newFilters = [...this.state.filters, { field: '', operator: 'equals', value: '' }];
      this.setState({ filters: newFilters });
    });

    const applyBtn = html.take(actions).button
      .className('ml-auto text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium')
      .text('Apply')
      .getContext();
    applyBtn.addEventListener('click', () => {
      this.submit('search.filter', { filters: this.state.filters });
    });
  }
}
