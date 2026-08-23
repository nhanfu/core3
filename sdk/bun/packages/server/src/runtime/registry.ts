export type ServiceExecution = 'http' | 'inproc';
export type ServiceEndpoint = { serviceId: string; instanceId: string; transport: 'http' | 'inproc'; baseUrl: string; execution: ServiceExecution; dispatchPath?: string; healthPath?: string; topics?: string[]; ttlMs: number; registeredAt?: number };
export class ServiceNotFoundError extends Error { readonly code = 'SERVICE_NOT_FOUND'; constructor(serviceId: string) { super(`Service is not registered: ${serviceId}`); } }
export class ServiceRegistry {
  private readonly entries = new Map<string, ServiceEndpoint>();
  constructor(private readonly now: () => number = Date.now) {}
  register(endpoint: ServiceEndpoint): void { if (!endpoint.serviceId || !endpoint.instanceId) throw new Error('Service registration requires serviceId and instanceId'); this.entries.set(endpoint.serviceId, { ...endpoint, ttlMs: Math.max(1, endpoint.ttlMs), registeredAt: this.now() }); }
  heartbeat(serviceId: string, instanceId: string): boolean { const entry = this.entries.get(serviceId); if (!entry || entry.instanceId !== instanceId) return false; this.entries.set(serviceId, { ...entry, registeredAt: this.now() }); return true; }
  deregister(serviceId: string, instanceId?: string): void { const entry = this.entries.get(serviceId); if (entry && (!instanceId || entry.instanceId === instanceId)) this.entries.delete(serviceId); }
  resolve(serviceId: string): ServiceEndpoint { const entry = this.entries.get(serviceId); if (!entry || this.now() >= (entry.registeredAt || 0) + entry.ttlMs) { if (entry) this.entries.delete(serviceId); throw new ServiceNotFoundError(serviceId); } return { ...entry }; }
  list(): ServiceEndpoint[] { return [...this.entries.keys()].flatMap((id) => { try { return [this.resolve(id)]; } catch { return []; } }); }
}

export class HttpServiceRegistryClient {
  private endpoints = new Map<string, ServiceEndpoint>();
  private refreshedAt = 0;
  private initialized = false;
  constructor(private readonly registryUrl: string, private readonly fetcher: typeof fetch = fetch, private readonly now: () => number = Date.now, private readonly cacheMs = 1000, private readonly authorizationToken?: string) {}
  async resolve(serviceId: string): Promise<ServiceEndpoint> {
    await this.refreshIfNeeded();
    const endpoint = this.endpoints.get(serviceId);
    if (!endpoint) throw new ServiceNotFoundError(serviceId);
    return { ...endpoint };
  }
  async refresh(): Promise<void> {
    const response = await this.fetcher(new URL('/internal/registry', this.registryUrl), this.authorizationToken ? { headers: { authorization: `Bearer ${this.authorizationToken}` } } : undefined);
    if (!response.ok) throw Object.assign(new Error(`Service registry unavailable: ${response.status}`), { code: 'REGISTRY_UNAVAILABLE', status: 503 });
    const entries = await response.json() as ServiceEndpoint[];
    this.endpoints = new Map(entries.map((entry) => [entry.serviceId, entry]));
    this.refreshedAt = this.now();
    this.initialized = true;
  }
  private async refreshIfNeeded(): Promise<void> { if (!this.initialized || this.now() - this.refreshedAt >= this.cacheMs) await this.refresh(); }
}
