/**
 * Host-owned dependency registry. The framework defines service keys but never
 * provides database or authentication implementations.
 */
export const SERVICE_KEYS = Object.freeze({
    repository: 'repository',
    auth: 'auth',
});
export class ServiceRegistry {
    #services = new Map();
    register(key, implementation) {
        if (!implementation)
            throw new Error(`Cannot register empty service: ${key}`);
        this.#services.set(key, implementation);
        return this;
    }
    resolve(key) {
        const implementation = this.#services.get(key);
        if (!implementation)
            throw new Error(`Service is not registered: ${key}`);
        return implementation;
    }
}
export function createFramework(config = {}) {
    const registry = new ServiceRegistry();
    if (config.repository)
        registry.register(SERVICE_KEYS.repository, config.repository);
    if (config.auth)
        registry.register(SERVICE_KEYS.auth, config.auth);
    return registry;
}
