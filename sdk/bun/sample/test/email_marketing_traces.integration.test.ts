import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/email-marketing');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Email Marketing technical Mailing Traces parity', () => {
  test('keeps Odoo technical menu, page/API ownership, and modes', () => {
    const page = yaml('pages/traces.yaml');
    const api = yaml('api/traces.yaml');
    expect(page.page).toMatchObject({ id: 'email-traces', route: '/email-traces', auth: { require: ['email_marketing.settings'] } });
    expect(page.components[0].views.map((view: any) => view.id)).toEqual(['list', 'form', 'graph', 'pivot']);
    expect(page.components[0].datasources).toBeUndefined();
    expect(api.page.id).toBe('email-traces');
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('email-traces')).toContain('email_mailing_traces');
    const item = yaml('manifest.yaml').menu['email-marketing'].groups.find((group: any) => group.id === 'technical').items[0];
    expect(item).toMatchObject({ path: '/email-traces', label: 'Mailing Traces', permission: 'email_marketing.settings' });
  });

  test('seeds deterministic traces and covers search, status filters, empty and missing states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'email_mailing_traces_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'email_mailing_traces_test', ['schema', 'data']);
    const source = yaml('api/traces.yaml').datasources[0];
    const all = await repository.querySource(source, { q: null, trace_status: null, is_test_trace: null, fixture_state: null }, 0, 50);
    expect(all.data.map((row: any) => row.id)).toEqual(['email-trace-newsletter-beverly', 'email-trace-newsletter-aristide', 'email-trace-scheduled-franz', 'email-trace-offer-david', 'email-trace-offer-carol', 'email-trace-test-elsa', 'email-trace-cancelled-gilbert']);
    expect((await repository.querySource(source, { q: 'blacklisted', trace_status: null, is_test_trace: null, fixture_state: null }, 0, 50)).data[0].id).toBe('email-trace-test-elsa');
    expect((await repository.querySource(source, { q: null, trace_status: 'bounce', is_test_trace: null, fixture_state: null }, 0, 50)).data[0].failure_type).toBe('smtp');
    expect((await repository.querySource(source, { q: null, trace_status: null, is_test_trace: true, fixture_state: null }, 0, 50)).data).toHaveLength(1);
    expect((await repository.querySource(source, { q: null, trace_status: null, is_test_trace: null, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    const detail = yaml('api/trace-detail.yaml').datasources[0];
    expect((await repository.querySource(detail, { id: 'email-trace-newsletter-aristide', fixture_state: null }, 0, 1)).data.email).toBe('aristide@example.com');
    await expect(repository.querySource(detail, { id: 'missing-trace', fixture_state: 'not_found' }, 0, 1)).rejects.toMatchObject({ status: 404, code: 'EMAIL_TRACE_DETAIL_NOT_FOUND' });
  });

  test('keeps the technical read-only permission boundary and stable errors', () => {
    const api = yaml('api/traces.yaml');
    const detail = yaml('api/trace-detail.yaml');
    expect(api.datasources[0]).toMatchObject({ permission: 'email_marketing.settings', error_states: { unauthorized: { status: 401 }, forbidden: { status: 403 }, transport_error: { status: 503 } } });
    expect(detail.datasources[0].error_states.not_found.status).toBe(404);
    expect(api.actions.some((action: any) => action.type === 'mutation')).toBe(false);
    expect(readFileSync(join(root, 'migrations/20260912160000-019-email-mailing-traces.yaml'), 'utf8')).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|random_uuid|gen_random_uuid/i);
  });
});
