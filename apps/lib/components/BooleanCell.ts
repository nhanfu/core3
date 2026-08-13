import { html } from '@core3/client/html';
import { BaseComponent } from './BaseComponent.ts';

export class BooleanCell extends BaseComponent {
  draw(container) {
    if (this.state.value) {
      html.take(container).span.className('text-green-600 text-sm font-medium').text('✓');
    } else {
      html.take(container).span.className('text-gray-400 text-sm').text('—');
    }
  }
}
