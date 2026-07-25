import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
export class LinkCell extends BaseComponent {
    draw(container) {
        const { value = '', href = '', external = false } = this.state;
        if (href) {
            const chain = html.take(container).a
                .className('text-indigo-600 hover:underline text-sm')
                .href(href)
                .text(String(value || '—'));
            if (external) {
                chain.attr('target', '_blank').attr('rel', 'noopener');
            }
        }
        else {
            html.take(container).span
                .className('text-indigo-600 hover:underline text-sm cursor-pointer')
                .text(String(value || '—'))
                .event('click', () => this.submit('link.click', { value }));
        }
    }
}
