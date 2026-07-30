export type AppStatus = 'available' | 'coming_soon' | 'disabled';

export type AppManifest = {
  id: string;
  name: string;
  icon?: string;
  status?: AppStatus;
  description?: string;
  dependencies?: string[];
  rootMenus?: string[];
  defaultAction?: string;
  permissions?: string[];
};

/** Client-side registry for globally switchable application manifests. */
export class AppRegistry {
  private manifests = new Map<string, AppManifest>();

  constructor(manifests: AppManifest[] = []) {
    this.registerAll(manifests);
  }

  register(manifest: AppManifest) {
    if (!manifest.id || !manifest.name) throw new Error('App manifests require id and name');
    this.manifests.set(manifest.id, { status: 'available', ...manifest });
    return this;
  }

  registerAll(manifests: AppManifest[]) {
    for (const manifest of manifests) this.register(manifest);
    return this;
  }

  get(id: string) { return this.manifests.get(id); }
  list() { return [...this.manifests.values()]; }
  available() { return this.list().filter(manifest => manifest.status === 'available'); }
}
