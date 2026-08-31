import { BaseComponent } from '@core3/client/components/BaseComponent';

/** Shared import lifecycle table with guarded retry affordance. */
export class ImportHistory extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) { super(id, state); }

  async draw(container: HTMLElement) {
    const root = document.createElement('section'); root.className = 'import-history';
    const heading = document.createElement('h2'); heading.textContent = String(this.def.title || 'Import history'); root.append(heading);
    const status = document.createElement('p'); status.setAttribute('aria-live', 'polite'); status.textContent = 'Loading…'; root.append(status);
    const table = document.createElement('table'); table.className = 'table'; root.append(table); container.append(root);
    try {
      const app = await import(/* @vite-ignore */ ['/app.ts'].join(''));
      const response = await fetch(`/api/import/history?schemaId=${encodeURIComponent(this.def.schema_id)}`, { headers: { Authorization: `Bearer ${app.getToken()}` } });
      const batches = await response.json(); if (!response.ok) throw new Error(batches.error || 'History unavailable');
      status.textContent = `${batches.length} batch(es)`;
      const header = table.insertRow(); ['Batch', 'Status', 'Accepted', 'Rejected', 'Errors', 'Updated', 'Action'].forEach(label => { const cell = document.createElement('th'); cell.textContent = label; header.append(cell); });
      for (const batch of batches) {
        const row = table.insertRow();
        [batch.importKey, batch.status, batch.acceptedRows, batch.rejectedRows, (batch.errors || []).map((e: any) => `${e.field || 'row'}: ${e.message}`).join('; '), batch.updatedAt].forEach(value => { const cell = row.insertCell(); cell.textContent = String(value ?? ''); });
        const action = row.insertCell();
        if (batch.status === 'recoverable') {
          const retry = document.createElement('button'); retry.className = 'btn btn-secondary'; retry.textContent = 'Retry';
          retry.onclick = async () => { retry.disabled = true; try { const result = await fetch('/api/import/retry', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${app.getToken()}` }, body: JSON.stringify({ schemaId: this.def.schema_id, importKey: batch.importKey }) }); const payload = await result.json(); if (!result.ok) throw new Error(payload.error || 'Retry failed'); status.textContent = `Retry ${payload.status}`; } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); } finally { retry.disabled = false; } };
          action.append(retry);
        } else action.textContent = batch.status === 'committed' ? 'Already committed' : 'Retry unavailable';
      }
    } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
  }
}
