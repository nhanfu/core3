import { readdirSync, readFileSync } from 'node:fs';
import { mkdir as mkdirRecursive } from 'node:fs/promises';
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
  entrypoint?: string;
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
  return Object.fromEntries(Object.entries(source.params || {}).map(([name, definition]) => [
    name,
    resolveParamValue(params[name] ?? definition.default, definition),
  ]));
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

export async function executeDatasource(id: string, params: Record<string, unknown> = {}, fragments: Record<string, string> = {}) {
  const source = findDatasource(id);
  if (source?.script) {
    return runScriptDatasource(source, params);
  }
  if (source?.query) {
    const query = source.query.replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (_match, name: string) => {
      const fragment = fragments[name];
      if (!fragment) throw new Error(`Missing SQL fragment "${name}" for datasource ${id}`);
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
