import { expect, test } from 'bun:test';
import { WorkbookFileJobs } from '@core3/server/workbook-file-jobs';

const policy = { poll_ms: 5, lease_ms: 180000, max_attempts: 3, max_pending_per_user: 3, retention_ms: 86400000 };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('local cancellation interrupts only the active conversion and the next job can finish', async () => {
  let id = 'first';
  const started = deferred<void>(), conversion = deferred<Record<string, any>>();
  const finished: string[] = [], failed: string[] = [];
  let interruptions = 0;
  let activeSignal: AbortSignal | undefined;
  const worker = new WorkbookFileJobs({ ...policy, poll_ms: 600000 }, async (operation, params) => {
    if (operation.endsWith('_next')) return [{ id }];
    if (operation.endsWith('_claim')) return { id, attempts: 1 };
    if (operation.endsWith('_owned')) return [{ id }];
    if (operation.endsWith('_finish')) finished.push(params.job_id);
    if (operation.endsWith('_fail')) failed.push(params.job_id);
    return {};
  }, 'export_job', async (job, signal) => {
    activeSignal = signal;
    if (job.id === 'first') { started.resolve(); return conversion.promise; }
    return { artifact_base64: 'next file' };
  }, () => { interruptions++; conversion.reject(new Error('Worker terminated')); });
  try {
    const running = worker.runOnce(); await started.promise;
    worker.cancel('other'); expect(interruptions).toBe(0);
    expect(activeSignal?.aborted).toBe(false);
    worker.cancel('first'); worker.cancel('first');
    expect(activeSignal?.aborted).toBe(true);
    await running;
    expect(interruptions).toBe(1);
    expect(finished).toEqual([]); expect(failed).toEqual([]);
    id = 'second'; await worker.runOnce();
    expect(finished).toEqual(['second']);
    expect(activeSignal?.aborted).toBe(false);
    expect(interruptions).toBe(1);
  } finally { worker.stop(); }
});

test('a delayed ownership response from a finished job cannot interrupt a newer conversion', async () => {
  let id = 'first', firstChecks = 0, interruptions = 0;
  const oldCheckStarted = deferred<void>(), oldCheck = deferred<any[]>();
  const first = deferred<Record<string, any>>(), second = deferred<Record<string, any>>(), secondStarted = deferred<void>();
  const finished: string[] = [];
  const deadline = setTimeout(() => oldCheckStarted.reject(new Error('Ownership monitor did not run')), 1000);
  const worker = new WorkbookFileJobs(policy, async (operation, params) => {
    if (operation.endsWith('_next')) return [{ id }];
    if (operation.endsWith('_claim')) return { id, attempts: 1 };
    if (operation.endsWith('_owned')) {
      if (params.job_id === 'first' && ++firstChecks === 2) { oldCheckStarted.resolve(); return oldCheck.promise; }
      return [{ id: params.job_id }];
    }
    if (operation.endsWith('_finish')) finished.push(params.job_id);
    return {};
  }, 'export_job', job => {
    if (job.id === 'first') return first.promise;
    secondStarted.resolve(); return second.promise;
  }, () => { interruptions++; second.reject(new Error('Unexpected interruption')); });
  try {
    const firstRun = worker.runOnce(); await oldCheckStarted.promise;
    first.resolve({ artifact_base64: 'first file' }); await firstRun;
    id = 'second'; const secondRun = worker.runOnce(); await secondStarted.promise;
    oldCheck.resolve([]);
    await Bun.sleep(10);
    expect(interruptions).toBe(0);
    second.resolve({ artifact_base64: 'second file' }); await secondRun;
    expect(finished).toEqual(['first', 'second']);
  } finally { clearTimeout(deadline); oldCheck.resolve([]); worker.stop(); }
});

test('a transient ownership query failure does not turn a valid conversion into a failed job', async () => {
  const events: string[] = [];
  const worker = new WorkbookFileJobs(policy, async operation => {
    if (operation.endsWith('_next')) return [{ id: 'one' }];
    if (operation.endsWith('_claim')) return { id: 'one', attempts: 1 };
    if (operation.endsWith('_owned')) throw new Error('Temporary database outage');
    events.push(operation); return {};
  }, 'export_job', async () => ({ artifact_base64: 'file' }), () => events.push('interrupt'));
  try {
    await worker.runOnce();
    expect(events).toEqual(['export_job_cleanup', 'export_job_finish']);
  } finally { worker.stop(); }
});
