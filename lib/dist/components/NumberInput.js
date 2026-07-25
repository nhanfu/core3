import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
export class NumberInput extends BaseComponent {
    constructor(id, state, def = {}) {
        super(id, state);
        this.def = def;
    }
    draw(container) {
        const { value = '', error = null } = this.state;
        const d = this.def;
        const wrap = html.take(container).div.className('flex flex-col gap-1').getContext();
        if (d.label) {
            const lbl = html.take(wrap).label.className('text-sm font-medium text-gray-700').getContext();
            html.take(lbl).text(d.label);
            if (d.required)
                html.take(lbl).span.className('text-red-500').text(' *');
        }
        const borderCls = error ? 'border-red-500' : 'border-gray-300';
        const inp = html.take(wrap)
            .input.type('number')
            .className(`w-full px-3 py-2 text-sm border ${borderCls} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white`)
            .value(String(value ?? ''))
            .getContext();
        if (d.min != null)
            inp.setAttribute('min', String(d.min));
        if (d.max != null)
            inp.setAttribute('max', String(d.max));
        if (d.step != null)
            inp.setAttribute('step', String(d.step));
        inp.addEventListener('input', e => this.setState({ value: e.target.valueAsNumber, error: null }, false));
        if (error)
            html.take(wrap).span.className('text-xs text-red-600').text(error);
    }
}
