import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { discoverPages } from '@core3/server/discovery';
import { createYamlApi } from '@core3/server/routes/yaml-api';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees company-scope prerequisite', () => {
  test('keeps the company-scope migration and read predicates present', () => {
    expect(readFileSync(join(root, 'migrations/20260913100000-023-company-scope.yaml'), 'utf8'))
      .toContain("'employee-demo-005'");
    const scopeSources = [
      ['api/employees.yaml', 'employees'],
      ['api/employee-detail.yaml', 'employee_detail'],
      ['api/directory.yaml', 'employee_directory'],
      ['api/directory-detail.yaml', 'employee_directory_detail'],
    ];
    for (const [file, id] of scopeSources) {
      expect(yaml(file).datasources.find((source: any) => source.id === id)?.query, file)
        .toContain('current_company_name');
    }
    const demoMigration = readFileSync(join(root, 'migrations/20260913140000-026-departure-reason-demo-companies.yaml'), 'utf8');
    expect(demoMigration).toContain("departure-reason-vietnam-transfer");
    expect(demoMigration).toContain("'Core3 Vietnam Branch'");
    expect(demoMigration).toContain("'Core3 Demo Company'");
  });

  test('uses the switched auth company for page and /api/query datasource requests', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'employees_company_switch_routes_test', ['schema', 'data']);
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const employeePages = new Map([...discovered.pages]
      .filter(([, page]) => page.module === 'employees')
      .map(([id, page]) => [id, page.config]));
    const employeeSources = new Map([...discovered.datasources]
      .filter(([id]) => id === 'employee_departure_reasons'));
    const pageSources = new Map([...discovered.pageDatasources]
      .filter(([pageId]) => employeePages.has(pageId)));
    const baseUser = { sub: 'user-admin', email: 'admin@tms.local', name: 'Admin User', roles: ['admin'], permissions: ['employees.manage'] };
    let currentCompany = { id: 'company-demo', name: 'Core3 Demo Company' };
    const api = createYamlApi({
      repository,
      authProvider: {
        async getCurrentUser() { return { ...baseUser, company: currentCompany, company_id: currentCompany.id }; },
        hasPermission(user: any, permission: string) { return user.permissions.includes(permission); },
      },
      sources: employeeSources,
      pageSources,
      pages: employeePages,
      catalogs: discovered.catalogs,
      menus: new Map(),
      workflows: new Map(),
      workflowFiles: new Map(),
      permissions: discovered.permissions.get('employees')?.config || {},
      uploadRoot: '/tmp/core3-employees-company-switch-test-uploads', eventStore: {}, topics: {},
    });
    const pageRequest = () => api(new Request('http://employees.test/api/pages/employee-departure-reasons?lc=en', {
      headers: { Authorization: 'Bearer switched-session' },
    }), new URL('http://employees.test/api/pages/employee-departure-reasons?lc=en'));
    const queryRequest = () => api(new Request('http://employees.test/api/query', {
      method: 'POST',
      headers: { Authorization: 'Bearer switched-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: 'employee_departure_reasons', params: { active: null, q: null }, top: 50 }),
    }), new URL('http://employees.test/api/query'));
    const demoPage = await (await pageRequest()).json();
    const demoRows = demoPage.datasources.find((source: any) => source.id === 'employee_departure_reasons').data;
    expect(demoRows.map((row: any) => row.id)).toEqual(['departure-reason-fired', 'departure-reason-resigned', 'departure-reason-retired']);
    expect(demoRows.every((row: any) => row.company_name === 'Core3 Demo Company')).toBe(true);
    const demoQuery = await (await queryRequest()).json();
    expect(demoQuery.data.every((row: any) => row.company_name === 'Core3 Demo Company')).toBe(true);

    // This models the state after the real POST /api/v1/company/switch has
    // committed the auth profile; the auth provider rehydrates that profile
    // on every request while the bearer token remains the same.
    currentCompany = { id: 'company-vietnam', name: 'Core3 Vietnam Branch' };
    const switchedPage = await (await pageRequest()).json();
    const switchedRows = switchedPage.datasources.find((source: any) => source.id === 'employee_departure_reasons').data;
    expect(switchedRows.map((row: any) => row.id)).toEqual(['departure-reason-vietnam-transfer', 'departure-reason-vietnam-contract']);
    expect(switchedRows.every((row: any) => row.company_name === 'Core3 Vietnam Branch')).toBe(true);
    expect(switchedRows.every((row: any) => row.company_name !== 'Core3 Demo Company')).toBe(true);
    const switchedQuery = await (await queryRequest()).json();
    expect(switchedQuery.data.length).toBeGreaterThan(0);
    expect(switchedQuery.data.every((row: any) => row.company_name === 'Core3 Vietnam Branch')).toBe(true);
    expect(switchedQuery.data.every((row: any) => row.company_name !== 'Core3 Demo Company')).toBe(true);
    database.close();
  });
});
