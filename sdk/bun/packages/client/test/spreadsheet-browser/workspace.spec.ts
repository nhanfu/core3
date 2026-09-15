import { expect, test } from '@playwright/test';

test('creates a chart from live formula cells and refreshes its values without storing them', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { (window as any).chartErrors = []; window.addEventListener('error', event => (window as any).chartErrors.push(String(event.error?.cause?.stack || event.error?.stack))); });
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const formula = (field: string, row: number) => `=CORE3.VALUE("fixture","${field}",${row},"{}")`;
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Live chart', snapshot: {
    sheets: [{ id: 's', name: 'Sales', colNumber: 26, rowNumber: 100, cells: { A1: 'Customer', B1: 'Amount', A2: formula('name', 1), B2: formula('amount', 1), A3: formula('name', 2), B3: formula('amount', 2) } }],
  } } })).json();
  const endpoint = `/api/spreadsheet/workbooks/${book.id}`;
  let amount = 42;
  const columns = [{ field: 'name', label: 'Customer' }, { field: 'amount', label: 'Amount' }];
  await page.route(`**/workbooks/${book.id}/sources`, route => route.fulfill({ json: { data: [{ key: 'fixture', label: 'Customers', max_rows: 50, columns, filters: {} }] } }));
  await page.route(`**/workbooks/${book.id}/data`, route => route.fulfill({ json: { columns, data: [{ name: 'Private first', amount }, { name: 'Private second', amount: 99 }], top: 50, refreshed_at: new Date().toISOString() } }));
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 's', col: 1, row: 1 }).value)).toBe(42);
  await page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.selection.selectZone({ cell: { col: 0, row: 0 }, zone: { left: 0, right: 1, top: 0, bottom: 2 } }));
  await page.getByText('Insert', { exact: true }).click();
  await page.getByText('Chart', { exact: true }).click();
  const chart = () => page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    const chartId = model.getters.getChartIds('s')[0];
    return chartId ? model.getters.getChartRuntime(chartId).chartJsConfig.data : null;
  });
  await expect.poll(async () => (await chart())?.datasets[0].data).toEqual([42, 99]);
  await expect.poll(async () => (await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(1);
  const saved = await (await page.request.get(endpoint, { headers })).json();
  expect(JSON.stringify(saved.revisions)).not.toContain('Private first');
  amount = 73;
  await page.getByRole('button', { name: 'Refresh linked data', exact: true }).click();
  await expect.poll(async () => (await chart())?.datasets[0].data).toEqual([73, 99]);
  expect((await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(1);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(async () => (await chart())?.datasets[0].data).toEqual([73, 99]);
  await page.screenshot({ path: 'test-results/spreadsheet-live-chart.png', fullPage: true });
  expect(await page.evaluate(() => (window as any).chartErrors)).toEqual([]);
  await expect(page.locator('.o-spreadsheet')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('inserts a linked list as one durable formula revision and undoes it together', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Linked list' } })).json();
  const endpoint = `/api/spreadsheet/workbooks/${book.id}`;
  const columns = [{ field: 'name', label: 'Customer' }, { field: 'amount', label: 'Amount' }];
  await page.route(`**/workbooks/${book.id}/sources`, route => route.fulfill({ json: { data: [{ key: 'fixture', label: 'Customers', max_rows: 50, columns, filters: {} }] } }));
  await page.route(`**/workbooks/${book.id}/data`, route => route.fulfill({ json: { columns, data: [{ name: 'Private first', amount: 42 }, { name: 'Private second', amount: 99 }], top: 50, refreshed_at: new Date().toISOString() } }));
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Browse Core3 data', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Insert linked list', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await dialog.getByRole('button', { name: 'Insert linked list', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const values = () => page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    const sheetId = model.getters.getActiveSheetId();
    return [0, 1, 2].map(row => [0, 1].map(col => model.getters.getEvaluatedCell({ sheetId, col, row }).value));
  });
  await expect.poll(values).toEqual([['Customer', 'Amount'], ['Private first', 42], ['Private second', 99]]);
  await expect.poll(async () => (await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(1);
  const saved = await (await page.request.get(endpoint, { headers })).json();
  expect(JSON.stringify(saved.revisions)).not.toContain('Private first');
  expect(JSON.stringify(saved.revisions)).toContain('CORE3.VALUE');
  await page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.dispatch('REQUEST_UNDO'));
  await expect.poll(values).toEqual([[null, null], [null, null], [null, null]]);
  await page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.dispatch('REQUEST_REDO'));
  await expect.poll(values).toEqual([['Customer', 'Amount'], ['Private first', 42], ['Private second', 99]]);
  await expect.poll(async () => (await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(3);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(values).toEqual([['Customer', 'Amount'], ['Private first', 42], ['Private second', 99]]);
  await page.getByRole('button', { name: 'Browse Core3 data', exact: true }).click();
  await dialog.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await dialog.getByRole('button', { name: 'Insert linked list', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Choose an empty range for the linked list');
  expect((await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(3);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
});

test('saves viewer global filters from the editor and reloads them in a linked dashboard', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Filtered report' } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Global filters', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search', { exact: true }).fill('Customer "A"');
  await dialog.getByLabel('From date', { exact: true }).fill('2026-01-01');
  await page.screenshot({ path: 'test-results/spreadsheet-global-filters.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto(`/?dashboard=true&linked_id=${book.id}`);
  await expect(page.getByRole('status')).toHaveText('View only');
  await page.getByRole('button', { name: 'Global filters', exact: true }).click();
  await expect(dialog.getByLabel('Search', { exact: true })).toHaveValue('Customer "A"');
  await expect(dialog.getByLabel('From date', { exact: true })).toHaveValue('2026-01-01');
  await dialog.getByLabel('Search', { exact: true }).fill('');
  await dialog.getByLabel('From date', { exact: true }).fill('');
  await dialog.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('View only');
  const endpoint = `/api/spreadsheet/workbooks/${book.id}`;
  expect((await (await page.request.get(`${endpoint}/filters`, { headers })).json()).values).toEqual({});
  expect((await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(0);
});

test('loads a library workbook in a dashboard and clears it after access is revoked', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'reader'));
  const owner = { Authorization: 'Bearer owner' };
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers: owner, data: {
    name: 'Linked dashboard', snapshot: { sheets: [{ id: 's', name: 'Sales', colNumber: 26, rowNumber: 100, cells: { A1: '42', B1: '=A1+1' } }] },
  } })).json();
  const endpoint = `/api/spreadsheet/workbooks/${book.id}`;
  await page.goto(`/?dashboard=true&linked_id=${book.id}`);
  await expect(page.getByRole('status')).toHaveText('Workbook unavailable');
  await expect(page.locator('.o-spreadsheet')).toHaveCount(0);
  await page.request.post(`${endpoint}/members`, { headers: owner, data: { user_id: 'reader', role: 'reader' } });
  await page.getByRole('button', { name: 'Refresh dashboard', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('View only');
  await expect(page.getByRole('link', { name: 'Open workbook', exact: true })).toHaveAttribute('href', `/spreadsheet/workbooks?workbook_id=${book.id}`);
  expect(await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.model;
    return model.getters.getEvaluatedCell({ sheetId: 's', col: 1, row: 0 }).value;
  })).toBe(43);
  await page.request.delete(`${endpoint}/members`, { headers: owner, data: { user_id: 'reader' } });
  await page.getByRole('button', { name: 'Refresh dashboard', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Workbook unavailable');
  await expect(page.locator('.o-spreadsheet')).toHaveCount(0);
});
import { strFromU8, unzipSync } from 'fflate';

test('creates through the UI, saves to the server, collaborates across browsers, and reopens', async ({ browser, page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  await page.goto('/?workspace=true');
  await page.getByRole('button', { name: 'New spreadsheet', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Durable browser workbook');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Durable browser workbook', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  const id = new URL(page.url()).searchParams.get('workbook_id')!;
  await page.getByRole('button', { name: 'Share with a colleague' }).click();
  await page.getByLabel('User ID').fill('editor');
  await page.getByLabel('Access', { exact: true }).selectOption('editor');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const otherContext = await browser.newContext();
  await otherContext.addInitScript(() => localStorage.setItem('core3_token', 'editor'));
  const other = await otherContext.newPage();
  other.on('pageerror', error => errors.push(error.message));
  try {
    await other.goto(`http://127.0.0.1:4319/?workspace=true&workbook_id=${id}`);
    await expect(other.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    await page.locator('.o-grid-overlay').click({ position: { x: 80, y: 12 } });
    await page.keyboard.type('40'); await page.keyboard.press('Enter');
    const cell = (tab: typeof page, column: number, row: number) => tab.evaluate(({ column, row }) => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col: column, row }).value;
    }, { column, row });
    await expect.poll(() => cell(other, 0, 0)).toBe(40);
    // Independent clients may submit against the same head; neither edit may disappear.
    await Promise.all([page, other].map((tab, index) => tab.evaluate(index => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      const result = model.dispatch('UPDATE_CELL', { sheetId: model.getters.getActiveSheetId(), col: index + 1, row: 0, content: index ? '=A1+2' : '=A1+1' });
      if (!result.isSuccessful) throw new Error('Edit refused');
    }, index)));
    for (const tab of [page, other]) {
      await expect.poll(() => cell(tab, 1, 0)).toBe(41);
      await expect.poll(() => cell(tab, 2, 0)).toBe(42);
      await expect.poll(() => tab.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.session.isFullySynchronized())).toBe(true);
    }
    await page.getByRole('button', { name: 'Save version', exact: true }).click();
    await page.getByLabel('Version name', { exact: true }).fill('Approved forecast');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const checkpoint = await (await page.request.get(`/api/spreadsheet/workbooks/${id}`, { headers: { Authorization: 'Bearer owner' } })).json();
    for (const tab of [page, other]) {
      await expect.poll(() => tab.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.session.getRevisionId())).toBe(checkpoint.head_revision_id);
    }
    await page.getByRole('button', { name: 'Version history', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Approved forecast');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await other.evaluate(() => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      model.dispatch('UPDATE_CELL', { sheetId: model.getters.getActiveSheetId(), col: 3, row: 0, content: '=B1+C1' });
    });
    await expect.poll(() => cell(page, 3, 0)).toBe(83);
    await page.reload();
    await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    expect(await cell(page, 0, 0)).toBe(40);
    expect(await cell(page, 1, 0)).toBe(41);
    expect(await cell(page, 2, 0)).toBe(42);
    expect(await cell(page, 3, 0)).toBe(83);
    await page.screenshot({ path: 'test-results/spreadsheet-workspace.png', fullPage: true });
    const revoke = await page.request.delete(`/api/spreadsheet/workbooks/${id}/members`, { headers: { Authorization: 'Bearer owner' }, data: { user_id: 'editor' } });
    expect(revoke.status()).toBe(200);
    await expect(other.getByRole('status').filter({ hasText: 'Workbook unavailable' })).toBeVisible();
    expect(await other.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.isReadonly())).toBe(true);
    expect(errors).toEqual([]);
  } finally { await otherContext.close(); }
});

test('keeps disconnected edits pending and saves them after reconnecting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const created = await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Reconnect workbook' } });
  const book = await created.json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.context().setOffline(true);
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('UPDATE_CELL', { sheetId: model.getters.getActiveSheetId(), col: 0, row: 0, content: '123' });
  });
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.session.isFullySynchronized())).toBe(false);
  await page.context().setOffline(false);
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.session.isFullySynchronized()), { timeout: 15_000 }).toBe(true);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  expect(await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col: 0, row: 0 }).value;
  })).toBe(123);
});

test('restores a saved version and preserves an offline collaborator through a recovery copy', async ({ browser, page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const created = await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Restore recovery' } });
  const book = await created.json();
  await page.request.post(`/api/spreadsheet/workbooks/${book.id}/members`, { headers: { Authorization: 'Bearer owner' }, data: { user_id: 'editor', role: 'editor' } });
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Save version', exact: true }).click();
  await page.getByLabel('Version name').fill('Empty baseline');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('core3_token', 'editor'));
  const other = await context.newPage();
  try {
    await other.goto(`http://127.0.0.1:4319/?workspace=true&workbook_id=${book.id}`);
    await expect(other.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    await context.setOffline(true);
    await other.evaluate(() => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      model.dispatch('UPDATE_CELL', { sheetId: model.getters.getActiveSheetId(), col: 0, row: 0, content: '123' });
    });
    await page.getByRole('button', { name: 'Version history', exact: true }).click();
    await page.getByRole('button', { name: 'Restore Empty baseline', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    await context.setOffline(false);
    await expect(other.getByRole('status').filter({ hasText: 'Your unsaved edits remain here' })).toBeVisible();
    await other.getByRole('button', { name: 'Duplicate', exact: true }).click();
    await expect(other.getByRole('heading', { name: 'Restore recovery (copy)', exact: true })).toBeVisible();
    await expect(other.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    expect(new URL(other.url()).searchParams.get('workbook_id')).not.toBe(book.id);
    await other.reload();
    await expect(other.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    expect(await other.evaluate(() => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col: 0, row: 0 }).value;
    })).toBe(123);
    const original = await (await page.request.get(`/api/spreadsheet/workbooks/${book.id}`, { headers: { Authorization: 'Bearer owner' } })).json();
    expect(original.snapshot.sheets[0].cells.A1).toBeUndefined();
  } finally { await context.close(); }
});

test('downloads committed XLSX and imports it through the library', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const created = await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Roundtrip workbook', snapshot: { sheets: [{ id: 's', name: 'Forecast', rowNumber: 100, colNumber: 26, cells: { A1: '40', B1: '=A1+2' } }] } } });
  const book = await created.json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download XLSX', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  expect(strFromU8(unzipSync(bytes)['xl/worksheets/sheet0.xml'])).toContain('A1+2');
  await page.getByRole('button', { name: 'All spreadsheets', exact: true }).click();
  await page.getByLabel('Import XLSX file', { exact: true }).setInputFiles({ name: 'Imported forecast.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: bytes });
  await expect(page.getByRole('heading', { name: 'Imported forecast', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('workbook_id')).not.toBe(book.id);
  expect(await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col: 1, row: 0 }).value;
  })).toBe(42);
});

test('publishes a frozen workbook for an anonymous viewer and revokes the link', async ({ browser, page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const created = await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Public forecast', snapshot: { sheets: [{ id: 's', name: 'Sheet1', rowNumber: 100, colNumber: 26, cells: { A1: '=40+2', B1: '="001"' } }] } } });
  const book = await created.json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Publish read-only link', exact: true }).click();
  const link = await page.getByLabel('Public workbook link', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const context = await browser.newContext();
  const viewer = await context.newPage();
  try {
    await viewer.goto(link);
    await expect(viewer.getByRole('status').filter({ hasText: /^View only$/ })).toBeVisible();
    const value = (col: number) => viewer.evaluate(col => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col, row: 0 }).value;
    }, col);
    expect(await value(0)).toBe(42);
    expect(await value(1)).toBe('001');
    const bootstrap = await context.newPage();
    await bootstrap.goto(`/public-bootstrap.html${new URL(link).hash}`);
    await expect(bootstrap.getByRole('heading', { name: 'Public forecast', exact: true })).toBeVisible();
    await expect(bootstrap.getByRole('status').filter({ hasText: /^View only$/ })).toBeVisible();
    expect(new URL(bootstrap.url()).pathname).toBe('/spreadsheet/shared');
    await bootstrap.close();
    await page.evaluate(() => {
      const model = (window as any).spreadsheetTest.component.children[0].model;
      model.dispatch('UPDATE_CELL', { sheetId: 's', col: 0, row: 0, content: '99' });
    });
    await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.session.isFullySynchronized())).toBe(true);
    await viewer.reload();
    await expect(viewer.getByRole('status').filter({ hasText: /^View only$/ })).toBeVisible();
    expect(await value(0)).toBe(42);
    await page.getByRole('button', { name: 'Manage public links', exact: true }).click();
    await page.getByRole('button', { name: 'Revoke link', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Revoked', exact: true })).toBeDisabled();
    await viewer.reload();
    await expect(viewer.getByRole('status')).toHaveText('Share unavailable');
  } finally { await context.close(); }
});

test('browses authorized datasource rows and clears stale rows when refresh is denied', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const created = await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Data browser workbook' } });
  const book = await created.json();
  const columns = [{ field: 'name', label: 'Customer' }, { field: 'amount', label: 'Amount' }];
  await page.route(`**/workbooks/${book.id}/sources`, route => route.fulfill({ json: { data: [{ key: 'fixture', label: 'Test data source', max_rows: 50, columns, filters: { from_date: { label: 'From date', type: 'date', required: true } } }] } }));
  let amount = 42, denied = false;
  await page.route(`**/workbooks/${book.id}/data`, async route => {
    expect(route.request().postDataJSON()).toMatchObject({ source: 'fixture', filters: { from_date: '2026-09-01' }, skip: 0, top: 50 });
    await route.fulfill(denied ? { status: 403, json: { error: 'Datasource access revoked', code: 'FORBIDDEN' } } : { json: { columns, data: [{ name: 'Current customer', amount }], skip: 0, top: 50, refreshed_at: new Date().toISOString() } });
  });
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Browse Core3 data', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('From date').fill('2026-09-01');
  await dialog.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await expect(dialog.getByRole('cell', { name: '42', exact: true })).toBeVisible();
  amount = 73;
  await dialog.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await expect(dialog.getByRole('cell', { name: '73', exact: true })).toBeVisible();
  denied = true;
  await dialog.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Datasource access revoked');
  await expect(dialog.getByRole('cell')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  expect((await (await page.request.get(`/api/spreadsheet/workbooks/${book.id}`, { headers: { Authorization: 'Bearer owner' } })).json()).head_sequence).toBe(0);
});

test('stores a linked formula while collaborators evaluate only their own authorized results', async ({ browser, page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const created = await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Viewer-specific formula' } });
  const book = await created.json();
  await page.request.post(`/api/spreadsheet/workbooks/${book.id}/members`, { headers: { Authorization: 'Bearer owner' }, data: { user_id: 'editor', role: 'reader' } });
  const columns = [{ field: 'amount', label: 'Amount' }];
  const search = 'A "quoted" customer\\';
  let amount = 42, denied = false;
  const routes = async (tab: typeof page, value: () => number) => {
    await tab.route(`**/workbooks/${book.id}/sources`, route => route.fulfill({ json: { data: [{ key: 'fixture', label: 'Current account data', max_rows: 50, columns, filters: { q: { label: 'Search', type: 'text' } } }] } }));
    await tab.route(`**/workbooks/${book.id}/data`, route => {
      expect(route.request().postDataJSON().filters).toEqual({ q: search });
      return route.fulfill(denied ? { status: 403, json: { error: 'Datasource access revoked' } } : { json: { columns, data: [{ amount: value() }], skip: 0, top: 50, refreshed_at: new Date().toISOString() } });
    });
  };
  await routes(page, () => amount);
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Browse Core3 data', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search', { exact: true }).fill(search);
  await dialog.getByRole('button', { name: 'Refresh data', exact: true }).click();
  await dialog.getByRole('button', { name: '42', exact: true }).click();
  const cell = (tab: typeof page, col = 0) => tab.evaluate(col => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    return model.getters.getEvaluatedCell({ sheetId: model.getters.getActiveSheetId(), col, row: 0 }).value;
  }, col);
  await expect.poll(() => cell(page)).toBe(42);
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('UPDATE_CELL', { sheetId: model.getters.getActiveSheetId(), col: 1, row: 0, content: '=A1+1' });
  });
  await expect.poll(() => cell(page, 1)).toBe(43);
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.session.isFullySynchronized())).toBe(true);
  const stored = await (await page.request.get(`/api/spreadsheet/workbooks/${book.id}`, { headers: { Authorization: 'Bearer owner' } })).json();
  expect(stored.revisions[0].commands[0].content).toContain('=CORE3.VALUE("fixture","amount",1,');
  expect(stored.revisions[0].commands[0].content).toContain('CHAR(34)');
  expect(JSON.stringify(stored.revisions)).not.toContain('"value":42');
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('core3_token', 'editor'));
  const other = await context.newPage();
  try {
    await routes(other, () => 99);
    await other.goto(`http://127.0.0.1:4319/?workspace=true&workbook_id=${book.id}`);
    await expect(other.getByLabel('Spreadsheet', { exact: true }).getByRole('status')).toHaveText('View only');
    await expect.poll(() => cell(other)).toBe(99);
    await expect.poll(() => cell(other, 1)).toBe(100);
    expect(await cell(page)).toBe(42);
    amount = 73;
    await page.getByRole('button', { name: 'Refresh linked data', exact: true }).click();
    await expect.poll(() => cell(page)).toBe(73);
    await expect.poll(() => cell(page, 1)).toBe(74);
    expect(await cell(other)).toBe(99);
    denied = true;
    await page.getByRole('button', { name: 'Refresh linked data', exact: true }).click();
    await expect.poll(() => cell(page)).toBe('#N/A');
    expect((await (await page.request.get(`/api/spreadsheet/workbooks/${book.id}`, { headers: { Authorization: 'Bearer owner' } })).json()).head_sequence).toBe(2);
  } finally { await context.close(); }
});
