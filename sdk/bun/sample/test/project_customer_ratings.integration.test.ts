import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/project');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;

describe('Project Customer Ratings parity', () => {
  test('registers the installed reporting action and keeps layout/API/detail pages separate', () => {
    const manifest = yaml('manifest.yaml');
    const reporting = manifest.menu.groups.find((group: any) => group.id === 'reporting');
    expect(reporting.items).toContainEqual({ path: '/customer-ratings', label: 'Customer Ratings', icon: 'star', permission: 'project.read' });

    const page = yaml('pages/customer-ratings.yaml');
    const api = yaml('api/customer-ratings.yaml');
    const detail = yaml('pages/customer-rating-detail.yaml');
    const detailApi = yaml('api/customer-rating-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.datasources).toBeUndefined();
    expect(page.page).toMatchObject({ id: 'project-customer-ratings', route: '/customer-ratings', auth: { require: ['project.read'] } });
    expect(api.page).toEqual({ id: 'project-customer-ratings' });
    expect(detail.page).toMatchObject({ id: 'project-customer-rating-detail', route: '/customer-ratings/detail' });
    expect(detailApi.page).toEqual({ id: 'project-customer-rating-detail' });
    expect(discovered.pages.get('project-customer-ratings')?.config.page.id).toBe('project-customer-ratings');
    expect(discovered.pageDatasources.get('project-customer-ratings')).toContain('project_customer_ratings');
    expect(discovered.pageDatasources.get('project-customer-rating-detail')).toContain('project_customer_rating_detail');
  });

  test('matches Odoo view order, labels, filters, measures, and read-only form contract', () => {
    const page = yaml('pages/customer-ratings.yaml');
    const list = page.components[0];
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['kanban', 'list', 'pivot', 'graph', 'form']);
    expect(list.default_filters).toEqual({ rated_on_period: 'last_30_days' });
    expect(list.filters[0]).toMatchObject({ field: 'rated_on_period', label: 'Rated On' });
    expect(list.views[2].pivot.default).toMatchObject({ rows: ['rated_partner_name'], columns: [] });
    expect(list.views[2].pivot.default.measures).toEqual([
      { field: 'id', aggregate: 'count', column: 'Count' },
      { field: 'rating', aggregate: 'avg', column: 'Rating (1-5)' },
    ]);
    expect(list.views[3]).toMatchObject({ category_field: 'rated_partner_name', measure_field: 'rating', measure_label: 'Rating (1-5)', type: 'bar' });
    expect(list.columns.map((column: any) => column.label)).toEqual(['Submitted on', 'Assigned to', 'Customer', 'Project', 'Task', 'Rating', 'Comment']);
    expect(list.form_view).toEqual({ page: 'apps/services/project/pages/customer-rating-detail.yaml', side_panel: false });
    expect(list.row_open_action).toBe('view_customer_rating');
    expect(page.actions).toEqual([{ id: 'view_customer_rating', type: 'navigate', permission: 'project.read', navigate_to: '/customer-ratings/detail', params: { id: '{row.id}' } }]);
    expect(yaml('pages/customer-rating-detail.yaml').components[0]).toMatchObject({ type: 'OdooFormView', source: 'project_customer_rating_detail', editable: false });
  });

  test('returns deterministic ratings, period/search/filter/empty states, and read-only errors', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'project_customer_ratings_test_migrations', ['schema', 'data']);
    const source = yaml('api/customer-ratings.yaml').datasources[0];
    const rows = await repository.querySource(source, { q: null, rating_text: null, rated_on_period: 'last_30_days', fixture_state: null }, 0, 50);
    expect(rows.data).toHaveLength(6);
    expect(rows.data.map((row: any) => row.id)).toEqual(['rating-demo-001', 'rating-demo-002', 'rating-demo-003', 'rating-demo-004', 'rating-demo-005', 'rating-demo-006']);
    expect(rows.data[0]).toMatchObject({ rated_partner_name: 'Mitchell Admin', res_name: 'Electricity', rating_text: 'ok' });
    expect(rows.data.every((row: any) => String(row.created_at).startsWith('2026-01-15'))).toBe(true);
    expect((await repository.querySource(source, { q: 'cables', rating_text: null, rated_on_period: 'last_30_days', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['rating-demo-001']);
    expect((await repository.querySource(source, { q: null, rating_text: 'top', rated_on_period: 'last_30_days', fixture_state: null }, 0, 50)).data.map((row: any) => row.id)).toEqual(['rating-demo-002', 'rating-demo-004', 'rating-demo-006']);
    expect((await repository.querySource(source, { q: null, rating_text: null, rated_on_period: 'empty', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = yaml('api/customer-rating-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'missing', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect(source.permission).toBe('project.read');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_CUSTOMER_RATINGS_UNAVAILABLE' });
    expect(detail.permission).toBe('project.read');
    expect(detail.error_states.transport_error).toMatchObject({ status: 503, code: 'PROJECT_CUSTOMER_RATING_DETAIL_UNAVAILABLE' });
    expect(yaml('api/customer-ratings.yaml').actions).toBeUndefined();
  });
});
