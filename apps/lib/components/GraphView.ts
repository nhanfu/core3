import { BaseComponent } from './BaseComponent.ts';

export type GraphViewDefinition = { id: 'graph'; label: string; icon?: string; categoryField: string; measureField?: string; type?: 'bar' | 'line'; };

export class GraphView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: { view: GraphViewDefinition }) { super(id, state); }
  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const { categoryField, measureField, type = 'bar' } = this.options.view;
    const values = new Map<string, number>();
    for (const row of rows) { const key = String(row[categoryField] ?? '—'); values.set(key, (values.get(key) || 0) + (measureField ? Number(row[measureField]) || 0 : 1)); }
    const entries = [...values.entries()];
    const root = document.createElement('div'); root.className = 'o-graph-view';
    if (!entries.length) { root.textContent = 'No data'; root.classList.add('o-analytics-empty'); container.appendChild(root); return; }
    const max = Math.max(...entries.map(([, value]) => value), 1);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${Math.max(560, entries.length * 100)} 300`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', this.options.view.label);
    entries.forEach(([label, value], index) => { const x = 40 + index * 100; const height = (value / max) * 220; const shape = document.createElementNS(svg.namespaceURI, type === 'line' ? 'circle' : 'rect'); shape.setAttribute('class', 'o-graph-mark'); shape.setAttribute('data-category', label); shape.setAttribute('data-value', String(value)); shape.setAttribute('fill', 'currentColor'); shape.setAttribute('x', String(x)); shape.setAttribute('y', String(250 - height)); shape.setAttribute('width', type === 'line' ? '8' : '64'); shape.setAttribute('height', type === 'line' ? '8' : String(height)); if (type === 'line') { shape.setAttribute('cx', String(x + 32)); shape.setAttribute('cy', String(250 - height)); shape.setAttribute('r', '5'); } svg.appendChild(shape); const text = document.createElementNS(svg.namespaceURI, 'text'); text.setAttribute('x', String(x + 32)); text.setAttribute('y', '275'); text.setAttribute('text-anchor', 'middle'); text.textContent = label; svg.appendChild(text); });
    root.appendChild(svg); container.appendChild(root);
  }
}
