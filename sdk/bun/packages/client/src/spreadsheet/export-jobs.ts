import type { WorkbookRequest } from './WorkbookTransport';

export function openWorkbookExports(container: HTMLElement, request: WorkbookRequest, download: WorkbookRequest, options: { preview?: (payload: any) => Promise<void>; share?: (payload: any) => Promise<void>; autoPreviewId?: string } = {}) {
  const abort = new AbortController();
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2'); title.textContent = 'Spreadsheet exports';
  const note = document.createElement('p'); note.textContent = 'Exports and public links use the saved workbook and your data access at preparation time. You can close this window while preparation continues. Files and link retrieval expire automatically; published links keep their own expiry.';
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
  const rows = document.createElement('div');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previewing = false;
  const preview = async (id: string, kind: string) => {
    if (previewing) return;
    previewing = true;
    try {
      const payload = await request(`/exports/${encodeURIComponent(id)}?download=true`, { signal: abort.signal });
      const display = kind === 'share' ? options.share : options.preview;
      if (abort.signal.aborted || !display) return;
      await display(payload);
      dispose();
    } finally { previewing = false; }
  };
  const action = (label: string, row: HTMLElement, work: () => Promise<void>) => {
    const button = document.createElement('button'); button.textContent = label;
    button.onclick = () => {
      button.disabled = true;
      void work().catch(error => { if (!abort.signal.aborted) feedback.textContent = error.message; }).finally(() => { button.disabled = false; });
    };
    row.append(button);
  };
  const refresh = async () => {
    try {
      const result = await request('/exports', { signal: abort.signal });
      if (abort.signal.aborted) return;
      rows.replaceChildren();
      for (const job of result.data) {
        const row = document.createElement('section');
        const label = document.createElement('p'); label.textContent = `${job.name} · ${job.kind === 'share' ? 'Public link' : job.kind === 'print' ? 'Print preview' : 'XLSX'} · ${job.state}`; row.append(label);
        if (job.state === 'running') {
          const progress = document.createElement('p');
          progress.setAttribute('role', 'status');
          progress.textContent = job.stage === 'preparing' ? 'Preparing workbook and linked data' : job.stage === 'converting' ? job.kind === 'share' ? 'Publishing read-only link' : job.kind === 'print' ? 'Creating print preview' : 'Creating XLSX file' : 'Starting export';
          const pages = Number(job.data_pages_read);
          if (Number.isSafeInteger(pages) && pages > 0) progress.textContent += ` · ${pages} data ${pages === 1 ? 'page' : 'pages'} read`;
          row.append(progress);
        }
        if (job.error) { const error = document.createElement('p'); error.textContent = job.error; row.append(error); }
        if (job.state === 'completed' && (job.kind === 'print' || job.kind === 'share')) {
          if (job.kind === 'share' ? options.share : options.preview) action(`${job.kind === 'share' ? 'Show link for' : 'Preview'} ${job.name}`, row, () => preview(job.id, job.kind));
          if (job.id === options.autoPreviewId) {
            options.autoPreviewId = undefined;
            await preview(job.id, job.kind);
            if (abort.signal.aborted) return;
          }
        } else if (job.state === 'completed') action(`Download ${job.name}`, row, async () => {
          const bytes = await download(`/exports/${encodeURIComponent(job.id)}?download=true`, { signal: abort.signal });
          if (abort.signal.aborted) return;
          const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
          const link = document.createElement('a'); link.href = url; link.download = `${job.name.replace(/[^\p{L}\p{N}_-]/gu, '_')}.xlsx`;
          link.click(); URL.revokeObjectURL(url);
        });
        else if (['queued', 'running'].includes(job.state)) action(`Cancel ${job.name}`, row, async () => { await request(`/exports/${encodeURIComponent(job.id)}`, { method: 'DELETE', signal: abort.signal }); });
        rows.append(row);
      }
      if (!result.data.length) rows.textContent = 'No recent exports.';
    } catch (error: any) { if (!abort.signal.aborted) { rows.replaceChildren(); feedback.textContent = error.message; } }
    finally { if (!abort.signal.aborted) timer = setTimeout(() => { void refresh(); }, 1000); }
  };
  const dispose = () => { abort.abort(); clearTimeout(timer); dialog.close(); dialog.remove(); };
  const close = document.createElement('button'); close.textContent = 'Close'; close.onclick = dispose;
  dialog.addEventListener('close', () => { abort.abort(); clearTimeout(timer); dialog.remove(); }, { once: true });
  dialog.append(title, note, feedback, rows, close); container.append(dialog); dialog.showModal();
  void refresh();
  return dispose;
}
