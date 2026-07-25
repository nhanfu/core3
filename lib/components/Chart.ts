import { html } from '../html.ts';
import { BaseComponent } from '../runtime.ts';

export class Chart extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { data = [], labels = [], title = '' } = this.state;
    const { width = 400, height = 200, color = '#6366f1' } = this.def;

    const wrap = html.take(container).div.className('flex flex-col items-start gap-2').getContext();

    if (title) {
      html.take(wrap).h3.className('text-sm font-semibold text-gray-700').text(title);
    }

    const canvasEl = html.take(wrap)
      .canvas
      .attr('width', String(width))
      .attr('height', String(height))
      .className('rounded border border-gray-200 bg-white')
      .getContext();

    if (!data.length) return;

    const ctx = canvasEl.getContext('2d');
    const max = Math.max(...data, 1);
    const barCount = data.length;
    const pad = { top: 16, bottom: 24, left: 8, right: 8 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const barGap = 4;
    const barW = (chartW - barGap * (barCount - 1)) / barCount;

    ctx.clearRect(0, 0, width, height);

    data.forEach((val, i) => {
      const barH = (val / max) * chartH;
      const x = pad.left + i * (barW + barGap);
      const y = pad.top + chartH - barH;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);

      if (labels[i] != null) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(labels[i]), x + barW / 2, height - 6);
      }
    });
  }
}
