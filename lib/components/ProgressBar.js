import { html } from '../html.js';
import { BaseComponent } from '../runtime.js';

export class ProgressBar extends BaseComponent {
  draw(container) {
    const { label, value = 0, max = 100, color = 'indigo' } = this.state;
    const pct = Math.min(100, Math.round((value / max) * 100));
    const barCls = {
      green: 'bg-green-500', teal: 'bg-teal-500', amber: 'bg-amber-500',
      red: 'bg-red-500', indigo: 'bg-indigo-500', blue: 'bg-blue-500',
    }[color] || 'bg-indigo-500';

    const card   = html.take(container).div.className('bg-white rounded-lg border border-gray-200 p-4').getContext();
    const header = html.take(card).div.className('flex items-center justify-between mb-2').getContext();
    html.take(header).span.className('text-sm font-medium text-gray-700').text(String(label ?? ''));
    html.take(header).span.className('text-sm font-semibold text-gray-900').text(`${pct}%`);

    const track = html.take(card).div.className('w-full bg-gray-100 rounded-full h-2.5').getContext();
    html.take(track).div.className(`${barCls} h-2.5 rounded-full transition-all duration-700`).style(`width: ${pct}%`);
  }
}
