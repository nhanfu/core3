import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/crm');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('CRM lead meetings stat action parity CRM-LEAD-MEETINGS-001', () => {
  test('maps Odoo action_schedule_meeting and its calendar.event action to a CRM page/API join', () => {
    const page = yaml('pages/lead-meetings.yaml');
    const api = yaml('api/lead-meetings.yaml');
    const detailPage = yaml('pages/lead-detail.yaml');
    const detailApi = yaml('api/lead-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(page.page).toMatchObject({ id: 'crm-lead-meetings', route: '/crm/lead-meetings', auth: { require: ['crm.read'] } });
    expect(api.page).toEqual({ id: page.page.id });
    expect(discovered.pageDatasources.get(page.page.id)).toEqual(['crm_lead_meetings_context', 'crm_lead_meetings']);
    expect(discoverPageRoutes(discovered)).toContainEqual({ path: '/crm/lead-meetings', page: page.page.id, module: 'crm' });
    expect(page.components[0].views.map((view: any) => view.label)).toEqual(['List', 'Calendar']);
    expect(detailPage.components[0].stat_buttons).toContainEqual(expect.objectContaining({ id: 'view_crm_lead_meetings', value_field: 'meeting_count' }));
    expect(action(detailApi, 'view_crm_lead_meetings')).toMatchObject({ type: 'navigate', navigate_to: '/crm/lead-meetings' });
    expect(action(api, 'create_crm_lead_meeting')).toMatchObject({ permission: 'crm.write', action: 'crm.meetings.create' });
    expect(action(api, 'create_crm_lead_meeting').mutation.fields).toEqual(expect.arrayContaining(['lead_id', 'start_at', 'end_at']));
  });

  test('returns deterministic next/last meeting states, guards creation, and survives restart', async () => {
    const databasePath = `/tmp/core3-crm-lead-meetings-${crypto.randomUUID()}.duckdb`;
    const database = await DuckDbDatabase.open(databasePath);
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_meetings_test_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'crm_lead_meetings_test_migrations', ['schema', 'data']);

    const api = yaml('api/lead-meetings.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'crm_lead_meetings');
    const params = { id: 'crm-demo-001', q: null, fixture_state: null };
    expect((await repository.querySource(source, params, 0, 50)).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'crm-meeting-demo-001', name: 'Renewal review', state: 'Scheduled' }),
      expect.objectContaining({ id: 'crm-meeting-demo-002', name: 'Technical discovery', state: 'Held' }),
    ]));
    expect((await repository.querySource(source, { ...params, q: 'missing' }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(source, { ...params, fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(source, { ...params, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'CRM_LEAD_MEETINGS_FORBIDDEN' });

    const detail = yaml('api/lead-detail.yaml').datasources.find((entry: any) => entry.id === 'crm_lead_detail');
    const detailRow = await repository.querySource(detail, { id: 'crm-demo-001' }, 0, 1);
    expect(detailRow.data).toMatchObject({ meeting_count: 2, meeting_display_label: 'Next Meeting' });

    const create = action(api, 'create_crm_lead_meeting');
    const created = await repository.executeMutation(create.mutation, {
      values: { lead_id: 'crm-demo-001', name: 'Customer decision meeting', start_at: '2026-09-29 13:00', end_at: '2026-09-29 14:00', location: 'Acme board room', attendee_names: 'Acme Corporation' },
    });
    expect(created).toMatchObject({ lead_id: 'crm-demo-001', name: 'Customer decision meeting', state: 'Scheduled' });
    await expect(repository.executeMutation(create.mutation, { values: { lead_id: 'crm-demo-001', name: 'Invalid window', start_at: '2026-09-29 14:00', end_at: '2026-09-29 13:00' } })).rejects.toMatchObject({ status: 422, code: 'CRM_LEAD_MEETING_VALUES_INVALID' });
    await expect(repository.executeMutation(create.mutation, { values: { lead_id: 'crm-demo-002', name: 'Closed lead meeting', start_at: '2026-09-29 13:00', end_at: '2026-09-29 14:00' } })).rejects.toMatchObject({ status: 409, code: 'CRM_LEAD_MEETING_LEAD_INVALID' });
    database.close();

    const restartedDatabase = await DuckDbDatabase.open(databasePath);
    const restartedRepository = new YamlRepository(restartedDatabase);
    await migrateDatabase(restartedRepository, join(root, 'migrations'), undefined, 'crm_lead_meetings_test_migrations', ['schema', 'data']);
    expect((await restartedRepository.querySource(source, params, 0, 50)).data).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Customer decision meeting' })]));
    restartedDatabase.close();
    rmSync(databasePath, { force: true });
  });
});
