import { readFileSync } from 'node:fs';

const baseUrl = (process.env.TMS_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const cdpUrl = process.env.TMS_CDP_URL || 'http://localhost:9222';
const email = process.env.TMS_AUDIT_EMAIL || 'admin@tms.local';
const password = process.env.TMS_AUDIT_PASSWORD || 'admin123';

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const { token } = await login.json() as { token: string };

const appSource = readFileSync(new URL('../app.ts', import.meta.url), 'utf8');
const routes = [...appSource.matchAll(/^\s*'([^']+)'\s*:/gm)]
  .map((match) => match[1])
  .filter((route) => route.startsWith('/') && route !== '/login');
const targets = [...new Set(routes)];

const pageList = await (await fetch(`${cdpUrl}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl?: string }>;
const page = pageList.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
if (!page?.webSocketDebuggerUrl) throw new Error('no CDP page found');

const socket = new WebSocket(page.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map<number, (value: any) => void>();
const consoleErrors: string[] = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    consoleErrors.push(message.params.args?.map((arg: any) => arg.value || arg.description || '').join(' ') || 'console error');
  }
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)!(message);
    pending.delete(message.id);
  }
};
await new Promise<void>((resolve, reject) => {
  socket.addEventListener('open', () => resolve(), { once: true });
  socket.addEventListener('error', () => reject(new Error('CDP connection failed')), { once: true });
});
const send = (method: string, params: Record<string, unknown> = {}) => new Promise<any>((resolve) => {
  const id = ++sequence;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression: string) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.result?.exceptionDetails) {
    const description = result.result.exceptionDetails.exception?.description || result.result.exceptionDetails.text || 'runtime evaluation failed';
    throw new Error(description);
  }
  return result.result?.result?.value;
};
const evaluateWithTimeout = async (expression: string, label: string, timeoutMs = 5000) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      evaluate(expression),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1024,
  height: 768,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluateWithTimeout(`location.href = ${JSON.stringify(`${baseUrl}/`)}`, 'initial navigation');
await new Promise((resolve) => setTimeout(resolve, 500));
await evaluateWithTimeout(`localStorage.setItem('tms_token', ${JSON.stringify(token)}); location.reload()`, 'authentication reload');
await new Promise((resolve) => setTimeout(resolve, 900));

const failures: string[] = [];
const controlCounts = { chooser: 0, tabs: 0, search: 0, editor: 0, sortable: 0, pagination: 0, pageSize: 0, reorder: 0, rowAction: 0, export: 0 };
const routeCoverage: Array<{ route: string; controls: Record<string, number> }> = [];
for (const route of targets) {
  consoleErrors.length = 0;
  try {
    await evaluateWithTimeout(`location.hash = ${JSON.stringify(`#${route}`)}`, `${route} navigation`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const exercisedJson = await evaluateWithTimeout(`(async () => {
    const outlet = document.querySelector('#outlet');
    const summaries = [...(outlet?.querySelectorAll('summary') || [])].filter((item) => /^(Columns|Cột)$/.test(item.textContent?.trim() || ''));
    summaries[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tabs = [...(outlet?.querySelectorAll('button[data-status-tab]') || [])];
    tabs.forEach((tab) => tab.click());
    const search = [...(outlet?.querySelectorAll('input[type="search"]') || [])][0];
    if (search) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(search, 'audit');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const editor = [...(outlet?.querySelectorAll('button') || [])].find((item) => /^(\\+|Thêm|Mời|Chấm|Phân|Sửa|Cập nhật)/.test(item.textContent?.trim() || ''));
    editor?.click();
    if (editor) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const sortables = [...(outlet?.querySelectorAll('button[data-sort-field]') || [])];
    sortables.forEach((button) => button.click());
    const pagination = [...(outlet?.querySelectorAll('button') || [])]
      .filter((item) => ['‹', '›'].includes(item.textContent?.trim() || '') && !item.disabled);
    pagination.forEach((button) => button.click());
    const pageSize = [...(outlet?.querySelectorAll('select') || [])]
      .find((select) => [...select.options].some((option) => ['10', '25', '50', '100'].includes(option.value)));
    if (pageSize && pageSize.options.length > 1) {
      pageSize.value = pageSize.options[pageSize.options.length - 1].value;
      pageSize.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const reorderRows = [...(outlet?.querySelectorAll('tbody tr[data-reorder-row]') || [])];
    if (reorderRows.length > 1) {
      reorderRows[0].dispatchEvent(new Event('dragstart', { bubbles: true }));
      reorderRows[1].dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    }
    const rowActions = [...(outlet?.querySelectorAll('button[data-grid-row-action]') || [])];
    const previousConfirm = window.confirm;
    const previousAlert = window.alert;
    const previousFetch = window.fetch;
    window.confirm = () => false;
    window.alert = () => {};
    window.fetch = (input, init) => {
      if (String(input).includes('/api/actions/')) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'audit mutation blocked' }), { status: 403, headers: { 'content-type': 'application/json' } }));
      }
      return previousFetch(input, init);
    };
    for (const button of rowActions) {
      button.click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    window.confirm = previousConfirm;
    window.alert = previousAlert;
    window.fetch = previousFetch;
    const exportButton = [...(outlet?.querySelectorAll('button') || [])].find((item) => /Xuất|Export|CSV|Excel/.test((item.textContent || '') + ' ' + (item.getAttribute('title') || '')));
    exportButton?.click();
    return { chooser: summaries.length, tabs: tabs.length, search: Number(Boolean(search)), editor: Number(Boolean(editor)), sortable: sortables.length, pagination: pagination.length, pageSize: Number(Boolean(pageSize)), reorder: Number(reorderRows.length > 1), rowAction: rowActions.length, export: Number(Boolean(exportButton)) };
    })()`, `${route} control exercise`);
    const exercised = typeof exercisedJson === 'string' ? JSON.parse(exercisedJson) : exercisedJson;
    for (const key of Object.keys(controlCounts) as Array<keyof typeof controlCounts>) {
      controlCounts[key] += Number(exercised?.[key] || 0);
    }
    routeCoverage.push({ route, controls: exercised || {} });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const state = await evaluateWithTimeout(`({ title: document.title, outlet: document.querySelector('#outlet')?.textContent || '', hash: location.hash, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 2 })`, `${route} state read`);
    if (!state?.outlet || /Failed to load page|Route load error/i.test(state.outlet)) {
      failures.push(`${route}: outlet did not render`);
    }
    if (state?.overflow) failures.push(`${route}: document overflows tablet viewport`);
    if (consoleErrors.length) failures.push(`${route}: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    failures.push(`${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const detailTargets = [
  { target: '/orders/detail?id=order-01', needle: 'DH-2026-0001' },
  { target: '/quotes/detail?id=quote-01', needle: 'BG-0001' },
  { target: '/accounting/documents/detail?id=acct-debit-01&kind=debit_note', needle: 'GBN-0001' },
  { target: '/hr/employees/detail?id=employee-01', needle: 'NV001' },
  { target: '/hr/contracts/detail?id=contract-05', needle: 'HD005' },
  { target: '/hr/payroll/detail?id=payroll-04', needle: 'BL202607004' },
  { target: '/vehicles/detail?id=truck-01', needle: 'CA-101-ABC' },
  { target: '/drivers/detail?id=driver-01', needle: 'VN-DL-001001' },
  { target: '/org/branches/detail?id=branch-hcm', needle: 'Ho Chi Minh City Branch' },
  { target: '/org/departments/detail?id=department-04', needle: 'HCNS' },
  { target: '/org/users/detail?id=user-admin', needle: 'admin@tms.local' },
  { target: '/org/roles/detail?id=role-admin', needle: 'Full system access' },
  { target: '/org/own-company', needle: 'ABC Transport' },
  { target: '/areas/detail?id=area-01', needle: 'Miền Nam' },
  { target: '/system/print-templates/detail?id=sys-02', needle: 'ORDER' },
  { target: '/system/approval-flows/detail?id=sys-03', needle: 'ORDER_APPROVAL' },
] as const;
const detailFailures: string[] = [];
for (const { target, needle } of detailTargets) {
  consoleErrors.length = 0;
  try {
    await evaluateWithTimeout(`location.hash = ${JSON.stringify(`#${target}`)}`, `${target} navigation`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const state = await evaluateWithTimeout(`({ outlet: document.querySelector('#outlet')?.textContent || '', hash: location.hash, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 2 })`, `${target} state read`);
    if (!state?.outlet || !state.outlet.includes(needle) || /Failed to load page|Route load error/i.test(state.outlet)) {
      detailFailures.push(`${target}: populated detail did not render`);
    }
    if (state?.overflow) detailFailures.push(`${target}: document overflows tablet viewport`);
    if (consoleErrors.length) detailFailures.push(`${target}: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    detailFailures.push(`${target}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
failures.push(...detailFailures);

const desktopFailures: string[] = [];
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
for (const route of targets) {
  consoleErrors.length = 0;
  try {
    await evaluateWithTimeout(`location.hash = ${JSON.stringify(`#${route}`)}`, `${route} desktop navigation`);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const state = await evaluateWithTimeout(`({ outlet: document.querySelector('#outlet')?.textContent || '', overflow: document.documentElement.scrollWidth > innerWidth + 2 })`, `${route} desktop state read`);
    if (!state?.outlet || /Failed to load page|Route load error/i.test(state.outlet)) desktopFailures.push(`${route}: desktop outlet did not render`);
    if (state?.overflow) desktopFailures.push(`${route}: document overflows desktop viewport`);
    if (consoleErrors.length) desktopFailures.push(`${route}: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    desktopFailures.push(`${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
failures.push(...desktopFailures);

const uiMutationFailures: string[] = [];
if (process.env.TMS_AUDIT_MUTATIONS === '1') {
  try {
    await evaluateWithTimeout("location.hash = '#/orders'", 'orders mutation navigation');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const mutationState = await evaluateWithTimeout(`(async () => {
      const previousConfirm = window.confirm;
      const previousAlert = window.alert;
      window.confirm = () => true;
      window.alert = () => {};
      const readOrder = () => [...document.querySelectorAll('#outlet tbody tr')]
        .find((row) => row.textContent?.includes('DH-2026-0001'))?.textContent || '';
      const submit = document.querySelector('button[data-grid-row-action="submit_order:order-01"]');
      submit?.click();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const pending = readOrder();
      const approve = document.querySelector('button[data-grid-row-action="approve_order:order-01"]');
      approve?.click();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const approved = readOrder();
      window.confirm = previousConfirm;
      window.alert = previousAlert;
      return { submit: Boolean(submit), approve: Boolean(approve), pending, approved };
    })()`, 'orders mutation state');
    if (!mutationState?.submit || !mutationState.pending.includes('Đang duyệt')) uiMutationFailures.push('orders UI submit did not persist Pending Approval');
    if (!mutationState?.approve || !mutationState.approved.includes('Đã duyệt')) uiMutationFailures.push('orders UI approve did not persist Approved');
    if (consoleErrors.length) uiMutationFailures.push(`orders UI mutation console errors: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    uiMutationFailures.push(`orders UI mutation: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    await evaluateWithTimeout("location.hash = '#/catalog/units'", 'units CRUD mutation navigation');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const mutationState = await evaluateWithTimeout(`(async () => {
      const code = 'UI-AUDIT-' + Date.now();
      const previousConfirm = window.confirm;
      const previousAlert = window.alert;
      window.confirm = () => true;
      window.alert = () => {};
      const findRow = () => [...document.querySelectorAll('#outlet tbody tr')].find((row) => row.textContent?.includes(code));
      const openForm = async (button: Element) => {
        (button as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        return document.querySelector('div[style*="z-index:1000"]');
      };
      const saveForm = async (dialog: Element, values: Record<string, string>) => {
        const fields = [...dialog.querySelectorAll('input, textarea, select')] as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
        for (const field of fields) {
          const key = (field.previousElementSibling?.textContent || '').replace(/\\s*\\*$/, '').trim();
          if (values[key] !== undefined) {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set;
            setter?.call(field, values[key]);
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        [...dialog.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Save')?.click();
        await new Promise((resolve) => setTimeout(resolve, 900));
      };
      const addButton = [...document.querySelectorAll('#outlet button')].find((button) => /^\\+ Thêm đơn vị/.test(button.textContent?.trim() || ''));
      if (!addButton) throw new Error('units add button not found');
      const addDialog = await openForm(addButton);
      if (!addDialog) throw new Error('units add dialog did not open');
      await saveForm(addDialog, { 'Mã': code, 'Đơn vị tính': 'UI audit unit' });
      const createdRow = findRow();
      if (!createdRow) throw new Error('units create did not persist a row');
      const editButton = createdRow.querySelector('button[data-grid-row-action^="edit_unit:"]');
      if (!editButton) throw new Error('units edit action not found');
      const editDialog = await openForm(editButton);
      if (!editDialog) throw new Error('units edit dialog did not open');
      await saveForm(editDialog, { 'Đơn vị tính': 'UI audit unit updated' });
      const editedRow = findRow();
      if (!editedRow?.textContent?.includes('UI audit unit updated')) throw new Error('units edit did not persist');
      const deleteButton = editedRow.querySelector('button[data-grid-row-action^="delete_unit:"]');
      if (!deleteButton) throw new Error('units delete action not found');
      (deleteButton as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const deleted = !findRow();
      window.confirm = previousConfirm;
      window.alert = previousAlert;
      return { created: true, edited: true, deleted };
    })()`, 'units CRUD mutation');
    if (!mutationState?.created || !mutationState?.edited || !mutationState?.deleted) uiMutationFailures.push('units UI CRUD did not persist create/edit/delete');
    if (consoleErrors.length) uiMutationFailures.push(`units UI mutation console errors: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    uiMutationFailures.push(`units UI CRUD mutation: ${error instanceof Error ? error.message : String(error)}`);
  }
}
failures.push(...uiMutationFailures);

socket.close();
console.log(`routes=${targets.length} failures=${failures.length}`);
console.log(`tablet=1024x768 details=${detailTargets.length} detail_failures=${detailFailures.length} desktop=1440x1000 desktop_failures=${desktopFailures.length} ui_mutations=${process.env.TMS_AUDIT_MUTATIONS === '1' ? 2 : 0} ui_mutation_failures=${uiMutationFailures.length}`);
console.log(`controls=${Object.entries(controlCounts).map(([key, count]) => `${key}:${count}`).join(' ')}`);
for (const { route, controls } of routeCoverage) {
  console.log(`coverage ${route} ${Object.entries(controls).map(([key, count]) => `${key}:${count}`).join(' ')}`);
}
for (const failure of failures) console.error(failure);
if (failures.length) process.exit(1);
