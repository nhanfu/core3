import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { fmtNumber } from '@core3/client/components/helpers';

export class NumberCell extends BaseComponent {
  static resolveState(def: any, context: any) {
    const row = context.row || context;
    return { value: row[def.field || ''], format: def.format || 'number' };
  }

  draw(container) {
    const { value, format = 'number' } = this.state;
    if (value == null) {
      html.take(container).span.className('text-sm text-gray-400').text('—');
    } else {
      html.take(container).span.className('text-sm text-gray-900 tabular-nums').text(fmtNumber(value, format));
    }
  }
}
