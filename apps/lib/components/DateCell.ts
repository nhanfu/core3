import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { formatDate } from '@core3/client/components/helpers';

export class DateCell extends BaseComponent {
  draw(container) {
    const { value, format = 'short', overdue = false } = this.state;
    const cls = overdue ? 'text-sm text-red-600 font-medium' : 'text-sm text-gray-900';
    html.take(container).span.className(cls).text(formatDate(value, format));
  }
}
