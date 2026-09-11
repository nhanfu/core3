import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html, SvgTag } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';

export type GraphMeasureDefinition = { field?: string; label?: string; aggregate?: 'count' | 'sum' | 'avg' };
export type GraphSeriesDefinition = { value: string; label: string; color?: string };
export type GraphViewDefinition = {
  id: 'graph'; label: string; icon?: string; categoryField: string; measureField?: string; measureLabel?: string;
  dateField?: string; type?: 'bar' | 'line' | 'pie'; seriesField?: string; series?: GraphSeriesDefinition[]; measures?: GraphMeasureDefinition[]; showZeroData?: boolean;
};

type GraphDateRange = { from?: string; to?: string };

type Point = { category: string; value: number };
const SERIES_COLORS = ['blue', 'red', 'teal', 'amber', 'indigo', 'green'];

export class GraphView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: { view: GraphViewDefinition; emptyState?: { title?: string; description?: string }; dateRange?: GraphDateRange }) { super(id, state); }

  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const view = this.options.view;
    const measure = this.selectedMeasure(view);
    const categories = this.categories(rows, view);
    const series = this.seriesDefinitions(rows, view);
    const values = this.aggregate(rows, categories, series, view, measure);
    const root = html.take(container).div.className('o-graph-view').ele() as HTMLDivElement;
    this.drawToolbar(root, view, measure);
    if (!categories.length || (!view.showZeroData && !values.some(item => item.points.some(point => point.value !== 0)))) {
      html.take(root).toggleClass('o-analytics-empty', true);
      const empty = this.options.emptyState || {};
      html.take(root).h3.replaceText(empty.title || i18n.tKey('analytics.no_data', {}, 'No data'));
      if (empty.description) html.take(root).p.replaceText(empty.description);
      return;
    }

    const isMobile = root.clientWidth <= 700 || (globalThis as any).window?.innerWidth <= 700;
    const width = isMobile ? 360 : Math.max(760, Math.min(1400, categories.length * 72));
    const height = isMobile ? 600 : 380;
    const plotLeft = isMobile ? 40 : 64;
    const plotRight = isMobile ? 12 : 24;
    const legendColumns = isMobile ? 2 : Math.min(values.length, 4);
    const plotTop = (isMobile ? 76 : 54) + Math.max(0, Math.ceil(values.length / legendColumns) - 1) * 20;
    const plotBottom = isMobile ? 492 : 284;
    const slot = (width - plotLeft - plotRight) / Math.max(categories.length, 1);
    const max = Math.max(...values.flatMap(item => item.points.map(point => point.value)), 1);
    const chartType = this.state.chartType || view.type || 'bar';
    const svg = html.take(root).svg(SvgTag.Svg).attr('class', isMobile ? 'is-mobile' : 'is-desktop').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'img').attr('aria-label', view.label).ele() as SVGSVGElement;
    if (chartType === 'pie') {
      this.drawPie(svg, categories, values[0]?.points || [], isMobile, width, height);
      return;
    }
    this.drawLegend(svg, values, plotLeft, legendColumns, isMobile);
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = Math.round((max * tick) / 4);
      const y = plotBottom - ((max ? value / max : 0) * (plotBottom - plotTop));
      html.take(svg).svg(SvgTag.Line).attr('class', 'o-graph-gridline').attr('x1', String(plotLeft)).attr('x2', String(width - plotRight)).attr('y1', String(y)).attr('y2', String(y));
      html.take(svg).svg(SvgTag.Text).attr('class', 'o-graph-tick').attr('x', String(plotLeft - 10)).attr('y', String(y + 4)).attr('text-anchor', 'end').text(String(value));
    }
    values.forEach((item, index) => this.drawSeries(svg, item.points, item.color, chartType, plotLeft, plotBottom, plotTop, slot, max, index, values.length));
    categories.forEach((label, index) => {
      const x = plotLeft + (index + 0.5) * slot;
      const labelNode = html.take(svg).svg(SvgTag.Text).attr('class', 'o-graph-category').attr('x', String(x)).attr('text-anchor', 'middle').text(label);
      if (isMobile || categories.length > 20) labelNode.attr('y', String(plotBottom + 28)).attr('transform', `rotate(-55 ${x} ${plotBottom + 28})`);
      else labelNode.attr('y', String(plotBottom + 28));
    });
  }

  private categories(rows: Record<string, unknown>[], view: GraphViewDefinition) {
    const observed = [...new Set(rows.map(row => String(row[view.categoryField] ?? '—')))];
    if (!view.dateField || !this.options.dateRange?.from || !this.options.dateRange.to) return observed;
    const from = this.parseDate(this.options.dateRange.from);
    const to = this.parseDate(this.options.dateRange.to);
    if (!from || !to || from > to) return observed;
    const labels: string[] = [];
    for (const date = new Date(from); date <= to; date.setUTCDate(date.getUTCDate() + 1)) labels.push(this.formatDate(date));
    return labels.length ? labels : observed;
  }

  private parseDate(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : undefined;
  }

  private formatDate(date: Date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }

  private drawToolbar(root: HTMLElement, view: GraphViewDefinition, measure: GraphMeasureDefinition) {
    const toolbar = html.take(root).header.className('o-graph-toolbar').ele() as HTMLElement;
    const measures = view.measures?.length ? view.measures : [{ field: view.measureField, label: view.measureLabel || view.label, aggregate: 'sum' as const }];
    const details = html.take(toolbar).details.className('o-graph-measures').ele() as HTMLDetailsElement;
    html.take(details).summary.className('o-graph-measures-toggle').text('Measures');
    const menu = html.take(details).div.className('o-graph-measures-menu').ele();
    measures.forEach(candidate => {
      const button = html.take(menu).button.type('button').className(String(candidate.field || '') === String(measure.field || '') ? 'is-active' : '').dataAttr('graph-measure', candidate.field || 'count').text(candidate.label || candidate.field || 'Count').ele();
      html.take(button).event('click', () => { this.setState({ measureField: candidate.field }); details.open = false; });
    });
    const types = html.take(toolbar).div.className('o-graph-type-controls').attr('role', 'group').attr('aria-label', 'Chart type').ele();
    for (const type of ['bar', 'line', 'pie'] as const) {
      const label = type === 'line' ? 'Line chart' : type === 'pie' ? 'Pie chart' : 'Bar chart';
      const glyph = type === 'line' ? '╱' : type === 'pie' ? '◔' : '▥';
      const button = html.take(types).button.type('button').className((this.state.chartType || view.type || 'bar') === type ? 'is-active' : '').dataAttr('graph-type', type).attr('aria-label', label).text(glyph).ele();
      html.take(button).event('click', () => this.setState({ chartType: type }));
    }
  }

  private selectedMeasure(view: GraphViewDefinition) {
    const measures = view.measures?.length ? view.measures : [{ field: view.measureField, label: view.measureLabel || view.label, aggregate: 'sum' as const }];
    return measures.find(measure => String(measure.field || '') === String(this.state.measureField || view.measureField || '')) || measures[0];
  }

  private seriesDefinitions(rows: Record<string, unknown>[], view: GraphViewDefinition) {
    if (!view.seriesField) return [{ value: '__single__', label: view.measureLabel || view.label, color: 'indigo' }];
    if (view.series?.length) return view.series;
    return [...new Set(rows.map(row => this.seriesValue(row[view.seriesField!])))].map((value, index) => ({ value, label: value, color: SERIES_COLORS[index % SERIES_COLORS.length] }));
  }

  private aggregate(rows: Record<string, unknown>[], categories: string[], series: GraphSeriesDefinition[], view: GraphViewDefinition, measure: GraphMeasureDefinition) {
    return series.map((definition, seriesIndex) => {
      const buckets = new Map<string, { sum: number; count: number }>();
      rows.filter(row => !view.seriesField || this.seriesValue(row[view.seriesField]) === definition.value).forEach(row => {
        const category = String(row[view.categoryField] ?? '—');
        const bucket = buckets.get(category) || { sum: 0, count: 0 };
        bucket.sum += measure.field ? Number(row[measure.field]) || 0 : 1;
        bucket.count += 1;
        buckets.set(category, bucket);
      });
      return { label: definition.label, color: definition.color || SERIES_COLORS[seriesIndex % SERIES_COLORS.length], points: categories.map(category => { const bucket = buckets.get(category) || { sum: 0, count: 0 }; return { category, value: measure.aggregate === 'avg' ? (bucket.count ? bucket.sum / bucket.count : 0) : measure.aggregate === 'count' ? bucket.count : bucket.sum }; }) };
    });
  }

  private drawLegend(svg: SVGSVGElement, values: Array<{ label: string; color: string }>, plotLeft: number, columns: number, mobile: boolean) {
    const legend = html.take(svg).svg(SvgTag.Group).attr('class', 'o-graph-legend').ele() as SVGGElement;
    const width = mobile ? 150 : 170;
    values.forEach((item, index) => {
      const x = plotLeft + (index % columns) * width;
      const y = 24 + Math.floor(index / columns) * 20;
      html.take(legend).svg(SvgTag.Circle).attr('cx', String(x)).attr('cy', String(y)).attr('r', '5').attr('fill', this.resolveColor(item.color));
      html.take(legend).svg(SvgTag.Text).attr('x', String(x + 12)).attr('y', String(y + 4)).text(item.label);
    });
  }

  private drawPie(svg: SVGSVGElement, categories: string[], points: Point[], mobile: boolean, width: number, height: number) {
    const palette = ['green', 'amber', 'red', 'blue', 'indigo', 'teal'];
    const positive = points.map(point => Math.max(0, point.value));
    const total = positive.reduce((sum, value) => sum + value, 0) || 1;
    const centerX = width * (mobile ? 0.37 : 0.36);
    const centerY = height * (mobile ? 0.38 : 0.52);
    const radius = Math.min(height * (mobile ? 0.24 : 0.42), width * 0.28);
    let angle = -Math.PI / 2;
    const group = html.take(svg).svg(SvgTag.Group).attr('class', 'o-graph-pie').ele() as SVGGElement;
    positive.forEach((value, index) => {
      const slice = (value / total) * Math.PI * 2;
      if (slice <= 0) return;
      const end = angle + slice;
      const startX = centerX + radius * Math.cos(angle);
      const startY = centerY + radius * Math.sin(angle);
      const endX = centerX + radius * Math.cos(end);
      const endY = centerY + radius * Math.sin(end);
      const path = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${slice > Math.PI ? 1 : 0} 1 ${endX} ${endY} Z`;
      html.take(group).svg(SvgTag.Path).attr('class', 'o-graph-pie-slice').attr('data-category', categories[index] || '—').attr('data-value', String(value)).attr('d', path).attr('fill', this.resolveColor(palette[index % palette.length]));
      angle = end;
    });
    const legend = html.take(svg).svg(SvgTag.Group).attr('class', 'o-graph-pie-legend').ele() as SVGGElement;
    const legendX = width * (mobile ? 0.08 : 0.67);
    const legendY = mobile ? height * 0.68 : 28;
    categories.forEach((label, index) => {
      const y = legendY + index * 22;
      html.take(legend).svg(SvgTag.Circle).attr('cx', String(legendX)).attr('cy', String(y - 4)).attr('r', '5').attr('fill', this.resolveColor(palette[index % palette.length]));
      html.take(legend).svg(SvgTag.Text).attr('x', String(legendX + 12)).attr('y', String(y)).text(`${label} (${positive[index] || 0})`);
    });
  }

  private drawSeries(svg: SVGSVGElement, points: Point[], color: string, chartType: string, plotLeft: number, plotBottom: number, plotTop: number, slot: number, max: number, seriesIndex: number, seriesCount: number) {
    const chartColor = this.resolveColor(color);
    if (chartType === 'line') {
      const coordinates = points.map((point, index) => `${plotLeft + (index + 0.5) * slot},${plotBottom - (point.value / max) * (plotBottom - plotTop)}`);
      const areaPoints = [...coordinates, `${plotLeft + (points.length - 0.5) * slot},${plotBottom}`, `${plotLeft + 0.5 * slot},${plotBottom}`].join(' ');
      html.take(svg).svg(SvgTag.Polygon).attr('class', 'o-graph-area').attr('points', areaPoints).attr('fill', chartColor).attr('opacity', '0.18');
      html.take(svg).svg(SvgTag.Polyline).attr('class', 'o-graph-line').attr('points', coordinates.join(' ')).attr('fill', 'none').attr('stroke', chartColor).attr('stroke-width', '2.5');
      points.forEach((point, index) => { const x = plotLeft + (index + 0.5) * slot; const y = plotBottom - (point.value / max) * (plotBottom - plotTop); html.take(svg).svg(SvgTag.Circle).attr('class', 'o-graph-mark').attr('data-series', color).attr('data-category', point.category).attr('data-value', String(point.value)).attr('cx', String(x)).attr('cy', String(y)).attr('r', '4').attr('fill', chartColor); });
      return;
    }
    const groupWidth = slot * 0.72;
    const barWidth = Math.max(4, groupWidth / Math.max(seriesCount, 1));
    points.forEach((point, index) => { const x = plotLeft + index * slot + (slot - groupWidth) / 2 + seriesIndex * barWidth; const height = (point.value / max) * (plotBottom - plotTop); html.take(svg).svg(SvgTag.Rect).attr('class', 'o-graph-mark').attr('data-series', color).attr('data-category', point.category).attr('data-value', String(point.value)).attr('x', String(x)).attr('y', String(plotBottom - height)).attr('width', String(Math.max(2, barWidth - 2))).attr('height', String(height)).attr('fill', chartColor); });
  }

  private seriesValue(value: unknown) { return value == null || value === '' ? 'None' : String(value); }

  private resolveColor(color: unknown) {
    const fallback: Record<string, string> = { blue: '#5b9bd5', red: '#e75b73', teal: '#45bcae', amber: '#f0a05a', indigo: '#71639e', green: '#55a868' };
    const key = String(color || '').trim();
    const token: Record<string, string> = { blue: '--color-primary', indigo: '--color-indigo', green: '--color-success', amber: '--color-warning', red: '--color-danger', teal: '--color-teal' };
    const value = token[key] && typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue(token[key]).trim() : '';
    return value || fallback[key] || key || fallback.indigo;
  }
}
