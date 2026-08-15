import { html } from '@core3/client/html';
import { BaseComponent } from '@core3/client/components/BaseComponent';

export class Chart extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { data = [], labels = [], series = [], title = '' } = this.state;
    const { width = 560, height = 240, color = 'indigo', variant = 'bar' } = this.def;
    const chartColor = this.resolveColor(color, '#6366f1');

    const wrap = html.take(container).div.className('chart flex flex-col items-start gap-2').getContext();

    if (title) {
      html.take(wrap).h3.className('text-sm font-semibold text-gray-700').text(title);
    }

    const canvasEl = html.take(wrap)
      .canvas
      .attr('width', String(width))
      .attr('height', String(height))
      .attr('role', 'img')
      .attr('aria-label', title || 'Biểu đồ')
      .className('rounded border border-gray-200 bg-white')
      .getContext();

    if (!data.length) {
      html.take(wrap).p.className('text-sm text-gray-400 py-8 w-full text-center').text('Không có dữ liệu biểu đồ');
      return;
    }

    const summary = series.length
      ? series.map(item => `${item.label}: ${item.data.map((value, index) => `${labels[index] ?? ''} ${value}`).join(', ')}`).join('; ')
      : labels.map((label, index) => `${label}: ${data[index]}`).join(', ');
    html.take(wrap).div.className('sr-only').attr('aria-live', 'polite').text(summary);

    const ctx = canvasEl.getContext('2d');
    if (variant === 'line' && series.length) {
      this.drawLineChart(ctx, width, height, labels, series, chartColor);
      return;
    }
    if (variant === 'pie') {
      this.drawPieChart(ctx, width, height, labels, data);
      return;
    }
    const values = data.map(value => Number(value) || 0);
    const max = Math.max(...values, 1);
    const barCount = data.length;
    const pad = { top: 16, bottom: 24, left: 8, right: 8 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const barGap = 4;
    const barW = (chartW - barGap * (barCount - 1)) / barCount;

    ctx.clearRect(0, 0, width, height);

    values.forEach((val, i) => {
      const barH = (val / max) * chartH;
      const x = pad.left + i * (barW + barGap);
      const y = pad.top + chartH - barH;

      ctx.fillStyle = chartColor;
      ctx.fillRect(x, y, barW, barH);

      if (labels[i] != null) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(labels[i]), x + barW / 2, height - 6);
      }
    });
  }

  private resolveColor(color: unknown, fallback: string) {
    const semantic: Record<string, string> = {
      blue: '--color-primary',
      indigo: '--color-indigo',
      green: '--color-success',
      amber: '--color-warning',
      red: '--color-danger',
      teal: '--color-teal',
    };
    const key = String(color || '').trim();
    const token = semantic[key];
    if (!token) return key || fallback;
    const value = typeof getComputedStyle === 'function'
      ? getComputedStyle(document.documentElement).getPropertyValue(token).trim()
      : '';
    return value || fallback;
  }

  private drawLineChart(ctx: CanvasRenderingContext2D, width: number, height: number, labels: string[], series: any[], fallbackColor: string) {
    const pad = { top: 18, right: 18, bottom: 30, left: 42 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const max = Math.max(...series.flatMap(item => item.data.map(Number)), 1);
    ctx.clearRect(0, 0, width, height);
    ctx.font = '10px sans-serif';
    ctx.strokeStyle = '#e5e7eb';
    ctx.fillStyle = '#6b7280';
    for (let step = 0; step <= 4; step++) {
      const y = pad.top + (chartH * step) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(String(Math.round(max * (4 - step) / 4)), 4, y + 3);
    }
    const pointStep = labels.length > 1 ? chartW / (labels.length - 1) : chartW;
    series.forEach((item, seriesIndex) => {
      const points = item.data.map((value: number, index: number) => ({
        x: pad.left + index * pointStep,
        y: pad.top + chartH - (Number(value) / max) * chartH,
      }));
      ctx.strokeStyle = item.color ? this.resolveColor(item.color, fallbackColor) : (seriesIndex === 0 ? fallbackColor : this.resolveColor('green', '#10b981'));
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      points.forEach(point => ctx.fillRect(point.x - 2, point.y - 2, 4, 4));
    });
    ctx.fillStyle = '#6b7280';
    labels.forEach((label, index) => {
      const x = pad.left + index * pointStep;
      ctx.textAlign = 'center';
      ctx.fillText(String(label), x, height - 8);
    });
  }

  private drawPieChart(ctx: CanvasRenderingContext2D, width: number, height: number, labels: string[], data: number[]) {
    const palette = ['green', 'amber', 'red', 'blue', 'indigo', 'teal'].map(color => this.resolveColor(color, '#6366f1'));
    const total = data.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) || 1;
    const radius = Math.min(height * 0.38, width * 0.28);
    const centerX = width * 0.36;
    const centerY = height * 0.52;
    let angle = -Math.PI / 2;
    ctx.clearRect(0, 0, width, height);
    data.forEach((value, index) => {
      const slice = (Math.max(0, Number(value) || 0) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = palette[index % palette.length];
      ctx.fill();
      angle += slice;
    });
    ctx.font = '11px sans-serif';
    labels.forEach((label, index) => {
      const y = 28 + index * 22;
      ctx.fillStyle = palette[index % palette.length];
      ctx.fillRect(width * 0.67, y - 9, 10, 10);
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} (${Number(data[index]) || 0})`, width * 0.71, y);
    });
  }
}
