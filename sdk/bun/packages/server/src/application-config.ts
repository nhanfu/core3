import { readFileSync } from 'node:fs';

export type ModuleApplicationConfig = Record<string, unknown>;

export type ApplicationConfig = {
  environment: string;
  services: Record<string, ModuleApplicationConfig>;
  med: Record<string, unknown>;
  apps: Array<Record<string, unknown>>;
};

export function interpolateEnvironment(value: unknown, env: NodeJS.ProcessEnv): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g, (_, name: string, fallback?: string) => env[name] ?? fallback ?? '');
  }
  if (Array.isArray(value)) return value.map((item) => interpolateEnvironment(item, env));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolateEnvironment(item, env)]));
  }
  return value;
}

export function loadApplicationConfig(path: string, env: NodeJS.ProcessEnv): ApplicationConfig {
  const parsed = Bun.YAML.parse(readFileSync(path, 'utf8')) as Partial<ApplicationConfig>;
  const resolved = interpolateEnvironment(parsed, env) as Partial<ApplicationConfig>;
  return {
    environment: env.CORE3_ENV || 'development',
    services: resolved.services || {},
    med: resolved.med || {},
    apps: resolved.apps || [],
  };
}

export function resolveEnvironmentValues(value: unknown, environment: string): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveEnvironmentValues(item, environment));
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.some(([key]) => key === environment)
      && entries.every(([key]) => ['development', 'production', 'test'].includes(key))) {
      return resolveEnvironmentValues(entries.find(([key]) => key === environment)![1], environment);
    }
    return Object.fromEntries(entries.map(([key, item]) => [key, resolveEnvironmentValues(item, environment)]));
  }
  return value;
}
