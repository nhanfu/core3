import { BaseComponent } from './BaseComponent';
import { SpreadsheetWorkbook } from './SpreadsheetWorkbook';
import { loadSpreadsheetEngine } from '../spreadsheet/engine';
import { WorkbookTransport, workbookRequest } from '../spreadsheet/WorkbookTransport';
import { WorkbookLiveData } from '../spreadsheet/live-data';
import { openWorkbookFilters } from '../spreadsheet/global-filters';
import { insertLinkedList } from '../spreadsheet/insert-linked-list';

/** Reusable workbook library. Its endpoint and available product surface are YAML-defined. */
export class SpreadsheetWorkspace extends BaseComponent {
  private transport?: WorkbookTransport;
  private editor?: SpreadsheetWorkbook;
  private liveData?: WorkbookLiveData;
  private generation = 0;
  private unloading = (event: BeforeUnloadEvent) => {
    if (this.hasPendingEdits()) { event.preventDefault(); event.returnValue = ''; }
  };

  static resolveState(definition: any, context: any) { return { ...definition, workbook_id: context.state?.workbook_id || null }; }

  private hasPendingEdits() { return this.editor?.model && !this.editor.model.session.isFullySynchronized(); }

  override dispose() {
    this.liveData?.dispose();
    this.generation++;
    this.transport?.leave();
    window.removeEventListener('beforeunload', this.unloading);
    super.dispose();
  }

  draw(container: HTMLElement) {
    this.liveData?.dispose(); this.liveData = undefined;
    const generation = ++this.generation;
    this.transport?.leave();
    this.disposeChildren();
    this.editor = undefined;
    window.removeEventListener('beforeunload', this.unloading);
    window.addEventListener('beforeunload', this.unloading);
    container.replaceChildren();
    const header = document.createElement('header');
    header.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 0';
    const title = document.createElement('h1');
    title.style.cssText = 'font-size:22px;margin:0;flex:1';
    title.textContent = this.state.title || 'Spreadsheets';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Loading…';
    const content = document.createElement('div');
    header.append(title);
    container.append(header, status, content);
    const request = workbookRequest(this.state.endpoint);
    const error = (failure: unknown) => { if (generation === this.generation) status.textContent = failure instanceof Error ? failure.message : 'Workbook request failed'; };
    const button = (label: string, action: () => Promise<unknown> | void, target = header) => {
      const node = document.createElement('button');
      node.type = 'button'; node.textContent = label;
      node.addEventListener('click', () => { void Promise.resolve().then(action).catch(error); });
      target.append(node);
      return node;
    };
    const form = (name: string, fields: Array<{ key: string; label: string; value?: string; choices?: string[] }>, submit: (values: Record<string, string>) => Promise<void>) => {
      const dialog = document.createElement('dialog');
      const heading = document.createElement('h2'); heading.textContent = name;
      const node = document.createElement('form');
      const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
      node.append(heading);
      for (const field of fields) {
        const label = document.createElement('label'); label.textContent = field.label; label.style.cssText = 'display:flex;flex-direction:column;margin:12px 0;min-width:250px';
        const input = field.choices ? document.createElement('select') : document.createElement('input');
        input.name = field.key;
        input.setAttribute('aria-label', field.label);
        if (input instanceof HTMLSelectElement) for (const choice of field.choices!) { const option = document.createElement('option'); option.value = option.textContent = choice; input.append(option); }
        input.value = field.value || field.choices?.[0] || ''; input.required = true;
        label.append(input); node.append(label);
      }
      const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Save';
      button('Cancel', () => dialog.close(), node);
      node.append(save, feedback); dialog.append(node); container.append(dialog);
      dialog.addEventListener('close', () => dialog.remove(), { once: true });
      node.addEventListener('submit', event => {
        event.preventDefault(); save.disabled = true;
        void submit(Object.fromEntries(new FormData(node).entries()) as Record<string, string>).then(() => dialog.close()).catch(failure => { feedback.textContent = failure.message; }).finally(() => { save.disabled = false; });
      });
      dialog.showModal();
    };
    const select = (id: string | null, editsPreserved = false) => {
      if (this.hasPendingEdits() && !editsPreserved) { status.textContent = 'Wait for your edits to save before leaving this workbook.'; return; }
      this.state.workbook_id = id;
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('workbook_id', id); else url.searchParams.delete('workbook_id');
      window.history.replaceState({}, '', url);
      this.redraw();
    };
    const publicToken = new URLSearchParams(window.location.hash.slice(1)).get('workbook-share');
    if (publicToken) {
      void request(`/public/${encodeURIComponent(publicToken)}`).then(share => {
        if (generation !== this.generation) return;
        title.textContent = share.name;
        status.textContent = `Read-only snapshot · expires ${new Date(share.expires_at).toLocaleDateString()}`;
        this.editor = this.mountChild(new SpreadsheetWorkbook(`${this.id}-public`, {
          workbook: { name: share.name, workbook_snapshot: share.snapshot }, mode: 'readonly', allow_export: false,
        }), content);
      }).catch(error);
      return;
    }
    if (!this.state.workbook_id) {
      const search = document.createElement('input'); search.placeholder = 'Search spreadsheets'; search.setAttribute('aria-label', 'Search spreadsheets'); header.append(search);
      const archive = document.createElement('label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      archive.append(checkbox, ' Show archived'); header.append(archive);
      let lookup = 0;
      const refresh = async () => {
        const sequence = ++lookup;
        const result = await request(`?q=${encodeURIComponent(search.value)}&archived=${checkbox.checked}`);
        if (generation !== this.generation || sequence !== lookup) return;
        content.replaceChildren();
        status.textContent = result.data.length ? `${result.data.length} spreadsheets` : 'No spreadsheets yet.';
        create.disabled = !result.can_create;
        importButton.disabled = !result.can_create;
        for (const workbook of result.data) {
          const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:12px;padding:12px;border-bottom:1px solid #ddd';
          button(workbook.name + (workbook.archived ? ' (Archived)' : ''), () => select(workbook.id), row);
          content.append(row);
        }
      };
      const create = button('New spreadsheet', () => form('New spreadsheet', [{ key: 'name', label: 'Name' }], async values => {
        const created = await request('', { method: 'POST', body: JSON.stringify(values) }); select(created.id);
      }));
      create.disabled = true;
      const file = document.createElement('input');
      file.type = 'file'; file.accept = '.xlsx'; file.hidden = true;
      file.setAttribute('aria-label', 'Import XLSX file');
      header.append(file);
      const importButton = button('Import XLSX', () => file.click());
      importButton.disabled = true;
      file.addEventListener('change', () => {
        const selected = file.files?.[0];
        if (!selected) return;
        importButton.disabled = true; status.textContent = 'Importing workbook…';
        void request(`?name=${encodeURIComponent(selected.name.replace(/\.xlsx$/i, ''))}`, {
          method: 'POST', body: selected, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        }).then(created => { this.state.import_warnings = created.import_warnings; select(created.id); }).catch(error).finally(() => { importButton.disabled = false; file.value = ''; });
      });
      search.addEventListener('change', () => { void refresh().catch(error); });
      checkbox.addEventListener('change', () => { void refresh().catch(error); });
      void refresh().catch(error);
      return;
    }
    button('All spreadsheets', () => select(null));
    const id = String(this.state.workbook_id);
    const bookRequest = workbookRequest(`${this.state.endpoint}/${encodeURIComponent(id)}`);
    void Promise.all([bookRequest(''), loadSpreadsheetEngine()]).then(([book, engine]) => {
      if (generation !== this.generation) return;
      title.textContent = book.name;
      this.liveData = new WorkbookLiveData(bookRequest);
      if (this.state.import_warnings?.length) {
        const notes = document.createElement('dialog');
        const heading = document.createElement('h2'); heading.textContent = 'Import notes'; notes.append(heading);
        const list = document.createElement('ul');
        for (const warning of this.state.import_warnings) { const item = document.createElement('li'); item.textContent = String(warning); list.append(item); }
        notes.append(list); button('Close', () => notes.close(), notes);
        notes.addEventListener('close', () => notes.remove(), { once: true });
        container.append(notes); notes.showModal();
        this.state.import_warnings = [];
      }
      let restoredWithPendingEdits = false;
      this.transport = new WorkbookTransport(bookRequest, book.head_sequence, message => new engine.ClientDisconnectedError(message), (state, message) => {
        if (generation !== this.generation || restoredWithPendingEdits) return;
        status.textContent = message || (state === 'saved' ? this.hasPendingEdits() ? 'Saving…' : 'All changes saved' : state === 'saving' ? 'Saving…' : 'Connection lost');
        if (state === 'denied') { this.editor?.model?.updateMode('readonly'); this.transport?.leave(); }
      }, () => {
        if (generation !== this.generation) return;
        if (!this.hasPendingEdits()) { this.redraw(); return; }
        restoredWithPendingEdits = true;
        this.editor?.model?.updateMode('readonly');
        status.textContent = 'A saved version was restored. Your unsaved edits remain here. Duplicate this workbook to preserve them before reopening.';
      });
      this.editor = this.mountChild(new SpreadsheetWorkbook(`${this.id}-editor`, {
        workbook: { ...book, workbook_snapshot: book.snapshot }, mode: book.can_edit ? 'normal' : 'readonly',
        engine_config: { transportService: this.transport, client: book.client, custom: { core3Data: this.liveData } }, revisions: book.revisions,
        on_model_ready: (model: any) => this.liveData?.attach(model),
        allow_export: book.can_export,
        export_file: async () => {
          if (this.hasPendingEdits()) throw new Error('Wait for your edits to save before downloading.');
          return workbookRequest(`${this.state.endpoint}/${encodeURIComponent(id)}`, 'bytes')('/export');
        },
      }), content);
      status.textContent = book.can_edit ? 'All changes saved' : 'View only';
      button('Refresh linked data', () => this.liveData?.refresh());
      button('Global filters', () => openWorkbookFilters(container, bookRequest, () => this.liveData?.refresh()));
      button('Browse Core3 data', async () => {
        const { openWorkbookDataBrowser } = await import('../spreadsheet/data-browser');
        if (generation === this.generation) await openWorkbookDataBrowser(container, bookRequest, book.can_edit ? formula => {
          const model = this.editor?.model;
          if (!model || generation !== this.generation) throw new Error('Workbook is no longer open');
          const result = model.dispatch('UPDATE_CELL', { ...model.getters.getActivePosition(), content: formula });
          if (!result.isSuccessful) throw new Error('The selected cell cannot be changed');
        } : undefined, book.can_edit ? cells => {
          const model = this.editor?.model;
          if (!model || generation !== this.generation) throw new Error('Workbook is no longer open');
          insertLinkedList(model, cells);
        } : undefined);
      });
      if (book.can_edit) button('Save version', () => form('Save version', [{ key: 'label', label: 'Version name' }], async values => {
        if (!this.editor?.model || this.hasPendingEdits()) throw new Error('Wait for your edits to save first.');
        await bookRequest('/checkpoint', { method: 'POST', body: JSON.stringify({ ...values, base_revision: this.editor.model.session.getRevisionId() }) });
        await this.transport?.poll();
        status.textContent = 'Version saved';
      }));
      button('Version history', async () => {
        const history = await bookRequest('/history');
        if (generation !== this.generation) return;
        const dialog = document.createElement('dialog');
        const heading = document.createElement('h2'); heading.textContent = 'Version history';
        dialog.append(heading);
        const list = document.createElement('ol');
        for (const version of history.data) {
          if (!version.verified) continue;
          const item = document.createElement('li');
          item.textContent = `${version.label} — ${new Date(version.created_at).toLocaleString()}`;
          if (book.can_manage && book.can_edit) button(`Restore ${version.label}`, async () => {
            if (!this.editor?.model || this.hasPendingEdits()) throw new Error('Wait for your edits to save first.');
            await bookRequest('/restore', { method: 'POST', body: JSON.stringify({ revision_id: version.revision_id, base_revision: this.editor.model.session.getRevisionId() }) });
            dialog.close();
            await this.transport?.poll();
          }, item);
          list.append(item);
        }
        dialog.append(list);
        button('Close', () => dialog.close(), dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        container.append(dialog); dialog.showModal();
      });
      if (book.can_create) button('Duplicate', async () => {
        if (!this.editor?.model) return;
        const model = this.editor.model;
        model.updateMode('readonly');
        try {
          const copy = await request('', { method: 'POST', body: JSON.stringify({ name: `${book.name} (copy)`, snapshot: model.exportData() }) });
          select(copy.id, true);
        } finally { if (!restoredWithPendingEdits && this.editor?.model === model) model.updateMode(book.can_edit ? 'normal' : 'readonly'); }
      });
      if (book.can_manage) {
        if (book.can_edit) button('Publish read-only link', async () => {
          if (!this.editor?.model || this.hasPendingEdits()) throw new Error('Wait for your edits to save before publishing.');
          const share = await bookRequest('/shares', { method: 'POST', body: JSON.stringify({ base_revision: this.editor.model.session.getRevisionId() }) });
          const url = new URL(window.location.href);
          if (this.state.public_route) { url.pathname = this.state.public_route; url.search = ''; }
          url.searchParams.delete('workbook_id'); url.hash = `workbook-share=${share.token}`;
          const dialog = document.createElement('dialog');
          const heading = document.createElement('h2'); heading.textContent = 'Read-only link';
          const note = document.createElement('p'); note.textContent = `Anyone with this link can view this snapshot until ${new Date(share.expires_at).toLocaleDateString()}. Later edits do not change it.`;
          const link = document.createElement('input'); link.readOnly = true; link.value = url.href; link.setAttribute('aria-label', 'Public workbook link'); link.style.width = '100%';
          dialog.append(heading, note, link);
          button('Copy link', async () => { await navigator.clipboard.writeText(link.value); }, dialog);
          button('Close', () => dialog.close(), dialog);
          dialog.addEventListener('close', () => dialog.remove(), { once: true });
          container.append(dialog); dialog.showModal(); link.select();
        });
        button('Manage public links', async () => {
          const shares = await bookRequest('/shares');
          if (generation !== this.generation) return;
          const dialog = document.createElement('dialog');
          const heading = document.createElement('h2'); heading.textContent = 'Public links'; dialog.append(heading);
          for (const share of shares.data) {
            const row = document.createElement('p');
            row.textContent = `${new Date(share.created_at).toLocaleString()} · expires ${new Date(share.expires_at).toLocaleDateString()} `;
            const revoke = button(share.revoked ? 'Revoked' : 'Revoke link', async () => {
              await bookRequest('/shares', { method: 'DELETE', body: JSON.stringify({ share_id: share.id }) });
              revoke.disabled = true; revoke.textContent = 'Revoked';
            }, row);
            revoke.disabled = share.revoked;
            dialog.append(row);
          }
          button('Close', () => dialog.close(), dialog);
          dialog.addEventListener('close', () => dialog.remove(), { once: true });
          container.append(dialog); dialog.showModal();
        });
        button('Rename', () => form('Rename spreadsheet', [{ key: 'name', label: 'Name', value: book.name }], async values => {
          const updated = await bookRequest('', { method: 'PATCH', body: JSON.stringify({ ...values, row_version: book.row_version }) });
          Object.assign(book, updated); title.textContent = book.name;
        }));
        button(book.archived ? 'Restore' : 'Archive', async () => {
          if (this.hasPendingEdits()) { status.textContent = 'Wait for your edits to save first.'; return; }
          await bookRequest('', { method: 'PATCH', body: JSON.stringify({ archived: !book.archived, row_version: book.row_version }) }); select(null);
        });
        button('Share with a colleague', () => form('Workbook access', [
          { key: 'user_id', label: 'User ID' }, { key: 'role', label: 'Access', choices: ['reader', 'editor'] },
        ], async values => { await bookRequest('/members', { method: 'POST', body: JSON.stringify(values) }); status.textContent = 'Workbook access updated'; }));
      }
    }).catch(error);
  }
}
