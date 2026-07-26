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
  return result.result?.result?.value;
};

await send('Runtime.enable');
await evaluate(`localStorage.setItem('tms_token', ${JSON.stringify(token)}); location.href = ${JSON.stringify(`${baseUrl}/`)}`);
await new Promise((resolve) => setTimeout(resolve, 900));

const failures: string[] = [];
for (const route of targets) {
  consoleErrors.length = 0;
  await evaluate(`location.hash = ${JSON.stringify(`#${route}`)}`);
  await new Promise((resolve) => setTimeout(resolve, 650));
  await evaluate(`(() => {
    const outlet = document.querySelector('#outlet');
    const summaries = [...(outlet?.querySelectorAll('summary') || [])].filter((item) => /^(Columns|Cột)$/.test(item.textContent?.trim() || ''));
    summaries[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tabs = [...(outlet?.querySelectorAll('button') || [])].filter((item) => /^(Tất cả|Sẵn sàng|Bảo dưỡng|Hoạt động|Đang dùng|Nháp)$/.test(item.textContent?.trim() || ''));
    tabs[0]?.click();
    const search = [...(outlet?.querySelectorAll('input[type="search"]') || [])][0];
    if (search) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(search, 'audit');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const editor = [...(outlet?.querySelectorAll('button') || [])].find((item) => /^(\+|Thêm|Mời|Chấm|Phân|Sửa|Cập nhật)/.test(item.textContent?.trim() || ''));
    editor?.click();
    if (editor) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return { chooser: summaries.length, tabs: tabs.length, search: Boolean(search), editor: Boolean(editor) };
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const state = await evaluate(`({ title: document.title, outlet: document.querySelector('#outlet')?.textContent || '', hash: location.hash })`);
  if (!state?.outlet || /Failed to load page|Route load error/i.test(state.outlet)) {
    failures.push(`${route}: outlet did not render`);
  }
  if (consoleErrors.length) failures.push(`${route}: ${consoleErrors.join(' | ')}`);
}

socket.close();
console.log(`routes=${targets.length} failures=${failures.length}`);
for (const failure of failures) console.error(failure);
if (failures.length) process.exit(1);
