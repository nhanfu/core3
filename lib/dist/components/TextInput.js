import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
export class TextInput extends BaseComponent {
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
        const borderCls = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500';
        const bgCls = d.readonly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white';
        const inp = html.take(wrap)
            .input.type('text')
            .className(`w-full px-3 py-2 text-sm border ${borderCls} rounded-md focus:outline-none focus:ring-2 ${bgCls}`)
            .value(String(value))
            .getContext();
        if (d.readonly)
            inp.setAttribute('readonly', '');
        if (d.placeholder)
            inp.setAttribute('placeholder', d.placeholder);
        if (!d.readonly)
            inp.addEventListener('input', e => this.setState({ value: e.target.value, error: null }, false));
        if (error)
            html.take(wrap).span.className('text-xs text-red-600').text(error);
    }
}
