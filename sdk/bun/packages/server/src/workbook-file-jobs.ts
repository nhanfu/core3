import { randomUUID } from 'node:crypto';

export type WorkbookFileJobPolicy = { poll_ms: number; lease_ms: number; max_attempts: number; max_pending_per_user: number; retention_ms: number };
export type ExecuteWorkbookJob = (operation: string, params: Record<string, any>) => Promise<any>;

/** Persistent worker scheduling; the owning YAML module defines every transition. */
export class WorkbookFileJobs {
  private timer?: ReturnType<typeof setInterval>;
  private active?: Promise<void>;
  private stopped = false;
  private current?: { id: string; cancelled: boolean; controller: AbortController };
  constructor(private readonly policy: WorkbookFileJobPolicy, private readonly execute: ExecuteWorkbookJob, private readonly prefix: string, private readonly convert: (job: any, signal: AbortSignal) => Promise<Record<string, any>>, private readonly interrupt?: () => void) {}
  start() {
    if (this.timer || this.stopped) return;
    this.timer = setInterval(() => { void this.runOnce().catch(() => {}); }, this.policy.poll_ms);
    this.timer.unref();
  }
  stop() {
    this.stopped = true; clearInterval(this.timer);
    if (this.current) this.cancel(this.current.id);
  }
  cancel(id: string) {
    if (this.current?.id !== id || this.current.cancelled) return;
    this.current.cancelled = true;
    this.current.controller.abort();
    this.interrupt?.();
  }
  runOnce(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.active) return this.active;
    this.active = this.run().finally(() => { this.active = undefined; });
    return this.active;
  }
  private async run() {
    const now = Date.now();
    await this.execute(`${this.prefix}_cleanup`, { now, max_attempts: this.policy.max_attempts, expire_before: now - this.policy.retention_ms });
    const [candidate] = await this.execute(`${this.prefix}_next`, { now, max_attempts: this.policy.max_attempts });
    if (!candidate || this.stopped) return;
    const params = { job_id: candidate.id, lease_token: randomUUID(), now: Date.now(), lease_until: Date.now() + this.policy.lease_ms, max_attempts: this.policy.max_attempts };
    const job = await this.execute(`${this.prefix}_claim`, params);
    if (!job.id || this.stopped) return;
    const current = { id: job.id as string, cancelled: false, controller: new AbortController() };
    this.current = current;
    let checking = false;
    const checkOwnership = async () => {
      if (checking || this.current !== current || current.cancelled) return;
      checking = true;
      try {
        const rows = await this.execute(`${this.prefix}_owned`, { ...params, now: Date.now() });
        // An old query may finish after the next conversion has started.
        if (!rows.length && this.current === current) this.cancel(current.id);
      } finally { checking = false; }
    };
    const monitor = setInterval(() => { void checkOwnership().catch(() => {}); }, this.policy.poll_ms);
    monitor.unref();
    try {
      // The claim is authoritative. A transient observation failure is not a
      // cancellation; the final YAML mutation still verifies the lease token.
      await checkOwnership().catch(() => {});
      if (current.cancelled || this.stopped) return;
      const result = await this.convert(job, current.controller.signal);
      if (this.stopped || current.cancelled) return;
      await this.execute(`${this.prefix}_finish`, { ...result, ...params, now: Date.now() });
    } catch (error: any) {
      if (this.stopped || current.cancelled || String(error?.code).endsWith('_LEASE_LOST')) return;
      const retry = error?.code === 'WORKBOOK_ENGINE_UNAVAILABLE' && job.attempts < this.policy.max_attempts;
      await this.execute(`${this.prefix}_fail`, { ...params, now: Date.now(), state: retry ? 'queued' : 'failed', error: retry ? 'File worker unavailable; retrying' : 'File processing failed. Check workbook contents and size limits.' });
    } finally {
      clearInterval(monitor);
      if (this.current === current) this.current = undefined;
    }
  }
}
