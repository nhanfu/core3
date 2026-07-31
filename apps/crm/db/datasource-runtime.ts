import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { all, run, withDb } from './database.ts';

type ParamDefinition = { type?: 'string' | 'number' | 'boolean' | 'json'; default?: unknown };
type Field = { type?: string; readonly?: boolean; selectable?: boolean; filterable?: boolean; sortable?: boolean };
type Operation = string | { datasource: string; roles?: string[] };

export type ResourceDefinition = {
  id: string;
  entity_set: string;
  key?: string;
  roles?: string[];
  fields: Record<string, Field>;
  list: { search?: string[]; default_orderby?: string; max_page_size?: number; group_by?: string[] };
  operations: { create: Operation; read: Operation; update: Operation; delete: Operation };
};

export type Datasource = {
  id: string;
  query?: string;
  statement?: string;
  script?: string;
  entrypoint?: string;
  params?: Record<string, ParamDefinition>;
};

type Document = { resource?: ResourceDefinition; resources?: ResourceDefinition[]; datasources?: Datasource[] };
type ODataQuery = { filter?: string; search?: string; select?: string[]; orderby?: string; top: number; skip: number; count: boolean; groupBy?: string[] };

function yamlFiles(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? yamlFiles(path) : /\.ya?ml$/i.test(entry.name) ? [path] : [];
    });
  } catch { return []; }
}

function documents() {
  return yamlFiles(import.meta.dir).map(path => Bun.YAML.parse(readFileSync(path, 'utf8')) as Document);
}

function datasources() { return documents().flatMap(document => document.datasources || []); }
function resources() { return documents().flatMap(document => [...(document.resource ? [document.resource] : []), ...(document.resources || [])]); }
function findDatasource(id: string) { return datasources().find(source => source.id === id); }

function error(message: string, status = 400) { return Object.assign(new Error(message), { status }); }

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

function resolveParams(source: Datasource, supplied: Record<string, unknown>) {
  const declared = Object.fromEntries(Object.entries(source.params || {}).map(([name, definition]) => {
    let value = supplied[name] ?? definition.default;
    if (definition.type === 'number' && typeof value === 'string' && value !== '') value = Number(value);
    if (definition.type === 'boolean' && typeof value === 'string') value = value === 'true';
    if (definition.type === 'json' && typeof value === 'string') { try { value = JSON.parse(value); } catch {} }
    return [name, value];
  }));
  return { ...declared, ...Object.fromEntries(Object.entries(supplied).filter(([name]) => !(name in declared))) };
}

async function scriptDatasource(source: Datasource, supplied: Record<string, unknown>) {
  if (!source.script || !source.entrypoint) throw error(`Datasource is missing script or entrypoint: ${source.id}`, 500);
  return withDb(async connection => {
    const db = {
      query: async (sql: string, params: Record<string, unknown> = {}) => { const bound = bindParams(sql, params); return all(connection, bound.sql, bound.values); },
      execute: async (sql: string, params: Record<string, unknown> = {}) => { const bound = bindParams(sql, params); return run(connection, bound.sql, bound.values); },
    };
    const context = { db, crypto: { randomUUID: () => crypto.randomUUID() } };
    const program = `(async function(ctx, params) { "use strict"; ${source.script}\nreturn ${source.entrypoint}(ctx, params); })(ctx, params)`;
    return vm.runInNewContext(program, { ctx: context, params: resolveParams(source, supplied) });
  });
}

export async function executeDatasource(id: string, params: Record<string, unknown> = {}, fragments: Record<string, string> = {}) {
  const source = findDatasource(id);
  if (!source) throw error(`Unknown datasource: ${id}`, 500);
  if (source.script) return scriptDatasource(source, params);
  if (source.query) {
    const query = source.query.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (_match, name: string) => {
      if (fragments[name] === undefined) throw error(`Missing SQL fragment "${name}" for ${id}`, 500);
      return fragments[name];
    });
    const bound = bindParams(query, resolveParams(source, params));
    return withDb(connection => all(connection, bound.sql, bound.values));
  }
  if (source.statement) {
    const bound = bindParams(source.statement, resolveParams(source, params));
    await withDb(connection => run(connection, bound.sql, bound.values));
    return { ok: true };
  }
  throw error(`Datasource is not executable: ${id}`, 500);
}

function queryOption(url: URL, name: string) { return url.searchParams.get(name) ?? url.searchParams.get(name.slice(1)); }

function parseQuery(url: URL, resource: ResourceDefinition): ODataQuery {
  const max = resource.list.max_page_size || 200;
  const top = queryOption(url, '$top') === null ? max : Number(queryOption(url, '$top'));
  const skip = queryOption(url, '$skip') === null ? 0 : Number(queryOption(url, '$skip'));
  if (!Number.isInteger(top) || top < 0 || top > max) throw error(`$top must be an integer between 0 and ${max}`);
  if (!Number.isInteger(skip) || skip < 0) throw error('$skip must be a non-negative integer');
  const select = queryOption(url, '$select')?.split(',').map(field => field.trim()).filter(Boolean);
  for (const field of select || []) if (!resource.fields[field] || resource.fields[field].selectable === false) throw error(`Unknown or non-selectable field: ${field}`);
  const countText = queryOption(url, '$count');
  if (countText && !['true', 'false'].includes(countText.toLowerCase())) throw error('$count must be true or false');
  const groupText = queryOption(url, '$groupby') || queryOption(url, '$apply')?.match(/^groupby\s*\(\s*\(\s*([A-Za-z0-9_, ]+)\s*\)\s*\)$/i)?.[1];
  const groupBy = groupText?.split(',').map(field => field.trim()).filter(Boolean);
  if (groupBy?.some(field => !(resource.list.group_by || []).includes(field))) throw error('Unsupported grouping field');
  return { filter: queryOption(url, '$filter') || undefined, search: queryOption(url, '$search') || undefined, select, orderby: queryOption(url, '$orderby') || resource.list.default_orderby, top, skip, count: countText?.toLowerCase() === 'true', groupBy };
}

function fieldSql(resource: ResourceDefinition, field: string, purpose: 'filter' | 'sort' | 'search' = 'filter') {
  const definition = resource.fields[field];
  if (!definition || (purpose === 'filter' && definition.filterable === false) || (purpose === 'sort' && definition.sortable === false)) throw error(`Unknown or unsupported field: ${field}`);
  return `"${field.replaceAll('"', '""')}"`;
}

function valueSql(raw: string, params: Record<string, unknown>) {
  const name = `odata_${Object.keys(params).length}`;
  let value: unknown = raw;
  if (raw === 'null') value = null;
  else if (raw === 'true' || raw === 'false') value = raw === 'true';
  else if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
  else if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) value = raw.slice(1, -1).replaceAll("''", "'");
  params[name] = value;
  return value === null ? 'NULL' : `:${name}`;
}

function filterSql(filter: string, resource: ResourceDefinition, params: Record<string, unknown>): string {
  const terms = filter.trim().split(/\s+(and|or)\s+/i);
  if (terms.length > 1) return `(${terms.filter((_term, index) => index % 2 === 0).map((term, index) => `${index ? terms[index * 2 - 1].toUpperCase() + ' ' : ''}${filterSql(term, resource, params)}`).join(' ')})`;
  const match = filter.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(eq|ne|gt|ge|lt|le)\s+(.+)$/i);
  if (!match) throw error(`Unsupported $filter expression: ${filter}`);
  const [, field, operator, raw] = match;
  const value = valueSql(raw.trim(), params);
  const operatorSql = { eq: '=', ne: '<>', gt: '>', ge: '>=', lt: '<', le: '<=' }[operator.toLowerCase() as 'eq'];
  return value === 'NULL' ? `${fieldSql(resource, field)} ${operator.toLowerCase() === 'eq' ? 'IS' : 'IS NOT'} NULL` : `${fieldSql(resource, field)} ${operatorSql} ${value}`;
}

function listFragments(resource: ResourceDefinition, query: ODataQuery, params: Record<string, unknown>) {
  const conditions: string[] = [];
  if (query.filter) conditions.push(filterSql(query.filter, resource, params));
  if (query.search) {
    const fields = resource.list.search || [];
    if (!fields.length) throw error('$search is not supported for this resource');
    const name = `odata_${Object.keys(params).length}`;
    params[name] = `%${query.search}%`;
    conditions.push(`(${fields.map(field => `lower(${fieldSql(resource, field, 'search')}) LIKE lower(:${name})`).join(' OR ')})`);
  }
  const order = query.orderby?.split(',').map(term => {
    const match = term.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)(?:\s+(asc|desc))?$/i);
    if (!match) throw error(`Unsupported $orderby expression: ${term}`);
    return `${fieldSql(resource, match[1], 'sort')} ${(match[2] || 'asc').toUpperCase()}`;
  }).join(', ');
  return { where: conditions.length ? `AND ${conditions.join(' AND ')}` : '', order: order ? `ORDER BY ${order}` : 'ORDER BY 1' };
}

function payload(resource: ResourceDefinition, rows: Record<string, unknown>[], query: ODataQuery, base: string) {
  const count = rows[0]?.__odata_count === undefined ? rows.length : Number(rows[0].__odata_count);
  const grouped = query.groupBy?.length ? [...new Map(rows.map(row => [query.groupBy!.map(field => String(row[field] ?? '')).join('\u0000'), row])).values()] : rows;
  const value = grouped.map(row => {
    if (query.groupBy?.length) return Object.fromEntries(query.groupBy.map(field => [field, row[field]]));
    if (query.select?.length) return Object.fromEntries(query.select.map(field => [field, row[field]]));
    const result = { ...row }; delete result.__odata_count; return result;
  });
  const result: Record<string, unknown> = { '@odata.context': `${base}/$metadata#${resource.entity_set}`, value };
  if (query.count) result['@odata.count'] = count;
  return result;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } });
}

function configuredDatasource(operation: Operation, role: string) {
  const definition = typeof operation === 'string' ? { datasource: operation } : operation;
  if (definition.roles?.length && !definition.roles.includes(role)) throw error('Datasource permission required', 403);
  return definition.datasource;
}

export async function routeODataRequest(request: Request, role: string) {
  const url = new URL(request.url);
  const definitions = resources();
  if (url.pathname === '/api/odata/$metadata' && request.method === 'GET') return json({ '@odata.context': `${url.origin}/api/odata/$metadata`, resources: definitions.map(resource => ({ name: resource.entity_set, key: resource.key || 'id', fields: resource.fields })) });
  const resource = definitions.find(candidate => {
    const path = `/api/odata/${candidate.entity_set}`;
    return url.pathname === path || url.pathname.startsWith(`${path}(`);
  });
  if (!resource) return null;
  if (resource.roles?.length && !resource.roles.includes(role)) return json({ error: 'Datasource permission required' }, 403);
  const prefix = `/api/odata/${resource.entity_set}`;
  const remainder = url.pathname.slice(prefix.length);
  const keyMatch = remainder.match(/^\((.*)\)$/);
  if (remainder && !keyMatch) return json({ error: 'Not found' }, 404);
  const key = keyMatch ? decodeURIComponent(keyMatch[1].replace(/^['"]|['"]$/g, '')) : undefined;
  const method = request.method.toUpperCase();
  const operationName = method === 'GET' ? 'read' : method === 'POST' && !key ? 'create' : method === 'PUT' && key ? 'update' : method === 'DELETE' && key ? 'delete' : undefined;
  if (!operationName) return json({ error: 'Unsupported OData operation' }, 405);
  const datasource = configuredDatasource(resource.operations[operationName], role);
  if (operationName === 'read') {
    if (key) {
      const rows = await executeDatasource(datasource, { id: key, role, odata_top: 1, odata_skip: 0 }, { where: '', order: '' });
      const record = rows[0] ? { ...rows[0] } : null;
      if (record) delete record.__odata_count;
      return json(record);
    }
    const query = parseQuery(url, resource);
    const params: Record<string, unknown> = { id: '', role };
    const fragments = listFragments(resource, query, params);
    const rows = await executeDatasource(datasource, { ...params, odata_top: query.top, odata_skip: query.skip }, fragments) as Record<string, unknown>[];
    return json(payload(resource, rows, query, `${url.origin}/api/odata`));
  }
  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'JSON body must be an object' }, 400);
  const values = { ...(body as Record<string, unknown>), ...(key ? { id: key } : {}) };
  const result = await executeDatasource(datasource, { values, id: key || '', role });
  return json(result, operationName === 'create' ? 201 : 200);
}
