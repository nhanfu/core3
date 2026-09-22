import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = () => yaml('api/request-detail.yaml').actions.find((entry: any) => entry.id === 'update_maintenance_request_instructions');
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);

describe('Maintenance Request instructions parity', () => {
  test('binds the Odoo Instructions notebook to a page-owned guarded action', async () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml', 'utf8');
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const form = page.components[0];
    const update = action();

    expect(source).toContain('<page string="Instructions">');
    expect(source).toContain('name="instruction_type"');
    expect(source).toContain('name="instruction_google_slide"');
    expect(api.page.id).toBe(page.page.id);
    expect(form.notebook.tabs).toContainEqual(expect.objectContaining({ id: 'instructions', label: 'Instructions' }));
    expect(form.header_actions).toContainEqual(expect.objectContaining({ id: 'update_maintenance_request_instructions', permission: 'maintenance.write' }));
    expect(update).toMatchObject({ type: 'server_form', permission: 'maintenance.write', operation: 'update', handler: 'yaml_mutation' });
    expect(update.mutation).toMatchObject({ table: 'maintenance_requests', fields: ['instruction_type', 'instruction_text', 'instruction_google_slide'], concurrency: { required: true } });
    expect(update.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MAINTENANCE_INSTRUCTION_TYPE_INVALID', status: 422 }),
      expect.objectContaining({ code: 'MAINTENANCE_INSTRUCTION_CONTENT_INVALID', status: 422 }),
      expect.objectContaining({ code: 'STALE_RECORD', status: 409 }),
    ]));
  });

  test('persists text and Google Slide instruction modes with a revision guard', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_request_instructions_modes');
    const update = action();

    const text = await repository.executeMutation(update.mutation, {
      id: 'maintenance-demo-001', expected_row_version: 1,
      values: { instruction_type: 'text', instruction_text: 'Lock out the unit before service.', instruction_google_slide: '' },
    }) as any;
    expect(text).toMatchObject({ id: 'maintenance-demo-001', instruction_type: 'text', instruction_text: 'Lock out the unit before service.', row_version: 2 });

    const slide = await repository.executeMutation(update.mutation, {
      id: 'maintenance-demo-001', expected_row_version: 2,
      values: { instruction_type: 'google_slide', instruction_text: '', instruction_google_slide: 'https://slides.google.com/example/maintenance' },
    }) as any;
    expect(slide).toMatchObject({ instruction_type: 'google_slide', instruction_google_slide: 'https://slides.google.com/example/maintenance', row_version: 3 });
    expect(await repository.query('SELECT instruction_type, instruction_text, instruction_google_slide, row_version FROM maintenance_requests WHERE id = ?', ['maintenance-demo-001']))
      .toEqual([{ instruction_type: 'google_slide', instruction_text: '', instruction_google_slide: 'https://slides.google.com/example/maintenance', row_version: 3 }]);
    await database.close();
  });

  test('rejects unsupported, incomplete, invalid-link, stale, and archived instruction updates without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_request_instructions_guards');
    const update = action();
    const base = { id: 'maintenance-demo-001', expected_row_version: 1, values: { instruction_type: 'text', instruction_text: 'Valid service steps.', instruction_google_slide: '' } };

    await expect(repository.executeMutation(update.mutation, { ...base, values: { ...base.values, instruction_type: 'pdf' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_CONTENT_INVALID' });
    await expect(repository.executeMutation(update.mutation, { ...base, values: { ...base.values, instruction_text: '   ' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_CONTENT_INVALID' });
    await expect(repository.executeMutation(update.mutation, { ...base, values: { instruction_type: 'google_slide', instruction_text: '', instruction_google_slide: 'not a url' } })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_CONTENT_INVALID' });
    await expect(repository.executeMutation(update.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(update.mutation, { ...base, id: 'missing-maintenance-request' })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    await repository.query("UPDATE maintenance_requests SET archived = TRUE WHERE id = 'maintenance-demo-004'");
    await expect(repository.executeMutation(update.mutation, { ...base, id: 'maintenance-demo-004' })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    expect(await repository.query("SELECT instruction_type, instruction_text, instruction_google_slide, row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))
      .toEqual([{ instruction_type: 'text', instruction_text: 'Use the approved calibration checklist.', instruction_google_slide: null, row_version: 1 }]);
    await database.close();
  });

  test('replays instruction migration and preserves content across a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-maintenance-instructions-'));
    const databasePath = join(directory, 'maintenance.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'maintenance_request_instructions_restart');
      await migrate(firstRepository, 'maintenance_request_instructions_restart');
      const update = action();
      await firstRepository.executeMutation(update.mutation, {
        id: 'maintenance-demo-002', expected_row_version: 1,
        values: { instruction_type: 'text', instruction_text: 'Restart-safe maintenance instructions.', instruction_google_slide: '' },
      });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(secondDatabase);
      await migrate(secondRepository, 'maintenance_request_instructions_restart');
      expect(await secondRepository.query("SELECT instruction_type, instruction_text, row_version FROM maintenance_requests WHERE id = 'maintenance-demo-002'"))
        .toEqual([{ instruction_type: 'text', instruction_text: 'Restart-safe maintenance instructions.', row_version: 2 }]);
      await secondDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
