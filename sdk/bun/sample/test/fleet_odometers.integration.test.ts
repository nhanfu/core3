import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const source = (file: string, id: string) => yaml(`api/${file}`).datasources.find((item: any) => item.id === id);

describe('Fleet Odometers parity batch', () => {
  test('keeps Odometers pages presentation-only and API-owned by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    for (const [pageFile, pageId, apiFile, dataSourceId] of [
      ['pages/odometers.yaml', 'fleet-odometers', 'odometers.yaml', 'fleet_odometers'],
      ['pages/fleet-odometer-detail.yaml', 'fleet-odometer-detail', 'fleet-odometer-detail.yaml', 'fleet_odometer_detail'],
    ] as const) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(page.page.id, pageFile).toBe(pageId);
      expect(page.page.auth.require, pageFile).toEqual(['fleet.read']);
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(dataSourceId);
      expect(readdirSync(join(serviceRoot, 'api'))).toContain(apiFile);
    }
  });

  test('matches Odoo Odometers list, form, graph, grouping, and labels', () => {
    const page = yaml('pages/odometers.yaml');
    const list = page.components.find((component: any) => component.type === 'ListView');
    expect(list.view_navigation).toBe('tabs');
    expect(list.views.map((view: any) => view.id)).toEqual(['list', 'form', 'graph']);
    expect(list.views.map((view: any) => view.label)).toEqual(['List', 'Form', 'Graph']);
    expect(list.columns.map((column: any) => column.label)).toEqual(['Date', 'Vehicle', 'Driver', 'Odometer Value', 'Unit']);
    expect(list.group_by).toEqual([{ field: 'vehicle_name', label: 'Vehicle' }, { field: 'date', label: 'Date' }]);
    expect(list.form_view.page).toBe('apps/services/fleet/pages/fleet-odometer-detail.yaml');
    expect(yaml('pages/fleet-odometer-detail.yaml').components[0].groups[0].title).toBe('Odometer Logs');
    expect(yaml('pages/fleet-odometer-detail.yaml').components[0].groups[0].fields.map((field: any) => field.label))
      .toEqual(['Vehicle', 'Driver', 'Odometer Value', 'Unit', 'Date']);
  });

  test('seeds deterministic logs and supports search, vehicle filter, and empty fixture', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_odometer_test_schema_migrations', ['schema', 'data']);
    const odometers = source('odometers.yaml', 'fleet_odometers');
    const defaults = await repository.querySource(odometers, { q: null, vehicle_id: null, fixture_state: null }, 0, 50);
    expect(defaults.data).toHaveLength(8);
    expect(defaults.data.map((row: any) => row.id)).toEqual([
      'fleet-odometer-001', 'fleet-odometer-002', 'fleet-odometer-003', 'fleet-odometer-004',
      'fleet-odometer-005', 'fleet-odometer-006', 'fleet-odometer-007', 'fleet-odometer-008',
    ]);
    expect(defaults.data.every((row: any) => String(row.date).startsWith('2026-'))).toBe(true);
    expect((await repository.querySource(odometers, { q: 'Pool Vehicle', vehicle_id: null, fixture_state: null }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(odometers, { q: null, vehicle_id: 'fleet-demo-002', fixture_state: null }, 0, 50)).data).toHaveLength(4);
    expect((await repository.querySource(odometers, { q: null, vehicle_id: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = source('fleet-odometer-detail.yaml', 'fleet_odometer_detail');
    expect(await repository.querySource(detail, { id: 'fleet-odometer-001' }, 0, 1)).toMatchObject({ data: expect.objectContaining({ vehicle_name: 'Pool Vehicle 01', value: 7981 }) });
  });

  test('keeps CRUD relation and validation error contracts explicit', () => {
    const list = yaml('pages/odometers.yaml');
    const create = list.actions.find((action: any) => action.id === 'create_fleet_odometer');
    expect(create.permission).toBe('fleet.write');
    expect(create.mutation.required).toEqual(['vehicle_id', 'date', 'value']);
    expect(create.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 422 }),
    ]));
    const detail = yaml('api/fleet-odometer-detail.yaml');
    const update = detail.actions.find((action: any) => action.id === 'edit_fleet_odometer');
    expect(update.operation).toBe('update');
    expect(update.refresh).toEqual(['fleet_odometer_detail', 'fleet_odometers']);
    expect(update.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 404 }),
      expect.objectContaining({ status: 422 }),
    ]));
    expect(source('odometers.yaml', 'fleet_odometers').error_states.transport_error.status).toBe(503);
  });
});
