import { join } from 'node:path';

function interpolate(value: unknown, env: NodeJS.ProcessEnv): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z_][A-Z0-9_]*)(?::-([^}]*))?\}/g, (_, name: string, fallback?: string) => env[name] ?? fallback ?? '');
  }
  if (Array.isArray(value)) return value.map((item) => interpolate(item, env));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, interpolate(item, env)]));
  }
  return value;
}

export async function loadMedConfig(path = join(import.meta.dir, '../config.yaml'), env: NodeJS.ProcessEnv = process.env): Promise<Record<string, any>> {
  return interpolate(Bun.YAML.parse(await Bun.file(path).text()), env) as Record<string, any>;
}
