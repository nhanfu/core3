import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
import { formatDate } from './helpers.js';

export class DateCell extends BaseComponent {
  draw(container) {
    const { value, format = 'short', overdue = false } = this.state;
    const cls = overdue ? 'text-sm text-red-600 font-medium' : 'text-sm text-gray-900';
    html.take(container).span.className(cls).text(formatDate(value, format));
  }
}
