import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
export class EmptyState extends BaseComponent {
    draw(container) {
        const { title = 'No records', description = '', action = null } = this.state;
        const wrap = html.take(container).div
            .className('flex flex-col items-center justify-center py-12 px-4 w-full text-center')
            .getContext();
        html.take(wrap).div.className('text-5xl mb-4').text('📋');
        html.take(wrap).p.className('text-base font-semibold text-gray-900').text(String(title));
        if (description) {
            html.take(wrap).p.className('mt-1 text-sm text-gray-500').text(String(description));
        }
        if (action) {
            html.take(wrap).button
                .className('mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm')
                .text(String(action.label))
                .event('click', () => this.submit(action.id, {}));
        }
    }
}
