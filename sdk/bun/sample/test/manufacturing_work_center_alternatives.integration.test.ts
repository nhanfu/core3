import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '..');
const service = join(root, 'services/manufacturing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(service, file), 'utf8')) as any;

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(service, 'migrations'), undefined, `manufacturing_work_center_alternatives_${crypto.randomUUID().replaceAll('-', '_')}`, ['schema', 'data']);
  return { database, repository };
}

describe('Manufacturing Work Center alternative orders parity slice', () => {
  test('maps action_work_order_alternatives to a page/API pair and conditional overview navigation', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/models/mrp_workcenter.py', 'utf8');
    const view = readFileSync('/home/nhanjs/projects/odoo/addons/mrp/views/mrp_workcenter_views.xml', 'utf8');
    const page = yaml('pages/work-center-alternative-orders.yaml');
    const api = yaml('api/work-center-alternative-orders.yaml');
    const overview = yaml('pages/work-center-overview.yaml');
    const overviewApi = yaml('api/work-center-overview.yaml');
    const discovered = discoverPages(root);

    expect(source).toContain('def action_work_order_alternatives(self):');
    expect(source).toContain("('workcenter_id', 'in', self.alternative_workcenter_ids.ids)");
    expect(source).toContain("('workcenter_id.alternative_workcenter_ids', '=', self.id)");
    expect(view).toContain('name="action_work_order_alternatives"');
    expect(view).toContain('<span>PLAN ORDERS</span>');
    expect(page.page).toMatchObject({ id: 'manufacturing-work-center-alternative-orders', route: '/manufacturing/work-centers/alternative-orders' });
    expect(page.datasources).toBeUndefined();
    expect(api.page).toEqual({ id: 'manufacturing-work-center-alternative-orders' });
    expect(api.datasources[1]).toMatchObject({ id: 'mrp_workcenter_alternative_workorders', permission: 'manufacturing.read', workflow: 'mrp_workorders' });
    expect(api.datasources[1].meta.source_action).toMatchObject({ external_id: 'mrp_workorder_todo', model: 'mrp.workorder', view_modes: ['list', 'kanban', 'form', 'calendar', 'pivot', 'graph'] });
    expect(api.datasources[1].error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(() => validatePageDefinition(api, { allowExternalSources: true })).not.toThrow();
    expect(() => validatePageDefinition({ ...page, actions: api.actions }, { allowExternalSources: true })).not.toThrow();
    expect(overview.components[0].columns.at(-1).actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_workcenter_alternatives', label: 'Plan Orders', show_if: 'row.workorder_count === 0' }),
    ]));
    expect(overviewApi.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'open_mrp_workcenter_alternatives', navigate_to: '/manufacturing/work-centers/alternative-orders', permission: 'manufacturing.read' }),
    ]));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/manufacturing/work-centers/alternative-orders', page: 'manufacturing-work-center-alternative-orders', module: 'manufacturing' }),
    ]));
  });

  test('returns the durable bidirectional alternative-center scope and filters it deterministically', async () => {
    const { database, repository } = await repositoryForTest();
    const source = yaml('api/work-center-alternative-orders.yaml').datasources[1];
    const params = { workcenter_id: 'workcenter-assembly-2', q: null, state: null, late: null, fixture_state: null };

    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.workcenter).sort()).toEqual(['Assembly 1', 'Assembly 1', 'Drill 1']);
    expect((await repository.querySource(source, { ...params, workcenter_id: 'workcenter-assembly-1' }, 0, 50)).data.map((row: any) => row.workcenter)).toEqual(['Assembly 2', 'Assembly 2']);
    expect((await repository.querySource(source, { ...params, q: 'Material replenishment' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['wo-blocked-001']);
    expect((await repository.querySource(source, { ...params, state: 'Ready' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'MRP_WORKCENTER_ALTERNATIVES_UNAVAILABLE' });
    database.close();
  });

  test('replays the alternative scope migration and preserves source workflow permissions', async () => {
    const { database, repository } = await repositoryForTest();
    const migration = readFileSync(join(service, 'migrations/20260922250000-031-work-center-alternatives.yaml'), 'utf8');
    const api = yaml('api/work-center-alternative-orders.yaml');
    expect(await repository.query("SELECT COUNT(*) AS count FROM mrp_workcenter_alternatives")).toEqual([{ count: 2 }]);
    expect(await repository.query("SELECT COUNT(*) AS count FROM duckdb_indexes() WHERE index_name = 'idx_mrp_workcenter_alternatives_scope'")).toEqual([{ count: 1 }]);
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    expect(api.actions.filter((action: any) => action.id !== 'view_mrp_alternative_workorder').every((action: any) => action.permission === 'manufacturing.write')).toBe(true);
    expect(api.actions.filter((action: any) => action.id !== 'view_mrp_alternative_workorder').map((action: any) => action.operation)).toEqual(['plan', 'start', 'pause', 'continue', 'block', 'cancel']);
    expect(api.actions.some((action: any) => ['create', 'update', 'delete'].includes(action.operation))).toBe(false);
    database.close();
  });
});
