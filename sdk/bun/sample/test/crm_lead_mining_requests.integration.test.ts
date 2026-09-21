import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('CRM Lead Mining Requests Odoo action parity', () => {
  test('joins list/new/detail contracts and exposes the conditional CRM menu', () => {
    const list = yaml('pages/lead-mining-requests.yaml');
    const detail = yaml('pages/lead-mining-request-detail.yaml');
    const create = yaml('pages/lead-mining-request-new.yaml');
    const listApi = yaml('api/lead-mining-requests.yaml');
    const createApi = yaml('api/lead-mining-request-new.yaml');
    const detailApi = yaml('api/lead-mining-request-detail.yaml');
    const configuration = yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration');
    const leadGeneration = configuration.items.find((item: any) => item.label === 'Lead Generation');

    expect(list.page).toMatchObject({ id: 'crm-lead-mining-requests', route: '/crm/lead-mining-requests' });
    expect(create.page).toMatchObject({ id: 'crm-lead-mining-request-new', route: '/crm/lead-mining-requests/new' });
    expect(detail.page).toMatchObject({ id: 'crm-lead-mining-request-detail', route: '/crm/lead-mining-requests/detail' });
    expect(leadGeneration.children).toContainEqual(expect.objectContaining({ label: 'Lead Mining Requests', path: '/crm/lead-mining-requests' }));
    expect(listApi.page).toEqual({ id: 'crm-lead-mining-requests' });
    expect(createApi.page).toEqual({ id: 'crm-lead-mining-request-new' });
    expect(detailApi.page).toEqual({ id: 'crm-lead-mining-request-detail' });
    expect(createApi.actions.find((action: any) => action.id === 'create_crm_lead_mining_request').fields)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'lead_number', required: true }),
        expect.objectContaining({ field: 'country_names', required: true }),
        expect.objectContaining({ field: 'industry_names', required: true }),
      ]));
    expect(detailApi.actions.find((action: any) => action.id === 'submit_crm_lead_mining_request').mutation.guards)
      .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'CRM_LEAD_MINING_REQUEST_STATE' })]));

    const discovered = discoverPages(join(import.meta.dir, '..'));
    expect(discovered.pageDatasources.get('crm-lead-mining-requests')).toEqual(['crm_lead_mining_requests']);
    expect(discovered.pageDatasources.get('crm-lead-mining-request-new')).toEqual(expect.arrayContaining([
      'crm_lead_mining_request_new', 'crm_lead_mining_request_new_teams', 'crm_lead_mining_request_new_salespeople',
    ]));
    expect(discovered.pageDatasources.get('crm-lead-mining-request-detail')).toEqual(expect.arrayContaining([
      'crm_lead_mining_request_detail', 'crm_lead_mining_request_detail_teams', 'crm_lead_mining_request_detail_salespeople',
    ]));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/crm/lead-mining-requests', page: 'crm-lead-mining-requests', module: 'crm' }),
      expect.objectContaining({ path: '/crm/lead-mining-requests/new', page: 'crm-lead-mining-request-new', module: 'crm' }),
      expect.objectContaining({ path: '/crm/lead-mining-requests/detail', page: 'crm-lead-mining-request-detail', module: 'crm' }),
    ]));
  });

  test('persists criteria, validates source-shaped limits, and records the external-service boundary', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_mining_requests_test', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_mining_requests_test', ['schema', 'data']);

    const listApi = yaml('api/lead-mining-requests.yaml');
    const create = yaml('api/lead-mining-request-new.yaml').actions.find((action: any) => action.id === 'create_crm_lead_mining_request');
    const update = yaml('api/lead-mining-request-detail.yaml').actions.find((action: any) => action.id === 'edit_crm_lead_mining_request');
    const submit = yaml('api/lead-mining-request-detail.yaml').actions.find((action: any) => action.id === 'submit_crm_lead_mining_request');
    const retry = yaml('api/lead-mining-request-detail.yaml').actions.find((action: any) => action.id === 'retry_crm_lead_mining_request');
    const source = listApi.datasources.find((candidate: any) => candidate.id === 'crm_lead_mining_requests');

    expect((await repository.querySource(source, { q: null, state: null, lead_type: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(yaml('api/lead-mining-request-new.yaml').datasources.find((candidate: any) => candidate.id === 'crm_lead_mining_request_new_teams'), {})).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Enterprise' })]));

    const values = {
      lead_number: 12,
      search_type: 'companies',
      lead_type: 'opportunity',
      country_names: 'United States, Canada',
      state_names: 'California',
      industry_names: 'Technology, Healthcare',
      team_name: 'Enterprise',
      user_name: 'Dispatcher User',
      default_tags: 'Priority',
      filter_on_size: true,
      company_size_min: 10,
      company_size_max: 500,
      contact_number: 2,
      contact_filter_type: 'role',
      preferred_role: 'IT Director',
      other_roles: '',
      seniority: '',
    };
    const created = await repository.executeMutation(create.mutation, { values }) as any;
    expect(created).toMatchObject({ name: 'New', state: 'draft', lead_number: 12, country_names: 'United States, Canada', row_version: 1 });
    expect((await repository.querySource(source, { q: 'Canada', state: null, lead_type: null }, 0, 50)).data[0]).toMatchObject({ id: created.id, state: 'draft' });

    const edited = await repository.executeMutation(update.mutation, {
      id: created.id, expected_row_version: 1, values: { ...values, lead_number: 15 },
    }) as any;
    expect(edited).toMatchObject({ lead_number: 15, row_version: 2 });
    await expect(repository.executeMutation(update.mutation, {
      id: created.id, expected_row_version: 1, values: { ...values, lead_number: 16 },
    })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, lead_number: 201 } }))
      .rejects.toMatchObject({ status: 422, code: 'CRM_LEAD_MINING_NUMBER_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, country_names: '' } }))
      .rejects.toMatchObject({ status: 422, code: 'CRM_LEAD_MINING_COUNTRIES_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, filter_on_size: true, company_size_min: 501, company_size_max: 10 } }))
      .rejects.toMatchObject({ status: 422, code: 'CRM_LEAD_MINING_SIZE_INVALID' });

    const failed = await repository.executeMutation(submit.mutation, {
      id: created.id, expected_row_version: 2, values: { state: 'error', error_type: 'service_unavailable', generated_lead_count: 0 },
    }) as any;
    expect(failed).toMatchObject({ state: 'error', error_type: 'service_unavailable', row_version: 3 });
    const retried = await repository.executeMutation(retry.mutation, {
      id: created.id, expected_row_version: 3, values: { state: 'error', error_type: 'service_unavailable', generated_lead_count: 0 },
    }) as any;
    expect(retried).toMatchObject({ state: 'error', row_version: 4 });
    await repository.executeMutation({ operation: 'update', table: 'crm_lead_mining_requests', fields: ['state'], concurrency: false }, { id: created.id, values: { state: 'done' } });
    await expect(repository.executeMutation(update.mutation, {
      id: created.id, expected_row_version: 5, values: { ...values, lead_number: 20 },
    })).rejects.toMatchObject({ status: 409, code: 'CRM_LEAD_MINING_REQUEST_LOCKED' });
    expect((await repository.query('SELECT COUNT(*) AS count FROM crm_lead_mining_requests'))[0]?.count).toBe(1);
    database.close();
  });
});
