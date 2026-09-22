import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/fleet');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (id: string) => yaml('api/vehicle-detail.yaml').actions.find((candidate: any) => candidate.id === id);
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(root, 'migrations'), undefined, name, ['schema', 'data']);

describe('Fleet vehicle chatter parity', () => {
  test('maps Odoo mail.thread chatter to the vehicle detail page/API seam', () => {
    const sourceModel = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle.py', 'utf8');
    const sourceView = readFileSync('/home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_views.xml', 'utf8');
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    expect(sourceModel).toContain("_inherit = ['mail.thread', 'mail.activity.mixin', 'avatar.mixin']");
    expect(sourceView).toContain('<chatter/>');
    expect(page.page.id).toBe('vehicle-detail');
    expect(api.page.id).toBe(page.page.id);
    expect(page.components[0]).toMatchObject({
      message_source: 'fleet_vehicle_detail_chatter',
      message_action: 'send_fleet_vehicle_detail_message',
      note_action: 'log_fleet_vehicle_detail_note',
    });
    expect(api.datasources.find((source: any) => source.id === 'fleet_vehicle_detail_chatter')?.query).toContain('FROM fleet_vehicle_messages');
    expect(api.datasources.find((source: any) => source.id === 'fleet_vehicle_detail_chatter')?.query).toContain('FROM fleet_vehicle_activities');
    expect(action('send_fleet_vehicle_detail_message')).toMatchObject({ type: 'server_form', permission: 'fleet.write', handler: 'order_chatter', operation: 'message' });
    expect(action('log_fleet_vehicle_detail_note')).toMatchObject({ type: 'server_form', permission: 'fleet.write', handler: 'order_chatter', operation: 'note' });
    expect(action('send_fleet_vehicle_detail_message').params).toMatchObject({ expected_row_version: '{state.fleet_vehicle_detail.row_version}' });
  });

  test('replays the seeded message, keeps vehicle activities in the stream, and persists a message and note', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_vehicle_chatter_crud');
    await migrate(repository, 'fleet_vehicle_chatter_crud');
    const api = yaml('api/vehicle-detail.yaml');
    const timeline = api.datasources.find((source: any) => source.id === 'fleet_vehicle_detail_chatter');
    const before = (await repository.query("SELECT row_version FROM fleet_vehicles WHERE id = 'fleet-demo-001'"))[0].row_version;
    expect((await repository.querySource(timeline, { id: 'fleet-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'fleet.vehicles.created', detail: 'Vehicle created' }), expect.objectContaining({ action: 'fleet.vehicles.activity.schedule' })]));

    const message = await repository.executeMutation(action('send_fleet_vehicle_detail_message').mutation, {
      id: 'fleet-demo-001', expected_row_version: before, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { content: 'Please confirm the service schedule.' },
    }) as any;
    expect(message).toMatchObject({ id: 'fleet-vehicle-message-fleet-demo-001-2', vehicle_id: 'fleet-demo-001', action: 'fleet.vehicles.chatter.message', action_label: 'Message', detail: 'Please confirm the service schedule.' });
    expect(await repository.query("SELECT row_version FROM fleet_vehicles WHERE id = 'fleet-demo-001'"))
      .toEqual([{ row_version: before + 1 }]);

    const note = await repository.executeMutation(action('log_fleet_vehicle_detail_note').mutation, {
      id: 'fleet-demo-001', expected_row_version: before + 1, current_user_id: 'user-admin', current_user_name: 'Admin User',
      values: { content: 'Internal note: inspect the registration.' },
    }) as any;
    expect(note).toMatchObject({ id: 'fleet-vehicle-message-fleet-demo-001-3', action: 'fleet.vehicles.chatter.note', action_label: 'Internal note' });
    expect((await repository.querySource(timeline, { id: 'fleet-demo-001', fixture_state: null }, 0, 50)).data)
      .toEqual(expect.arrayContaining([expect.objectContaining({ action: 'fleet.vehicles.chatter.message' }), expect.objectContaining({ action: 'fleet.vehicles.chatter.note' })]));
    await database.close();
  });

  test('rejects anonymous, blank, wrong-company, and stale chatter writes atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'fleet_vehicle_chatter_guards');
    const send = action('send_fleet_vehicle_detail_message');
    const initialVersion = (await repository.query("SELECT row_version FROM fleet_vehicles WHERE id = 'fleet-demo-001'"))[0].row_version;
    const base = { id: 'fleet-demo-001', expected_row_version: initialVersion, current_user_id: 'user-admin', current_user_name: 'Admin User', current_company_name: 'Core3 Demo Company', values: { content: 'A valid vehicle message' } };

    await expect(repository.executeMutation(send.mutation, { ...base, current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'FLEET_VEHICLE_CHATTER_ACTOR_REQUIRED' });
    await expect(repository.executeMutation(send.mutation, { ...base, values: { content: '   ' } })).rejects.toMatchObject({ status: 422, code: 'FLEET_VEHICLE_CHATTER_CONTENT_INVALID' });
    await expect(repository.executeMutation(send.mutation, { ...base, current_company_name: 'Vietnam Company' })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_CHATTER_PARENT_CHANGED' });
    await expect(repository.executeMutation(send.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'FLEET_VEHICLE_CHATTER_PARENT_CHANGED' });
    expect(await repository.query("SELECT COUNT(*) AS count FROM fleet_vehicle_messages WHERE vehicle_id = 'fleet-demo-001'"))
      .toEqual([{ count: 1 }]);
    await database.close();
  });

  test('preserves seeded and newly posted chatter through file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-fleet-chatter-'));
    const databasePath = join(directory, 'fleet.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'fleet_vehicle_chatter_restart');
      await firstRepository.executeMutation(action('log_fleet_vehicle_detail_note').mutation, {
        id: 'fleet-demo-002', expected_row_version: 1, current_user_id: 'user-manager', current_user_name: 'Fleet Manager', current_company_name: 'Core3 Demo Company',
        values: { content: 'Restart-safe vehicle note' },
      });
      await firstDatabase.close();

      const reopenedDatabase = await DuckDbDatabase.open(databasePath);
      const reopenedRepository = new YamlRepository(reopenedDatabase);
      await migrate(reopenedRepository, 'fleet_vehicle_chatter_restart');
      expect(await reopenedRepository.query("SELECT vehicle_id, actor_name, action, detail FROM fleet_vehicle_messages WHERE id = 'fleet-vehicle-message-fleet-demo-002-1'")).toEqual([
        { vehicle_id: 'fleet-demo-002', actor_name: 'Fleet Manager', action: 'fleet.vehicles.chatter.note', detail: 'Restart-safe vehicle note' },
      ]);
      expect(await reopenedRepository.query("SELECT COUNT(*) AS count FROM fleet_vehicle_messages WHERE id = 'fleet-vehicle-message-demo-001-1'"))
        .toEqual([{ count: 1 }]);
      expect(await reopenedRepository.query("SELECT row_version FROM fleet_vehicles WHERE id = 'fleet-demo-002'"))
        .toEqual([{ row_version: 2 }]);
      await reopenedDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
