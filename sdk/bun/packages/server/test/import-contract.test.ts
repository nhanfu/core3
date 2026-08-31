import { describe, expect, it } from 'bun:test';
import { ImportBatchStore, commitImport, parseImportCsv, validateImportRows } from '../src/interfaces/import.ts';
import { DuckDbDatabase } from '../src/database/duckdb-database.ts';
import { DuckDbRepository } from '../src/database/repository.ts';

describe('shared import contract', () => {
  const schema = { id: 'crm.lead', fields: [
    { key: 'name', type: 'text' as const, required: true },
    { key: 'probability', type: 'integer' as const },
    { key: 'expected_closing', type: 'date' as const },
  ] };

  it('returns row-level errors without mutating input rows', () => {
    const rows = [{ rowNumber: 2, values: { probability: 'bad', extra: 'x' } }];
    const preview = validateImportRows(schema, rows, 'imp-1');
    expect(preview.valid).toBe(false);
    expect(preview.importKey).toBe('imp-1');
    expect(preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ rowNumber: 2, field: 'name', code: 'required' }),
      expect.objectContaining({ rowNumber: 2, field: 'probability', code: 'type' }),
      expect.objectContaining({ rowNumber: 2, field: 'extra', code: 'unknown_field' }),
    ]));
    expect(rows[0].values).toEqual({ probability: 'bad', extra: 'x' });
  });

  it('accepts valid typed rows', () => {
    const valid = validateImportRows(schema, [{ rowNumber: 2, values: { name: 'Acme', probability: '60', expected_closing: '2026-09-15' } }], 'imp-2');
    expect(valid.valid).toBe(true);
    expect(valid.rows[0].values.probability).toBe(60);
    expect(validateImportRows(schema, [{ rowNumber: 2, values: { name: 'Acme', expected_closing: '15/09/2026' } }], 'imp-2b').valid).toBe(false);
  });

  it('parses quoted CSV cells into the shared row model', () => {
    const parsed = parseImportCsv('name,notes\nAcme,"Needs, follow-up"\n', 'imp-csv');
    expect(parsed.rows).toEqual([{ rowNumber: 2, values: { name: 'Acme', notes: 'Needs, follow-up' } }]);
    expect(parsed.errors).toEqual([]);
  });

  it('reports duplicate or empty CSV headers', () => {
    const parsed = parseImportCsv('name,name,\nAcme,Other,x\n', 'imp-csv-2');
    expect(parsed.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate' }),
      expect.objectContaining({ code: 'unknown_field' }),
    ]));
  });

  it('rejects invalid previews and does not call the writer', async () => {
    let writes = 0;
    const preview = validateImportRows(schema, [{ rowNumber: 2, values: {} }], 'imp-3');
    expect(await commitImport(preview, async () => { writes++; return { acceptedRows: 1 }; })).toMatchObject({ status: 'rejected' });
    expect(writes).toBe(0);
  });

  it('makes successful commits idempotent and exposes failures as recoverable', async () => {
    const completed = new Map();
    const preview = validateImportRows(schema, [{ rowNumber: 2, values: { name: 'Acme', probability: 60 } }], 'imp-4');
    let writes = 0;
    const first = await commitImport(preview, async rows => { writes++; return { acceptedRows: rows.length }; }, completed);
    const second = await commitImport(preview, async () => { writes++; return { acceptedRows: 99 }; }, completed);
    expect(first.status).toBe('committed');
    expect(second).toEqual(first);
    expect(writes).toBe(1);
    const failed = await commitImport({ ...preview, importKey: 'imp-5' }, async () => { throw new Error('temporary'); });
    expect(failed.status).toBe('recoverable');
  });

  it('commits and rolls back repository transactions atomically', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new DuckDbRepository(database);
    await repository.run('CREATE TABLE import_probe(id VARCHAR PRIMARY KEY)');
    await repository.withTransaction(async conn => {
      await conn.run('INSERT INTO import_probe VALUES (?)', ['committed']);
    });
    expect(await repository.query('SELECT id FROM import_probe')).toEqual([{ id: 'committed' }]);
    await expect(repository.withTransaction(async conn => {
      await conn.run('INSERT INTO import_probe VALUES (?)', ['rolled-back']);
      throw new Error('temporary failure');
    })).rejects.toThrow('temporary failure');
    expect(await repository.query('SELECT id FROM import_probe ORDER BY id')).toEqual([{ id: 'committed' }]);
    await database.close();
  });

  it('persists import lifecycle state and supports idempotent updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new DuckDbRepository(database);
    const store = new ImportBatchStore(repository);
    await store.ensureSchema();
    const errors = [{ rowNumber: 2, field: 'name', code: 'required' as const, message: 'name is required' }];
    const saved = await store.save({ importKey: 'durable-1', status: 'recoverable', acceptedRows: 0, rejectedRows: 2, errors }, 'crm.lead');
    expect(saved).toMatchObject({ importKey: 'durable-1', schemaId: 'crm.lead', status: 'recoverable', rejectedRows: 2, errors });
    await store.save({ importKey: 'durable-1', status: 'committed', acceptedRows: 2, rejectedRows: 0 }, 'crm.lead');
    expect(await store.get('durable-1')).toMatchObject({ status: 'committed', acceptedRows: 2 });
    expect(await store.list('crm.lead')).toHaveLength(1);
    await database.close();
  });

  it('executes YAML mutations on a caller-owned transaction', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new DuckDbRepository(database);
    await repository.run('CREATE TABLE import_rows(id VARCHAR PRIMARY KEY, name VARCHAR)');
    await repository.withTransaction(async connection => {
      await repository.executeMutationOnConnection(connection, { operation: 'insert', table: 'import_rows', fields: ['name'] }, { id: 'row-1', values: { name: 'Acme' } });
      await repository.executeMutationOnConnection(connection, { operation: 'insert', table: 'import_rows', fields: ['name'] }, { id: 'row-2', values: { name: 'Globex' } });
    });
    expect(await repository.query('SELECT id, name FROM import_rows ORDER BY id')).toEqual([{ id: 'row-1', name: 'Acme' }, { id: 'row-2', name: 'Globex' }]);
    await database.close();
  });
});
