import { readdirSync, readFileSync } from 'node:fs';
import { mkdir as mkdirRecursive } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';
import { all, run, withDb } from './database.ts';

type ParamDefinition = { type?: string; default?: unknown };

export type ResourceDefinition = {
  id: string;
  entity_set: string;
  path: string;
  key?: string;
  table?: string;
  roles?: string[];
  permissions?: Record<string, string>;
  fields: Record<string, { type?: string; readonly?: boolean; selectable?: boolean; filterable?: boolean; sortable?: boolean }>;
  list: { datasource: string; search?: string[]; default_orderby?: string; max_page_size?: number; group_by?: string[] };
  get?: string;
  crud?: { create?: string | { datasource: string; roles?: string[] }; update?: string | { datasource: string; roles?: string[] }; delete?: string | { datasource: string; operation?: string; roles?: string[] } };
  actions?: Record<string, { method?: string; datasource: string; roles?: string[] }>;
};

export type Datasource = {
  id: string;
  public?: boolean;
  endpoint?: string;
  methods?: string[];
  protocol?: string;
  roles?: string[];
  permission?: string;
  entrypoint?: string;
  query?: string;
  statement?: string;
  language?: string;
  script?: string;
  params?: Record<string, ParamDefinition>;
};

type DatasourceFile = { datasources?: Datasource[]; resource?: ResourceDefinition };

function datasourceFiles(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return datasourceFiles(path);
      return /\.ya?ml$/i.test(entry.name) ? [path] : [];
    });
  } catch {
    return [];
  }
}

function loadDocuments() {
  const roots = [import.meta.dir, join(import.meta.dir, '..', 'data')];
  return roots.flatMap(root => datasourceFiles(root)).flatMap(path => {
    const document = Bun.YAML.parse(readFileSync(path, 'utf8')) as DatasourceFile;
    return [{ path, document }];
  });
}

function loadDatasources() {
  return loadDocuments().flatMap(({ document }) => document.datasources || []);
}

function loadResources() {
  return loadDocuments().flatMap(({ document }) => document.resource ? [document.resource] : []);
}

let datasources = loadDatasources();
const liveDatasourceReload = process.env.NODE_ENV !== 'production' && process.env.CRM_LIVE_DATASOURCES !== 'false';

function refreshDatasources() {
  if (liveDatasourceReload) datasources = loadDatasources();
  return datasources;
}

function findDatasource(id: string) {
  return refreshDatasources().find(source => source.id === id);
}

function bindParams(sql: string, params: Record<string, unknown>) {
  const values: unknown[] = [];
  const boundSql = sql.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    const value = params[name];
    if (Array.isArray(value)) {
      if (!value.length) return 'NULL';
      values.push(...value);
      return value.map(() => '?').join(', ');
    }
    values.push(value);
    return '?';
  });
  return { sql: boundSql, values };
}

function resolveParamValue(value: unknown, definition: ParamDefinition | undefined) {
  if (definition?.type === 'json' && typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  if (definition?.type === 'number' && typeof value === 'string' && value !== '') return Number(value);
  if (definition?.type === 'boolean' && typeof value === 'string') return value === 'true';
  return value;
}

function resolveParams(source: Datasource, params: Record<string, unknown>) {
  const declared = Object.fromEntries(Object.entries(source.params || {}).map(([name, definition]) => [
    name,
    resolveParamValue(params[name] ?? definition.default, definition),
  ]));
  return { ...declared, ...Object.fromEntries(Object.entries(params).filter(([name]) => !(name in declared))) };
}

async function runScriptDatasource(source: Datasource, params: Record<string, unknown>) {
  if (!source.script) throw new Error(`Datasource has no script: ${source.id}`);
  if (!source.entrypoint) throw new Error(`Script datasource has no entrypoint: ${source.id}`);
  return withDb(async connection => {
    const db = {
      query: async (sql: string, queryParams: Record<string, unknown> = {}) => {
        const bound = bindParams(sql, queryParams);
        return all(connection, bound.sql, bound.values);
      },
      execute: async (sql: string, queryParams: Record<string, unknown> = {}) => {
        const bound = bindParams(sql, queryParams);
        return run(connection, bound.sql, bound.values);
      },
    };
    const resolvedParams = resolveParams(source, params);
    const context = {
      db,
      crypto: { randomUUID: () => crypto.randomUUID() },
      datasource: { execute: (id: string, datasourceParams: Record<string, unknown> = {}, fragments: Record<string, string> = {}) => executeDatasource(id, datasourceParams, fragments) },
      files: { mkdir: (path: string) => mkdirRecursive(path, { recursive: true }), write: (path: string, data: unknown) => Bun.write(path, data as any) },
    };
    const program = `(async function(ctx, params) { "use strict"; ${source.script}\n return ${source.entrypoint}(ctx, params); })(ctx, params)`;
    return vm.runInNewContext(program, { ctx: context, params: resolvedParams });
  });
}

export function getDatasources() {
  return [...refreshDatasources()];
}

export function getResources() {
  return loadResources();
}

function odataError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

type ODataQuery = { filter?: string; search?: string; select?: string[]; orderby?: string; top?: number; skip?: number; count?: boolean; apply?: string; groupBy?: string };

function queryOption(url: URL, name: string) {
  return url.searchParams.get(name) ?? url.searchParams.get(name.slice(1));
}

function parseODataQuery(url: URL, resource: ResourceDefinition): ODataQuery {
  const topValue = queryOption(url, '$top');
  const skipValue = queryOption(url, '$skip');
  const max = resource.list.max_page_size || 200;
  const top = topValue === null ? max : Number(topValue);
  const skip = skipValue === null ? 0 : Number(skipValue);
  if (!Number.isInteger(top) || top < 0 || top > max) throw odataError(`$top must be an integer between 0 and ${max}`);
  if (!Number.isInteger(skip) || skip < 0) throw odataError('$skip must be a non-negative integer');
  const selectValue = queryOption(url, '$select');
  const select = selectValue ? selectValue.split(',').map(value => value.trim()).filter(Boolean) : undefined;
  for (const field of select || []) if (!resource.fields[field] || resource.fields[field].selectable === false) throw odataError(`Unknown or non-selectable field: ${field}`);
  const countValue = queryOption(url, '$count');
  if (countValue && !['true', 'false'].includes(countValue.toLowerCase())) throw odataError('$count must be true or false');
  return {
    filter: queryOption(url, '$filter') || undefined,
    search: queryOption(url, '$search') || undefined,
    select,
    orderby: queryOption(url, '$orderby') || resource.list.default_orderby,
    top,
    skip,
    count: countValue?.toLowerCase() === 'true',
    apply: queryOption(url, '$apply') || undefined,
    groupBy: queryOption(url, '$groupby') || undefined,
  };
}

function fieldSql(resource: ResourceDefinition, field: string, mode: 'filter' | 'sort' | 'select' = 'filter') {
  const definition = resource.fields[field];
  if (!definition || (mode === 'filter' && definition.filterable === false) || (mode === 'sort' && definition.sortable === false)) throw odataError(`Unknown or unsupported field: ${field}`);
  return `\"${field.replaceAll('"', '""')}\"`;
}

function literal(value: string, params: Record<string, unknown>, type?: string) {
  const name = `odata_${Object.keys(params).length}`;
  let parsed: unknown = value;
  if (value === 'null') parsed = null;
  else if (value === 'true' || value === 'false') parsed = value === 'true';
  else if (/^-?\d+(\.\d+)?$/.test(value)) parsed = Number(value);
  else if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) parsed = value.slice(1, -1).replaceAll("''", "'");
  params[name] = parsed;
  return parsed === null ? 'NULL' : `:${name}`;
}

function parseFilter(filter: string, resource: ResourceDefinition, params: Record<string, unknown>): string {
  const trimmed = filter.trim();
  const parts = trimmed.split(/\s+(and|or)\s+/i);
  if (parts.length > 1) {
    const expressions: string[] = [];
    for (let index = 0; index < parts.length; index += 2) expressions.push(parseFilter(parts[index], resource, params));
    return `(${expressions.map((expression, index) => index ? `${parts[index * 2 - 1].toUpperCase()} ${expression}` : expression).join(' ')})`;
  }
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(eq|ne|gt|ge|lt|le)\s+(.+)$/i);
  if (!match) throw odataError(`Unsupported $filter expression: ${filter}`);
  const [, field, operator, value] = match;
  const sqlOperator = { eq: '=', ne: '<>', gt: '>', ge: '>=', lt: '<', le: '<=' }[operator.toLowerCase() as 'eq'];
  const valueSql = literal(value.trim(), params, resource.fields[field]?.type);
  return valueSql === 'NULL' ? `${fieldSql(resource, field)} ${operator.toLowerCase() === 'eq' ? 'IS' : 'IS NOT'} NULL` : `${fieldSql(resource, field)} ${sqlOperator} ${valueSql}`;
}

function queryFragments(resource: ResourceDefinition, query: ODataQuery, params: Record<string, unknown>) {
  const filters: string[] = [];
  if (query.filter) filters.push(parseFilter(query.filter, resource, params));
  if (query.search) {
    const searchFields = resource.list.search || [];
    if (!searchFields.length) throw odataError('$search is not supported for this resource');
    const name = `odata_${Object.keys(params).length}`;
    params[name] = `%${query.search}%`;
    filters.push(`(${searchFields.map(field => `lower(${fieldSql(resource, field)}) LIKE lower(:${name})`).join(' OR ')})`);
  }
  const order = query.orderby ? query.orderby.split(',').map(item => {
    const match = item.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(asc|desc))?$/i);
    if (!match) throw odataError(`Unsupported $orderby expression: ${item}`);
    return `${fieldSql(resource, match[1], 'sort')} ${(match[2] || 'asc').toUpperCase()}`;
  }).join(', ') : '';
  let group = '';
  const applyGroup = query.apply?.match(/^groupby\s*\(\s*\(\s*([A-Za-z0-9_, ]+)\s*\)\s*\)$/i)?.[1] || query.groupBy;
  if (applyGroup) {
    const fields = applyGroup.split(',').map(field => field.trim()).filter(Boolean);
    if (!fields.length || fields.some(field => !(resource.list.group_by || []).includes(field))) throw odataError('Unsupported grouping field');
    group = fields.map(field => fieldSql(resource, field, 'sort')).join(', ');
  }
  return { where: filters.length ? `AND ${filters.join(' AND ')}` : '', order: order ? `ORDER BY ${order}` : '', group: group ? `GROUP BY ${group}` : '' };
}

function odataPayload(resource: ResourceDefinition, rows: any[], query: ODataQuery, baseUrl: string) {
  const groupedFields = query.apply?.match(/^groupby\s*\(\s*\(\s*([A-Za-z0-9_, ]+)\s*\)\s*\)$/i)?.[1]?.split(',').map(field => field.trim()).filter(Boolean) || query.groupBy?.split(',').map(field => field.trim()).filter(Boolean);
  const sourceRows = groupedFields?.length
    ? [...new Map(rows.map(row => [groupedFields.map(field => String(row[field] ?? 'NULL')).join('\u0000'), row])).values()]
    : rows;
  const count = groupedFields?.length ? sourceRows.length : rows.length && rows[0].__odata_count !== undefined ? Number(rows[0].__odata_count) : rows.length;
  const value = sourceRows.map(row => {
    const result = { ...row };
    delete result.__odata_count;
    if (groupedFields?.length) return Object.fromEntries(groupedFields.map(field => [field, result[field]]));
    if (query.select?.length) return Object.fromEntries(query.select.map(field => [field, result[field]]));
    return result;
  });
  const payload: Record<string, unknown> = { '@odata.context': `${baseUrl}/$metadata#${resource.entity_set}`, value };
  if (query.count) payload['@odata.count'] = count;
  return payload;
}

export async function routeODataRequest(request: Request, role: string) {
  const url = new URL(request.url);
  const resources = getResources();
  if (url.pathname === '/api/odata/$metadata' && request.method === 'GET') {
    const schemas = resources.map(resource => ({ name: resource.entity_set, key: resource.key || 'id', fields: resource.fields }));
    return response({ '@odata.context': `${url.origin}/api/odata/$metadata`, resources: schemas });
  }
  const resource = resources.find(candidate => candidate.path.replace(/\/$/, '') === url.pathname.replace(/\/$/, '') || url.pathname.startsWith(`${candidate.path.replace(/\/$/, '')}(`));
  if (!resource) return null;
  if (resource.roles?.length && !resource.roles.includes(role)) return response({ error: 'Datasource permission required' }, 403);
  const prefix = resource.path.replace(/\/$/, '');
  const keyMatch = url.pathname.slice(prefix.length).match(/^\((.*)\)$/);
  const key = keyMatch ? decodeURIComponent(keyMatch[1].replace(/^['"]|['"]$/g, '')) : undefined;
  const baseUrl = `${url.origin}/api/odata`;
  const operation = key ? (request.method === 'GET' ? 'get' : request.method === 'PATCH' ? 'update' : request.method === 'DELETE' ? 'delete' : '') : request.method === 'GET' ? 'list' : request.method === 'POST' ? 'create' : '';
  const actionMatch = url.pathname.slice(prefix.length).match(/^\((.*)\)\/([^/]+)$/);
  if (actionMatch) {
    const action = resource.actions?.[actionMatch[2]];
    if (!action || (action.method && action.method.toUpperCase() !== request.method)) return response({ error: 'Unsupported datasource action' }, 404);
    if (action.roles?.length && !action.roles.includes(role)) return response({ error: 'Datasource permission required' }, 403);
    const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
    return response(await executeDatasource(action.datasource, { ...body, id: key, role }));
  }
  if (!operation) return response({ error: 'Unsupported OData operation' }, 405);
  const configured = operation === 'list' ? resource.list.datasource : operation === 'get' ? resource.get : resource.crud?.[operation as 'create' | 'update' | 'delete'];
  const datasource = typeof configured === 'string' ? configured : configured?.datasource;
  if (!datasource) return response({ error: `No YAML datasource configured for ${operation}` }, 405);
  const operationRoles = typeof configured === 'object' ? configured.roles : undefined;
  if (operationRoles?.length && !operationRoles.includes(role)) return response({ error: 'Datasource permission required' }, 403);
  if (operation === 'list') {
    const query = parseODataQuery(url, resource);
    const params: Record<string, unknown> = { role };
    const fragments = queryFragments(resource, query, params);
    const rows = await executeDatasource(datasource, { ...params, odata_top: query.top, odata_skip: query.skip }, {
      where: fragments.where,
      order: fragments.order || 'ORDER BY 1',
      group: fragments.group,
    });
    return response(odataPayload(resource, rows, query, baseUrl));
  }
  const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
  const values = { ...(body && typeof body === 'object' ? body : {}), ...(key ? { id: key } : {}), role };
  if (operation === 'delete' && configured && typeof configured === 'object' && 'operation' in configured && configured.operation) {
    return response(await executeDatasource(datasource, { ids: key ? [key] : [], operation: configured.operation, role }));
  }
  if (operation === 'get') return response((await executeDatasource(datasource, values))[0] || null);
  if (operation === 'delete') {
    await executeDatasource(datasource, values);
    return response({ ok: true });
  }
  return response(await executeDatasource(datasource, { values, id: key, role }));
}

export async function executeDatasource(id: string, params: Record<string, unknown> = {}, fragments: Record<string, string> = {}) {
  const source = findDatasource(id);
  if (source?.script) {
    return runScriptDatasource(source, params);
  }
  if (source?.query) {
    const query = source.query.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (_match, name: string) => {
      const fragment = fragments[name];
        if (fragment === undefined) throw new Error(`Missing SQL fragment "${name}" for datasource ${id}`);
      return fragment;
    });
    const bound = bindParams(query, resolveParams(source, params));
    try {
      return await withDb(connection => all(connection, bound.sql, bound.values));
    } catch (error) {
      if (id === 'crm.list_leads') {
        console.error('[datasource:crm.list_leads] query failed', {
          params: resolveParams(source, params),
          sql: bound.sql,
          values: bound.values,
        });
        console.error('[datasource:crm.list_leads] error details', {
          message: error instanceof Error ? error.message : String(error),
          exception_message: (error as { exception_message?: unknown })?.exception_message,
          errorType: (error as { errorType?: unknown })?.errorType,
          stack: error instanceof Error ? error.stack : undefined,
          properties: Object.getOwnPropertyNames(error as object).reduce<Record<string, unknown>>((result, key) => {
            result[key] = (error as Record<string, unknown>)[key];
            return result;
          }, {}),
        });
      }
      throw error;
    }
  }
  if (source?.statement) {
    const bound = bindParams(source.statement, resolveParams(source, params));
    return withDb(connection => run(connection, bound.sql, bound.values));
  }
  throw new Error(`Unknown or executable-less datasource: ${id}`);
}

function routeMatch(endpoint: string, pathname: string) {
  const expected = endpoint.replace(/\/+$/, '').split('/').filter(Boolean);
  const actual = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < expected.length; index += 1) {
    const segment = expected[index];
    if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(actual[index]);
    else if (segment !== actual[index]) return null;
  }
  return params;
}

function routeMethods(source: Datasource) {
  if (source.methods?.length) return source.methods.map(method => method.toUpperCase());
  return [source.statement ? 'POST' : 'GET'];
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Access-Control-Allow-Origin': process.env.CRM_CORS_ORIGIN || `http://localhost:${process.env.PORT || 3010}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'application/json',
    },
  });
}

export async function routeDatasourceRequest(request: Request, role: string) {
  const url = new URL(request.url);
  const source = getDatasources().find(candidate =>
    candidate.endpoint &&
    candidate.public === true &&
    routeMethods(candidate).includes(request.method.toUpperCase()) &&
    routeMatch(candidate.endpoint, url.pathname),
  );
  if (!source?.endpoint) return null;

  if (source.roles?.length && !source.roles.includes(role)) return response({ error: 'Datasource permission required' }, 403);

  const routeParams = routeMatch(source.endpoint, url.pathname) || {};
  const queryParams = Object.fromEntries(url.searchParams.entries());
  let bodyParams: Record<string, unknown> = {};
  if (request.method !== 'GET' && (request.headers.get('content-type') || '').includes('application/json')) {
    bodyParams = await request.json().catch(() => ({}));
  }
  const params = { ...queryParams, ...routeParams, ...bodyParams, role };
  const result = await executeDatasource(source.id, params);
  if (source.query) return response(result);
  return response({ ok: true });
}
