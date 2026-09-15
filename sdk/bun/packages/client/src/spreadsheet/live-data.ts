import type { WorkbookRequest } from './WorkbookTransport';
import { workbookDataQuery, workbookDataValue } from './data-query';

/** Authorized results are ephemeral and private to one viewer/model. */
export class WorkbookLiveData {
  private model: any;
  private catalog?: Map<string, any>;
  private catalogError?: string;
  private readonly pages = new Map<string, { data?: any[]; error?: string }>();
  private requests = new AbortController();
  private generation = 0;
  private closed = false;
  private notifying = false;
  private readonly cellIds = new Set<string>();
  private unpositioned = false;

  constructor(private readonly request: WorkbookRequest) { void this.refresh(); }
  attach(model: any) { this.model = model; this.changed(); }
  dispose() { this.closed = true; this.generation++; this.requests.abort(); this.pages.clear(); this.model = undefined; }

  private changed() {
    if (this.closed || this.notifying || !this.model) return;
    this.notifying = true;
    queueMicrotask(() => {
      this.notifying = false;
      if (this.closed || !this.model) return;
      if (this.unpositioned) { this.model.dispatch('EVALUATE_CELLS'); return; }
      const cellIds = [...this.cellIds].filter(id => {
        try { return !!this.model.getters.getCellPosition(id); }
        catch { this.cellIds.delete(id); return false; }
      });
      if (cellIds.length) this.model.dispatch('EVALUATE_CELLS', { cellIds });
    });
  }

  async refresh() {
    if (this.closed) return;
    const generation = ++this.generation;
    this.requests.abort(); this.requests = new AbortController();
    this.pages.clear(); this.catalog = undefined; this.catalogError = undefined; this.changed();
    try {
      const result = await this.request('/sources', { signal: this.requests.signal });
      if (generation !== this.generation || this.closed) return;
      this.catalog = new Map(result.data.map((source: any) => [source.key, source]));
    } catch (error: any) { if (generation === this.generation) this.catalogError = error.message; }
    if (generation === this.generation) this.changed();
  }

  read(sourceKey: unknown, field: unknown, row: unknown, filterJson: unknown, cellId?: string): { value?: any; error?: string } {
    if (cellId) this.cellIds.add(cellId); else this.unpositioned = true;
    if (this.closed) return { error: 'Core3 data session is closed' };
    if (this.catalogError) return { error: this.catalogError };
    if (!this.catalog) return { error: 'Loading Core3 data sources…' };
    let descriptor;
    try { descriptor = workbookDataQuery(this.catalog, sourceKey, field, row, filterJson); }
    catch (error: any) { return { error: error.message }; }
    const { key, query, index } = descriptor;
    let page = this.pages.get(key);
    if (!page) {
      page = {}; this.pages.set(key, page);
      const generation = this.generation;
      const entry = page;
      void this.request('/data', { method: 'POST', signal: this.requests.signal, body: JSON.stringify(query) }).then(result => {
        if (generation !== this.generation || this.closed) return;
        entry.data = result.data;
        this.changed();
      }).catch(error => {
        if (generation !== this.generation || this.closed) return;
        entry.error = error.message; entry.data = undefined;
        this.changed();
      });
    }
    if (page.error) return { error: page.error };
    if (!page.data) return { error: 'Loading Core3 data…' };
    try { return { value: workbookDataValue(page.data, index, descriptor.field) }; }
    catch (error: any) { return { error: error.message }; }
  }
}
