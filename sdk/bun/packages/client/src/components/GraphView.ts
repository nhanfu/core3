import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html, SvgTag } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';

export type GraphViewDefinition = { id: 'graph'; label: string; icon?: string; categoryField: string; measureField?: string; measureLabel?: string; type?: 'bar' | 'line'; };

export class GraphView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: { view: GraphViewDefinition; emptyState?: { title?: string; description?: string } }) { super(id, state); }
  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const { categoryField, measureField, measureLabel, type = 'bar' } = this.options.view;
    const values = new Map<string, number>();
    for (const row of rows) { const key = String(row[categoryField] ?? '—'); values.set(key, (values.get(key) || 0) + (measureField ? Number(row[measureField]) || 0 : 1)); }
    const entries = [...values.entries()];
    const root = html.take(container).div.className('o-graph-view').ele() as HTMLDivElement;
    if (!entries.length) {
      html.take(root).toggleClass('o-analytics-empty', true);
      const empty = this.options.emptyState || {};
      html.take(root).h3.replaceText(empty.title || i18n.tKey('analytics.no_data', {}, 'No data'));
      if (empty.description) html.take(root).p.replaceText(empty.description);
      return;
    }
    const isMobile = root.clientWidth <= 700 || (globalThis as any).window?.innerWidth <= 700;
    const width = isMobile ? 360 : Math.max(760, entries.length * 100);
    const height = isMobile ? 600 : 340;
    const plotLeft = isMobile ? 40 : 64;
    const plotRight = isMobile ? 16 : 24;
    const plotTop = isMobile ? 76 : 64;
    const plotBottom = isMobile ? 492 : 260;
    const slot = (width - plotLeft - plotRight) / Math.max(entries.length, 1);
    const max = Math.max(...entries.map(([, value]) => value), 1);
    const svg = html.take(root).svg(SvgTag.Svg)
      .attr('class', isMobile ? 'is-mobile' : 'is-desktop')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', this.options.view.label)
      .ele() as SVGSVGElement;

    const legend = html.take(svg).svg(SvgTag.Group).attr('class', 'o-graph-legend').ele() as SVGGElement;
    html.take(legend).svg(SvgTag.Circle).attr('cx', String(plotLeft)).attr('cy', '28').attr('r', '5').attr('fill', 'currentColor');
    html.take(legend).svg(SvgTag.Text).attr('x', String(plotLeft + 14)).attr('y', '32').text(measureLabel || this.options.view.label);

    for (let tick = 0; tick <= 4; tick += 1) {
      const value = Math.round((max * tick) / 4);
      const y = plotBottom - ((max ? value / max : 0) * (plotBottom - plotTop));
      html.take(svg).svg(SvgTag.Line).attr('class', 'o-graph-gridline').attr('x1', String(plotLeft)).attr('x2', String(width - plotRight)).attr('y1', String(y)).attr('y2', String(y));
      html.take(svg).svg(SvgTag.Text).attr('class', 'o-graph-tick').attr('x', String(plotLeft - 10)).attr('y', String(y + 4)).attr('text-anchor', 'end').text(String(value));
    }

    if (type === 'line') {
      const points = entries.map(([, value], index) => {
        const x = plotLeft + (index + 0.5) * slot;
        const y = plotBottom - (value / max) * (plotBottom - plotTop);
        return `${x},${y}`;
      });
      const areaPoints = [...points, `${plotLeft + (entries.length - 0.5) * slot},${plotBottom}`, `${plotLeft + 0.5 * slot},${plotBottom}`].join(' ');
      html.take(svg).svg(SvgTag.Polygon).attr('class', 'o-graph-area').attr('points', areaPoints).attr('fill', 'currentColor').attr('opacity', '0.18');
      html.take(svg).svg(SvgTag.Polyline).attr('class', 'o-graph-line').attr('points', points.join(' ')).attr('fill', 'none').attr('stroke', 'currentColor').attr('stroke-width', '3');
    }
    entries.forEach(([label, value], index) => {
      const x = plotLeft + index * slot + slot * 0.18;
      const markWidth = type === 'line' ? 8 : Math.max(10, slot * (isMobile ? 0.52 : 0.64));
      const markHeight = (value / max) * (plotBottom - plotTop);
      const shape = html.take(svg).svg(type === 'line' ? SvgTag.Circle : SvgTag.Rect)
        .attr('class', 'o-graph-mark').attr('data-category', label).attr('data-value', String(value))
        .attr('fill', 'currentColor').attr('x', String(x)).attr('y', String(plotBottom - markHeight))
        .attr('width', type === 'line' ? '8' : String(markWidth)).attr('height', type === 'line' ? '8' : String(markHeight));
      if (type === 'line') shape.attr('cx', String(x + markWidth / 2)).attr('cy', String(plotBottom - markHeight)).attr('r', '5');
      const labelNode = html.take(svg).svg(SvgTag.Text).attr('class', 'o-graph-category').attr('x', String(x + markWidth / 2)).attr('text-anchor', 'middle').text(label);
      if (isMobile) labelNode.attr('y', String(plotBottom + 28)).attr('transform', `rotate(-55 ${x + markWidth / 2} ${plotBottom + 28})`);
      else labelNode.attr('y', String(plotBottom + 28));
    });
  }
}
