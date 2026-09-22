import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/maintenance');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const migrate = async (repository: YamlRepository, name: string) =>
  migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, name, ['schema', 'data']);

describe('Maintenance Request PDF instruction parity', () => {
  test('maps the Odoo PDF viewer to a page/API upload and download contract', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/views/maintenance_views.xml', 'utf8');
    const model = readFileSync('/home/nhanjs/projects/odoo/addons/maintenance/models/maintenance.py', 'utf8');
    const page = yaml('pages/request-detail.yaml');
    const api = yaml('api/request-detail.yaml');
    const storage = yaml('storage.yaml');
    const form = page.components[0];
    const upload = api.actions.find((entry: any) => entry.id === 'upload_maintenance_request_instruction_pdf');
    const download = api.actions.find((entry: any) => entry.id === 'download_maintenance_request_instruction_pdf');

    expect(model).toContain("('pdf', 'PDF')");
    expect(model).toContain("instruction_pdf = fields.Binary('PDF')");
    expect(source).toContain('widget="pdf_viewer"');
    expect(source).toContain('name="instruction_pdf"');
    expect(form).toMatchObject({
      attachment_source: 'maintenance_request_instruction_pdf',
      attachment_upload_action: 'upload_maintenance_request_instruction_pdf',
      attachment_download_action: 'download_maintenance_request_instruction_pdf',
      attachment_accept: 'application/pdf,.pdf',
    });
    expect(api.page).toEqual({ id: 'maintenance-request-detail' });
    expect(upload).toMatchObject({ type: 'upload', permission: 'maintenance.write', handler: 'attachment_metadata', kind: 'maintenance_request_instruction_pdf' });
    expect(upload.mutation.guards).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MAINTENANCE_INSTRUCTION_PDF_INVALID', status: 422 }),
      expect.objectContaining({ code: 'STALE_RECORD', status: 409 }),
    ]));
    expect(download).toMatchObject({ type: 'download', permission: 'maintenance.read', kind: 'maintenance_request_instruction_pdf' });
    expect(storage.attachments.maintenance_request_instruction_pdf.download).toMatchObject({ route: '/api/maintenance/request-instruction-pdfs', permission: 'maintenance.read' });
  });

  test('persists a PDF instruction upload, switches the active mode, and increments the request revision', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_request_instruction_pdf');
    const upload = yaml('api/request-detail.yaml').actions.find((entry: any) => entry.id === 'upload_maintenance_request_instruction_pdf');

    const uploaded = await repository.executeMutation(upload.mutation, {
      id: 'maintenance-demo-001', expected_row_version: 1, fileName: 'maintenance-guide.pdf',
      mimeType: 'application/pdf', sizeBytes: 2048, storageKey: 'maintenance/instructions/maintenance-guide.pdf', current_user_id: 'maintenance-manager',
    }) as any;
    expect(uploaded).toMatchObject({ id: 'maintenance-demo-001', row_version: 2, instruction_type: 'pdf', file_name: 'maintenance-guide.pdf', mime_type: 'application/pdf', size_bytes: 2048 });
    expect(await repository.query("SELECT instruction_type, instruction_pdf_file_name, instruction_pdf_storage_key, row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))
      .toEqual([{ instruction_type: 'pdf', instruction_pdf_file_name: 'maintenance-guide.pdf', instruction_pdf_storage_key: 'maintenance/instructions/maintenance-guide.pdf', row_version: 2 }]);
    expect(await repository.query("SELECT instruction_pdf_file_name AS file_name, instruction_pdf_mime_type AS mime_type, instruction_pdf_size_bytes AS size_bytes FROM maintenance_requests WHERE id = 'maintenance-demo-001' AND instruction_type = 'pdf'"))
      .toEqual([{ file_name: 'maintenance-guide.pdf', mime_type: 'application/pdf', size_bytes: 2048 }]);
    await database.close();
  });

  test('rejects non-PDF, empty, oversized, stale, missing, and archived uploads without partial writes', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrate(repository, 'maintenance_request_instruction_pdf_guards');
    const upload = yaml('api/request-detail.yaml').actions.find((entry: any) => entry.id === 'upload_maintenance_request_instruction_pdf');
    const base = { id: 'maintenance-demo-001', expected_row_version: 1, fileName: 'guide.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'guide.pdf', current_user_id: 'maintenance-manager' };

    await expect(repository.executeMutation(upload.mutation, { ...base, mimeType: 'text/plain' })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_PDF_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, fileName: 'guide.txt' })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_PDF_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, sizeBytes: 0 })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_PDF_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, sizeBytes: 10485761 })).rejects.toMatchObject({ status: 422, code: 'MAINTENANCE_INSTRUCTION_PDF_INVALID' });
    await expect(repository.executeMutation(upload.mutation, { ...base, expected_row_version: 99 })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(upload.mutation, { ...base, id: 'missing-maintenance-request' })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    await repository.query("UPDATE maintenance_requests SET archived = TRUE WHERE id = 'maintenance-demo-004'");
    await expect(repository.executeMutation(upload.mutation, { ...base, id: 'maintenance-demo-004' })).rejects.toMatchObject({ status: 404, code: 'MAINTENANCE_REQUEST_NOT_FOUND' });
    expect(await repository.query("SELECT instruction_type, instruction_pdf_file_name, row_version FROM maintenance_requests WHERE id = 'maintenance-demo-001'"))
      .toEqual([{ instruction_type: 'text', instruction_pdf_file_name: null, row_version: 1 }]);
    await database.close();
  });

  test('replays the PDF migration and preserves uploaded metadata after a file-backed restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'core3-maintenance-instruction-pdf-'));
    const databasePath = join(directory, 'maintenance.duckdb');
    try {
      const firstDatabase = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(firstDatabase);
      await migrate(firstRepository, 'maintenance_request_instruction_pdf_restart');
      await migrate(firstRepository, 'maintenance_request_instruction_pdf_restart');
      const upload = yaml('api/request-detail.yaml').actions.find((entry: any) => entry.id === 'upload_maintenance_request_instruction_pdf');
      await firstRepository.executeMutation(upload.mutation, { id: 'maintenance-demo-002', expected_row_version: 1, fileName: 'restart-safe.pdf', mimeType: 'application/pdf', sizeBytes: 512, storageKey: 'maintenance/restart-safe.pdf', current_user_id: 'maintenance-manager' });
      await firstDatabase.close();

      const secondDatabase = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(secondDatabase);
      await migrate(secondRepository, 'maintenance_request_instruction_pdf_restart');
      expect(await secondRepository.query("SELECT instruction_type, instruction_pdf_file_name, instruction_pdf_storage_key, row_version FROM maintenance_requests WHERE id = 'maintenance-demo-002'"))
        .toEqual([{ instruction_type: 'pdf', instruction_pdf_file_name: 'restart-safe.pdf', instruction_pdf_storage_key: 'maintenance/restart-safe.pdf', row_version: 2 }]);
      await secondDatabase.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
