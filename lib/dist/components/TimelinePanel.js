import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';
import { appendBadge, formatDate } from './helpers.js';
export class TimelinePanel extends BaseComponent {
    draw(container) {
        const { events = [] } = this.state;
        const root = html.take(container).div.className('flow-root').getContext();
        const ul = html.take(root).ul.className('').getContext();
        events.forEach((event, i) => {
            const isLast = i === events.length - 1;
            const li = html.take(ul).li.className(`relative ${isLast ? '' : 'pb-6'}`).getContext();
            if (!isLast) {
                html.take(li).span
                    .className('absolute left-3 top-3 -ml-px h-full w-0.5 bg-gray-200')
                    .attr('aria-hidden', 'true');
            }
            const row = html.take(li).div.className('relative flex items-start gap-4').getContext();
            const dotWrap = html.take(row).div
                .className('relative flex h-6 w-6 flex-none items-center justify-center')
                .getContext();
            if (event.icon) {
                html.take(dotWrap).span.className('text-base leading-none').text(String(event.icon));
            }
            else {
                html.take(dotWrap).span
                    .className('h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white');
            }
            const content = html.take(row).div.className('min-w-0 flex-1').getContext();
            const header = html.take(content).div
                .className('flex items-center justify-between gap-2 mb-0.5')
                .getContext();
            const titleRow = html.take(header).div
                .className('flex items-center gap-2 flex-wrap')
                .getContext();
            html.take(titleRow).span
                .className('text-sm font-medium text-gray-900')
                .text(String(event.title || ''));
            if (event.badge) {
                appendBadge(titleRow, event.badge);
            }
            html.take(header).span
                .className('text-xs text-gray-400 whitespace-nowrap')
                .text(formatDate(event.timestamp, 'short'));
            if (event.description) {
                html.take(content).p
                    .className('text-sm text-gray-500')
                    .text(String(event.description));
            }
        });
    }
}
