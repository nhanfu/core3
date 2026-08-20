import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { fmtCurrency } from '@core3/client/components/helpers';

export class CurrencyCell extends BaseComponent {
  static resolveState(def: any, context: any) {
    const row = context.row || context;
    return { value: row[def.field || ''], currency: def.currency || 'USD' };
  }

  draw(container) {
    const { value, currency = 'USD' } = this.state;
    if (value == null) {
      html.take(container).span.className('text-sm text-gray-400').text('—');
    } else {
      html.take(container).span.className('text-sm text-gray-900 tabular-nums block text-right').text(fmtCurrency(value, currency));
    }
  }
}
