import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';
import { fmtNumber } from './helpers.ts';

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
