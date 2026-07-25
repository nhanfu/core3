import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class ActionCell extends BaseComponent {
  draw(container) {
    const { actions = [], row = {} } = this.state;
    const wrap = html.take(container).div.className('flex gap-3').getContext();
    for (const a of actions) {
      const cls = {
        primary: 'text-indigo-600 hover:text-indigo-900',
        danger:  'text-red-600 hover:text-red-900',
        ghost:   'text-gray-400 hover:text-gray-600',
      }[a.variant] || 'text-gray-600 hover:text-gray-900';
      html.take(wrap)
        .button.className(`text-sm font-medium ${cls} transition-colors`)
        .dataAttr('action-id', a.id)
        .text(a.label)
        .event('click', () => {
          const { onAction, row: r } = this.state;
          if (typeof onAction === 'function') {
            onAction(a.id, r);
          } else {
            this.submit(a.id, { row: r });
          }
        });
    }
  }
}
