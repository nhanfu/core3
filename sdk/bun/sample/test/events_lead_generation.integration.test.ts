import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/events');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(`api/${file}`).actions.find((candidate: any) => candidate.id === id);

describe('Events Lead Generation Rules parity', () => {
  test('binds the manager-only menu and list/detail layouts by page.id', () => {
    const discovered = discoverPages(join(import.meta.dir, '..'));
    const manifest = yaml('manifest.yaml');
    const configuration = manifest.menu.groups.find((group: any) => group.id === 'configuration');
    const menu = configuration.items.find((item: any) => item.label === 'Lead Generation');
    const list = yaml('pages/event-lead-generation.yaml');
    const detail = yaml('pages/event-lead-generation-detail.yaml');
    const form = detail.components.find((component: any) => component.type === 'OdooFormView');

    expect(menu).toMatchObject({ path: '/events/lead-generation', label: 'Lead Generation', permission: 'events.manage' });
    expect(list.page).toMatchObject({ id: 'event-lead-generation', route: '/events/lead-generation', auth: { require: ['events.manage'] } });
    expect(detail.page).toMatchObject({ id: 'event-lead-generation-detail', route: '/events/lead-generation/detail', auth: { require: ['events.manage'] } });
    expect(list.components[0]).toMatchObject({ source: 'event_lead_rules', row_open_action: 'view_event_lead_rule', create_action: 'create_event_lead_rule' });
    expect(list.components[0].columns.map((column: any) => column.label)).toEqual(['Rule Name', 'Lead Creation Type', 'When', 'Event Templates', 'Event', 'Company']);
    expect(form.header_actions.map((candidate: any) => candidate.id)).toEqual([
      'back_to_event_lead_rules', 'execute_event_lead_rule', 'edit_event_lead_rule',
      'archive_event_lead_rule', 'unarchive_event_lead_rule', 'delete_event_lead_rule',
    ]);
    expect(form.groups.map((group: any) => group.title || '')).toEqual(['', 'FOR ANY OF THESE EVENTS', 'IF THE ATTENDEES MEET THESE CONDITIONS', 'LEAD DEFAULT VALUES']);
    expect(discovered.pages.get('event-lead-generation')?.config.page.id).toBe('event-lead-generation');
    expect(discovered.pages.get('event-lead-generation-detail')?.config.page.id).toBe('event-lead-generation-detail');
    expect(discovered.pageDatasources.get('event-lead-generation')).toEqual(['event_lead_rules']);
    expect(discovered.pageDatasources.get('event-lead-generation-detail')).toEqual(['event_lead_rule_detail']);
  });

  test('seeds stable list/detail data and explicit empty, missing, and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_lead_generation_state_migrations', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_lead_generation_state_migrations', ['schema', 'data']);

    const listSource = yaml('api/event-lead-generation.yaml').datasources[0];
    const detailSource = yaml('api/event-lead-generation-detail.yaml').datasources[0];
    expect(await repository.querySource(listSource, { fixture_state: null, active: null, q: null }, 0, 50)).toMatchObject({ data: [{
      id: 'event-lead-rule-example', name: 'Rule on @example.com', lead_creation_basis: 'Per Attendee',
      lead_creation_trigger: 'Attendees are created', event_name: 'Hockey Tournament', matched_registration_count: 23,
    }] });
    expect(await repository.querySource(detailSource, { fixture_state: null, id: 'event-lead-rule-example' })).toMatchObject({ data: {
      rule_label: 'Lead Generation Rule', condition_summary: 'Email contains @example.com', matching_records: '23 record(s)',
    } });
    expect((await repository.querySource(listSource, { fixture_state: 'empty', active: null, q: null }, 0, 50)).data).toEqual([]);
    expect((await repository.querySource(detailSource, { fixture_state: 'not_found', id: 'missing-rule' })).data).toEqual({});
    expect(listSource.error_states.transport_error).toMatchObject({ status: 503, code: 'EVENT_LEAD_RULES_UNAVAILABLE' });
    expect(detailSource.error_states.missing_record).toMatchObject({ status: 404, code: 'EVENT_LEAD_RULE_NOT_FOUND' });
    database.close();
  });

  test('guards create, edit, execute, archive, restore, delete, and stale boundaries', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'events_lead_generation_mutation_migrations', ['schema', 'data']);
    const listApi = yaml('api/event-lead-generation.yaml');
    const detailApi = yaml('api/event-lead-generation-detail.yaml');
    const create = action('event-lead-generation.yaml', 'create_event_lead_rule');
    const edit = action('event-lead-generation-detail.yaml', 'edit_event_lead_rule');
    const execute = action('event-lead-generation-detail.yaml', 'execute_event_lead_rule');
    const archive = action('event-lead-generation-detail.yaml', 'archive_event_lead_rule');
    const restore = action('event-lead-generation-detail.yaml', 'unarchive_event_lead_rule');
    const remove = action('event-lead-generation-detail.yaml', 'delete_event_lead_rule');
    expect([create, edit, execute, archive, restore, remove].every((candidate: any) => candidate.permission === 'events.manage')).toBe(true);

    const values = { name: 'Architects follow-up', active: true, lead_creation_basis: 'Per Order', lead_creation_trigger: 'Attendees are registered', event_template_names: 'Exhibition', event_name: 'Conference for Architects', company_name: 'Visible to all', event_registration_filter: '[]', lead_type: 'Opportunity', sales_team_name: 'Direct Sales', salesperson_name: 'Mitchell Admin', tags: 'Conference', matched_registration_count: 4, lead_count: 0, execution_count: 0 };
    const created = await repository.executeMutation(create.mutation, { values });
    expect(created).toMatchObject({ id: 'event-lead-rule-architects-follow-up', name: values.name, row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { ...values, name: 'architects FOLLOW-UP' } })).rejects.toMatchObject({ status: 409, code: 'EVENT_LEAD_RULE_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Rule on @example.com' } })).rejects.toMatchObject({ status: 409, code: 'EVENT_LEAD_RULE_NAME_EXISTS' });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, lead_creation_trigger: 'Attendees completed' } })).rejects.toMatchObject({ status: 422, code: 'EVENT_LEAD_RULE_TRIGGER_INVALID' });

    const updated = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { ...values, name: 'Architects follow-up 2026' } });
    expect(updated).toMatchObject({ name: 'Architects follow-up 2026', row_version: 2 });
    const executed = await repository.executeMutation(execute.mutation, { id: created.id, expected_row_version: 2 });
    expect(executed).toMatchObject({ id: created.id, execution_count: 1, row_version: 3 });
    await expect(repository.executeMutation(execute.mutation, { id: created.id, expected_row_version: 2 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 3 });
    await expect(repository.executeMutation(archive.mutation, { id: created.id, expected_row_version: 4 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await repository.executeMutation(restore.mutation, { id: created.id, expected_row_version: 4 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 6 })).rejects.toMatchObject({ status: 404, code: 'EVENT_LEAD_RULE_NOT_FOUND' });
    expect(detailApi.datasources[0].permission).toBe('events.manage');
    expect(listApi.datasources[0].permission).toBe('events.manage');
    database.close();
  });

  test('keeps the fixture migration deterministic and event-owned', () => {
    const migration = readFileSync(join(serviceRoot, 'migrations/20260911140000-017-event-lead-generation.yaml'), 'utf8');
    expect(migration).toContain("'Rule on @example.com'");
    expect(migration).not.toMatch(/CURRENT_(DATE|TIMESTAMP)|gen_random_uuid\(\)|random\(\)/i);
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS event_lead_rules');
    expect(yaml('manifest.yaml').id).toBe('events');
  });
});
