import { readFileSync } from 'node:fs';

export type ModuleApplicationConfig = Record<string, unknown>;

export type ApplicationConfig = {
  environment: string;
  services: Record<string, ModuleApplicationConfig>;
  med: Record<string, unknown>;
  apps: Array<Record<string, unknown>>;
  runtime: { topology: 'dev_inproc' | 'distributed'; service_host_url: string; service_execution: 'inproc' | 'http' };
  gateway: { dispatch_mode: 'current' | 'shadow' | 'enforce'; dispatch_enforced_commands: string[]; rate_limits: unknown[] };
  events: { delivery_mode: 'mediator' | 'message_log' | 'embedded'; message_log_pairs: string[] };
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
  const stringList = (value: unknown, envName: string): string[] => {
    const source = value === undefined || value === '' || (Array.isArray(value) && value.length === 0) ? env[envName] : value;
    if (Array.isArray(source)) return source.map(String).filter(Boolean);
    if (typeof source !== 'string' || !source.trim()) return [];
    try { const parsed = JSON.parse(source); if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean); } catch { /* accept comma-separated deployment values */ }
    return source.split(',').map((item) => item.trim()).filter(Boolean);
  };
  const config = {
    environment: env.CORE3_ENV || 'development',
    services: resolved.services || {},
    med: resolved.med || {},
    apps: resolved.apps || [],
    runtime: { topology: (resolved.runtime as any)?.topology || 'distributed', service_host_url: String((resolved.runtime as any)?.service_host_url || ''), service_execution: (resolved.runtime as any)?.service_execution || 'http' },
    gateway: { dispatch_mode: (resolved.gateway as any)?.dispatch_mode || 'current', dispatch_enforced_commands: stringList((resolved.gateway as any)?.dispatch_enforced_commands, 'CORE3_DISPATCH_ENFORCED_COMMANDS'), rate_limits: (resolved.gateway as any)?.rate_limits || [] },
    events: { delivery_mode: (resolved.events as any)?.delivery_mode || 'mediator', message_log_pairs: stringList((resolved.events as any)?.message_log_pairs, 'CORE3_MESSAGE_LOG_PAIRS') },
  };
  validateApplicationConfig(config);
  return config;
}

export function validateApplicationConfig(config: Pick<ApplicationConfig, 'runtime' | 'gateway' | 'events'>): void {
  if (!['dev_inproc', 'distributed'].includes(config.runtime.topology)) throw new Error(`Invalid runtime.topology: ${config.runtime.topology}`);
  if (!['inproc', 'http'].includes(config.runtime.service_execution)) throw new Error(`Invalid runtime.service_execution: ${config.runtime.service_execution}`);
  if (config.runtime.topology === 'dev_inproc' && !config.runtime.service_host_url) throw new Error('runtime.service_host_url is required for dev_inproc topology');
  if (!['current', 'shadow', 'enforce'].includes(config.gateway.dispatch_mode)) throw new Error(`Invalid gateway.dispatch_mode: ${config.gateway.dispatch_mode}`);
  if (!Array.isArray(config.gateway.dispatch_enforced_commands) || config.gateway.dispatch_enforced_commands.some((value) => typeof value !== 'string')) throw new Error('gateway.dispatch_enforced_commands must be a string list');
  if (!['mediator', 'message_log', 'embedded'].includes(config.events.delivery_mode)) throw new Error(`Invalid events.delivery_mode: ${config.events.delivery_mode}`);
  if (!Array.isArray(config.events.message_log_pairs) || config.events.message_log_pairs.some((value) => typeof value !== 'string')) throw new Error('events.message_log_pairs must be a string list');
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
