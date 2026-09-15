import type { WorkbookRequest } from './WorkbookTransport';

export function openWorkbookExports(container: HTMLElement, request: WorkbookRequest, download: WorkbookRequest) {
  const abort = new AbortController();
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2'); title.textContent = 'Spreadsheet exports';
  const note = document.createElement('p'); note.textContent = 'Exports use the saved workbook and your data access at preparation time. Files expire automatically. You can close this window while a file is prepared.';
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
  const rows = document.createElement('div');
  let timer: ReturnType<typeof setTimeout> | undefined;
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
        const label = document.createElement('p'); label.textContent = `${job.name} · ${job.state}`; row.append(label);
        if (job.error) { const error = document.createElement('p'); error.textContent = job.error; row.append(error); }
        if (job.state === 'completed') action(`Download ${job.name}`, row, async () => {
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
