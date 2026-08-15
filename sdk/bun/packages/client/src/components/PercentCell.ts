import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { fmtNumber } from '@core3/client/components/helpers';

export class PercentCell extends BaseComponent {
  draw(container) {
    const { value = 0 } = this.state;
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    const barColor = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = pct >= 80 ? 'text-green-700' : pct >= 40 ? 'text-amber-700' : 'text-red-700';

    const wrap = html.take(container).div.className('flex flex-col gap-1').ele();
    html.take(wrap).span.className(`text-sm font-medium ${textColor}`).text(fmtNumber(pct, 'percent'));
    const track = html.take(wrap).div.className('w-full bg-gray-100 rounded-full h-1.5').ele();
    html.take(track).div.className(`${barColor} h-1.5 rounded-full`).style(`width: ${pct}%`);
  }
}
