import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const apiSource = (file: string, id: string) => yaml(`api/${file}`).datasources.find((source: any) => source.id === id);

describe('Maintenance bounded Odoo parity batch', () => {
  test('keeps every screen layout-only and joins API sources by page id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const screens = [
      ['pages/dashboard.yaml', 'maintenance-dashboard', 'dashboard.yaml', 'maintenance_dashboard_teams'],
      ['pages/requests.yaml', 'maintenance-requests', 'requests.yaml', 'maintenance_requests'],
      ['pages/calendar.yaml', 'maintenance-calendar', 'calendar.yaml', 'maintenance_calendar'],
      ['pages/equipment.yaml', 'equipment', 'equipment.yaml', 'maintenance_equipment'],
      ['pages/equipment-detail.yaml', 'equipment-detail', 'equipment-detail.yaml', 'maintenance_equipment_detail'],
      ['pages/analysis.yaml', 'maintenance-analysis', 'analysis.yaml', 'maintenance_analysis_states'],
      ['pages/teams.yaml', 'maintenance-teams', 'teams.yaml', 'maintenance_teams'],
      ['pages/categories.yaml', 'maintenance-categories', 'categories.yaml', 'maintenance_categories'],
      ['pages/settings.yaml', 'maintenance-settings', 'settings.yaml', 'maintenance_settings'],
    ] as const;

    for (const [pageFile, pageId, apiFile, sourceId] of screens) {
      const page = yaml(pageFile);
      expect(page.datasources, pageFile).toBeUndefined();
      expect(discovered.pages.get(pageId)?.config.page.id, pageFile).toBe(pageId);
      expect(discovered.pageDatasources.get(pageId), pageFile).toContain(sourceId);
      expect(yaml(`api/${apiFile}`).page.id, apiFile).toBe(pageId);
    }

    expect(yaml('manifest.yaml').menu.maintenance.path).toBe('/maintenance');
    expect(yaml('manifest.yaml').menu.groups.flatMap((group: any) => group.items.map((item: any) => item.label))).toEqual(expect.arrayContaining([
      'Maintenance Requests', 'Maintenance Calendar', 'Equipment', 'Maintenance Requests Analysis', 'Maintenance Teams', 'Equipment Categories', 'Settings',
    ]));
  });

  test('provides Odoo view tabs and mobile fallbacks', () => {
    const views = (file: string, source: string) => yaml(file).components.find((component: any) => component.type === 'ListView' && component.source === source).views;
    expect(views('pages/requests.yaml', 'maintenance_requests').map((view: any) => view.id)).toEqual(['kanban', 'list', 'card', 'calendar', 'pivot', 'graph', 'activity']);
    expect(views('pages/calendar.yaml', 'maintenance_calendar').map((view: any) => view.id)).toEqual(['calendar', 'kanban', 'list', 'card', 'pivot', 'graph', 'activity']);
    expect(views('pages/teams.yaml', 'maintenance_teams').map((view: any) => view.id)).toEqual(['list', 'kanban', 'card']);
    expect(views('pages/categories.yaml', 'maintenance_categories').map((view: any) => view.id)).toEqual(['list', 'kanban', 'card']);
    for (const file of ['pages/requests.yaml', 'pages/calendar.yaml', 'pages/teams.yaml', 'pages/categories.yaml']) {
      const list = yaml(file).components.find((component: any) => component.type === 'ListView');
      expect(list.views.some((view: any) => view.id === 'card' && view.mobile !== false), file).toBe(true);
    }
  });

  test('returns deterministic service-owned fixtures and stable empty states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_parity_test_schema_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'maintenance_parity_test_schema_migrations', ['schema', 'data']);

    const teams = apiSource('teams.yaml', 'maintenance_teams');
    const teamRows = await repository.querySource(teams, { q: null, active: null, fixture_state: null }, 0, 50);
    expect(teamRows.data.map((row: any) => row.name)).toEqual(['Internal Maintenance', 'Metrology', 'Subcontractor']);
    expect((await repository.querySource(teams, { q: 'Metrology', active: null, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(teams, { q: null, active: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);

    const categories = apiSource('categories.yaml', 'maintenance_categories');
    expect((await repository.querySource(categories, { q: null, active: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Computers', 'Monitors', 'Phones', 'Printers', 'Software']);
    const dashboard = apiSource('dashboard.yaml', 'maintenance_dashboard_teams');
    expect((await repository.querySource(dashboard, { q: null, active: null, fixture_state: null }, 0, 50)).data).toHaveLength(3);

    const calendar = apiSource('calendar.yaml', 'maintenance_calendar');
    expect((await repository.querySource(calendar, { q: null, state: null, priority: null, archived: null, fixture_state: null }, 0, 50)).data.length).toBeGreaterThan(0);
    const analysis = apiSource('analysis.yaml', 'maintenance_analysis_states');
    expect((await repository.querySource(analysis, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('keeps permission and error boundaries explicit', () => {
    for (const file of readdirSync(join(serviceRoot, 'api')).filter((file) => file.endsWith('.yaml'))) {
      const config = yaml(`api/${file}`);
      for (const source of config.datasources) expect(source.permission, file).toBeDefined();
    }
    expect(yaml('permissions.yaml').permissions).toEqual(expect.arrayContaining(['maintenance.read', 'maintenance.write', 'maintenance.manage', 'maintenance.settings']));
    expect(apiSource('dashboard.yaml', 'maintenance_dashboard_teams').error_states.transport_error).toMatchObject({ status: 503, code: 'MAINTENANCE_DATA_UNAVAILABLE' });
    expect(yaml('pages/maintenance-workflow.yaml').workflow.transitions.every((transition: any) => transition.mutation.guards?.[0]?.status === 409)).toBe(true);
    expect(yaml('api/teams.yaml').actions.find((action: any) => action.id === 'create_maintenance_team').permission).toBe('maintenance.manage');
    expect(yaml('api/settings.yaml').actions[0].permission).toBe('maintenance.settings');
  });

  test('uses fixed migration fixtures rather than moving clock or random identifiers', () => {
    for (const file of readdirSync(join(serviceRoot, 'migrations')).filter((file) => file.endsWith('.yaml'))) {
      const source = readFileSync(join(serviceRoot, 'migrations', file), 'utf8');
      expect(source).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)/);
    }
  });
});
