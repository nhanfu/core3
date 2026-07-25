/**
 * Host-owned dependency registry. The framework defines service keys but never
 * provides database or authentication implementations.
 */
export declare const SERVICE_KEYS: Readonly<{
    repository: "repository";
    auth: "auth";
}>;
export declare class ServiceRegistry {
    #private;
    register<T>(key: string, implementation: T): this;
    resolve<T>(key: string): T;
}
export declare function createFramework(config?: {
    repository?: unknown;
    auth?: unknown;
}): ServiceRegistry;
