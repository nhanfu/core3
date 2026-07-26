import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';
import { fmtCurrency, fmtNumber } from './helpers.ts';

export class StatCard extends BaseComponent {
  draw(container) {
    const { label, value, format = null, currency = 'USD', delta = null, trend = null, color = 'indigo' } = this.state;

    let displayValue = value;
    if (format === 'currency') displayValue = fmtCurrency(value, currency);
    else if (format === 'number') displayValue = fmtNumber(value);
    else if (format === 'percent') displayValue = value + '%';

    const borderCls = {
      green: 'border-green-200', amber: 'border-amber-200', red: 'border-red-200',
      indigo: 'border-indigo-200', blue: 'border-blue-200',
    }[color] || 'border-gray-200';

    const card = html.take(container).div.className(`bg-white rounded-xl border ${borderCls} p-5 flex flex-col`).getContext();
    html.take(card).p.className('text-sm font-medium text-gray-500').text(String(label ?? ''));
    html.take(card).p.className('mt-2 text-3xl font-bold text-gray-900 tabular-nums').text(String(displayValue ?? '—'));

    if (trend) {
      const trendDiv = html.take(card).div.className(`flex items-center gap-1 mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`).getContext();
      html.take(trendDiv).span.text(trend === 'up' ? '↑' : '↓');
      html.take(trendDiv).span.className('text-xs font-medium').text(String(delta ?? ''));
    }
  }
}
