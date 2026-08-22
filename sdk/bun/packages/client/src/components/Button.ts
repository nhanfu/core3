import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { appendIcon } from '@core3/client/components/Icon';

export class Button extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { loading = false, disabled = false } = this.state;
    const d = this.def;
    const variantCls = {
      primary:   'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm',
      secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm',
      danger:    'bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm',
      ghost:     'bg-transparent text-gray-600 border-transparent hover:bg-gray-100',
    }[d.variant] || 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm';
    const disabledCls = (loading || disabled) ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

    const btn = html.take(container)
      .button.className(`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors ${variantCls} ${disabledCls}${d.full_width ? ' btn-full' : ''}`)
      .ele();

    if (loading || disabled) html.take(btn).attr('disabled', '');
    if (loading) html.take(btn).span.className('animate-spin').text('⟳');
    if (d.icon && !loading) appendIcon(btn, d.icon);
    html.take(btn).text(d.label || '');

    if (!loading && !disabled) {
      html.take(btn).event('click', () => this.submit(d.action || 'click', d.params || {}));
    }
  }
}
