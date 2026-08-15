import type { DatabaseDialect, DatabaseDriver, MigrationFeature } from './types.ts';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quote(identifier: string, open: string, close = open): string {
  if (!IDENTIFIER.test(identifier)) throw new Error(`Invalid SQL identifier: ${identifier}`);
  return `${open}${identifier}${close}`;
}

const capabilities: Record<DatabaseDriver, Set<MigrationFeature>> = {
  postgres: new Set(['partitioning', 'columnstore', 'transactional_ddl', 'generated_uuid']),
  duckdb: new Set(['partitioning', 'transactional_ddl', 'generated_uuid']),
  mysql: new Set(['partitioning', 'generated_uuid']),
  oracle: new Set(['partitioning', 'transactional_ddl', 'generated_uuid']),
  sqlserver: new Set(['partitioning', 'transactional_ddl']),
};

export function createDialect(driver: DatabaseDriver): DatabaseDialect {
  return {
    driver,
    placeholder: (index) => driver === 'postgres' ? `$${index}` : driver === 'oracle' ? `:${index}` : `?`,
    quoteIdentifier: (identifier) => driver === 'mysql' ? quote(identifier, '`') : driver === 'sqlserver' ? quote(identifier, '[' , ']') : quote(driver === 'oracle' ? identifier.toUpperCase() : identifier, '"'),
    supports: (feature) => capabilities[driver].has(feature),
  };
}

export function isDatabaseDriver(value: unknown): value is DatabaseDriver {
  return ['postgres', 'duckdb', 'mysql', 'oracle', 'sqlserver'].includes(String(value));
}
