import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class BooleanCell extends BaseComponent {
  draw(container) {
    if (this.state.value) {
      html.take(container).span.className('text-green-600 text-sm font-medium').text('✓');
    } else {
      html.take(container).span.className('text-gray-400 text-sm').text('—');
    }
  }
}
