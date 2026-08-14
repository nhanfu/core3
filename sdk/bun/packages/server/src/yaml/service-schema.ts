export type YamlServiceManifest = {
  id: string;
  kind?: 'domain-service' | 'infrastructure-service';
  runtime?: string;
  database?: string | YamlServiceDatabase;
  pages?: string[];
  permissions?: string;
  topics?: string;
  events?: string;
  storage?: string;
  migrations?: string;
};

export type YamlServiceDatabase = {
  storage: {
    driver: 'postgres' | 'duckdb' | 'duckdb-memory';
    url_env?: string;
    path_env?: string;
    path?: string;
    schema?: string;
  };
  compute?: {
    driver: 'duckdb';
    mode?: 'memory';
  };
};

const IDENTIFIER = /^[a-z][a-z0-9-]*$/;

export function validateServiceManifest(value: unknown, file = 'manifest.yaml'): YamlServiceManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Service manifest must be an object: ${file}`);
  }
  const manifest = value as Record<string, unknown>;
  const id = String(manifest.id || '');
  if (!IDENTIFIER.test(id)) throw new Error(`Service manifest id is invalid: ${file}`);
  if (manifest.kind !== undefined && manifest.kind !== 'domain-service' && manifest.kind !== 'infrastructure-service') {
    throw new Error(`Service manifest kind is invalid: ${file}`);
  }
  for (const key of ['pages'] as const) {
    if (manifest[key] !== undefined && (!Array.isArray(manifest[key]) || manifest[key].some((entry) => typeof entry !== 'string'))) {
      throw new Error(`Service manifest ${key} must be a string list: ${file}`);
    }
  }
  for (const key of ['runtime', 'permissions', 'topics', 'events', 'storage', 'migrations'] as const) {
    if (manifest[key] !== undefined && typeof manifest[key] !== 'string') {
      throw new Error(`Service manifest ${key} must be a string: ${file}`);
    }
  }
  const database = manifest.database;
  if (database !== undefined && typeof database !== 'string') {
    if (!database || typeof database !== 'object' || Array.isArray(database)) {
      throw new Error(`Service manifest database must be a string or object: ${file}`);
    }
    const storage = (database as Record<string, unknown>).storage;
    if (!storage || typeof storage !== 'object' || Array.isArray(storage)) {
      throw new Error(`Service manifest database.storage must be an object: ${file}`);
    }
    const driver = (storage as Record<string, unknown>).driver;
    if (driver !== 'postgres' && driver !== 'duckdb' && driver !== 'duckdb-memory') {
      throw new Error(`Service manifest database.storage.driver is invalid: ${file}`);
    }
    for (const key of ['url_env', 'path_env', 'path', 'schema']) {
      if ((storage as Record<string, unknown>)[key] !== undefined && typeof (storage as Record<string, unknown>)[key] !== 'string') {
        throw new Error(`Service manifest database.storage.${key} must be a string: ${file}`);
      }
    }
    const compute = (database as Record<string, unknown>).compute;
    if (compute !== undefined) {
      if (!compute || typeof compute !== 'object' || Array.isArray(compute)
        || (compute as Record<string, unknown>).driver !== 'duckdb'
        || ((compute as Record<string, unknown>).mode !== undefined && (compute as Record<string, unknown>).mode !== 'memory')) {
        throw new Error(`Service manifest database.compute must declare in-memory duckdb: ${file}`);
      }
    }
  }
  return {
    id,
    kind: manifest.kind as YamlServiceManifest['kind'],
    runtime: manifest.runtime as string | undefined,
    database: manifest.database as YamlServiceManifest['database'],
    pages: manifest.pages as string[] | undefined,
    permissions: manifest.permissions as string | undefined,
    topics: manifest.topics as string | undefined,
    events: manifest.events as string | undefined,
    storage: manifest.storage as string | undefined,
    migrations: manifest.migrations as string | undefined,
  };
}
