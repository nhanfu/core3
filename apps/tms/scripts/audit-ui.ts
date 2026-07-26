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
    const state = await evaluateWithTimeout(`({ title: document.title, outlet: document.querySelector('#outlet')?.textContent || '', hash: location.hash })`, `${route} state read`);
    if (!state?.outlet || /Failed to load page|Route load error/i.test(state.outlet)) {
      failures.push(`${route}: outlet did not render`);
    }
    if (consoleErrors.length) failures.push(`${route}: ${consoleErrors.join(' | ')}`);
  } catch (error) {
    failures.push(`${route}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

socket.close();
console.log(`routes=${targets.length} failures=${failures.length}`);
console.log(`controls=${Object.entries(controlCounts).map(([key, count]) => `${key}:${count}`).join(' ')}`);
for (const { route, controls } of routeCoverage) {
  console.log(`coverage ${route} ${Object.entries(controls).map(([key, count]) => `${key}:${count}`).join(' ')}`);
}
for (const failure of failures) console.error(failure);
if (failures.length) process.exit(1);
