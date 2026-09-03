/**
 * Durable ordered command outbox backed by IndexedDB.
 *
 * Each command carries a stable operation_id (client UUID), expected_row_version,
 * retry state, and user-visible error. Reload never duplicates a sale because
 * the server guards by operation_id UNIQUE.
 */

export type OutboxStatus = 'pending' | 'inflight' | 'committed' | 'conflict' | 'failed' | 'discarded';

export type OutboxEntry = {
  operation_id: string;
  action: string;
  params: Record<string, unknown>;
  expected_row_version?: number;
  created_at: number;
  attempt: number;
  status: OutboxStatus;
  error?: string;
  server_result?: unknown;
};

const DB_NAME = 'core3_pos_outbox';
const DB_VERSION = 1;
const STORE = 'commands';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'operation_id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction([STORE], mode).objectStore(STORE);
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export class PosOutbox {
  private _db: IDBDatabase | null = null;
  private _unavailable = false;

  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      this._unavailable = true;
      console.warn('[PosOutbox] IndexedDB not available — offline queue disabled');
      return;
    }
    try {
      this._db = await openDb();
    } catch (e) {
      this._unavailable = true;
      console.warn('[PosOutbox] Failed to open IndexedDB:', e);
    }
  }

  get available(): boolean {
    return !this._unavailable && this._db !== null;
  }

  async enqueue(entry: Omit<OutboxEntry, 'created_at' | 'attempt' | 'status'>): Promise<void> {
    if (!this._db) return;
    const full: OutboxEntry = { ...entry, created_at: Date.now(), attempt: 0, status: 'pending' };
    await req(tx(this._db, 'readwrite').put(full));
  }

  async markInflight(operation_id: string): Promise<void> {
    if (!this._db) return;
    const store = tx(this._db, 'readwrite');
    const entry: OutboxEntry = await req(store.get(operation_id));
    if (!entry) return;
    entry.status = 'inflight';
    entry.attempt += 1;
    await req(store.put(entry));
  }

  async markCommitted(operation_id: string, result: unknown): Promise<void> {
    if (!this._db) return;
    const store = tx(this._db, 'readwrite');
    const entry: OutboxEntry = await req(store.get(operation_id));
    if (!entry) return;
    entry.status = 'committed';
    entry.server_result = result;
    await req(store.put(entry));
  }

  async markConflict(operation_id: string, error: string): Promise<void> {
    if (!this._db) return;
    const store = tx(this._db, 'readwrite');
    const entry: OutboxEntry = await req(store.get(operation_id));
    if (!entry) return;
    entry.status = 'conflict';
    entry.error = error;
    await req(store.put(entry));
  }

  async markFailed(operation_id: string, error: string): Promise<void> {
    if (!this._db) return;
    const store = tx(this._db, 'readwrite');
    const entry: OutboxEntry = await req(store.get(operation_id));
    if (!entry) return;
    entry.status = 'failed';
    entry.error = error;
    await req(store.put(entry));
  }

  async discard(operation_id: string): Promise<void> {
    if (!this._db) return;
    const store = tx(this._db, 'readwrite');
    const entry: OutboxEntry = await req(store.get(operation_id));
    if (!entry) return;
    entry.status = 'discarded';
    await req(store.put(entry));
  }

  async pending(): Promise<OutboxEntry[]> {
    if (!this._db) return [];
    const all: OutboxEntry[] = await req(tx(this._db, 'readonly').getAll());
    return all
      .filter(e => e.status === 'pending' || e.status === 'inflight')
      .sort((a, b) => a.created_at - b.created_at);
  }

  async conflicts(): Promise<OutboxEntry[]> {
    if (!this._db) return [];
    const all: OutboxEntry[] = await req(tx(this._db, 'readonly').getAll());
    return all.filter(e => e.status === 'conflict');
  }

  async get(operation_id: string): Promise<OutboxEntry | undefined> {
    if (!this._db) return undefined;
    return req(tx(this._db, 'readonly').get(operation_id));
  }

  /** Remove committed and discarded entries older than maxAgeMs (default 24h). */
  async prune(maxAgeMs = 86_400_000): Promise<void> {
    if (!this._db) return;
    const cutoff = Date.now() - maxAgeMs;
    const all: OutboxEntry[] = await req(tx(this._db, 'readonly').getAll());
    const store = tx(this._db, 'readwrite');
    for (const e of all) {
      if ((e.status === 'committed' || e.status === 'discarded') && e.created_at < cutoff) {
        await req(store.delete(e.operation_id));
      }
    }
  }
}
