import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html, SvgTag } from '@core3/client/html';

export type GraphViewDefinition = { id: 'graph'; label: string; icon?: string; categoryField: string; measureField?: string; type?: 'bar' | 'line'; };

export class GraphView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: { view: GraphViewDefinition }) { super(id, state); }
  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const { categoryField, measureField, type = 'bar' } = this.options.view;
    const values = new Map<string, number>();
    for (const row of rows) { const key = String(row[categoryField] ?? '—'); values.set(key, (values.get(key) || 0) + (measureField ? Number(row[measureField]) || 0 : 1)); }
    const entries = [...values.entries()];
    const root = html.take(container).div.className('o-graph-view').getContext() as HTMLDivElement;
    if (!entries.length) { root.classList.add('o-analytics-empty'); html.take(root).text('No data'); return; }
    const max = Math.max(...entries.map(([, value]) => value), 1);
    const svg = html.take(root).svg(SvgTag.Svg).attr('viewBox', `0 0 ${Math.max(560, entries.length * 100)} 300`).attr('role', 'img').attr('aria-label', this.options.view.label).getContext() as SVGSVGElement;
    entries.forEach(([label, value], index) => {
      const x = 40 + index * 100; const height = (value / max) * 220;
      const shape = html.take(svg).svg(type === 'line' ? SvgTag.Circle : SvgTag.Rect)
        .attr('class', 'o-graph-mark').attr('data-category', label).attr('data-value', String(value))
        .attr('fill', 'currentColor').attr('x', String(x)).attr('y', String(250 - height))
        .attr('width', type === 'line' ? '8' : '64').attr('height', type === 'line' ? '8' : String(height));
      if (type === 'line') shape.attr('cx', String(x + 32)).attr('cy', String(250 - height)).attr('r', '5');
      html.take(svg).svg(SvgTag.Text).attr('x', String(x + 32)).attr('y', '275').attr('text-anchor', 'middle').text(label);
    });
  }
}
