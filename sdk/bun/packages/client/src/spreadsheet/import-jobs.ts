import type { WorkbookRequest } from './WorkbookTransport';

export function openWorkbookImports(container: HTMLElement, request: WorkbookRequest, open: (id: string, warnings: string[]) => void) {
  const abort = new AbortController();
  const dialog = document.createElement('dialog');
  const title = document.createElement('h2'); title.textContent = 'Spreadsheet imports';
  const note = document.createElement('p'); note.textContent = 'Imports continue when you close this window. Return here to open the result or cancel an unfinished import.';
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
  const rows = document.createElement('div');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = async () => {
    try {
      const result = await request('/imports', { signal: abort.signal });
      if (abort.signal.aborted) return;
      rows.replaceChildren(); feedback.textContent = '';
      for (const job of result.data) {
        const row = document.createElement('section');
        const label = document.createElement('p'); label.textContent = `${job.name} · ${job.state}`; row.append(label);
        if (job.error) { const error = document.createElement('p'); error.textContent = job.error; row.append(error); }
        if (job.state === 'completed') {
          const button = document.createElement('button'); button.textContent = `Open ${job.name}`;
          button.onclick = () => { dispose(); open(job.workbook_id, job.warnings); }; row.append(button);
        } else if (['queued', 'running'].includes(job.state)) {
          const button = document.createElement('button'); button.textContent = `Cancel ${job.name}`;
          button.onclick = () => {
            button.disabled = true;
            void request(`/imports/${encodeURIComponent(job.id)}`, { method: 'DELETE', signal: abort.signal }).catch(error => { if (!abort.signal.aborted) feedback.textContent = error.message; }).finally(() => { button.disabled = false; });
          };
          row.append(button);
        }
        rows.append(row);
      }
      if (!result.data.length) rows.textContent = 'No recent imports.';
    } catch (error: any) {
      if (!abort.signal.aborted) { rows.replaceChildren(); feedback.textContent = error.message; }
    } finally {
      if (!abort.signal.aborted) timer = setTimeout(() => { void refresh(); }, 1000);
    }
  };
  const dispose = () => { abort.abort(); clearTimeout(timer); dialog.close(); dialog.remove(); };
  const close = document.createElement('button'); close.textContent = 'Close'; close.onclick = dispose;
  dialog.addEventListener('close', () => { abort.abort(); clearTimeout(timer); dialog.remove(); }, { once: true });
  dialog.append(title, note, feedback, rows, close); container.append(dialog); dialog.showModal();
  void refresh();
  return dispose;
}
