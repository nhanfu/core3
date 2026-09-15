import { randomUUID } from 'node:crypto';
type WorkbookState = { snapshot: any; revisions: any[] };

/** Worker-backed semantic validation; no uncommitted model is durable state. */
export class WorkbookEngine {
  private worker?: Worker;
  private serial = 0;
  private generation = 0;
  private readonly pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  private start() {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./workbook-engine-worker.ts', import.meta.url).href);
    worker.unref();
    worker.onmessage = event => {
      const { request_id, result, error } = event.data;
      const pending = this.pending.get(request_id);
      if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(request_id);
      if (error) pending.reject(Object.assign(new Error(error), { status: 422, code: 'WORKBOOK_INVALID_OPERATION' }));
      else pending.resolve(result);
    };
    worker.onerror = event => this.stop(new Error(event.message || 'Workbook engine worker failed'));
    this.worker = worker;
    return worker;
  }

  stop(error = new Error('Workbook engine stopped')) {
    this.generation++;
    this.worker?.terminate(); this.worker = undefined;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(Object.assign(error, { status: 503, code: 'WORKBOOK_ENGINE_UNAVAILABLE' })); }
    this.pending.clear();
  }

  private request(task: any): Promise<any> {
    const worker = this.start();
    const request_id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.stop(new Error('Workbook validation timed out')), 120_000);
      this.pending.set(request_id, { resolve, reject, timer });
      worker.postMessage({ ...task, request_id });
    });
  }

  async execute(operation: 'apply' | 'snapshot' | 'export' | 'freeze', id: string, head: string, load: () => Promise<WorkbookState>, message?: any) {
    const task = { operation, id, head, message };
    let result = await this.request(task);
    if (result.needs_state) result = await this.request({ ...task, state: await load() });
    if (result.needs_state) throw Object.assign(new Error('Workbook changed while loading engine state'), { status: 409, code: 'WORKBOOK_REVISION_CONFLICT' });
    return result;
  }

  async invalidate(id: string) { if (this.worker) await this.request({ operation: 'invalidate', id }); }
  async render(mode: 'freeze' | 'export' | 'prepare_export', head: string, state: WorkbookState, catalog: any[], read: (query: any) => Promise<{ data: any[] }>, maxQueries: number, progress?: (pagesRead: number) => Promise<void>) {
    const id = randomUUID();
    const generation = this.generation;
    try {
      let result = await this.request({ operation: 'render', mode, id, head, state, catalog });
      let count = 0, pagesRead = 0;
      while (result.queries) {
        count += result.queries.length;
        if (count > maxQueries) throw Object.assign(new Error('Workbook exceeds the configured render query limit'), { status: 422, code: 'WORKBOOK_RENDER_QUERY_LIMIT' });
        const pages = [];
        for (let index = 0; index < result.queries.length; index += 8) {
          const batch = await Promise.allSettled(result.queries.slice(index, index + 8).map(async ({ key, query }: any) => ({ key, data: (await read(query)).data })));
          const failure = batch.find(item => item.status === 'rejected');
          if (failure?.status === 'rejected') throw failure.reason;
          for (const item of batch) if (item.status === 'fulfilled') pages.push(item.value);
          pagesRead += batch.length;
          if (generation !== this.generation) throw Object.assign(new Error('Workbook render stopped'), { status: 503, code: 'WORKBOOK_ENGINE_UNAVAILABLE' });
          await progress?.(pagesRead);
        }
        if (generation !== this.generation) throw Object.assign(new Error('Workbook render stopped'), { status: 503, code: 'WORKBOOK_ENGINE_UNAVAILABLE' });
        result = await this.request({ operation: 'render', mode, id, head, pages });
      }
      return result;
    } finally { if (generation === this.generation) await this.invalidate(id); }
  }
  async import(bytes: Uint8Array, maxExpandedBytes: number, maxFiles: number) {
    return this.request({ operation: 'import', bytes, maxExpandedBytes, maxFiles });
  }
  async exportSnapshot(snapshot: any) {
    const id = randomUUID();
    try {
      return (await this.execute('export', id, 'START_REVISION', async () => ({ snapshot: { ...snapshot, revisionId: 'START_REVISION' }, revisions: [] }))).bytes as Uint8Array;
    } finally { await this.invalidate(id); }
  }
}
