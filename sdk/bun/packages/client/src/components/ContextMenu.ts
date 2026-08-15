import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class ContextMenu extends BaseComponent {
  constructor(id, state, items = []) {
    super(id, state || { open: false, x: 0, y: 0 });
    this.items = items;
    this._outsideHandler = null;
  }

  draw(container) {
    const { open = false, x = 0, y = 0 } = this.state;

    if (this._outsideHandler) {
      html.take(document).off('click', this._outsideHandler);
      this._outsideHandler = null;
    }

    if (!open) return;

    const menu = html.take(container)
      .div.className('fixed z-50 min-w-max bg-white border border-gray-200 rounded-lg shadow-lg py-1')
      .ele();

    html.take(menu).css('left', `${x}px`).css('top', `${y}px`);

    for (const item of this.items) {
      const row = html.take(menu)
        .button.className('w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100')
        .ele();

      if (item.icon) html.take(row).span.className('text-base leading-none').text(item.icon);
      html.take(row).text(item.label);

      html.take(row).event('click', (e) => {
        e.stopPropagation();
        this.setState({ open: false });
        this.submit(item.id, {});
      });
    }

    this._outsideHandler = () => this.setState({ open: false });
    html.take(document).event('click', this._outsideHandler, { once: true });
  }
}
