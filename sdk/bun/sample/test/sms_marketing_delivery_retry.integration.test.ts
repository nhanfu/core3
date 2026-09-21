import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { validatePageDefinition } from '@core3/server/yaml/schema';

const root = join(import.meta.dir, '../services/sms-marketing');
const odooRoot = '/home/nhanjs/projects/odoo/addons';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (file: string, id: string) => (yaml(file).actions || []).find((candidate: any) => candidate.id === id);

async function migrate(repository: YamlRepository, name: string): Promise<void> {
  await migrateDatabase(repository, root + '/migrations', undefined, name, ['schema', 'data']);
}

describe('SMS Marketing failed delivery retry parity', () => {
  test('maps Odoo retry and trace list/form contracts without merging page and API YAML', () => {
    const source = readFileSync(join(odooRoot, 'mass_mailing_sms/models/mailing_mailing.py'), 'utf8');
    const traceViews = readFileSync(join(odooRoot, 'mass_mailing_sms/views/mailing_trace_views.xml'), 'utf8');
    const listPage = yaml('pages/delivery-traces.yaml');
    const listApi = yaml('api/delivery-traces.yaml');
    const detailPage = yaml('pages/delivery-trace-detail.yaml');
    const detailApi = yaml('api/delivery-trace-detail.yaml');
    const campaignPage = yaml('pages/sms-campaign-detail.yaml');

    expect(source).toContain('def action_retry_failed_sms');
    expect(source).toContain("('state', '=', 'error')");
    expect(traceViews).toContain('id="mailing_trace_view_tree_sms"');
    expect(traceViews).toContain('id="mailing_trace_view_form_sms"');
    expect(listPage.datasources).toBeUndefined();
    expect(detailPage.datasources).toBeUndefined();
    expect(listApi.page.id).toBe(listPage.page.id);
    expect(detailApi.page.id).toBe(detailPage.page.id);
    validatePageDefinition({ ...listPage, actions: [...(listApi.actions || []), ...(listPage.actions || [])] }, { allowExternalSources: true });
    validatePageDefinition({ ...detailPage, actions: [...(detailApi.actions || []), ...(detailPage.actions || [])] }, { allowExternalSources: true });
    expect(listApi.datasources.map((source: any) => source.id)).toEqual(['sms_delivery_traces']);
    expect(detailApi.datasources.map((source: any) => source.id)).toEqual(['sms_delivery_trace_detail']);
    expect(listPage.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form']);
    expect(detailPage.components[0].editable).toBe(false);
    expect(action('api/campaign-detail.yaml', 'retry_failed_sms_campaign')).toMatchObject({
      type: 'server', permission: 'sms_marketing.write', action: 'sms_marketing.mailings.retry_failed', handler: 'yaml_mutation',
    });
    expect(action('api/campaign-detail.yaml', 'retry_failed_sms_campaign').mutation.steps).toHaveLength(2);
    expect(campaignPage.components[0].header_actions).toContainEqual(expect.objectContaining({ id: 'retry_failed_sms_campaign_reload', label: 'Retry' }));
    expect(action('api/campaign-detail.yaml', 'view_sms_delivery_traces')).toMatchObject({ navigate_to: '/sms-delivery-traces' });
  });

  test('seeds traces idempotently and retries only failed SMS attempts', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrate(repository, 'sms_delivery_retry_test');
    await migrate(repository, 'sms_delivery_retry_test');

    const listSource = yaml('api/delivery-traces.yaml').datasources[0];
    const rows = await repository.querySource(listSource, {
      q: null, trace_status: null, campaign_id: 'sms-campaign-demo-003', company_name: 'Core3 Demo Company', fixture_state: null,
    }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['sms-trace-demo-001', 'sms-trace-demo-003', 'sms-trace-demo-002']);
    expect((await repository.querySource(listSource, {
      q: null, trace_status: 'error', campaign_id: null, company_name: 'Core3 Demo Company', fixture_state: null,
    }, 0, 50)).data[0]).toMatchObject({ trace_status: 'error', failure_type: 'sms_not_delivered', attempt_no: 1 });
    expect((await repository.querySource(listSource, {
      q: null, trace_status: null, campaign_id: null, company_name: 'Core3 Demo Company', fixture_state: 'empty',
    }, 0, 50)).data).toEqual([]);
    expect((await repository.query('SELECT COUNT(*) AS count FROM sms_delivery_attempts'))[0].count).toBe(4);

    const retry = action('api/campaign-detail.yaml', 'retry_failed_sms_campaign');
    const retried = await repository.executeMutation(retry.mutation, {
      id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company',
    });
    expect(retried).toMatchObject({ id: 'sms-campaign-demo-003', state: 'In Queue', failed_count: 0, row_version: 2 });
    expect((await repository.query('SELECT status, attempt_no, failure_type, failure_reason, row_version FROM sms_delivery_attempts WHERE id = ?', ['sms-trace-demo-003']))[0])
      .toEqual({ status: 'pending', attempt_no: 2, failure_type: null, failure_reason: null, row_version: 2 });
    await expect(repository.executeMutation(retry.mutation, {
      id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company',
    })).rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_RETRY_STALE' });
    expect((await repository.query('SELECT state, failed_count, row_version FROM sms_campaigns WHERE id = ?', ['sms-campaign-demo-003']))[0])
      .toEqual({ state: 'In Queue', failed_count: 0, row_version: 2 });
    repository.db.close();
  });

  test('keeps retry durable across restart and protects company/state boundaries', async () => {
    const databasePath = `/tmp/core3-sms-delivery-retry-${crypto.randomUUID()}.duckdb`;
    const migrationName = `sms_delivery_retry_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let database = await DuckDbDatabase.open(databasePath);
    let repository = new YamlRepository(database);
    const retry = action('api/campaign-detail.yaml', 'retry_failed_sms_campaign');
    try {
      await migrate(repository, migrationName);
      await expect(repository.executeMutation(retry.mutation, {
        id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Other Company',
      })).rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_RETRY_STALE' });
      await repository.run("UPDATE sms_campaigns SET company_name = 'Other Company' WHERE id = 'sms-campaign-demo-003'");
      await expect(repository.executeMutation(retry.mutation, {
        id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company',
      })).rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_RETRY_STALE' });
      await repository.run("UPDATE sms_campaigns SET company_name = 'Core3 Demo Company' WHERE id = 'sms-campaign-demo-003'");
      await repository.executeMutation(retry.mutation, {
        id: 'sms-campaign-demo-003', expected_row_version: 1, company_name: 'Core3 Demo Company',
      });
      database.close();
      database = await DuckDbDatabase.open(databasePath);
      repository = new YamlRepository(database);
      await migrate(repository, migrationName);
      expect((await repository.query('SELECT state, failed_count, row_version FROM sms_campaigns WHERE id = ?', ['sms-campaign-demo-003']))[0])
        .toEqual({ state: 'In Queue', failed_count: 0, row_version: 2 });
      expect((await repository.query('SELECT status, attempt_no, row_version FROM sms_delivery_attempts WHERE id = ?', ['sms-trace-demo-003']))[0])
        .toEqual({ status: 'pending', attempt_no: 2, row_version: 2 });
      await expect(repository.executeMutation(retry.mutation, {
        id: 'sms-campaign-demo-003', expected_row_version: 2, company_name: 'Core3 Demo Company',
      })).rejects.toMatchObject({ status: 409, code: 'SMS_MAILING_RETRY_STALE' });
    } finally {
      database.close();
      rmSync(databasePath, { force: true });
    }
  });

  test('declares explicit read/write/transport/not-found boundaries', () => {
    const listApi = yaml('api/delivery-traces.yaml');
    const detailApi = yaml('api/delivery-trace-detail.yaml');
    expect(listApi.datasources[0]).toMatchObject({
      permission: 'sms_marketing.read',
      error_states: { unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } },
    });
    expect(detailApi.datasources[0].error_states).toMatchObject({ missing_record: { status: 404 }, transport_error: { status: 503 } });
    expect(action('api/campaign-detail.yaml', 'retry_failed_sms_campaign').permission).toBe('sms_marketing.write');
    expect(readFileSync(join(root, 'migrations/20260921101000-010-sms-delivery-retry-demo.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
