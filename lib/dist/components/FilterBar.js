import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
export class FilterBar extends BaseComponent {
    constructor(id, state, filters = []) {
        super(id, state || { values: {} });
        this.filters = filters;
    }
    draw(container) {
        const { values = {} } = this.state;
        const bar = html.take(container).div.className('flex flex-wrap gap-4 items-end p-4 bg-white border border-gray-200 rounded-xl').getContext();
        for (const f of this.filters) {
            if (f.type === 'select') {
                const grp = html.take(bar).div.className('flex flex-col gap-1').getContext();
                html.take(grp).label.className('text-xs font-medium text-gray-500 uppercase tracking-wide').text(f.label);
                const sel = html.take(grp)
                    .select.className('px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[130px]')
                    .dataAttr('ff', f.field)
                    .getContext();
                html.take(sel).option.value('').text('All');
                for (const o of (f.options || [])) {
                    const opt = html.take(sel).option.value(String(o)).text(String(o)).getContext();
                    if (values[f.field] === o)
                        opt.setAttribute('selected', '');
                }
                sel.addEventListener('change', e => {
                    const newValues = { ...this.state.values, [f.field]: e.target.value };
                    this.setState({ values: newValues }, false);
                    this.submit('filter.change', { values: newValues });
                });
            }
            else if (f.type === 'search') {
                const grp = html.take(bar).div.className('flex flex-col gap-1').getContext();
                html.take(grp).label.className('text-xs font-medium text-gray-500 uppercase tracking-wide').text(f.label);
                const relWrap = html.take(grp).div.className('relative').getContext();
                html.take(relWrap).span.className('absolute inset-y-0 left-2.5 flex items-center text-gray-400 text-sm').text('⌕');
                const inp = html.take(relWrap)
                    .input.type('search')
                    .className('pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]')
                    .dataAttr('ff', f.field)
                    .value(String(values[f.field] || ''))
                    .getContext();
                if (f.placeholder)
                    inp.setAttribute('placeholder', f.placeholder);
                inp.addEventListener('input', e => {
                    const newValues = { ...this.state.values, [f.field]: e.target.value };
                    this.setState({ values: newValues }, false);
                    this.submit('filter.change', { values: newValues });
                });
            }
            else if (f.type === 'date-range') {
                const grp = html.take(bar).div.className('flex flex-col gap-1').getContext();
                html.take(grp).label.className('text-xs font-medium text-gray-500 uppercase tracking-wide').text(f.label);
                const rangeWrap = html.take(grp).div.className('flex gap-2 items-center').getContext();
                const inpFrom = html.take(rangeWrap).input.type('date').className('px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white').dataAttr('ff', f.field + '_from').value(String(values[f.field + '_from'] || '')).getContext();
                html.take(rangeWrap).span.className('text-gray-400 text-xs').text('→');
                const inpTo = html.take(rangeWrap).input.type('date').className('px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white').dataAttr('ff', f.field + '_to').value(String(values[f.field + '_to'] || '')).getContext();
                inpFrom.addEventListener('change', e => {
                    const newValues = { ...this.state.values, [f.field + '_from']: e.target.value };
                    this.setState({ values: newValues }, false);
                    this.submit('filter.change', { values: newValues });
                });
                inpTo.addEventListener('change', e => {
                    const newValues = { ...this.state.values, [f.field + '_to']: e.target.value };
                    this.setState({ values: newValues }, false);
                    this.submit('filter.change', { values: newValues });
                });
            }
        }
        const clearBtn = html.take(bar).button.className('self-end px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors').text('Clear').getContext();
        clearBtn.addEventListener('click', () => {
            this.setState({ values: {} });
            this.submit('filter.clear', {});
        });
    }
}
