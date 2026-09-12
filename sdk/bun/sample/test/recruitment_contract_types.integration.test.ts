import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/recruitment');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/contract-types.yaml').actions.find((candidate: any) => candidate.id === id);

describe('Recruitment Contract Types parity action', () => {
  test('joins the inherited Odoo Employment Types list/form contract by page.id', () => {
    const page = yaml('pages/contract-types.yaml');
    const api = yaml('api/contract-types.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(page.page).toMatchObject({ id: 'recruitment-contract-types', route: '/recruitment/contract-types', auth: { require: ['recruitment.manage'] } });
    expect(page.components[0]).toMatchObject({ source: 'recruitment_contract_types', create_action: 'create_recruitment_contract_type', inline_edit: 'bottom' });
    expect(page.components[0].columns.map((column: any) => column.field)).toEqual(['sequence', 'name', 'country_name', 'id']);
    expect(api.page.id).toBe(page.page.id);
    expect(discovered.pageDatasources.get('recruitment-contract-types')).toEqual(['recruitment_contract_types']);
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: '/recruitment/contract-types', permission: 'recruitment.manage' })]));
  });

  test('seeds Odoo employment types and supports search, CRUD, validation, missing, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'recruitment_contract_type_test_migrations', ['schema', 'data']);
    const source = yaml('api/contract-types.yaml').datasources[0];
    expect((await repository.querySource(source, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.name)).toEqual(['Permanent', 'Temporary', 'Interim', 'Seasonal', 'Full-Time', 'Part-Time', 'Intern', 'Student', 'Apprenticeship', 'Thesis', 'Statutory', 'Employee']);
    expect((await repository.querySource(source, { q: 'temporary', fixture_state: null }, 0, 50)).data).toMatchObject([{ name: 'Temporary', code: 'Temporary' }]);
    expect((await repository.querySource(source, { q: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const create = action('create_recruitment_contract_type');
    const created = await repository.executeMutation(create.mutation, { values: { name: 'Seasonal Project', sequence: 1013 } });
    expect(created).toMatchObject({ name: 'Seasonal Project', sequence: 1013 });
    await expect(repository.executeMutation(create.mutation, { values: { name: 'seasonal project', sequence: 1014 } })).rejects.toMatchObject({ status: 409, code: 'RECRUITMENT_CONTRACT_TYPE_NAME_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { name: ' ', sequence: 1014 } })).rejects.toMatchObject({ status: 422, code: 'RECRUITMENT_CONTRACT_TYPE_NAME_REQUIRED' });
    const edit = action('edit_recruitment_contract_type');
    const edited = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Seasonal Project Updated', sequence: 1014 } });
    expect(edited).toMatchObject({ name: 'Seasonal Project Updated', sequence: 1014 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { name: 'Stale edit', sequence: 1015 } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(action('delete_recruitment_contract_type').mutation, { id: created.id, expected_row_version: 2 });
    await expect(repository.executeMutation(action('delete_recruitment_contract_type').mutation, { id: 'missing-contract-type', expected_row_version: 1 })).rejects.toMatchObject({ status: 404, code: 'RECRUITMENT_CONTRACT_TYPE_NOT_FOUND' });
  });

  test('keeps contract-type configuration manager-only and separate from applicant/stage workflow writes', () => {
    const api = yaml('api/contract-types.yaml');
    expect(api.datasources[0].permission).toBe('recruitment.manage');
    expect(api.datasources[0].error_states).toMatchObject({ forbidden: { status: 403 }, transport_error: { status: 503 } });
    for (const id of ['create_recruitment_contract_type', 'edit_recruitment_contract_type', 'delete_recruitment_contract_type']) {
      expect(action(id).permission, id).toBe('recruitment.manage');
      expect(action(id).handler, id).toBe('yaml_mutation');
    }
    expect(action('edit_recruitment_contract_type').mutation.concurrency.required).toBe(true);
    expect(action('delete_recruitment_contract_type').mutation.concurrency.required).toBe(true);
    expect(yaml('api/applicants.yaml').actions.some((candidate: any) => candidate.id.includes('contract_type'))).toBe(false);
    expect(yaml('pages/recruitment-workflow.yaml').workflow.transitions.map((transition: any) => transition.id)).toEqual(['screen', 'interview', 'offer', 'hire', 'reject']);
  });
});
