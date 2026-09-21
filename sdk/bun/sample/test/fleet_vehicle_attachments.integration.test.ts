import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/fleet');
const odooRoot = '/home/nhanjs/projects/odoo/addons/fleet';
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((entry: any) => entry.id === id);

describe('Fleet vehicle attachment parity', () => {
  test('maps the Odoo vehicle chatter and keeps page/API/storage ownership explicit', () => {
    const page = yaml('pages/vehicle-detail.yaml');
    const api = yaml('api/vehicle-detail.yaml');
    const storage = yaml('storage.yaml');
    expect(page.datasources).toBeUndefined();
    expect(page.actions).toBeUndefined();
    expect(page.page.id).toBe('vehicle-detail');
    expect(page.components[0]).toMatchObject({
      source: 'fleet_vehicle_detail',
      attachment_source: 'fleet_vehicle_attachments',
      attachment_upload_action: 'upload_fleet_vehicle_attachment',
      attachment_download_action: 'download_fleet_vehicle_attachment',
    });
    expect(api.page.id).toBe(page.page.id);
    expect(api.datasources.map((entry: any) => entry.id)).toContain('fleet_vehicle_attachments');
    expect(api.datasources.find((entry: any) => entry.id === 'fleet_vehicle_attachments')).toMatchObject({ permission: 'fleet.read' });
    expect(action(api, 'upload_fleet_vehicle_attachment')).toMatchObject({ type: 'upload', handler: 'attachment_metadata', permission: 'fleet.write', kind: 'fleet_vehicle_attachment' });
    expect(action(api, 'remove_fleet_vehicle_attachment')).toMatchObject({ type: 'server', permission: 'fleet.write', operation: 'delete' });
    expect(storage.attachments.fleet_vehicle_attachment.download).toMatchObject({ route: '/api/fleet/vehicle-attachments', permission: 'fleet.read' });

    const model = readFileSync(join(odooRoot, 'models/fleet_vehicle.py'), 'utf8');
    const view = readFileSync(join(odooRoot, 'views/fleet_vehicle_views.xml'), 'utf8');
    expect(model).toContain("_inherit = ['mail.thread', 'mail.activity.mixin', 'avatar.mixin']");
    expect(view).toContain('<chatter/>');
  });

  test('reads deterministic, company-scoped attachments and exposes empty/transport contracts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_vehicle_attachments_seed', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'fleet_vehicle_attachments_seed', ['schema', 'data']);
    const api = yaml('api/vehicle-detail.yaml');
    const source = api.datasources.find((entry: any) => entry.id === 'fleet_vehicle_attachments');
    expect(source.error_states.transport_error).toMatchObject({ status: 503, code: 'FLEET_VEHICLE_ATTACHMENTS_UNAVAILABLE' });
    expect((await repository.querySource(source, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company' }, 0, 20)).data).toMatchObject([
      expect.objectContaining({ id: 'fleet-vehicle-attachment-demo-001', file_name: 'vehicle-registration.pdf', mime_type: 'application/pdf' }),
    ]);
    expect((await repository.querySource(source, { id: 'fleet-demo-001', current_company_name: 'Core3 Vietnam' }, 0, 20)).data).toEqual([]);
    expect((await repository.querySource(source, { id: 'fleet-demo-001', current_company_name: 'Core3 Demo Company', fixture_state: 'empty' }, 0, 20)).data).toEqual(expect.any(Array));
    await database.close();
  });

  test('uploads, removes, rejects guards, and preserves metadata through file-backed restart', async () => {
    const databasePath = `/tmp/core3-fleet-vehicle-attachments-${crypto.randomUUID()}.duckdb`;
    const migrationName = `fleet_vehicle_attachments_${crypto.randomUUID().replaceAll('-', '_')}`;
    const first = await DuckDbDatabase.open(databasePath);
    const firstRepository = new YamlRepository(first);
    await migrateDatabase(firstRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    const api = yaml('api/vehicle-detail.yaml');
    const upload = action(api, 'upload_fleet_vehicle_attachment');
    const remove = action(api, 'remove_fleet_vehicle_attachment');
    const base = {
      attachment_id: 'fleet-vehicle-attachment-test-001', vehicle_id: 'fleet-demo-001', expected_row_version: 1,
      fileName: 'insurance-card.png', mimeType: 'image/png', sizeBytes: 128, storageKey: 'fleet/insurance-card.png',
      current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin',
    };
    await expect(firstRepository.executeMutation(upload.mutation, base)).resolves.toMatchObject({ id: base.attachment_id, vehicle_id: base.vehicle_id, file_name: base.fileName });
    expect(await firstRepository.query("SELECT row_version FROM fleet_vehicles WHERE id = 'fleet-demo-001'")).toEqual([{ row_version: 2 }]);
    await expect(firstRepository.executeMutation(upload.mutation, { ...base, attachment_id: 'fleet-vehicle-attachment-no-actor', current_user_id: '' })).rejects.toMatchObject({ status: 403, code: 'FLEET_ATTACHMENT_ACTOR_REQUIRED' });
    await expect(firstRepository.executeMutation(upload.mutation, { ...base, attachment_id: 'fleet-vehicle-attachment-stale', expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(firstRepository.executeMutation(upload.mutation, { ...base, attachment_id: 'fleet-vehicle-attachment-invalid', fileName: 'bad.txt', mimeType: 'text/plain', sizeBytes: 0, expected_row_version: 2 })).rejects.toMatchObject({ status: 422, code: 'FLEET_ATTACHMENT_INVALID' });
    await expect(firstRepository.executeMutation(upload.mutation, { ...base, attachment_id: 'fleet-vehicle-attachment-cross-company', expected_row_version: 2, current_company_name: 'Core3 Vietnam' })).rejects.toMatchObject({ status: 404, code: 'FLEET_ATTACHMENT_VEHICLE_NOT_FOUND' });
    expect(await firstRepository.query("SELECT COUNT(*) AS count FROM fleet_vehicle_attachments WHERE id = 'fleet-vehicle-attachment-invalid'")).toEqual([{ count: 0 }]);

    await first.close();
    const second = await DuckDbDatabase.open(databasePath);
    const secondRepository = new YamlRepository(second);
    await migrateDatabase(secondRepository, join(serviceRoot, 'migrations'), undefined, migrationName, ['schema', 'data']);
    expect(await secondRepository.query("SELECT file_name, storage_key, uploaded_by, active FROM fleet_vehicle_attachments WHERE id = 'fleet-vehicle-attachment-test-001'")).toEqual([{ file_name: 'insurance-card.png', storage_key: 'fleet/insurance-card.png', uploaded_by: 'user-admin', active: true }]);
    await expect(secondRepository.executeMutation(remove.mutation, { id: 'fleet-demo-001', line_id: base.attachment_id, expected_row_version: 1, parent_expected_row_version: 2, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin' })).resolves.toEqual({ deleted: true, id: base.attachment_id });
    expect(await secondRepository.query("SELECT active FROM fleet_vehicle_attachments WHERE id = 'fleet-vehicle-attachment-test-001'")).toEqual([{ active: false }]);
    await expect(secondRepository.executeMutation(remove.mutation, { id: 'fleet-demo-001', line_id: base.attachment_id, expected_row_version: 1, parent_expected_row_version: 3, current_company_name: 'Core3 Demo Company', current_user_id: 'user-admin' })).rejects.toMatchObject({ status: 409, code: 'FLEET_ATTACHMENT_STALE' });
    await second.close();
    rmSync(databasePath, { force: true });
  });
});
