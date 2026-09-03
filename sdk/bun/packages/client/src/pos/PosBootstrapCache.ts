/**
 * Versioned session bootstrap cache backed by IndexedDB.
 *
 * Only caches signed-in session catalog (products, payment methods, open orders)
 * and the catalog_version tag returned by the server. Never caches tokens or
 * full table dumps. On reconnect, version mismatch triggers a fresh fetch.
 */

export type BootstrapPayload = {
  session_id: string;
  catalog_version: string;
  products: unknown[];
  payment_methods: unknown[];
  open_orders: unknown[];
  fetched_at: number;
};

const DB_NAME = 'core3_pos_bootstrap';
const DB_VERSION = 1;
const STORE = 'sessions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'session_id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class PosBootstrapCache {
  private _db: IDBDatabase | null = null;
  private _unavailable = false;

  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      this._unavailable = true;
      return;
    }
    try {
      this._db = await openDb();
    } catch {
      this._unavailable = true;
    }
  }

  get available(): boolean {
    return !this._unavailable && this._db !== null;
  }

  async save(payload: Omit<BootstrapPayload, 'fetched_at'>): Promise<void> {
    if (!this._db) return;
    const full: BootstrapPayload = { ...payload, fetched_at: Date.now() };
    await req(this._db.transaction([STORE], 'readwrite').objectStore(STORE).put(full));
  }

  async load(session_id: string): Promise<BootstrapPayload | null> {
    if (!this._db) return null;
    const result: BootstrapPayload | undefined = await req(
      this._db.transaction([STORE], 'readonly').objectStore(STORE).get(session_id)
    );
    return result ?? null;
  }

  /** Return cached payload only if catalog_version matches. */
  async loadIfFresh(session_id: string, server_version: string): Promise<BootstrapPayload | null> {
    const cached = await this.load(session_id);
    if (!cached) return null;
    if (cached.catalog_version !== server_version) return null;
    return cached;
  }

  async evict(session_id: string): Promise<void> {
    if (!this._db) return;
    await req(this._db.transaction([STORE], 'readwrite').objectStore(STORE).delete(session_id));
  }

  async evictAll(): Promise<void> {
    if (!this._db) return;
    await req(this._db.transaction([STORE], 'readwrite').objectStore(STORE).clear());
  }
}
