import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { authenticatedCompanyName } from './routes/auth-context';
import { bindNamedParams } from './database/sql';
import type { YamlRepository } from './database/yaml-repository';
import type { ModuleApiHandler } from './module';
import { WorkbookEngine } from './workbook-engine';
import type { YamlSourceReader } from './yaml-source-reader';

type WorkbookSource = {
  label: string; service: string; source: string; permission: string; max_rows: number;
  columns: Array<{ field: string; label: string }>;
  filters: Record<string, { label: string; type: 'text' | 'date' | 'number' | 'boolean'; required?: boolean; global_filter?: string }>;
};

export type WorkbookRuntimeDefinition = {
  endpoint: string;
  permissions: { read: string; write: string; manage: string; export: string };
  max_snapshot_bytes: number;
  max_revision_bytes: number;
  max_commands: number;
  max_import_bytes: number;
  max_import_expanded_bytes: number;
  max_import_files: number;
  max_share_days: number;
  max_data_queries: number;
  allowed_commands: string[];
  sources?: Record<string, WorkbookSource>;
  operations: Record<string, { query?: string; mutation?: any }>;
};
type AuthProvider = { getCurrentUser(request: Request): Promise<any>; hasPermission(user: any, permission: string): boolean };
const REVISION_TYPES = new Set(['REMOTE_REVISION', 'REVISION_UNDONE', 'REVISION_REDONE']);
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/;
const fail = (status: number, code: string, message: string): never => { throw Object.assign(new Error(message), { status, code }); };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export function validateWorkbookRuntime(value: any): WorkbookRuntimeDefinition {
  const globalTypes = new Map<string, string>();
  if (!value || !/^\/api\/[a-z0-9/-]+$/.test(value.endpoint || '') || value.endpoint.endsWith('/')) throw new Error('Invalid workbook endpoint');
  for (const permission of ['read', 'write', 'manage', 'export']) if (typeof value.permissions?.[permission] !== 'string' || !value.permissions[permission]) throw new Error(`Missing workbook ${permission} permission`);
  for (const limit of ['max_snapshot_bytes', 'max_revision_bytes', 'max_commands', 'max_import_bytes', 'max_import_expanded_bytes', 'max_import_files', 'max_share_days', 'max_data_queries']) if (!Number.isSafeInteger(value[limit]) || value[limit] < 1) throw new Error(`Invalid workbook ${limit}`);
  if (!Array.isArray(value.allowed_commands) || !value.allowed_commands.length || value.allowed_commands.some((name: unknown) => typeof name !== 'string' || !/^[A-Z_]+$/.test(name))) throw new Error('Invalid workbook command allowlist');
  for (const [key, source] of Object.entries(value.sources || {}) as Array<[string, WorkbookSource]>) {
    if (!IDENTIFIER.test(key) || !source || !IDENTIFIER.test(source.service) || !IDENTIFIER.test(source.source) || !source.label || !source.permission || !Number.isSafeInteger(source.max_rows) || source.max_rows < 1) throw new Error('Invalid workbook datasource');
    if (!Array.isArray(source.columns) || !source.columns.length || source.columns.some(column => !column.label || !IDENTIFIER.test(column.field))) throw new Error('Invalid workbook datasource columns');
    for (const [name, filter] of Object.entries(source.filters || {})) {
      if (!IDENTIFIER.test(name) || /^(current_|company_name$|view_scope$|customer_scope$)/.test(name) || !['text', 'date', 'number', 'boolean'].includes(filter.type) || !filter.label) throw new Error('Invalid workbook datasource filter');
      if (filter.global_filter !== undefined) {
        if (!IDENTIFIER.test(filter.global_filter) || globalTypes.has(filter.global_filter) && globalTypes.get(filter.global_filter) !== filter.type) throw new Error('Invalid workbook global filter mapping');
        globalTypes.set(filter.global_filter, filter.type);
      }
    }
  }
  for (const operation of ['list', 'access', 'load', 'create', 'metadata', 'members', 'grant', 'remove_member', 'revisions', 'revision', 'append', 'checkpoint', 'history', 'version', 'restore', 'public_share', 'shares', 'create_share', 'revoke_share']) {
    const definition = value.operations?.[operation];
    if (!definition || (typeof definition.query !== 'string' && !definition.mutation)) throw new Error(`Missing workbook operation: ${operation}`);
  }
  if (globalTypes.size && (!value.operations?.viewer_filters?.query || !value.operations?.save_viewer_filters?.mutation)) throw new Error('Missing workbook viewer filter operations');
  return value;
}

/** Engine protocol infrastructure. Domain tables, ACLs and mutations are YAML-owned. */
export class WorkbookRuntime {
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly engine = new WorkbookEngine();
  dispose() { this.engine.stop(); }
  constructor(readonly definition: WorkbookRuntimeDefinition, private readonly repository: YamlRepository, private readonly auth: AuthProvider, private readonly resolveSource?: (service: string) => YamlSourceReader) {}

  private async execute(name: string, params: Record<string, any>): Promise<any> {
    const operation = this.definition.operations[name];
    if (!operation) return fail(500, 'WORKBOOK_CONFIGURATION', `Operation ${name} is not configured`);
    if (operation.mutation) return this.repository.executeMutation(operation.mutation, params);
    const bound = bindNamedParams(operation.query!, params);
    return this.repository.query(bound.statement, bound.values);
  }

  private async serial<T>(id: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(work);
    this.queues.set(id, next);
    try { return await next; } finally { if (this.queues.get(id) === next) this.queues.delete(id); }
  }

  private requirePermission(user: any, permission: keyof WorkbookRuntimeDefinition['permissions']) {
    if (!this.auth.hasPermission(user, this.definition.permissions[permission])) fail(403, 'WORKBOOK_FORBIDDEN', 'Insufficient workbook permission');
  }

  private async access(params: Record<string, any>, level: 'read' | 'edit' | 'manage' = 'read') {
    const [access] = await this.execute('access', params);
    if (!access) return fail(404, 'WORKBOOK_NOT_FOUND', 'Workbook unavailable');
    if (level !== 'read' && !access[`can_${level}`]) fail(403, 'WORKBOOK_FORBIDDEN', 'Insufficient workbook access');
    return access;
  }

  private async bytes(request: Request, limit: number) {
    if (Number(request.headers.get('content-length')) > limit) fail(413, 'WORKBOOK_TOO_LARGE', 'Workbook request exceeds the configured limit');
    const reader = request.body?.getReader();
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > limit) { await reader.cancel(); fail(413, 'WORKBOOK_TOO_LARGE', 'Workbook request exceeds the configured limit'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
    }
    return Buffer.concat(chunks);
  }

  private async body(request: Request, limit: number) {
    const bytes = await this.bytes(request, limit);
    let value: any;
    try { value = JSON.parse(bytes.toString('utf8')); } catch { fail(400, 'WORKBOOK_INVALID_JSON', 'Expected a JSON object'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'WORKBOOK_INVALID_JSON', 'Expected a JSON object');
    const pending: Array<[any, number]> = [[value, 0]];
    while (pending.length) {
      const [object, depth] = pending.pop()!;
      if (depth > 80) fail(422, 'WORKBOOK_INVALID_JSON', 'Workbook request is nested too deeply');
      for (const [key, child] of Object.entries(object)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) fail(422, 'WORKBOOK_INVALID_JSON', 'Unsafe workbook property');
        if (child && typeof child === 'object') pending.push([child, depth + 1]);
      }
    }
    return value;
  }

  private snapshot(data: any, revisionId: string) {
    if (!data || !Array.isArray(data.sheets) || !data.sheets.length) fail(422, 'WORKBOOK_INVALID_SNAPSHOT', 'A workbook needs at least one sheet');
    const ids = new Set();
    for (const sheet of data.sheets) {
      if (!sheet || typeof sheet.id !== 'string' || !sheet.id || ids.has(sheet.id) || typeof sheet.name !== 'string' || !sheet.name.trim()) fail(422, 'WORKBOOK_INVALID_SNAPSHOT', 'Sheet IDs must be unique and sheets must be named');
      ids.add(sheet.id);
      if (!Number.isSafeInteger(sheet.colNumber) || sheet.colNumber < 1 || !Number.isSafeInteger(sheet.rowNumber) || sheet.rowNumber < 1) fail(422, 'WORKBOOK_INVALID_SNAPSHOT', 'Invalid sheet dimensions');
      if (sheet.cells && (typeof sheet.cells !== 'object' || Array.isArray(sheet.cells))) fail(422, 'WORKBOOK_INVALID_SNAPSHOT', 'Invalid cells');
      for (const [address, content] of Object.entries(sheet.cells || {})) {
        if (!/^[A-Z]+[1-9][0-9]*$/.test(address) || typeof content !== 'string') fail(422, 'WORKBOOK_INVALID_SNAPSHOT', 'Invalid cell address or content');
      }
    }
    return JSON.stringify({ ...data, revisionId });
  }

  private catalog(user: any) { return Object.entries(this.definition.sources || {}).filter(([, source]) => this.auth.hasPermission(user, source.permission)).map(([key, source]) => ({ key, label: source.label, columns: source.columns, filters: source.filters, max_rows: source.max_rows })); }

  private globalFilters(user: any) {
    return [...new Map(this.catalog(user).flatMap(source => Object.values(source.filters || {}).filter(field => field.global_filter).map(field => [field.global_filter!, { key: field.global_filter!, label: field.label, type: field.type }] as const))).values()];
  }

  private async filterValues(params: Record<string, any>) {
    if (!this.definition.operations.viewer_filters) return {};
    const [row] = await this.execute('viewer_filters', params);
    return row ? JSON.parse(row.filter_values) : {};
  }

  private async queryData(user: any, request: Request, body: any, values: Record<string, any> = {}) {
    const source = typeof body.source === 'string' && Object.hasOwn(this.definition.sources || {}, body.source) ? this.definition.sources![body.source] : undefined;
    if (!source || !this.auth.hasPermission(user, source.permission)) fail(403, 'WORKBOOK_SOURCE_FORBIDDEN', 'Datasource unavailable');
    const filters = body.filters || {};
    if (typeof filters !== 'object' || Array.isArray(filters) || Object.keys(filters).some(key => !Object.hasOwn(source.filters || {}, key))) fail(422, 'WORKBOOK_SOURCE_FILTER', 'Unknown datasource filter');
    for (const [name, field] of Object.entries(source.filters || {})) {
      if (field.global_filter && Object.hasOwn(values, field.global_filter)) filters[name] = values[field.global_filter];
      const value = filters[name];
      if (value === undefined || value === null || value === '') { if (field.required) fail(422, 'WORKBOOK_SOURCE_FILTER', `${field.label} is required`); delete filters[name]; continue; }
      const valid = field.type === 'boolean' ? typeof value === 'boolean' : field.type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === 'string' && value.length <= 256 && (field.type !== 'date' || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value));
      if (!valid) fail(422, 'WORKBOOK_SOURCE_FILTER', `Invalid ${field.label}`);
    }
    const skip = body.skip ?? 0, top = body.top ?? Math.min(50, source.max_rows);
    if (!Number.isSafeInteger(skip) || skip < 0 || !Number.isSafeInteger(top) || top < 1 || top > source.max_rows) fail(422, 'WORKBOOK_SOURCE_RANGE', 'Invalid datasource page');
    if (!this.resolveSource) fail(503, 'WORKBOOK_SOURCE_UNAVAILABLE', 'Datasource service unavailable');
    const result = await this.resolveSource(source.service).readSource(request, source.source, filters, skip, top);
    if (!Array.isArray(result.data)) fail(502, 'WORKBOOK_SOURCE_FAILED', 'Datasource returned invalid rows');
    return { source: body.source, columns: source.columns, data: result.data.map((row: any) => Object.fromEntries(source.columns.map(column => [column.field, row[column.field] ?? null]))), meta: result.meta || {}, skip, top, refreshed_at: new Date().toISOString() };
  }

  private async load(params: Record<string, any>) {
    const [workbook] = await this.execute('load', params);
    if (!workbook) return fail(404, 'WORKBOOK_NOT_FOUND', 'Workbook unavailable');
    const revisions = await this.execute('revisions', { ...params, after_sequence: workbook.snapshot_sequence, through_sequence: workbook.head_sequence });
    return { ...workbook, snapshot: JSON.parse(workbook.workbook_snapshot), workbook_snapshot: undefined, revisions: revisions.map((row: any) => JSON.parse(row.body)) };
  }

  handle: ModuleApiHandler = async (request, url) => {
    const prefix = this.definition.endpoint;
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return null;
    try {
      const publicPath = url.pathname.slice(prefix.length).match(/^\/public\/([A-Za-z0-9_-]{43})$/);
      if (publicPath) {
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const [share] = await this.execute('public_share', { token_hash: createHash('sha256').update(publicPath[1]).digest('hex') });
        if (!share) return json({ error: 'Share unavailable', code: 'WORKBOOK_SHARE_NOT_FOUND' }, 404);
        return json({ name: share.name, snapshot: JSON.parse(share.workbook_snapshot), revision_id: share.revision_id, expires_at: share.expires_at, is_frozen: true });
      }
      let user: any;
      try { user = await this.auth.getCurrentUser(request); } catch { return json({ code: 'UNAUTHORIZED', error: 'Authentication required' }, 401); }
      if (!user?.sub) return json({ code: 'UNAUTHORIZED', error: 'Authentication required' }, 401);
      this.requirePermission(user, 'read');
      const identity = { current_user_id: String(user.sub), current_user_name: String(user.name || ''), current_company_name: authenticatedCompanyName(user) };
      const parts = url.pathname.slice(prefix.length).split('/').filter(Boolean);
      const [id, operation] = parts;
      if (parts.length > 2 || (id && !IDENTIFIER.test(id))) return json({ code: 'WORKBOOK_NOT_FOUND', error: 'Workbook unavailable' }, 404);
      if (!id) {
        if (request.method === 'GET') return json({ data: await this.execute('list', { ...identity, q: url.searchParams.get('q') || '', include_archived: url.searchParams.get('archived') === 'true' }), can_create: this.auth.hasPermission(user, this.definition.permissions.write) });
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
        this.requirePermission(user, 'write');
        if (!identity.current_company_name) fail(422, 'WORKBOOK_COMPANY_REQUIRED', 'Select a company before creating a workbook');
        const importing = request.headers.get('content-type')?.split(';')[0] === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const imported = importing ? await this.engine.import(await this.bytes(request, this.definition.max_import_bytes), this.definition.max_import_expanded_bytes, this.definition.max_import_files) : undefined;
        const body = importing
          ? { name: url.searchParams.get('name'), snapshot: imported.snapshot }
          : await this.body(request, this.definition.max_snapshot_bytes);
        const name = String(body.name || '').trim();
        if (!name || name.length > 255) fail(422, 'WORKBOOK_NAME_REQUIRED', 'Enter a workbook name of at most 255 characters');
        const initial = body.snapshot || { sheets: [{ id: 'sheet-1', name: 'Sheet1', colNumber: 26, rowNumber: 100, cells: {} }] };
        const documentId = randomUUID();
        const params = { ...identity, id: documentId, name, workbook_snapshot: this.snapshot(initial, 'START_REVISION') };
        try {
          const normalized = await this.engine.execute('snapshot', documentId, 'START_REVISION', async () => ({ snapshot: JSON.parse(params.workbook_snapshot), revisions: [] }));
          params.workbook_snapshot = this.snapshot(normalized.snapshot, 'START_REVISION');
          if (Buffer.byteLength(params.workbook_snapshot) > this.definition.max_snapshot_bytes) fail(413, 'WORKBOOK_TOO_LARGE', 'Normalized workbook exceeds the configured limit');
          await this.execute('create', params);
        } finally { await this.engine.invalidate(documentId); }
        return json({ ...(await this.load(params)), ...(imported ? { import_warnings: imported.warnings } : {}) }, 201);
      }
      const params = { ...identity, id };
      // Reads and writes share the workbook queue so a returned snapshot and its
      // revision suffix describe one committed state. SQL CAS also protects writers.
      return await this.serial(id, async () => {
        const access = await this.access(params);
        if (operation === 'sources' && request.method === 'GET') return json({ data: this.catalog(user) });
        if (operation === 'filters') {
          const fields = this.globalFilters(user);
          if (request.method === 'GET') {
            const saved = await this.filterValues(params);
            return json({ fields, values: Object.fromEntries(fields.filter(field => Object.hasOwn(saved, field.key)).map(field => [field.key, saved[field.key]])) });
          }
          if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
          const body = await this.body(request, 16384);
          const values = body.values;
          if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).some(key => !fields.some(field => field.key === key))) fail(422, 'WORKBOOK_GLOBAL_FILTER', 'Unknown global filter');
          for (const field of fields) {
            const value = values[field.key];
            if (value === undefined || value === null || value === '') { delete values[field.key]; continue; }
            const valid = field.type === 'boolean' ? typeof value === 'boolean' : field.type === 'number' ? typeof value === 'number' && Number.isFinite(value) : typeof value === 'string' && value.length <= 256 && (field.type !== 'date' || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value));
            if (!valid) fail(422, 'WORKBOOK_GLOBAL_FILTER', `Invalid ${field.label}`);
          }
          if (!this.definition.operations.save_viewer_filters) fail(422, 'WORKBOOK_GLOBAL_FILTER', 'Global filters are unavailable');
          await this.execute('save_viewer_filters', { ...params, filter_values: JSON.stringify(values) });
          return json({ values });
        }
        if (operation === 'data' && request.method === 'POST') return json(await this.queryData(user, request, await this.body(request, 16384), await this.filterValues(params)));
        if (operation === 'shares') {
          this.requirePermission(user, 'manage');
          await this.access(params, 'manage');
          if (request.method === 'GET') return json({ data: await this.execute('shares', params) });
          const body = await this.body(request, 4096);
          if (request.method === 'DELETE') {
            if (!IDENTIFIER.test(body.share_id || '')) fail(422, 'WORKBOOK_INVALID_SHARE', 'Invalid share');
            return json(await this.execute('revoke_share', { ...params, share_id: body.share_id }));
          }
          if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
          await this.access(params, 'edit');
          const days = body.days ?? this.definition.max_share_days;
          if (!Number.isSafeInteger(days) || days < 1 || days > this.definition.max_share_days) fail(422, 'WORKBOOK_INVALID_EXPIRY', 'Invalid share duration');
          if (body.base_revision !== access.head_revision_id) fail(409, 'WORKBOOK_REVISION_CONFLICT', 'Workbook changed before sharing');
          const filterValues = await this.filterValues(params);
          const frozen = await this.engine.render('freeze', access.head_revision_id, await this.load(params), this.catalog(user), query => this.queryData(user, request, query, filterValues), this.definition.max_data_queries);
          const token = randomBytes(32).toString('base64url');
          const result = await this.execute('create_share', { ...params, share_id: randomUUID(), token_hash: createHash('sha256').update(token).digest('hex'), base_revision: access.head_revision_id, workbook_snapshot: this.snapshot(frozen.snapshot, access.head_revision_id), expires_at: new Date(Date.now() + days * 86400000).toISOString() });
          return json({ ...result, token }, 201);
        }
        if (operation === 'export' && request.method === 'GET') {
          this.requirePermission(user, 'export');
          const filterValues = await this.filterValues(params);
          const result = await this.engine.render('export', access.head_revision_id, await this.load(params), this.catalog(user), query => this.queryData(user, request, query, filterValues), this.definition.max_data_queries);
          const filename = `${String(access.name).replace(/[^A-Za-z0-9_-]/g, '_')}.xlsx`;
          return new Response(result.bytes, { headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store', 'X-Workbook-Revision': access.head_revision_id,
          } });
        }
        if (!operation && request.method === 'GET') return json({ ...(await this.load(params)), client: { id: `${this.clientPrefix(params.current_user_id)}${randomUUID()}`, name: params.current_user_name }, can_edit: !!access.can_edit && this.auth.hasPermission(user, this.definition.permissions.write), can_manage: !!access.can_manage && this.auth.hasPermission(user, this.definition.permissions.manage), can_create: this.auth.hasPermission(user, this.definition.permissions.write), can_export: this.auth.hasPermission(user, this.definition.permissions.export) });
        if (operation === 'revisions' && request.method === 'GET') {
          const sequence = Number(url.searchParams.get('after') || 0);
          if (!Number.isSafeInteger(sequence) || sequence < 0) fail(422, 'WORKBOOK_INVALID_CURSOR', 'Invalid revision cursor');
          const rows = await this.execute('revisions', { ...params, after_sequence: sequence, through_sequence: access.head_sequence });
          return json({ head_sequence: access.head_sequence, data: rows.map((row: any) => ({ sequence: row.sequence, message: JSON.parse(row.body) })) });
        }
        if (operation === 'history' && request.method === 'GET') return json({ data: await this.execute('history', params) });
        if (operation === 'restore' && request.method === 'POST') {
          this.requirePermission(user, 'manage');
          await this.access(params, 'manage');
          await this.access(params, 'edit');
          const body = await this.body(request, 4096);
          if (body.base_revision !== access.head_revision_id) fail(409, 'WORKBOOK_REVISION_CONFLICT', 'Workbook changed before restoring');
          if (!IDENTIFIER.test(body.revision_id || '')) fail(422, 'WORKBOOK_INVALID_REVISION', 'Invalid saved version');
          const [version] = await this.execute('version', { ...params, revision_id: body.revision_id });
          if (!version) fail(404, 'WORKBOOK_VERSION_NOT_FOUND', 'Saved version unavailable');
          const current = await this.engine.execute('snapshot', id, access.head_revision_id, () => this.load(params));
          const revisionId = randomUUID();
          const restored = this.snapshot(JSON.parse(version.workbook_snapshot), revisionId);
          const message = { type: 'WORKBOOK_RESTORED', version: 1, serverRevisionId: access.head_revision_id, nextRevisionId: revisionId, restoredRevisionId: body.revision_id, timestamp: Date.now() };
          const result = await this.execute('restore', { ...params, base_revision: access.head_revision_id, revision_id: revisionId, previous_snapshot: this.snapshot(current.snapshot, access.head_revision_id), workbook_snapshot: restored, label: `Restored: ${version.label}`.slice(0, 255), body: JSON.stringify(message), fingerprint: createHash('sha256').update(restored).digest('hex') });
          await this.engine.invalidate(id);
          return json(result);
        }
        if (operation === 'members' && request.method === 'GET') {
          await this.access(params, 'manage');
          return json({ data: await this.execute('members', params) });
        }
        if (operation === 'revisions' && request.method === 'POST') {
          this.requirePermission(user, 'write');
          await this.access(params, 'edit');
          return this.append(params, await this.body(request, this.definition.max_revision_bytes));
        }
        if (operation === 'checkpoint' && request.method === 'POST') {
          this.requirePermission(user, 'write');
          await this.access(params, 'edit');
          const body = await this.body(request, this.definition.max_snapshot_bytes);
          if (body.base_revision !== access.head_revision_id) fail(409, 'WORKBOOK_REVISION_CONFLICT', 'Workbook changed before checkpointing');
          const generated = await this.engine.execute('snapshot', id, access.head_revision_id, () => this.load(params));
          const revisionId = randomUUID();
          const snapshot = this.snapshot(generated.snapshot, revisionId);
          const message = { type: 'SNAPSHOT_CREATED', version: 1, serverRevisionId: access.head_revision_id, nextRevisionId: revisionId, timestamp: Date.now() };
          const result = await this.execute('checkpoint', { ...params, base_revision: access.head_revision_id, revision_id: revisionId, workbook_snapshot: snapshot, body: JSON.stringify(message), fingerprint: createHash('sha256').update(snapshot).digest('hex'), label: String(body.label || 'Checkpoint').slice(0, 255) });
          await this.engine.invalidate(id);
          return json(result);
        }
        if (!operation && request.method === 'PATCH') {
          this.requirePermission(user, 'write');
          await this.access(params, 'manage');
          const body = await this.body(request, 4096);
          const name = body.name === undefined ? access.name : String(body.name).trim();
          if (!name || name.length > 255 || (body.archived !== undefined && typeof body.archived !== 'boolean')) fail(422, 'WORKBOOK_INVALID_METADATA', 'Invalid workbook metadata');
          return json(await this.execute('metadata', { ...params, name, archived: body.archived ?? access.archived, expected_row_version: Number(body.row_version) }));
        }
        if (operation === 'members' && ['POST', 'DELETE'].includes(request.method)) {
          this.requirePermission(user, 'manage');
          await this.access(params, 'manage');
          const body = await this.body(request, 4096);
          if (typeof body.user_id !== 'string' || !IDENTIFIER.test(body.user_id) || (request.method === 'POST' && !['reader', 'editor'].includes(body.role))) fail(422, 'WORKBOOK_INVALID_MEMBER', 'Invalid workbook member');
          if (body.user_id === access.owner_id) fail(422, 'WORKBOOK_OWNER', 'The owner cannot be removed or downgraded');
          return json(await this.execute(request.method === 'POST' ? 'grant' : 'remove_member', { ...params, member_id: body.user_id, member_role: body.role }));
        }
        return json({ error: 'Method or operation not allowed' }, 405);
      });
    } catch (error: any) {
      if (!error?.status) console.error('[workbook]', error);
      return json({ error: error?.status ? error.message : 'Workbook operation failed', code: error.code || 'WORKBOOK_ERROR' }, error.status || 500);
    }
  };

  private async append(params: Record<string, any>, body: any) {
    // Native undo/redo messages carry a target revision but no clientId. Their
    // actor comes from authentication and is checked against the original edit.
    const clientId = body.clientId ?? (body.type === 'REVISION_UNDONE' || body.type === 'REVISION_REDONE' ? `${this.clientPrefix(params.current_user_id)}history` : undefined);
    if (!REVISION_TYPES.has(body.type) || body.version !== 1 || !IDENTIFIER.test(body.nextRevisionId || '') || !IDENTIFIER.test(body.serverRevisionId || '') || typeof clientId !== 'string' || !IDENTIFIER.test(clientId)) fail(422, 'WORKBOOK_INVALID_REVISION', 'Invalid engine revision');
    if (body.nextRevisionId === 'START_REVISION' || body.nextRevisionId === body.serverRevisionId) fail(422, 'WORKBOOK_INVALID_REVISION', 'A revision must advance the workbook head');
    if (!clientId.startsWith(this.clientPrefix(params.current_user_id))) fail(403, 'WORKBOOK_CLIENT_FORBIDDEN', 'Client identity belongs to another user');
    if (body.type === 'REMOTE_REVISION' && (!Array.isArray(body.commands) || body.commands.length > this.definition.max_commands || body.commands.some((command: any) => !command || !this.definition.allowed_commands.includes(command.type)))) fail(422, 'WORKBOOK_INVALID_COMMANDS', 'Invalid command batch');
    const target = body.type === 'REVISION_UNDONE' ? body.undoneRevisionId : body.redoneRevisionId;
    if (body.type !== 'REMOTE_REVISION' && !IDENTIFIER.test(target || '')) fail(422, 'WORKBOOK_INVALID_REVISION', 'Invalid history revision');
    const message = {
      type: body.type, version: 1, clientId, serverRevisionId: body.serverRevisionId, nextRevisionId: body.nextRevisionId,
      ...(body.type === 'REMOTE_REVISION' ? { commands: body.commands } : body.type === 'REVISION_UNDONE' ? { undoneRevisionId: target } : { redoneRevisionId: target }),
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(message)).digest('hex');
    const [previous] = await this.execute('revision', { ...params, revision_id: message.nextRevisionId });
    if (previous) {
      if (previous.actor_id !== params.current_user_id || previous.fingerprint !== fingerprint) fail(409, 'WORKBOOK_DUPLICATE_REVISION', 'Revision ID was already used by a different operation');
      return json({ sequence: previous.sequence, message: JSON.parse(previous.body), replayed: true });
    }
    const access = await this.access(params, 'edit');
    if (body.type !== 'REMOTE_REVISION') {
      const [original] = await this.execute('revision', { ...params, revision_id: target });
      if (!original || original.actor_id !== params.current_user_id || original.kind !== 'REMOTE_REVISION') fail(403, 'WORKBOOK_HISTORY_FORBIDDEN', 'Only your own edits can be undone or redone');
      if (original.sequence <= access.snapshot_sequence) fail(409, 'WORKBOOK_HISTORY_EXPIRED', 'This edit belongs to a saved version; restore that version instead');
    }
    if (access.head_revision_id !== message.serverRevisionId) fail(409, 'WORKBOOK_REVISION_CONFLICT', 'Workbook changed before saving');
    const stamped = { ...message, timestamp: Date.now() };
    await this.engine.execute('apply', params.id, message.serverRevisionId, () => this.load(params), stamped);
    let result: any;
    try {
      result = await this.execute('append', { ...params, base_revision: message.serverRevisionId, revision_id: message.nextRevisionId, kind: message.type, fingerprint, body: JSON.stringify(stamped) });
    } catch (error) {
      await this.engine.invalidate(params.id);
      throw error;
    }
    return json({ sequence: result.sequence, message: JSON.parse(result.body) });
  }

  private clientPrefix(userId: string) { return `${createHash('sha256').update(userId).digest('hex')}-`; }
}
