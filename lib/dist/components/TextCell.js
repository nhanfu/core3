import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
export class TextCell extends BaseComponent {
    draw(container) {
        const { value, secondary } = this.state;
        if (secondary != null) {
            html.take(container).div.className('flex flex-col')
                .span.className('text-sm font-medium text-gray-900').text(String(value || '—')).end
                .span.className('text-xs text-gray-500 mt-0.5').text(String(secondary)).end;
        }
        else {
            html.take(container).span.className('text-sm text-gray-900').text(String(value || '—'));
        }
    }
}
