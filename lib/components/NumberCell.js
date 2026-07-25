import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
import { fmtNumber } from './helpers.js';

export class NumberCell extends BaseComponent {
  draw(container) {
    const { value, format = 'number' } = this.state;
    if (value == null) {
      html.take(container).span.className('text-sm text-gray-400').text('—');
    } else {
      html.take(container).span.className('text-sm text-gray-900 tabular-nums').text(fmtNumber(value, format));
    }
  }
}
