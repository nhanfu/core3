/**
 * Host-owned dependency registry. The framework defines service keys but never
 * provides database or authentication implementations.
 */
export const SERVICE_KEYS = Object.freeze({
  repository: 'repository',
  auth: 'auth',
});

export class ServiceRegistry {
  #services = new Map<string, unknown>();

  register<T>(key: string, implementation: T): this {
    if (!implementation) throw new Error(`Cannot register empty service: ${key}`);
    this.#services.set(key, implementation);
    return this;
  }

  resolve<T>(key: string): T {
    const implementation = this.#services.get(key);
    if (!implementation) throw new Error(`Service is not registered: ${key}`);
    return implementation as T;
  }
}

export function createFramework(config: { repository?: unknown; auth?: unknown } = {}) {
  const registry = new ServiceRegistry();
  if (config.repository) registry.register(SERVICE_KEYS.repository, config.repository);
  if (config.auth) registry.register(SERVICE_KEYS.auth, config.auth);
  return registry;
}
