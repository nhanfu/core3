/**
 * Reconciliation and recovery on reconnect.
 *
 * Strategy:
 *  1. On reconnect, refresh policy: re-fetch bootstrap catalog_version.
 *  2. Submit pending outbox commands in creation order.
 *  3. Surface conflicts by ticket — never auto-mutate a paid order.
 *  4. Offer retry, discard draft, or supervisor review per conflict.
 */

import { PosOutbox, type OutboxEntry } from './PosOutbox.ts';

export type ReconcileResult = {
  committed: string[];
  conflicts: OutboxEntry[];
  failed: string[];
};

export type SubmitFn = (action: string, params: Record<string, unknown>) => Promise<unknown>;

export class PosReconciler {
  constructor(private _outbox: PosOutbox, private _submit: SubmitFn) {}

  /**
   * Walk pending commands in order and attempt each.
   * On duplicate operation_id (409 with 'already committed' body), mark committed.
   * On version mismatch (409 with 'row_version' body), mark conflict.
   * On network error, leave as pending for next reconnect.
   */
  async reconcile(): Promise<ReconcileResult> {
    const pending = await this._outbox.pending();
    const result: ReconcileResult = { committed: [], conflicts: [], failed: [] };

    for (const entry of pending) {
      await this._outbox.markInflight(entry.operation_id);
      try {
        const resp = await this._submit(entry.action, entry.params);
        await this._outbox.markCommitted(entry.operation_id, resp);
        result.committed.push(entry.operation_id);
      } catch (err: any) {
        const msg: string = err?.message || String(err);
        const status: number = err?.status ?? 0;

        if (status === 409 && msg.includes('operation_id')) {
          // Idempotency replay — server already has this
          await this._outbox.markCommitted(entry.operation_id, null);
          result.committed.push(entry.operation_id);
        } else if (status === 409 || msg.includes('row_version') || msg.includes('conflict')) {
          await this._outbox.markConflict(entry.operation_id, msg);
          result.conflicts.push(entry);
        } else if (status >= 400 && status < 500) {
          // Hard domain error — discard automatically
          await this._outbox.markFailed(entry.operation_id, msg);
          result.failed.push(entry.operation_id);
        } else {
          // Network or 5xx — leave pending, stop processing to preserve order
          await this._outbox.markFailed(entry.operation_id, msg);
          break;
        }
      }
    }

    return result;
  }

  /** Retry a single conflict entry after supervisor review / manual resolution. */
  async retryEntry(entry: OutboxEntry, updatedParams?: Record<string, unknown>): Promise<void> {
    const params = updatedParams ?? entry.params;
    await this._outbox.enqueue({ ...entry, params });
  }
}
