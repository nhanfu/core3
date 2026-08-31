import { BaseComponent } from '@core3/client/components/BaseComponent';

/** Declarative CSV preview/review/commit surface for service import schemas. */
export class ImportWizard extends BaseComponent {
  constructor(id: string, state: any = {}, private readonly def: any = {}) { super(id, state); }

  draw(container: HTMLElement) {
    const root = document.createElement('section'); root.className = 'import-wizard';
    const title = document.createElement('h2'); title.textContent = String(this.def.title || 'Import records'); root.append(title);
    const help = document.createElement('p'); help.textContent = String(this.def.description || 'Paste CSV data, preview validation, then commit valid rows.'); root.append(help);
    const input = document.createElement('textarea'); input.rows = 8; input.className = 'form-input'; input.placeholder = String(this.def.placeholder || 'name,probability\nAcme,20'); root.append(input);
    const status = document.createElement('div'); status.setAttribute('aria-live', 'polite'); root.append(status);
    const actions = document.createElement('div'); actions.className = 'import-wizard-actions'; root.append(actions);
    const previewButton = document.createElement('button'); previewButton.className = 'btn btn-secondary'; previewButton.textContent = 'Preview'; actions.append(previewButton);
    const commitButton = document.createElement('button'); commitButton.className = 'btn btn-primary'; commitButton.textContent = 'Commit valid rows'; commitButton.disabled = true; actions.append(commitButton);
    let preview: any = null;
    const request = async (endpoint: string, body: any) => {
      const app = await import(/* @vite-ignore */ ['/app.ts'].join(''));
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${app.getToken()}` }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Import request failed'); return result;
    };
    previewButton.onclick = async () => {
      previewButton.disabled = true; status.textContent = 'Validating…';
      try { preview = await request('/api/import/preview', { csv: input.value, schema: { id: this.def.schema_id, fields: this.def.fields || [] } }); commitButton.disabled = !preview.valid; status.textContent = `${preview.rows.length} row(s), ${preview.errors.length} error(s)`; }
      catch (error) { status.textContent = error instanceof Error ? error.message : String(error); }
      finally { previewButton.disabled = false; }
    };
    commitButton.onclick = async () => { if (!preview?.valid) return; commitButton.disabled = true; status.textContent = 'Committing…'; try { const result = await request('/api/import/commit', { schemaId: this.def.schema_id, importKey: preview.importKey, rows: preview.rows }); status.textContent = `Committed ${result.acceptedRows} row(s)`; } catch (error) { status.textContent = error instanceof Error ? error.message : String(error); } finally { commitButton.disabled = false; } };
    container.append(root);
  }
}
