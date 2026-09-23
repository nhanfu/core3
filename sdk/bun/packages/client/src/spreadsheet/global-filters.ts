import type { WorkbookRequest } from './WorkbookTransport';

/** Viewer preferences; applying filters never dispatches a workbook revision. */
export async function openWorkbookFilters(container: HTMLElement, request: WorkbookRequest, applied: () => void | Promise<void>) {
  const state = await request('/filters');
  if (!container.isConnected) return;
  const dialog = document.createElement('dialog');
  const form = document.createElement('form');
  const title = document.createElement('h2'); title.textContent = 'Global filters';
  const description = document.createElement('p');
  description.textContent = 'These filters apply to linked data for your account. Leave a value blank to use the formula’s filter.';
  if (!state.fields.length) description.textContent = 'No global filters are available for your account.';
  form.append(title, description);
  for (const field of state.fields) {
    const label = document.createElement('label'); label.textContent = field.label;
    label.style.cssText = 'display:flex;flex-direction:column;margin:12px 0;min-width:250px';
    const input = field.type === 'boolean' ? document.createElement('select') : document.createElement('input');
    input.name = field.key; input.setAttribute('aria-label', field.label);
    if (input instanceof HTMLSelectElement) {
      for (const [value, text] of [['', 'Use formula filter'], ['true', 'Yes'], ['false', 'No']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option);
      }
    } else { input.type = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'; input.step = 'any'; input.maxLength = 256; }
    input.value = state.values[field.key] === undefined ? '' : String(state.values[field.key]);
    label.append(input); form.append(label);
  }
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
  const apply = document.createElement('button'); apply.type = 'submit'; apply.textContent = 'Apply filters';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel'; cancel.addEventListener('click', () => dialog.close());
  form.append(feedback, cancel);
  if (state.fields.length) form.append(apply);
  dialog.append(form); container.append(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  form.addEventListener('submit', event => {
    event.preventDefault(); apply.disabled = true;
    const entries = new FormData(form);
    const values = Object.fromEntries(state.fields.flatMap((field: any) => {
      const value = String(entries.get(field.key) ?? '');
      return value === '' ? [] : [[field.key, field.type === 'number' ? Number(value) : field.type === 'boolean' ? value === 'true' : value]];
    }));
    void request('/filters', { method: 'POST', body: JSON.stringify({ values }) }).then(async () => {
      dialog.close(); await applied();
    }).catch(error => { feedback.textContent = error.message; }).finally(() => { apply.disabled = false; });
  });
  dialog.showModal();
}
