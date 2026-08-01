import { html } from '../html.ts';
import { BaseComponent } from './BaseComponent.ts';

export class ActionButton extends BaseComponent {
  constructor(id, state, actions = []) {
    super(id, state || { open: false });
    this.actions = actions;
    this.def = {};
  }

  draw(container) {
    const { open = false } = this.state;
    const wrap = html.take(container).div.className('relative inline-block').getContext();

    html.take(wrap)
      .button.className('inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 shadow-sm')
      .text(this.def.label || '⋮')
      .event('click', (e) => {
        e.stopPropagation();
        this.setState({ open: !this.state.open });
      });

    if (open) {
      const dropdown = html.take(wrap)
        .div.className('absolute right-0 mt-1 z-30 min-w-max bg-white border border-gray-200 rounded-lg shadow-lg py-1')
        .getContext();

      for (const action of this.actions) {
        const variantCls = action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100';
        html.take(dropdown)
          .button.className(`w-full text-left px-4 py-2 text-sm ${variantCls}`)
          .text(action.label)
          .event('click', (e) => {
            e.stopPropagation();
            this.setState({ open: false });
            this.submit(action.id, {});
          });
      }

      document.addEventListener('click', () => this.setState({ open: false }), { once: true });
    }
  }
}
