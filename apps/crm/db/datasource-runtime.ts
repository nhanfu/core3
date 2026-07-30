import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { all, run, withDb } from './database.ts';

type Datasource = {
  id: string;
  public?: boolean;
  endpoint?: string;
  protocol?: string;
  roles?: string[];
  permission?: string;
  query?: string;
  statement?: string;
  params?: Record<string, { default?: unknown }>;
};

type DatasourceConfig = { datasources?: Datasource[] };

const config = Bun.YAML.parse(readFileSync(join(import.meta.dir, 'datasources.yaml'), 'utf8')) as DatasourceConfig;

function findDatasource(id: string) {
  return config.datasources?.find(source => source.id === id);
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

function resolveParams(source: Datasource, params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(source.params || {}).map(([name, definition]) => [name, params[name] ?? definition.default]));
}

export async function queryDatasource(id: string, params: Record<string, unknown> = {}, fragments: Record<string, string> = {}) {
  const source = findDatasource(id);
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
  if (!source?.statement) throw new Error(`Unknown or statement-less datasource: ${id}`);
  const bound = bindParams(source.statement, resolveParams(source, params));
  return withDb(connection => run(connection, bound.sql, bound.values));
}

export function publicDatasourceForEndpoint(endpoint: string) {
  const source = config.datasources?.find(item => item.public && item.endpoint === endpoint);
  if (!source?.id || !source.roles?.length || !source.permission || !source.protocol) return null;
  return source;
}
