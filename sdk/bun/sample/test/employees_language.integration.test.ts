import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const employeesRoot = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(employeesRoot, file), 'utf8')) as any;
const action = (definition: any, id: string) => definition.actions.find((entry: any) => entry.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, join(employeesRoot, 'migrations'), undefined, name, ['schema', 'data']);
}

describe('Employees language parity', () => {
  test('maps Odoo Lang to separate page/API contracts', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py', 'utf8');
    const sourceProfile = readFileSync('/home/nhanjs/projects/odoo/addons/hr/static/tests/profile_form_view.test.js', 'utf8');
    const page = yaml('pages/employee-detail.yaml');
    const api = yaml('api/employee-detail.yaml');
    const settings = page.components[0].notebook.tabs.find((tab: any) => tab.id === 'settings');
    const detail = api.datasources.find((entry: any) => entry.id === 'employee_detail');
    const edit = action(api, 'edit_employee_language');

    expect(sourceModel).toContain('lang = fields.Selection(selection=_lang_get, string="Lang"');
    expect(sourceProfile).toContain('<field name="lang"/>');
    expect(page.page.id).toBe('employee-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(settings.groups[0].fields).toContainEqual({ field: 'lang', label: 'Language' });
    expect(detail.query).toContain('timezone, lang, barcode');
    expect(api.datasources.find((entry: any) => entry.id === 'employee_detail_language_options').query)
      .toContain('FROM employee_languages');
    expect(edit).toMatchObject({
      permission: 'employees.write',
      action: 'employees.records.language.update',
      handler: 'yaml_mutation',
      operation: 'update',
    });
    expect(edit.mutation.fields).toEqual(['lang']);
    expect(edit.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'EMPLOYEES_LANGUAGE_ACTOR_REQUIRED' }),
      expect.objectContaining({ code: 'EMPLOYEES_LANGUAGE_EMPLOYEE_NOT_FOUND' }),
      expect.objectContaining({ code: 'STALE_RECORD' }),
      expect.objectContaining({ code: 'EMPLOYEES_LANGUAGE_INVALID' }),
    ]));
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'edit_employee_language' }));
  });

  test('creates and edits employee Language through durable guarded CRUD', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_language_crud');
    const create = action(yaml('api/employees.yaml'), 'create_employee');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_language');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Vietnam',
      values: {
        employee_number: 'EMP-LANGUAGE-001', name: 'Language Information Test', hire_date: '2026-01-15',
        company_name: 'Core3 Vietnam', lang: 'vi_VN',
      },
    }) as any;
    expect(created).toMatchObject({ name: 'Language Information Test', lang: 'vi_VN', row_version: 1 });

    const edited = await repository.executeMutation(edit.mutation, {
      id: created.id, expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { lang: 'de_DE' },
    }) as any;
    expect(edited).toMatchObject({ id: created.id, lang: 'de_DE', row_version: 2 });
    expect(await repository.query(`SELECT lang, row_version FROM employees WHERE id = '${created.id}'`))
      .toEqual([{ lang: 'de_DE', row_version: 2 }]);
    expect(await repository.query('SELECT code, name FROM employee_languages ORDER BY code'))
      .toEqual([
        { code: 'de_DE', name: 'German' },
        { code: 'en_US', name: 'English (US)' },
        { code: 'vi_VN', name: 'Vietnamese' },
      ]);
    await database.close();
  });

  test('rejects missing actor, stale, cross-company, and unsupported Language atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'employees_language_guards');
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_language');
    const base = {
      id: 'employee-demo-002', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { lang: 'en_US' },
    };
    await expect(repository.executeMutation(edit.mutation, { ...base, current_user_id: '' }))
      .rejects.toMatchObject({ status: 403, code: 'EMPLOYEES_LANGUAGE_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(edit.mutation, { ...base, expected_row_version: 99 }))
      .rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(edit.mutation, { ...base, current_company_name: 'Other Company' }))
      .rejects.toMatchObject({ status: 404, code: 'EMPLOYEES_LANGUAGE_EMPLOYEE_NOT_FOUND' });
    await expect(repository.executeMutation(edit.mutation, { ...base, values: { lang: 'xx_XX' } }))
      .rejects.toMatchObject({ status: 422, code: 'EMPLOYEES_LANGUAGE_INVALID' });
    expect(await repository.query("SELECT lang, row_version FROM employees WHERE id = 'employee-demo-002'"))
      .toEqual([{ lang: 'vi_VN', row_version: 1 }]);
    await database.close();
  });

  test('preserves deterministic Language fixtures through migration replay and restart', async () => {
    const databasePath = `/tmp/core3-employees-language-${crypto.randomUUID()}.duckdb`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrate(firstRepository, 'employees_language_restart');
    expect(await firstRepository.query("SELECT lang FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ lang: 'en_US' }]);
    const edit = action(yaml('api/employee-detail.yaml'), 'edit_employee_language');
    await firstRepository.executeMutation(edit.mutation, {
      id: 'employee-demo-001', expected_row_version: 1, current_company_name: 'Core3 Vietnam', current_user_id: 'user-admin',
      values: { lang: 'vi_VN' },
    });
    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrate(secondRepository, 'employees_language_restart');
    expect(await secondRepository.query("SELECT lang, row_version FROM employees WHERE id = 'employee-demo-001'"))
      .toEqual([{ lang: 'vi_VN', row_version: 2 }]);
    expect(await secondRepository.query("SELECT code FROM employee_languages WHERE active = true ORDER BY code"))
      .toEqual([{ code: 'de_DE' }, { code: 'en_US' }, { code: 'vi_VN' }]);
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
