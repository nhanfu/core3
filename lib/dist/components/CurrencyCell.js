import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
import { fmtCurrency } from './helpers.js';
export class CurrencyCell extends BaseComponent {
    draw(container) {
        const { value, currency = 'USD' } = this.state;
        if (value == null) {
            html.take(container).span.className('text-sm text-gray-400').text('—');
        }
        else {
            html.take(container).span.className('text-sm text-gray-900 tabular-nums block text-right').text(fmtCurrency(value, currency));
        }
    }
}
