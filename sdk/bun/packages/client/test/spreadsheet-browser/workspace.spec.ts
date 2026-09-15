import { expect, test } from '@playwright/test';

test('reorders dashboard groups with touch and ignores cancelled gestures', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 900 } });
  try {
    await context.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
    const page = await context.newPage();
    await page.goto('/?configuration=groups');
    const rows = page.locator('tr.o-list-data-row');
    await expect(rows.first()).toBeVisible();
    const before = await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')));
    const handle = rows.first().getByRole('button', { name: 'Reorder row; Alt+Arrow keys to move' });
    const origin = (await handle.boundingBox())!, destination = (await rows.last().boundingBox())!;
    const client = await context.newCDPSession(page);
    const start = { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 };
    const end = { x: start.x, y: destination.y + destination.height / 2 };
    let mutations = 0;
    page.on('request', request => { if (request.url().endsWith('/api/mutate')) mutations++; });
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    expect(mutations).toBe(0);
    expect(await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')))).toEqual(before);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')))).toEqual([...before.slice(1), before[0]]);
    await page.reload();
    await expect(rows.last()).toHaveAttribute('data-row-id', before[0]!);
  } finally { await context.close(); }
});

test('keeps a rejected reorder unchanged and suppresses overlapping gestures', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  await page.goto('/?configuration=groups');
  const rows = page.locator('tr.o-list-data-row');
  await expect(rows.first()).toBeVisible();
  const before = await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')));
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  await page.route('**/api/mutate', async route => {
    calls++;
    await pending;
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'The group list changed. Reload before reordering.', code: 'SPREADSHEET_DASHBOARD_GROUP_ORDER_STALE' }) });
  });
  try {
    const handle = rows.first().getByRole('button', { name: 'Reorder row; Alt+Arrow keys to move' });
    await handle.press('Alt+ArrowDown');
    await expect.poll(() => calls).toBe(1);
    await handle.press('Alt+ArrowDown');
    expect(calls).toBe(1);
    release();
    await expect(page.getByRole('status')).toContainText('The group list changed. Reload before reordering.');
    expect(await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')))).toEqual(before);
    await page.unroute('**/api/mutate');
    await handle.press('Alt+ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('data-row-id', before[0]!);
  } finally { release(); }
});

test('drags dashboards within their notebook group and retains the order', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const group = await (await page.request.post('/api/actions/spreadsheet.dashboard.groups.create', { headers, data: { values: { name: 'Nested reorder group' } } })).json();
  for (const name of ['First report', 'Second report', 'Third report']) {
    expect((await page.request.post('/api/actions/spreadsheet.dashboard.create', { headers, data: { group_id: group.id, values: { name } } })).ok()).toBe(true);
  }
  await page.goto(`/?configuration=true&id=${group.id}`);
  const rows = page.getByRole('tabpanel', { name: 'Spreadsheets' }).locator('tr.o-list-data-row');
  await expect(rows).toHaveCount(3);
  const before = await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')));
  await rows.first().getByRole('button', { name: 'Reorder row; Alt+Arrow keys to move' }).dragTo(rows.last());
  await expect.poll(() => rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')))).toEqual([...before.slice(1), before[0]]);
  await page.reload();
  await expect(rows.last()).toHaveAttribute('data-row-id', before[0]!);
  await rows.last().getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(rows.last().getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);
});

test('drags dashboard groups and reorders them with the keyboard', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('core3_token')) localStorage.setItem('core3_token', 'owner'); });
  await page.goto('/?configuration=groups');
  const rows = page.locator('tr.o-list-data-row');
  await expect(rows.first()).toBeVisible();
  const before = await rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')));
  const first = rows.first(), last = rows.last();
  await first.getByRole('button', { name: 'Reorder row; Alt+Arrow keys to move' }).dragTo(last);
  await expect.poll(() => rows.evaluateAll(elements => elements.map(element => element.getAttribute('data-row-id')))).toEqual([...before.slice(1), before[0]]);
  await page.reload();
  await expect(rows.last()).toHaveAttribute('data-row-id', before[0]!);
  await rows.last().getByRole('button', { name: 'Reorder row; Alt+Arrow keys to move' }).press('Alt+ArrowUp');
  await expect(rows.nth(before.length - 2)).toHaveAttribute('data-row-id', before[0]!);
  await page.evaluate(() => localStorage.setItem('core3_token', 'editor'));
  await page.reload();
  await expect(rows.first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reorder row; Alt+Arrow keys to move' })).toHaveCount(0);
});

test('renames a dashboard group inline while preserving its notebook list', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const group = await (await page.request.post('/api/actions/spreadsheet.dashboard.groups.create', { headers, data: { values: { name: 'Group before rename' } } })).json();
  await page.request.post('/api/actions/spreadsheet.dashboard.create', { headers, data: { group_id: group.id, values: { name: 'Retained dashboard' } } });
  await page.goto(`/?configuration=true&id=${group.id}`);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Group after rename');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Group after rename', exact: true })).toBeVisible();
  const row = page.getByRole('tabpanel', { name: 'Spreadsheets' }).getByRole('row').filter({ hasText: 'Retained dashboard' });
  await expect(row).toContainText('Group after rename');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Group after rename', exact: true })).toBeVisible();
  await expect(row).toBeVisible();
  await page.getByRole('button', { name: 'Display order', exact: true }).click();
  const orderDialog = page.getByRole('dialog', { name: 'Group display order' });
  await orderDialog.getByRole('spinbutton', { name: 'Display order *', exact: true }).fill('0');
  await orderDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(orderDialog).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Display order', exact: true }).click();
  await expect(orderDialog.getByRole('spinbutton', { name: 'Display order *', exact: true })).toHaveValue('0');
  await orderDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('creates a custom dashboard group and retains it in the configuration list', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  await page.goto('/?configuration=groups');
  await page.getByRole('button', { name: 'New', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Group name *', exact: true }).fill('Browser planning group');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Browser planning group' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: 'Browser planning group' })).toBeVisible();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Group name *', exact: true }).fill('Browser planning group');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('A dashboard group with this name already exists in this company.');
  await dialog.getByRole('textbox', { name: 'Group name *', exact: true }).fill('Browser corrected group');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Browser corrected group' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Browser planning group' })).toHaveCount(1);
});

for (const width of [1440, 390]) test(`publishes archives and restores a dashboard through YAML row controls at ${width}px`, async ({ page, browser }) => {
  await page.setViewportSize({ width, height: 900 });
  const name = `Lifecycle browser dashboard ${width}`;
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  await page.goto('/?configuration=true&id=sdg-sales');
  await page.getByRole('button', { name: 'Add Dashboard', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name *', exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const row = page.getByRole('tabpanel', { name: 'Spreadsheets' }).getByRole('row').filter({ hasText: name });
  await expect(row.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Restore', exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Archive', exact: true })).toHaveCount(0);
  await row.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
  await page.reload();
  await expect(row.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/spreadsheet-dashboard-lifecycle-${width}.png`, fullPage: true });
  const editorContext = await browser.newContext();
  try {
    await editorContext.addInitScript(() => localStorage.setItem('core3_token', 'editor'));
    const editor = await editorContext.newPage();
    await editor.goto(page.url());
    const editorRow = editor.getByRole('row').filter({ hasText: name });
    await expect(editorRow).toBeVisible();
    await expect(editorRow.getByRole('button', { name: /^(Publish|Archive|Restore)$/ })).toHaveCount(0);
  } finally { await editorContext.close(); }
});

test('publishes and withdraws company templates while keeping recipient copies private', async ({ page, browser }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const source = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Shared template source', snapshot: { sheets: [{ id: 's', name: 'Sheet1', colNumber: 26, rowNumber: 100, cells: { A1: '21', B1: '=A1*2' } }] } } })).json();
  const saved = await (await page.request.post(`/api/spreadsheet/workbooks/${source.id}/template`, { headers, data: { name: 'Company planning template', base_revision: 'START_REVISION' } })).json();
  const recipientContext = await browser.newContext();
  try {
    await recipientContext.addInitScript(() => localStorage.setItem('core3_token', 'editor'));
    const recipient = await recipientContext.newPage();
    await page.goto('/?workspace=true');
    const libraryUrl = page.url();
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publish to company: Company planning template', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Withdraw Company planning template', exact: true })).toBeVisible();
    await recipient.goto(libraryUrl);
    await recipient.getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(recipient.getByRole('dialog').getByRole('button', { name: 'Edit Company planning template', exact: true })).toHaveCount(0);
    await expect(recipient.getByRole('dialog').getByRole('button', { name: 'Withdraw Company planning template', exact: true })).toHaveCount(0);
    await recipient.getByRole('dialog').getByRole('button', { name: 'Company planning template', exact: true }).click();
    await recipient.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Recipient private plan');
    await recipient.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await expect(recipient.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    const copyUrl = recipient.url();
    await expect.poll(() => recipient.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 's', col: 1, row: 0 }).value)).toBe(42);
    await page.getByRole('dialog').getByRole('button', { name: 'Withdraw Company planning template', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Publish to company: Company planning template', exact: true })).toBeVisible();
    await recipient.getByRole('button', { name: 'All spreadsheets', exact: true }).click();
    await recipient.getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(recipient.getByRole('dialog').getByRole('button', { name: 'Company planning template', exact: true })).toHaveCount(0);
    expect((await recipient.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer editor' }, data: { name: 'Withdrawn copy', template_id: saved.id } })).status()).toBe(404);
    await recipient.goto(copyUrl);
    await expect(recipient.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
    await expect.poll(() => recipient.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 's', col: 1, row: 0 }).value)).toBe(42);
  } finally { await recipientContext.close(); }
});

test('links a document, opens its filtered workbook library and removes the reference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Document-linked budget' } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Linked documents', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('No linked documents.', { exact: true })).toBeVisible();
  await dialog.getByLabel('Search documents').fill('Budget');
  await dialog.getByRole('button', { name: 'Find documents', exact: true }).click();
  await dialog.getByRole('button', { name: 'Link Budget approval document', exact: true }).click();
  await expect(dialog.getByRole('link', { name: 'Budget approval document' })).toHaveAttribute('href', '/documents?document_id=fixture-document');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.goto('/?workspace=true&document_id=fixture-document');
  await expect(page.getByRole('heading', { name: 'Spreadsheets · Budget approval document', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New spreadsheet', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Document-linked budget', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Linked documents', exact: true }).click();
  await dialog.getByRole('button', { name: 'Unlink Budget approval document', exact: true }).click();
  await expect(dialog.getByText('No linked documents.', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Document spreadsheets', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('No spreadsheets yet.');
  await page.getByRole('button', { name: 'All spreadsheets', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Document-linked budget', exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/spreadsheet/workbooks/${book.id}`, { headers })).json()).head_sequence).toBe(0);
});

test('prints charts and embedded images at workbook positions and clips selected ranges', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Figures report', snapshot: { sheets: [{ id: 's', name: 'Sales', colNumber: 26, rowNumber: 100, cells: { A1: 'Customer', B1: 'Amount', A2: 'First', B2: '42', A3: 'Second', B3: '99' } }] } } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('CREATE_CHART', { sheetId: 's', chartId: 'print-chart', figureId: 'print-chart-figure', col: 3, row: 1, offset: { x: 8, y: 4 }, size: { width: 320, height: 180 }, definition: { type: 'bar', dataSets: [{ dataRange: 'B1:B3' }], labelRange: 'A2:A3', dataSetsHaveTitle: true, title: { text: 'Amounts' }, legendPosition: 'none' } });
    const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 40;
    const context = canvas.getContext('2d')!; context.fillStyle = '#0066cc'; context.fillRect(0, 0, 80, 40);
    model.dispatch('CREATE_IMAGE', { sheetId: 's', figureId: 'print-image', col: 1, row: 12, offset: { x: 6, y: 4 }, size: { width: 80, height: 40 }, definition: { path: canvas.toDataURL(), mimetype: 'image/png', size: { width: 80, height: 40 } } });
  });
  await expect(page.getByRole('status').filter({ hasText: /^All changes saved$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const preview = page.frameLocator('iframe[title="Workbook print preview"]');
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await expect(preview.getByAltText('Workbook chart')).toBeVisible();
  await expect(preview.getByAltText('Workbook image')).toBeVisible();
  expect(await preview.getByAltText('Workbook chart').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const expected = await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    return model.getters.getFigureUI('s', model.getters.getFigure('s', 'print-chart-figure'));
  });
  await expect(preview.getByAltText('Workbook chart')).toHaveCSS('left', `${expected.x}px`);
  await expect(preview.getByAltText('Workbook chart')).toHaveCSS('top', `${expected.y}px`);
  await page.screenshot({ path: 'test-results/spreadsheet-print-figures.png', fullPage: true });
  const printable = await page.context().newPage();
  await printable.setContent(await preview.locator('html').evaluate(node => node.outerHTML));
  const pdf = await printable.pdf({ path: 'test-results/spreadsheet-print-figures.pdf', preferCSSPageSize: true });
  expect(pdf.toString('latin1').match(/\/Subtype\s*\/Image\b/g)!.length).toBeGreaterThanOrEqual(2);
  await printable.close();
  await dialog.getByLabel('Print range', { exact: true }).fill('A1:B4');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(preview.locator('img')).toHaveCount(0);
  await dialog.getByLabel('Print range', { exact: true }).fill('D2:E6');
  // Print applies edited settings even when Update preview was not clicked.
  await preview.locator('body').evaluate(() => { window.print = () => {}; });
  await dialog.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  await expect(preview.getByAltText('Workbook chart')).toHaveCSS('left', '8px');
  await expect(preview.getByAltText('Workbook chart')).toHaveCSS('top', '4px');
  await expect(preview.locator('section')).toHaveCSS('overflow', 'clip');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await page.route(`**/workbooks/${book.id}/print`, async route => {
    const response = await route.fetch();
    await route.fulfill({ json: { ...await response.json(), max_figure_pixels: 1 } });
  });
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Figures exceed the print size limit. Select a smaller range or resize the figures.');
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
});

test('prints computed conditional fills and outer borders of merged cells', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Formatted print', snapshot: { sheets: [{ id: 's', name: 'Budget', colNumber: 26, rowNumber: 100, cells: { A1: 'Bordered total', A3: '=40+2', B3: 'Adjacent' } }] } } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('ADD_MERGE', { sheetId: 's', target: [{ left: 0, right: 1, top: 0, bottom: 1 }] });
    for (const [position, style, color] of [['top', 'thick', '#ff0000'], ['bottom', 'medium', '#0000ff'], ['left', 'dashed', '#008000'], ['right', 'dotted', '#800080']]) {
      model.dispatch('SET_ZONE_BORDERS', { sheetId: 's', target: [{ left: 0, right: 1, top: 0, bottom: 1 }], border: { position, style, color } });
    }
    model.dispatch('SET_BORDER', { sheetId: 's', col: 0, row: 2, border: { right: { style: 'dashed', color: '#ff8000' } } });
    model.dispatch('ADD_CONDITIONAL_FORMAT', { sheetId: 's', cf: { id: 'print-positive', rule: { type: 'CellIsRule', operator: 'isGreaterThan', values: ['10'], style: { fillColor: '#ffff00', textColor: '#008000', bold: true } } }, ranges: [model.getters.getRangeDataFromXc('s', 'A3')] });
  });
  await expect(page.getByRole('status').filter({ hasText: /^All changes saved$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const preview = page.frameLocator('iframe[title="Workbook print preview"]');
  const merged = preview.locator('td').filter({ hasText: 'Bordered total' });
  await expect(merged).toHaveAttribute('colspan', '2'); await expect(merged).toHaveAttribute('rowspan', '2');
  await expect(merged).toHaveCSS('border-top-width', '3px'); await expect(merged).toHaveCSS('border-top-color', 'rgb(255, 0, 0)');
  await expect(merged).toHaveCSS('border-bottom-width', '2px'); await expect(merged).toHaveCSS('border-bottom-color', 'rgb(0, 0, 255)');
  await expect(merged).toHaveCSS('border-left-style', 'dashed'); await expect(merged).toHaveCSS('border-right-style', 'dotted');
  const total = preview.getByText('42', { exact: true });
  await expect(total).toHaveCSS('background-color', 'rgb(255, 255, 0)'); await expect(total).toHaveCSS('color', 'rgb(0, 128, 0)'); await expect(total).toHaveCSS('font-weight', '700');
  await expect(total).toHaveCSS('border-right-style', 'dashed');
  await expect(preview.getByText('Adjacent', { exact: true })).toHaveCSS('border-left-style', 'dashed');
  const geometry = await preview.locator('table').evaluate(table => ({ tableRight: table.getBoundingClientRect().right, rangeRight: table.parentElement!.getBoundingClientRect().right }));
  expect(geometry.tableRight).toBeLessThanOrEqual(geometry.rangeRight + 0.1);
  await page.screenshot({ path: 'test-results/spreadsheet-print-computed-format.png', fullPage: true });
});

test('repeats merged header rows on every PDF page without duplicating body rows', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const cells: Record<string, string> = { A1: 'Repeated budget heading', B2: 'Amount' };
  for (let row = 3; row <= 200; row++) cells[`A${row}`] = `Expense ${row}`;
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Paged ledger', snapshot: { sheets: [{ id: 's', name: 'Budget', colNumber: 26, rowNumber: 300, cells }] } } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('ADD_MERGE', { sheetId: 's', target: [{ left: 0, right: 0, top: 0, bottom: 1 }] });
    model.dispatch('RESIZE_COLUMNS_ROWS', { sheetId: 's', dimension: 'COL', elements: [0], size: 240 });
    model.dispatch('HIDE_COLUMNS_ROWS', { sheetId: 's', dimension: 'ROW', elements: [2] });
  });
  await expect(page.getByRole('status').filter({ hasText: /^All changes saved$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const dialog = page.getByRole('dialog'), preview = page.frameLocator('iframe[title="Workbook print preview"]');
  await dialog.getByLabel('Repeat header rows', { exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('A merged cell crosses the repeated header boundary. Adjust the header row count.');
  await dialog.getByLabel('Repeat header rows', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  await expect(preview.locator('thead tr')).toHaveCount(2);
  await expect(preview.locator('thead td').filter({ hasText: 'Repeated budget heading' })).toHaveAttribute('rowspan', '2');
  await page.screenshot({ path: 'test-results/spreadsheet-print-header-controls.png', fullPage: true });
  const printable = await page.context().newPage();
  try {
    await printable.setContent(await preview.locator('html').evaluate(node => node.outerHTML));
    const bytes = await printable.pdf({ path: 'test-results/spreadsheet-print-repeated-headers.pdf', preferCSSPageSize: true });
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
    const pdf = await task.promise;
    try {
      expect(pdf.numPages).toBeGreaterThan(2);
      const allText: string[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const content = await (await pdf.getPage(number)).getTextContent();
        const text = content.items.map(item => 'str' in item ? item.str : '').join(' ');
        expect(text.split('Repeated budget heading')).toHaveLength(2);
        allText.push(text);
      }
      const bodyRows = [...allText.join(' ').matchAll(/Expense\s+(\d+)/g)].map(match => Number(match[1]));
      expect(bodyRows).toEqual(Array.from({ length: 197 }, (_, index) => index + 4));
    } finally { await task.destroy(); }
  } finally { await printable.close(); }
  await dialog.getByLabel('Repeat header rows', { exact: true }).fill('21');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Choose between 0 and 20 repeated header rows.');
  await dialog.getByLabel('Repeat header rows', { exact: true }).fill('15');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Repeated headers must fit within one quarter of the printable page height.');
});

test('applies configured paper sizes and margins to the preview and generated PDF', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Page setup budget', snapshot: { sheets: [{ id: 's', name: 'Budget', colNumber: 26, rowNumber: 100, cells: { A1: 'Wide budget', Z40: 'Last item' } }] } } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const preview = page.frameLocator('iframe[title="Workbook print preview"]');
  await expect(dialog.getByLabel('Paper size', { exact: true })).toHaveValue('a4');
  await expect(dialog.getByLabel('Print margins (mm)', { exact: true })).toHaveValue('12');
  await dialog.getByLabel('Paper size', { exact: true }).selectOption('letter');
  await dialog.getByLabel('Paper orientation', { exact: true }).selectOption('landscape');
  await dialog.getByLabel('Print margins (mm)', { exact: true }).fill('25');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
  const sizing = await preview.locator('main').evaluate(node => ({ zoom: Number((node as HTMLElement).style.zoom), width: parseFloat(node.querySelector('table')!.style.width) }));
  expect(sizing.zoom).toBeCloseTo(((279.4 - 50) * 96 / 25.4) / sizing.width, 5);
  expect(await preview.locator('head style').evaluate(node => ((node as HTMLStyleElement).sheet!.cssRules[0] as CSSPageRule).style.margin)).toBe('25mm');
  const printable = await page.context().newPage();
  try {
    await printable.setContent(await preview.locator('html').evaluate(node => node.outerHTML));
    const letter = await printable.pdf({ path: 'test-results/spreadsheet-print-letter-landscape.pdf', preferCSSPageSize: true });
    const size = letter.toString('latin1').match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/)!;
    expect(Number(size[1])).toBeCloseTo(792, 0); expect(Number(size[2])).toBeCloseTo(612, 0);
    await dialog.getByLabel('Paper size', { exact: true }).selectOption('legal');
    await dialog.getByLabel('Paper orientation', { exact: true }).selectOption('portrait');
    await printable.setContent(await preview.locator('html').evaluate(node => node.outerHTML));
    const legal = await printable.pdf({ path: 'test-results/spreadsheet-print-legal-portrait.pdf', preferCSSPageSize: true });
    const legalSize = legal.toString('latin1').match(/\/MediaBox\s*\[0 0 ([\d.]+) ([\d.]+)\]/)!;
    expect(Number(legalSize[1])).toBeCloseTo(612, 0); expect(Number(legalSize[2])).toBeCloseTo(1008, 0);
  } finally { await printable.close(); }
  await page.screenshot({ path: 'test-results/spreadsheet-print-page-setup.png', fullPage: true });
  await dialog.getByLabel('Print margins (mm)', { exact: true }).fill('51');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Enter margins between 0 and 50 mm.');
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await dialog.getByLabel('Print margins (mm)', { exact: true }).fill('0');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled();
});

test('prints a formatted range from committed values with a separate paginated document', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const cells: Record<string, string> = { A1: 'Budget <img src=x>', B2: '=40+2' };
  for (let row = 3; row <= 200; row++) cells[`A${row}`] = `Expense ${row}`;
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Printable budget', snapshot: { sheets: [{ id: 's', name: 'Budget', colNumber: 26, rowNumber: 300, cells }] } } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('ADD_MERGE', { sheetId: 's', target: [{ left: 0, right: 1, top: 0, bottom: 0 }] });
    model.dispatch('SET_FORMATTING', { sheetId: 's', target: [{ left: 0, right: 0, top: 0, bottom: 0 }], style: { bold: true, fillColor: '#ffeeaa' } });
    model.dispatch('SET_FORMATTING', { sheetId: 's', target: [{ left: 1, right: 1, top: 1, bottom: 1 }], format: '#,##0.00' });
    model.dispatch('HIDE_COLUMNS_ROWS', { sheetId: 's', dimension: 'ROW', elements: [2] });
    model.dispatch('CREATE_SHEET', { sheetId: 'notes', name: 'Notes', position: 1 });
    model.dispatch('UPDATE_CELL', { sheetId: 'notes', col: 0, row: 0, content: 'Saved notes' });
    model.dispatch('CREATE_SHEET', { sheetId: 'hidden', name: 'Hidden', position: 2 });
    model.dispatch('UPDATE_CELL', { sheetId: 'hidden', col: 0, row: 0, content: 'Hidden notes' });
    model.dispatch('HIDE_SHEET', { sheetId: 'hidden' });
  });
  await expect(page.getByRole('status').filter({ hasText: /^All changes saved$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const preview = page.frameLocator('iframe[title="Workbook print preview"]');
  await expect(preview.locator('td').filter({ hasText: 'Budget <img src=x>' })).toHaveAttribute('colspan', '2');
  await expect(preview.locator('td').filter({ hasText: 'Budget <img src=x>' })).toHaveCSS('font-weight', '700');
  await expect(preview.locator('td').filter({ hasText: 'Budget <img src=x>' })).toHaveCSS('background-color', 'rgb(255, 238, 170)');
  await expect(preview.getByText('42.00', { exact: true })).toBeVisible();
  await expect(preview.getByText('Expense 3', { exact: true })).toHaveCount(0);
  await expect(preview.locator('img')).toHaveCount(0);
  const html = await preview.locator('html').evaluate(node => node.outerHTML);
  const printable = await page.context().newPage();
  await printable.setContent(html);
  const pdf = await printable.pdf({ path: 'test-results/spreadsheet-print.pdf', preferCSSPageSize: true });
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)!.length).toBeGreaterThan(1);
  await printable.close();
  await dialog.getByLabel('Print range', { exact: true }).fill('A1:B4');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(preview.locator('tr')).toHaveCount(3);
  await dialog.getByLabel('Paper orientation').selectOption('landscape');
  await page.screenshot({ path: 'test-results/spreadsheet-print-preview.png', fullPage: true });
  await preview.locator('body').evaluate(() => { (window as any).printed = false; window.print = () => { (window as any).printed = true; }; });
  await dialog.getByRole('button', { name: 'Print / Save PDF', exact: true }).click();
  expect(await preview.locator('body').evaluate(() => (window as any).printed)).toBe(true);
  await dialog.getByLabel('Print sheet').selectOption('');
  await expect(dialog.getByLabel('Print range')).toBeDisabled();
  await expect(preview.locator('main')).toHaveCount(2);
  await expect(preview.getByText('Saved notes', { exact: true })).toHaveCount(1);
  await expect(preview.getByText('Hidden notes', { exact: true })).toHaveCount(0);
  await expect(preview.locator('main').nth(1)).toHaveCSS('break-before', 'page');
  const whole = await page.context().newPage();
  await whole.setContent(await preview.locator('html').evaluate(node => node.outerHTML));
  const allPdf = await whole.pdf({ path: 'test-results/spreadsheet-print-all.pdf', preferCSSPageSize: true });
  expect(allPdf.toString('latin1').match(/\/Type\s*\/Page\b/g)!.length).toBeGreaterThan(1);
  await whole.close();
  await dialog.getByLabel('Print sheet').selectOption('s');
  await dialog.getByLabel('Print range', { exact: true }).fill('Z1:AA4');
  await dialog.getByRole('button', { name: 'Update preview', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('The range must be within the selected sheet.');
  await expect(dialog.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('groups live formula values in a pivot and refreshes without storing business rows', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const headers = { Authorization: 'Bearer owner' };
  const formula = (field: string, row: number) => `=CORE3.VALUE("fixture","${field}",${row},"{}")`;
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers, data: { name: 'Live pivot', snapshot: {
    sheets: [{ id: 's', name: 'Sales', colNumber: 26, rowNumber: 100, cells: { A1: 'Customer', B1: 'Amount', A2: formula('name', 1), B2: formula('amount', 1), A3: formula('name', 2), B3: formula('amount', 2) } }],
  } } })).json();
  const endpoint = `/api/spreadsheet/workbooks/${book.id}`;
  let amount = 42;
  let denied = false;
  const columns = [{ field: 'name', label: 'Customer' }, { field: 'amount', label: 'Amount' }];
  await page.route(`**/workbooks/${book.id}/sources`, route => route.fulfill({ json: { data: [{ key: 'fixture', label: 'Customers', max_rows: 50, columns, filters: {} }] } }));
  await page.route(`**/workbooks/${book.id}/data`, route => denied ? route.fulfill({ status: 403, json: { error: 'Source access revoked' } }) : route.fulfill({ json: { columns, data: [{ name: 'Private customer', amount }, { name: 'Private customer', amount: 99 }], top: 50 } }));
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 's', col: 1, row: 1 }).value)).toBe(42);
  await page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.selection.selectZone({ cell: { col: 0, row: 0 }, zone: { left: 0, right: 1, top: 0, bottom: 2 } }));
  await page.getByText('Insert', { exact: true }).click();
  await page.getByText('Pivot table', { exact: true }).click();
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    const pivotId = model.getters.getPivotIds()[0];
    const pivot = { ...model.getters.getPivotCoreDefinition(pivotId), rows: [{ fieldName: 'Customer' }], measures: [{ id: 'Amount:sum', fieldName: 'Amount', aggregator: 'sum' }] };
    if (!model.dispatch('UPDATE_PIVOT', { pivotId, pivot }).isSuccessful) throw new Error('Cannot configure pivot');
    model.dispatch('UPDATE_CELL', { sheetId: 's', col: 3, row: 0, content: '=PIVOT.VALUE(1,"Amount:sum")' });
  });
  const total = () => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 's', col: 3, row: 0 }).value);
  await expect.poll(total).toBe(141);
  await expect(page.getByRole('status').filter({ hasText: /^All changes saved$/ })).toBeVisible();
  const before = await (await page.request.get(endpoint, { headers })).json();
  expect(JSON.stringify(before)).not.toContain('Private customer');
  amount = 73;
  await page.getByRole('button', { name: 'Refresh linked data', exact: true }).click();
  await expect.poll(total).toBe(172);
  expect((await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(before.head_sequence);
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(total).toBe(172);
  await page.getByText('Pivot #1', { exact: true }).click();
  await page.screenshot({ path: 'test-results/spreadsheet-live-pivot.png', fullPage: true });
  denied = true;
  await page.getByRole('button', { name: 'Refresh linked data', exact: true }).click();
  await expect.poll(total).toBe('#N/A');
  expect((await (await page.request.get(endpoint, { headers })).json()).head_sequence).toBe(before.head_sequence);
});

test('creates, saves, reuses and deletes a private workbook template', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  await page.goto('/?workspace=true');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Budget planner', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Quarterly budget');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.evaluate(() => {
    const model = (window as any).spreadsheetTest.component.children[0].model;
    model.dispatch('UPDATE_CELL', { sheetId: 'sheet-1', col: 1, row: 1, content: '100' });
    model.dispatch('UPDATE_CELL', { sheetId: 'sheet-1', col: 2, row: 1, content: '35' });
  });
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 'sheet-1', col: 3, row: 5 }).value)).toBe(65);
  await expect(page.getByRole('status').filter({ hasText: /^All changes saved$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component?.children[0]?.model?.getters.getEvaluatedCell({ sheetId: 'sheet-1', col: 3, row: 5 }).value)).toBe(65);
  await page.getByRole('button', { name: 'Save as template', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Reusable quarterly budget');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'All spreadsheets', exact: true }).click();
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Edit Reusable quarterly budget', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Updated quarterly budget');
  await page.getByRole('dialog').getByLabel('Description', { exact: true }).fill('Planning for next quarter');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Planning for next quarter', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Updated quarterly budget', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Budget copy');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  const copyUrl = page.url();
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 'sheet-1', col: 3, row: 5 }).value)).toBe(65);
  await page.getByRole('button', { name: 'All spreadsheets', exact: true }).click();
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete Updated quarterly budget', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Updated quarterly budget', exact: true })).toHaveCount(0);
  await page.goto(copyUrl);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.getters.getEvaluatedCell({ sheetId: 'sheet-1', col: 3, row: 5 }).value)).toBe(65);
});

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

test('prepares a durable XLSX export and downloads its saved revision after reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('core3_token', 'owner'));
  const book = await (await page.request.post('/api/spreadsheet/workbooks', { headers: { Authorization: 'Bearer owner' }, data: { name: 'Queued export forecast', snapshot: { sheets: [{ id: 's', name: 'Forecast', rowNumber: 100, colNumber: 26, cells: { A1: '40', B1: '=A1+2' } }] } } })).json();
  await page.goto(`/?workspace=true&workbook_id=${book.id}`);
  await expect(page.getByRole('status').filter({ hasText: /^Ready$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare XLSX', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Spreadsheet exports', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(() => (window as any).spreadsheetTest.component.children[0].model.dispatch('UPDATE_CELL', { sheetId: 's', col: 0, row: 0, content: '99' }));
  await expect.poll(async () => (await (await page.request.get(`/api/spreadsheet/workbooks/${book.id}`, { headers: { Authorization: 'Bearer owner' } })).json()).head_sequence).toBe(1);
  await page.goto('/?workspace=true');
  await page.getByRole('button', { name: 'Export activity', exact: true }).click();
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: 'Download Queued export forecast', exact: true }).click();
  const downloaded = await pendingDownload;
  const chunks: Buffer[] = [];
  for await (const chunk of (await downloaded.createReadStream())!) chunks.push(chunk);
  const sheet = strFromU8(unzipSync(Buffer.concat(chunks))['xl/worksheets/sheet0.xml']);
  expect(sheet).toContain('A1+2');
  expect(sheet).toContain('<v>42</v>');
  expect(sheet).not.toContain('<v>101</v>');
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
  await expect(page.getByRole('button', { name: 'Import activity', exact: true })).toBeVisible();
  await page.getByLabel('Import XLSX file', { exact: true }).setInputFiles({ name: 'Imported forecast.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: bytes });
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Spreadsheet imports', exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Import activity', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Open Imported forecast', exact: true }).click();
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
