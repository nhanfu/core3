import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('response', response => {
  if (response.status() >= 400) console.log('HTTP', response.status(), response.url());
});
await page.goto('http://localhost:8069/web/login?db=core3_owned', { waitUntil: 'domcontentloaded' });
console.log('login', await page.url(), await page.title());
const login = page.locator('input[name="login"]');
if (await login.count()) {
  await login.fill('codex@core3.local');
  await page.locator('input[name="password"]').fill('Core3Odoo2026!');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2500);
}
console.log('after login', await page.url(), await page.title());
console.log('buttons', await page.locator('button').evaluateAll(nodes => nodes.slice(0, 40).map(node => ({ text: node.innerText, title: node.title, aria: node.getAttribute('aria-label'), cls: node.className }))));
console.log('links', await page.locator('a').evaluateAll(nodes => nodes.slice(0, 80).map(node => ({ text: node.innerText, href: node.getAttribute('href'), aria: node.getAttribute('aria-label'), title: node.title }))));
await page.goto('http://localhost:8069/odoo/point-of-sale', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2600);
console.log('pos', await page.url(), await page.title());
console.log((await page.locator('body').innerText()).slice(0, 9000));
console.log('pos links', await page.locator('a').evaluateAll(nodes => nodes.filter(node => node.offsetParent !== null).map(node => ({ text: node.innerText, href: node.getAttribute('href') })).slice(0, 160)));
console.log('products matches', await page.getByText('Products', { exact: true }).evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, cls: node.className, role: node.getAttribute('role') }))));
await page.getByText('Products', { exact: true }).click();
await page.waitForTimeout(500);
console.log('products menu', (await page.locator('body').innerText()).slice(0, 7000));
console.log('visible product tags', await page.getByText('Product Tags', { exact: true }).evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, cls: node.className, href: node.closest('a')?.getAttribute('href'), parent: node.parentElement?.outerHTML.slice(0, 500) }))));
const menuRpc = await page.evaluate(async () => {
  const response = await fetch('/web/dataset/call_kw/ir.ui.menu/search_read', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {
      model: 'ir.ui.menu', method: 'search_read', args: [[]],
      kwargs: { fields: ['id', 'name', 'parent_id', 'action', 'sequence', 'active'], limit: 2000 }
    }})
  });
  return await response.json();
});
console.log('pos tag menus', (menuRpc.result || []).filter(menu => /tag/i.test(menu.name) || /Point of Sale/.test(menu.parent_id?.[1] || '')).map(menu => ({ id: menu.id, name: menu.name, parent: menu.parent_id, action: menu.action, sequence: menu.sequence })));
console.log((await page.locator('body').innerText()).slice(0, 8000));
await page.screenshot({ path: '/tmp/odoo-pos-product-tags-preimplementation-dashboard-desktop.png', fullPage: false });
await browser.close();
