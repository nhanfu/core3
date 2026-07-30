import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { all, run, withDb } from './database.ts';

type ParamDefinition = { type?: string; default?: unknown };

export type Datasource = {
  id: string;
  public?: boolean;
  endpoint?: string;
  methods?: string[];
  protocol?: string;
  roles?: string[];
  permission?: string;
  query?: string;
  statement?: string;
  language?: string;
  script?: string;
  params?: Record<string, ParamDefinition>;
};

type DatasourceFile = { datasources?: Datasource[] };

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

function loadDatasources() {
  const roots = [import.meta.dir, join(import.meta.dir, '..', 'data')];
  return roots.flatMap(root => datasourceFiles(root)).flatMap(path => {
    const document = Bun.YAML.parse(readFileSync(path, 'utf8')) as DatasourceFile;
    return document.datasources || [];
  });
}

const datasources = loadDatasources();

function findDatasource(id: string) {
  return datasources.find(source => source.id === id);
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
  return Object.fromEntries(Object.entries(source.params || {}).map(([name, definition]) => [
    name,
    resolveParamValue(params[name] ?? definition.default, definition),
  ]));
}

async function runScriptDatasource(source: Datasource, params: Record<string, unknown>) {
  if (!source.script) throw new Error(`Datasource has no script: ${source.id}`);
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
    const context = {
      params: resolveParams(source, params),
      db,
      crypto: { randomUUID: () => crypto.randomUUID() },
    };
    const program = `(async function(ctx) { "use strict"; ${source.script}\n})(ctx)`;
    return vm.runInNewContext(program, { ctx: context });
  });
}

export function getDatasources() {
  return [...datasources];
}

export async function queryDatasource(id: string, params: Record<string, unknown> = {}, fragments: Record<string, string> = {}) {
  const source = findDatasource(id);
  if (source?.script) {
    const result = await runScriptDatasource(source, params);
    return Array.isArray(result) ? result : result == null ? [] : [result];
  }
  if (!source?.query) throw new Error(`Unknown or query-less datasource: ${id}`);
  const query = source.query.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (_match, name: string) => {
    const fragment = fragments[name];
    if (!fragment) throw new Error(`Missing SQL fragment "${name}" for datasource ${id}`);
    return fragment;
  });
  const bound = bindParams(query, resolveParams(source, params));
  return withDb(connection => all(connection, bound.sql, bound.values));
}

export async function runDatasource(id: string, params: Record<string, unknown> = {}) {
  const source = findDatasource(id);
  if (source?.script) return runScriptDatasource(source, params);
  if (!source?.statement) throw new Error(`Unknown or statement-less datasource: ${id}`);
  const bound = bindParams(source.statement, resolveParams(source, params));
  return withDb(connection => run(connection, bound.sql, bound.values));
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
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}

export async function routeDatasourceRequest(request: Request, role: string) {
  const url = new URL(request.url);
  const source = datasources.find(candidate =>
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
  if (source.query) return response(await queryDatasource(source.id, params));
  await runDatasource(source.id, params);
  return response({ ok: true });
}
