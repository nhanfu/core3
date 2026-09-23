import type { WorkbookRequest } from './WorkbookTransport';
import { workbookStringLiteral } from './string-literal';

/** Per-viewer datasource inspection; rows never enter the shared revision log. */
export async function openWorkbookDataBrowser(container: HTMLElement, request: WorkbookRequest, insert?: (formula: string) => void, insertList?: (cells: string[][]) => void) {
  const catalog = await request('/sources');
  const dialog = document.createElement('dialog');
  dialog.style.cssText = 'width:min(1000px,90vw);max-height:85vh;overflow:auto';
  const heading = document.createElement('h2'); heading.textContent = 'Core3 data';
  const description = document.createElement('p'); description.textContent = 'Read-only data available to your account. Refresh retrieves current records.' + (insert ? ' Click a value to link it to the active cell.' : '');
  if (insertList) description.textContent += ' Insert linked list adds this page and column headings at the active cell. The list keeps the same number of rows.';
  const form = document.createElement('form');
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Data source');
  for (const source of catalog.data) { const option = document.createElement('option'); option.value = source.key; option.textContent = source.label; select.append(option); }
  const fields = document.createElement('div'); fields.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';
  const refresh = document.createElement('button'); refresh.type = 'submit'; refresh.textContent = 'Refresh data';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const table = document.createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse';
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = 'Previous records'; previous.disabled = true;
  const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Next records'; next.disabled = true;
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.addEventListener('click', () => dialog.close());
  const list = document.createElement('button'); list.type = 'button'; list.textContent = 'Insert linked list'; list.disabled = true;
  let linkedCells: string[][] = [];
  list.addEventListener('click', () => {
    try { insertList?.(linkedCells); dialog.close(); }
    catch (error: any) { status.textContent = error.message; }
  });
  form.append(select, fields, refresh); dialog.append(heading, description, form, status, table, previous, next, close);
  if (insertList) dialog.append(list);
  let skip = 0, generation = 0;
  let pending: AbortController | undefined;
  const source = () => catalog.data.find((item: any) => item.key === select.value);
  const reset = () => {
    list.disabled = true; linkedCells = [];
    generation++; pending?.abort(); skip = 0; table.replaceChildren(); fields.replaceChildren(); previous.disabled = next.disabled = true;
    for (const [name, field] of Object.entries(source()?.filters || {}) as Array<[string, any]>) {
      const label = document.createElement('label'); label.textContent = field.label; label.style.cssText = 'display:flex;flex-direction:column';
      const input = document.createElement('input'); input.name = name; input.setAttribute('aria-label', field.label);
      input.type = field.type === 'boolean' ? 'checkbox' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'; input.required = !!field.required;
      label.append(input); fields.append(label);
    }
    refresh.disabled = !source(); status.textContent = source() ? 'Choose filters and refresh.' : 'No data sources are available to your account.';
  };
  const query = async (offset: number) => {
    if (!form.reportValidity()) return;
    const selected = source(); if (!selected) return;
    const filters: Record<string, any> = {};
    for (const input of fields.querySelectorAll('input')) {
      if (input.type === 'checkbox') filters[input.name] = input.checked;
      else if (input.value !== '') filters[input.name] = input.type === 'number' ? Number(input.value) : input.value;
    }
    const current = ++generation;
    list.disabled = true; linkedCells = [];
    pending?.abort(); pending = new AbortController();
    refresh.disabled = previous.disabled = next.disabled = true; table.replaceChildren(); status.textContent = 'Loading data…';
    try {
      const result = await request('/data', { method: 'POST', signal: pending.signal, body: JSON.stringify({ source: selected.key, filters, skip: offset, top: Math.min(50, selected.max_rows) }) });
      if (current !== generation || !dialog.open) return;
      skip = offset;
      const quote = workbookStringLiteral;
      linkedCells = [result.columns.map((column: any) => `=${quote(column.label)}`), ...result.data.map((_row: any, index: number) => result.columns.map((column: any) => `=CORE3.VALUE(${quote(selected.key)},${quote(column.field)},${skip + index + 1},${quote(JSON.stringify(filters))})`))];
      list.disabled = !result.data.length;
      const header = table.createTHead().insertRow();
      for (const column of result.columns) { const cell = document.createElement('th'); cell.textContent = column.label; cell.style.textAlign = 'left'; header.append(cell); }
      const body = table.createTBody();
      for (const [index, row] of result.data.entries()) {
        const tr = body.insertRow();
        for (const column of result.columns) {
          const cell = tr.insertCell(); cell.style.cssText = 'padding:8px;border-top:1px solid #ddd';
          const value = String(row[column.field] ?? '');
          if (insert) {
            const link = document.createElement('button'); link.type = 'button'; link.textContent = value || '(empty)'; link.title = 'Insert linked value at the active cell';
            link.addEventListener('click', () => {
              const quote = workbookStringLiteral;
              try { insert(`=CORE3.VALUE(${quote(selected.key)},${quote(column.field)},${skip + index + 1},${quote(JSON.stringify(filters))})`); dialog.close(); }
              catch (error: any) { status.textContent = error.message; }
            });
            cell.append(link);
          } else cell.textContent = value;
        }
      }
      status.textContent = result.data.length ? `Records ${skip + 1}–${skip + result.data.length}. Refreshed ${new Date(result.refreshed_at).toLocaleTimeString()}.` : 'No records match these filters.';
      previous.disabled = skip === 0; next.disabled = result.data.length < result.top;
    } catch (error: any) { if (current === generation && dialog.open) status.textContent = error.message; }
    finally { if (current === generation) refresh.disabled = false; }
  };
  select.addEventListener('change', reset);
  fields.addEventListener('input', () => { generation++; pending?.abort(); skip = 0; table.replaceChildren(); previous.disabled = next.disabled = list.disabled = true; linkedCells = []; refresh.disabled = false; status.textContent = 'Filters changed. Refresh to load matching records.'; });
  form.addEventListener('submit', event => { event.preventDefault(); void query(0); });
  previous.addEventListener('click', () => { void query(Math.max(0, skip - Math.min(50, source().max_rows))); });
  next.addEventListener('click', () => { void query(skip + Math.min(50, source().max_rows)); });
  dialog.addEventListener('close', () => { generation++; pending?.abort(); dialog.remove(); }, { once: true });
  reset(); container.append(dialog); dialog.showModal();
}
