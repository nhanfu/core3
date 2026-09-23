import type { WorkbookRequest } from './WorkbookTransport';

/** References do not copy document content or grant access to either resource. */
export function openWorkbookDocuments(container: HTMLElement, request: WorkbookRequest, options: { route: string; canLink: boolean; canManage: boolean }) {
  const abort = new AbortController();
  const dialog = document.createElement('dialog'); dialog.style.cssText = 'width:600px;max-width:90vw';
  const title = document.createElement('h2'); title.textContent = 'Linked documents';
  const note = document.createElement('p'); note.textContent = 'Linking does not change who can access this workbook or its documents.';
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
  const links = document.createElement('div');
  const candidates = document.createElement('div');
  const button = (label: string, target: HTMLElement, action: () => void | Promise<void>) => {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
    node.onclick = () => {
      node.disabled = true; feedback.textContent = '';
      void Promise.resolve().then(action).catch(error => { if (!abort.signal.aborted) feedback.textContent = error.message; }).finally(() => { node.disabled = false; });
    };
    target.append(node); return node;
  };
  const call: WorkbookRequest = (path, init) => request(path, { ...init, signal: abort.signal });
  const refresh = async () => {
    links.replaceChildren();
    const result = await call('/documents');
    if (abort.signal.aborted) return;
    links.replaceChildren();
    if (!result.data.length) { const empty = document.createElement('p'); empty.textContent = 'No linked documents.'; links.append(empty); }
    for (const document of result.data) {
      const row = window.document.createElement('p');
      const label = window.document.createElement(document.available ? 'a' : 'span'); label.textContent = document.name;
      if (label instanceof HTMLAnchorElement) label.href = `${options.route}?document_id=${encodeURIComponent(document.id)}`;
      row.append(label);
      if (options.canManage) button(`Unlink ${document.name}`, row, async () => {
        await call('/documents', { method: 'DELETE', body: JSON.stringify({ document_id: document.id }) }); await refresh();
      });
      links.append(row);
    }
  };
  dialog.append(title, note, feedback, links);
  if (options.canLink) {
    const search = document.createElement('input'); search.setAttribute('aria-label', 'Search documents'); search.placeholder = 'Search documents'; search.maxLength = 256;
    dialog.append(search);
    button('Find documents', dialog, async () => {
      candidates.replaceChildren();
      const result = await call(`/documents?candidates=true&q=${encodeURIComponent(search.value)}`);
      if (abort.signal.aborted) return;
      if (!result.data.length) { const empty = document.createElement('p'); empty.textContent = 'No available documents match this search.'; candidates.append(empty); }
      for (const document of result.data) {
        const row = window.document.createElement('p');
        button(`Link ${document.name}`, row, async () => { await call('/documents', { method: 'POST', body: JSON.stringify({ document_id: document.id }) }); await refresh(); });
        candidates.append(row);
      }
    });
    dialog.append(candidates);
  }
  button('Close', dialog, () => dialog.close());
  const dispose = () => { abort.abort(); if (dialog.open) dialog.close(); dialog.remove(); };
  dialog.addEventListener('close', dispose, { once: true });
  container.append(dialog); dialog.showModal();
  void refresh().catch(error => { if (!abort.signal.aborted) feedback.textContent = error.message; });
  return dispose;
}
