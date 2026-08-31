/** Shared contract for previewing and committing typed tabular imports. */
export type ImportField = {
  key: string;
  type: 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime';
  required?: boolean;
};

export type ImportSchema = {
  id: string;
  fields: ImportField[];
};

export type ImportRow = {
  rowNumber: number;
  values: Record<string, unknown>;
};

export type ImportRowError = {
  rowNumber: number;
  field?: string;
  code: 'required' | 'type' | 'unknown_field' | 'duplicate';
  message: string;
};

export type ImportPreview = {
  schemaId: string;
  rows: ImportRow[];
  errors: ImportRowError[];
  valid: boolean;
  importKey: string;
};

export type ImportCommitResult = {
  importKey: string;
  status: 'committed' | 'rejected' | 'recoverable';
  acceptedRows: number;
  rejectedRows: number;
  errors?: ImportRowError[];
};

export type ImportCommitter = (rows: ImportRow[]) => Promise<{ acceptedRows: number }>;

export type ImportBatchRecord = ImportCommitResult & {
  schemaId: string;
  status: 'previewed' | 'committed' | 'rejected' | 'recoverable';
  createdAt: string;
  updatedAt: string;
  rows?: ImportRow[];
};

type ImportBatchRepository = {
  run(sql: string, params?: unknown[]): Promise<unknown>;
  query(sql: string, params?: unknown[]): Promise<any[]>;
  withTransaction<T>(fn: (connection: any) => Promise<T> | T): Promise<T>;
};

/** Durable, service-local storage for import lifecycle and retry state. */
export class ImportBatchStore {
  constructor(private readonly repository: ImportBatchRepository) {}

  async ensureSchema(): Promise<void> {
    await this.repository.run(`CREATE TABLE IF NOT EXISTS core_import_batches (
      import_key VARCHAR PRIMARY KEY, schema_id VARCHAR NOT NULL, status VARCHAR NOT NULL,
      accepted_rows INTEGER NOT NULL DEFAULT 0, rejected_rows INTEGER NOT NULL DEFAULT 0,
      errors_json VARCHAR NOT NULL DEFAULT '[]',
      rows_json VARCHAR NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await this.repository.run(`ALTER TABLE core_import_batches ADD COLUMN IF NOT EXISTS errors_json VARCHAR`);
    await this.repository.run(`ALTER TABLE core_import_batches ADD COLUMN IF NOT EXISTS rows_json VARCHAR`);
  }

  async get(importKey: string): Promise<ImportBatchRecord | null> {
    const rows = await this.repository.query('SELECT import_key, schema_id, status, accepted_rows, rejected_rows, errors_json, rows_json, CAST(created_at AS VARCHAR) AS created_at, CAST(updated_at AS VARCHAR) AS updated_at FROM core_import_batches WHERE import_key = ?', [importKey]);
    const row = rows[0];
    return row ? { importKey: row.import_key, schemaId: row.schema_id, status: row.status, acceptedRows: Number(row.accepted_rows), rejectedRows: Number(row.rejected_rows), errors: JSON.parse(String(row.errors_json || '[]')), rows: JSON.parse(String(row.rows_json || '[]')), createdAt: row.created_at, updatedAt: row.updated_at } : null;
  }

  async save(result: ImportCommitResult, schemaId: string, importRows: ImportRow[] = []): Promise<ImportBatchRecord> {
    await this.repository.withTransaction(async connection => {
      await connection.run(`INSERT INTO core_import_batches(import_key, schema_id, status, accepted_rows, rejected_rows, errors_json, rows_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(import_key) DO UPDATE SET status = excluded.status, accepted_rows = excluded.accepted_rows,
        rejected_rows = excluded.rejected_rows, errors_json = excluded.errors_json, rows_json = excluded.rows_json, updated_at = now()`,
        [result.importKey, schemaId, result.status, result.acceptedRows, result.rejectedRows, JSON.stringify(result.errors || []), JSON.stringify(importRows)]);
    });
    return (await this.get(result.importKey))!;
  }

  async list(schemaId: string, limit = 50): Promise<ImportBatchRecord[]> {
    const rows = await this.repository.query('SELECT import_key, schema_id, status, accepted_rows, rejected_rows, errors_json, rows_json, CAST(created_at AS VARCHAR) AS created_at, CAST(updated_at AS VARCHAR) AS updated_at FROM core_import_batches WHERE schema_id = ? ORDER BY updated_at DESC LIMIT ?', [schemaId, limit]);
    return rows.map(row => ({ importKey: row.import_key, schemaId: row.schema_id, status: row.status, acceptedRows: Number(row.accepted_rows), rejectedRows: Number(row.rejected_rows), errors: JSON.parse(String(row.errors_json || '[]')), rows: JSON.parse(String(row.rows_json || '[]')), createdAt: row.created_at, updatedAt: row.updated_at }));
  }
}

function csvRecords(input: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(value => value !== '')) records.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); if (row.some(value => value !== '')) records.push(row); }
  return records;
}

/** Convert CSV headers and records into the shared, schema-neutral row model. */
export function parseImportCsv(input: string, importKey: string): { importKey: string; headers: string[]; rows: ImportRow[]; errors: ImportRowError[] } {
  const records = csvRecords(input);
  const headers = (records.shift() || []).map(header => header.trim());
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  headers.forEach((header, index) => {
    if (!header) errors.push({ rowNumber: 1, field: String(index + 1), code: 'unknown_field', message: 'CSV header cannot be empty' });
    if (seen.has(header)) errors.push({ rowNumber: 1, field: header, code: 'duplicate', message: `Duplicate CSV header: ${header}` });
    seen.add(header);
  });
  const rows = records.map((record, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(headers.map((header, column) => [header, record[column] ?? ''])),
  }));
  return { importKey, headers, rows, errors };
}

/**
 * Shared commit boundary: invalid previews never reach the writer, and a
 * repeated import key returns the original result without writing twice.
 */
export async function commitImport(
  preview: ImportPreview,
  writer: ImportCommitter,
  completed = new Map<string, ImportCommitResult>(),
): Promise<ImportCommitResult> {
  const prior = completed.get(preview.importKey);
  if (prior) return prior;
  if (!preview.valid) {
    const result = { importKey: preview.importKey, status: 'rejected' as const, acceptedRows: 0, rejectedRows: preview.rows.length };
    completed.set(preview.importKey, result);
    return result;
  }
  try {
    const written = await writer(preview.rows);
    const result = { importKey: preview.importKey, status: 'committed' as const, acceptedRows: written.acceptedRows, rejectedRows: 0 };
    completed.set(preview.importKey, result);
    return result;
  } catch {
    return { importKey: preview.importKey, status: 'recoverable' as const, acceptedRows: 0, rejectedRows: 0 };
  }
}

export function validateImportRows(schema: ImportSchema, rows: ImportRow[], importKey: string): ImportPreview {
  const fields = new Map(schema.fields.map(field => [field.key, field]));
  const errors: ImportRowError[] = [];
  const normalizedRows = rows.map(row => ({ ...row, values: { ...row.values } }));
  for (const row of normalizedRows) {
    for (const key of Object.keys(row.values)) {
      if (!fields.has(key)) errors.push({ rowNumber: row.rowNumber, field: key, code: 'unknown_field', message: `Unknown field: ${key}` });
    }
    for (const field of schema.fields) {
      const value = row.values[field.key];
      if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
        errors.push({ rowNumber: row.rowNumber, field: field.key, code: 'required', message: `${field.key} is required` });
      }
      if (value === undefined || value === null || value === '') continue;
      const valid = field.type === 'text'
        ? typeof value === 'string'
        : field.type === 'date'
          ? typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
          : field.type === 'datetime'
            ? typeof value === 'string' && !Number.isNaN(Date.parse(value))
        : field.type === 'integer'
          ? Number.isInteger(value) || (typeof value === 'string' && /^-?\d+$/.test(value))
          : field.type === 'number'
            ? Number.isFinite(typeof value === 'number' ? value : Number(value))
            : field.type === 'boolean'
              ? typeof value === 'boolean' || ['true', 'false', '1', '0'].includes(String(value).toLowerCase())
              : false;
      if (!valid) errors.push({ rowNumber: row.rowNumber, field: field.key, code: 'type', message: `${field.key} must be ${field.type}` });
      else if (field.type === 'integer') row.values[field.key] = Number(value);
      else if (field.type === 'number') row.values[field.key] = Number(value);
      else if (field.type === 'boolean') row.values[field.key] = ['true', '1'].includes(String(value).toLowerCase());
    }
  }
  return { schemaId: schema.id, rows: normalizedRows, errors, valid: errors.length === 0, importKey };
}
