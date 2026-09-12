import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/sms-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('SMS Marketing Analysis action parity', () => {
  test('keeps the Reporting menu, API/page ownership, and Odoo modes', () => {
    const page = yaml('pages/analysis.yaml');
    const api = yaml('api/analysis.yaml');
    expect(page.page).toMatchObject({ id: 'sms-analysis', route: '/sms-analysis', auth: { require: ['sms_marketing.read'] } });
    expect(page.components[0].source).toBe('sms_mailing_trace_report');
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['graph', 'pivot', 'list']);
    expect(api.page.id).toBe('sms-analysis');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('sms-analysis')).toEqual(['sms_mailing_trace_report']);
    expect(yaml('manifest.yaml').menu.groups[1].items[0]).toMatchObject({ path: '/sms-analysis', label: 'SMS Marketing Analysis', permission: 'sms_marketing.read' });
  });

  test('seeds deterministic SMS report rows and supports search, filters, dates, and empty state', async () => {
    const repository = new YamlRepository(await DuckDbDatabase.open(':memory:'));
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_analysis_test', ['schema', 'data']);
    await migrateDatabase(repository, root + '/migrations', undefined, 'sms_analysis_test', ['schema', 'data']);
    const source = yaml('api/analysis.yaml').datasources[0];
    const params = { q: null, state: null, from_date: null, to_date: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data.map((row: any) => row.id)).toEqual(['sms-report-001', 'sms-report-002', 'sms-report-003']);
    expect((await repository.querySource(source, { ...params, q: 'maintenance' }, 0, 50)).data[0]).toMatchObject({ state: 'In Queue', pending: 840 });
    expect((await repository.querySource(source, { ...params, state: 'Sent' }, 0, 50)).data[0]).toMatchObject({ delivered: 116, bounced: 4, clicked: 18 });
    expect((await repository.querySource(source, { ...params, from_date: '2026-09-12', to_date: '2026-09-12' }, 0, 50)).data.map((row: any) => row.id)).toEqual(['sms-report-002']);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
  });

  test('keeps the report read-only with explicit permission and transport boundaries', () => {
    const api = yaml('api/analysis.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'sms_marketing.read', error_states: { unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } } });
    expect(api.actions ?? []).toEqual([]);
    expect(readFileSync(join(root, 'migrations/20260912171000-007-sms-trace-report-demo.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
