import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');
const yaml = (relative: string) => Bun.YAML.parse(read(relative)) as any;

describe('Purchase Analysis graph and pivot parity', () => {
  test('keeps the report page layout-only and joins its API by page id', () => {
    const page = yaml('services/purchase/pages/analysis.yaml');
    const api = yaml('services/purchase/api/analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const source = api.datasources.find((datasource: any) => datasource.id === 'purchase_analysis');

    expect(page.page.id).toBe('purchase-analysis');
    expect(api.page.id).toBe('purchase-analysis');
    expect(page.datasources).toBeUndefined();
    expect(list.source).toBe('purchase_analysis');
    expect(list.views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(source.pivot.fields).toContain('untaxed_total');
    expect(source.query).toContain('confirmation_month');
    expect(source.query).toContain(':q');
  });

  test('matches the Odoo report controls and deterministic empty-state contract', () => {
    const page = yaml('services/purchase/pages/analysis.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    const graph = list.views.find((view: any) => view.id === 'graph');
    const pivot = list.views.find((view: any) => view.id === 'pivot');

    expect(graph).toMatchObject({ label: 'Graph', category_field: 'confirmation_date', measure_field: 'untaxed_total', type: 'line' });
    expect(pivot.pivot.default).toMatchObject({ rows: ['confirmation_month'], columns: ['state'] });
    expect(pivot.pivot.default.measures.map((measure: any) => measure.field)).toEqual(['untaxed_total', 'quantity']);
    expect(list.empty_state).toMatchObject({ title: 'No purchase analysis records' });
    expect(list.columns.map((column: any) => column.label)).toEqual([
      'Order', 'Confirmation Date', 'Vendor', 'Product', 'Ordered Quantity',
      'Received Quantity', 'Untaxed Total', 'Status',
    ]);
  });
});
