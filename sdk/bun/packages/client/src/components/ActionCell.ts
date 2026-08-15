import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon, hasIcon } from '@core3/client/components/Icon';

export class ActionCell extends BaseComponent {
  draw(container) {
    const { actions = [], row = {} } = this.state;
    const wrap = html.take(container).div.className('flex gap-3').ele();
    for (const a of actions) {
      const cls = {
        primary: 'text-indigo-600 hover:text-indigo-900',
        danger:  'text-red-600 hover:text-red-900',
        ghost:   'text-gray-400 hover:text-gray-600',
      }[a.variant] || 'text-gray-600 hover:text-gray-900';
      const button = html.take(wrap)
        .button.className(`text-sm font-medium ${cls} transition-colors`)
        .dataAttr('action-id', a.id)
        .event('click', () => {
          const { onAction, row: r } = this.state;
          if (typeof onAction === 'function') {
            onAction(a.id, r);
          } else {
            this.submit(a.id, { row: r });
          }
        })
        .ele();
      if (a.icon) {
        const icon = html.take(button).span.attr('aria-hidden', 'true').ele() as HTMLSpanElement;
        if (hasIcon(a.icon)) appendIcon(icon, a.icon);
        else html.take(icon).replaceText(a.icon);
      }
      html.take(button).text(a.label);
    }
  }
}
