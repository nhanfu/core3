import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const sampleRoot = join(import.meta.dir, '..');
const livechatRoot = join(sampleRoot, 'services/livechat');
const baseRoot = join(sampleRoot, 'services/base');
const yaml = (root: string, file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Live Chat partner history stat action parity', () => {
  test('joins the Odoo partner stat button to a Live Chat datasource and history action', () => {
    const page = yaml(baseRoot, 'pages/contact-detail.yaml');
    const api = yaml(baseRoot, 'api/contact-detail.yaml');
    const discovered = discoverPages(sampleRoot);
    const stat = page.components[0].stat_buttons.find((button: any) => button.id === 'open_contact_livechat');

    expect(stat).toEqual({ id: 'open_contact_livechat', label: 'Live Chat', value_field: 'livechat_channel_count', permission: 'livechat.read', show_if: 'row.livechat_channel_count > 0' });
    expect(api.page).toEqual({ id: 'contact-detail' });
    expect(api.datasources.find((item: any) => item.id === 'livechat_partner_capabilities')).toMatchObject({ id: 'livechat_partner_capabilities', single: true, permission: 'livechat.read' });
    expect(api.actions).toContainEqual({
      id: 'open_contact_livechat', type: 'navigate', permission: 'livechat.read',
      navigate_to: '/livechat-sessions/all', params: { partner_id: '{state.contact_detail.id}' },
    });
    expect(discovered.pageDatasources.get('contact-detail')).toContain('livechat_partner_capabilities');
  });

  test('seeds idempotent partner counts and scopes existing conversations by partner', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(livechatRoot, 'migrations');
    await migrateDatabase(repository, join(baseRoot, 'migrations'), undefined, 'livechat_partner_history_base_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_partner_history_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_partner_history_test_migrations', ['schema', 'data']);

    const capability = yaml(baseRoot, 'api/contact-detail.yaml').datasources.find((item: any) => item.id === 'livechat_partner_capabilities');
    expect(await repository.querySource(capability, { id: 'contact-demo', fixture_state: null }, 0, 1))
      .toMatchObject({ data: { partner_id: 'contact-demo', livechat_channel_count: 2, livechat_session_count: 2 } });
    const contactDetail = yaml(baseRoot, 'api/contact-detail.yaml').datasources.find((item: any) => item.id === 'contact_detail');
    expect(await repository.querySource(contactDetail, { id: 'contact-demo', fixture_state: null }, 0, 1))
      .toMatchObject({ data: { id: 'contact-demo', livechat_channel_count: 2 } });
    const history = yaml(livechatRoot, 'api/all-conversations.yaml').datasources[0];
    const rows = await repository.querySource(history, { q: null, rating_text: null, session_date: 'last_365_days', partner_id: 'contact-demo', fixture_state: null }, 0, 50);
    expect(rows.data.map((row: any) => row.id)).toEqual(['livechat-conversation-001', 'livechat-conversation-004']);
    expect((await repository.querySource(history, { q: null, rating_text: null, session_date: 'last_365_days', partner_id: 'contact-azure-brandon', fixture_state: null }, 0, 50)).data.map((row: any) => row.id))
      .toEqual(['livechat-conversation-005']);
    expect((await repository.querySource(history, { q: null, rating_text: null, session_date: 'last_365_days', partner_id: 'missing-contact', fixture_state: null }, 0, 50)).data).toEqual([]);
    database.close();
  });

  test('keeps the partner history action read-only and failure boundaries explicit', () => {
    const api = yaml(baseRoot, 'api/contact-detail.yaml');
    expect(api.datasources.find((item: any) => item.id === 'livechat_partner_capabilities').error_states).toMatchObject({
      unauthorized: { status: 401, code: 'LIVECHAT_PARTNER_HISTORY_UNAUTHORIZED' },
      forbidden: { status: 403, code: 'LIVECHAT_PARTNER_HISTORY_FORBIDDEN' },
      transport_error: { status: 503, code: 'LIVECHAT_PARTNER_HISTORY_UNAVAILABLE' },
    });
    expect(api.actions).not.toEqual(expect.arrayContaining([expect.objectContaining({ type: 'server' }), expect.objectContaining({ type: 'server_form' })]));
    expect(yaml(livechatRoot, 'permissions.yaml').permissions).toContain('livechat.read');
  });
});
