/**
 * POS runtime — wires outbox, bootstrap cache, reconciler, and device adapters.
 *
 * Usage:
 *   const runtime = new PosRuntime({ submit });
 *   await runtime.init();
 *   await runtime.bootstrap(session_id);  // returns cached or fresh payload
 *   await runtime.send('cashier_add_line', params);  // queues + submits
 */

import { PosOutbox } from './PosOutbox.ts';
import { PosBootstrapCache } from './PosBootstrapCache.ts';
import { PosReconciler } from './PosReconciler.ts';
import type { OutboxEntry } from './PosOutbox.ts';

export type RuntimeSubmitFn = (action: string, params: Record<string, unknown>) => Promise<unknown>;

export type PosRuntimeOptions = {
  submit: RuntimeSubmitFn;
  onConflict?: (conflicts: OutboxEntry[]) => void;
  onOffline?: () => void;
  onOnline?: () => void;
};

export type ConnectionState = 'online' | 'offline' | 'reconnecting';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export class PosRuntime {
  private _outbox: PosOutbox;
  private _cache: PosBootstrapCache;
  private _reconciler: PosReconciler;
  private _opts: PosRuntimeOptions;
  private _connectionState: ConnectionState = 'online';
  private _offlineUnsubscribe: (() => void) | null = null;

  constructor(opts: PosRuntimeOptions) {
    this._opts = opts;
    this._outbox = new PosOutbox();
    this._cache = new PosBootstrapCache();
    this._reconciler = new PosReconciler(this._outbox, opts.submit);
  }

  get outbox() { return this._outbox; }
  get cache() { return this._cache; }
  get connectionState() { return this._connectionState; }
  get offlineAvailable() { return this._outbox.available && this._cache.available; }

  async init(): Promise<void> {
    await Promise.all([this._outbox.init(), this._cache.init()]);
    this._watchNetwork();

    if (!this._outbox.available) {
      console.warn('[PosRuntime] Offline queue unavailable — serving online-only mode');
    }
  }

  /**
   * Bootstrap session catalog. Returns cached payload if catalog_version matches.
   * Falls back to cached payload when offline.
   */
  async bootstrap(session_id: string): Promise<unknown> {
    try {
      const fresh = await this._opts.submit('pos_bootstrap_session', { id: session_id }) as any;
      const server_version = fresh?.catalog_version;

      if (server_version) {
        const hit = await this._cache.loadIfFresh(session_id, server_version);
        if (hit) return hit;

        await this._cache.save({
          session_id,
          catalog_version: server_version,
          products: fresh.products ?? [],
          payment_methods: fresh.payment_methods ?? [],
          open_orders: fresh.open_orders ?? [],
        });
        return fresh;
      }
      return fresh;
    } catch {
      if (this._connectionState === 'offline') {
        const cached = await this._cache.load(session_id);
        if (cached) {
          console.info('[PosRuntime] Offline — serving bootstrap from cache');
          return cached;
        }
      }
      throw new Error('Bootstrap failed and no cached data available');
    }
  }

  /**
   * Send an idempotent command. If offline, enqueues to outbox (command is
   * persisted and will be submitted on reconnect). If online, submits immediately
   * and also records the committed result in the outbox for audit.
   */
  async send(action: string, params: Record<string, unknown>): Promise<unknown> {
    const operation_id = uuid();
    const entry = { operation_id, action, params };

    if (this._connectionState === 'offline' && this._outbox.available) {
      await this._outbox.enqueue(entry);
      return { queued: true, operation_id };
    }

    try {
      await this._outbox.enqueue(entry);
      const result = await this._opts.submit(action, { ...params, operation_id });
      await this._outbox.markCommitted(operation_id, result);
      return result;
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (!err?.status || err.status >= 500) {
        await this._outbox.markFailed(operation_id, msg);
      } else {
        await this._outbox.markFailed(operation_id, msg);
      }
      throw err;
    }
  }

  /** Trigger reconciliation (called automatically on reconnect). */
  async reconcile(): Promise<void> {
    this._connectionState = 'reconnecting';
    const result = await this._reconciler.reconcile();
    this._connectionState = 'online';

    if (result.conflicts.length) {
      this._opts.onConflict?.(result.conflicts);
    }

    await this._outbox.prune();
  }

  dispose(): void {
    this._offlineUnsubscribe?.();
  }

  private _watchNetwork() {
    const goOffline = () => {
      this._connectionState = 'offline';
      this._opts.onOffline?.();
    };
    const goOnline = async () => {
      this._opts.onOnline?.();
      await this.reconcile();
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    this._offlineUnsubscribe = () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };

    if (!navigator.onLine) goOffline();
  }
}
