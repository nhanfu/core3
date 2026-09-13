import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('SMS Marketing campaign company boundary', () => {
  test('filters campaign list/detail reads and lifecycle writes by actor company', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'sms_campaign_company_scope', ['schema', 'data']);
    await repository.run("UPDATE sms_campaigns SET company_name = 'Other Company' WHERE id = 'sms-campaign-demo-004'");

    const listSource = yaml('api/campaigns.yaml').datasources.find((source: any) => source.id === 'sms_marketing_mailings');
    const detailSource = yaml('api/campaign-detail.yaml').datasources[0];
    const workflow = yaml('pages/sms-workflow.yaml').workflow;
    const transition = (id: string) => workflow.transitions.find((candidate: any) => candidate.id === id);

    const coreRows = await repository.querySource(listSource, { q: null, state: null, fixture_state: null, company_name: 'Core3 Demo Company' }, 0, 50);
    expect(coreRows.data.map((row: any) => row.id)).not.toContain('sms-campaign-demo-004');
    expect((await repository.querySource(detailSource, { id: 'sms-campaign-demo-004', company_name: 'Core3 Demo Company' }, 0, 1)).data).toEqual({});
    const otherRows = await repository.querySource(listSource, { q: null, state: null, fixture_state: null, company_name: 'Other Company' }, 0, 50);
    expect(otherRows.data.map((row: any) => row.id)).toEqual(['sms-campaign-demo-004']);

    await expect(repository.executeMutation(transition('schedule').mutation, { id: 'sms-campaign-demo-004', expected_row_version: 1, company_name: 'Core3 Demo Company' }))
      .rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_STALE' });
    const scheduled = await repository.executeMutation(transition('schedule').mutation, { id: 'sms-campaign-demo-004', expected_row_version: 1, company_name: 'Other Company' });
    expect(scheduled).toMatchObject({ state: 'In Queue', row_version: 2, company_name: 'Other Company' });
  });

  test('derives newly-created mailing ownership from the actor company', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'sms_campaign_company_create_scope', ['schema', 'data']);
    const create = yaml('api/campaigns.yaml').actions.find((action: any) => action.id === 'create_sms_campaign');
    const created = await repository.executeMutation(create.mutation, {
      current_company_name: 'Core3 Demo Company',
      company_name: 'Other Company',
      values: { name: 'SMS/2026/0098', title: 'Scoped offer', sender_name: 'Core3', list_id: 'sms-list-demo-001', list_name: 'Opt-in Customers', message: 'Company scoped.', recipient_count: 10 },
    });
    expect(created).toMatchObject({ company_name: 'Core3 Demo Company' });
  });

  test('declares explicit auth boundaries and durable ownership', () => {
    const listSource = yaml('api/campaigns.yaml').datasources.find((source: any) => source.id === 'sms_marketing_mailings');
    const detailSource = yaml('api/campaign-detail.yaml').datasources[0];
    expect(listSource.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } });
    expect(detailSource.error_states).toMatchObject({ unauthorized: { status: 401 }, forbidden: { status: 403 }, missing_record: { status: 404 } });
    expect(listSource.query).toContain(':company_name');
    expect(detailSource.query).toContain(':company_name');
    expect(readFileSync(join(root, 'migrations/20260913100000-008-sms-campaign-company-scope.yaml'), 'utf8')).toContain('company_name');
  });
});
